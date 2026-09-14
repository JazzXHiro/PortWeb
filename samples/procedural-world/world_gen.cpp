// world_gen.cpp
// -----------------------------------------------------------------------------
// Procedural world generation sample (C++17, single file, no dependencies).
//
// Generates a 2D world from layered value/Perlin-style noise:
//   * Elevation  -> fractal Brownian motion (fBm) of gradient noise
//   * Moisture   -> a second, independently-seeded fBm field
//   * A radial falloff optionally shapes the elevation into an island
//   * Elevation + moisture are mapped to biomes (ocean, beach, forest, ...)
//
// Outputs:
//   * A colored ASCII map to the terminal (ANSI truecolor).
//   * A binary PPM image (world.ppm) you can open in most image viewers,
//     or convert with e.g.  `magick world.ppm world.png`.
//
// Build:
//   g++ -std=c++17 -O2 -o world_gen world_gen.cpp
//   clang++ -std=c++17 -O2 -o world_gen world_gen.cpp
//   cl /std:c++17 /O2 world_gen.cpp        (MSVC)
//
// Run:
//   ./world_gen                 # default 120x40 terminal map + 512x512 image
//   ./world_gen --seed 42       # pick a seed
//   ./world_gen --size 200 60   # terminal map columns x rows
//   ./world_gen --island        # apply island falloff
//   ./world_gen --no-ascii      # skip the terminal map
//   ./world_gen --img 1024      # PPM image resolution (square)
// -----------------------------------------------------------------------------

#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <fstream>
#include <numeric>
#include <random>
#include <string>
#include <vector>

// ----------------------------------------------------------------------------
// Perlin noise
// ----------------------------------------------------------------------------
// Classic Ken Perlin permutation-table gradient noise, 2D. Deterministic for a
// given seed. Returns values roughly in [-1, 1].
class Perlin {
public:
    explicit Perlin(uint32_t seed = 0) {
        p_.resize(256);
        std::iota(p_.begin(), p_.end(), 0);         // 0..255
        std::mt19937 rng(seed);
        std::shuffle(p_.begin(), p_.end(), rng);
        p_.insert(p_.end(), p_.begin(), p_.end());   // duplicate -> 512 entries
    }

    double noise(double x, double y) const {
        const int xi = static_cast<int>(std::floor(x)) & 255;
        const int yi = static_cast<int>(std::floor(y)) & 255;
        const double xf = x - std::floor(x);
        const double yf = y - std::floor(y);

        const double u = fade(xf);
        const double v = fade(yf);

        const int aa = p_[p_[xi] + yi];
        const int ab = p_[p_[xi] + yi + 1];
        const int ba = p_[p_[xi + 1] + yi];
        const int bb = p_[p_[xi + 1] + yi + 1];

        const double x1 = lerp(grad(aa, xf, yf),       grad(ba, xf - 1, yf),     u);
        const double x2 = lerp(grad(ab, xf, yf - 1),   grad(bb, xf - 1, yf - 1), u);
        return lerp(x1, x2, v); // ~[-1, 1]
    }

