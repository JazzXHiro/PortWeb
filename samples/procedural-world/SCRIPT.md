# Explainer Script — Procedural World Simulation with Cellular Automata

A spoken walkthrough for demoing this project (interview, class presentation, or
portfolio video). Target length **~4–5 minutes**. Stage directions are in
`[brackets]`. Say the lines in your own words — this is a track, not a teleprompter.

---

## 0. Before you start (setup, ~15s, off-camera)
- Build it: `cl /std:c++17 /O2 /EHsc world_sim.cpp` (or `g++ -std=c++17 -O2 ...`).
- Have a terminal ready that supports colour (Windows Terminal or any modern shell).
- Have the report open in a second window in case you want to show the images.

---

## 1. The hook (~30s)
> "I built a little world that runs itself. There's no script telling it what to
> do — I only wrote the *rules that each patch of land follows*, and then let a
> few thousand of those patches interact. Out of that, you get coastlines,
> forests that grow, and wildfires that spread and burn out — all emerging on
> their own. It's about 400 lines of dependency-free C++."

*Key idea to plant: simple local rules → complex global behaviour.*

---

## 2. Two phases: generate, then simulate (~45s)
> "It works in two stages. **First**, I *generate* a world. **Then** I *simulate*
> it over time."
>
> "The generation uses **Perlin noise** — the same kind of smooth, natural noise
> games use for terrain. I stack several layers of it to get an **elevation** map
> and, separately, a **moisture** map. Elevation gives me oceans, beaches,
> lowlands and peaks; moisture decides how wet each spot is. That's the starting
> snapshot of the world."

`[SHOW: run  ./world_gen --island  — point at the ASCII island / the world.png]`

---

## 3. What a cellular automaton is (~45s)
> "The simulation is a **cellular automaton**. Picture the map as a grid of cells.
> Each cell is in one state — water, sand, grass, shrub, forest, on fire, ash —
> and every step, *all* cells update at the same time based on a simple rule that
> only looks at the cell and its eight neighbours."
>
> "That 'look at your neighbours' part is the whole trick. Conway's Game of Life
> and the classic forest-fire model work exactly this way. I extended that idea
> into a small ecosystem."

---

## 4. The rules — live demo (~90s)
`[SHOW: run  ./world_sim --seed 7 --island  and let it animate while you talk]`

> "Watch the land. A few rules are all that's running here:"
>
> - "**Empty ground gets colonised** — bare sand slowly turns to grass where
>   there's enough moisture."
> - "**Vegetation matures** — grass becomes shrub, shrub becomes forest. That's
>   ecological *succession*, the same way a real abandoned field fills in over
>   years."
> - "**Fires start and spread** — every so often lightning ignites a dry, flammable
>   cell, and fire jumps to burning neighbours. Forest burns more eagerly than
>   grass because it's heavier fuel."
> - "**Fire burns out to ash**, and ash is fertile, so it regrows fast. So you get
>   this cycle: grow, burn, regrow."
>
> "And there's a **seasonal climate cycle** driving dryness up and down — so fires
> cluster into *fire seasons* instead of happening at random."

`[SHOW: point out a fire front spreading, then the black ash it leaves, then green
returning to that patch a few steps later]`

---

## 5. Why it's interesting — emergence (~40s)
> "Here's the part I like. **Nowhere in the code do I say 'start a fire here' or
> 'grow a forest there.'** I never place a single tree. Every pattern you see —
> the fire fronts, the patchwork of young and old forest, forest cover booming
> and then getting knocked back — all of it *emerges* from those local rules
> applied to every cell at once. Simple rules, complex world."

`[SHOW OPTIONAL: run  ./world_sim --no-ascii --stats  and point at the census —
sand going down, forest going up, occasional ash spikes = fire seasons]`

---

## 6. How it's built (~30s, for a technical audience)
> "Implementation-wise: it's one C++ file, no libraries. The update is
> **synchronous and double-buffered** — I compute the next grid from a read-only
> copy of the current one, then swap — so a cell can't accidentally see a
> neighbour that already updated this step. It's `O(width × height)` per step,
> and fully **deterministic** for a given seed, so any run is reproducible. It
> draws to the terminal in truecolour and can export image frames."

---

## 7. Close (~20s)
> "So that's the project: procedural generation to build a world, a cellular
> automaton to make it *live*. Natural next steps would be rivers that actually
> flow downhill, wind-driven fire, and maybe animals on top. But even at this
> size, it shows the core idea really cleanly — **you don't have to script a
> world; you can just give it rules and let it run.**"

---

## Q&A prep (anticipated questions)

- **"Why Perlin noise and not random?"** Random noise looks like static — no
  structure. Perlin is *coherent*: neighbours are correlated, so you get smooth,
  natural terrain you can threshold into land and sea.
- **"Why update everything at once instead of one cell at a time?"** So the result
  doesn't depend on scan order. That's what double buffering guarantees — it's a
  true simultaneous step, matching how CAs are defined.
- **"Does it ever settle into a boring steady state?"** No — it reaches a *dynamic*
  equilibrium. Forest builds up, a fire season clears some of it, it regrows. The
  totals hover in a band but the map never stops changing.
- **"Is it random each run?"** Only if you change the seed. Same seed → identical
  world and identical evolution, which is great for debugging and for demos.
- **"How would you scale it up?"** The grid is embarrassingly parallel — each
  cell's next state is independent — so it maps straight onto multiple threads or
  a GPU compute shader.

---

## One-paragraph version (if you only have 30 seconds)
> "It's a self-running world in C++. I generate terrain from Perlin noise —
> oceans, beaches, mountains — then a cellular automaton evolves it: bare ground
> greens over, grass matures into forest, lightning starts wildfires that spread
> and burn out to ash, and ash regrows, all on a seasonal cycle. I never script
> any of it; the forests and fires *emerge* from simple rules each cell follows
> based on its neighbours. Same seed gives the same world every time."
