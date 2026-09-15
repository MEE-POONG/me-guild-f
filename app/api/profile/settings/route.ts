import { createHash } from "node:crypto";
import { getServerSession } from "next-auth";
import {
  ColorMode,
  DisplayLayout,
  ProfileSectionType,
  ProfileTheme,
  SiteLocale,
} from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mutationError, readJsonBody } from "@/lib/member-security";

const localeValues = new Set(Object.values(SiteLocale));
const modeValues = new Set(Object.values(ColorMode));
const themeValues = new Set(Object.values(ProfileTheme));
const sectionValues = new Set(Object.values(ProfileSectionType));
const layoutValues = new Set(Object.values(DisplayLayout));

function optionalText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return undefined;
  return value.trim().slice(0, maxLength) || null;
}

function requiredText(value: unknown, fallback: string, maxLength: number) {
  const text = optionalText(value, maxLength);
  return typeof text === "string" ? text : fallback;
}

function optionalUrl(value: unknown) {
  const text = optionalText(value, 500);
  if (!text) return text;
  try { const url = new URL(text); return ["https:", "http:"].includes(url.protocol) ? url.href : null; } catch { return null; }
}

function enumValue<T extends string>(value: unknown, values: Set<T>) {
  if (typeof value !== "string") return undefined;
  const normalized = value.toUpperCase() as T;
  return values.has(normalized) ? normalized : undefined;
}

function makeSlug(email: string, displayName: string) {
  const base = displayName.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 28) || "player";
  const suffix = createHash("sha256").update(email).digest("hex").slice(0, 7);
  return `${base}-${suffix}`;
}

