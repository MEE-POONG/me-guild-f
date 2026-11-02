export type CommunityKind = "GAME" | "LEARNING" | "INTEREST";

export type CommunitySpace = {
  id: string;
  name: string;
  kind: CommunityKind;
  gameName?: string;
};

export const threadCategories = [
  "พูดคุย",
  "อีเวนต์",
  "โค้ดแลกของ",
  "ช่วยเพื่อน",
  "แบ่งปันความรู้",
  "ถามตอบ",
] as const;

export type ThreadCategory = (typeof threadCategories)[number];

export type CommunityReply = {
  id: string;
  author: string;
  body: string;
};

export type CommunityThread = {
  id: string;
  spaceId: string;
  category: ThreadCategory;
  title: string;
  body: string;
  author: string;
  replies: CommunityReply[];
  createdAt: string;
  eventTitle?: string;
  eventId?: string;
  redeemCode?: {
    code: string;
    reward: string;
    expiresAt: string;
    sourceLabel: string;
  };
  resolved: boolean;
};

export type RewardPrize = {
  kind: "ROLE" | "ITEM" | "BADGE";
  label: string;
  quantity: number;
};

export type RewardCampaign = {
  id: string;
  title: string;
  serverName: string;
  status: "OPEN" | "UPCOMING" | "CLOSED";
  closesAt: string;
  prizes: RewardPrize[];
};

export type KnowledgeTrack = {
  id: string;
  title: string;
  description: string;
  threadId: string;
};

// Public fixtures only. Names, events, codes and prizes do not describe live records.
export const communities: CommunitySpace[] = [
  { id: "genshin", name: "นักเดินทางแห่ง Teyvat", kind: "GAME", gameName: "Genshin Impact" },
  { id: "valorant", name: "ปาร์ตี้หลังเลิกงาน", kind: "GAME", gameName: "VALORANT" },
  { id: "minecraft", name: "หมู่บ้านนักสร้าง", kind: "GAME", gameName: "Minecraft" },
  { id: "knowledge", name: "หอความรู้", kind: "LEARNING" },
];

