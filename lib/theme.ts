export const THEMES = [
  { id: 'fireside', name: 'Fireside' },
  { id: 'ocean', name: 'Ocean' },
  { id: 'forest', name: 'Forest' },
  { id: 'lavender', name: 'Lavender' },
  { id: 'citrus', name: 'Citrus' },
] as const

export type ThemeId = (typeof THEMES)[number]['id']

export function parseTheme(value: string | undefined): ThemeId {
  return THEMES.some((theme) => theme.id === value)
    ? value as ThemeId
    : 'fireside'
}
