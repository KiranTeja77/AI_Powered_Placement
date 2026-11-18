/**
 * Turns a CSS colour into the six-digit hex Monaco requires (#rrggbb, or #rrggbbaa).
 * A production build minifies "#ffffff" to "#fff" in the stylesheet, and Monaco rejects that
 * shorthand, so the value read from a design token is expanded here.
 */
export function toHex(css: string): string {
  const value = css.trim().toLowerCase()
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])([0-9a-f])?$/.exec(value)
  if (short) {
    const [, r, g, b, a] = short
    return `#${r}${r}${g}${g}${b}${b}${a ? a + a : ''}`
  }
  if (/^#([0-9a-f]{6}|[0-9a-f]{8})$/.test(value)) return value
  const rgb = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,/]+([\d.]+%?))?\s*\)$/.exec(value)
  if (rgb) {
    const channel = (n: string) => Math.min(255, Number(n)).toString(16).padStart(2, '0')
    let alpha = ''
    if (rgb[4] !== undefined) {
      const a = rgb[4].endsWith('%') ? Number.parseFloat(rgb[4]) / 100 : Number(rgb[4])
      alpha = Math.round(Math.min(1, a) * 255)
        .toString(16)
        .padStart(2, '0')
    }
    return `#${channel(rgb[1]!)}${channel(rgb[2]!)}${channel(rgb[3]!)}${alpha}`
  }
  throw new Error(`Cannot turn "${css}" into a hex colour`)
}
