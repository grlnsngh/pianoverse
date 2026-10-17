# The website's screenshots: how they are taken

The ten screens on the landing page (`web/screens/*.webp`) and the link-preview picture (`web/og.png`) are real screenshots of the app, taken on 2026-10-17 from version 1.1.20 with both over-the-air updates applied. Take them again when a screen they show changes.

## What they show

| File | Screen | How to get there |
| --- | --- | --- |
| `today` | Today | Open the app |
| `pianos` | Pianos, **Rentable**, grid | Pianos tab, Rentable |
| `rent` | A rented piano with rent due (Young Chang U-121, Meera Kapoor) | Today, Rent due, tap it |
| `piano` | A rented grand piano (Pearl River GP-160) | Search "Pearl", tap it |
| `service` | A piano's Service section (Kurlmuller K-125) | Its page, scrolled until Service is at the top |
| `income` | Income | Account, Income |
| `deposits` | Deposits held | Income, Deposits held |
| `calendar` | Availability | Pianos, the calendar button |
| `paper` | The Letterhead screen with Monogram and the grand piano | Account, Paper forms, Change |
| `labels` | Print labels | Pianos, press and hold two pianos, Print labels |

## Setting up

1. **The data:** the demo data in the owner's account (`node scripts/demo/demo-data.js seed ...`, see `scripts/demo/demo-data.js`). Its dates are counted from the day it was made, so reseed (remove, then seed) shortly before new screenshots.
2. **The letterhead** (kept on the phone, not in the account): Account, Paper forms, Change, Your details: *Melody Piano House*, *Piano sales, rentals and tuning*, *Mall Road, Ludhiana*, *98140 12345*, GST *03AAAAA0000A1Z5*. All made up.
3. **The emulator:** the Pixel 8 Android 15 AVD in the Windows Android SDK, with the latest APK installed (`adb install -r build-….apk`), signed in by the owner. Font size 100%: `adb shell settings put system font_scale 1.0`.
4. **A clean status bar** (it is cropped off anyway, but this keeps the edges tidy):
   ```sh
   adb shell settings put global sysui_demo_allowed 1
   adb shell am broadcast -a com.android.systemui.demo -e command enter
   adb shell am broadcast -a com.android.systemui.demo -e command clock -e hhmm 0930
   adb shell am broadcast -a com.android.systemui.demo -e command battery -e level 100 -e plugged false
   adb shell am broadcast -a com.android.systemui.demo -e command notifications -e visible false
   ```

## Taking them

`scripts/site/emu.py` finds things on the emulator's screen by their words and taps them, and saves screenshots in `scripts/site/shots/` (not in git):

```sh
python scripts/site/emu.py ui            # what is on screen
python scripts/site/emu.py tap "Pianos"  # tap by text or description (exact match first)
python scripts/site/emu.py shot pianos   # save scripts/site/shots/pianos.png
```

Then `python scripts/site/make-screens.py` crops each one to the app (the Pixel 8's status bar is the top 132 px and its navigation bar the bottom 63 px, so 1080 × 2205 is kept), saves WebP at 360 and 720 px wide in `web/screens/`, and draws `web/og.png` from the Today and Pianos screens. If the size of a screen changes, change the `width` and `height` of its `<img>` in `index.html` to match (720 × 1470 now).
