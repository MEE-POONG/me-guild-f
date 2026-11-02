export type NewsCategory = "ประกาศ" | "กิจกรรม" | "อัปเดต";

export type NewsPost = {
  id: string;
  title: string;
  category: NewsCategory;
  date: string;
  readTime: string;
  excerpt: string;
  body: string;
};

export type Guild = {
  id: string;
  name: string;
  motto: string;
  members: number;
  capacity: number;
  level: number;
  tags: string[];
};

export type InventoryItem = {
  id: string;
  name: string;
  kind: "อุปกรณ์" | "วัตถุดิบ" | "ไอเทม";
  rarity: string;
  description: string;
  quantity: number;
  symbol: string;
};

export type Quest = {
  id: string;
  title: string;
  description: string;
  reward: string;
  progress: number;
  target: number;
};

// Illustrative content for the public /adventure prototype; not live community records.
export const newsPosts: NewsPost[] = [
  {
    id: "moonlit-festival",
    title: "ค่ำคืนแห่งจันทรา เริ่มต้นขึ้นแล้ว",
    category: "กิจกรรม",
    date: "27 ต.ค. 2569",
    readTime: "อ่าน 2 นาที",
    excerpt: "จุดโคมไฟ พบเพื่อนร่วมทาง แล้วออกสำรวจป่าใต้แสงจันทร์ไปด้วยกัน",
    body: "เมื่อแสงจันทร์แตะยอดหอคอย ลานกลางเมืองจะเปิดรับเหล่านักผจญภัย มารวมกลุ่ม เล่าเรื่องระหว่างทาง และฝากคำอธิษฐานไว้กับโคมไฟหนึ่งดวง\n\nในโลกตัวอย่างนี้ กิจกรรมมีไว้ให้ทดลองอ่านข่าวสาร ยังไม่มีการเปิดรับสมัครหรือแจกของรางวัลจริง เตรียมกระเป๋าให้พร้อม แล้วพบกันในเรื่องราวบทต่อไป",
  },
  {
    id: "new-adventurers",
    title: "ถึงนักผจญภัยหน้าใหม่แห่ง Me Guild",
    category: "ประกาศ",
    date: "26 ต.ค. 2569",
    readTime: "อ่าน 3 นาที",
    excerpt: "เริ่มจากเช็คสเตตัส เปิดกระเป๋า แล้วตามหากิลด์ที่อยากร่วมเดินทาง",
    body: "ยินดีต้อนรับสู่จุดพักของนักผจญภัย เปิดหน้าสเตตัสเพื่อรู้จักตัวละครของคุณ แล้วตรวจดูสัมภาระก่อนออกเดินทาง\n\nกระดานข่าวคือที่ติดตามเรื่องราวของเมือง ส่วนโถงกิลด์คือจุดเริ่มต้นของมิตรภาพ เลือกจังหวะการผจญภัยที่เหมาะกับคุณ และเคารพเพื่อนร่วมทางทุกคน",
  },
  {
    id: "guild-recruitment",
    title: "โถงกิลด์เปิดประตูต้อนรับสหาย",
    category: "ประกาศ",
    date: "25 ต.ค. 2569",
    readTime: "อ่าน 2 นาที",
    excerpt: "จะชอบสำรวจ ลงดันเจียน หรือพักคุยข้างกองไฟ ก็มีที่ว่างสำหรับคุณ",
    body: "เลือกกิลด์จากบรรยากาศและกิจกรรมที่คุณสนใจ อ่านคำขวัญของแต่ละกิลด์ แล้วลองเข้าร่วมเพื่อดูหน้าตาหลังเป็นสมาชิก\n\nการเข้าร่วมในหน้านี้เป็นการทดลองบนเบราว์เซอร์เท่านั้น ไม่ส่งคำขอไปยังหัวหน้ากิลด์ ไม่เปลี่ยนบทบาท Discord และไม่ใช้ข้อมูลสมาชิกจริง",
  },
  {
    id: "adventure-journal",
    title: "สมุดบันทึกการเดินทาง บทที่ 01",
    category: "อัปเดต",
    date: "24 ต.ค. 2569",
    readTime: "อ่าน 2 นาที",
    excerpt: "รวมสเตตัส สัมภาระ และภารกิจไว้ใกล้มือ ก่อนเริ่มเรื่องราวบทใหม่",
    body: "เปิดกระเป๋าเพื่อดูอุปกรณ์ วัตถุดิบ และไอเทม หรือเปิดสเตตัสเพื่อดูเลเวล ค่าประสบการณ์ และทองของตัวละครตัวอย่าง\n\nเปิดสเตตัสเพื่อดูเลเวล ฉายา และเส้นทางการเติบโต ตัวอย่างเริ่มจากบันทึกกิจกรรมสมมติ ส่วนสเตตัสสมาชิกจริงอ่านจากความสำเร็จที่เซิร์ฟเวอร์ยืนยัน",
  },
  {
    id: "campfire-party",
    title: "ชวนตั้งปาร์ตี้ พักคุยรอบกองไฟ",
    category: "กิจกรรม",
    date: "23 ต.ค. 2569",
    readTime: "อ่าน 1 นาที",
    excerpt: "วางดาบสักครู่ นั่งข้างกองไฟ แล้วแลกเรื่องเล่าจากโลกที่คุณจากมา",
    body: "การผจญภัยไม่จำเป็นต้องวิ่งไปข้างหน้าตลอดเวลา ลองชวนสหายมาเล่าเรื่องเกม อนิเมะ หรือสิ่งเล็ก ๆ ที่พบเจอระหว่างวัน\n\nโพสต์นี้เป็นตัวอย่างเนื้อหากิจกรรมสำหรับกระดานข่าว ยังไม่มีห้องสนทนาหรือปาร์ตี้จริงที่เชื่อมต่อจากหน้านี้",
  },
];

