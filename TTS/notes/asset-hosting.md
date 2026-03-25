# Asset Hosting Notes

Tabletop Simulator custom assets generally need reachable file URLs.

Use one of these paths:
- host the SVGs or converted PNGs somewhere reachable by TTS
- upload images manually from inside TTS when creating each object
- convert the provided SVGs to PNG sheets and swap the placeholder URLs in `saves/Antz_Template.json`

Recommended hosted assets:
- `assets/svg/board.svg`
- `assets/svg/player_mat.svg`
- `assets/svg/chamber_back.svg`
- `assets/svg/event_back.svg`
- generated card fronts from `assets/svg/`
