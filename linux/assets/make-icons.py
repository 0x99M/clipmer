#!/usr/bin/env python3
"""Render Clipmer's icon set from one geometry definition.

The mark is a clipboard whose middle row is masked as three dots — the
clipboard says what the app is, the dots say what makes it different.

Two drawings, not one scaled drawing. Below about 32px the full mark's
1.8-unit rows and 1.15-unit dots fall under two device pixels and turn to
mush, so SMALL redraws it with one row instead of two and fatter dots.

Everything is drawn at 8x and resampled with LANCZOS; there is no SVG
rasteriser on this machine and the shapes are only rounded rectangles and
circles, so Pillow draws them directly.

Usage: python3 linux/assets/make-icons.py
"""

import os
from PIL import Image, ImageDraw

ORANGE = (233, 84, 32, 255)   # #E95420, the brand orange the whole site uses
INK = (26, 20, 17, 255)       # #1a1411, a near-black carrying a little of the orange

SS = 8                        # supersample factor
TILE_RADIUS = 0.225           # app-tile corner radius, as a fraction of its side
GLYPH_FRAC = 0.68             # glyph box as a fraction of the tile
GLYPH_FRAC_16 = 0.80          # 16px has no padding to spare; let the mark fill it

# Geometry on a 24x24 grid. body/clasp are drawn in ink; rows are punched
# back out of it.
FULL = {
    "body": (3.5, 4.0, 17.0, 18.0, 3.2),
    "clasp": (8.5, 1.6, 7.0, 4.6, 2.3),
    "rows": [
        ("rect", 7.0, 9.8, 10.0, 1.8, 0.9),
        ("dots", 14.3, 1.15, (8.4, 12.0, 15.6)),
        ("rect", 7.0, 17.0, 6.6, 1.8, 0.9),
    ],
}

SMALL = {
    "body": (3.0, 4.5, 18.0, 17.5, 3.0),
    "clasp": (8.5, 1.8, 7.0, 4.4, 2.2),
    "rows": [
        ("rect", 6.5, 9.4, 11.0, 2.4, 1.2),
        ("dots", 15.2, 1.6, (7.6, 12.0, 16.4)),
    ],
}

# 16px. Three dots need three gaps, and at this size a gap is under half a
# pixel — they close up into the bar they were meant to contrast with. So the
# dots go, and what is left is the thing that has to survive: a clipboard.
# The masked row reappears at 32 and up, where there is room to read it.
TINY = {
    "body": (2.5, 5.0, 19.0, 17.0, 3.0),
    "clasp": (8.0, 2.0, 8.0, 5.0, 2.5),
    "rows": [
        ("rect", 6.0, 10.0, 12.0, 2.8, 1.4),
        ("rect", 6.0, 15.6, 12.0, 2.8, 1.4),
    ],
}


def draw_glyph(d, geom, scale, off, ink, hole):
    """Draw the mark: body and clasp in `ink`, content rows in `hole`."""

    def rect(x, y, w, h, r, fill):
        d.rounded_rectangle(
            [off + x * scale, off + y * scale,
             off + (x + w) * scale, off + (y + h) * scale],
            radius=r * scale, fill=fill,
        )

    def circle(cx, cy, r, fill):
        d.ellipse(
            [off + (cx - r) * scale, off + (cy - r) * scale,
             off + (cx + r) * scale, off + (cy + r) * scale],
            fill=fill,
        )

    rect(*geom["body"], ink)
    rect(*geom["clasp"], ink)
    for row in geom["rows"]:
        if row[0] == "rect":
            rect(*row[1:], hole)
        else:
            _, cy, r, cxs = row
            for cx in cxs:
                circle(cx, cy, r, hole)