export const communityThreads: CommunityThread[] = [
  {
    id: "genshin-moonlight-event",
    spaceId: "genshin",
    category: "อีเวนต์",
    title: "ชวนออกเดินทาง เก็บภาพความทรงจำใต้แสงจันทร์",
    body: "กระทู้ตัวอย่างสำหรับชวนเพื่อนถ่ายภาพในเกม เลือกมุมโปรดหนึ่งแห่ง แล้วเล่าเรื่องสั้น ๆ ว่าเหตุใดจึงอยากพาสหายมาที่นี่\n\nชื่อกิจกรรมและกำหนดการในหน้านี้สร้างขึ้นเพื่อทดลองเว็บ ไม่ใช่ประกาศอีเวนต์ทางการของเกม และยังไม่มีการรับสมัครจริง",
    author: "นักเดินทางตัวอย่าง",
    replies: [
      { id: "moonlight-reply-1", author: "สหายใต้แสงดาว", body: "อยากเริ่มจากจุดชมวิวที่เดินทางถึงง่าย จะได้ชวนเพื่อนใหม่ไปด้วยกัน" },
    ],
    createdAt: "2026-10-27T09:00:00+07:00",
    eventTitle: "ทริปภาพถ่ายใต้แสงจันทร์ · กิจกรรมตัวอย่าง",
    resolved: false,
  },
  {
    id: "genshin-demo-code",
    spaceId: "genshin",
    category: "โค้ดแลกของ",
    title: "ตัวอย่างกระดานรวมโค้ด: ตรวจแหล่งที่มาก่อนแลก",
    body: "พื้นที่นี้สาธิตการแสดงโค้ด รางวัล และวันหมดอายุในกระทู้เดียว โค้ด DEMO-TRAVELER-2026 ใช้งานจริงไม่ได้ และไม่ได้ตรวจสอบกับผู้ให้บริการเกม\n\nเมื่อเชื่อมข้อมูลจริง ควรแนบแหล่งประกาศทางการและเวลาที่ตรวจสอบล่าสุดเสมอ ไม่ขอรหัสผ่านหรือรหัสยืนยันตัวตนในกระทู้",
    author: "ผู้ดูแลกระดานตัวอย่าง",
    replies: [],
    createdAt: "2026-10-27T08:30:00+07:00",
    redeemCode: {
      code: "DEMO-TRAVELER-2026",
      reward: "กล่องเสบียงนักเดินทาง · ของรางวัลสมมติ",
      expiresAt: "2026-10-31T23:59:00+07:00",
      sourceLabel: "ข้อมูลสาธิต · ไม่ใช่โค้ดทางการ · แลกจริงไม่ได้",
    },
    resolved: false,
  },
  {
    id: "genshin-help-party",
    spaceId: "genshin",
    category: "ช่วยเพื่อน",
    title: "เพิ่งเริ่มเดินทาง อยากหาสหายช่วยจัดทีม",
    body: "ลองใช้กระทู้ช่วยเพื่อนเพื่อบอกเป้าหมาย เวลาเล่น และสิ่งที่อยากให้ช่วย โดยไม่ต้องเปิดเผยข้อมูลบัญชี\n\nคำขอนี้เป็นตัวอย่าง ยังไม่มีผู้เล่นรอรับความช่วยเหลือจริง เล่าแนวทางที่เข้าใจง่าย และเปิดพื้นที่ให้เจ้าของกระทู้ถามต่อได้",
    author: "ผู้กล้ามือใหม่",
    replies: [
      { id: "party-help-reply-1", author: "เพื่อนร่วมทางตัวอย่าง", body: "เริ่มจากบอกตัวละครที่ชอบเล่นและจุดที่ติดขัด แล้วค่อยช่วยกันดูทีละส่วนก็ได้" },
    ],
    createdAt: "2026-10-26T20:00:00+07:00",
    resolved: false,
  },
  {
    id: "valorant-find-party",
    spaceId: "valorant",
    category: "พูดคุย",
    title: "หลังเลิกงาน แวะมาหาปาร์ตี้ที่เล่นสบายใจ",
    body: "พื้นที่นัดเพื่อนเล่นเกมควรบอกช่วงเวลา รูปแบบที่อยากเล่น และบรรยากาศของปาร์ตี้ให้ชัด ชวนกันเล่นด้วยภาษาที่สุภาพ และยอมรับจังหวะการเรียนรู้ของแต่ละคน\n\nนี่คือกระทู้ตัวอย่าง ไม่มีปาร์ตี้จริงหรือห้องเสียงที่เชื่อมต่ออยู่",
    author: "ผู้เฝ้าลานฝึก",
    replies: [],
    createdAt: "2026-10-26T18:00:00+07:00",
    resolved: false,
  },
  {
    id: "valorant-aim-help",
    spaceId: "valorant",
    category: "ช่วยเพื่อน",
    title: "แบ่งเวลาซ้อมอย่างไรให้ไม่ล้าเกินไป",
    body: "ตัวอย่างกระทู้ช่วยเพื่อนที่เจ้าของเรื่องทำเครื่องหมายว่าได้รับคำตอบแล้ว เริ่มจากตั้งเป้าหมายเล็ก ๆ ที่เหมาะกับเวลา และหยุดพักเมื่อรู้สึกเหนื่อย\n\nสถานะตอบแล้วใช้สาธิตหน้าจอ ยังไม่มีประวัติการแก้ปัญหาจากสมาชิกจริง",
    author: "นักฝึกตัวอย่าง",
    replies: [
      { id: "aim-help-reply-1", author: "สหายลานฝึก", body: "ลองจดว่ารอบนี้อยากฝึกอะไรเพียงหนึ่งอย่าง แล้วค่อยทบทวนหลังเล่น จะช่วยให้คุยกันได้ตรงประเด็นขึ้น" },
    ],
    createdAt: "2026-10-25T19:00:00+07:00",
    resolved: true,
  },
  {
    id: "minecraft-first-base",
    spaceId: "minecraft",
    category: "แบ่งปันความรู้",
    title: "บันทึกนักสร้าง: เริ่มวางแผนฐานหลังแรก",
    body: "ก่อนสร้าง ลองร่างพื้นที่เก็บของ จุดพัก และทางเข้าออกไว้บนกระดาษ เลือกขนาดที่ทำต่อได้จริง แล้วค่อยเพิ่มรายละเอียดไปทีละส่วน\n\nใช้กระทู้นี้เป็นตัวอย่างบทความสั้น สมาชิกสามารถแลกแบบร่าง ตั้งคำถาม และแบ่งปันวิธีคิดของตัวเองได้เมื่อเชื่อมระบบจริง",
    author: "นักสร้างตัวอย่าง",
    replies: [
      { id: "first-base-reply-1", author: "ผู้จดแผนที่", body: "ชอบแนวคิดเริ่มจากพื้นที่เล็ก ๆ จะได้ปรับแบบตามสิ่งที่ใช้จริงระหว่างเล่น" },
    ],
    createdAt: "2026-10-25T14:00:00+07:00",
    resolved: false,
  },
  {
    id: "knowledge-web-basics",
    spaceId: "knowledge",
    category: "แบ่งปันความรู้",
    title: "จากหน้าเว็บหนึ่งหน้า สู่ชุมชนที่หลายคนใช้งานร่วมกัน",
    body: "เริ่มจากแยกหน้าที่สามส่วน: หน้าเว็บรับการกระทำของผู้ใช้ เซิร์ฟเวอร์ตรวจตัวตนและสิทธิ์ แล้วฐานข้อมูลเก็บสิ่งที่ต้องใช้ร่วมกัน\n\nหน้าตัวอย่างช่วยทดลองคำและลำดับการใช้งาน แต่ปุ่มเข้าร่วมกิลด์หรือส่งคำตอบจะเป็นข้อมูลจริงได้ต่อเมื่อมีการตรวจสิทธิ์และบันทึกฝั่งเซิร์ฟเวอร์ ลองวาดเส้นทางของคำขอหนึ่งครั้ง แล้วถามเพื่อนว่าส่วนใดควรรับผิดชอบอะไร",
    author: "บรรณารักษ์ตัวอย่าง",
    replies: [],
    createdAt: "2026-10-27T10:00:00+07:00",
    resolved: false,
  },
  {
    id: "knowledge-ask-first",
    spaceId: "knowledge",
    category: "ถามตอบ",
    title: "ถามอย่างไร ให้เพื่อนช่วยต่อได้ง่ายขึ้น",
    body: "บอกสิ่งที่อยากทำ สิ่งที่ลองแล้ว และผลที่เกิดขึ้น หากแนบตัวอย่าง ให้ตัดข้อมูลส่วนตัว รหัสผ่าน และโทเคนออกก่อน\n\nไม่จำเป็นต้องใช้คำศัพท์ยาก การเล่าเป็นลำดับพร้อมตัวอย่างเล็ก ๆ ทำให้คนจากหลายพื้นฐานเข้ามาแลกเปลี่ยนกันได้ กระทู้นี้เป็นเนื้อหาสาธิตสำหรับหอความรู้",
    author: "ผู้มาเยือนหอความรู้",
    replies: [
      { id: "ask-first-reply-1", author: "สหายหอสมุด", body: "ถ้าถามเรื่องโค้ด เพิ่มข้อความผิดพลาดและขั้นตอนที่ทำให้เกิดอาการด้วย จะช่วยให้ทดลองตามได้ง่ายขึ้น" },
    ],
    createdAt: "2026-10-26T11:00:00+07:00",
    resolved: true,
  },
];

