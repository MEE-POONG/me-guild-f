"use client";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
export function SignOutButton({ label = "Sign out" }: { label?: string }) { return <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="grid size-11 place-items-center rounded-xl border border-white/10 bg-white/4 text-white/45 transition hover:border-red-300/30 hover:text-red-200" aria-label={label} title={label}><LogOut size={18} /></button>; }
