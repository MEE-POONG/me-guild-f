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
  if (!session?.user?.email) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const profile = await getProfile(session.user.email.toLowerCase());
  return Response.json({ profile });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "INVALID_ORIGIN" }, { status: 403 });
  if (!request.headers.get("content-type")?.includes("application/json")) return Response.json({ error: "JSON_REQUIRED" }, { status: 415 });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") return Response.json({ error: "INVALID_BODY" }, { status: 400 });

  const email = session.user.email.toLowerCase();
  const profileInput = typeof body.profile === "object" && body.profile ? body.profile as Record<string, unknown> : {};
  const preferenceInput = typeof body.preferences === "object" && body.preferences ? body.preferences as Record<string, unknown> : {};
  const displayName = requiredText(profileInput.displayName, session.user.name ?? email.split("@")[0], 80);

  const profile = await prisma.memberProfile.upsert({
    where: { ownerEmail: email },
    create: {
      ownerEmail: email,
      slug: makeSlug(email, displayName),
      displayName,
      headline: optionalText(profileInput.headline, 120),
      bio: optionalText(profileInput.bio, 500),
      avatarUrl: optionalText(profileInput.avatarUrl, 500) ?? session.user.image,
      bannerUrl: optionalText(profileInput.bannerUrl, 500),
      location: optionalText(profileInput.location, 100),
      websiteUrl: optionalText(profileInput.websiteUrl, 500),
      statusText: optionalText(profileInput.statusText, 100),
    },
    update: {
      ...(profileInput.displayName !== undefined ? { displayName } : {}),
      ...(profileInput.headline !== undefined ? { headline: optionalText(profileInput.headline, 120) } : {}),
      ...(profileInput.bio !== undefined ? { bio: optionalText(profileInput.bio, 500) } : {}),
      ...(profileInput.location !== undefined ? { location: optionalText(profileInput.location, 100) } : {}),
      ...(profileInput.websiteUrl !== undefined ? { websiteUrl: optionalText(profileInput.websiteUrl, 500) } : {}),
      ...(profileInput.statusText !== undefined ? { statusText: optionalText(profileInput.statusText, 100) } : {}),
    },
  });

  const locale = enumValue(preferenceInput.locale, localeValues);
  const colorMode = enumValue(preferenceInput.colorMode, modeValues);
  const profileTheme = enumValue(preferenceInput.profileTheme, themeValues);
  await prisma.memberPreference.upsert({
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
      await prisma.profileSection.upsert({
        where: { profileId_type: { profileId: profile.id, type } },
        create: { profileId: profile.id, type, layout, position, isVisible: input.isVisible !== false, title: optionalText(input.title, 80) },
        update: { layout, position, isVisible: input.isVisible !== false, title: optionalText(input.title, 80) },
      });
    }
  }

  if (Array.isArray(body.songs)) {
    await prisma.profileSong.deleteMany({ where: { profileId: profile.id } });
    const songs = body.songs.slice(0, 20).flatMap((value, position) => {
      if (!value || typeof value !== "object") return [];
      const input = value as Record<string, unknown>;
      const title = optionalText(input.title, 120);
      const artist = optionalText(input.artist, 120);
      if (!title || !artist) return [];
      return [{ profileId: profile.id, title, artist, album: optionalText(input.album, 120), artworkUrl: optionalText(input.artworkUrl, 500), externalUrl: optionalText(input.externalUrl, 500), position }];
    });
    if (songs.length) await prisma.profileSong.createMany({ data: songs });
  }

  if (Array.isArray(body.foods)) {
    await prisma.profileFood.deleteMany({ where: { profileId: profile.id } });
    const foods = body.foods.slice(0, 20).flatMap((value, position) => {
      if (!value || typeof value !== "object") return [];
      const input = value as Record<string, unknown>;
      const name = optionalText(input.name, 120);
      if (!name) return [];
      return [{ profileId: profile.id, name, cuisine: optionalText(input.cuisine, 80), description: optionalText(input.description, 300), imageUrl: optionalText(input.imageUrl, 500), position }];
    });
    if (foods.length) await prisma.profileFood.createMany({ data: foods });
  }

  if (Array.isArray(body.customItems)) {
    await prisma.profileCustomItem.deleteMany({ where: { profileId: profile.id } });
    const customItems = body.customItems.slice(0, 30).flatMap((value, position) => {
      if (!value || typeof value !== "object") return [];
      const input = value as Record<string, unknown>;
      const title = optionalText(input.title, 120);
      if (!title) return [];
      return [{ profileId: profile.id, category: requiredText(input.category, "OTHER", 60), title, subtitle: optionalText(input.subtitle, 120), description: optionalText(input.description, 300), imageUrl: optionalText(input.imageUrl, 500), externalUrl: optionalText(input.externalUrl, 500), position }];
    });
    if (customItems.length) await prisma.profileCustomItem.createMany({ data: customItems });
  }

  return Response.json({ profile: await getProfile(email) });
}
