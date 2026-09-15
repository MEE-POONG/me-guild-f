import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ProfileStudio } from "@/components/profile-studio";
import { authOptions } from "@/lib/auth";

export const metadata = { title: "Profile Studio" };

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=/profile");
  return <ProfileStudio signedIn initialName={session.user.name ?? "Player"} initialAvatar={session.user.image} />;
}
