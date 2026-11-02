# Me Guild — เว็บชุมชน

โปรเจกต์หน้าเว็บสาธารณะ แยกจาก `D:/web/me-guild/me-guild-b` แล้ว รัน ติดตั้ง dependency และ build ได้ด้วยตัวเอง ไม่มี symlink หรือ import ข้าม checkout

| ส่วน | โปรเจกต์ | Local URL |
| --- | --- | --- |
| เว็บชุมชน/ผจญภัย/โครงการ/ชิงโชค/ตัวอย่างเครื่อง 3D | `me-guild-f` | http://localhost:3000 |
| Office, API, member OAuth, Prisma, ตั๋ว และการจัดการรางวัล | `me-guild-b` | http://localhost:3002 |
| Discord และงานจับ/ส่งรางวัล | `me-guild-bot` | ใช้ระบบเดิม |

## รันในเครื่อง

```powershell
cd D:\web\me-guild\me-guild-f
npm.cmd ci
if (!(Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm.cmd run dev
```

เปิด http://localhost:3000 เพื่อดูหน้าบ้านก่อนเข้าสู่ระบบ ส่วน API ที่อ่านข้อมูลจริงและ Discord login ต้องให้ `me-guild-b` รันอยู่ด้วย:

```powershell
cd D:\web\me-guild\me-guild-b
npm.cmd run dev
```

`.env.local` ที่เตรียมไว้ในเครื่องมีเฉพาะ URL สามตัว ไม่มีการคัดลอกกุญแจหรือข้อมูลลับจาก B

## หน้าบ้านและบัญชีสมาชิก — 1 พฤศจิกายน 2026

- `/` เป็นหน้าแนะนำ Me Guild: ชุมชน กิจกรรม/ตั๋วนำโชค คลังอาชีพและทักษะ ตลาด วิธีเริ่มต้น และ FAQ โดยไม่เรียกข้อมูลส่วนตัวหรือใช้ข่าว/ยอดสมาชิกสาธิตเป็นข้อมูลจริง
- `/login` และ `/register` ใช้ Discord OAuth เดิมของ B; การยืนยันครั้งแรกสร้างบัญชีสมาชิก ส่วนบัญชีเดิมเข้าสู่บัญชีที่มีอยู่ ไม่มีระบบรหัสผ่านใหม่ใน F
- หน้าใหม่กลับไป `/adventure?progression=member` โดยปริยาย; พารามิเตอร์ `returnTo` ต้องผ่าน allowlist และคงอยู่เมื่อสลับ Login/Register
- `/adventure/login` ยังคงเป็นปลายทาง OAuth error และ signout เดิม โดยใช้หน้าตาเดียวกันและเก็บค่าเริ่มต้นไป `/adventure/raffles`
- รองรับ loading, สถานะบริการไม่พร้อม/ลองใหม่, OAuth error, บัญชีปัจจุบัน และ pending ระหว่างยืนยันตัวตน
- หน้าประชาสัมพันธ์ใช้ Anime.js สำหรับ reveal และ react-parallax-tilt บนภาพ เคารพ reduced motion และปิด tilt บนอุปกรณ์สัมผัส; เนื้อหาหน้าบ้านแสดงได้ตั้งแต่ server render
- ภาพใช้งานจริงอยู่ใน `public/adventure/`; ภาพคอนเซปต์และหลักฐานตรวจหน้าจอเก็บภายนอก repository

ตรวจผ่าน tests 37 รายการ, TypeScript, ESLint และ production build พร้อม browser desktop/mobile ของหน้าบ้านและหน้าบัญชี การทดสอบ transport ใช้ fixture; ยังไม่ยืนยัน OAuth บัญชีจริงจนจบ และการเปลี่ยนแปลงนี้ยังไม่ deploy

## เส้นทาง

- `/adventure` — ชุมชน กระเป๋า สเตตัส LV ความสำเร็จ และพื้นที่กิลด์
- `/adventure/login` — ประตู Discord ของสมาชิก อ่านสถานะผ่าน B
- `/adventure/raffles` — รายการหลายกิจกรรมและส่งตั๋วตามสิทธิ์ที่ B ตรวจ
- `/adventure/headquarters` และ `/adventure/projects/[slug]` — โครงการศูนย์กลาง/โครงการที่เผยแพร่
- `/adventure/raffles/stage-demo` — เครื่องหมุน Three.js ด้วยรายชื่อสมมติ ไม่ใช้ตั๋วจริง
- `/adventure/raffles/stage/[id]` — ส่งไปเวทีจริงใน Office B ซึ่งยังตรวจ session/สิทธิ์ทีมงานตามเดิม

ลิงก์สาธารณะ `/adventure/*` บน B ส่งต่อมา F พร้อม path/query เดิม ยกเว้นเวทีจริงของทีมงาน ไฟล์ UI ต้นฉบับใน B ยังเก็บไว้เป็นหลักฐานของการแยกรอบนี้ งานต่อไปของหน้าเว็บสาธารณะให้แก้ใน F

