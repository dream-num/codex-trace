import { createContext, useContext, useLayoutEffect, useState } from "react";

export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "codex-trace-theme";
export const ThemeContext = createContext<Theme>("dark");

function storedTheme(): Theme {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(storedTheme);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Theme still works when storage is unavailable.
    }
  }, [theme]);

  const toggleTheme = () => setTheme((current) => (current === "dark" ? "light" : "dark"));

  return { theme, toggleTheme };
}

export function useCurrentTheme() {
  return useContext(ThemeContext);
}
