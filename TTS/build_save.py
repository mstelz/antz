#!/usr/bin/env python3
"""Inject Global Lua script and XML UI into the TTS save JSON.

Usage:
    python3 TTS/build_save.py

Reads:
    TTS/scripts/Global.-1.ttslua
    TTS/scripts/Global.-1.xml
    TTS/saves/Antz_Template.json

Writes:
    TTS/saves/Antz_Template.json  (updated in-place)
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent

DEFAULT_SAVE = {
    "SaveName": "Antz Prototype",
    "GameMode": "Sandbox",
    "Date": "2026-03-25 00:00:00",
    "VersionNumber": "",
    "GameType": "",
    "GameComplexity": "",
    "Tags": [],
    "Gravity": 0.5,
    "PlayArea": 0.5,
    "Table": "Table_Rounded",
    "TableURL": None,
    "Sky": "Sky_Day",
    "SkyURL": None,
    "Note": (
        "Load this save, then click 'Setup Antz' on the control panel to spawn the full table. "
        "Assets are served from a local HTTP server (python3 -m http.server 8000 from the repo root). "
        "If 127.0.0.1 does not work, replace it with your LAN IP in scripts/Global.-1.ttslua and "
        "re-run: python3 TTS/build_save.py"
    ),
    "Rules": "",
    "PlayerTurn": "",
    "Grid": {
        "Type": 0,
        "Lines": False,
        "Color": {"r": 0, "g": 0, "b": 0},
        "Opacity": 0.75,
        "ThickLines": False,
        "Snapping": False,
        "Offset": False,
        "BothSnapping": False,
        "xSize": 2.0,
        "ySize": 2.0,
        "PosOffset": {"x": 0, "y": 1, "z": 0},
    },
    "Lighting": {
        "LightIntensity": 0.54,
        "LightColor": {"r": 1.0, "g": 0.9804, "b": 0.8902},
        "AmbientIntensity": 1.3,
        "AmbientType": 0,
        "AmbientSkyColor": {"r": 0.5, "g": 0.5, "b": 0.5},
        "AmbientEquatorColor": {"r": 0.5, "g": 0.5, "b": 0.5},
        "AmbientGroundColor": {"r": 0.5, "g": 0.5, "b": 0.5},
        "ReflectionIntensity": 1.0,
        "LutIndex": 0,
        "LutContribution": 1.0,
        "LutURL": None,
    },
    "Hands": {
        "Enable": True,
        "DisableUnused": False,
        "Hiding": 0,
        "HandTransforms": [],
    },
    "Turns": {
        "Enable": False,
        "Type": 0,
        "TurnOrder": [],
        "Reverse": False,
        "SkipEmpty": False,
        "DisableInteractions": False,
        "PassTurns": True,
        "TurnColor": "",
    },
    "CustomUIAssets": [],
    "LuaScript": "",
    "LuaScriptState": "",
    "XmlUI": "",
    "VectorLines": [],
    "ObjectStates": [],
    "SnapPoints": [],
    "DecalPallet": [],
    "Decals": [],
    "TabStates": {},
    "CameraStates": [],
}

def main():
    lua_path = ROOT / "scripts" / "Global.-1.ttslua"
    xml_path = ROOT / "scripts" / "Global.-1.xml"
    save_path = ROOT / "saves" / "Antz_Template.json"

    lua_script = lua_path.read_text(encoding="utf-8")
    xml_ui = xml_path.read_text(encoding="utf-8")

    with open(save_path, "r", encoding="utf-8") as f:
        existing_save = json.load(f)

    # Emit a stable top-level TTS save shape even if the template on disk was
    # previously minimal or missing fields expected by the game loader.
    save = dict(DEFAULT_SAVE)
    save.update(existing_save)

    save["LuaScript"] = lua_script
    save["XmlUI"] = xml_ui

    with open(save_path, "w", encoding="utf-8") as f:
        json.dump(save, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"Injected {len(lua_script)} chars of Lua and {len(xml_ui)} chars of XML into {save_path.name}")

if __name__ == "__main__":
    main()
