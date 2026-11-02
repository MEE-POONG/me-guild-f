# Me Guild — public frontend

Frontend ชุมชนอยู่ในโปรเจกต์นี้และรันแยกจาก `me-guild-b` ที่เป็น Office/API
อย่าคัดลอก Prisma, database URL, Discord client secret, bot token หรือ Office auth มาไว้ที่นี่
API browser ใช้เส้นทางเดิมผ่าน narrow server transport ใน `lib/backend-proxy.ts`
คงการตรวจสิทธิ์/สมาชิก/ผลรางวัลใน B และคง `/adventure/*` เพื่อรองรับ links/OAuth
งานประชาสัมพันธ์ใช้ Anime.js และ react-parallax-tilt; Three.js จำกัดเฉพาะเครื่อง Garapon

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
