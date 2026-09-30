import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { applyPalette } from '../theme/palettes';
import api from '../services/api';
import { useAuth } from './AuthContext';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const { tenant } = useAuth();
  const [palette, setPaletteState] = useState(localStorage.getItem('erp_palette') || 'navy-gold');
  const [mode, setModeState] = useState(localStorage.getItem('erp_mode') || 'light');

  // Ao logar, aplica o tema salvo para a empresa (definido pelo administrador)
  useEffect(() => {
    const cfg = tenant?.themeConfig;
    if (cfg?.palette) { setPaletteState(cfg.palette); localStorage.setItem('erp_palette', cfg.palette); }
    if (cfg?.mode) { setModeState(cfg.mode); localStorage.setItem('erp_mode', cfg.mode); }
  }, [tenant?.id]);

  useEffect(() => {
    applyPalette(palette, mode);
  }, [palette, mode]);

  const setPalette = useCallback((key) => {
    setPaletteState(key);
    localStorage.setItem('erp_palette', key);
    api.put('/plans/theme', { palette: key, mode }).catch(() => {});
  }, [mode]);

  const toggleMode = useCallback(() => {
    setModeState((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('erp_mode', next);
      api.put('/plans/theme', { palette, mode: next }).catch(() => {});
      return next;
    });
  }, [palette]);

  return (
    <ThemeContext.Provider value={{ palette, mode, setPalette, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
