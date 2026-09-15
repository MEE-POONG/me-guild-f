"use client";
import { useEffect, useState } from "react";
import { getProviders, signIn } from "next-auth/react";
import { LoaderCircle } from "@/components/icons";
import { FaDiscord, FaGoogle } from "react-icons/fa6";
export function ProviderButtons({ callbackUrl = "/member", googleLabel = "Continue with Google", discordLabel = "Continue with Discord" }: { callbackUrl?: string; googleLabel?: string; discordLabel?: string }) {
  const [loading, setLoading] = useState<"google" | "discord" | null>(null);
  const [available, setAvailable] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    void getProviders()
      .then((providers) => {
        if (!cancelled) setAvailable(Object.keys(providers ?? {}));
      })
      .catch(() => {
        if (!cancelled) setError("โหลดช่องทางเข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่");
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const connect = async (provider: "google" | "discord") => {
    setLoading(provider);
    setError("");
    try {
      const result = await signIn(provider, { callbackUrl, redirect: false });
      if (result?.error) {
        setError("เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่");
        return;
      }
      if (result?.url) window.location.assign(result.url);
    } catch {
      setError("เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setLoading(null);
    }
  };
  return <div className="grid gap-3">
    <button
      type="button"
      onClick={() => connect("google")}
      disabled={loading !== null || !ready || !available.includes("google")}
      title={ready && available.includes("google") ? undefined : "Google ยังไม่พร้อมใช้งาน"}
      className="flex min-h-14 items-center justify-center gap-3 rounded-xl bg-white px-5 font-semibold text-[#17191f] transition hover:bg-[#f0f0ed] disabled:cursor-wait disabled:opacity-65"
    >
      {!ready ? <LoaderCircle className="size-5 animate-spin" /> : loading === "google" ? <LoaderCircle className="size-5 animate-spin" /> : <FaGoogle className="size-5 text-[#4285F4]" />}
      {googleLabel}
    </button>
    <button
      type="button"
      onClick={() => connect("discord")}
      disabled={loading !== null || !ready || !available.includes("discord")}
      title={ready && available.includes("discord") ? undefined : "Discord ยังไม่พร้อมใช้งาน"}
      className="flex min-h-14 items-center justify-center gap-3 rounded-xl bg-[#5865f2] px-5 font-semibold text-white transition hover:bg-[#6874f5] disabled:cursor-wait disabled:opacity-65"
    >
      {!ready ? <LoaderCircle className="size-5 animate-spin" /> : loading === "discord" ? <LoaderCircle className="size-5 animate-spin" /> : <FaDiscord className="size-5 text-[#ffffff]" />}
      {discordLabel}
    </button>
    {error && <p role="alert" className="text-sm text-red-200">{error}</p>}
  </div>;
}

