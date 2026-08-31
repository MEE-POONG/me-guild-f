"use client";

import Image from "next/image";
import dayRetreat from "@/public/images/guild-retreat-day.png";
import nightRetreat from "@/public/images/guild-retreat-night.png";
import { useAppPreferences } from "@/components/app-preferences-provider";
import styles from "@/app/home.module.css";

export function GuildRetreatImage() {
  const { colorMode } = useAppPreferences();

  return (
    <Image
      key={colorMode}
      src={colorMode === "dark" ? nightRetreat : dayRetreat}
      alt=""
      fill
      sizes="(max-width: 900px) 100vw, 72vw"
      loading="eager"
      fetchPriority="high"
      placeholder="blur"
      className={styles.heroArtwork}
    />
  );
}
