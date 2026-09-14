# Procedural World Generation & Simulation (C++)

Dependency-free, single-file C++17 samples that build a 2D world and — in the
simulation — let it evolve over time.

- **`world_gen.cpp`** — *generates* a static world from layered Perlin noise.
- **`world_sim.cpp`** — *simulates* a living world with a **cellular automaton**
  (vegetation succession + wildfire spread + regrowth, on a seasonal cycle).

See **[REPORT.md](REPORT.md)** for the full write-up and **[SCRIPT.md](SCRIPT.md)**
for a spoken demo walkthrough.

---

## `world_sim.cpp` — cellular-automaton simulation

The world is generated, then evolved: each step, every cell updates from its 8
neighbours. Bare sand is colonised → grass → shrub → forest; lightning ignites
dry fuel; fire spreads and burns to ash; ash regrows — with a seasonal dryness
cycle driving recurring fire seasons. Nothing is scripted; the patterns *emerge*.

```bash
g++ -std=c++17 -O2 -o world_sim world_sim.cpp        # or MSVC: cl /std:c++17 /O2 /EHsc world_sim.cpp
```

```bash
./world_sim --seed 7 --island          # watch it evolve in the terminal
```

| Flag | Meaning |
| ---- | ------- |
| `--seed <n>` | RNG seed (deterministic) |
| `--size <w> <h>` | grid size (default 120 45) |
| `--steps <n>` | number of steps (default 200) |
| `--delay <ms>` | frame delay for the animation (default 55) |
| `--island` | island-shaped world |
| `--lightning <p>` / `--spread <p>` | fire tuning |
| `--no-ascii` | headless (no animation) |
| `--stats` | print a population census every 25 steps |
| `--img <cellPx>` | write final frame to `world_sim.ppm` |

---

## `world_gen.cpp` — static generator

A single-file generator that renders a world two ways:

- a **colored ASCII map** in the terminal (ANSI truecolor), and
- a **PPM image** (`world.ppm`) you can open or convert to PNG.

## How it works

| Field | Source |
| ----- | ------ |
| **Elevation** | fractal Brownian motion (fBm) — several octaves of Perlin noise summed at rising frequency, falling amplitude |
| **Moisture** | a second, independently-seeded fBm field (so it isn't correlated with height) |
| **Island shape** *(optional)* | a radial falloff that pushes the map edges down toward ocean |
| **Biome** | a lookup on the `(elevation, moisture)` pair → ocean, beach, grassland, forest, jungle, savanna, desert, rock, snow |

Everything is deterministic for a given `--seed`.

## Build

```bash
g++ -std=c++17 -O2 -o world_gen world_gen.cpp
# or: clang++ -std=c++17 -O2 -o world_gen world_gen.cpp
# or (MSVC): cl /std:c++17 /O2 world_gen.cpp
```

## Run

```bash
./world_gen                 # 120x40 terminal map + 512x512 world.ppm
./world_gen --seed 42       # pick a seed
./world_gen --island        # island-shaped continent
./world_gen --size 200 60   # wider terminal map
./world_gen --scale 5       # more, smaller features
./world_gen --img 1024      # higher-res image
./world_gen --help          # all options
```

Convert the image to PNG (ImageMagick):

```bash
magick world.ppm world.png
```