    // Fractal Brownian motion: sum several octaves at increasing frequency and
    // decreasing amplitude. Returns a value normalized to ~[0, 1].
    double fbm(double x, double y, int octaves, double lacunarity,
               double gain) const {
        double amp = 1.0, freq = 1.0, sum = 0.0, norm = 0.0;
        for (int o = 0; o < octaves; ++o) {
            sum += amp * noise(x * freq, y * freq);
            norm += amp;
            amp *= gain;
            freq *= lacunarity;
        }
        const double v = sum / norm;          // ~[-1, 1]
        return 0.5 * (v + 1.0);               // ~[0, 1]
    }

private:
    static double fade(double t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    static double lerp(double a, double b, double t) { return a + t * (b - a); }
    static double grad(int hash, double x, double y) {
        // 8 gradient directions selected by the low bits of the hash.
        switch (hash & 7) {
            case 0: return  x + y;
            case 1: return -x + y;
            case 2: return  x - y;
            case 3: return -x - y;
            case 4: return  x;
            case 5: return -x;
            case 6: return  y;
            default: return -y;
        }
    }

    std::vector<int> p_;
};

// ----------------------------------------------------------------------------
// Biomes
// ----------------------------------------------------------------------------
struct RGB { uint8_t r, g, b; };

enum class Biome {
    DeepWater, ShallowWater, Beach, Grassland, Forest,
    Jungle, Savanna, Desert, Rock, Snow
};

struct BiomeInfo {
    const char* name;
    char glyph;   // ASCII representation
    RGB color;    // image / truecolor terminal representation
};

static const BiomeInfo& info(Biome b) {
    static const std::array<BiomeInfo, 10> table = {{
        {"Deep Water",    '~', { 30,  60, 120}},
        {"Shallow Water", '-', { 60, 110, 180}},
        {"Beach",         '.', {210, 200, 140}},
        {"Grassland",     ',', {120, 180,  80}},
        {"Forest",        'T', { 40, 120,  50}},
        {"Jungle",        '#', { 20,  90,  40}},
        {"Savanna",       ';', {170, 170,  70}},
        {"Desert",        ':', {225, 205, 120}},
        {"Rock",          '^', {110, 110, 110}},
        {"Snow",          '*', {235, 235, 245}},
    }};
    return table[static_cast<size_t>(b)];
}

// Map an (elevation, moisture) pair in [0,1] to a biome.
static Biome classify(double e, double m) {
    if (e < 0.30) return Biome::DeepWater;
    if (e < 0.40) return Biome::ShallowWater;
    if (e < 0.45) return Biome::Beach;

    if (e < 0.70) { // lowlands: moisture decides vegetation
        if (m < 0.20) return Biome::Desert;
        if (m < 0.40) return Biome::Savanna;
        if (m < 0.65) return Biome::Grassland;
        return Biome::Forest;
    }
    if (e < 0.85) { // highlands
        if (m < 0.35) return Biome::Rock;
        return Biome::Jungle;
    }
    // peaks
    if (m < 0.40) return Biome::Rock;
    return Biome::Snow;
}

// ----------------------------------------------------------------------------
// World
// ----------------------------------------------------------------------------
struct World {
    int w, h;
    std::vector<double> elevation; // [0,1]
    std::vector<double> moisture;  // [0,1]
    std::vector<Biome>  biome;

