import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = ROOT / 'data' / 'cards.json'
SVG_OUT = ROOT / 'assets' / 'svg'
PNG_OUT = ROOT / 'assets' / 'png'
PNG_RENDERER = ROOT / 'tools_render_pngs.js'

CARD_W = 750
CARD_H = 1050


def esc(text: str) -> str:
    return (text.replace('&', '&amp;')
                .replace('<', '&lt;')
                .replace('>', '&gt;'))


def wrap(text: str, width: int):
    words = text.split()
    lines = []
    line = []
    count = 0
    for word in words:
        extra = len(word) + (1 if line else 0)
        if count + extra > width and line:
            lines.append(' '.join(line))
            line = [word]
            count = len(word)
        else:
            line.append(word)
            count += extra
    if line:
        lines.append(' '.join(line))
    return lines


def chamber_svg(card):
    title_lines = wrap(card['name'], 16)
    body_lines = wrap(card['text'], 34)
    upgrade_lines = wrap(card['upgrade'], 36)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{CARD_W}" height="{CARD_H}" viewBox="0 0 {CARD_W} {CARD_H}">
  <rect width="{CARD_W}" height="{CARD_H}" rx="28" fill="#f5ecd7"/>
  <rect x="18" y="18" width="{CARD_W-36}" height="{CARD_H-36}" rx="22" fill="#f5ecd7" stroke="#24180f" stroke-width="8"/>
  <rect x="40" y="40" width="{CARD_W-80}" height="92" rx="18" fill="{card['color']}"/>
  <text x="58" y="104" fill="#2a1d14" font-size="42" font-family="Trebuchet MS" font-weight="700">{'<tspan x="58" dy="0">' + '</tspan><tspan x="58" dy="44">'.join(map(esc, title_lines)) + '</tspan>'}</text>
  <text x="58" y="182" fill="#5b4434" font-size="24" font-family="Georgia">{esc(card['type'])} | Cost: {esc(card['cost'])}</text>
  <text x="58" y="270" fill="#2a1d14" font-size="34" font-family="Georgia">{'<tspan x="58" dy="0">' + '</tspan><tspan x="58" dy="42">'.join(map(esc, body_lines)) + '</tspan>'}</text>
  <rect x="40" y="760" width="{CARD_W-80}" height="210" rx="18" fill="#e8dcc7" stroke="#5b4434" stroke-width="4"/>
  <text x="58" y="818" fill="#2a1d14" font-size="30" font-family="Trebuchet MS" font-weight="700">Upgrade / Notes</text>
  <text x="58" y="868" fill="#2a1d14" font-size="28" font-family="Georgia">{'<tspan x="58" dy="0">' + '</tspan><tspan x="58" dy="34">'.join(map(esc, upgrade_lines)) + '</tspan>'}</text>
</svg>'''


def event_svg(card):
    title_lines = wrap(card['name'], 16)
    body_lines = wrap(card['text'], 34)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{CARD_W}" height="{CARD_H}" viewBox="0 0 {CARD_W} {CARD_H}">
  <rect width="{CARD_W}" height="{CARD_H}" rx="28" fill="#f6edd8"/>
  <rect x="18" y="18" width="{CARD_W-36}" height="{CARD_H-36}" rx="22" fill="#f6edd8" stroke="#23170f" stroke-width="8"/>
  <rect x="40" y="40" width="{CARD_W-80}" height="82" rx="14" fill="{card['color']}"/>
  <text x="58" y="94" fill="#fff8ec" font-size="30" font-family="Trebuchet MS" font-weight="700">{esc(card['type']).upper()}</text>
  <text x="58" y="196" fill="#2a1d14" font-size="48" font-family="Trebuchet MS" font-weight="700">{'<tspan x="58" dy="0">' + '</tspan><tspan x="58" dy="50">'.join(map(esc, title_lines)) + '</tspan>'}</text>
  <text x="58" y="330" fill="#2a1d14" font-size="34" font-family="Georgia">{'<tspan x="58" dy="0">' + '</tspan><tspan x="58" dy="42">'.join(map(esc, body_lines)) + '</tspan>'}</text>
</svg>'''


