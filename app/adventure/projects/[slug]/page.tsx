import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HeadquartersProject } from "@/container/adventure/headquarters-project";
import { parseCommunityProjectSlug } from "@/lib/community-project-policy";

export const metadata: Metadata = {
  title: { absolute: "โครงการของชุมชน | Me Guild" },
  description: "อ่านแผนโครงการและความคืบหน้าที่ผู้จัด Me Guild เผยแพร่ พร้อมแนวทางร่วมสร้างตามความสมัครใจ",
  robots: { index: false, follow: false },
};

export default async function CommunityProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let projectSlug: string;
  try { projectSlug = parseCommunityProjectSlug(slug); } catch { notFound(); }
  return <HeadquartersProject slug={projectSlug} />;
}
