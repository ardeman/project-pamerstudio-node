#!/usr/bin/env bash
# A vertical (1080 x 1920) promo short for TikTok, YouTube Shorts, Instagram
# Reels and Stories and WhatsApp status: the Star fuel story told by Koba in
# its own voice, about 27 seconds, one per language (cobalagi/out/short-id.mp4,
# out/short-en.mp4), with its subtitles (.srt, only Koba's lines) and YouTube
# text. From project-pamerstudio-node: cobalagi/scripts/short-video.sh
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

source "$HERE/scripts/short-lib.sh"

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
