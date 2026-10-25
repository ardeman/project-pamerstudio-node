#!/usr/bin/env bash
# A vertical (1080 x 1920) promo short for TikTok, YouTube Shorts, Instagram
# Reels and Stories and WhatsApp status: the Star fuel story told by Koba in
# its own voice, about 27 seconds, one per language (cobalagi/out/short-id.mp4,
# out/short-en.mp4), with its subtitles (.srt, only Koba's lines) and YouTube
# text. From project-pamer-node: cobalagi/scripts/short-video.sh
#
# Made to grab attention and keep it (see README → Short):
# - It opens on the problem: the space wind blows the stars away and the
#   star counter at the top empties at once, so the question "will Koba get
#   them back?" stays open until the end.
# - Every shot fills the frame: the story's own space scenes, zoomed in on
#   the board and slowly pushing in, never a small phone on a coloured card.
# - Big captions, two or three words at a time in time with Koba's voice,
#   for viewers with the sound off.
# - Each planet ends on a solve and a star popping into the counter, about
#   every five seconds; Fix it! shows the bump, the orange ring and the fix.
# - The end card names no store, so the video stays true once the app is on
#   Google Play, and it fades back into the opening frame so the video loops.
#
# The frames are the app's phone recordings (tool/screenshots, see lib.sh):
# the story scenes with their .beats files and the Loops demo.
#
# Those apps lay their own buttons and captions over the video, so every
# word stays clear of the top 250 px, the bottom 380 px and the right 140 px.
HERE="$(cd "$(dirname "$0")/.." && pwd)"
W=1080
H=1920
source "$HERE/scripts/lib.sh"
# Quick cuts.
FADE=0.15

for f in phone-intro-000 phone-intro-id-000 phone-arrival-until-000 phone-arrival-until-id-000 phone-ending-otherwise-id-000 phone-loops-id-000; do
  if [ ! -f "$FRAMES/$f.png" ]; then
    echo "No $f.png in $FRAMES. Record the video frames first (see lib.sh)." >&2
    exit 1
  fi
done

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

# centred <html>: a column in the safe middle of the frame.
centred() {
  echo "<div style=\"position:absolute;left:90px;right:140px;top:250px;bottom:380px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:48px;text-align:center\">$1</div>"
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

render() { # lang suffix loops-solve-1 loops-solve-2 found-it tagline chips web
  local lang="$1" s="$2" t help start speed hold flag end

  # The hook: the wind blows the stars out of the tank, the counter empties
  # and Koba cries out (a line of its own for the videos, koba-voice.mjs).
  local hook
  hook=$(node "$HERE/scripts/koba-voice.mjs" "$lang" hook | tail -1)
  t=$(echo "$(length "$hook") + 0.5" | bc)
  sfx wind 0
  VOICES+=("$hook|${#SEGMENTS[@]}|0.1")
  voice_cues "$(node -e 'console.log(require(process.argv[1]).hook[process.argv[2]])' "$HERE/scripts/koba-lines.json" "$lang")" "$hook" 0 "$t"
  HOLD="$t" TANK="3 0 0.85" shot "phone-intro$s" 38 92 2 1.55 420 700

  # Koba asks for help, close up.
  help=$(beat "phone-intro$s" 4)
  t=$(echo "$(length "assets/audio/$lang/story_intro_help.mp3") + 0.3" | bc)
  say "$lang" story_intro_help
  clip_cues "$lang" story_intro_help 0.15 "$t"
  HOLD="$t" TANK=0 shot "phone-intro$s" "$help" "$((help + 40))" fit 2.3 370 770

  # Loops: so many steps, then one repeat block solves it.
  start=$(beat "phone-arrival-loops$s" 1)
  t=$(echo "$(length "assets/audio/$lang/story_arrival_loops_koba.mp3") + 0.3" | bc)
  say "$lang" story_arrival_loops_koba
  clip_cues "$lang" story_arrival_loops_koba 0.15 "$t"
  HOLD="$t" TANK=0 shot "phone-arrival-loops$s" "$((start + 4))" "$((start + 66))" fit 1.5 390 760
  flag=$(at 60 24 2)
  sfx goal "$flag"
  sfx star "$(echo "$flag + 0.15" | bc)"
  cue 0 1.2 "$3"
  cue 1.2 9 "$4"
  HOLD=2.8 TANK="0 1 $(echo "$flag + 0.15" | bc)" DEMO=1 shot "phone-loops$s" 24 70 2

  # Fix it!: Koba bumps a rock, the block wears the orange ring, one block
  # changes and the run reaches the flag.
  start=$(beat "phone-arrival-debugging$s" 1)
  speed=2.2
  say "$lang" story_arrival_debugging_koba
  flag=$(at $((start + 105)) "$((start + 5))" $speed)
  clip_cues "$lang" story_arrival_debugging_koba 0.15 "$(echo "$flag - 0.5" | bc)"
  cue "$(echo "$flag - 0.5" | bc)" 9 "$5"
  sfx bumpRock "$(at $((start + 50)) "$((start + 5))" $speed)"
  sfx goal "$flag"
  sfx star "$(echo "$flag + 0.15" | bc)"
  HOLD=$(echo "$flag + 0.6" | bc) TANK="1 2 $(echo "$flag + 0.15" | bc)" \
    shot "phone-arrival-debugging$s" "$((start + 5))" "$((start + 110))" $speed 1.9 385 720

  # Until the flag: one block rolls Koba down the long road.
  start=$(beat "phone-arrival-until$s" 1)
  hold=$(echo "$(length "assets/audio/$lang/story_arrival_until_koba.mp3") + 0.5" | bc)
  speed=$(echo "scale=3; 55 / 10 / $hold" | bc)
  flag=$(at $((start + 47)) "$((start + 5))" "$speed")
  say "$lang" story_arrival_until_koba
  clip_cues "$lang" story_arrival_until_koba 0.15 "$hold"
  sfx goal "$flag"
  sfx star "$(echo "$flag + 0.15" | bc)"
  HOLD="$hold" TANK="2 3 $(echo "$flag + 0.15" | bc)" \
    shot "phone-arrival-until$s" "$((start + 5))" "$((start + 60))" "$speed" 1.55 400 700

  # A full tank: the ship takes off.
  end=$(beat "phone-ending-otherwise$s" 1)
  t=$(echo "$(length "assets/audio/$lang/story_ending_koba.mp3") + 0.3" | bc)
  say "$lang" story_ending_koba
  clip_cues "$lang" story_ending_koba 0.15 "$t"
  sfx shipLaunch 0.6
  HOLD="$t" TANK=3 shot "phone-ending-otherwise$s" "$((end - 30))" "$((end + 20))" fit 1.5 400 740

  end_card "$6" "$7" "$8"
  finish "$OUT/short-$lang.mp4"
}

chips_id="<span class=\"chip\">Gratis</span><span class=\"chip\">Tanpa iklan</span><span class=\"chip\">Bisa offline</span><span class=\"chip\">Bahasa Indonesia &amp; English</span>"
chips_en="<span class=\"chip\">Free</span><span class=\"chip\">No ads</span><span class=\"chip\">Works offline</span><span class=\"chip\">Bahasa Indonesia &amp; English</span>"

render id "-id" \
  "Satu blok ulangi…" \
  "…beres!" \
  "Ketemu!" \
  "Bantu Koba belajar coding" \
  "$chips_id" "cobalagi.ardeman.com"

render en "" \
  "One repeat block…" \
  "…done!" \
  "Found it!" \
  "Help Koba learn to code" \
  "$chips_en" "cobalagi.ardeman.com"
