#!/usr/bin/env bash
# The App Store's creative asset videos, in Indonesian and English: the
# product page header (3840 x 1646, 21:9) and the search result (3840 x 2560,
# 3:2), 13 seconds at 30 fps, like the app's still header.png and
# search_result.png (store/render.sh in the app repo). Koba and the tagline
# sit with real devices playing the app's "Watch me!" demos:
#   cobalagi/out/app-store-header-<lang>.mp4
#   cobalagi/out/app-store-search-<lang>.mp4
# Apple loops them and starts them muted (search results can't be
# unmuted), so the words never depend on sound; the header carries the
# app's music for viewers who unmute it. Like the still assets they show no
# prices, URLs or other platforms.
# From project-pamer-node: cobalagi/scripts/app-store-video.sh
#
# The devices are Apple's product bezels from the app repo's store/bezels/
# (tool/fetch_bezels.sh there), drawn by its store/device.mjs with their
# status bars. Their license allows them only in App Store material, so they
# are read from there and never copied here. The demos are the app's iPhone
# and iPad video frames (see lib.sh; their names start iphone- and ipad-).
HERE="$(cd "$(dirname "$0")/.." && pwd)"
W=3840
H=1646
source "$HERE/scripts/lib.sh"

if [ ! -f store/bezels/screens.txt ] || [ ! -f "$FRAMES/ipad-loops-000.png" ]; then
  echo "Needs store/bezels/ (tool/fetch_bezels.sh) and the iPhone and iPad video frames in the app repo." >&2
  exit 1
fi

SECONDS_LONG=13
SCREEN=dbf3f1

# The app's own light top colour fills every screen and is keyed out, so the
# gameplay shows through it and the status bar's soft edges blend as they
# would on the app (a green screen left a green fringe); each device's
# picture has its own name (a "key"), so its screen can be measured.
KEYS=(00ff00 0000ff ff00ff)
for kind in iphone ipad; do
  read -r _ _ _ sw sh _ < <(grep "^$kind " store/bezels/screens.txt)
  for k in "${KEYS[@]}"; do
    ffmpeg -v error -y -f lavfi -i "color=c=0x$SCREEN:s=${sw}x${sh}" -frames:v 1 "$TMP/$kind-$k.png"
  done
done

# device <kind> <key> <box w> <box h>: the device with its screen in the key
# colour (store/device.mjs; a light screen gets a dark status bar).
device() { node store/device.mjs "$1" "$TMP/$1-$2.png" "$3" "$4" dark en; }

