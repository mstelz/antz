# Antz – Phaser Sandbox

A lightweight Phaser.js playground to experiment with the board game ideas described in `my-thoughts.md`. The scene scales to your browser window, arranging the shared foraging board, event lane, tile supply, and player tableau dashboards (with counters) so nothing overlaps while you tune colony layouts.

## Run the prototype

1. Make sure you are inside the project directory.
2. Use any static file server (examples below) and open `index.html` in your browser.

```bash
# Option A: use Python
python3 -m http.server
# Option B: use Node
npx serve .
```

Then visit `http://localhost:8000` (Python) or the URL printed by your server. Because Phaser is loaded from a CDN this does not require installing dependencies. Resize the browser window at any time and the layout will rebuild to keep the zones tidy.

### Controls once loaded

- Drag colony tiles from the top supply into any player's tableau grid (snap-to-grid). Drag back into the supply to free a slot.
- Adjust a player's Food/Leaves/Materials/Eggs/Threat/Queen counters using the +/- buttons in their dashboard.
- Click the shared board zones to drop draggable worker markers and experiment with foraging routes.
- Press `Draw Event` in the event lane to fire a random Rain/Drought/Pesticides/Lawn Mower effect that automatically adjusts counters.

## What is included

- `index.html` wires Phaser 3.70 in and creates the canvas plus on-screen helper notes.
- `main.js` defines `PrototypeScene`, which draws:
  - the shared backyard split into high-level resource zones (click to spawn draggable worker markers),
  - an event pressure lane with a button that applies Rain/Drought/Pesticides/Lawn Mower effects to the player dashboards,
  - a top-row supply track that keeps draggable tiles visible even when playing on small screens,
  - individual tableau grids for each player with snap-to-grid drag/drop logic plus adjacent dashboards for resource counters and tile summaries.

Drag tiles from the supply into any player's tableau to map a build, or back to the supply to free the slot.

## Tinkering ideas

- Adjust `PLAYER_COUNT`, `TABLEAU_ROWS`, `TABLEAU_COLS`, or `TILE_TYPES` in `main.js` to explore different colony sizes or tech trees—the responsive layout will shrink/enlarge tiles and their dashboards automatically.
- Link tableau summaries to custom counters (food, eggs, threats) whenever you start prototyping rule loops.
- Wire tile placement bonuses/penalties to the counters to explore automatic scoring.
- Spawn event cards on a timer or customize `EVENT_DECK` to match the real threats you want to test.
- Tie tile placement bonuses to shared board zones (e.g., `Food Storage` becomes stronger if at least one worker stands in `Flower Bed`).

Iterate quickly in Phaser, then translate the ideas back to physical components when you are happy with the interactions.