    Biome at(int x, int y) const { return biome[y * w + x]; }
};

struct GenParams {
    uint32_t seed      = 1337;
    int   octaves      = 6;
    double scale       = 3.0;   // higher = more zoomed-in features per tile
    double lacunarity  = 2.0;
    double gain        = 0.5;
    bool  island       = false;
    double islandPower = 3.0;   // steepness of the radial falloff
};

static World generate(int w, int h, const GenParams& gp) {
    World world;
    world.w = w;
    world.h = h;
    world.elevation.resize(static_cast<size_t>(w) * h);
    world.moisture.resize(static_cast<size_t>(w) * h);
    world.biome.resize(static_cast<size_t>(w) * h);

    // Two independent noise fields so moisture is not correlated with height.
    Perlin elev(gp.seed);
    Perlin moist(gp.seed ^ 0x9E3779B9u);

    for (int y = 0; y < h; ++y) {
        for (int x = 0; x < w; ++x) {
            // Sample in [0, scale] on both axes; aspect-corrected so features
            // are not stretched when w != h.
            const double nx = (static_cast<double>(x) / w) * gp.scale;
            const double ny = (static_cast<double>(y) / h) * gp.scale;

            double e = elev.fbm(nx, ny, gp.octaves, gp.lacunarity, gp.gain);
            double m = moist.fbm(nx + 100.0, ny + 100.0, gp.octaves,
                                 gp.lacunarity, gp.gain);

            if (gp.island) {
                // Distance from center, normalized so corners ~1, center 0.
                const double dx = (static_cast<double>(x) / w - 0.5) * 2.0;
                const double dy = (static_cast<double>(y) / h - 0.5) * 2.0;
                const double d = std::min(1.0, std::sqrt(dx * dx + dy * dy));
                const double falloff = std::pow(d, gp.islandPower);
                e = e * (1.0 - falloff);          // push edges toward ocean
            }

            e = std::clamp(e, 0.0, 1.0);
            m = std::clamp(m, 0.0, 1.0);

            const size_t idx = static_cast<size_t>(y) * w + x;
            world.elevation[idx] = e;
            world.moisture[idx]  = m;
            world.biome[idx]     = classify(e, m);
        }
    }
    return world;
}

// ----------------------------------------------------------------------------
// Rendering
// ----------------------------------------------------------------------------
static void printAsciiMap(const World& world) {
    std::string out;
    out.reserve(static_cast<size_t>(world.w + 20) * world.h);
    for (int y = 0; y < world.h; ++y) {
        for (int x = 0; x < world.w; ++x) {
            const BiomeInfo& bi = info(world.at(x, y));
            char buf[48];
            // ANSI 24-bit foreground color + glyph.
            std::snprintf(buf, sizeof(buf), "\x1b[38;2;%d;%d;%dm%c",
                          bi.color.r, bi.color.g, bi.color.b, bi.glyph);
            out += buf;
        }
        out += "\x1b[0m\n"; // reset at end of each row
    }
    std::fputs(out.c_str(), stdout);
}

static bool writePPM(const World& world, int res, const GenParams& gp,
                     const std::string& path) {
    // Render at a chosen square resolution independent of the ASCII map so the
    // image stays crisp. Regenerate elevation/moisture at pixel granularity.
    World img = generate(res, res, gp);

    std::ofstream f(path, std::ios::binary);
    if (!f) return false;
    f << "P6\n" << res << ' ' << res << "\n255\n";
    std::vector<uint8_t> row(static_cast<size_t>(res) * 3);
    for (int y = 0; y < res; ++y) {
        for (int x = 0; x < res; ++x) {
            const RGB c = info(img.at(x, y)).color;
            row[x * 3 + 0] = c.r;
            row[x * 3 + 1] = c.g;
            row[x * 3 + 2] = c.b;
        }
        f.write(reinterpret_cast<const char*>(row.data()),
                static_cast<std::streamsize>(row.size()));
    }
    (void)world;
    return static_cast<bool>(f);
}

static void printLegend(const World& world) {
    // Tally biome coverage to give a quick sense of the generated world.
    std::array<int, 10> counts{};
    for (Biome b : world.biome) counts[static_cast<size_t>(b)]++;
    const double total = static_cast<double>(world.w) * world.h;

    std::printf("\nLegend (coverage of %dx%d map):\n", world.w, world.h);
    for (size_t i = 0; i < counts.size(); ++i) {
        const BiomeInfo& bi = info(static_cast<Biome>(i));
        std::printf("  \x1b[38;2;%d;%d;%dm%c\x1b[0m  %-14s %5.1f%%\n",
                    bi.color.r, bi.color.g, bi.color.b, bi.glyph, bi.name,
                    100.0 * counts[i] / total);
    }
}

// ----------------------------------------------------------------------------
// CLI
// ----------------------------------------------------------------------------
static void usage(const char* prog) {
    std::printf(
        "Procedural world generation sample\n\n"
        "Usage: %s [options]\n"
        "  --seed <n>          RNG seed (default 1337)\n"
        "  --size <cols> <rows> terminal map size (default 120 40)\n"
        "  --scale <f>         noise scale / zoom (default 3.0)\n"
        "  --octaves <n>       fBm octaves (default 6)\n"
        "  --island            apply radial island falloff\n"
        "  --img <n>           PPM image resolution, 0 to disable (default 512)\n"
        "  --no-ascii          skip the terminal map\n"
        "  --help              show this help\n",
        prog);
}

int main(int argc, char** argv) {
    GenParams gp;
    int cols = 120, rows = 40;
    int imgRes = 512;
    bool ascii = true;

    for (int i = 1; i < argc; ++i) {
        const std::string a = argv[i];
        auto need = [&](int n) { return i + n < argc; };
        if (a == "--seed" && need(1))        gp.seed = static_cast<uint32_t>(std::strtoul(argv[++i], nullptr, 10));
        else if (a == "--size" && need(2))   { cols = std::atoi(argv[++i]); rows = std::atoi(argv[++i]); }
        else if (a == "--scale" && need(1))  gp.scale = std::atof(argv[++i]);
        else if (a == "--octaves" && need(1))gp.octaves = std::atoi(argv[++i]);
        else if (a == "--island")            gp.island = true;
        else if (a == "--img" && need(1))    imgRes = std::atoi(argv[++i]);
        else if (a == "--no-ascii")          ascii = false;
        else if (a == "--help" || a == "-h") { usage(argv[0]); return 0; }
        else { std::fprintf(stderr, "Unknown/incomplete option: %s\n", a.c_str()); usage(argv[0]); return 1; }
    }

    cols = std::max(1, cols);
    rows = std::max(1, rows);

    std::printf("Generating world  seed=%u  scale=%.1f  octaves=%d%s\n",
                gp.seed, gp.scale, gp.octaves, gp.island ? "  (island)" : "");

    // Terminal map (its own aspect ratio) so it fits typical consoles.
    World world = generate(cols, rows, gp);

    if (ascii) printAsciiMap(world);
    printLegend(world);

    if (imgRes > 0) {
        const std::string path = "world.ppm";
        if (writePPM(world, imgRes, gp, path))
            std::printf("\nWrote %s (%dx%d). Convert with: magick %s world.png\n",
                        path.c_str(), imgRes, imgRes, path.c_str());
        else
            std::fprintf(stderr, "Failed to write %s\n", path.c_str());
    }
    return 0;
}
