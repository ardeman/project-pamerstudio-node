#!/usr/bin/env bash
# Vertical (1080 x 1920) promo shorts for TikTok, YouTube Shorts, Instagram
# Reels and Stories and WhatsApp status, made to hold attention: real
# gameplay from the first frame (never a still title card), big captions
# burned in for viewers with the sound off, a new shot every 1 to 3
# seconds, and an end card that fades back into the opening frame so the
# video loops. About 25 to 30 seconds. One per language:
#   cobalagi/out/short-id.mp4, out/short-en.mp4: Koba bumps a rock, the
#     block that did it wears the orange ring and one changed block fixes
#     it ("Can your child find the mistake?"), then quick cuts of loops,
#     typed code and until the flag, each ending on a solve, and the map.
#   cobalagi/out/short-koba-id.mp4, out/short-koba-en.mp4: the Star fuel
#     story told by Koba in its own voice: the wind blows the ship's stars
#     away, three planets each open with a moment of their arrival scene
#     and end on a solve while the star tank on the left fills, and the
#     ship takes off with a full tank.
# Each has its subtitles (.srt, only Koba's lines) and YouTube text.
# From ai-generated-content: cobalagi/scripts/short-video.sh [short|koba]
# (both kinds unless one is named)
# Once the app is public on Google Play: STORE=live cobalagi/scripts/short-video.sh
#
# The frames are the app's phone recordings (tool/screenshots, see lib.sh):
# the demos, the bump and fix, and the story scenes with their .beats files.
#
# Those apps lay their own buttons and captions over the video, so every
# word and the phone stay inside the middle: clear of the top 250 px, the
# bottom 380 px and the right 140 px.
HERE="$(cd "$(dirname "$0")/.." && pwd)"
W=1080
H=1920
STORE="${STORE:-soon}"
ONLY="${1:-}"
source "$HERE/scripts/lib.sh"
# Quick cuts.
FADE=0.15

for f in phone-bump-000 phone-bump-id-000 phone-intro-000 phone-arrival-until-id-000 phone-ending-otherwise-id-000; do
  if [ "$ONLY" = short ] && [[ "$f" != phone-bump* ]]; then continue; fi
  if [ ! -f "$FRAMES/$f.png" ]; then
    echo "No $f.png in $FRAMES. Record the video frames first (see lib.sh)." >&2
    exit 1
  fi
done

# The phone, as large as the safe middle allows (the recorded phone frames'
# shape, 400 x 760); captions sit above it, Koba's star tank left of it.
X=215 Y=460 SW=570 SH=1083 PAD=14 R=60
bezel $X $Y $SW $SH $PAD $R "$TMP/bezel.png"
card "<div class=\"device\" style=\"left:$((X - PAD))px;top:$((Y - PAD))px;width:$((SW + 2 * PAD))px;height:$((SH + 2 * PAD))px;border-radius:${R}px\"></div>" "" "$TMP/bg.png"

# Story scenes show only their pictures (between the app's title row and
# its subtitle in the 800 x 1520 frames), larger, in a card right of the
# star tank: $STORY is "<centre x> <centre y> <width>" of the frame to show.
WHOLE="400 780 800"
BOARD="400 760 560"
CX=190 CY=578 CW=750 CH=844
bezel $CX $CY $CW $CH $PAD 48 "$TMP/story-bezel.png"
card "" "" "$TMP/plain.png"

# overlay_png <html> <out>: a transparent W x H picture.
overlay_png() {
  printf '<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;width:%spx;height:%spx;background:transparent;overflow:hidden;font-family:ui-rounded,"SF Pro Rounded",-apple-system,system-ui,sans-serif}</style></head><body>%s</body></html>' \
    "$W" "$H" "$1" > "$TMP/overlay.html"
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --default-background-color=00000000 \
    --window-size="$W,$H" --screenshot="$2" "file://$TMP/overlay.html" 2>/dev/null
}

