"""Draws the demo pianos' pictures: uprights and grands in a few woods, on a soft wall and floor.
python demo-images.py OUTDIR  ->  OUTDIR/demo_img_p01.jpg ... p16.jpg"""
import os
import sys

from PIL import Image, ImageDraw, ImageFilter

S = 2  # supersampling
W, H = 800 * S, 600 * S

WOODS = {
    "black": ("#17151a", "#2a2730", "#0d0c0f"),
    "walnut": ("#6b4430", "#835640", "#4a2e20"),
    "mahogany": ("#7a3b2a", "#954a36", "#52261b"),
    "rosewood": ("#4e2a22", "#653629", "#331a15"),
    "ebony": ("#201d22", "#34303a", "#121014"),
    "white": ("#e9e4da", "#f6f2ea", "#c9c2b4"),
}
ROOMS = [("#e9dfd0", "#cdbfa9"), ("#dfe5e6", "#bcc7c9"), ("#efe3dc", "#d3b8aa"), ("#e4e0d7", "#c2b9a6"), ("#dde2ea", "#b9c2d1")]


def room(draw, index):
    wall, floor = ROOMS[index % len(ROOMS)]
    draw.rectangle([0, 0, W, H], fill=wall)
    # a faint lighter band behind the piano
    for i in range(40):
        shade = tuple(min(255, int(int(wall[j : j + 2], 16) + 14 * (1 - i / 40))) for j in (1, 3, 5))
        draw.rectangle([0, int(H * 0.05) + i * 3 * S, W, int(H * 0.05) + (i + 1) * 3 * S], fill=shade)
    draw.rectangle([0, int(H * 0.8), W, H], fill=floor)
    draw.rectangle([0, int(H * 0.8) - 3 * S, W, int(H * 0.8)], fill="#ffffff55" if False else "#f4efe6")


def shadow(image, box, blur=22):
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).ellipse(box, fill=(0, 0, 0, 90))
    image.alpha_composite(layer.filter(ImageFilter.GaussianBlur(blur * S)))


def upright(image, wood):
    base, light, dark = WOODS[wood]
    d = ImageDraw.Draw(image)
    x0, x1 = 150 * S, 650 * S
    top, bottom = 105 * S, 440 * S
    shadow(image, (x0 - 10 * S, bottom - 30 * S, x1 + 10 * S, bottom + 28 * S))
    d = ImageDraw.Draw(image)
    # body and lid
    d.rectangle([x0, top, x1, bottom], fill=base)
    d.rectangle([x0 - 10 * S, top - 14 * S, x1 + 10 * S, top + 4 * S], fill=light)
    d.rectangle([x0 - 10 * S, top + 4 * S, x1 + 10 * S, top + 9 * S], fill=dark)
    # the upper panel and the music desk
    d.rounded_rectangle([x0 + 22 * S, top + 28 * S, x1 - 22 * S, top + 150 * S], radius=6 * S, fill=light, outline=dark, width=2 * S)
    d.rounded_rectangle([x0 + 44 * S, top + 46 * S, x1 - 44 * S, top + 132 * S], radius=4 * S, fill=base, outline=dark, width=S)
    d.rectangle([x0 + 70 * S, top + 160 * S, x1 - 70 * S, top + 168 * S], fill=light)
    # keys
    ky0, ky1 = top + 178 * S, top + 236 * S
    d.rectangle([x0 + 10 * S, ky0 - 10 * S, x1 - 10 * S, ky0], fill=dark)
    kx0, kx1 = x0 + 28 * S, x1 - 28 * S
    d.rectangle([kx0, ky0, kx1, ky1], fill="#f7f4ee")
    count = 28
    kw = (kx1 - kx0) / count
    for i in range(count + 1):
        x = kx0 + i * kw
        d.line([x, ky0, x, ky1], fill="#bdb7aa", width=S)
    pattern = [1, 1, 0, 1, 1, 1, 0]
    for i in range(count - 1):
        if pattern[i % 7]:
            bx = kx0 + (i + 1) * kw - kw * 0.3
            d.rectangle([bx, ky0, bx + kw * 0.6, ky0 + (ky1 - ky0) * 0.62], fill="#111015")
    d.rectangle([kx0 - 14 * S, ky0 - 8 * S, kx0, ky1 + 6 * S], fill=light)
    d.rectangle([kx1, ky0 - 8 * S, kx1 + 14 * S, ky1 + 6 * S], fill=light)
    d.rectangle([x0 + 10 * S, ky1, x1 - 10 * S, ky1 + 8 * S], fill=dark)
    # the lower panel
    d.rounded_rectangle([x0 + 40 * S, ky1 + 24 * S, x1 - 40 * S, bottom - 18 * S], radius=6 * S, fill=light, outline=dark, width=2 * S)
    d.rounded_rectangle([x0 + 62 * S, ky1 + 42 * S, x1 - 62 * S, bottom - 36 * S], radius=4 * S, fill=base, outline=dark, width=S)
    # feet and pedals
    d.rectangle([x0 - 4 * S, bottom, x0 + 46 * S, bottom + 26 * S], fill=dark)
    d.rectangle([x1 - 46 * S, bottom, x1 + 4 * S, bottom + 26 * S], fill=dark)
    cx = (x0 + x1) // 2
    for dx in (-30, 0, 30):
        d.rounded_rectangle([cx + dx * S - 9 * S, bottom + 4 * S, cx + dx * S + 9 * S, bottom + 24 * S], radius=3 * S, fill="#c9a24a")
    # a brass nameplate and a gloss streak
    d.rectangle([cx - 36 * S, ky0 - 6 * S, cx + 36 * S, ky0 - 2 * S], fill="#c9a24a")


