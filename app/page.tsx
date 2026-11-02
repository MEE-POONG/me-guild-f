import type { Metadata } from "next";
import { PublicHome } from "@/container/public/public-home";

export const metadata: Metadata = {
  title: "Me Guild — ทุกการผจญภัย เริ่มต้นที่คนข้าง ๆ",
  description: "พบเพื่อนที่รักเกม หนังสือ คอสเพลย์ และการเรียนรู้ สำรวจคลังอาชีพและทักษะ ร่วมกิจกรรม และเติบโตไปด้วยกันใน Me Guild",
};

export default function HomePage() { return <PublicHome />; }