# caption <text> <out>: big words in a dark pill above the phone.
caption() {
  local size=72
  if [ ${#1} -gt 64 ]; then size=54; elif [ ${#1} -gt 40 ]; then size=62; fi
  overlay_png "<div style=\"position:absolute;left:60px;right:150px;top:250px;height:196px;display:flex;align-items:center;justify-content:center\">
    <div style=\"background:#1b1340e6;color:#fff;border-radius:36px;padding:18px 34px;font-size:${size}px;font-weight:900;line-height:1.12;text-align:center;letter-spacing:-.5px\">$1</div></div>" "$2"
}

# tank <stars 0-3> <out>: Koba's star tank, filling as planets are solved.
tank() {
  local fill=$(($1 * 100 / 3)) stars=""
  for ((i = 0; i < 3; i++)); do
    local on="#ffffff40"
    if [ "$i" -lt "$1" ]; then on="#ffc83d"; fi
    stars="<svg viewBox=\"0 0 24 24\" width=\"74\" height=\"74\" style=\"position:absolute;left:17px;bottom:$((36 + i * 190))px\"><path fill=\"$on\" stroke=\"#1b1340\" stroke-width=\"1.4\" d=\"M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.5L12 17.2 6.1 20.4l1.3-6.5L2.5 9.3l6.6-.8z\"/></svg>$stars"
  done
  overlay_png "<div style=\"position:absolute;left:44px;top:560px;width:120px;height:620px;border-radius:60px;background:#1b1340cc;border:6px solid #fff;overflow:hidden;box-sizing:border-box\">
      <div style=\"position:absolute;left:0;right:0;bottom:0;height:$fill%;background:linear-gradient(#ffe08a,#ffb300)\"></div>$stars</div>
    <div style=\"position:absolute;left:24px;top:1196px;width:160px;text-align:center;color:#fff;font-size:34px;font-weight:900\">$1/3</div>" "$2"
}
for n in 0 1 2 3; do tank $n "$TMP/tank-$n.png"; done

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

# shot <frames or png> <from> <to> <speed> <caption>: one cut of the phone.
# A png shows still. The speed "fit" plays the frames in $HOLD seconds;
# otherwise the last frame holds until $HOLD seconds have passed, if set.
# $ZOOM ("<times> <x> <y>") punches in on a point; $STORY shows part of a
# story scene in its card; $TANK ("<n>" or
# "<n> <m> <at>") shows the star tank, filling from n to m at <at> s.
shot() {
  local src="$1" from="$2" to="$3" speed="$4" out="$TMP/seg-${#SEGMENTS[@]}.mp4"
  local count=$((to - from)) dur input
  if [[ "$src" == *.png ]]; then
    input=(-loop 1 -framerate $FPS -i "$src")
    dur="$HOLD"
    speed=1
    count=$(echo "$HOLD * $FPS / 1 + 1" | bc)
  else
    input=(-framerate 10 -start_number "$from" -i "$FRAMES/$src-%03d.png")
    if [ "$speed" = fit ]; then speed=$(echo "scale=3; $count / 10 / $HOLD" | bc); fi
    dur=$(echo "scale=3; $count / 10 / $speed" | bc)
    if [ -n "${HOLD:-}" ] && [ "$(echo "$HOLD > $dur" | bc)" = 1 ]; then dur="$HOLD"; fi
  fi
  caption "$5" "$TMP/caption.png"
  local bg="$TMP/bg.png" frame="$TMP/bezel.png" f
  if [ -n "${STORY:-}" ]; then
    bg="$TMP/plain.png" frame="$TMP/story-bezel.png"
    local sx sy sw sh
    read -r sx sy sw <<<"$STORY"
    sh=$((sw * CH / CW))
    f="[1:v]trim=end_frame=$count,setpts=(PTS-STARTPTS)/$speed,fps=$FPS,crop=$sw:$sh:$((sx - sw / 2)):$((sy - sh / 2)),scale=$CW:$CH:flags=lanczos,tpad=stop_mode=clone:stop_duration=30[g];"
    f+="[0:v][g]overlay=$CX:$CY[b];[b][2:v]overlay=0:0[c];"
  else
    f="[1:v]trim=end_frame=$count,setpts=(PTS-STARTPTS)/$speed,fps=$FPS,scale=$SW:$SH:flags=lanczos,tpad=stop_mode=clone:stop_duration=30[g];"
    f+="[0:v][g]overlay=$X:$Y[b];[b][2:v]overlay=0:0[c];"
  fi
  if [ -n "${ZOOM:-}" ]; then
    local z x y cw ch
    read -r z x y <<<"$ZOOM"
    cw=$(echo "$W / $z / 2 * 2" | bc)
    ch=$(echo "$H / $z / 2 * 2" | bc)
    f+="[c]crop=$cw:$ch:$((x - cw / 2)):$((y - ch / 2)),scale=$W:$H:flags=lanczos[c];"
  fi
  f+="[c][3:v]overlay=0:0[v]"
  local extra=()
  if [ -n "${TANK:-}" ]; then
    local a b at
    read -r a b at <<<"$TANK"
    extra=(-loop 1 -i "$TMP/tank-$a.png")
    f+=";[v][4:v]overlay=0:0:enable='lt(t,${at:-99})'[v]"
    if [ -n "$b" ]; then
      extra+=(-loop 1 -i "$TMP/tank-$b.png")
      f+=";[v][5:v]overlay=0:0:enable='gte(t,$at)'[v]"
    fi
  fi
  ffmpeg -v error -y -loop 1 -framerate $FPS -i "$bg" "${input[@]}" \
    -loop 1 -i "$frame" -loop 1 -i "$TMP/caption.png" ${extra[@]+"${extra[@]}"} \
    -filter_complex "$f;[v]setsar=1,format=yuv420p" \
    -t "$dur" -r $FPS -c:v libx264 -preset fast -crf 16 "$out"
  SEGMENTS+=("$out")
  DURATIONS+=("$dur")
}

# centred <html>: a column in the safe middle of the frame.
centred() {
  echo "<div style=\"position:absolute;left:90px;right:140px;top:250px;bottom:380px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:48px;text-align:center\">$1</div>"
}

# end_card <tagline> <chips> <store> <web>, then the opening frame again,
# so a looping player carries straight on.
end_card() {
  ffmpeg -v error -y -i "${SEGMENTS[0]}" -frames:v 1 "$TMP/first.png"
  card "$(centred "<svg viewBox=\"180 190 660 670\" width=\"300\" height=\"305\">$CHARACTER</svg>
      <div><h1 style=\"font-size:120px\">Coba Lagi</h1><h1 style=\"font-size:56px;font-weight:800;opacity:.95;margin-top:14px\">$1</h1></div>
      <div style=\"display:flex;gap:16px;flex-wrap:wrap;justify-content:center\">$2</div>
      <div class=\"cta\" style=\"font-size:48px;padding:26px 46px;white-space:nowrap\">$3</div>
      <div style=\"font-size:44px;font-weight:800;opacity:.95\">$4</div>")" \
    ".chip{font-size:40px;padding:12px 30px}" "$TMP/end.png"
  still "$TMP/end.png" 3
  ffmpeg -v error -y -framerate $FPS -loop 1 -t 0.5 -i "$TMP/first.png" \
    -vf "setsar=1,format=yuv420p" -t 0.5 -c:v libx264 -preset fast -crf 16 "$TMP/loop.mp4"
  SEGMENTS+=("$TMP/loop.mp4")
  DURATIONS+=(0.5)
}

# The program row on the phone, for punching in on the orange ring.
RING="1.55 470 1150"

render() { # lang suffix hook which change fixed loops code until map tagline chips store web magic warm-up
  local lang="$1" s="$2"
  # Koba rolls off at once and hits the rock (frame 24).
  sfx bumpRock 1.6
  HOLD="" ZOOM="" shot "phone-bump$s" 6 33 1.2 "$3"
  # "Try again" keeps the orange ring on the block that bumped.
  HOLD="" ZOOM="$RING" shot "phone-bump$s" 50 65 1 "$4"
  # One turn picked and changed.
  sfx drop 0.8
  HOLD="" ZOOM="$RING" shot "phone-bump$s" 65 80 1 "$5"
  sfx goal 2.5
  HOLD=3.3 ZOOM="" shot "phone-bump$s" 80 124 1.5 "$6"

  sfx goal 2.05
  HOLD=2.6 ZOOM="" shot "phone-loops$s" 24 70 2 "$7"
  HOLD=1.7 ZOOM="" shot "$ROOT/website/screenshots/phone-play-functions$s.png" 0 0 1 "${15}"
  HOLD=1.7 ZOOM="" shot "$ROOT/website/screenshots/phone-play-code$s.png" 0 0 1 "$8"
  sfx goal 2.9
  HOLD=3.3 ZOOM="" shot "phone-until$s" 60 135 2.5 "$9"
  HOLD=1.7 ZOOM="" shot "$ROOT/website/screenshots/phone-warm-up$s.png" 0 0 1 "${16}"
  HOLD=2.2 ZOOM="" shot "$ROOT/website/screenshots/phone-adventure-map$s.png" 0 0 1 "${10}"

  end_card "${11}" "${12}" "${13}" "${14}"
  finish "$OUT/short-$lang.mp4"
}

# planet <lang> <suffix> <concept> <demo from> <demo to> <demo speed>
# <solved caption> <stars before>: the arrival's board run with Koba's line,
# then the demo's solve as the tank fills.
planet() {
  local lang="$1" s="$2" c="$3" clip="story_arrival_$3_koba"
  local start voice solved
  start=$(beat "phone-arrival-$c$s" 1)
  voice=$(length "assets/audio/$lang/$clip.mp3")
  say "$lang" "$clip"
  HOLD=$(echo "$voice + 0.35" | bc) TANK="$8" STORY="$BOARD" ZOOM="" \
    shot "phone-arrival-$c$s" "$((start + 4))" "$((start + 66))" fit "$(words "$lang" "$clip")"
  solved=$(echo "scale=2; ($5 - $4 - 8) / 10 / $6" | bc)
  sfx goal "$solved"
  sfx star "$(echo "$solved + 0.35" | bc)"
  HOLD="" ZOOM="" STORY="" TANK="$8 $(($8 + 1)) $(echo "$solved + 0.35" | bc)" shot "phone-$c$s" "$4" "$5" "$6" "$7"
}

render_koba() { # lang suffix hook loops fix until tagline chips store web
  local lang="$1" s="$2" help end
  # The ship flies, then the wind blows its stars away.
  sfx wind 1.3
  HOLD="" TANK=0 STORY="$WHOLE" ZOOM="" shot "phone-intro$s" 30 98 2.6 "$3"
  help=$(beat "phone-intro$s" 4)
  say "$lang" story_intro_help
  HOLD=$(echo "$(length "assets/audio/$lang/story_intro_help.mp3") + 0.35" | bc) TANK=0 STORY="$WHOLE" ZOOM="" \
    shot "phone-intro$s" "$help" "$((help + 40))" 1 "$(words "$lang" story_intro_help)"

  planet "$lang" "$s" loops 30 70 2.4 "$4" 0
  planet "$lang" "$s" debugging 55 95 2.4 "$5" 1
  planet "$lang" "$s" until 75 135 3 "$6" 2

  # The ship takes off with a full tank.
  end=$(beat "phone-ending-otherwise$s" 1)
  say "$lang" story_ending_koba
  sfx shipLaunch 0.6
  HOLD=$(echo "$(length "assets/audio/$lang/story_ending_koba.mp3") + 0.35" | bc) TANK=3 STORY="$WHOLE" ZOOM="" \
    shot "phone-ending-otherwise$s" "$((end - 30))" "$((end + 20))" fit "$(words "$lang" story_ending_koba)"

  end_card "$7" "$8" "$9" "${10}"
  finish "$OUT/short-koba-$lang.mp4"
}

if [ "$STORE" = live ]; then
  store_id="Ada di App Store &amp; Google Play" store_en="On the App Store &amp; Google Play"
else
  store_id="Ada di App Store, segera di Google Play" store_en="On the App Store, soon on Google Play"
fi
chips_id="<span class=\"chip\">Gratis</span><span class=\"chip\">Tanpa iklan</span><span class=\"chip\">Bisa offline</span><span class=\"chip\">Bahasa Indonesia &amp; English</span>"
chips_en="<span class=\"chip\">Free</span><span class=\"chip\">No ads</span><span class=\"chip\">Works offline</span><span class=\"chip\">Bahasa Indonesia &amp; English</span>"

if [ "$ONLY" != koba ]; then
render id "-id" \
  "Bisakah anakmu menemukan kesalahannya?" \
  "Koba menabrak batu. Blok mana yang salah?" \
  "Ganti satu blok saja…" \
  "…dan Koba sampai di bendera!" \
  "Blok ulangi: jalan pintas" \
  "Sudah bisa membaca? Ketik kodenya" \
  "Jalan terus sampai bendera" \
  "9 planet coding untuk dijelajahi" \
  "Belajar coding sambil bermain" \
  "$chips_id" "$store_id" "cobalagi.ardeman.com" \
  "Buat blok ajaibmu sendiri" \
  "Belum bisa membaca? Main game gambar"

render en "" \
  "Can your child find the mistake?" \
  "Koba hit a rock. Which block was it?" \
  "Change just one block…" \
  "…and Koba reaches the flag!" \
  "Repeat blocks: a shortcut" \
  "Reading already? Type the code" \
  "Keep going until the flag" \
  "9 coding planets to explore" \
  "Learn to code through play" \
  "$chips_en" "$store_en" "cobalagi.ardeman.com" \
  "Make your own Magic Block" \
  "Not reading yet? Picture games"
fi

if [ "$ONLY" != short ]; then
render_koba id "-id" \
  "Gawat! Angin meniup semua bintang kapalku!" \
  "Satu blok ulangi, beres!" \
  "Ketemu! Sekarang sudah pas" \
  "Sampai bendera, tanpa menghitung" \
  "Bantu Koba belajar coding" \
  "$chips_id" "$store_id" "cobalagi.ardeman.com"

render_koba en "" \
  "Oh no! The wind blew my ship's stars away!" \
  "One repeat block, done!" \
  "Found it! Now it's right" \
  "To the flag, no counting" \
  "Help Koba learn to code" \
  "$chips_en" "$store_en" "cobalagi.ardeman.com"
fi
