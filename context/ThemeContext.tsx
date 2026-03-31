import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme as useDeviceColorScheme } from "react-native";
import { useStorageState } from "@/hooks/useStorageState";

export type ThemePreference = "light" | "dark" | "system";

interface ThemeContextType {
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => void;
  colorScheme: "light" | "dark";
  toastMessage: string | null;
  setToastMessage: (msg: string | null) => void;
  confettiTrigger: number;
  triggerConfetti: () => void;
}

const ThemeContext = createContext<ThemeContextType>({} as ThemeContextType);

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeContext must be used within a AppThemeProvider");
  }
  return context;
};

export const AppThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const deviceColorScheme = useDeviceColorScheme() || "light";
  const [[isLoading, storedPreference], setStoredPreference] = useStorageState("theme-preference");
  
  const [themePreference, setThemeState] = useState<ThemePreference>("system");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confettiTrigger, setConfettiTrigger] = useState(0);

  useEffect(() => {
    if (!isLoading && storedPreference) {
      setThemeState(storedPreference as ThemePreference);
    }
  }, [isLoading, storedPreference]);

  const setThemePreference = (pref: ThemePreference) => {
    setThemeState(pref);
    setStoredPreference(pref);
    setToastMessage(`Theme applied: ${pref.charAt(0).toUpperCase() + pref.slice(1)}`);
  };

  const triggerConfetti = () => {
    setConfettiTrigger(prev => prev + 1);
  };

  const colorScheme = themePreference === "system" ? deviceColorScheme : themePreference;

  return (
    <ThemeContext.Provider value={{ 
      themePreference, 
      setThemePreference, 
      colorScheme, 
      toastMessage, 
      setToastMessage,
      confettiTrigger,
      triggerConfetti
    }}>
      {children}
    </ThemeContext.Provider>
  );
};
