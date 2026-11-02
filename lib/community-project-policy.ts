export const COMMUNITY_PROJECT_STAGES = ["CONCEPT", "PLANNING", "DESIGN", "BUILDING", "OPEN"] as const;
export const COMMUNITY_PROJECT_MEDIA_KINDS = ["CONCEPT", "PHOTO", "REFERENCE"] as const;
export type CommunityProjectStage = (typeof COMMUNITY_PROJECT_STAGES)[number];
export type CommunityProjectMediaKind = (typeof COMMUNITY_PROJECT_MEDIA_KINDS)[number];
export type CommunityProjectStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type CommunityProjectContent = {
  title: string; summary: string; body: string; locationLabel: string; stage: CommunityProjectStage;
  coverMediaId: string | null; galleryMediaIds: string[];
  spaces: { id: string; title: string; description: string }[];
  milestones: { id: string; title: string; description: string; state: "PLANNED" | "CURRENT" | "DONE" }[];
  supportUrl: string | null; supportLabel: string; supportNotice: string;
  updates: { id: string; title: string; body: string; date: string }[];
  transparencyNotes: string[];
};
export type CommunityProjectPublicImage = { url: string; alt: string; caption: string; kind: CommunityProjectMediaKind; width: number; height: number };
export type CommunityProjectMediaView = CommunityProjectPublicImage & { id: string; createdAt: string };
export type CommunityProjectPublic = Omit<CommunityProjectContent, "coverMediaId" | "galleryMediaIds"> & {
  slug: string; coverImage: CommunityProjectPublicImage; galleryImages: CommunityProjectPublicImage[]; updatedAt: string; publishedAt: string;
};
export type CommunityProjectDetail = {
  id: string; slug: string; status: CommunityProjectStatus; revision: number; publishedRevision: number | null;
  content: CommunityProjectContent; publishedAt: string | null; updatedAt: string; media: CommunityProjectMediaView[];
};
export type CommunityProjectListItem = Pick<CommunityProjectDetail, "id" | "slug" | "status" | "revision" | "publishedAt" | "updatedAt"> & { title: string; stage: CommunityProjectStage };

export const DEFAULT_COMMUNITY_PROJECT_COVER: CommunityProjectPublicImage = {
  url: "/adventure/headquarters-concept.webp", alt: "ภาพแนวคิดศูนย์กลาง Me Guild ในกรุงเทพฯ",
  caption: "ภาพแนวคิด · ไม่ใช่ภาพสถานที่จริง", kind: "CONCEPT", width: 1600, height: 900,
};
export const COMMUNITY_PROJECT_LIMITS = { title: 140, summary: 400, body: 8000, locationLabel: 160, spaces: 8, milestones: 8, gallery: 8, updates: 12, transparencyNotes: 8, mediaPerProject: 64 } as const;

export class CommunityProjectError extends Error {
  constructor(readonly code: string, readonly status: number, message: string) { super(message); }
}
function invalid(message: string): never { throw new CommunityProjectError("PROJECT_INVALID_INPUT", 400, message); }
export function communityProjectObjectId(value: unknown): value is string { return typeof value === "string" && /^[a-f\d]{24}$/.test(value); }
function exact(input: unknown, allowed: readonly string[]): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) invalid("ข้อมูลต้องเป็น object");
  const row = input as Record<string, unknown>;
  if (Object.keys(row).some((key) => !allowed.includes(key))) invalid("มีช่องข้อมูลที่ไม่รองรับ");
  return row;
}
function text(value: unknown, name: string, max: number, required = false): string {
  if (value === undefined && !required) return "";
  if (typeof value !== "string") invalid(`${name}ต้องเป็นข้อความ`);
  const cleaned = value.trim();
  if ((required && !cleaned) || cleaned.length > max) invalid(`${name}ต้อง${required ? "มีข้อความและ" : ""}ยาวไม่เกิน ${max} ตัวอักษร`);
  return cleaned;
}
function choice<T extends string>(value: unknown, allowed: readonly T[], fallback?: T): T {
  if (value === undefined && fallback) return fallback;
  if (typeof value !== "string" || !allowed.includes(value as T)) invalid("ตัวเลือกไม่ถูกต้อง");
  return value as T;
}
function array(value: unknown, max: number): unknown[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > max) invalid(`รายการต้องเป็น array ไม่เกิน ${max} รายการ`);
  return value;
}
function itemId(value: unknown) {
  const id = text(value, "รหัสรายการ", 48, true);
  if (!/^[a-z0-9][a-z0-9_-]{0,47}$/.test(id)) invalid("รหัสรายการต้องเป็นตัวพิมพ์เล็ก ตัวเลข - หรือ _");
  return id;
}
function uniqueIds<T extends { id: string }>(rows: T[]): T[] { if (new Set(rows.map((row) => row.id)).size !== rows.length) invalid("รหัสรายการซ้ำกัน"); return rows; }

