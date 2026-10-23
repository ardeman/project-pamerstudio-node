#!/usr/bin/env bash
# Shared helpers for the promo videos (short-video.sh, promo-video.sh).
# Cards are HTML rendered by headless Chrome; gameplay comes from the frames
# that the app repo's tool/screenshots records of the "Watch me!" demos, the
# story scenes and a bump being fixed (run there):
#   VIDEO_FRAMES=1 flutter test tool/screenshots --update-goldens \
#     --plain-name 'video frames'
# Source this after setting HERE (the cobalagi folder) and W, H (video size).
# It works from the app repo (COBALAGI_APP, ../../github/project_cobalagi_flutter by
# default), which has the screenshots, voices, music and art.
set -euo pipefail

ROOT="$(cd "${COBALAGI_APP:-$HERE/../../../github/project_cobalagi_flutter}" && pwd)"
export COBALAGI_APP="$ROOT"
cd "$ROOT"
OUT="$HERE/out"
FRAMES="tool/screenshots/out/video"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
TMP="$(mktemp -d)"
trap 'rm -rf -- "${TMP:?}"' EXIT
mkdir -p "$OUT"
CHARACTER="$(sed -n '/<g id="foreground">/,/^  <\/g>$/p' branding/icon.svg)"
FADE=0.4
FPS=30

if [ ! -f "$FRAMES/loops-000.png" ]; then
  echo "No gameplay frames in $FRAMES. Record them first (see lib.sh)." >&2
  exit 1
fi

