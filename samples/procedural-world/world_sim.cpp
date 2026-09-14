// world_sim.cpp
// -----------------------------------------------------------------------------
// Procedural world SIMULATION using cellular automata (C++17, single file,
// no dependencies).
//
// The world is first *generated* procedurally (Perlin-noise elevation +
// moisture -> terrain), then *simulated* over discrete time steps by a
// cellular automaton whose transition rules run on every cell in parallel
// (synchronous update, double-buffered).
//
// The automaton models a living ecosystem:
//   * Vegetation succession:  bare ground -> grass -> shrub -> forest
//   * Wildfire (a Drossel-Schwabl-style forest-fire CA, extended):
//       - lightning randomly ignites dry, flammable cells
//       - fire spreads to flammable Moore-neighbours
//       - burning cells become ash
//   * Regrowth: ash is fertile and quickly returns to grass
//   * Climate: a seasonal "dryness" cycle drives recurring fire seasons
//
// Every cell's next state depends only on its own state and its 8 neighbours
// (the defining property of a cellular automaton).
//
// Build:
//   g++ -std=c++17 -O2 -o world_sim world_sim.cpp
//   cl /std:c++17 /O2 /EHsc world_sim.cpp        (MSVC)
//
// Run:
//   ./world_sim                     # animate 200 steps of a 120x45 world
//   ./world_sim --seed 7 --island   # island world, seed 7
//   ./world_sim --steps 500 --delay 40
//   ./world_sim --no-ascii --stats  # headless; print population stats
//   ./world_sim --img 8             # also write final frame to world_sim.ppm
//   ./world_sim --help
// -----------------------------------------------------------------------------

#include <algorithm>
#include <array>
#include <chrono>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <fstream>
#include <numeric>
#include <random>
#include <string>
#include <thread>
#include <vector>

#ifdef _WIN32
#  define WIN32_LEAN_AND_MEAN
#  define NOMINMAX            // keep std::min/std::max, not the windows.h macros
#  include <windows.h>
#endif

#ifndef M_PI
#  define M_PI 3.14159265358979323846
#endif

// ----------------------------------------------------------------------------
// Perlin noise (used only to build the initial terrain).
// ----------------------------------------------------------------------------
class Perlin {
public:
    explicit Perlin(uint32_t seed = 0) {
        p_.resize(256);
        std::iota(p_.begin(), p_.end(), 0);
        std::mt19937 rng(seed);
        std::shuffle(p_.begin(), p_.end(), rng);
        p_.insert(p_.end(), p_.begin(), p_.end());
    }
    double noise(double x, double y) const {
        const int xi = static_cast<int>(std::floor(x)) & 255;
        const int yi = static_cast<int>(std::floor(y)) & 255;
        const double xf = x - std::floor(x), yf = y - std::floor(y);
        const double u = fade(xf), v = fade(yf);
        const int aa = p_[p_[xi] + yi],     ab = p_[p_[xi] + yi + 1];
        const int ba = p_[p_[xi + 1] + yi], bb = p_[p_[xi + 1] + yi + 1];
        const double x1 = lerp(grad(aa, xf, yf),     grad(ba, xf - 1, yf),     u);
        const double x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);
        return lerp(x1, x2, v);
    }
    double fbm(double x, double y, int oct, double lac, double gain) const {
        double amp = 1, freq = 1, sum = 0, norm = 0;
        for (int o = 0; o < oct; ++o) {
            sum += amp * noise(x * freq, y * freq);
            norm += amp; amp *= gain; freq *= lac;
        }
        return 0.5 * (sum / norm + 1.0); // ~[0,1]
    }
private:
    static double fade(double t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    static double lerp(double a, double b, double t) { return a + t * (b - a); }
    static double grad(int h, double x, double y) {
        switch (h & 7) {
            case 0: return  x + y;  case 1: return -x + y;
            case 2: return  x - y;  case 3: return -x - y;
            case 4: return  x;      case 5: return -x;
            case 6: return  y;      default: return -y;
        }
    }
    std::vector<int> p_;
};

// ----------------------------------------------------------------------------
// Cell states
// ----------------------------------------------------------------------------
enum class S : uint8_t {
    Water, Snow, Rock, Sand, Ash, Grass, Shrub, Forest, Burning, COUNT
};
static constexpr int NSTATES = static_cast<int>(S::COUNT);

struct Look { const char* name; char glyph; uint8_t r, g, b; };

