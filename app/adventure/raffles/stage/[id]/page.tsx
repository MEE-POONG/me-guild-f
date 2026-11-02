import { notFound, redirect } from "next/navigation";
import { getOfficeUrl } from "@/lib/backend";

export const dynamic = "force-dynamic";
export const metadata = { title: "เวทีหมุนลูกบอล — Me Guild", robots: { index: false, follow: false } };

export default async function StageScreenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f\d]{24}$/.test(id)) notFound();
  // The real stage remains protected by Office on B; F only hosts the public demo.
  redirect(getOfficeUrl(`/adventure/raffles/stage/${id}`));
}
