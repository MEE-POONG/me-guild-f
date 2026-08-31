import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Chakra_Petch, Noto_Sans_Thai } from "next/font/google";
import { AppPreferencesProvider } from "@/components/app-preferences-provider";
import { localeMeta, normalizeColorMode, normalizeLocale } from "@/lib/preferences";
import "./globals.css";

const chakra = Chakra_Petch({ variable: "--font-chakra", subsets: ["latin", "thai"], weight: ["400", "500", "600", "700"], display: "swap" });
const noto = Noto_Sans_Thai({ variable: "--font-noto", subsets: ["thai", "latin"], weight: ["400", "500", "600", "700"], display: "swap" });

export const metadata: Metadata = { title: { default: "Me Guild — Find your squad", template: "%s | Me Guild" }, description: "คอมมูนิตี้เกมเมอร์ไทยสำหรับหาเพื่อน สร้างปาร์ตี้ เข้ากิลด์ และเติบโตไปด้วยกัน" };
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const store = await cookies();
  const locale = normalizeLocale(store.get("mg_locale")?.value);
  const colorMode = normalizeColorMode(store.get("mg_color_mode")?.value);
  return <html lang={localeMeta[locale].htmlLang} data-color-mode={colorMode} suppressHydrationWarning className={`${chakra.variable} ${noto.variable}`}><body><AppPreferencesProvider initialLocale={locale} initialColorMode={colorMode}>{children}</AppPreferencesProvider></body></html>;
}
