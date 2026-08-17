# MCU Timeline Temporal Loom

> **Pure vibe code.** An interactive, TVA-style visualisation of the Marvel multiverse timeline.

A single-file HTML app that renders the Marvel Cinematic Universe (and surrounding multiverse) as a glowing 3D temporal loom — a branching river of light where every movie, show and universe is a distinct thread. Spin it, zoom it, poke it. Live with no build step.

## Features

- **3D Temporal Loom** — every entry is a light-branch on the growing timeline, colour-coded by reality. Drag to orbit, right-drag to pan, scroll to zoom, double-click to fly to a point.
- **Entry Database** — searchable, sortable, filter-by-reality tables for:
  - **TIMELINE** — 160+ films/shows/one-shots across the MCU and the wider multiverse
  - **90'S SHOWS** — animated series database
  - **2010S SHOWS** — animated series database
  - **UNIVERSE KEY** — a reference of numbered realities (Earth-616, Earth-1610, Earth-TRN414…)
- **Watched tracking** — tick anything off per database; progress bars and a WATCHED ONLY filter remember it all in `localStorage`.
- **Release Queue** — a corner checklist for upcoming and yet-to-be-filed titles that auto-crosses off when a title lands in a database.
- **Universe Menu** — the ☰ hamburger menu switches between swimming pools (Marvel Main today; DC, Star Wars, Marvel Comics, Doctor Who shells ready for data).
- **Doomsday Clock** — a live countdown ticking in the corner.
- No frameworks, no build step, no backend — one HTML file + Three.js.

## Run it

Just open `index.html`. If the local `three.min.js` fails to load it falls back to the CDN. No server required.

## Stack

- [Three.js](https://threejs.org) r128 for the WebGL scene
- Vanilla JS (IIFE, no build step)
- `localStorage` for all persistence

## Status

Pure vibe code — built for fun, evolving whenever the vibe demands it. Clean single commit per vibe checkpoint.