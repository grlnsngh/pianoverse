"""Crops the emulator screenshots to the app (no status or navigation bar), saves WebP at 360 and 720 px
wide in web/screens/, and draws the link-preview picture web/og.png (1200 x 630)."""
import os

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
SHOTS = os.path.join(HERE, "shots")
OUT = os.path.join(REPO, "web", "screens")
os.makedirs(OUT, exist_ok=True)

TOP, BOTTOM = 132, 2337  # the status bar and the navigation bar of the Pixel 8 emulator
NAMES = ["today", "pianos", "rent", "piano", "income", "deposits", "calendar", "service", "paper", "labels"]

for name in NAMES:
    im = Image.open(os.path.join(SHOTS, name + ".png")).convert("RGB").crop((0, TOP, 1080, BOTTOM))
    for width in (360, 720):
        height = round(im.height * width / im.width)
        im.resize((width, height), Image.LANCZOS).save(os.path.join(OUT, f"{name}-{width}.webp"), "WEBP", quality=82, method=6)
    print(name, im.size, round(im.height * 720 / im.width))

# The link-preview picture: the app's orange, the mark, the name and line, and two real screens
FONT = os.path.join(REPO, "node_modules", "@expo-google-fonts", "figtree")
bold = ImageFont.truetype(os.path.join(FONT, "700Bold", "Figtree_700Bold.ttf"), 76)
semi = ImageFont.truetype(os.path.join(FONT, "600SemiBold", "Figtree_600SemiBold.ttf"), 34)
regular = ImageFont.truetype(os.path.join(FONT, "400Regular", "Figtree_400Regular.ttf"), 30)
og = Image.new("RGB", (1200, 630), "#FF9C01")
d = ImageDraw.Draw(og)
mark = Image.open(os.path.join(REPO, "web", "mark.png")).convert("RGBA").resize((96, 96), Image.LANCZOS)
og.paste(mark, (72, 72), mark)
d.text((72, 200), "Every piano,", font=bold, fill="#1A1814")
d.text((72, 282), "every rental,", font=bold, fill="#1A1814")
d.text((72, 364), "in one place.", font=bold, fill="#1A1814")
d.text((72, 478), "Pianoverse", font=semi, fill="#1A1814")
d.text((72, 522), "Free app for renting and selling pianos", font=regular, fill="#1A1814")


def phone(name, width, x, y):
    im = Image.open(os.path.join(SHOTS, name + ".png")).convert("RGB").crop((0, TOP, 1080, BOTTOM))
    h = round(im.height * width / im.width)
    im = im.resize((width, h), Image.LANCZOS)
    border = 10
    frame = Image.new("RGBA", (width + border * 2, h + border * 2), (0, 0, 0, 0))
    ImageDraw.Draw(frame).rounded_rectangle([0, 0, frame.width - 1, frame.height - 1], radius=40, fill="#1A1814")
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, width - 1, h - 1], radius=30, fill=255)
    frame.paste(im, (border, border), mask)
    og.paste(frame, (x, y), frame)


phone("pianos", 230, 900, 120)
phone("today", 260, 700, 60)
og.save(os.path.join(REPO, "web", "og.png"), "PNG", optimize=True)
print("og", og.size, os.path.getsize(os.path.join(REPO, "web", "og.png")))