static const Look& look(S s) {
    static const std::array<Look, NSTATES> T = {{
        {"Water",   '~',  40,  80, 150},
        {"Snow",    '*', 235, 235, 245},
        {"Rock",    '^', 115, 115, 120},
        {"Sand",    '.', 215, 200, 140},
        {"Ash",     '%',  70,  60,  60},
        {"Grass",   ',', 130, 195,  90},
        {"Shrub",   ';',  80, 160,  70},
        {"Forest",  'T',  35, 110,  50},
        {"Burning", '@', 235,  90,  30},
    }};
    return T[static_cast<int>(s)];
}

static bool flammable(S s) { return s == S::Grass || s == S::Shrub || s == S::Forest; }

// ----------------------------------------------------------------------------
// World + simulation parameters
// ----------------------------------------------------------------------------
struct Params {
    uint32_t seed        = 1337;
    int    w             = 120;
    int    h             = 45;
    int    steps         = 200;
    int    delayMs       = 55;
    bool   island        = false;
    bool   ascii         = true;
    bool   stats         = false;
    int    cellPx        = 0;   // >0: write final PPM at grid*cellPx resolution

    // Terrain noise
    int    octaves       = 6;
    double scale         = 3.0;

    // CA rule probabilities (per cell, per step)
    double lightning     = 0.00030; // base chance a flammable cell self-ignites
    double spread        = 0.34;    // base chance fire jumps per burning neighbour
    double ashRegrow     = 0.10;    // ash -> grass
    double sandGrow      = 0.012;   // sand -> grass (colonisation)
    double succGrass     = 0.020;   // grass -> shrub
    double succShrub     = 0.012;   // shrub -> forest
    double desertify     = 0.006;   // grass -> sand under drought
    double alpine        = 0.002;   // rock -> grass where wet

    // Climate: seasonal dryness = 1 + amp*sin(2*pi*t/period)
    double seasonAmp     = 0.55;
    int    seasonPeriod  = 70;
};

struct World {
    int w, h;
    std::vector<double> moisture; // [0,1], static climate field
    std::vector<S>      state;    // current CA state
    S at(int x, int y) const { return state[static_cast<size_t>(y) * w + x]; }
};

// ----------------------------------------------------------------------------
// Terrain generation -> initial CA state
// ----------------------------------------------------------------------------
static World genTerrain(const Params& p, std::mt19937& rng) {
    World wd;
    wd.w = p.w; wd.h = p.h;
    const size_t n = static_cast<size_t>(p.w) * p.h;
    wd.moisture.resize(n);
    wd.state.resize(n);

    Perlin elev(p.seed), moist(p.seed ^ 0x9E3779B9u);
    std::uniform_real_distribution<double> U(0.0, 1.0);

    for (int y = 0; y < p.h; ++y) {
        for (int x = 0; x < p.w; ++x) {
            const double nx = (double)x / p.w * p.scale;
            const double ny = (double)y / p.h * p.scale;
            double e = elev.fbm(nx, ny, p.octaves, 2.0, 0.5);
            double m = moist.fbm(nx + 100.0, ny + 100.0, p.octaves, 2.0, 0.5);

            if (p.island) {
                const double dx = ((double)x / p.w - 0.5) * 2.0;
                const double dy = ((double)y / p.h - 0.5) * 2.0;
                const double d = std::min(1.0, std::sqrt(dx * dx + dy * dy));
                e *= (1.0 - std::pow(d, 3.0));
            }
            e = std::clamp(e, 0.0, 1.0);
            m = std::clamp(m, 0.0, 1.0);

            // Seed an initial state from terrain so there is fuel to start.
            S s;
            if (e < 0.40)       s = S::Water;
            else if (e > 0.88)  s = S::Snow;
            else if (e > 0.80)  s = S::Rock;
            else if (e < 0.44)  s = S::Sand;                 // beach
            else {                                            // vegetated land
                if (m < 0.30)              s = S::Sand;
                else if (m < 0.50)         s = (U(rng) < 0.7 ? S::Grass : S::Sand);
                else if (m < 0.70)         s = (U(rng) < 0.6 ? S::Shrub : S::Grass);
                else                       s = (U(rng) < 0.7 ? S::Forest : S::Shrub);
            }
            const size_t idx = static_cast<size_t>(y) * p.w + x;
            wd.moisture[idx] = m;
            wd.state[idx] = s;
        }
    }
    return wd;
}

