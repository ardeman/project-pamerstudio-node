// Closed-form damped springs for seek(t) films (product-launch-motion v2).
// Ported from AbubakrChan/product-launch-motion references/technique.md (MIT).

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))

/** Closed-form damped step response, 0 → 1. */
export function stepR(tau, { w, z }) {
  if (tau <= 0) return 0
  if (z >= 1) {
    const x = w * tau
    return 1 - Math.exp(-x) * (1 + x)
  }
  const wd = w * Math.sqrt(1 - z * z)
  return 1 - Math.exp(-z * w * tau) * (Math.cos(wd * tau) + ((z * w) / wd) * Math.sin(wd * tau))
}

/** Many target changes = sum of one spring per change (pure function of t). */
export class Track {
  constructor(v0) {
    this.v0 = v0
    this.cur = v0
    this.ev = []
  }
  to(t, v, sp) {
    if (v !== this.cur) {
      this.ev.push([t, v - this.cur, sp])
      this.cur = v
    }
    return this
  }
  at(t) {
    let v = this.v0
    for (const [ti, d, sp] of this.ev) v += d * stepR(t - ti, sp)
    return v
  }
}

/** Enter on a spring, exit short and early — for text inside a morphing card. */
export function vis(t, tin, tout, dOut = 0.12) {
  const e = stepR(t - tin, { w: 26, z: 1 })
  const x = tout == null ? 0 : clamp((t - tout) / dOut)
  const xo = x * x
  return { o: e * (1 - xo), b: (1 - e) * 10 + xo * 10, dy: (1 - e) * 16 - xo * 10, e }
}