def app_tile(size, geom, radius=TILE_RADIUS, glyph_frac=GLYPH_FRAC):
    """Full-bleed orange tile with the mark knocked out of it in ink.

    The tile is opaque, so the punched rows are simply drawn back in orange
    rather than masked.
    """
    px = size * SS
    img = Image.new("RGBA", (px, px), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if radius > 0:
        d.rounded_rectangle([0, 0, px - 1, px - 1], radius=px * radius, fill=ORANGE)
    else:
        d.rectangle([0, 0, px - 1, px - 1], fill=ORANGE)
    g = px * glyph_frac
    draw_glyph(d, geom, g / 24.0, (px - g) / 2.0, INK, ORANGE)
    return img.resize((size, size), Image.LANCZOS)


def tray_glyph(size, geom, colour=ORANGE, inset=0.04):
    """The mark alone on transparency, for the system tray.

    Electron hands the tray a plain PNG, and nothing recolours it, so this
    has to read on a dark panel and a light one as drawn. Orange clears 3:1
    against both; white or ink would vanish on one of them.

    The rows are real holes here, not orange fill, so the panel shows
    through them whatever colour it is.
    """
    px = size * SS
    mask = Image.new("L", (px, px), 0)
    g = px * (1 - 2 * inset)
    draw_glyph(ImageDraw.Draw(mask), geom, g / 24.0, (px - g) / 2.0, 255, 0)
    img = Image.new("RGBA", (size, size), colour[:3] + (0,))
    img.putalpha(mask.resize((size, size), Image.LANCZOS))
    return img


def mark_svg(geom, colour=ORANGE):
    """The mark alone as SVG, for the site nav.

    The nav sits over the hero's radial glow and grid, so the punched rows have
    to be real holes rather than rows painted in the background colour — hence
    a mask rather than two fills. The viewBox is cropped to the ink, so a CSS
    height of 30px makes the *mark* 30px tall instead of a 24-unit grid with
    padding baked into it.

    Vector rather than one of the PNGs because the nav is the one place the
    mark is laid out against text, where a raster edge at 30px next to live
    type is visible.
    """
    x0 = min(geom["body"][0], geom["clasp"][0])
    y0 = min(geom["body"][1], geom["clasp"][1])
    x1 = max(geom["body"][0] + geom["body"][2], geom["clasp"][0] + geom["clasp"][2])
    y1 = max(geom["body"][1] + geom["body"][3], geom["clasp"][1] + geom["clasp"][3])
    w, h = x1 - x0, y1 - y0

    def n(v):
        return f"{v:g}"

    def rect(x, y, rw, rh, r, fill):
        return (f'<rect x="{n(x)}" y="{n(y)}" width="{n(rw)}" height="{n(rh)}" '
                f'rx="{n(r)}" fill="{fill}"/>')

    parts = [rect(*geom["body"], "#fff"), rect(*geom["clasp"], "#fff")]
    for row in geom["rows"]:
        if row[0] == "rect":
            parts.append(rect(*row[1:], "#000"))
        else:
            _, cy, r, cxs = row
            for cx in cxs:
                parts.append(
                    f'<circle cx="{n(cx)}" cy="{n(cy)}" r="{n(r)}" fill="#000"/>'
                )

    hex_colour = "#%02X%02X%02X" % colour[:3]
    box = f'<rect x="{n(x0)}" y="{n(y0)}" width="{n(w)}" height="{n(h)}"'
    indent = "\n    "
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{n(x0)} {n(y0)} {n(w)} {n(h)}" '
        f'width="{n(round(30 * w / h))}" height="30" role="img" aria-label="Clipmer">'
        f'{indent}<title>Clipmer</title>'
        f'{indent}<mask id="clipmer-mark">'
        f'{indent}  {box} fill="#000"/>'
        + "".join(f"{indent}  {part}" for part in parts)
        + f'{indent}</mask>'
        f'{indent}{box} fill="{hex_colour}" mask="url(#clipmer-mark)"/>'
        "\n</svg>\n"
    )


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    repo = os.path.dirname(os.path.dirname(here))
    icons = os.path.join(here, "icons")
    web = os.path.join(repo, "web", "app")
    os.makedirs(icons, exist_ok=True)

    written = []

    # electron-builder reads this directory for the desktop/app icon.
    for size in (16, 32, 48, 64, 128, 256, 512, 1024):
        if size <= 16:
            geom, frac = TINY, GLYPH_FRAC_16
        elif size <= 32:
            geom, frac = SMALL, GLYPH_FRAC
        else:
            geom, frac = FULL, GLYPH_FRAC
        name = {id(TINY): "tiny", id(SMALL): "small", id(FULL): "full"}[id(geom)]
        path = os.path.join(icons, f"{size}x{size}.png")
        app_tile(size, geom, glyph_frac=frac).save(path)
        written.append((path, f"{size}x{size}", name))

    # main.js:279 loads this one into the tray.
    path = os.path.join(here, "icon.png")
    tray_glyph(128, SMALL).save(path)
    written.append((path, "128x128", "small, transparent"))

    # Next picks these up by filename; no code change needed. icon.png stays
    # 512 because app/opengraph-image.tsx reads this exact file and renders it
    # at 80px into the social card.
    path = os.path.join(web, "icon.png")
    app_tile(512, FULL).save(path)
    written.append((path, "512x512", "full"))

    # The tab icon. Without this the browser shrinks the 512 to 16 and the
    # mark turns to mush, so each size in the container is drawn for its size.
    # Must sit at the top level of app/ — Next only reads favicon there.
    path = os.path.join(web, "favicon.ico")
    app_tile(48, FULL).save(
        path, format="ICO", sizes=[(48, 48), (32, 32), (16, 16)],
        append_images=[app_tile(32, SMALL),
                       app_tile(16, TINY, glyph_frac=GLYPH_FRAC_16)],
    )
    written.append((path, "48/32/16", "full, small, tiny"))

    # The site nav's brand lockup. public/ rather than app/, because app/ is
    # where Next claims filenames like icon.png for metadata — this one is
    # referenced by <img src> and is nothing to do with the tab or the OG card.
    path = os.path.join(repo, "web", "public", "clipmer-mark.svg")
    with open(path, "w") as fh:
        fh.write(mark_svg(FULL))
    written.append((path, "vector", "full, transparent"))

    # iOS applies its own squircle mask, so this one ships square.
    path = os.path.join(web, "apple-icon.png")
    app_tile(256, FULL, radius=0).save(path)
    written.append((path, "256x256", "full, square"))

    for path, size, note in written:
        print(f"  {os.path.relpath(path, repo):34} {size:>9}  {note}")
    print(f"\n{len(written)} files written.")


if __name__ == "__main__":
    main()