# compose <page html> <out.mp4> <music: yes|no> <frames prefix>...: the page,
# with the frames (one per device, in KEYS order) playing in its screens.
compose() {
  local page="$1" out="$2" music="$3"
  shift 3
  card "$page" "" "$TMP/page.png"
  # Chrome measures each screen ("<key> w:h:x:y"), as the page draws it.
  printf '<!doctype html><html><head><meta charset="utf-8"><style>%s html,body{width:%spx;height:%spx}</style></head><body>%s<script>
    document.body.insertAdjacentHTML("beforeend", "<pre id=boxes>" + [...document.images]
      .filter((i) => /-[0-9a-f]{6}[.]png$/.test(i.src))
      .map((i) => { const r = i.getBoundingClientRect(); return i.src.slice(-10, -4) + " " +
        [r.width, r.height, r.left, r.top].map(Math.round).join(":"); }).join("\\n") + "</pre>");
    </script></body></html>' "$BASE_STYLE" "$W" "$H" "$page" > "$TMP/measure.html"
  "$CHROME" --headless=new --disable-gpu --allow-file-access-from-files --virtual-time-budget=3000 \
    --window-size="$W,$H" --dump-dom "file://$TMP/measure.html" 2>/dev/null |
    sed -n '/<pre id="boxes">/,/<\/pre>/p' | sed -e 's/<[^>]*>//g' -e 's/^ *//' | grep . > "$TMP/boxes.txt"
  local inputs=() f="color=c=black:s=${W}x${H}:r=$FPS:d=$SECONDS_LONG[base];" last=base i=0
  for prefix in "$@"; do
    local key=${KEYS[$i]} box
    # The screen's box: where its key coloured picture is drawn.
    box=$(grep "^$key " "$TMP/boxes.txt" | cut -d' ' -f2)
    local bw bh bx by
    IFS=: read -r bw bh bx by <<<"$box"
    local count speed
    count=$(ls "$FRAMES/$prefix"-[0-9][0-9][0-9].png | wc -l | tr -d ' ')
    speed=$(echo "scale=3; $count / 10 / $SECONDS_LONG" | bc)
    inputs+=(-framerate 10 -i "$FRAMES/$prefix-%03d.png")
    f+="[$i:v]setpts=PTS/$speed,fps=$FPS,scale=$((bw + 4)):$((bh + 4)):flags=lanczos[g$i];[$last][g$i]overlay=$((bx - 2)):$((by - 2))[b$i];"
    last="b$i"
    i=$((i + 1))
  done
  f+="[$i:v]colorkey=0x$SCREEN:0.02:0[keyed];[$last][keyed]overlay=0:0,setsar=1,format=yuv420p[v]"
  inputs+=(-loop 1 -framerate $FPS -i "$TMP/page.png")
  local audio=()
  if [ "$music" = yes ]; then
    inputs+=(-stream_loop -1 -i assets/audio/music/theme.mp3)
    f+=";[$((i + 1)):a]atrim=0:$SECONDS_LONG,volume=0.6,afade=t=in:d=0.5,afade=t=out:st=$((SECONDS_LONG - 1)):d=1[a]"
    audio=(-map "[a]" -c:a aac -b:a 192k)
  fi
  ffmpeg -v error -y "${inputs[@]}" -filter_complex "$f" -map "[v]" ${audio[@]+"${audio[@]}"} \
    -t "$SECONDS_LONG" -r $FPS -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p \
    -profile:v high -movflags +faststart "$out"
  echo "$out"
}

render() { # lang suffix tagline
  local lang="$1" s="$2" tagline="$3"
  # Header: the sides are cut off on narrow screens, so Koba and the
  # tagline stay in the middle; an iPad at the left, two iPhones at the right.
  W=3840 H=1646
  compose "<div style=\"position:relative;height:${H}px\">
      <div style=\"position:absolute;left:90px;top:330px\">$(device ipad 00ff00 1150 986)</div>
      <div style=\"position:absolute;left:1220px;width:1400px;top:0;height:${H}px;display:flex;flex-direction:column;align-items:center;justify-content:center\">
        <svg viewBox=\"180 190 660 670\" width=\"720\" height=\"730\">$CHARACTER</svg>
        <h1 style=\"font-size:150px;text-align:center;line-height:1.1;margin-top:40px\">$tagline</h1>
      </div>
      <div style=\"position:absolute;left:2700px;top:200px\">$(device iphone 0000ff 500 1246)</div>
      <div style=\"position:absolute;left:3250px;top:200px\">$(device iphone ff00ff 500 1246)</div>
    </div>" "$OUT/app-store-header-$lang.mp4" yes "ipad-loops$s" "iphone-until$s" "iphone-debugging$s"

  # Search result: the tagline over an iPad and an iPhone side by side.
  W=3840 H=2560
  compose "<div style=\"display:flex;flex-direction:column;align-items:center;justify-content:center;height:${H}px;gap:110px\">
      <div style=\"display:flex;align-items:center;gap:60px\">
        <svg viewBox=\"180 190 660 670\" width=\"420\" height=\"426\">$CHARACTER</svg>
        <h1 style=\"font-size:170px\">$tagline</h1>
      </div>
      <div style=\"display:flex;align-items:flex-end;gap:90px\">
        $(device ipad 00ff00 2300 1800)
        $(device iphone 0000ff 800 1800)
      </div>
    </div>" "$OUT/app-store-search-$lang.mp4" no "ipad-loops$s" "iphone-until$s"
}

render id "-id" "Belajar coding sambil bermain"
render en "" "Learn to code through play"
