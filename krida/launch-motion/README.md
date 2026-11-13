# Krida · launch-motion

12 s one-shape loop (1080², 120 BPM) with **real app captures** inside the
morphing card:

| Beat | Shot (`shots/{lang}/`) | Source |
| --- | --- | --- |
| Lobby | `lobby.png` | iPhone `01-hero.png` |
| Board | `board.png` | iPhone `02-boards-a.png` (congklak) |
| Emotes | `emotes.png` | iPhone `05-emotes.png` |
| Match | `match.png` | iPhone `04-matchmaking.png` |

Symlinks into `store-screenshots/public/screenshots/apple/iphone/{lang}/`.
EN + ID. Audio from cached `krida/out/` bgm + sfx (free).

```sh
node krida/launch-motion/render.mjs --stills
node krida/launch-motion/render.mjs
node krida/launch-motion/render.mjs --silent
```

Skill: `../../.agents/skills/product-launch-motion/SKILL.md`.
