"use client";

import { useEffect, useRef, useState } from "react";
import { GiCompass, GiCrossedSwords, GiFeather, GiKnapsack, GiOpenBook, GiScrollUnfurled, GiSparkles } from "react-icons/gi";
import { guilds, inventoryItems, quests, type NewsPost } from "./adventure-data";
import styles from "./adventure-dialogs.module.css";
import { StatusProgression } from "./status-progression";
import type { AdventureProgressionState } from "./use-adventure-progression";

export type AdventurePanel = "status" | "inventory" | "guilds" | "quests" | "settings" | "news" | null;

type AdventureDialogsProps = {
  progression: AdventureProgressionState;
  panel: AdventurePanel;
  onClose: () => void;
  selectedNews: NewsPost | null;
  joinedGuild: string | null;
  onJoinGuild: (id: string) => void;
  acceptedQuests: string[];
  onAcceptQuest: (id: string) => void;
  motionEnabled: boolean;
  onToggleMotion: () => void;
};

const titles: Record<Exclude<AdventurePanel, null>, string> = {
  status: "การเติบโตชุมชน",
  inventory: "กระเป๋าสัมภาระ",
  guilds: "ทำเนียบกิลด์",
  quests: "สมุดภารกิจ",
  settings: "ตั้งค่าการเดินทาง",
  news: "ข่าวสารจากต่างโลก",
};

const itemCategories = ["ทั้งหมด", "อุปกรณ์", "วัตถุดิบ", "ไอเทม"] as const;

