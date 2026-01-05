import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ThemeContext = createContext({
  settings: null,
  loading: true,
  refreshSettings: () => {},
});

// Convert hex to HSL for CSS variables
const hexToHSL = (hex) => {
  if (!hex || hex.length < 7) return null;
  
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;

  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
      default: h = 0;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

// Apply colors to CSS variables
const applyThemeColors = (settings) => {
  if (!settings) return;
  
  const root = document.documentElement;
  
  if (settings.primary_color) {
    const hsl = hexToHSL(settings.primary_color);
    if (hsl) root.style.setProperty('--primary', hsl);
  }
  if (settings.secondary_color) {
    const hsl = hexToHSL(settings.secondary_color);
    if (hsl) root.style.setProperty('--secondary', hsl);
  }
  if (settings.accent_color) {
    const hsl = hexToHSL(settings.accent_color);
    if (hsl) root.style.setProperty('--accent', hsl);
  }
};

export function ThemeProvider({ children }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/settings`);
      setSettings(response.data);
      applyThemeColors(response.data);
    } catch (error) {
      console.log('Failed to load theme settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const refreshSettings = () => {
    fetchSettings();
  };

  return (
    <ThemeContext.Provider value={{ settings, loading, refreshSettings }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export default ThemeProvider;
