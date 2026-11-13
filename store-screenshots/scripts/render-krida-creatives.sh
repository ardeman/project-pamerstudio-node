#!/usr/bin/env bash
# App Store creative assets for Krida (Bedug-style header + search result).
#   public/screenshots/apple/creatives/<locale>/header.png         3840 × 1646
#   public/screenshots/apple/creatives/<locale>/search_result.png  3840 × 2560
#
# Uses Apple bezels from project_bedug_flutter/store/bezels (same as Bedug) and
# Krida captures under public/screenshots/apple/. Run from store-screenshots/:
#   ./scripts/render-krida-creatives.sh
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"
SHOTS="$ROOT/public/screenshots/apple"
OUT="$ROOT/public/screenshots/apple/creatives"
ICON="$ROOT/public/app-icon.png"
BEDUG="${BEDUG_STORE:-$HOME/Documents/github/project_bedug_flutter/store}"
BEZELS="$BEDUG/bezels"
DEVICE_MJS="$BEDUG/device.mjs"
TMP="$(mktemp -d)"
trap 'rm -rf -- "${TMP:?}"' EXIT

# Prefer system Chrome; fall back to Playwright's Chromium (no Chrome.app on this Mac).
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
if [[ ! -x "$CHROME" ]]; then
  CHROME="$(cd "$ROOT" && node -e "console.log(require('playwright').chromium.executablePath())")"
fi
[[ -x "$CHROME" ]] || { echo "No Chrome/Chromium found (install Chrome or npx playwright install chromium)." >&2; exit 1; }
echo "using $CHROME"

[[ -f "$DEVICE_MJS" && -f "$BEZELS/screens.txt" ]] || {
  echo "Missing Bedug bezels at $BEDUG (set BEDUG_STORE=…)." >&2
  exit 1
}
[[ -f "$ICON" ]] || { echo "Missing $ICON" >&2; exit 1; }

# Same radial terracotta as Krida's in-app Theme.backdropBrush (glow → edge).
STYLE='
  html,body{margin:0}
  body{font-family:ui-rounded,"SF Pro Rounded",-apple-system,system-ui,sans-serif;color:#2B1D14;
       background:radial-gradient(circle at 35% 25%,#F7D7B5 0%,#E39A5C 100%);overflow:hidden}
  h1{margin:0;font-weight:800;letter-spacing:0;color:#2B1D14}
'

shot() {
  printf '<!doctype html><html><head><meta charset="utf-8"><style>%s</style></head><body style="width:%spx;height:%spx">%s</body></html>' \
    "$STYLE" "$1" "$2" "$3" > "$TMP/page.html"
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files \
    --window-size="$1,$2" --screenshot="$4" "file://$TMP/page.html"
  [[ -s "$4" ]] || { echo "Chrome screenshot failed for $4" >&2; exit 1; }
}

# Resize a capture to an exact bezel screen size (cover-crop via sips pad/crop).
fit() { # src w h out
  local src=$1 w=$2 h=$3 out=$4
  sips -z "$h" "$w" "$src" --out "$out" >/dev/null
}

# device.mjs must run with cwd = Bedug store (it resolves bezels relatively).
device() {
  local kind=$1 image=$2 box_w=$3 box_h=$4 style=${5:-}
  (cd "$BEDUG" && node device.mjs "$kind" "$image" "$box_w" "$box_h" dark en "$style")
}

opaque() { # in.png out.png — drop alpha (ASC rejects alpha creatives)
  sips -s format jpeg -s formatOptions 100 "$1" --out "$TMP/o.jpg" >/dev/null
  sips -s format png "$TMP/o.jpg" --out "$2" >/dev/null
}

prepare_locale() { # locale → prepares $TMP/shots/<kind>.png
  local loc=$1
  local iphone="$SHOTS/iphone/$loc"
  local ipad="$SHOTS/ipad/$loc"
  mkdir -p "$TMP/shots"
  # Krida is landscape-only — phone + tablet screens for landscape bezels.
  fit "$iphone/01-hero.png" 2622 1206 "$TMP/shots/iphone-land-hero.png"
  fit "$iphone/02-boards-a.png" 2622 1206 "$TMP/shots/iphone-land-boards.png"
  fit "$iphone/04-matchmaking.png" 2622 1206 "$TMP/shots/iphone-land-online.png"
  fit "$iphone/05-emotes.png" 2622 1206 "$TMP/shots/iphone-land-emotes.png"
  fit "$ipad/01-hero.png" 2752 2064 "$TMP/shots/ipad-hero.png"
  fit "$ipad/03-nearby-a.png" 2752 2064 "$TMP/shots/ipad-nearby.png"
}

render_locale() { # locale tagline
  local loc=$1 tagline=$2
  local dir="$OUT/$loc"
  mkdir -p "$dir"
  prepare_locale "$loc"

  # Header: fan of landscape devices (no copy — ASC shows icon + name under the banner).
  # iPhone boxes keep ~2760×1350 bezel aspect; iPads stay landscape at the edges.
  shot 3840 1646 "<div style=\"position:relative;height:1646px;overflow:hidden\">
      <div style=\"position:absolute;left:-420px;top:480px\">$(device ipad "$TMP/shots/ipad-nearby.png" 1400 1070 "transform:rotate(-6deg)")</div>
      <div style=\"position:absolute;left:2860px;top:480px\">$(device ipad "$TMP/shots/ipad-hero.png" 1400 1070 "transform:rotate(6deg)")</div>
      <div style=\"position:absolute;left:620px;top:980px\">$(device iphone-landscape "$TMP/shots/iphone-land-boards.png" 1280 625 "transform:rotate(-5deg)")</div>
      <div style=\"position:absolute;left:1940px;top:980px\">$(device iphone-landscape "$TMP/shots/iphone-land-online.png" 1280 625 "transform:rotate(5deg)")</div>
      <div style=\"position:absolute;left:1120px;top:420px\">$(device iphone-landscape "$TMP/shots/iphone-land-hero.png" 1600 780)</div>
    </div>" "$TMP/header.png"

  # Search: icon + tagline above landscape iPad + overlapping landscape iPhone.
  shot 3840 2560 "<div style=\"display:flex;flex-direction:column;align-items:center;justify-content:center;height:2560px;gap:110px\">
      <div style=\"display:flex;align-items:center;gap:60px\">
        <img src=\"file://$ICON\" width=\"360\" height=\"360\" style=\"border-radius:80px;box-shadow:0 20px 50px rgba(0,0,0,.3)\">
        <h1 style=\"font-size:150px;max-width:2800px;line-height:1.1\">$tagline</h1>
      </div>
      <div style=\"display:flex;align-items:flex-end;justify-content:center\">
        $(device ipad "$TMP/shots/ipad-hero.png" 2500 1800)
        $(device iphone-landscape "$TMP/shots/iphone-land-hero.png" 1500 735 "margin-left:-520px;margin-bottom:-40px;transform:rotate(3deg)")
      </div>
    </div>" "$TMP/search.png"

  opaque "$TMP/header.png" "$dir/header.png"
  opaque "$TMP/search.png" "$dir/search_result.png"
  echo "wrote $dir/header.png and search_result.png"
}

render_locale en "Traditional games. Warm 3D."
render_locale id "Permainan tradisional. Voxel 3D."
echo "Krida App Store creatives rendered."
