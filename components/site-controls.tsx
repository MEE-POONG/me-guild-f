"use client";

import { Moon, Sun } from "@/components/icons";
import { localeMeta, siteLocales, type SiteLocale } from "@/lib/preferences";
import { useAppPreferences } from "@/components/app-preferences-provider";

const labels = {
  th: { language: "ภาษาเว็บไซต์", light: "เปลี่ยนเป็นโหมดกลางวัน", dark: "เปลี่ยนเป็นโหมดกลางคืน" },
  zh: { language: "网站语言", light: "切换到日间模式", dark: "切换到夜间模式" },
  en: { language: "Website language", light: "Switch to light mode", dark: "Switch to dark mode" },
  ja: { language: "サイトの言語", light: "ライトモードに切り替え", dark: "ダークモードに切り替え" },
};

export function SiteControls({ compact = false }: { compact?: boolean }) {
  const { locale, colorMode, setLocale, setColorMode } = useAppPreferences();
  const copy = labels[locale];
  const nextMode = colorMode === "dark" ? "light" : "dark";
  return <div className={`site-controls ${compact ? "site-controls-compact" : ""}`}>
    <label className="sr-only" htmlFor={compact ? "site-locale-mobile" : "site-locale"}>{copy.language}</label>
    <select id={compact ? "site-locale-mobile" : "site-locale"} name="locale" value={locale} onChange={(event) => setLocale(event.target.value as SiteLocale)} className="site-language-select">
      {siteLocales.map((code) => <option key={code} value={code}>{compact ? localeMeta[code].label : `${localeMeta[code].short} · ${localeMeta[code].label}`}</option>)}
    </select>
    <button type="button" className="site-theme-toggle" onClick={() => setColorMode(nextMode)} aria-label={nextMode === "light" ? copy.light : copy.dark} title={nextMode === "light" ? copy.light : copy.dark}>
      {colorMode === "dark" ? <Moon size={17} aria-hidden="true" /> : <Sun size={17} aria-hidden="true" />}
    </button>
  </div>;
}