export function parseCommunityProjectSlug(input: unknown): string {
  const slug = text(input, "slug", 80, true);
  if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(slug) || slug.endsWith("-") || slug.includes("--")) invalid("slug ต้องเป็นตัวพิมพ์เล็ก ตัวเลข หรือ - จำนวน 2–80 ตัว");
  return slug;
}

/** Navigation only. Never use this URL as a server fetch target. */
export function communityProjectPublicHttpsUrl(input: unknown): string {
  if (typeof input !== "string" || input.length > 2000 || !input.trim()) invalid("URL ไม่ถูกต้อง");
  let url: URL;
  try { url = new URL(input.trim()); } catch { return invalid("URL ไม่ถูกต้อง"); }
  const hostname = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || url.username || url.password || url.port || !hostname.includes(".") || hostname.startsWith("[") || /^\d+(?:\.\d+)*$/.test(hostname) || /(?:^|\.)(?:localhost|local|internal|lan|home|test|invalid|example)$/.test(hostname) || hostname.endsWith(".") || !/^[a-z0-9.-]+$/.test(hostname) || hostname.split(".").some((part) => !part || part.startsWith("-") || part.endsWith("-"))) invalid("URL ต้องเป็น HTTPS ของเว็บไซต์สาธารณะ ไม่มีรหัสผ่าน IP หรือพอร์ตพิเศษ");
  return url.toString();
}

