import type { Metadata } from "next";
import { Chakra_Petch, Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

const chakra = Chakra_Petch({ variable: "--font-chakra", subsets: ["latin", "thai"], weight: ["400", "500", "600", "700"], display: "swap" });
const noto = Noto_Sans_Thai({ variable: "--font-noto", subsets: ["thai", "latin"], weight: ["400", "500", "600", "700"], display: "swap" });
export const metadata: Metadata = {
  title: "Me Guild",
  description: "ชุมชนนักผจญภัย คนรักเกม หนังสือ คอสเพลย์ และการเรียนรู้",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th" className={`${chakra.variable} ${noto.variable}`}><body>{children}</body></html>;
}
