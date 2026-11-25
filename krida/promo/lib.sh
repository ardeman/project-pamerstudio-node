#!/usr/bin/env bash
# Shared helpers for Krida promo videos. Cards are HTML → headless Chrome;
# gameplay is real simulator recordings in clips/<name>.mp4 (see record.mjs).
# Source after setting HERE (krida/promo), W, H.
set -euo pipefail

CLIPS="$HERE/clips"
OUT="$(cd "$HERE/.." && pwd)/out/promo"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
if [[ ! -x "$CHROME" ]]; then
  # Playwright Chromium fallback (same as other Pamer scripts when Chrome.app is missing).
  CHROME="$(cd "$HERE/../../catatsaja" && node -e "console.log(require('playwright').chromium.executablePath())" 2>/dev/null || true)"
fi
TMP="$(mktemp -d)"
trap 'rm -rf -- "${TMP:?}"' EXIT
mkdir -p "$OUT"
FADE=0.5
FPS=30
# 120 BPM grid — scene cuts and card hits land on the same BGM accents.
BEAT_SEC=0.5
# Promo track (music.mjs); fall back to the calm in-app loop if missing.
BGM="$(cd "$HERE/.." && pwd)/out/promo/bgm.m4a"
[[ -f "$BGM" ]] || BGM="$(cd "$HERE/.." && pwd)/out/bgm.m4a"
# Per-join xfade names (into segment 1, 2, …). Empty → plain fade.
TRANSITIONS=()

