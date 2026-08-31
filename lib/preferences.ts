export const siteLocales = ["th", "zh", "en", "ja"] as const;
export type SiteLocale = (typeof siteLocales)[number];
export type ColorMode = "light" | "dark";
export type ProfileTheme = "neon" | "sakura" | "arcade" | "minimal" | "fantasy";

export const localeMeta: Record<SiteLocale, { label: string; short: string; htmlLang: string }> = {
  th: { label: "ไทย", short: "TH", htmlLang: "th" },
  zh: { label: "中文", short: "中", htmlLang: "zh-Hans" },
  en: { label: "English", short: "EN", htmlLang: "en" },
  ja: { label: "日本語", short: "日", htmlLang: "ja" },
};

export function normalizeLocale(value?: string | null): SiteLocale {
  return siteLocales.includes(value as SiteLocale) ? (value as SiteLocale) : "th";
}

export function normalizeColorMode(value?: string | null): ColorMode {
  return value === "light" ? "light" : "dark";
}
