#!/usr/bin/env bash
# The shorts' shared parts (short-video.sh, short-video-2.sh): the star counter,
# captions in time with Koba's voice, full-frame shots of the story scenes and
# the end card. Source it after lib.sh.

# overlay_png <html> <out>: a transparent W x H picture.
overlay_png() {
  printf '<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;width:%spx;height:%spx;background:transparent;overflow:hidden;font-family:ui-rounded,"SF Pro Rounded",-apple-system,system-ui,sans-serif}</style></head><body>%s</body></html>' \
    "$W" "$H" "$1" > "$TMP/overlay.html"
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --default-background-color=00000000 \
    --window-size="$W,$H" --screenshot="$2" "file://$TMP/overlay.html" 2>/dev/null
}

# Deep space behind the Loops demo's board, like the story's sky.
STARS=""
for i in $(seq 1 70); do
  STARS+="<i style=\"left:$((RANDOM % W))px;top:$((RANDOM % H))px;opacity:.$((3 + RANDOM % 6))\"></i>"
done
card "$STARS" "body{background:linear-gradient(180deg,#1d1a4a,#352a72)} i{position:absolute;width:5px;height:5px;border-radius:50%;background:#fff}" "$TMP/space.png"

# Shades under the captions and the star counter: the words read on any
# scene, and the story's own title row and subtitle never show.
overlay_png "<div style=\"position:absolute;left:0;right:0;top:0;height:300px;background:linear-gradient(180deg,#160f38 90px,#160f3800)\"></div>
  <div style=\"position:absolute;left:0;right:0;top:1180px;bottom:0;background:linear-gradient(180deg,#160f3800,#160f38e6 340px,#160f38 480px)\"></div>" "$TMP/shade.png"

# The star counter at the top: <lit 0-3> <out> [pop]. With pop, the last
# lit star is drawn bigger and glowing, for the moment it arrives.
hud() {
  local stars="" i
  for ((i = 1; i <= 3; i++)); do
    local fill="#ffffff2e" size=118 glow=""
    if [ "$i" -le "$1" ]; then fill="#ffc83d"; glow="filter:drop-shadow(0 0 14px #ffc83daa);"; fi
    if [ -n "${3:-}" ] && [ "$i" -eq "$1" ]; then size=164; glow="filter:drop-shadow(0 0 30px #ffe08a);"; fi
    stars+="<svg viewBox=\"0 0 24 24\" width=\"$size\" height=\"$size\" style=\"$glow\"><path fill=\"$fill\" stroke=\"#1b1340\" stroke-width=\"1.2\" stroke-linejoin=\"round\" d=\"M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.5L12 17.2 6.1 20.4l1.3-6.5L2.5 9.3l6.6-.8z\"/></svg>"
  done
  overlay_png "<div style=\"position:absolute;left:300px;width:480px;top:262px;height:150px;border-radius:75px;background:#1b1340cc;border:5px solid #ffffffcc;box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:14px\">$stars</div>" "$2"
}
for n in 0 1 2 3; do hud $n "$TMP/hud-$n.png"; done
for n in 1 2 3; do hud $n "$TMP/hud-pop-$n.png" pop; done