# Warm Krida backdrop (matches in-app terracotta).
BASE_STYLE='
  html,body{margin:0;overflow:hidden}
  body{font-family:ui-rounded,"SF Pro Rounded",-apple-system,system-ui,sans-serif;color:#2B211A;
       background:radial-gradient(circle at 35% 25%,#F7D7B5 0%,#E39A5C 100%)}
  h1{margin:0;font-weight:900;letter-spacing:-1px;line-height:1.05;color:#2B211A}
  .sub{margin-top:14px;font-weight:600;opacity:.78;font-size:.48em;letter-spacing:0}
  .device{position:absolute;background:#1B1612;box-shadow:0 40px 80px -28px rgba(43,33,26,.55)}
  .cta{display:inline-block;background:#C9783A;color:#FFF7EC;border-radius:999px;font-weight:900}
'

need_clip() {
  local f="$CLIPS/$1.mp4"
  if [[ ! -f "$f" ]]; then
    echo "Missing $f — record it first:" >&2
    echo "  node krida/promo/record.mjs $1" >&2
    exit 1
  fi
}

# card <html body> <extra css> <out.png>
card() {
  printf '<!doctype html><html><head><meta charset="utf-8"><style>%s html,body{width:%spx;height:%spx} %s</style></head><body>%s</body></html>' \
    "$BASE_STYLE" "$W" "$H" "$2" "$1" > "$TMP/page.html"
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files \
    --virtual-time-budget=3000 --window-size="$W,$((H + 200))" --screenshot="$TMP/shot.png" \
    "file://$TMP/page.html" 2>/dev/null
  ffmpeg -v error -y -i "$TMP/shot.png" -vf "crop=$W:$H:0:0" "$3"
}

# Apple landscape iPhone bezel (transparent screen) scaled onto the canvas.
# Args: frame.png  frame_x frame_y frame_w frame_h  out.png
iphone_bezel() {
  ffmpeg -v error -y -f lavfi -i "color=c=0x00000000:s=${W}x${H},format=rgba" \
    -i "$1" \
    -filter_complex "[1:v]scale=$4:$5:flags=lanczos,format=rgba[f];[0:v][f]overlay=$2:$3:format=auto" \
    -frames:v 1 "$6"
}

SEGMENTS=()
DURATIONS=()
VOICES=()
SFX=()

# still <img> <seconds> [mode]
# mode: in (Ken Burns in, default) | out | punch (CTA snap-zoom)
still() {
  local img="$1" dur="$2" mode="${3:-in}" out="$TMP/seg-${#SEGMENTS[@]}.mp4"
  local zexpr xexpr yexpr
  case "$mode" in
    out)
      zexpr="max(1.06-0.00055*on,1.0)"
      xexpr="iw/2-(iw/zoom/2)+6*sin(2*PI*on/100)"
      yexpr="ih/2-(ih/zoom/2)"
      ;;
    punch)
      # Quick settle then a slow push-in — reads as a CTA “punch”.
      zexpr="if(lt(on,8),1.08-0.01*on,min(1.0+0.0007*on,1.06))"
      xexpr="iw/2-(iw/zoom/2)"
      yexpr="ih/2-(ih/zoom/2)"
      ;;
    *)
      zexpr="min(1+0.00085*on,1.08)"
      xexpr="iw/2-(iw/zoom/2)+4*sin(2*PI*on/110)"
      yexpr="ih/2-(ih/zoom/2)-3*sin(2*PI*on/140)"
      ;;
  esac
  ffmpeg -v error -y -framerate $FPS -loop 1 -t "$dur" -i "$img" \
    -vf "scale=$((W * 2)):$((H * 2)),zoompan=z='${zexpr}':x='${xexpr}':y='${yexpr}':d=1:s=${W}x${H}:fps=$FPS,setsar=1,format=yuv420p" \
    -t "$dur" -c:v libx264 -preset fast -crf 16 "$out"
  SEGMENTS+=("$out")
  DURATIONS+=("$dur")
}

# Full-canvas mask of the iPhone screen: clear outside (flood from a corner) is
# excluded, then the clear centre is the rounded screen cutout.
# Args: bezel.png out.png
screen_mask_from_bezel() {
  python3 - "$1" "$2" "$W" "$H" <<'PY'
import sys
import subprocess
bezel, out, W, H = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
raw = "/tmp/bezel-rgba.raw"
subprocess.check_call([
  "ffmpeg", "-v", "error", "-y", "-i", bezel, "-vf", "format=rgba",
  "-f", "rawvideo", raw,
])
data = open(raw, "rb").read()
assert len(data) == W * H * 4
alpha = bytearray(data[i] for i in range(3, len(data), 4))
CLEAR = 24

def flood(seeds, banned=None):
  seen = bytearray(W * H)
  stack = list(seeds)
  while stack:
    seed = stack.pop()
    if seen[seed] or alpha[seed] > CLEAR or (banned and banned[seed]):
      continue
    y = seed // W
    row = y * W
    left = right = seed - row
    while left > 0 and not seen[row + left - 1] and alpha[row + left - 1] <= CLEAR and not (banned and banned[row + left - 1]):
      left -= 1
    while right < W - 1 and not seen[row + right + 1] and alpha[row + right + 1] <= CLEAR and not (banned and banned[row + right + 1]):
      right += 1
    for x in range(left, right + 1):
      seen[row + x] = 1
    for ny in (y - 1, y + 1):
      if ny < 0 or ny >= H:
        continue
      nrow = ny * W
      in_run = False
      for x in range(left, right + 1):
        i = nrow + x
        if not seen[i] and alpha[i] <= CLEAR and not (banned and banned[i]):
          if not in_run:
            stack.append(i)
          in_run = True
        else:
          in_run = False
  return seen

outside = flood([0])  # terracotta around the phone
screen = flood([H // 2 * W + W // 2], banned=outside)
if sum(screen) < W * H * 0.2:
  raise SystemExit(f"screen mask too small ({sum(screen)} px)")
# Dilate 2px so gameplay tucks under the bezel chrome (kills the peach fringe).
dilated = bytearray(screen)
for y in range(H):
  for x in range(W):
    if not screen[y * W + x]:
      continue
    for dy in (-2, -1, 0, 1, 2):
      for dx in (-2, -1, 0, 1, 2):
        nx, ny = x + dx, y + dy
        if 0 <= nx < W and 0 <= ny < H and not outside[ny * W + nx]:
          dilated[ny * W + nx] = 1
screen = dilated
mask = bytearray(W * H * 4)
for i, on in enumerate(screen):
  if on:
    j = i * 4
    mask[j] = mask[j + 1] = mask[j + 2] = mask[j + 3] = 255
open("/tmp/screen-mask.rgba", "wb").write(mask)
subprocess.check_call([
  "ffmpeg", "-v", "error", "-y",
  "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{W}x{H}",
  "-i", "/tmp/screen-mask.rgba", "-frames:v", "1", out,
])
print(f"screen mask {sum(screen)} px → {out}", file=sys.stderr)
PY
}

# gameplay <bg.png> <bezel.png> <clip name> <x> <y> <w> <h> [max_seconds] [seek]
# Plays the recorded mp4 inside the device rect (cover-scaled). Optional seek
# skips idle lead-in so a short sneak peek still shows motion.
gameplay() {
  need_clip "$3"
  local clip="$CLIPS/$3.mp4"
  local max="${8:-0}"
  local seek="${9:-0}"
  local out="$TMP/seg-${#SEGMENTS[@]}.mp4"
  local full dur
  full=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$clip")
  dur=$(python3 -c "print(max(0.5, float('$full') - float('$seek')))")
  if [[ "$max" != 0 ]]; then
    dur=$(python3 -c "print(min(float('$dur'), float('$max')))")
  fi
  if [[ ! -f "$TMP/screen-mask.png" ]]; then
    screen_mask_from_bezel "$2" "$TMP/screen-mask.png"
  fi
  # Simulator tape is portrait; rotate to landscape, place in the screen rect,
  # mask to the bezel cutout, then a slow drift so the phone isn’t locked still.
  ffmpeg -v error -y -framerate $FPS -loop 1 -t "$dur" -i "$1" \
    -ss "$seek" -t "$dur" -i "$clip" -loop 1 -i "$2" -loop 1 -i "$TMP/screen-mask.png" \
    -filter_complex "\
      [1:v]fps=$FPS,transpose=2,scale=$6:$7:force_original_aspect_ratio=increase,crop=$6:$7,format=rgba,setsar=1[g];\
      color=c=0x00000000:s=${W}x${H}:d=1,format=rgba[blank];\
      [blank][g]overlay=$4:$5:format=auto[gfull];\
      [gfull][3:v]alphamerge[gm];\
      [0:v][gm]overlay=0:0:shortest=1:format=auto[b];\
      [b][2:v]overlay=0:0:shortest=1:format=auto,setsar=1[comp];\
      [comp]scale=$((W * 2)):$((H * 2)),zoompan=z='1.04':x='iw/2-(iw/zoom/2)+10*sin(2*PI*on/80)':y='ih/2-(ih/zoom/2)+5*sin(2*PI*on/110)':d=1:s=${W}x${H}:fps=$FPS,setsar=1,format=yuv420p" \
    -t "$dur" -c:v libx264 -preset fast -crf 16 -an "$out"
  SEGMENTS+=("$out")
  DURATIONS+=("$dur")
}

# game_cards <lang> <clip name> [max_seconds]
# "And more on the table" — three wide cards. The in-app GameCard column is ~236pt
# and truncates titles to a letter, so we rebuild wider cards with the real board
# preview from the clip plus the app’s full title / players / tagline (EN+ID).
game_cards() {
  local lang="$1"
  need_clip "$2"
  local clip="$CLIPS/$2.mp4"
  local dur="${3:-5}"
  # Board art only — trim the GameCard’s coloured padding or the promo card
  # shows empty side bars around a skinny preview.
  local i=0
  for ss in 9 11 12.5; do
    ffmpeg -v error -y -ss "$ss" -i "$clip" -frames:v 1 \
      -vf "transpose=2,crop=270:250:263:450" "$TMP/board-$i.png"
    i=$((i + 1))
  done
  local headline t0 p0 g0 t1 p1 g1 t2 p2 g2
  if [[ "$lang" == id ]]; then
    headline='Dan masih banyak permainan lainnya.'
    t0='Ular tangga'; p0='2–4 pemain'; g0='Naiki tangga, hindari ular.'
    t1='Gaple'; p1='2–4 pemain'; g1='Sambung ujungnya, habiskan kartumu.'
    t2='Perang kapal'; p2='2 pemain'; g2='Tenggelamkan armadanya.'
  else
    headline='And more on the table.'
    t0='Snakes &amp; ladders'; p0='2–4 players'; g0='Climb the ladders, dodge the snakes.'
    t1='Gaple'; p1='2–4 players'; g1='Match the ends, empty your hand.'
    t2='Perang kapal'; p2='2 players'; g2='Sink the fleet.'
  fi
  # Backdrop + headline only (cards animate on top). Headline pinned high so the
  # rising cards don't cover it.
  local bg_css="
    .wrap{position:absolute;top:0;left:0;width:${W}px;height:${H}px;box-sizing:border-box}
    h1{position:absolute;left:0;right:0;top:48px;height:100px;display:flex;align-items:center;
       justify-content:center;font-size:56px;margin:0;text-align:center;padding:0 80px}
  "
  card "<div class=\"wrap\"><h1>$headline</h1></div>" "$bg_css" "$TMP/games-bg.png"

  local card_css="
    html,body{margin:0;width:580px;height:500px;overflow:hidden;background:transparent}
    body{font-family:ui-rounded,\"SF Pro Rounded\",-apple-system,system-ui,sans-serif}
    .gc{width:580px;height:500px;box-sizing:border-box;border-radius:28px;padding:16px 20px 14px;
        display:flex;flex-direction:column;gap:4px;
        box-shadow:0 28px 56px -24px rgba(43,33,26,.5);color:#FFF6E8}
    .gc .t{font-size:38px;font-weight:900;letter-spacing:-.5px;line-height:1.1}
    .gc .p{font-size:18px;font-weight:700;color:#F3DDBE;opacity:.95}
    .gc .art{width:540px;height:370px;border-radius:18px;background-size:cover;background-position:center;flex:0 0 auto}
    .gc .g{font-size:20px;font-weight:600;color:#F3DDBE;line-height:1.2}
    .c0{background:linear-gradient(#4F8A3B,#4F8A3B 96%,#3B6A2B)}
    .c1{background:linear-gradient(#7B2D3B,#7B2D3B 96%,#5A1F2B)}
    .c2{background:linear-gradient(#1B4F72,#1B4F72 96%,#123A54)}
  "
  # One PNG per card so we can stagger slide-up + fade.
  local titles=("$t0" "$t1" "$t2") players=("$p0" "$p1" "$p2") tags=("$g0" "$g1" "$g2")
  local i=0
  for cls in c0 c1 c2; do
    printf '<!doctype html><html><head><meta charset="utf-8"><style>%s</style></head><body>
      <div class="gc %s"><div class="t">%s</div><div class="p">%s</div>
      <div class="art" style="background-image:url('\''file://%s/board-%s.png'\'')"></div>
      <div class="g">%s</div></div></body></html>' \
      "$card_css" "$cls" "${titles[$i]}" "${players[$i]}" "$TMP" "$i" "${tags[$i]}" > "$TMP/gcard-$i.html"
    "$CHROME" --headless=new --disable-gpu --hide-scrollbars --default-background-color=00000000 \
      --allow-file-access-from-files --virtual-time-budget=2000 --window-size=580,500 \
      --screenshot="$TMP/gcard-$i.png" "file://$TMP/gcard-$i.html" 2>/dev/null
    i=$((i + 1))
  done

  local cw=580 ch=500 gap=28
  local row=$(( 3 * cw + 2 * gap ))
  local cx=$(( (W - row) / 2 ))
  local cy=$(( (H - ch) / 2 + 36 ))  # optically under the top headline
  local x2=$(( cx + cw + gap ))
  local x3=$(( cx + 2 * (cw + gap) ))
  local out="$TMP/seg-${#SEGMENTS[@]}.mp4"
  # Stagger on the beat grid (0 / 0.5 / 1.0 s) so each card lands with a BGM hit.
  ffmpeg -v error -y \
    -framerate $FPS -loop 1 -t "$dur" -i "$TMP/games-bg.png" \
    -loop 1 -t "$dur" -i "$TMP/gcard-0.png" \
    -loop 1 -t "$dur" -i "$TMP/gcard-1.png" \
    -loop 1 -t "$dur" -i "$TMP/gcard-2.png" \
    -filter_complex "\
      [1:v]format=rgba,fade=t=in:st=0.00:d=0.35:alpha=1[c0];\
      [2:v]format=rgba,fade=t=in:st=0.50:d=0.35:alpha=1[c1];\
      [3:v]format=rgba,fade=t=in:st=1.00:d=0.35:alpha=1[c2];\
      [0:v][c0]overlay=${cx}:'${cy}+48*(1-min(1\\,max(0\\,(t-0.00)/0.35)))+3*sin(2*PI*t/3.2)':shortest=1:format=auto[o1];\
      [o1][c1]overlay=${x2}:'${cy}+48*(1-min(1\\,max(0\\,(t-0.50)/0.35)))+3*sin(2*PI*(t-0.5)/3.2)':shortest=1:format=auto[o2];\
      [o2][c2]overlay=${x3}:'${cy}+48*(1-min(1\\,max(0\\,(t-1.00)/0.35)))+3*sin(2*PI*(t-1.0)/3.2)':shortest=1:format=auto,setsar=1,format=yuv420p" \
    -t "$dur" -c:v libx264 -preset fast -crf 16 -an "$out"
  SEGMENTS+=("$out")
  DURATIONS+=("$dur")
}

# Resolve a cached narrator clip: krida/audio/promo/<lang>/<beat>-*.mp3
voice_file() {
  local lang="$1" beat="$2" dir f
  dir="$(cd "$HERE/.." && pwd)/audio/promo/$lang"
  f=$(compgen -G "$dir/$beat-*.mp3" | head -1 || true)
  [[ -n "${f:-}" ]] && printf '%s' "$f"
}

# Beat length that fits the VO: max(min_s, delay + vo_dur + tail).
# voice_fit <lang> <beat> <delay_s> <min_s>
voice_fit() {
  local f vo_dur delay="${3:-0.35}" min_s="${4:-1.5}"
  f=$(voice_file "$1" "$2" || true)
  if [[ -z "${f:-}" ]]; then
    printf '%s' "$min_s"
    return
  fi
  vo_dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")
  python3 -c "print(round(max(float('$min_s'), float('$delay') + float('$vo_dur') + 0.45), 2))"
}

# Shared EN/ID length on the 120 BPM grid so both langs hit the same BGM drops.
# voice_grid <beat> <delay_s> <min_s>
voice_grid() {
  local a b
  a=$(voice_fit en "$1" "$2" "$3")
  b=$(voice_fit id "$1" "$2" "$3")
  python3 -c "import math; v=max(float('$a'), float('$b')); print(math.ceil(v / float('$BEAT_SEC')) * float('$BEAT_SEC'))"
}

# Record a VO against the segment just appended: voice_beat <lang> <beat> [delay_s]
voice_beat() {
  local f delay="${3:-0.35}"
  f=$(voice_file "$1" "$2" || true)
  [[ -n "${f:-}" ]] || return 0
  VOICES+=("$f|$((${#SEGMENTS[@]} - 1))|$delay")
}

concat() {
  local out="$1"
  local n=${#SEGMENTS[@]}
  local inputs=() filters="" i
  local -a starts=(0)
  for ((i = 0; i < n; i++)); do
    inputs+=(-i "${SEGMENTS[$i]}")
  done
  # xfade between beats (FADE seconds each). TRANSITIONS[i-1] names the join into segment i.
  if [[ "$n" -eq 1 ]]; then
    filters="[0:v]format=yuv420p,setsar=1[vout]"
  else
    local offset prev=0
    offset=$(python3 -c "print(max(0.05, float('${DURATIONS[0]}') - float('$FADE')))")
    starts+=( "$offset" )
    for ((i = 1; i < n; i++)); do
      local left label xf
      xf="${TRANSITIONS[$((i - 1))]:-fade}"
      if [[ "$prev" -eq 0 ]]; then left="0:v"; else left="x${prev}"; fi
      if [[ "$i" -eq $((n - 1)) ]]; then
        label="vout"
        filters+="${filters:+;}[${left}][${i}:v]xfade=transition=${xf}:duration=${FADE}:offset=${offset},setsar=1,format=yuv420p[${label}]"
      else
        label="x${i}"
        filters+="${filters:+;}[${left}][${i}:v]xfade=transition=${xf}:duration=${FADE}:offset=${offset}[${label}]"
        offset=$(python3 -c "print(max(0.05, float('$offset') + float('${DURATIONS[$i]}') - float('$FADE')))")
        starts+=( "$offset" )
        prev=$i
      fi
    done
  fi
  local total
  total=$(python3 -c "
ds = [float(x) for x in '''${DURATIONS[*]}'''.split()]
print(max(0.5, sum(ds) - (len(ds) - 1) * float('$FADE')))
")

  # BGM (ducked under VO) + optional narrator clips (VOICES: file|seg|delay_s).
  # Every audio branch is padded/trimmed to $total — otherwise amix/sidechain
  # truncates to the first short VO clip (~hook length).
  local k=0 a_inputs=0 has_bgm=0
  if [[ -f "$BGM" ]]; then
    inputs+=(-i "$BGM")
    local bgm_i=$n
    filters+=";[${bgm_i}:a]atrim=0:${total},asetpts=PTS-STARTPTS,volume=0.28,afade=t=in:d=0.25,afade=t=out:st=$(python3 -c "print(max(0,$total-1.6))"):d=1.5[bgm]"
    has_bgm=1
    a_inputs=1
  fi
  local v vo_labels=""
  for v in ${VOICES[@]+"${VOICES[@]}"}; do
    local file seg delay_s delay_ms
    IFS='|' read -r file seg delay_s <<<"$v"
    [[ -f "$file" ]] || continue
    inputs+=(-i "$file")
    delay_ms=$(python3 -c "print(int((float('${starts[$seg]}') + float('${delay_s:-0.35}')) * 1000))")
    filters+=";[$((n + a_inputs + k)):a]adelay=${delay_ms}|${delay_ms},apad=whole_dur=${total},atrim=0:${total},asetpts=PTS-STARTPTS,volume=1.55[v$k]"
    vo_labels+="[v$k]"
    k=$((k + 1))
  done
  if [[ "$has_bgm" -eq 1 || "$k" -gt 0 ]]; then
    if [[ "$has_bgm" -eq 1 && "$k" -gt 0 ]]; then
      if [[ "$k" -eq 1 ]]; then
        filters+=";${vo_labels}asplit=2[vo][sc]"
      else
        filters+=";${vo_labels}amix=inputs=${k}:duration=longest:normalize=0,asplit=2[vo][sc]"
      fi
      # Duck under narrator; bed stays audible between lines.
      filters+=";[bgm][sc]sidechaincompress=threshold=0.03:ratio=5:attack=50:release=350:level_sc=1[bgmd]"
      filters+=";[bgmd][vo]amix=inputs=2:duration=longest:normalize=0[aout]"
    elif [[ "$has_bgm" -eq 1 ]]; then
      filters+=";[bgm]anull[aout]"
    elif [[ "$k" -eq 1 ]]; then
      filters+=";${vo_labels}anull[aout]"
    else
      filters+=";${vo_labels}amix=inputs=${k}:duration=longest:normalize=0[aout]"
    fi
    ffmpeg -v error -y "${inputs[@]}" -filter_complex "$filters" -map "[vout]" -map "[aout]" \
      -c:v libx264 -preset fast -crf 16 -c:a aac -b:a 192k -t "$total" -movflags +faststart "$out"
  else
    ffmpeg -v error -y "${inputs[@]}" -filter_complex "$filters" -map "[vout]" \
      -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=48000 \
      -c:v libx264 -preset fast -crf 16 -c:a aac -shortest -movflags +faststart "$out"
  fi
}
