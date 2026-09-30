// Paletas de tema — mantêm sempre a identidade "Luxury Tech", variando o clima.
export const PALETTES = {
  'navy-gold': {
    label: 'Navy & Dourado (padrão)',
    light: { bg: '#F7F8FB', surface: '#FFFFFF', primary: '#0A1A33', primaryLight: '#16305F', accent: '#D4AF37', text: '#0A1A33', textMuted: '#5B6B8C', border: '#E7E9F2' },
    dark: { bg: '#050B1A', surface: '#0A1A33', primary: '#0F2247', primaryLight: '#1D3E77', accent: '#EAD494', text: '#F5F6FA', textMuted: '#9BA9CB', border: '#16305F' },
  },
  'emerald-gold': {
    label: 'Esmeralda & Dourado',
    light: { bg: '#F5FAF7', surface: '#FFFFFF', primary: '#0B3D2E', primaryLight: '#155940', accent: '#D4AF37', text: '#0B3D2E', textMuted: '#5C7A6D', border: '#E1EEE7' },
    dark: { bg: '#04120D', surface: '#0B3D2E', primary: '#0F5C42', primaryLight: '#187A56', accent: '#EAD494', text: '#F1FAF6', textMuted: '#8FB3A2', border: '#155940' },
  },
  'burgundy-gold': {
    label: 'Bordô & Dourado',
    light: { bg: '#FBF6F6', surface: '#FFFFFF', primary: '#3B0A1E', primaryLight: '#5C132E', accent: '#D4AF37', text: '#3B0A1E', textMuted: '#8A6B74', border: '#F0E1E5' },
    dark: { bg: '#180408', surface: '#3B0A1E', primary: '#5C132E', primaryLight: '#7A1B3C', accent: '#EAD494', text: '#FBF1F3', textMuted: '#C79AA6', border: '#5C132E' },
  },
};

export function applyPalette(paletteKey, mode) {
  const palette = PALETTES[paletteKey] || PALETTES['navy-gold'];
  const tokens = palette[mode] || palette.light;
  const root = document.documentElement;
  root.setAttribute('data-theme', mode);
  root.style.setProperty('--color-bg', tokens.bg);
  root.style.setProperty('--color-surface', tokens.surface);
  root.style.setProperty('--color-primary', tokens.primary);
  root.style.setProperty('--color-primary-light', tokens.primaryLight);
  root.style.setProperty('--color-accent', tokens.accent);
  root.style.setProperty('--color-text', tokens.text);
  root.style.setProperty('--color-text-muted', tokens.textMuted);
  root.style.setProperty('--color-border', tokens.border);
}