// ----------------------------------------------------------------------------
// One synchronous CA step (double-buffered).
// ----------------------------------------------------------------------------
static void step(const World& cur, World& nxt, const Params& p, int t,
                 std::mt19937& rng) {
    std::uniform_real_distribution<double> U(0.0, 1.0);
    auto chance = [&](double prob) { return U(rng) < prob; };

    // Seasonal climate multiplier on dryness (>=0).
    const double season =
        1.0 + p.seasonAmp * std::sin(2.0 * M_PI * (double)t / p.seasonPeriod);

    for (int y = 0; y < cur.h; ++y) {
        for (int x = 0; x < cur.w; ++x) {
            const size_t i = static_cast<size_t>(y) * cur.w + x;
            const S s = cur.state[i];
            const double m = cur.moisture[i];
            const double dry = std::clamp((1.0 - m) * season, 0.0, 1.5);
            S out = s;

            switch (s) {
                case S::Water:
                case S::Snow:
                    break; // static

                case S::Rock:
                    if (m > 0.75 && chance(p.alpine)) out = S::Grass;
                    break;

                case S::Burning:
                    out = S::Ash; // fire lasts one step, then burns out
                    break;

                case S::Ash:
                    if (m > 0.25) { if (chance(p.ashRegrow)) out = S::Grass; }
                    else          { if (chance(p.ashRegrow * 0.5)) out = S::Sand; }
                    break;

                case S::Sand:
                    if (m > 0.35 && chance(p.sandGrow * m)) out = S::Grass;
                    break;

                case S::Grass:
                case S::Shrub:
                case S::Forest: {
                    // Flammability grows with vegetation height.
                    const double fuel = (s == S::Grass) ? 0.6
                                      : (s == S::Shrub) ? 0.85 : 1.0;

                    // Count burning Moore-neighbours.
                    int burning = 0;
                    for (int dy = -1; dy <= 1; ++dy)
                        for (int dx = -1; dx <= 1; ++dx) {
                            if (!dx && !dy) continue;
                            const int nxp = x + dx, nyp = y + dy;
                            if (nxp < 0 || nyp < 0 || nxp >= cur.w || nyp >= cur.h)
                                continue;
                            if (cur.state[(size_t)nyp * cur.w + nxp] == S::Burning)
                                ++burning;
                        }

                    bool ignite = false;
                    if (burning > 0) {
                        // Each burning neighbour is an independent ignition try.
                        const double pi = std::clamp(p.spread * dry * fuel, 0.0, 0.98);
                        for (int b = 0; b < burning && !ignite; ++b)
                            if (chance(pi)) ignite = true;
                    } else {
                        // Lightning: rarer, favours tall dry fuel.
                        if (chance(p.lightning * dry * fuel)) ignite = true;
                    }

                    if (ignite) { out = S::Burning; break; }

                    // No fire: vegetation succession / drought.
                    if (s == S::Grass) {
                        if (m < 0.25 && chance(p.desertify)) out = S::Sand;
                        else if (m > 0.45 && chance(p.succGrass * m)) out = S::Shrub;
                    } else if (s == S::Shrub) {
                        if (m > 0.55 && chance(p.succShrub * m)) out = S::Forest;
                    }
                    break;
                }
                default: break;
            }
            nxt.state[i] = out;
        }
    }
}

// ----------------------------------------------------------------------------
// Rendering
// ----------------------------------------------------------------------------
static void enableAnsi() {
#ifdef _WIN32
    HANDLE h = GetStdHandle(STD_OUTPUT_HANDLE);
    DWORD mode = 0;
    if (GetConsoleMode(h, &mode))
        SetConsoleMode(h, mode | ENABLE_VIRTUAL_TERMINAL_PROCESSING);
#endif
}

static void renderAscii(const World& w, int t, const Params& p, bool first) {
    std::string out;
    out.reserve(static_cast<size_t>(w.w + 24) * (w.h + 2));
    out += first ? "\x1b[2J\x1b[H" : "\x1b[H"; // clear then home / just home
    for (int y = 0; y < w.h; ++y) {
        for (int x = 0; x < w.w; ++x) {
            const Look& lk = look(w.at(x, y));
            char buf[48];
            std::snprintf(buf, sizeof(buf), "\x1b[38;2;%d;%d;%dm%c",
                          lk.r, lk.g, lk.b, lk.glyph);
            out += buf;
        }
        out += "\x1b[0m\n";
    }
    char hdr[128];
    std::snprintf(hdr, sizeof(hdr),
        "step %4d / %-4d  seed %u  %dx%d%s\n",
        t, p.steps, p.seed, w.w, w.h, p.island ? "  island" : "");
    out += hdr;
    std::fputs(out.c_str(), stdout);
    std::fflush(stdout);
}

static std::array<int, NSTATES> census(const World& w) {
    std::array<int, NSTATES> c{};
    for (S s : w.state) c[static_cast<int>(s)]++;
    return c;
}

