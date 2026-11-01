#!/usr/bin/env bash
# The App Store's creative asset videos, in Indonesian and English: the
# product page header (3840 x 1646, 21:9) and the search result (3840 x 2560,
# 3:2), 13 seconds at 30 fps; the app repo has no stills for them. Real
# devices play the app's "Watch me!" demos; the search result adds Koba and
# the tagline, while the header shows only the app, since the page shows its
# name and icon below:
#   cobalagi/out/app-store-header-<lang>.mp4
#   cobalagi/out/app-store-search-<lang>.mp4
# Apple loops them and starts them muted (search results can't be
# unmuted), so the words never depend on sound; the header carries the
# app's music for viewers who unmute it. Like the still assets they show no
# prices, URLs or other platforms.
# From project-pamerstudio-node: cobalagi/scripts/app-store-video.sh
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
KEYS=(00ff00 0000ff)
for kind in iphone ipad; do
  read -r _ _ _ sw sh _ < <(grep "^$kind " store/bezels/screens.txt)
  for k in "${KEYS[@]}"; do
    ffmpeg -v error -y -f lavfi -i "color=c=0x$SCREEN:s=${sw}x${sh}" -frames:v 1 "$TMP/$kind-$k.png"
  done
done

# device <kind> <key> <box w> <box h> [style]: the device with its screen in
# the key colour (store/device.mjs; a light screen gets a dark status bar).
device() { node store/device.mjs "$1" "$TMP/$1-$2.png" "$3" "$4" dark "${lang:-en}" "${5:-}"; }

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

