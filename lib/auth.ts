import type { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID ?? "", clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "" }),
    DiscordProvider({ clientId: process.env.DISCORD_CLIENT_ID ?? "", clientSecret: process.env.DISCORD_CLIENT_SECRET ?? "", authorization: { params: { scope: "identify email guilds" } } }),
  ],
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async jwt({ token, account }) { if (account?.provider) token.provider = account.provider; return token; },
    async session({ session, token }) { if (session.user) { session.user.id = token.sub; session.user.provider = typeof token.provider === "string" ? token.provider : undefined; } return session; },
  },
};
