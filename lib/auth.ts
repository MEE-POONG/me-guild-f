import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import DiscordProvider from "next-auth/providers/discord";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit, resolveOAuthIdentity } from "@/lib/member-accounts";
import { normalizeEmail, providerEmailVerified, safeReturnPath, verifyPassword } from "@/lib/member-security";

const secureCookies = process.env.NEXTAUTH_URL?.startsWith("https:") ?? false;
const cookieOptions = { httpOnly: true, sameSite: "lax" as const, path: "/", secure: secureCookies };
const cookieName = (name: string) => `${secureCookies ? "__Secure-" : ""}me-guild.member-${name}`;
const googleCallbackUrl = new URL(
  "/api/auth/google/callback",
  process.env.NEXTAUTH_URL ?? process.env.ME_GUILD_URL ?? "http://localhost:3000",
).toString();

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
      async authorize(credentials) {
        const email = normalizeEmail(credentials?.email);
        const password = credentials?.password;
        if (!email || !password || password.length > 128) return null;
        if (!await consumeRateLimit("login", email, 10)) throw new Error("TOO_MANY_ATTEMPTS");
        const identity = await prisma.memberIdentity.findUnique({ where: { email } });
        const correct = await verifyPassword(password, identity?.passwordHash ?? null);
        if (!correct || !identity?.isActive) return null;
        if (!identity.emailVerifiedAt) throw new Error("EMAIL_NOT_VERIFIED");
        return { id: identity.id, email: identity.email, name: identity.displayName, image: identity.avatarUrl, authVersion: identity.authVersion };
      },
    }),
    ...((process.env.GOOGLE_CLIENT_ID ?? process.env.CLIENT_ID) && (process.env.GOOGLE_CLIENT_SECRET ?? process.env.CLIENT_SECRET) ? [GoogleProvider({
      clientId: (process.env.GOOGLE_CLIENT_ID ?? process.env.CLIENT_ID)!,
      clientSecret: (process.env.GOOGLE_CLIENT_SECRET ?? process.env.CLIENT_SECRET)!,
      authorization: { params: { redirect_uri: googleCallbackUrl } },
      token: {
        async request({ client, params, checks }) {
          return { tokens: await client.callback(googleCallbackUrl, params, checks) };
        },
      },
    })] : []),
    ...(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET ? [DiscordProvider({ clientId: process.env.DISCORD_CLIENT_ID, clientSecret: process.env.DISCORD_CLIENT_SECRET, authorization: { params: { scope: "identify email" } } })] : []),
  ],
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  cookies: {
    sessionToken: {
      name: cookieName("session"),
      options: cookieOptions,
    },
    csrfToken: { name: cookieName("csrf"), options: cookieOptions },
    callbackUrl: { name: cookieName("callback"), options: cookieOptions },
    state: { name: cookieName("state"), options: { ...cookieOptions, maxAge: 900 } },
    pkceCodeVerifier: { name: cookieName("pkce"), options: { ...cookieOptions, maxAge: 900 } },
    nonce: { name: cookieName("nonce"), options: cookieOptions },
  },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "credentials") return true;
      if (!account || !providerEmailVerified(account.provider, profile)) return "/login?error=VERIFIED_PROVIDER_EMAIL_REQUIRED";
      const email = normalizeEmail(user.email);
      if (!email) return "/login?error=VERIFIED_PROVIDER_EMAIL_REQUIRED";
      try {
        const identity = await resolveOAuthIdentity(account.provider, account.providerAccountId, email, user.name ?? email.split("@")[0], user.image);
        if (!identity) return "/login?error=ACCOUNT_LINK_REQUIRED";
        user.id = identity.id;
        user.email = identity.email;
        user.name = identity.displayName;
        user.image = identity.avatarUrl;
        user.authVersion = identity.authVersion;
        return true;
      } catch { return "/login?error=AUTH_UNAVAILABLE"; }
    },
    async jwt({ token, user, account }) {
      if (user) { token.sub = user.id; token.authVersion = user.authVersion; token.provider = account?.provider ?? "credentials"; }
      if (!token.sub || typeof token.authVersion !== "number") return {};
      const identity = await prisma.memberIdentity.findUnique({ where: { id: token.sub } }).catch(() => null);
      if (!identity?.isActive || !identity.emailVerifiedAt || identity.authVersion !== token.authVersion) return {};
      token.email = identity.email;
      token.name = identity.displayName;
      token.picture = identity.avatarUrl;
      return token;
    },
    async session({ session, token }) {
      if (!token.sub || typeof token.authVersion !== "number") { session.user = undefined; return session; }
      session.user = { id: token.sub, provider: typeof token.provider === "string" ? token.provider : undefined, email: token.email, name: token.name, image: token.picture, authVersion: token.authVersion };
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${safeReturnPath(url)}`;
      try { const parsed = new URL(url); if (parsed.origin === new URL(baseUrl).origin) return parsed.href; } catch { /* Use the member hub. */ }
      return `${baseUrl}/member`;
    },
  },
};
