#!/usr/bin/env bash
# Launch sneak peek: hook → Congklak → nearby → game cards → CTA.
# Game cards beat shows only the colored GameCard carousel (no full device).
#   bash krida/promo/promo-video.sh [en|id|all]
# Needs clips/congklak.mp4, nearby.mp4, games.mp4 from record.mjs.
HERE="$(cd "$(dirname "$0")" && pwd)"
W=1920
H=1080
source "$HERE/lib.sh"

# Apple landscape iPhone bezel (store-screenshots product frame). Screen cutout
# measured on the 3000×1470 PNG: 66,75,2868×1320 — keep those ratios when scaling.
FRAME="$(cd "$HERE/../.." && pwd)/store-screenshots/public/frames/iphone-landscape.png"
[[ -f "$FRAME" ]] || { echo "Missing iPhone frame at $FRAME" >&2; exit 1; }
FW=1673 FH=820
FX=$(( (W - FW) / 2 ))
FY=180
# Screen rect inside the placed frame (gameplay lands here). Inset 2px so the
# rounded mask sits under the bezel chrome, not past the outer curve.
X=$(( FX + 66 * FW / 3000 + 2 ))
Y=$(( FY + 75 * FH / 1470 + 2 ))
SW=$(( 2868 * FW / 3000 - 4 ))
SH=$(( 1320 * FH / 1470 - 4 ))
# App wordmark (dice + Krida) — dark letters for the terracotta cards.
KRIDA_APP="${KRIDA_APP:-$(cd "$HERE/../../.." && pwd)/project-krida-kmp}"
WORDMARK="$KRIDA_APP/docs/brand/wordmark.svg"
[[ -f "$WORDMARK" ]] || { echo "Missing wordmark at $WORDMARK" >&2; exit 1; }

LANGS=("${1:-all}")
[[ "${LANGS[0]}" == all ]] && LANGS=(en id)

iphone_bezel "$FRAME" $FX $FY $FW $FH "$TMP/bezel.png"

title_card() { # title sub out
  card "<div style=\"display:flex;flex-direction:column;align-items:center;justify-content:center;height:${H}px;padding:0 120px;text-align:center\">
      <h1 style=\"font-size:72px\">$1</h1>
      <div class=\"sub\" style=\"font-size:34px;max-width:1100px\">$2</div>
    </div>" "" "$3"
}

# Closed-test end card: brand mark above the CTA.
cta_card() { # title sub out
  card "<div style=\"display:flex;flex-direction:column;align-items:center;justify-content:center;height:${H}px;padding:0 120px;text-align:center;gap:28px\">
      <img src=\"file://$WORDMARK\" alt=\"Krida\" style=\"height:80px;width:auto\">
      <div>
        <h1 style=\"font-size:72px\">$1</h1>
        <div class=\"sub\" style=\"font-size:34px;max-width:1100px\">$2</div>
      </div>
    </div>" "" "$3"
}

# Caption pinned to the top — room below for a floating GameCard (no device).
top_caption() { # title out
  card "<div style=\"position:absolute;left:0;right:0;top:48px;height:120px;display:flex;align-items:center;justify-content:center;text-align:center;padding:0 80px\">
      <h1 style=\"font-size:56px\">$1</h1>
    </div>" "" "$2"
}

# Caption above the phone — device chrome comes from the iPhone bezel overlay.
tablet_card() { # title out
  card "<div style=\"position:absolute;left:0;right:0;top:48px;height:120px;display:flex;align-items:center;justify-content:center;text-align:center;padding:0 80px\">
      <h1 style=\"font-size:56px\">$1</h1>
    </div>" "" "$2"
}

render_lang() {
  local lang="$1"
  SEGMENTS=()
  DURATIONS=()
  VOICES=()

  # Hook matches krida.ardeman.com hero: play together / main bareng (not “a congklak app”).
  if [[ "$lang" == en ]]; then
    title_card "Play together, anywhere." "A sneak peek at Krida." "$TMP/hook.png"
    tablet_card "One warm table." "$TMP/board.png"
    tablet_card "Friends next to you. No account." "$TMP/nearby.png"
    cta_card "Come join as a closed tester." "krida.ardeman.com" "$TMP/cta.png"
  else
    title_card "Main bareng, di mana saja." "Cuplikan kecil dari Krida." "$TMP/hook.png"
    tablet_card "Satu meja yang hangat." "$TMP/board.png"
    tablet_card "Teman di sebelah. Tanpa akun." "$TMP/nearby.png"
    cta_card "Yuk gabung jadi closed tester." "krida.ardeman.com" "$TMP/cta.png"
  fi

  # Shared 120 BPM lengths (fits both EN/ID VO) so cuts hit the same BGM drops.
  local d_hook d_board d_nearby d_games d_cta
  d_hook=$(voice_grid hook 0.25 1.6)
  d_board=$(voice_grid board 0.4 5.5)
  d_nearby=$(voice_grid nearby 0.35 3)
  d_games=$(voice_grid games 0.45 5)
  d_cta=$(voice_grid cta 0.3 2.4)

  still "$TMP/hook.png" "$d_hook"
  voice_beat "$lang" hook 0.25
  need_clip congklak
  gameplay "$TMP/board.png" "$TMP/bezel.png" congklak $X $Y $SW $SH "$d_board" 1
  voice_beat "$lang" board 0.4
  need_clip nearby
  gameplay "$TMP/nearby.png" "$TMP/bezel.png" nearby $X $Y $SW $SH "$d_nearby" 0
  voice_beat "$lang" nearby 0.35
  # Wide cards with full titles + real board art (menu column alone truncates names).
  game_cards "$lang" games "$d_games"
  voice_beat "$lang" games 0.45
  still "$TMP/cta.png" "$d_cta" punch
  voice_beat "$lang" cta 0.3

  # Joins: open into the board → swipe to nearby → cards rise → clear to CTA.
  TRANSITIONS=(circleopen smoothleft slideup fadewhite)
  concat "$OUT/promo-$lang.mp4"
  echo "wrote $OUT/promo-$lang.mp4"
  ffmpeg -v error -y -ss 0.3 -i "$OUT/promo-$lang.mp4" -frames:v 1 \
    -vf scale=1280:720:flags=lanczos "$OUT/thumbnail-$lang.jpg"
  echo "wrote $OUT/thumbnail-$lang.jpg"
}

for lang in "${LANGS[@]}"; do
  render_lang "$lang"
done