# caption <text> <out>: a few big words, white with a thick outline, low in
# the frame and centred on it (140 px each side, so the right stays clear).
caption() {
  local size=96
  if [ ${#1} -gt 22 ]; then size=76; elif [ ${#1} -gt 15 ]; then size=84; fi
  overlay_png "<div style=\"position:absolute;left:140px;right:140px;top:1330px;height:210px;display:flex;align-items:center;justify-content:center\">
    <div style=\"text-wrap:balance;color:#fff;font-size:${size}px;font-weight:900;line-height:1.05;text-align:center;letter-spacing:-.5px;-webkit-text-stroke:16px #1b1340;paint-order:stroke fill;text-shadow:0 8px 0 #1b1340\">$1</div></div>" "$2"
}

# words <lang> <clipId>: the clip's words, from the app's ARB file.
words() {
  node -e 'const a=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));const k=process.argv[2].replace(/_([a-z])/g,(_,c)=>c.toUpperCase());if(a[k]==null)process.exit(1);console.log(a[k])' \
    "lib/app/l10n/app_$1.arb" "$2"
}

# length <file>: an audio file's seconds.
length() { ffprobe -v error -show_entries format=duration -of csv=p=0 "$1"; }

# beat <scene frames> <n>: the frame the scene's beat n starts on.
beat() { cut -d' ' -f$(($2 + 1)) "$FRAMES/$1.beats"; }

# say <lang> <clip> [delay]: a voice line over the next shot.
say() { VOICES+=("assets/audio/$1/$2.mp3|${#SEGMENTS[@]}|${3:-0.15}"); }

# sfx <name> <delay>: a sound effect in the next shot.
sfx() { SFX+=("assets/audio/sfx/$1.mp3|${#SEGMENTS[@]}|$2"); }

# CUES holds the next shot's captions, one "<from> <to> <words>" per line.
# cue <from> <to> <words>: one caption.
cue() { CUES+="$1 $2 $3"$'\n'; }

# voice_cues <words> <file> <delay> <to>: a clip's words a sentence at a
# time (a long one in two halves, at a comma if one is near the middle),
# each shown for its share of the clip; the last stays until <to>.
voice_cues() {
  local text="$1" len
  len="$(length "$2")"
  CUES+="$(node -e '
    const [text, len, delay, to] = [process.argv[1], +process.argv[2], +process.argv[3], process.argv[4]]
    // A sentence each; one too long for two lines splits near its middle.
    const chunks = []
    for (const sentence of text.match(/[^.!?…]+[.!?…]*/g).map((c) => c.trim()).filter(Boolean)) {
      if (sentence.length <= 30) { chunks.push(sentence); continue }
      const ws = sentence.split(/\s+/)
      let best = 1, score = Infinity
      for (let i = 1; i < ws.length; i++) {
        const d = Math.abs(ws.slice(0, i).join(" ").length - sentence.length / 2) - (ws[i - 1].endsWith(",") ? 6 : 0)
        if (d < score) { score = d; best = i }
      }
      chunks.push(ws.slice(0, best).join(" "), ws.slice(best).join(" "))
    }
    const total = chunks.reduce((n, c) => n + c.length + 4, 0)
    let t = delay
    chunks.forEach((c, i) => {
      const end = i === chunks.length - 1 ? to : t + (len * (c.length + 4)) / total
      console.log(`${t.toFixed(2)} ${(+end).toFixed(2)} ${c}`)
      t = end
    })' "$text" "$len" "$3" "$4")"$'\n'
}

# clip_cues <lang> <clip> <delay> <to>: voice_cues for one of the app's clips.
clip_cues() { voice_cues "$(words "$1" "$2")" "assets/audio/$1/$2.mp3" "$3" "$4"; }

# shot <frames> <from> <to> <speed> <Z> <x> <y>: one full-frame cut of a
# story scene, its point x,y (in the 800 x 1520 recording) a little above
# the frame's middle, zoomed Z times and pushing in slowly. The speed "fit"
# plays the frames in $HOLD seconds; otherwise the last frame holds until
# $HOLD seconds have passed, if set. $TANK ("<n>" or "<n> <m> <at>") is the
# star counter, changing from n to m at <at> s; CUES are its captions.
# With $DEMO set, it shows the Loops demo's board and program instead.
shot() {
  local src="$1" from="$2" to="$3" speed="$4" out="$TMP/seg-${#SEGMENTS[@]}.mp4"
  local count=$((to - from)) dur
  if [ "$speed" = fit ]; then speed=$(echo "scale=3; $count / 10 / $HOLD" | bc); fi
  dur=$(echo "scale=3; $count / 10 / $speed" | bc)
  if [ -n "${HOLD:-}" ] && [ "$(echo "$HOLD > $dur" | bc)" = 1 ]; then dur="$HOLD"; fi
  local frames n f
  frames=$(echo "$dur * $FPS / 1 + 1" | bc)
  f="[0:v]trim=end_frame=$count,setpts=(PTS-STARTPTS)/$speed,fps=$FPS,tpad=stop_mode=clone:stop_duration=30,"
  if [ -n "${DEMO:-}" ]; then
    # The demo's world (736 x 443 at 32,185) across the frame, its program
    # row (563 x 280 at 52,845) under it, on deep space.
    f+="split[a][b];[a]crop=736:443:32:185,scale=1040:626:flags=lanczos[w];[b]crop=563:280:52:845,scale=620:308:flags=lanczos[p];"
    f+="[1:v][w]overlay=20:440[s];[s][p]overlay=230:1080,trim=end_frame=$frames[c];"
  else
    # zoompan keeps the output's shape, so the 800 x 1520 frame is first
    # doubled and padded to 9:16 (1710 x 3040, 55 px each side).
    local z0 z1
    z0=$(echo "scale=4; $5 * 1710 / 2160" | bc)
    z1=$(echo "scale=4; $z0 * 1.07" | bc)
    f+="scale=1600:3040:flags=lanczos,pad=1710:3040:55:0:color=0x241d55,"
    f+="zoompan=z='$z0+($z1-$z0)*on/$frames':x='$((2 * $6 + 55))-iw/zoom/2':y='$((2 * $7))-ih/zoom*880/1920':d=1:s=${W}x${H}:fps=$FPS[c];"
  fi
  f+="[c][2:v]overlay=0:0[v]"
  local inputs=(-i "$TMP/space.png" -loop 1 -i "$TMP/shade.png") k=3
  if [ -n "${TANK:-}" ]; then
    local a b at
    read -r a b at <<<"$TANK"
    inputs+=(-loop 1 -i "$TMP/hud-$a.png")
    f+=";[v][$k:v]overlay=0:0:enable='lt(t,${at:-99})'[v]"
    k=$((k + 1))
    if [ -n "$b" ]; then
      inputs+=(-loop 1 -i "$TMP/hud-$b.png")
      f+=";[v][$k:v]overlay=0:0:enable='gte(t,$at)'[v]"
      k=$((k + 1))
      if [ "$b" -gt "$a" ]; then
        inputs+=(-loop 1 -i "$TMP/hud-pop-$b.png")
        f+=";[v][$k:v]overlay=0:0:enable='between(t,$at,$at+0.4)'[v]"
        k=$((k + 1))
      fi
    fi
  fi
  n=0
  while read -r c0 c1 words; do
    [ -n "$c0" ] || continue
    caption "$words" "$TMP/cue-$n.png"
    inputs+=(-loop 1 -i "$TMP/cue-$n.png")
    f+=";[v][$k:v]overlay=0:0:enable='between(t,$c0,$c1)'[v]"
    k=$((k + 1)) n=$((n + 1))
  done <<<"${CUES:-}"
  CUES=""
  ffmpeg -v error -y -framerate 10 -start_number "$from" -i "$FRAMES/$src-%03d.png" -loop 1 "${inputs[@]}" \
    -filter_complex "$f;[v]setsar=1,format=yuv420p" \
    -t "$dur" -r $FPS -c:v libx264 -preset fast -crf 16 "$out"
  SEGMENTS+=("$out")
  DURATIONS+=("$dur")
}

# centred <html>: a column in the safe middle of the frame, 140 px each side
# like the captions, so it sits on the frame's centre and the right stays clear.
centred() {
  echo "<div style=\"position:absolute;left:140px;right:140px;top:250px;bottom:380px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:48px;text-align:center\">$1</div>"
}

# end_card <tagline> <chips> <web>, then the opening frame again, so a
# looping player carries straight on. It names no store, so the video stays
# true once the app reaches Google Play; the site links to every store.
end_card() {
  ffmpeg -v error -y -i "${SEGMENTS[0]}" -frames:v 1 "$TMP/first.png"
  card "$(centred "<svg viewBox=\"180 190 660 670\" width=\"300\" height=\"305\">$CHARACTER</svg>
      <div><h1 style=\"font-size:120px\">Coba Lagi</h1><h1 style=\"font-size:56px;font-weight:800;opacity:.95;margin-top:14px\">$1</h1></div>
      <div style=\"display:flex;gap:16px;flex-wrap:wrap;justify-content:center\">$2</div>
      <div class=\"cta\" style=\"font-size:52px;padding:26px 46px;white-space:nowrap\">$3</div>")" \
    ".chip{font-size:40px;padding:12px 30px}" "$TMP/end.png"
  still "$TMP/end.png" 2.6
  ffmpeg -v error -y -framerate $FPS -loop 1 -t 0.5 -i "$TMP/first.png" \
    -vf "setsar=1,format=yuv420p" -t 0.5 -c:v libx264 -preset fast -crf 16 "$TMP/loop.mp4"
  SEGMENTS+=("$TMP/loop.mp4")
  DURATIONS+=(0.5)
}

# at <frame> <from> <speed>: when, in a shot from <from>, <frame> shows.
at() { echo "scale=2; ($1 - $2) / 10 / $3" | bc; }

chips_id="<span class=\"chip\">Gratis</span><span class=\"chip\">Tanpa iklan</span><span class=\"chip\">Bisa offline</span><span class=\"chip\">Bahasa Indonesia &amp; English</span>"
chips_en="<span class=\"chip\">Free</span><span class=\"chip\">No ads</span><span class=\"chip\">Works offline</span><span class=\"chip\">Bahasa Indonesia &amp; English</span>"
