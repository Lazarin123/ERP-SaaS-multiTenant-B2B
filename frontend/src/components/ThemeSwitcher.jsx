import { useState } from 'react';
import { Palette, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { PALETTES } from '../theme/palettes';

export default function ThemeSwitcher() {
  const { palette, mode, setPalette, toggleMode } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <button onClick={toggleMode} className="p-2 rounded-lg hover:bg-[var(--color-border)] transition-colors" title="Alternar claro/escuro">
          {mode === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        <button onClick={() => setOpen((o) => !o)} className="p-2 rounded-lg hover:bg-[var(--color-border)] transition-colors" title="Trocar tema">
          <Palette size={18} />
        </button>
      </div>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl shadow-luxury border z-20"
             style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          {Object.entries(PALETTES).map(([key, p]) => (
            <button
              key={key}
              onClick={() => { setPalette(key); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-[var(--color-border)] ${palette === key ? 'font-semibold' : ''}`}
            >
              <span className="w-4 h-4 rounded-full" style={{ background: p.light.primary, boxShadow: `0 0 0 2px ${p.light.accent}` }} />
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
