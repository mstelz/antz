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

def main():
    lua_path = ROOT / "scripts" / "Global.-1.ttslua"
    xml_path = ROOT / "scripts" / "Global.-1.xml"
    save_path = ROOT / "saves" / "Antz_Template.json"

    lua_script = lua_path.read_text(encoding="utf-8")
    xml_ui = xml_path.read_text(encoding="utf-8")

    with open(save_path, "r", encoding="utf-8") as f:
        save = json.load(f)

    save["LuaScript"] = lua_script
    save["XmlUI"] = xml_ui

    with open(save_path, "w", encoding="utf-8") as f:
        json.dump(save, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"Injected {len(lua_script)} chars of Lua and {len(xml_ui)} chars of XML into {save_path.name}")

if __name__ == "__main__":
    main()
