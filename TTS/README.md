# TTS Prototype

This folder contains a first-pass Tabletop Simulator version of `Antz` built from `my-thoughts.md` and the lessons from the Phaser prototype.

## Included

- `assets/svg/board.svg`: branching backyard board with a central nest and destination spaces
- `assets/svg/player_mat.svg`: 4x4 colony tableau plus tracks panel
- `assets/svg/chamber_*.svg`: individual colony chamber fronts
- `assets/svg/event_*.svg`: individual threat card fronts
- `assets/svg/chamber_sheet.svg`: 2x2 sheet for the chamber deck
- `assets/svg/event_sheet.svg`: 3x2 sheet for the threat deck
- `assets/svg/*_back.svg`: card backs
- `assets/svg/tokens_sheet.svg`: resource token sheet
- `assets/png/*.png`: raster exports for boards, mats, cards, and sheets after generation
- `scripts/Global.-1.ttslua`: spawns a setup console block plus the board/mat/deck automation
- `saves/Antz_Template.json`: TTS save template with placeholder asset URLs
- `data/cards.json`: source data for cards
- `tools_generate_assets.py`: regenerates SVG assets and calls the PNG renderer
- `tools_render_pngs.js`: Playwright-based SVG to PNG renderer for TTS-ready images

## What This Version Assumes

- 2-4 players via the `Players` button on the spawned setup console block
- one shared backyard board
- one colony deck
- one threat deck
- colony mats tracked manually with counters or cubes
- branching routes are important as access cost, but destination spaces are the focus

## How To Use In TTS

1. Run the asset generator so both SVG and PNG outputs are current.
2. Replace placeholder values in [Antz_Template.json](/home/mike/Development/antz/TTS/saves/Antz_Template.json):
   - `__BOARD_IMAGE_URL__`
   - `__PLAYER_MAT_IMAGE_URL__`
   - `__CHAMBER_FACE_SHEET_URL__`
   - `__CHAMBER_BACK_URL__`
   - `__EVENT_FACE_SHEET_URL__`
   - `__EVENT_BACK_URL__`
3. Mirror the same URLs in [Global.-1.ttslua](/home/mike/Development/antz/TTS/scripts/Global.-1.ttslua) if you want the setup console to spawn everything from an empty table.
4. Import the save into Tabletop Simulator or paste the global script into an existing save.
5. After load, find the `Antz Setup Console` block that the global script spawns near the table edge.
6. Use the `Players` button on that block to choose `2`, `3`, or `4` players.
7. Press `Setup Antz` on that block to spawn the board, the right number of player mats, the chamber deck, the threat deck, and utility bags. The spawned mats include tableau snap points for chamber cards.

## Suggested First Table Layout

- board in the center
- colony mats arranged automatically for 2p, 3p, or 4p when using `Setup Antz`
- colony deck on the left side of the board
- threat deck on the right side of the board
- worker and resource tokens above the active player area

## Regenerate Assets

```bash
python3 TTS/tools_generate_assets.py
```

If you only want to rebuild SVG sources and skip PNG export:

```bash
python3 TTS/tools_generate_assets.py --svg-only
```

## Next TTS Improvements

1. Replace the temporary utility bags with custom token bags or prefilled starter kits.
2. Add hidden player aids and round reference cards.
3. Split long-route spaces into movement-cost markers if movement becomes a core rule.
4. Add zone scripting if event cards start targeting exact board branches.
