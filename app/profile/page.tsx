import { getServerSession } from "next-auth";
import { ProfileStudio } from "@/components/profile-studio";
import { authOptions } from "@/lib/auth";

export const metadata = { title: "Profile Studio" };

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  return <ProfileStudio signedIn={Boolean(session?.user?.email)} initialName={session?.user?.name ?? "Mika"} />;
}