static void printCensus(const World& w, int t) {
    auto c = census(w);
    const double total = (double)w.w * w.h;
    std::printf("step %4d | ", t);
    for (int i = 0; i < NSTATES; ++i)
        std::printf("%s %4.1f%%  ", look((S)i).name, 100.0 * c[i] / total);
    std::printf("\n");
}

static bool writePPM(const World& w, int cellPx, const std::string& path) {
    const int W = w.w * cellPx, H = w.h * cellPx;
    std::ofstream f(path, std::ios::binary);
    if (!f) return false;
    f << "P6\n" << W << ' ' << H << "\n255\n";
    std::vector<uint8_t> row(static_cast<size_t>(W) * 3);
    for (int y = 0; y < H; ++y) {
        const int gy = y / cellPx;
        for (int x = 0; x < W; ++x) {
            const Look& lk = look(w.at(x / cellPx, gy));
            row[x * 3 + 0] = lk.r; row[x * 3 + 1] = lk.g; row[x * 3 + 2] = lk.b;
        }
        f.write(reinterpret_cast<const char*>(row.data()),
                static_cast<std::streamsize>(row.size()));
    }
    return static_cast<bool>(f);
}

// ----------------------------------------------------------------------------
// CLI
// ----------------------------------------------------------------------------
static void usage(const char* prog) {
    std::printf(
        "Procedural world simulation (cellular automata)\n\n"
        "Usage: %s [options]\n"
        "  --seed <n>           RNG seed (default 1337)\n"
        "  --size <w> <h>       grid size (default 120 45)\n"
        "  --steps <n>          simulation steps (default 200)\n"
        "  --delay <ms>         per-frame delay for the animation (default 55)\n"
        "  --island             island-shaped world\n"
        "  --lightning <p>      base ignition probability (default 0.0003)\n"
        "  --spread <p>         fire spread probability per neighbour (default 0.34)\n"
        "  --no-ascii           do not draw the animated map\n"
        "  --stats              print population census every 25 steps\n"
        "  --img <cellPx>       write final frame to world_sim.ppm at grid*cellPx\n"
        "  --help               show this help\n",
        prog);
}

int main(int argc, char** argv) {
    Params p;
    for (int i = 1; i < argc; ++i) {
        const std::string a = argv[i];
        auto need = [&](int n) { return i + n < argc; };
        if      (a == "--seed" && need(1))      p.seed = (uint32_t)std::strtoul(argv[++i], nullptr, 10);
        else if (a == "--size" && need(2))      { p.w = std::atoi(argv[++i]); p.h = std::atoi(argv[++i]); }
        else if (a == "--steps" && need(1))     p.steps = std::atoi(argv[++i]);
        else if (a == "--delay" && need(1))     p.delayMs = std::atoi(argv[++i]);
        else if (a == "--island")               p.island = true;
        else if (a == "--lightning" && need(1)) p.lightning = std::atof(argv[++i]);
        else if (a == "--spread" && need(1))    p.spread = std::atof(argv[++i]);
        else if (a == "--no-ascii")             p.ascii = false;
        else if (a == "--stats")                p.stats = true;
        else if (a == "--img" && need(1))       p.cellPx = std::atoi(argv[++i]);
        else if (a == "--help" || a == "-h")    { usage(argv[0]); return 0; }
        else { std::fprintf(stderr, "Unknown/incomplete option: %s\n", a.c_str()); usage(argv[0]); return 1; }
    }
    p.w = std::max(4, p.w);
    p.h = std::max(4, p.h);

    if (p.ascii) enableAnsi();

    std::mt19937 rng(p.seed);
    World cur = genTerrain(p, rng);
    World nxt = cur; // same dimensions / moisture; state overwritten each step

    for (int t = 0; t <= p.steps; ++t) {
        if (p.ascii) {
            renderAscii(cur, t, p, /*first=*/t == 0);
            std::this_thread::sleep_for(std::chrono::milliseconds(p.delayMs));
        }
        if (p.stats && (t % 25 == 0)) printCensus(cur, t);
        if (t == p.steps) break;
        step(cur, nxt, p, t, rng);
        std::swap(cur.state, nxt.state);
    }

    if (p.ascii) std::fputs("\x1b[0m\n", stdout);

    if (p.cellPx > 0) {
        const std::string path = "world_sim.ppm";
        if (writePPM(cur, p.cellPx, path))
            std::printf("Wrote %s (%dx%d).\n", path.c_str(),
                        p.w * p.cellPx, p.h * p.cellPx);
        else
            std::fprintf(stderr, "Failed to write %s\n", path.c_str());
    }
    return 0;
}
