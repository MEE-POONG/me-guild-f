import type { Metadata } from "next";
import { HeadquartersProject } from "@/container/adventure/headquarters-project";

export const metadata: Metadata = {
  title: { absolute: "โครงการสร้างศูนย์กลาง Me Guild" },
  description: "ติดตามแนวคิดและแผนโครงการศูนย์กลาง Me Guild พื้นที่ของคนรักเกม หนังสือ และการสร้างสรรค์ พร้อมแนวทางร่วมสร้างตามความสมัครใจ",
  robots: { index: false, follow: false },
};

export default function HeadquartersPage() {
  return <HeadquartersProject />;
}
