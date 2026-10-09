"use client";

import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-widest border border-current hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
      title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      aria-label="Toggle theme"
    >
      {theme === "light" ? (
        <>
          <Moon className="w-3.5 h-3.5" />
          <span>DARK</span>
        </>
      ) : (
        <>
          <Sun className="w-3.5 h-3.5" />
          <span>LIGHT</span>
        </>
      )}
    </button>
  );
}
