"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { localeMeta, type ColorMode, type SiteLocale } from "@/lib/preferences";

type PreferencesContextValue = {
  locale: SiteLocale;
  colorMode: ColorMode;
  setLocale: (locale: SiteLocale, persistToAccount: boolean) => void;
  setColorMode: (mode: ColorMode, persistToAccount: boolean) => void;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function persistPreference(payload: Record<string, string>) {
  void fetch("/api/profile/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preferences: payload }),
    keepalive: true,
  }).catch(() => undefined);
}

export function AppPreferencesProvider({ initialLocale, initialColorMode, children }: { initialLocale: SiteLocale; initialColorMode: ColorMode; children: React.ReactNode }) {
  const router = useRouter();
  const [locale, updateLocale] = useState(initialLocale);
  const [colorMode, updateColorMode] = useState(initialColorMode);

  useEffect(() => {
    document.documentElement.dataset.colorMode = colorMode;
    document.documentElement.style.colorScheme = colorMode;
  }, [colorMode]);

  const value = useMemo<PreferencesContextValue>(() => ({
    locale,
    colorMode,
    setLocale(nextLocale, persistToAccount) {
      updateLocale(nextLocale);
      document.cookie = `mg_locale=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
      document.documentElement.lang = localeMeta[nextLocale].htmlLang;
      localStorage.setItem("mg_locale", nextLocale);
      if (persistToAccount) persistPreference({ locale: nextLocale });
      router.refresh();
    },
    setColorMode(nextMode, persistToAccount) {
      updateColorMode(nextMode);
      document.documentElement.dataset.colorMode = nextMode;
      document.documentElement.style.colorScheme = nextMode;
      document.cookie = `mg_color_mode=${nextMode}; Path=/; Max-Age=31536000; SameSite=Lax`;
      localStorage.setItem("mg_color_mode", nextMode);
      if (persistToAccount) persistPreference({ colorMode: nextMode });
    },
  }), [colorMode, locale, router]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function useAppPreferences() {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error("useAppPreferences must be used inside AppPreferencesProvider");
  return value;
}