export const rewardCampaigns: RewardCampaign[] = [
  {
    id: "moonlight-demo-raffle",
    title: "ตั๋วนำโชคแห่งจันทรา · รอบตัวอย่าง",
    serverName: "Me Guild · เซิร์ฟเวอร์สาธิต",
    status: "OPEN",
    closesAt: "2026-10-31T23:59:00+07:00",
    prizes: [
      { kind: "ROLE", label: "ยศผู้เฝ้าแสงจันทร์ · ตัวอย่าง", quantity: 1 },
      { kind: "ITEM", label: "กล่องสัมภาระนักเดินทาง · ตัวอย่าง", quantity: 3 },
      { kind: "BADGE", label: "ตราสหายร่วมทาง · ตัวอย่าง", quantity: 5 },
    ],
  },
  {
    id: "next-chapter-demo-raffle",
    title: "เรื่องราวบทใหม่ · รอบตัวอย่างถัดไป",
    serverName: "Me Guild · เซิร์ฟเวอร์สาธิต",
    status: "UPCOMING",
    closesAt: "2026-11-07T23:59:00+07:00",
    prizes: [
      { kind: "ITEM", label: "สมุดบันทึกแห่งดวงดาว · ตัวอย่าง", quantity: 2 },
      { kind: "BADGE", label: "ตรานักสำรวจหน้าใหม่ · ตัวอย่าง", quantity: 5 },
    ],
  },
  {
    id: "campfire-demo-raffle",
    title: "สหายข้างกองไฟ · รอบตัวอย่างที่ผ่านมา",
    serverName: "Me Guild · เซิร์ฟเวอร์สาธิต",
    status: "CLOSED",
    closesAt: "2026-10-25T23:59:00+07:00",
    prizes: [
      { kind: "ROLE", label: "ยศผู้เล่าเรื่องข้างกองไฟ · ตัวอย่าง", quantity: 1 },
    ],
  },
];

export const knowledgeTracks: KnowledgeTrack[] = [
  {
    id: "build-and-share",
    title: "เรียนรู้ผ่านการสร้าง",
    description: "เริ่มจากแบบร่างเล็ก ๆ แล้วแบ่งวิธีคิดให้เพื่อนลองต่อ",
    threadId: "minecraft-first-base",
  },
  {
    id: "web-community-foundations",
    title: "ก้าวแรกของเว็บชุมชน",
    description: "แยกหน้าเว็บ เซิร์ฟเวอร์ และข้อมูล ก่อนต่อยอดความคิดให้ใช้ร่วมกัน",
    threadId: "knowledge-web-basics",
  },
  {
    id: "questions-that-help",
    title: "ตั้งคำถาม แลกคำตอบ",
    description: "เล่าสิ่งที่ลองแล้ว พร้อมตัวอย่างที่เพื่อนช่วยทบทวนได้",
    threadId: "knowledge-ask-first",
  },
];