BASE_STYLE='
  html,body{margin:0;overflow:hidden}
  body{font-family:ui-rounded,"SF Pro Rounded",-apple-system,system-ui,sans-serif;color:#fff;
       background:radial-gradient(circle at 85% 12%,#ffb38a 0,transparent 45%),
                  radial-gradient(circle at 10% 92%,#ffc83d66 0,transparent 42%),
                  linear-gradient(180deg,#ff9a6b,#e0532f)}
  h1{margin:0;font-weight:900;letter-spacing:-1px;line-height:1.05}
  .device{position:absolute;background:#1d2b2b;box-shadow:0 40px 80px -30px #003030}
  .device img{display:block;width:100%;height:100%}
  .chip{display:inline-block;background:#ffffff26;border:3px solid #ffffff80;border-radius:999px;font-weight:800}
  .cta{display:inline-block;background:#ffc83d;color:#3a2a00;border-radius:999px;font-weight:900}
'

# card <html body> <extra css> <out.png>: one W x H picture.
card() {
  printf '<!doctype html><html><head><meta charset="utf-8"><style>%s html,body{width:%spx;height:%spx} %s</style></head><body>%s</body></html>' \
    "$BASE_STYLE" "$W" "$H" "$2" "$1" > "$TMP/page.html"
  # Headless Chrome's page is now and then a little shorter than its
  # window, leaving a strip at the bottom: shoot a taller window, then crop.
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files \
    --virtual-time-budget=3000 --window-size="$W,$((H + 200))" --screenshot="$TMP/shot.png" \
    "file://$TMP/page.html" 2>/dev/null
  ffmpeg -v error -y -i "$TMP/shot.png" -vf "crop=$W:$H:0:0" "$3"
}

# bezel <x> <y> <w> <h> <pad> <radius> <out.png>: a transparent picture
# with only the device's rounded bezel around the screen at x,y,w,h, laid
# over moving gameplay so its corners stay rounded.
bezel() {
  printf '<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;width:%spx;height:%spx;background:transparent;overflow:hidden} div{position:absolute;left:%spx;top:%spx;width:%spx;height:%spx;border:%spx solid #1d2b2b;border-radius:%spx}</style></head><body><div></div></body></html>' \
    "$W" "$H" "$(($1 - $5))" "$(($2 - $5))" "$3" "$4" "$5" "$6" > "$TMP/bezel.html"
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --default-background-color=00000000 \
    --window-size="$W,$H" --screenshot="$7" "file://$TMP/bezel.html" 2>/dev/null
}

SEGMENTS=()
DURATIONS=()
# Narration: "<file>|<segment index>[|<delay>]" entries, mixed over the
# music <delay> seconds (0.6 by default) into their segment.
VOICES=()
# Sound effects, "<file>|<segment index>|<delay>": like VOICES, but softer
# and left out of the subtitles.
SFX=()

# still <png> <seconds>: a card that slowly zooms in.
still() {
  local n=${#SEGMENTS[@]} out="$TMP/seg-${#SEGMENTS[@]}.mp4"
  ffmpeg -v error -y -framerate $FPS -loop 1 -t "$2" -i "$1" \
    -vf "scale=$((W * 2)):$((H * 2)),zoompan=z='min(1+0.0005*on,1.04)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${W}x${H}:fps=$FPS,setsar=1,format=yuv420p" \
    -t "$2" -c:v libx264 -preset fast -crf 16 "$out"
  SEGMENTS+=("$out")
  DURATIONS+=("$2")
}

# gameplay <background png> <bezel png> <frame prefix> <x> <y> <w> <h>
# <speed> [voice]: the recorded demo, played inside the device.
gameplay() {
  local out="$TMP/seg-${#SEGMENTS[@]}.mp4"
  local count
  count=$(ls "$FRAMES/$3"-[0-9][0-9][0-9].png | wc -l | tr -d ' ')
  local dur
  dur=$(echo "scale=3; $count / 10 / $8" | bc)
  ffmpeg -v error -y -framerate $FPS -loop 1 -t "$dur" -i "$1" \
    -framerate 10 -i "$FRAMES/$3-%03d.png" -loop 1 -i "$2" \
    -filter_complex "[1:v]setpts=PTS/$8,fps=$FPS,scale=$6:$7:flags=lanczos[g];[0:v][g]overlay=$4:$5:shortest=1[b];[b][2:v]overlay=0:0:shortest=1,setsar=1,format=yuv420p" \
    -t "$dur" -c:v libx264 -preset fast -crf 16 "$out"
  if [ -n "${9:-}" ]; then VOICES+=("$9|${#SEGMENTS[@]}"); fi
  SEGMENTS+=("$out")
  DURATIONS+=("$dur")
}

# finish <out.mp4>: cross-fades the segments, adds music and narration, and
# writes the narration's subtitles to <out.srt> and the YouTube text to
# <out.youtube.txt>.
finish() {
  local inputs=() filters="" last="0:v" offset=0 starts=(0)
  for s in "${SEGMENTS[@]}"; do inputs+=(-i "$s"); done
  local n=${#SEGMENTS[@]}
  for ((i = 1; i < n; i++)); do
    offset=$(echo "$offset + ${DURATIONS[$((i - 1))]} - $FADE" | bc)
    starts+=("$offset")
    filters+="[$last][$i:v]xfade=transition=fade:duration=$FADE:offset=$offset[x$i];"
    last="x$i"
  done
  local total
  total=$(echo "$offset + ${DURATIONS[$((n - 1))]}" | bc)
  # Music under everything, a little softer when someone speaks.
  inputs+=(-stream_loop -1 -i assets/audio/music/theme.mp3)
  local music=$n mix="[music]" k=0
  filters+="[$music:a]atrim=0:$total,volume=0.45,afade=t=in:d=1,afade=t=out:st=$(echo "$total - 1.5" | bc):d=1.5[music];"
  for v in ${VOICES[@]+"${VOICES[@]/#/1.6|}"} ${SFX[@]+"${SFX[@]/#/0.7|}"}; do
    local volume file seg after
    IFS='|' read -r volume file seg after <<<"$v"
    inputs+=(-i "$file")
    local delay
    delay=$(echo "(${starts[$seg]} + ${after:-0.6}) * 1000 / 1" | bc)
    filters+="[$((music + 1 + k)):a]adelay=${delay}|${delay},volume=$volume[v$k];"
    mix+="[v$k]"
    k=$((k + 1))
  done
  filters+="${mix}amix=inputs=$((k + 1)):duration=first:normalize=0[a]"
  ffmpeg -v error -y "${inputs[@]}" -filter_complex "$filters" \
    -map "[$last]" -map "[a]" -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p \
    -r $FPS -c:a aac -b:a 192k -movflags +faststart -t "$total" "$1"
  # Subtitles for the narration, next to the video (out.mp4 → out.srt).
  local subs=()
  for v in ${VOICES[@]+"${VOICES[@]}"}; do
    local file seg after lang clip len
    IFS='|' read -r file seg after <<<"$v"
    lang="$(basename "$(dirname "$file")")"
    clip="$(basename "$file" .mp3)"
    len="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$file")"
    subs+=("$(echo "${starts[$seg]} + ${after:-0.6}" | bc)|$len|$lang|$clip")
  done
  node "$HERE/scripts/subtitles.mjs" "${1%.mp4}.srt" ${subs[@]+"${subs[@]}"} >/dev/null
  # Its YouTube title (with the app's version), description and settings.
  node "$HERE/scripts/youtube-text.mjs" "$(basename "${1%.mp4}")" \
    "${1%.mp4}.youtube.txt"
  echo "$1 (${total}s)"
  SEGMENTS=()
  DURATIONS=()
  VOICES=()
  SFX=()
}
