import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { forwardOrganization, organizationError, OrganizationGatewayError } from "@/lib/organization-gateway";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function handle(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new OrganizationGatewayError("กรุณาเข้าสู่ระบบ", 401);
    const identity = await prisma.memberIdentity.findUnique({ where: { id: session.user.id } });
    if (!identity?.isActive || !identity.emailVerifiedAt || identity.authVersion !== session.user.authVersion)
      throw new OrganizationGatewayError("กรุณาเข้าสู่ระบบใหม่", 401);
    const links = await prisma.memberOAuthAccount.findMany({ where: { identityId: identity.id, provider: "discord" }, take: 2 });
    if (links.length !== 1) throw new OrganizationGatewayError("กรุณาเชื่อม Discord ในหน้าโปรไฟล์ก่อนใช้กระเป๋า", 403);
    return await forwardOrganization(request, links[0].providerAccountId, "member", {
      base: process.env.ME_GUILD_BOT_API_URL, secret: process.env.COMMUNITY_MEMBER_SECRET,
      origin: process.env.NEXTAUTH_URL ?? request.url, production: process.env.NODE_ENV === "production",
    });
  } catch (error) { return organizationError(error); }
}
export const GET = handle;
export const POST = handle;
