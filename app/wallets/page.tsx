import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { OrganizationWallets } from "@/components/organization-wallets";
export const metadata = { title: "กระเป๋าองค์กร | ME Guild" };
export default async function WalletsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?callbackUrl=/wallets");
  return <main className="min-h-dvh bg-[#f8f9fc] px-3 py-8"><div className="mx-auto mb-5 max-w-6xl text-slate-700"><Link href="/member">← Member Hub</Link></div><OrganizationWallets /></main>;
}