## เชื่อมต่อ API และ Discord

F ใช้ Route Handler `/api/adventure/[...path]` ส่งต่อเฉพาะ endpoint และ method ที่ระบุใน `lib/backend-proxy.ts` ไม่เปิด proxy ของ Office/API อื่น ตัว bridge ส่งเฉพาะ member cookies รวมถึง cookie chunks, รักษา Set-Cookie แยกแต่ละรายการ, เก็บ Origin เดิม, ไม่ส่ง Office cookies/Authorization/forwarded-host จาก browser และไม่ cache ข้อมูลสมาชิก

B ยังคงตรวจ identity/link/version, Discord membership, สิทธิ์, ยอดตั๋ว และผลกิจกรรมทั้งหมด F ไม่มี Prisma และไม่รับ database URL, Discord client secret, bot token หรือ NextAuth secret

ตั้งค่า B ให้ตรงกับ origin ของ F:

```dotenv
ME_GUILD_FRONTEND_URL=http://localhost:3000
```

Member Discord callback ที่ต้องอนุญาตใน Discord Developer Portal เปลี่ยนเป็น:

```text
http://localhost:3000/api/adventure/member-auth/callback/discord
```

Callback ของ Office และ `NEXTAUTH_URL` ของ B ยังคงใช้ origin ของ Office แยกกัน ไม่เปลี่ยนเป็น F และไม่ใช้ wildcard Origin

## กระเป๋าและตลาด — 30 ตุลาคม 2026

ปุ่ม `จัดประมูล` จากบริการชุมชน Discord ใช้ `/adventure/marketplace?guildId=<id>&view=auctions&compose=auction` เพื่อเปิดแท็บและแบบฟอร์มประมูล เก็บปลายทางเดิมหลังล็อกอิน ปุ่ม/ลิงก์แลกเปลี่ยนใช้ `view=trades` ได้เช่นกัน รับเฉพาะค่าที่กำหนดและไม่ส่ง `view`/`compose` เข้า API การเปิดหน้าไม่มีการสร้างรายการหรือใช้ copper

`/adventure/marketplace` มีสามส่วน: กระเป๋าไอเทมของสมาชิก, แลกเปลี่ยนแบบวางของ/ล็อก/ยืนยันสองฝ่าย และลานประมูล ลิงก์ `?guildId=…&auction=…` คงอยู่หลัง Discord login การทำรายการผ่าน narrow proxy GET/POST `/api/adventure/marketplace`; B ตรวจตัวตน สิทธิ์ การกันของ และธุรกรรมทั้งหมด F ไม่มีข้อมูลรับรองของฐานข้อมูลหรือกระเป๋า

ทุกไม้เพิ่มราคา 1 copper และค่าธรรมเนียม 1 copper ผู้ชนะได้ค่าการยกไม้ของตนคืน ผู้ขายได้ราคาปิด ค่าของผู้แพ้เข้ากระเป๋าธุรกิจของเซิร์ฟเวอร์เจ้าภาพ B เชื่อม API ธุรกิจแบบกันเงินของ ME Coin และจะไม่ใช้ช่องทางโอนเงินส่วนตัวแทน API นี้

รายการใหม่เป็น **รอผู้ลงนาม ME Coin** โดยพักไอเทมและยังไม่ประกาศใน Discord การ์ดแสดงรหัสรอบ บัญชีธุรกิจ ผู้ขาย ราคาเริ่มต้น และเวลาปิด พร้อมลิงก์ไป `/wallet/business/<id>` ผู้ลงนามต้องเข้าสู่ระบบ ME Coin ตรวจข้อมูล กำหนดเพดานราคา/จำนวนไม้ และอนุมัติรอบนั้น จากนั้นกลับมากดตรวจสิทธิ์เพื่อเปิดประมูล ลิงก์กรอกข้อมูลเท่านั้น ไม่ใช่สิทธิ์อนุมัติ สามารถตั้ง `NEXT_PUBLIC_ME_COIN_PORTAL_ORIGIN` เป็น origin ของ ME Coin สำหรับแต่ละ environment ได้ โดยไม่มี secret ใน F

การใช้งานจริงต้องติดตั้ง ME Coin API รุ่นที่รองรับ ตั้ง integration scopes และให้เจ้าของเซิร์ฟเวอร์สมัคร/เชื่อม Discord ก่อนลงทะเบียนผ่านบอตหรือ Server Manager ซอร์สและการทดสอบรอบนี้ไม่ได้ deploy หรือทำธุรกรรมจริง

UI แสดงยอดที่จะจ่ายก่อนยืนยัน ล็อกฟอร์มหลังพักไอเทม และใช้ request ID เดิมเมื่อไม่ทราบผลจากการเชื่อมต่อ ภาพทดสอบอยู่ภายนอก repository; browser ธุรกรรมใช้ mock response เท่านั้น ยังไม่ยืนยัน OAuth สองบัญชี ธุรกรรมฐานข้อมูล หรือการจ่ายเงินจริง ดู `me-guild-b/docs/updates/2026-10-30-marketplace.md` และ `2026-10-30-business-wallet-registration.md` สำหรับส่วน backend/rollout