def grand(image, wood):
    base, light, dark = WOODS[wood]
    cx0, cx1 = 120 * S, 690 * S
    ground = 470 * S
    shadow(image, (cx0, ground - 26 * S, cx1, ground + 34 * S), blur=26)
    d = ImageDraw.Draw(image)
    # legs
    for x in (cx0 + 40 * S, cx0 + 250 * S, cx1 - 70 * S):
        d.rectangle([x, 330 * S, x + 26 * S, ground], fill=dark)
        d.rectangle([x - 6 * S, ground - 8 * S, x + 32 * S, ground + 4 * S], fill="#c9a24a")
    # the raised lid, behind the body
    d.polygon([(cx0 + 120 * S, 305 * S), (cx1 - 40 * S, 305 * S), (cx1 - 90 * S, 70 * S), (cx0 + 210 * S, 130 * S)], fill=dark, outline=base)
    d.polygon([(cx0 + 140 * S, 300 * S), (cx1 - 70 * S, 300 * S), (cx1 - 112 * S, 92 * S), (cx0 + 222 * S, 144 * S)], fill="#6b3d28" if wood != "white" else "#cfc6b6")
    d.line([(cx0 + 360 * S, 304 * S), (cx0 + 360 * S, 168 * S)], fill="#b9955a", width=5 * S)
    # the body: a long rounded case
    d.rounded_rectangle([cx0 + 60 * S, 296 * S, cx1, 350 * S], radius=26 * S, fill=base)
    d.rounded_rectangle([cx0 + 60 * S, 296 * S, cx1, 312 * S], radius=8 * S, fill=light)
    d.rectangle([cx0 + 60 * S, 342 * S, cx1 - 20 * S, 350 * S], fill=dark)
    # the keyboard end with the keys and the music desk
    d.rectangle([cx0, 306 * S, cx0 + 112 * S, 340 * S], fill=base)
    d.rectangle([cx0 - 4 * S, 312 * S, cx0 + 108 * S, 332 * S], fill="#f7f4ee")
    for i in range(16):
        x = cx0 + i * 7 * S
        d.line([x, 312 * S, x, 332 * S], fill="#bdb7aa", width=S)
        if i % 7 in (1, 2, 4, 5, 6) and i < 15:
            d.rectangle([x + 4 * S, 312 * S, x + 8 * S, 324 * S], fill="#111015")
    d.polygon([(cx0 + 40 * S, 296 * S), (cx0 + 150 * S, 296 * S), (cx0 + 150 * S, 238 * S), (cx0 + 60 * S, 226 * S)], fill=base, outline=dark)
    d.rectangle([cx0 + 8 * S, 340 * S, cx0 + 120 * S, 350 * S], fill=dark)
    # the pedal lyre
    d.rectangle([cx0 + 100 * S, 350 * S, cx0 + 112 * S, 420 * S], fill=dark)
    d.rectangle([cx0 + 82 * S, 418 * S, cx0 + 132 * S, 428 * S], fill="#c9a24a")


def picture(index, kind, wood):
    image = Image.new("RGBA", (W, H))
    room(ImageDraw.Draw(image), index)
    (grand if kind == "grand" else upright)(image, wood)
    return image.convert("RGB").resize((W // S, H // S), Image.LANCZOS)


# what each demo piano looks like
LOOKS = {
    "p01": ("upright", "walnut"), "p02": ("upright", "black"), "p03": ("upright", "ebony"), "p04": ("upright", "rosewood"),
    "p05": ("grand", "black"), "p06": ("upright", "black"), "p07": ("upright", "walnut"), "p08": ("upright", "mahogany"),
    "p09": ("upright", "black"), "p10": ("grand", "black"), "p11": ("grand", "ebony"), "p12": ("upright", "mahogany"),
    "p13": ("upright", "walnut"), "p14": ("upright", "rosewood"), "p15": ("upright", "white"), "p16": ("upright", "black"),
}

if __name__ == "__main__":
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    for i, (key, (kind, wood)) in enumerate(LOOKS.items()):
        picture(i, kind, wood).save(os.path.join(out, f"demo_img_{key}.jpg"), "JPEG", quality=86, optimize=True)
    print(len(LOOKS), "pictures in", out)
