"""Drives the Android emulator to take the website's screenshots (see docs/website/SCREENSHOTS.md).
emu.py ui                         list what is on screen (text / description, bounds)
emu.py tap "Text"                 tap the first element whose text or description contains Text
emu.py tapn N "Text"              tap the Nth match
emu.py long "Text"                long-press it
emu.py swipe up|down [px]         scroll
emu.py back
emu.py type "words"               type into the focused field
emu.py shot name                  screenshot -> shots/name.png (full size)
emu.py view name                  small copy for looking at -> shots/name-s.png
"""
import os
import re
import subprocess
import sys
import time

ADB = os.path.join(os.environ["LOCALAPPDATA"], "Android", "Sdk", "platform-tools", "adb.exe")
HERE = os.path.dirname(os.path.abspath(__file__))
SHOTS = os.path.join(HERE, "shots")
os.makedirs(SHOTS, exist_ok=True)


def adb(*args, binary=False):
    out = subprocess.run([ADB, *args], capture_output=True)
    return out.stdout if binary else out.stdout.decode("utf-8", "replace")


def nodes():
    xml = adb("exec-out", "uiautomator", "dump", "/dev/tty")
    found = []
    for m in re.finditer(r"<node [^>]*>", xml):
        n = m.group(0)
        text = re.search(r' text="([^"]*)"', n).group(1)
        desc = re.search(r' content-desc="([^"]*)"', n).group(1)
        b = re.search(r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', n)
        click = 'clickable="true"' in n
        if (text or desc) and b:
            x1, y1, x2, y2 = map(int, b.groups())
            found.append({"text": text, "desc": desc, "box": (x1, y1, x2, y2), "click": click})
    return found


def find(label, nth=1):
    all_nodes = nodes()
    exact = [n for n in all_nodes if label.lower() in (n["text"].lower(), n["desc"].lower())]
    hits = exact or [n for n in all_nodes if label.lower() in (n["text"] + " | " + n["desc"]).lower()]
    if len(hits) < nth:
        print("not found:", label)
        sys.exit(1)
    return hits[nth - 1]


def centre(n):
    x1, y1, x2, y2 = n["box"]
    return (x1 + x2) // 2, (y1 + y2) // 2


cmd = sys.argv[1]
if cmd == "ui":
    for n in nodes():
        print(("* " if n["click"] else "  ") + f'{n["text"]!r:45.45} {n["desc"]!r:50.50} {n["box"]}')
elif cmd in ("tap", "tapn", "long"):
    nth = int(sys.argv[2]) if cmd == "tapn" else 1
    label = sys.argv[3] if cmd == "tapn" else sys.argv[2]
    x, y = centre(find(label, nth))
    if cmd == "long":
        adb("shell", "input", "swipe", str(x), str(y), str(x), str(y), "800")
    else:
        adb("shell", "input", "tap", str(x), str(y))
    time.sleep(1.5)
    print("tapped", label, x, y)
elif cmd == "swipe":
    px = int(sys.argv[3]) if len(sys.argv) > 3 else 900
    y1, y2 = (1700, 1700 - px) if sys.argv[2] == "up" else (700, 700 + px)
    adb("shell", "input", "swipe", "540", str(y1), "540", str(y2), "600")
    time.sleep(1.2)
elif cmd == "back":
    adb("shell", "input", "keyevent", "4")
    time.sleep(1.2)
elif cmd == "type":
    adb("shell", "input", "text", sys.argv[2].replace(" ", "%s"))
    time.sleep(0.8)
elif cmd in ("shot", "view"):
    name = sys.argv[2]
    png = adb("exec-out", "screencap", "-p", binary=True)
    path = os.path.join(SHOTS, name + ".png")
    open(path, "wb").write(png)
    from PIL import Image
    im = Image.open(path)
    im.resize((im.width // 3, im.height // 3)).save(os.path.join(SHOTS, name + "-s.png"))
    print(path, im.size)