## Build และตรวจงาน

```powershell
npm.cmd run test
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd start
```

Next.js สร้าง standalone output ใน `.next/standalone`; postbuild แนบ `public/` และ `.next/static/` ให้อัตโนมัติ และ `npm.cmd start` เรียก standalone server ตามรูปแบบที่ Next.js รองรับ พอร์ตเริ่มต้น3000 เปลี่ยนด้วย environment `PORT` ได้

Production ตั้ง URL ทั้งสามอย่างชัดเจนผ่าน environment ของ F: `ME_GUILD_BACKEND_URL` (B ภายในหรือ public), `ME_GUILD_FRONTEND_URL` (HTTPS ของเว็บชุมชน), `ME_GUILD_OFFICE_URL` (HTTPS ของ Office) และตั้ง `ME_GUILD_FRONTEND_URL` บน B ให้ตรงกัน พร้อมเพิ่ม HTTPS member callback ใน Discord Developer Portal ก่อนใช้งานจริง

ไม่มี DB migration หรือการสร้างผลรางวัลใหม่จากการแยกโปรเจกต์นี้

## ทักษะชีวิตและ Lv — 28 ตุลาคม 2026

เพิ่มคลังสาธารณะ `/adventure/skills/library` เปิดอ่านโดยไม่ล็อกอิน: 28 อาชีพ / 128 ทักษะรวมฐานเดิม / 1,152 บททดสอบปฏิบัติ G–SS พร้อมเลือกอาชีพและเปิดข้อสอบรายใบ ข้อมูลนี้เป็นเกณฑ์ตั้งต้นจาก B ไม่ใช่คะแนนหรือประวัติสมาชิก ผลสอบจริงแสดงใน `/adventure/skills` และบันทึกผ่าน Office พร้อมหลักฐานและ revision

หน้าสมาชิก `/adventure/skills` อ่านผลประเมินของเจ้าของบัญชีผ่าน GET `/api/adventure/skills` บน B แสดง Lv 0–999, คลาส SS–G, หมวด/ทักษะปลายกิ่งที่มีเพดานต่างกัน และประวัติการประเมินล่าสุด พร้อมค้นหาและกรองคลาส

Lv หลักใน Hub ใช้ผลทักษะชีวิตจริง ส่วน EXP กิจกรรมเดิมแสดงในชื่อ “การเติบโตชุมชน” ไม่มีการใช้คะแนนตัวอย่างแทนข้อมูลทักษะจริง ผู้ที่ยังไม่เข้าสู่ระบบเห็นลิงก์ Discord login กลับหน้าทักษะ ส่วนบริการไม่พร้อมให้ลองใหม่โดยแสดง Lv ว่าง

สูตรและเกณฑ์คำนวณอยู่ใน B; หลังบ้านจัดการที่ `/members/skills` ของ Office F ไม่เปิดการประเมินหรือแก้คะแนน และ proxy ไม่อนุญาต POST บนเส้นทางทักษะ ดูรายละเอียดเจ้าของข้อมูลใน `me-guild-b/docs/updates/2026-10-28-real-life-skills.md`

ตรวจ F production build/TypeScript/ESLint, transport tests15/15 และ browser desktop/mobile390ผ่าน โดย browserส่วนข้อมูลสมาชิกใช้ mock response ไม่ใช่การเขียนคะแนนจริง

## ผลตรวจการแยก — 28 ตุลาคม 2026

F ผ่าน production build, typecheck, lint (0 warnings), bridge tests 13/13 และ npm audit 0 vulnerabilities; B ผ่าน typecheck/lint และ regression tests 167/167

ตรวจ production standalone server ชั่วคราวที่3003แล้ว: home/demo/ภาพ/CSS200 และไฟล์ env404 ก่อนปิดเซิร์ฟเวอร์ทดสอบ โดย postbuild แนบ assets และ start ใช้ standalone entry ที่ถูกต้อง

ตรวจผ่าน IAB บนพอร์ต3000 จริงทั้ง desktop/mobile รวมภาพ สเตตัส โครงการและหน้า Discord/ชิงโชค; demo เครื่อง 3D พบ Canvas/three-ready และเปิดชื่อสมมติได้ถูกคู่ ลิงก์เก่าบน B ส่งต่อ F, เวทีจริงส่งกลับ Office และยังติด session guard

Initial CSRF/signin ผ่าน F→B แล้วคืน Discord authorize URL ที่มี callback F, state/PKCE และ member Set-Cookie 3 รายการถูกต้อง โดยไม่ตามไปยืนยันบัญชีที่ Discord ยังไม่ได้ตรวจ Portal allowlist, ล็อกอิน/ส่งตั๋ว/จับผลจริง, Mongo writer หรือ remote deployment
