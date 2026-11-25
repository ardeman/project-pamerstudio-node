# Krida launch promo — sneak peek

Three beats: **Congklak gameplay**, **nearby**, and a **game-picker swipe** (hints at more boards — don’t play them all).

```
record congklak + nearby + games → clips/*.mp4 → render → ../out/promo/promo-{en,id}.mp4
```

## 1. Record

Boot a Simulator iPhone with Krida installed (`JAVA_HOME` for a fresh build), then:

```sh
node krida/promo/record.mjs congklak --seconds 20
node krida/promo/record.mjs nearby --seconds 12
node krida/promo/record.mjs games --seconds 18
```

Settles past the splash. If `maestro` is on `PATH` (`~/.maestro/bin`): congklak arms **Autopilot** and waits until sowing is visible *before* the tape starts (so the clip isn’t an idle load); games taps **Next game** while recording.

- `congklak` → vs computer (`-openCongklakComputer`).
- `nearby` → host lobby / QR (`-openNearby`). A fully static lobby may need a still→mp4 (simctl drops motionless frames).
- `games` → main menu; **Next game** through the picker — don’t Start.

## 2. Render

Promo BGM (gamelan × EDM bed on a 120 BPM grid, ducked under VO) and narrator lines are paid once, then cached:

```sh
node krida/promo/music.mjs --dry-run   # free music estimate
node krida/promo/music.mjs             # buy → out/promo/bgm.m4a
node krida/promo/voice.mjs --dry-run   # free VO estimate
node krida/promo/voice.mjs             # buy after you approve
node krida/promo/render.mjs all        # mixes BGM + VO under the picture (cached = free)
```

Beats: hook → Congklak → nearby → **game cards** (wide HTML cards with the app’s full titles + real board previews from the carousel clip; the in-app column is too skinny to read) → CTA to [krida.ardeman.com](https://krida.ardeman.com) (closed-test how-to there, which links to TesBareng). Gameplay sits in Apple’s landscape iPhone product bezel (`store-screenshots/public/frames/iphone-landscape.png`). Motion: Ken Burns on stills, phone drift on gameplay, staggered card slide-ins, CTA punch-zoom; joins use circleopen → smoothleft → slideup → fadewhite. Copy in `copy.mjs` / `narration.mjs`.

`clips/` is gitignored (large).