export function AdventureDialogs({ progression, panel, onClose, selectedNews, joinedGuild, onJoinGuild, acceptedQuests, onAcceptQuest, motionEnabled, onToggleMotion }: AdventureDialogsProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [itemCategory, setItemCategory] = useState<(typeof itemCategories)[number]>("ทั้งหมด");
  const [selectedItemId, setSelectedItemId] = useState(inventoryItems[0].id);
  const visibleItems = inventoryItems.filter((item) => itemCategory === "ทั้งหมด" || item.kind === itemCategory);
  const selectedItem = visibleItems.find((item) => item.id === selectedItemId) ?? visibleItems[0];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (panel && !dialog.open) dialog.showModal();
    if (!panel && dialog.open) dialog.close();
  }, [panel]);

  return (
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="adventure-dialog-title" onClose={() => { if (panel && !dialogRef.current?.open) onClose(); }}>
      <header className={styles.header}>
        <div className={styles.titleWrap}>
          <GiCompass aria-hidden="true" />
          <h2 id="adventure-dialog-title">{panel ? titles[panel] : "บันทึกนักผจญภัย"}</h2>
        </div>
        <form method="dialog"><button className={styles.close} type="submit" aria-label="ปิดหน้าต่าง" autoFocus>×</button></form>
      </header>

      <div className={styles.content}>
        {panel === "status" ? <StatusProgression progression={progression} motionEnabled={motionEnabled} /> : null}

        {panel === "inventory" ? (
          <>
            <p className={styles.intro}>ทุกชิ้นมีเรื่องเล่า ตรวจสัมภาระก่อนออกเดินทาง</p>
            <div className={styles.tabs} aria-label="ประเภทสัมภาระ">{itemCategories.map((category) => <button type="button" key={category} aria-pressed={itemCategory === category} onClick={() => setItemCategory(category)}>{category}</button>)}</div>
            <div className={styles.inventory}>
              <div className={styles.itemGrid}>{visibleItems.map((item) => <button type="button" key={item.id} className={styles.item} aria-pressed={selectedItem?.id === item.id} onClick={() => setSelectedItemId(item.id)}><span className={styles.itemSymbol} aria-hidden="true">{item.symbol}</span><b>{item.name}</b><small>{item.kind} · {item.quantity} ชิ้น</small></button>)}</div>
              {selectedItem ? <div className={styles.itemDetail} aria-live="polite"><span className={styles.largeSymbol} aria-hidden="true">{selectedItem.symbol}</span><span className={styles.eyebrow}>{selectedItem.rarity} · {selectedItem.kind}</span><h3>{selectedItem.name}</h3><p>{selectedItem.description}</p><span className={styles.quantity}>จำนวนที่ครอบครอง <b>{selectedItem.quantity}</b></span></div> : null}
            </div>
            <p className={styles.note}><GiKnapsack aria-hidden="true" /> สัมภาระตัวอย่าง · ยังไม่มีการใช้หรือแลกเปลี่ยนไอเทม</p>
          </>
        ) : null}

        {panel === "guilds" ? (
          <>
            <p className={styles.intro}>การเดินทางจะพิเศษขึ้น เมื่อมีสหายร่วมทาง</p>
            <div className={styles.guilds}>{guilds.map((guild, index) => {
              const joined = joinedGuild === guild.id;
              const full = guild.members >= guild.capacity;
              const Emblem = index === 1 ? GiCrossedSwords : index === 2 ? GiOpenBook : GiCompass;
              return <article key={guild.id} className={styles.guild}><div className={styles.guildTop}><span className={`${styles.guildEmblem} ${index === 1 ? styles.crimson : index === 2 ? styles.blue : ""}`}><Emblem aria-hidden="true" /></span><div><h3>{guild.name}</h3><p>“{guild.motto}”</p></div></div><div className={styles.guildTags}>{guild.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><div className={styles.guildBottom}><span>กิลด์เลเวล {guild.level} <i>·</i> {guild.members + (joined ? 1 : 0)} / {guild.capacity} นักผจญภัย</span><button className={styles.primary} type="button" disabled={Boolean(joinedGuild) || full} onClick={() => onJoinGuild(guild.id)}>{joined ? "✓ กิลด์ของคุณ" : joinedGuild ? "อยู่กิลด์อื่นแล้ว" : full ? "สมาชิกเต็ม" : "เข้าร่วมกิลด์"}</button></div></article>;
            })}</div>
            <p className={styles.note}>ทดลองเข้าร่วมกิลด์บนเบราว์เซอร์นี้ · ไม่เปลี่ยนสมาชิกหรือบทบาท Discord จริง</p>
          </>
        ) : null}

        {panel === "quests" ? (
          <>
            <p className={styles.intro}>เรื่องราวบทต่อไป เริ่มจากภารกิจเล็ก ๆ ของคุณ</p>
            <div className={styles.questList}>{quests.map((quest) => {
              const accepted = acceptedQuests.includes(quest.id);
              return <article key={quest.id} className={styles.quest}><div className={styles.questIcon}><GiScrollUnfurled aria-hidden="true" /></div><div className={styles.questBody}><h3>{quest.title}</h3><p>{quest.description}</p><div className={styles.questReward}><GiSparkles aria-hidden="true" /> {quest.reward}<span>{accepted ? "กำลังเดินทาง" : "พร้อมรับภารกิจ"}</span></div><button className={styles.primary} type="button" disabled={accepted} onClick={() => onAcceptQuest(quest.id)}>{accepted ? "✓ รับภารกิจแล้ว" : "รับภารกิจ"}</button></div></article>;
            })}</div>
            <p className={styles.note}>ภารกิจตัวอย่าง · บันทึกเฉพาะการทดลองในหน้านี้</p>
          </>
        ) : null}

        {panel === "settings" ? (
          <>
            <p className={styles.intro}>เลือกจังหวะการเดินทางที่สบายสำหรับคุณ</p>
            <div className={styles.setting}><div><h3>แอนิเมชันและมิติของภาพ</h3><p>เปิดเอฟเฟกต์ปรากฏตัวและการเอียงภาพตามเมาส์</p></div><button type="button" className={styles.switch} role="switch" aria-label="แอนิเมชันและมิติของภาพ" aria-checked={motionEnabled} onClick={onToggleMotion}><span /></button></div>
            <p className={styles.note}>ระบบจะเคารพการตั้งค่าลดการเคลื่อนไหวของอุปกรณ์เสมอ</p>
            <div className={styles.demoInfo}><GiCompass aria-hidden="true" /><div><h3>โลกตัวอย่าง Me Guild</h3><p>เลือกดูสเตตัสตัวอย่างหรือสเตตัสสมาชิกของคุณได้ กระเป๋าและภารกิจตัวอย่างใช้ทดลองการเดินทาง</p></div></div>
          </>
        ) : null}

        {panel === "news" && selectedNews ? (
          <article className={styles.news}><div className={styles.newsMeta}><span>{selectedNews.category}</span><time>{selectedNews.date}</time><span>{selectedNews.readTime}</span></div><h3>{selectedNews.title}</h3><p className={styles.newsExcerpt}>{selectedNews.excerpt}</p>{selectedNews.body.split("\n\n").map((paragraph, index) => <p key={index}>{paragraph}</p>)}<div className={styles.newsSignature}><GiFeather aria-hidden="true" /> จากผู้ดูแลกระดานข่าว Me Guild</div></article>
        ) : null}
      </div>
    </dialog>
  );
}
