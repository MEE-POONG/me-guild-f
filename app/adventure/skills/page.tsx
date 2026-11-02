import type { Metadata } from "next";
import { RealLifeSkills } from "@/container/adventure/real-life-skills";

export const metadata: Metadata = {
  title: { absolute: "Lv และทักษะในชีวิตจริง · Me Guild" },
  description: "บันทึกทักษะในชีวิตจริง เลเวลรวม คลาส และผลประเมินทักษะย่อยของสมาชิก Me Guild",
  robots: { index: false, follow: false },
};

export default function RealLifeSkillsPage() {
  return <RealLifeSkills />;
}
