import { memberAuthPageInput } from "./member-auth-page";

export type RegistrationSummary = {
  status: "VISITOR" | "ADVENTURER";
  profileCompleted: boolean;
  adventurerRegisteredAt: string | null;
  startingLevel: 0 | 1;
  registrationSource: "DISCORD_BOT" | "WEB" | null;
};
export type AdventurerRegistration = RegistrationSummary & {
  realName: string | null;
  displayName: string;
  visitorRegisteredAt: string | null;
};

export function registrationHref(returnTo: string): string {
  const target = memberAuthPageInput({ returnTo }).returnTo;
  const destination = target.split(/[?#]/)[0] === "/adventure/register" ? "/adventure?progression=member" : target;
  return `/adventure/register?${new URLSearchParams({ returnTo: destination })}`;
}

export function parseRegistrationSummary(input: unknown): RegistrationSummary {
  if (!input || typeof input !== "object") throw new Error("INVALID_REGISTRATION");
  const value = input as Record<string, unknown>;
  const adventurer = value.status === "ADVENTURER";
  const source = value.registrationSource === undefined ? adventurer ? "WEB" : null : value.registrationSource;
  if (value.status !== "VISITOR" && !adventurer || typeof value.profileCompleted !== "boolean"
    || value.startingLevel !== (adventurer ? 1 : 0)
    || (source !== null && source !== "WEB" && source !== "DISCORD_BOT")
    || (adventurer ? source === null || !value.profileCompleted && source !== "DISCORD_BOT" || typeof value.adventurerRegisteredAt !== "string" || !Number.isFinite(Date.parse(value.adventurerRegisteredAt)) : source !== null || value.adventurerRegisteredAt !== null)) throw new Error("INVALID_REGISTRATION");
  return { status: value.status as RegistrationSummary["status"], profileCompleted: value.profileCompleted, adventurerRegisteredAt: value.adventurerRegisteredAt as string | null, startingLevel: value.startingLevel as 0 | 1, registrationSource: source as RegistrationSummary["registrationSource"] };
}

export function parseAdventurerRegistration(input: unknown): AdventurerRegistration {
  const summary = parseRegistrationSummary(input);
  const value = input as Record<string, unknown>;
  if (typeof value.displayName !== "string" || value.displayName.length > 120
    || value.realName !== null && (typeof value.realName !== "string" || value.realName.length > 120)
    || summary.registrationSource === "DISCORD_BOT" && !summary.profileCompleted && value.realName !== null
    || (summary.profileCompleted ? typeof value.realName !== "string" || !value.realName.trim() || typeof value.visitorRegisteredAt !== "string" || !Number.isFinite(Date.parse(value.visitorRegisteredAt)) : value.visitorRegisteredAt !== null)) throw new Error("INVALID_REGISTRATION");
  return { ...summary, realName: value.realName as string | null, displayName: value.displayName, visitorRegisteredAt: value.visitorRegisteredAt as string | null };
}
