// Applies the stored or system theme before first paint, to avoid a flash of the wrong theme.
// It is a separate file, not an inline script, so the Content-Security-Policy can forbid inline scripts.
try {
  var t = localStorage.getItem('theme')
  var dark = t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches
  if (dark) document.documentElement.classList.add('dark')
} catch (e) {
  /* storage can be blocked; the page then follows the system theme through CSS */
}