export function parseCommunityProjectContent(input: unknown): CommunityProjectContent {
  const row = exact(input, ["title", "summary", "body", "locationLabel", "stage", "coverMediaId", "galleryMediaIds", "spaces", "milestones", "supportUrl", "supportLabel", "supportNotice", "updates", "transparencyNotes"]);
  const coverMediaId = row.coverMediaId === undefined || row.coverMediaId === null ? null : row.coverMediaId;
  if (coverMediaId !== null && !communityProjectObjectId(coverMediaId)) invalid("รหัสภาพหลักไม่ถูกต้อง");
  const galleryMediaIds = array(row.galleryMediaIds, 8).map((id) => { if (!communityProjectObjectId(id)) invalid("รหัสภาพแกลเลอรีไม่ถูกต้อง"); return id; });
  if (new Set(galleryMediaIds).size !== galleryMediaIds.length) invalid("ภาพแกลเลอรีซ้ำกัน");
  const spaces = uniqueIds(array(row.spaces, 8).map((value) => { const item = exact(value, ["id", "title", "description"]); return { id: itemId(item.id), title: text(item.title, "ชื่อพื้นที่", 100, true), description: text(item.description, "รายละเอียดพื้นที่", 700) }; }));
  const milestones = uniqueIds(array(row.milestones, 8).map((value) => { const item = exact(value, ["id", "title", "description", "state"]); return { id: itemId(item.id), title: text(item.title, "ชื่อขั้นตอน", 120, true), description: text(item.description, "รายละเอียดขั้นตอน", 700), state: choice(item.state, ["PLANNED", "CURRENT", "DONE"] as const, "PLANNED") }; }));
  const updates = uniqueIds(array(row.updates, 12).map((value) => {
    const item = exact(value, ["id", "title", "body", "date"]);
    const date = text(item.date, "วันที่อัปเดต", 10, true);
    const parsed = new Date(`${date}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) invalid("วันที่อัปเดตต้องเป็น YYYY-MM-DD ที่ถูกต้อง");
    return { id: itemId(item.id), title: text(item.title, "หัวข้ออัปเดต", 140, true), body: text(item.body, "เนื้อหาอัปเดต", 2500), date };
  }));
  return {
    title: text(row.title, "ชื่อโครงการ", 140, true), summary: text(row.summary, "คำโปรย", 400), body: text(row.body, "เนื้อหาโครงการ", 8000),
    locationLabel: text(row.locationLabel, "พื้นที่ตั้งโครงการ", 160), stage: choice(row.stage, COMMUNITY_PROJECT_STAGES, "CONCEPT"), coverMediaId, galleryMediaIds, spaces, milestones,
    supportUrl: row.supportUrl === undefined || row.supportUrl === null || row.supportUrl === "" ? null : communityProjectPublicHttpsUrl(row.supportUrl),
    supportLabel: text(row.supportLabel, "ข้อความลิงก์สนับสนุน", 80) || "ร่วมสนับสนุนโดยสมัครใจ",
    supportNotice: text(row.supportNotice, "ข้อความกำกับการสนับสนุน", 700) || "การสนับสนุนเป็นไปโดยสมัครใจ กรุณาตรวจสอบข้อมูลโครงการและช่องทางปลายทางก่อนดำเนินการ",
    updates, transparencyNotes: array(row.transparencyNotes, 8).map((value) => text(value, "หมายเหตุความโปร่งใส", 700, true)),
  };
}

export function parseCommunityProjectCreate(input: unknown) { const row = exact(input, ["slug", "content"]); return { slug: parseCommunityProjectSlug(row.slug), content: parseCommunityProjectContent(row.content) }; }
export function parseCommunityProjectMutation(input: unknown) {
  const row = exact(input, ["action", "revision", "content"]);
  if (!Number.isSafeInteger(row.revision) || Number(row.revision) < 1) invalid("revision ไม่ถูกต้อง");
  const action = choice(row.action, ["save", "publish", "archive"] as const);
  if (action === "save" && row.content === undefined) invalid("กรุณาระบุข้อมูลร่างที่จะบันทึก");
  if (action === "archive" && row.content !== undefined) invalid("การเก็บเข้าคลังไม่รับข้อมูลเนื้อหา");
  return { action, revision: Number(row.revision), ...(row.content !== undefined ? { content: parseCommunityProjectContent(row.content) } : {}) };
}

export function parseCommunityProjectPublicImage(input: unknown): CommunityProjectPublicImage {
  const row = exact(input, ["url", "alt", "caption", "kind", "width", "height"]);
  const kind = choice(row.kind, COMMUNITY_PROJECT_MEDIA_KINDS);
  const isDefault = row.url === DEFAULT_COMMUNITY_PROJECT_COVER.url;
  const url = isDefault ? DEFAULT_COMMUNITY_PROJECT_COVER.url : communityProjectPublicHttpsUrl(row.url);
  if (isDefault && (kind !== "CONCEPT" || row.caption !== DEFAULT_COMMUNITY_PROJECT_COVER.caption)) invalid("ภาพแนวคิดเริ่มต้นต้องมีคำกำกับที่ถูกต้อง");
  if (kind === "CONCEPT" && (typeof row.caption !== "string" || !row.caption.includes(DEFAULT_COMMUNITY_PROJECT_COVER.caption))) invalid("ภาพแนวคิดต้องระบุว่าไม่ใช่ภาพสถานที่จริง");
  if (!Number.isSafeInteger(row.width) || !Number.isSafeInteger(row.height) || Number(row.width) < 1 || Number(row.height) < 1 || Number(row.width) * Number(row.height) > 16_000_000) invalid("ขนาดภาพไม่ถูกต้อง");
  return { url, alt: text(row.alt, "คำอธิบายภาพ", 180, true), caption: text(row.caption, "คำกำกับภาพ", 300), kind, width: Number(row.width), height: Number(row.height) };
}

export function parseCommunityProjectPublic(input: unknown): CommunityProjectPublic {
  const row = exact(input, ["title", "summary", "body", "locationLabel", "stage", "spaces", "milestones", "supportUrl", "supportLabel", "supportNotice", "updates", "transparencyNotes", "slug", "coverImage", "galleryImages", "updatedAt", "publishedAt"]);
  const { slug, coverImage, galleryImages, updatedAt, publishedAt, ...content } = row;
  const parsed = parseCommunityProjectContent({ ...content, coverMediaId: null, galleryMediaIds: [] });
  if (typeof updatedAt !== "string" || typeof publishedAt !== "string" || !Number.isFinite(Date.parse(updatedAt)) || !Number.isFinite(Date.parse(publishedAt))) invalid("วันที่เผยแพร่ไม่ถูกต้อง");
  const { coverMediaId: _coverId, galleryMediaIds: _galleryIds, ...publicContent } = parsed;
  void _coverId; void _galleryIds;
  return { ...publicContent, slug: parseCommunityProjectSlug(slug), coverImage: parseCommunityProjectPublicImage(coverImage), galleryImages: array(galleryImages, 8).map(parseCommunityProjectPublicImage), updatedAt, publishedAt };
}

export function parseCommunityProjectListQuery(params: URLSearchParams) {
  for (const key of params.keys()) if (!["page", "pageSize"].includes(key) || params.getAll(key).length !== 1) invalid("ตัวกรองซ้ำหรือไม่รองรับ");
  const number = (key: string, fallback: number, max: number) => { const value = params.get(key); if (value === null) return fallback; if (!/^[1-9]\d*$/.test(value) || Number(value) > max) invalid("จำนวนหน้าหรือขนาดหน้าไม่ถูกต้อง"); return Number(value); };
  const page = number("page", 1, 1000); const pageSize = number("pageSize", 20, 50);
  return { page, pageSize, skip: (page - 1) * pageSize };
}
