"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { TooltipIconButton } from "./assistant-ui/tooltip-icon-button";

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();

  return (
    <TooltipIconButton
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      tooltip={theme === "light" ? "Dark mode" : "Light mode"}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </TooltipIconButton>
  );
}