def token_sheet(labels):
    colors = ['#d1a943', '#5b8a43', '#8b5b4a', '#5a88a5', '#ca6956', '#c59ecf']
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1200" viewBox="0 0 1800 1200">', '<rect width="1800" height="1200" fill="#efe2b8"/>']
    for i, label in enumerate(labels):
        col = i % 3
        row = i // 3
        x = 180 + col * 540
        y = 240 + row * 420
        color = colors[i % len(colors)]
        parts.append(f'<circle cx="{x}" cy="{y}" r="120" fill="{color}" stroke="#2a1d14" stroke-width="8"/>')
        parts.append(f'<text x="{x}" y="{y-10}" text-anchor="middle" fill="#fff8ea" font-size="46" font-family="Trebuchet MS" font-weight="700">{esc(label)}</text>')
        parts.append(f'<text x="{x}" y="{y+44}" text-anchor="middle" fill="#fff8ea" font-size="24" font-family="Georgia">Token</text>')
    parts.append('</svg>')
    return '\n'.join(parts)


def card_sheet(cards, render_fn, cols, rows):
    width = cols * CARD_W
    height = rows * CARD_H
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">', f'<rect width="{width}" height="{height}" fill="#111"/>']
    for i, card in enumerate(cards):
        col = i % cols
        row = i // cols
        parts.append(f'<g transform="translate({col * CARD_W}, {row * CARD_H})">{render_fn(card)[len("<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"750\" height=\"1050\" viewBox=\"0 0 750 1050\">"):-len("</svg>")]}</g>')
    parts.append('</svg>')
    return '\n'.join(parts)


def inner_svg(svg_text: str) -> str:
    start = svg_text.find('>') + 1
    end = svg_text.rfind('</svg>')
    return svg_text[start:end]


def main():
    data = json.loads(DATA.read_text())
    SVG_OUT.mkdir(parents=True, exist_ok=True)
    PNG_OUT.mkdir(parents=True, exist_ok=True)
    colony_svgs = []
    event_svgs = []
    for card in data['colony_cards']:
        svg = chamber_svg(card)
        colony_svgs.append(svg)
        (SVG_OUT / f"chamber_{card['id']}.svg").write_text(svg)
    for card in data['event_cards']:
        svg = event_svg(card)
        event_svgs.append(svg)
        (SVG_OUT / f"event_{card['id']}.svg").write_text(svg)
    (SVG_OUT / 'tokens_sheet.svg').write_text(token_sheet(data['resource_tokens']))

    chamber_sheet = ['<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="2100" viewBox="0 0 1500 2100">', '<rect width="1500" height="2100" fill="#111"/>']
    for i, svg in enumerate(colony_svgs):
        col = i % 2
        row = i // 2
        chamber_sheet.append(f'<g transform="translate({col * CARD_W}, {row * CARD_H})">{inner_svg(svg)}</g>')
    chamber_sheet.append('</svg>')
    (SVG_OUT / 'chamber_sheet.svg').write_text('\n'.join(chamber_sheet))

    event_sheet = ['<svg xmlns="http://www.w3.org/2000/svg" width="2250" height="2100" viewBox="0 0 2250 2100">', '<rect width="2250" height="2100" fill="#111"/>']
    for i, svg in enumerate(event_svgs):
        col = i % 3
        row = i // 3
        event_sheet.append(f'<g transform="translate({col * CARD_W}, {row * CARD_H})">{inner_svg(svg)}</g>')
    event_sheet.append('</svg>')
    (SVG_OUT / 'event_sheet.svg').write_text('\n'.join(event_sheet))

    if '--svg-only' not in sys.argv:
        subprocess.run(
            ['node', str(PNG_RENDERER), str(SVG_OUT), str(PNG_OUT)],
            cwd=ROOT.parent,
            check=True,
        )


if __name__ == '__main__':
    main()