async function getProfile(email: string) {
  return prisma.memberProfile.findUnique({
    where: { ownerEmail: email },
    include: {
      preference: true,
      sections: { orderBy: { position: "asc" } },
      songs: { orderBy: { position: "asc" } },
      foods: { orderBy: { position: "asc" } },
      achievements: { orderBy: { position: "asc" } },
      customItems: { orderBy: { position: "asc" } },
    },
  });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const profile = await getProfile(session.user.email.toLowerCase());
  if (profile?.identityId && profile.identityId !== session.user.id) return Response.json({ error: "PROFILE_OWNERSHIP_CONFLICT" }, { status: 409 });
  return Response.json({ profile }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const error = mutationError(request);
  if (error) return Response.json({ error }, { status: error === "JSON_REQUIRED" ? 415 : 403 });

  const body = await readJsonBody(request).catch(() => null);
  if (!body || typeof body !== "object") return Response.json({ error: "INVALID_BODY" }, { status: 400 });

  const email = session.user.email.toLowerCase();
  const identityId = session.user.id;
  const sessionImage = session.user.image;
  const existing = await getProfile(email);
  if (existing?.identityId && existing.identityId !== identityId) return Response.json({ error: "PROFILE_OWNERSHIP_CONFLICT" }, { status: 409 });
  const profileInput = typeof body.profile === "object" && body.profile ? body.profile as Record<string, unknown> : {};
  const preferenceInput = typeof body.preferences === "object" && body.preferences ? body.preferences as Record<string, unknown> : {};
  const displayName = requiredText(profileInput.displayName, session.user.name ?? email.split("@")[0], 80);

  try {
  await prisma.$transaction(async (tx) => {
  const profile = await tx.memberProfile.upsert({
    where: { ownerEmail: email },
    create: {
      ownerEmail: email,
      identityId,
      slug: makeSlug(email, displayName),
      displayName,
      headline: optionalText(profileInput.headline, 120),
      bio: optionalText(profileInput.bio, 500),
      avatarUrl: optionalUrl(profileInput.avatarUrl) ?? sessionImage,
      bannerUrl: optionalUrl(profileInput.bannerUrl),
      location: optionalText(profileInput.location, 100),
      websiteUrl: optionalUrl(profileInput.websiteUrl),
      statusText: optionalText(profileInput.statusText, 100),
    },
    update: {
      identityId,
      ...(profileInput.displayName !== undefined ? { displayName } : {}),
      ...(profileInput.headline !== undefined ? { headline: optionalText(profileInput.headline, 120) } : {}),
      ...(profileInput.bio !== undefined ? { bio: optionalText(profileInput.bio, 500) } : {}),
      ...(profileInput.avatarUrl !== undefined ? { avatarUrl: optionalUrl(profileInput.avatarUrl) } : {}),
      ...(profileInput.bannerUrl !== undefined ? { bannerUrl: optionalUrl(profileInput.bannerUrl) } : {}),
      ...(profileInput.location !== undefined ? { location: optionalText(profileInput.location, 100) } : {}),
      ...(profileInput.websiteUrl !== undefined ? { websiteUrl: optionalUrl(profileInput.websiteUrl) } : {}),
      ...(profileInput.statusText !== undefined ? { statusText: optionalText(profileInput.statusText, 100) } : {}),
    },
  });

  const locale = enumValue(preferenceInput.locale, localeValues);
  const colorMode = enumValue(preferenceInput.colorMode, modeValues);
  const profileTheme = enumValue(preferenceInput.profileTheme, themeValues);
  await tx.memberIdentity.update({ where: { id: identityId }, data: { displayName, ...(profileInput.avatarUrl !== undefined ? { avatarUrl: optionalUrl(profileInput.avatarUrl) } : {}) } });
  await tx.memberPreference.upsert({
    where: { profileId: profile.id },
    create: {
      profileId: profile.id,
      locale: locale ?? SiteLocale.TH,
      colorMode: colorMode ?? ColorMode.DARK,
      profileTheme: profileTheme ?? ProfileTheme.NEON,
    },
    update: {
      ...(locale ? { locale } : {}),
      ...(colorMode ? { colorMode } : {}),
      ...(profileTheme ? { profileTheme } : {}),
      ...(typeof preferenceInput.showLocaleBadge === "boolean" ? { showLocaleBadge: preferenceInput.showLocaleBadge } : {}),
      ...(typeof preferenceInput.autoplayMusic === "boolean" ? { autoplayMusic: preferenceInput.autoplayMusic } : {}),
      ...(typeof preferenceInput.reducedMotion === "boolean" ? { reducedMotion: preferenceInput.reducedMotion } : {}),
    },
  });

  if (Array.isArray(body.sections)) {
    for (const [position, value] of body.sections.slice(0, 20).entries()) {
      if (!value || typeof value !== "object") continue;
      const input = value as Record<string, unknown>;
      const type = enumValue(input.type, sectionValues);
      const layout = enumValue(input.layout, layoutValues);
      if (!type || !layout) continue;
      await tx.profileSection.upsert({
        where: { profileId_type: { profileId: profile.id, type } },
        create: { profileId: profile.id, type, layout, position, isVisible: input.isVisible !== false, title: optionalText(input.title, 80) },
        update: { layout, position, isVisible: input.isVisible !== false, title: optionalText(input.title, 80) },
      });
    }
  }

  if (Array.isArray(body.songs)) {
    await tx.profileSong.deleteMany({ where: { profileId: profile.id } });
    const songs = body.songs.slice(0, 20).flatMap((value, position) => {
      if (!value || typeof value !== "object") return [];
      const input = value as Record<string, unknown>;
      const title = optionalText(input.title, 120);
      const artist = optionalText(input.artist, 120);
      if (!title || !artist) return [];
      return [{ profileId: profile.id, title, artist, album: optionalText(input.album, 120), artworkUrl: optionalUrl(input.artworkUrl), externalUrl: optionalUrl(input.externalUrl), position }];
    });
    if (songs.length) await tx.profileSong.createMany({ data: songs });
  }

  if (Array.isArray(body.foods)) {
    await tx.profileFood.deleteMany({ where: { profileId: profile.id } });
    const foods = body.foods.slice(0, 20).flatMap((value, position) => {
      if (!value || typeof value !== "object") return [];
      const input = value as Record<string, unknown>;
      const name = optionalText(input.name, 120);
      if (!name) return [];
      return [{ profileId: profile.id, name, cuisine: optionalText(input.cuisine, 80), description: optionalText(input.description, 300), imageUrl: optionalUrl(input.imageUrl), position }];
    });
    if (foods.length) await tx.profileFood.createMany({ data: foods });
  }

  if (Array.isArray(body.customItems)) {
    await tx.profileCustomItem.deleteMany({ where: { profileId: profile.id } });
    const customItems = body.customItems.slice(0, 30).flatMap((value, position) => {
      if (!value || typeof value !== "object") return [];
      const input = value as Record<string, unknown>;
      const title = optionalText(input.title, 120);
      if (!title) return [];
      return [{ profileId: profile.id, category: requiredText(input.category, "OTHER", 60), title, subtitle: optionalText(input.subtitle, 120), description: optionalText(input.description, 300), imageUrl: optionalUrl(input.imageUrl), externalUrl: optionalUrl(input.externalUrl), position }];
    });
    if (customItems.length) await tx.profileCustomItem.createMany({ data: customItems });
  }
  });
  } catch { return Response.json({ error: "PROFILE_SAVE_FAILED" }, { status: 503 }); }

  return Response.json({ profile: await getProfile(email) }, { headers: { "Cache-Control": "no-store" } });
}