export const guilds: Guild[] = [
  {
    id: "starlight",
    name: "Starlight Covenant",
    motto: "ตราบที่ยังมีดาว เราจะไม่หลงทาง",
    members: 42,
    capacity: 50,
    level: 8,
    tags: ["สำรวจโลก", "คุยอนิเมะ", "รับมือใหม่"],
  },
  {
    id: "crimson",
    name: "Crimson Vanguard",
    motto: "ยืนเคียงข้างกัน จนถึงดันเจียนสุดท้าย",
    members: 36,
    capacity: 40,
    level: 10,
    tags: ["ลงดันเจียน", "หาปาร์ตี้", "เล่นช่วงค่ำ"],
  },
  {
    id: "moonleaf",
    name: "Moonleaf Society",
    motto: "พักที่ร่มไม้ แล้วค่อยออกเดินทาง",
    members: 24,
    capacity: 40,
    level: 6,
    tags: ["สบาย ๆ", "สร้างสรรค์", "คุยข้างกองไฟ"],
  },
];

export const inventoryItems: InventoryItem[] = [
  {
    id: "traveler-sword",
    name: "ดาบแห่งผู้เดินทาง",
    kind: "อุปกรณ์",
    rarity: "หายาก",
    description: "ดาบคู่ใจที่ผ่านเส้นทางมานับไม่ถ้วน พร้อมสำหรับการเดินทางครั้งใหม่",
    quantity: 1,
    symbol: "⚔️",
  },
  {
    id: "moon-crystal",
    name: "ผลึกแสงจันทร์",
    kind: "วัตถุดิบ",
    rarity: "พิเศษ",
    description: "ผลึกสีฟ้าที่เก็บแสงจันทร์ไว้ภายใน ใช้เป็นวัตถุดิบในโลกตัวอย่าง",
    quantity: 8,
    symbol: "💎",
  },
  {
    id: "healing-potion",
    name: "ยาฟื้นพลังขนาดเล็ก",
    kind: "ไอเทม",
    rarity: "ทั่วไป",
    description: "ขวดยาสีแดงสำหรับพกติดกระเป๋า ยังไม่เปิดระบบใช้ไอเทมในหน้านี้",
    quantity: 5,
    symbol: "🧪",
  },
  {
    id: "travel-journal",
    name: "สมุดบันทึกการผจญภัย",
    kind: "ไอเทม",
    rarity: "ทั่วไป",
    description: "เก็บแผนที่ เรื่องเล่า และความทรงจำจากเพื่อนร่วมทาง",
    quantity: 1,
    symbol: "📖",
  },
];

export const quests: Quest[] = [
  {
    id: "read-the-board",
    title: "เสียงเรียกจากกระดานข่าว",
    description: "อ่านเรื่องราวล่าสุดของเมือง เพื่อเตรียมตัวก่อนออกเดินทาง",
    reward: "รู้จักเรื่องราวของเมือง · ตัวอย่าง",
    progress: 0,
    target: 1,
  },
  {
    id: "find-a-guild",
    title: "ตามหาสหายร่วมทาง",
    description: "สำรวจโถงกิลด์ แล้วเลือกกลุ่มที่อยากร่วมผจญภัย",
    reward: "พบสหายร่วมทาง · ตัวอย่าง",
    progress: 0,
    target: 1,
  },
  {
    id: "check-your-bag",
    title: "สัมภาระพร้อม ใจพร้อม",
    description: "เปิดกระเป๋า ตรวจดูไอเทมที่มี แล้วเตรียมตัวสำหรับบทต่อไป",
    reward: "เตรียมตัวออกเดินทาง · ตัวอย่าง",
    progress: 0,
    target: 1,
  },
];