# fan <out.mp4> "<left top kind key w h degrees frames prefix>"...: devices
# tilted like a fan, back to front, with music. Each device is drawn alone
# on a transparent layer and laid over what is behind it with its gameplay,
# rotated, under its screen, so tilted screens and shadows that fall on
# another device's screen both come out right. The layer is cut in two: the
# device with its screen cut out, and the screen's shape, which clips the
# gameplay (colorkey can't do it: it makes the see-through background
# opaque).
fan() {
  local out="$1"
  shift
  card "" "" "$TMP/sky.png"
  local inputs=(-loop 1 -framerate $FPS -t $SECONDS_LONG -i "$TMP/sky.png") f="" last="0:v" n=1 i=0 spec
  for spec in "$@"; do
    local left top kind key w h deg prefix
    read -r left top kind key w h deg prefix <<<"$spec"
    read -r _ _ _ sw sh _ < <(grep "^$kind " store/bezels/screens.txt)
    ffmpeg -v error -y -f lavfi -i "color=c=0x$SCREEN:s=${sw}x${sh}" -frames:v 1 "$TMP/$kind-$key.png"
    local html="<div style=\"position:absolute;left:${left}px;top:${top}px\">$(device "$kind" "$key" "$w" "$h" "transform:rotate(${deg}deg)")</div>"
    printf '<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;width:%spx;height:%spx;background:transparent;overflow:hidden}</style></head><body>%s</body></html>' \
      "$W" "$H" "$html" > "$TMP/layer.html"
    "$CHROME" --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files --default-background-color=00000000 \
      --virtual-time-budget=3000 --window-size="$W,$H" --screenshot="$TMP/layer-$i.png" "file://$TMP/layer.html" 2>/dev/null
    # The screen's centre as drawn (tilted) and its size untilted.
    local measure='<script>const r=[...document.images].find((i)=>/-[0-9a-f]{6}[.]png$/.test(i.src)).getBoundingClientRect();
      document.body.insertAdjacentHTML("beforeend","<pre id=box>"+[r.left+r.width/2,r.top+r.height/2,r.width,r.height].map(Math.round).join(" ")+"</pre>");</script>'
    local cx cy bw bh
    read -r cx cy _ _ < <("$CHROME" --headless=new --disable-gpu --allow-file-access-from-files --virtual-time-budget=3000 \
      --window-size="$W,$H" --dump-dom "data:text/html;charset=utf-8,$(node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "$(cat "$TMP/layer.html")$measure")" 2>/dev/null |
      sed -n 's/.*<pre id="box">\([^<]*\)<.*/\1/p')
    read -r _ _ bw bh < <("$CHROME" --headless=new --disable-gpu --allow-file-access-from-files --virtual-time-budget=3000 \
      --window-size="$W,$H" --dump-dom "data:text/html;charset=utf-8,$(node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "$(sed 's/rotate([^)]*)/rotate(0deg)/g' "$TMP/layer.html")$measure")" 2>/dev/null |
      sed -n 's/.*<pre id="box">\([^<]*\)<.*/\1/p')
    local count speed
    count=$(ls "$FRAMES/$prefix"-[0-9][0-9][0-9].png | wc -l | tr -d ' ')
    speed=$(echo "scale=3; $count / 10 / $SECONDS_LONG" | bc)
    # Near the screen colour (dbf3f1) and opaque: the screen.
    local near='lt(abs(r(X,Y)-219)+abs(g(X,Y)-243)+abs(b(X,Y)-241),24)*gt(alpha(X,Y),250)'
    ffmpeg -v error -y -i "$TMP/layer-$i.png" -filter_complex \
      "[0:v]format=rgba,split[a][b];[a]geq=r='255*$near':g='255*$near':b='255*$near':a=255,format=gray[screen];[b]geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if($near,0,alpha(X,Y))'[body]" \
      -map "[screen]" "$TMP/screen-$i.png" -map "[body]" "$TMP/body-$i.png"
    inputs+=(-framerate 10 -i "$FRAMES/$prefix-%03d.png"
      -loop 1 -framerate $FPS -t $SECONDS_LONG -i "$TMP/screen-$i.png"
      -loop 1 -framerate $FPS -t $SECONDS_LONG -i "$TMP/body-$i.png")
    f+="[$n:v]setpts=PTS/$speed,fps=$FPS,scale=$((bw + 4)):$((bh + 4)):flags=lanczos,format=rgba,rotate=${deg}*PI/180:ow=rotw(${deg}*PI/180):oh=roth(${deg}*PI/180):c=none[g$i];"
    f+="color=c=black@0:s=${W}x${H}:r=$FPS:d=$SECONDS_LONG,format=rgba[z$i];[z$i][g$i]overlay=$cx-w/2:$cy-h/2[gc$i];"
    f+="[$((n + 1)):v]format=gray[s$i];[gc$i][s$i]alphamerge[gm$i];[$last][gm$i]overlay=0:0[p$i];[p$i][$((n + 2)):v]overlay=0:0[b$i];"
    last="b$i"
    n=$((n + 3))
    i=$((i + 1))
  done
  f+="[$last]setsar=1,format=yuv420p[v];[$n:a]atrim=0:$SECONDS_LONG,volume=0.6,afade=t=in:d=0.5,afade=t=out:st=$((SECONDS_LONG - 1)):d=1[a]"
  inputs+=(-stream_loop -1 -i assets/audio/music/theme.mp3)
  ffmpeg -v error -y "${inputs[@]}" -filter_complex "$f" -map "[v]" -map "[a]" -c:a aac -b:a 192k \
    -t "$SECONDS_LONG" -r $FPS -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p \
    -profile:v high -movflags +faststart "$out"
  echo "$out"
}

render() { # lang suffix tagline
  local lang="$1" s="$2" tagline="$3"
  # Header: only the app, since the page shows its name and icon below. An
  # iPhone shows only the middle 66% (x 647 to 3193), with the Dynamic Island
  # over its top 320 px and round buttons at its top corners (down to
  # y 670): a big iPhone in the middle, tilted iPhones either side set lower
  # to pass under the buttons, and iPads at the far edges for wider screens
  # (as Bedug's header).
  W=3840 H=1646
  fan "$OUT/app-store-header-$lang.mp4" \
    "-380 520 ipad a00000 1300 1000 -7 ipad-debugging$s" \
    "2920 520 ipad a00001 1300 1000 7 ipad-until$s" \
    "800 720 iphone a00002 760 1600 -8 iphone-until$s" \
    "2280 720 iphone a00003 760 1600 8 iphone-debugging$s" \
    "1470 380 iphone a00004 900 1900 0 iphone-loops$s"

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
