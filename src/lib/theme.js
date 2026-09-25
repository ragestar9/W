const THEME_KEY = 'vg-theme'
const VALID = ['dark', 'light']

export function getTheme() {
  const stored = localStorage.getItem(THEME_KEY)
  if (VALID.includes(stored)) return stored
  return 'dark'
}

export function setTheme(theme) {
  if (!VALID.includes(theme)) return
  localStorage.setItem(THEME_KEY, theme)
  document.documentElement.setAttribute('data-theme', theme)
  window.dispatchEvent(new CustomEvent('vg-theme-change', { detail: theme }))
}

export function toggleTheme() {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark')
}

export function initTheme() {
  setTheme(getTheme())
}
