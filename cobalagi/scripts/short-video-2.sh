#!/usr/bin/env bash
# The second vertical short (1080 x 1920), Koba on three planets the first
# didn't show: Look ahead (fog), Magic Block and Step Box, about 30 seconds,
# one per language (cobalagi/out/short-2-id.mp4, out/short-2-en.mp4), with
# its subtitles and YouTube text. From project-pamerstudio-node:
# cobalagi/scripts/short-video-2.sh
#
# The same shape as short-video.sh, which got the most views: a problem in
# the first seconds (Koba lands in fog with an empty star counter), Koba
# asks the viewer for help, a star every few seconds, an end card that loops.
# Every line but the hook is the app's own clip for that scene.
#
# The frames are the app's recordings of the story scenes (see lib.sh).
# DRAFT=1 puts silence in place of the hook line, to check the layout before
# the line is bought.
HERE="$(cd "$(dirname "$0")/.." && pwd)"
W=1080
H=1920
source "$HERE/scripts/lib.sh"
FADE=0.15

for f in phone-arrival-conditions-000 phone-arrival-functions-id-000 phone-arrival-variables-id-000 phone-new-planet-variables-id-000 phone-full-again-variables-id-000; do
  if [ ! -f "$FRAMES/$f.png" ]; then
    echo "No $f.png in $FRAMES. Record the video frames first (see lib.sh)." >&2
    exit 1
  fi
done

source "$HERE/scripts/short-lib.sh"

# run <scene> <lang> <clip> <flag frame> <stars before>: Koba says what the planet
# teaches while its program runs, and the flag brings a star, held a moment
# before the cut so the pop shows.
run() {
  local scene="$1" lang="$2" clip="$3" flag="$4" stars="$5" start hold speed at_flag
  start=$(beat "$scene" 1)
  hold=$(echo "$(length "assets/audio/$lang/$clip.mp3") + 0.7" | bc)
  speed=$(echo "scale=3; ($flag + 12 - $start - 5) / 10 / $hold" | bc)
  at_flag=$(at "$flag" "$((start + 5))" "$speed")
  say "$lang" "$clip"
  clip_cues "$lang" "$clip" 0.15 "$hold"
  sfx goal "$at_flag"
  sfx star "$(echo "$at_flag + 0.15" | bc)"
  HOLD="$(echo "$hold + 0.6" | bc)" TANK="$stars $((stars + 1)) $(echo "$at_flag + 0.15" | bc)" \
    shot "$scene" "$((start + 5))" "$((flag + 12))" "$speed" 1.5 400 680
}

render() { # lang suffix tagline chips web
  local lang="$1" s="$2" t hook words

  # The hook: the ship lands in thick fog, the counter empty, and Koba cries
  # out (a line of its own for the videos, koba-voice.mjs).
  words=$(node -e 'console.log(require(process.argv[1]).fog[process.argv[2]])' "$HERE/scripts/koba-lines.json" "$lang")
  if [ -n "${DRAFT:-}" ]; then
    # Named like koba-voice.mjs's clips, so the subtitles find its words.
    mkdir -p "$TMP/$lang"
    hook="$TMP/$lang/koba-fog-draft.mp3"
    ffmpeg -v error -y -f lavfi -i anullsrc=r=22050:cl=mono -t 3.2 "$hook"
  else
    hook=$(node "$HERE/scripts/koba-voice.mjs" "$lang" fog | tail -1)
  fi
  t=$(echo "$(length "$hook") + 0.5" | bc)
  sfx wind 0
  VOICES+=("$hook|${#SEGMENTS[@]}|0.1")
  voice_cues "$words" "$hook" 0 "$t"
  HOLD="$t" TANK=0 shot "phone-arrival-conditions$s" 5 45 fit 1.5 400 700

  # Koba asks for help, close up in its ship.
  t=$(echo "$(length "assets/audio/$lang/story_new_planet_koba.mp3") + 0.3" | bc)
  say "$lang" story_new_planet_koba
  clip_cues "$lang" story_new_planet_koba 0.15 "$t"
  HOLD="$t" TANK=0 shot "phone-new-planet-variables$s" 60 100 fit 2.3 360 760

  # The flag frames are where Koba reaches the flag in each recording.
  run "phone-arrival-conditions$s" "$lang" story_arrival_conditions_koba 138 0
  run "phone-arrival-functions$s" "$lang" story_arrival_functions_koba 107 1
  run "phone-arrival-variables$s" "$lang" story_arrival_variables_koba 105 2

  # A full tank: the ship loops for joy.
  t=$(echo "$(length "assets/audio/$lang/story_thanks_variables.mp3") + 0.3" | bc)
  say "$lang" story_thanks_variables
  clip_cues "$lang" story_thanks_variables 0.15 "$t"
  HOLD="$t" TANK=3 shot "phone-full-again-variables$s" 40 95 fit 1.6 400 715

  end_card "$3" "$4" "$5"
  finish "$OUT/short-2-$lang.mp4"
}

render id "-id" "Bantu Koba belajar coding" "$chips_id" "cobalagi.ardeman.com"
render en "" "Help Koba learn to code" "$chips_en" "cobalagi.ardeman.com"
