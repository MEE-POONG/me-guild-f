# กระเป๋าองค์กร

หน้า /wallets จัดการกระเป๋ากิลด์และ Discord server ผ่านบัญชี Discord ที่เชื่อมไว้ แสดงเฉพาะองค์กรที่ผู้ใช้มีสิทธิ์จัดการ และรองรับโอนสนับสนุนองค์กรที่ทราบ ID จากบัญชีส่วนตัว

รองรับโอน ME Coin (ไม่มีค่าธรรมเนียม), ซื้อแพ็กเกจราคาปัจจุบัน, ประวัติแบบแบ่งหน้า, มติกรรมการ 72 ชั่วโมง และคำขอปิดบัญชีที่รอฝ่ายการเงิน มีหน้าตรวจผู้รับ/ราคาและเก็บรหัสรายการใน sessionStorage เพื่อส่งรายการเดิมซ้ำเมื่อไม่ทราบผล

ตั้ง ME_GUILD_BOT_API_URL เป็น HTTPS origin และ COMMUNITY_MEMBER_SECRET ให้ตรงกับบอท อย่างน้อย 32 อักขระ ไม่ส่ง secret ไปเบราว์เซอร์ ต้องตั้ง NEXTAUTH_URL ให้ตรง public origin

บอทตรวจสิทธิ์ปัจจุบันทุกครั้ง: กิลด์ใช้เจ้าของ/ผู้ร่วมก่อตั้ง/กรรมการ เซิร์ฟเวอร์ใช้เจ้าของ/Discord Administrator สิทธิ์ Office อย่างเดียวไม่อนุญาตอ่านยอดหรือใช้เงิน

รายละเอียด rollout และ financial invariants อยู่ใน me-coin-back/docs/organization-wallets.md; การสร้างบัญชีเดิมที่ยังไม่มีเป็นงาน reconciliation ของบอท ไม่มีการเพิ่มยอดตั้งต้นในเว็บ


หน้ากระเป๋าใช้ Noto Sans Thai โทนฟ้า–คอรัล การ์ดสีขาว และปุ่มทรงมน โดยอ้างอิงทิศทางภาพจาก https://friendzoneth.me-prompt-technology.com/ บนมือถือจัดเป็นคอลัมน์เดียวและเลื่อนตารางประวัติภายในกรอบได้

คอมโพเนนต์และ CSS ของหน้ากระเป๋าตรงกันในทั้งสามเว็บ หากแก้พฤติกรรมการยืนยัน/ลองรายการเดิม ต้องปรับให้ตรงกันทุกสำเนา โดยรักษารหัสรายการเดิมเมื่อไม่ทราบผลชำระเงิน

## Wallet dropdowns

Recipients, support destinations, service servers and committee members can be selected by name. Searches support bounded results, retry and additional organization pages. Personal suggestions are restricted to the selected organization and require fresh manager authorization; an exact Discord ID remains available for outside recipients. Organization suggestions contain only names and identifiers of active provisioned wallets. No balances, history, email or phone numbers are returned. Recipient and authority checks still run before mutation, with the existing confirmation and operation-key recovery.

## ซื้อเหรียญเข้ากระเป๋าองค์กร

เลือกกระเป๋ากิลด์หรือ Discord server แล้วกด “เลือกแพ็กเกจและซื้อเหรียญ” เพื่อเปิด ME Coin พร้อมกระเป๋าปลายทางเดิม หน้าซื้อเหรียญมี dropdown บัญชีส่วนตัว/องค์กรที่จัดการได้ แสดงชื่อปลายทาง ราคา และจำนวนเหรียญก่อนชำระ รองรับ PromptPay/บัตรผ่าน Checkout และยอด THB ที่มีอยู่ ผู้ซื้อต้องเข้าสู่บัญชี ME Coin และเชื่อม Discord ก่อนซื้อเข้าองค์กร หากไม่พบสิทธิ์หรือปลายทางไม่พร้อม ระบบจะไม่เปลี่ยนไปเติมบัญชีส่วนตัวเอง

Discord ใช้ `/org-wallet action:buy-coins` หรือปุ่มซื้อเหรียญในหน้าดูยอด เหรียญเข้าบัญชีองค์กรโดยตรงหลังยืนยันชำระ ฝั่งเซิร์ฟเวอร์ตรวจสิทธิ์ปัจจุบัน ราคา และสถานะกระเป๋าอีกครั้ง รายการซื้อเก็บผู้ชำระและองค์กรปลายทางแยกกัน ผูกปลายทางกับรหัสรายการเดิม การคืนเงิน/ข้อโต้แย้งปรับยอดของกระเป๋าปลายทางเดิม การปิดบัญชีต้องรอรายการซื้อเหรียญที่ยังไม่สิ้นสุด
