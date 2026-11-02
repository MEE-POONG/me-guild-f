import Image from "next/image";
import Link from "next/link";
import { FaDiscord } from "react-icons/fa";
import { FiCalendar, FiChevronDown, FiPackage, FiUsers } from "react-icons/fi";
import { GiSprout } from "react-icons/gi";
import { Arrow, Compass, GuildBrand } from "./guild-brand";
import { GuildTilt, Motion } from "./motion";
import styles from "./public-home.module.css";

const activitiesUrl = "/login?returnTo=%2Fadventure%2Fraffles";
const marketplaceUrl = "/login?returnTo=%2Fadventure%2Fmarketplace";
const features = [
  { title: "กิจกรรมและตั๋วนำโชค", description: "สะสมตั๋วจากกิจกรรมใน Discord แล้วเลือกเข้าร่วมกิจกรรมชิงโชคตามเงื่อนไขที่เปิดรับ", label: "ดูกิจกรรม", href: activitiesUrl, note: "เข้าสู่ระบบเพื่อดูสิทธิ์ของคุณ" },
  { title: "คลังอาชีพและทักษะ", description: "ค้นหาอาชีพที่สนใจ สำรวจทักษะชีวิตและบททดสอบปฏิบัติ แล้ววางเส้นทางการเติบโตของตัวเอง", label: "เปิดคลังทักษะ", href: "/adventure/skills/library", note: "เปิดอ่านได้โดยไม่ต้องสมัคร" },
  { title: "กระเป๋าและตลาด", description: "จัดการไอเทมของคุณ สำรวจการแลกเปลี่ยนและรายการประมูลกับเพื่อนร่วมชุมชน", label: "สำรวจตลาด", href: marketplaceUrl, note: "เข้าสู่ระบบเพื่อใช้งาน" },
];
const steps = [
  { title: "สมัครด้วย Discord", description: "ยืนยันด้วยบัญชี Discord ของคุณ เพื่อสร้างบัญชีสมาชิกในครั้งแรก", icon: FaDiscord },
  { title: "ทำความรู้จักกิลด์", description: "สำรวจชุมชน อ่านเรื่องที่สนใจ และค้นหามุมที่เป็นตัวคุณ", icon: FiUsers },
  { title: "เลือกการผจญภัยของคุณ", description: "เรียนรู้ทักษะใหม่ ร่วมกิจกรรม หรือเริ่มทำสิ่งที่ชอบไปด้วยกัน", icon: Compass },
];
const questions = [
  { title: "ต้องมีบัญชี Discord ไหม?", answer: "การสมัครสมาชิกและเข้าสู่ระบบใช้บัญชี Discord ที่ยืนยันอีเมลแล้ว เมื่อยืนยันตัวตนสำเร็จครั้งแรก ระบบจะสร้างบัญชีสมาชิกให้คุณ โดยใช้บัญชีเดียวกับที่ใช้ในชุมชน" },
  { title: "ยังไม่สมัคร สำรวจอะไรได้บ้าง?", answer: "คุณอ่านข้อมูลแนะนำกิลด์และเปิดคลังอาชีพ ทักษะ และบททดสอบปฏิบัติได้ก่อนสมัคร ส่วนตั๋วของคุณ ผลประเมินทักษะ กระเป๋า และตลาด ต้องเข้าสู่ระบบเพื่อยืนยันตัวตนและสิทธิ์สมาชิก" },
  { title: "สมัครแล้วได้รับตั๋วนำโชคเลยไหม?", answer: "การสมัครหรือเข้าสู่ระบบไม่ได้มอบหรือใช้ตั๋วโดยอัตโนมัติ ตั๋วมาจากกิจกรรมใน Discord และการเข้าร่วมชิงโชคเป็นไปตามเงื่อนไขของแต่ละกิจกรรม" },
];

function Ornament() {
  return <div className={styles.ornament} aria-hidden="true"><span /><Compass /><span /></div>;
}

export function PublicHome() {
  return <Motion className={styles.page}>
    <a href="#main-content" className={styles.skipLink}>ข้ามไปยังเนื้อหา</a>
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <GuildBrand />
        <nav className={styles.navigation} aria-label="เมนูหลัก">
          <a href="#discover">สำรวจกิลด์</a><a href="#getting-started">เริ่มต้นอย่างไร</a><a href="#faq">คำถามที่พบบ่อย</a>
        </nav>
        <div className={styles.accountLinks}><Link href="/login" prefetch={false}>เข้าสู่ระบบ</Link><Link href="/register" prefetch={false} className={styles.button}>สมัครสมาชิก</Link></div>
      </div>
    </header>

    <main id="main-content">
      <section className={styles.hero} aria-labelledby="home-title">
        <div className={styles.heroScene}><Image src="/adventure/kingdom.webp" alt="" fill sizes="100vw" loading="eager" fetchPriority="high" className={styles.heroImage} /></div>
        <div className={styles.heroInner}>
          <div className={styles.heroCopy} data-reveal>
            <h1 id="home-title">ทุกการผจญภัย<br /><span>เริ่มต้นที่คนข้าง ๆ</span></h1>
            <p>พื้นที่ของคนรักเกม หนังสือ คอสเพลย์ และการเรียนรู้<br className={styles.desktopBreak} /> มาพบเพื่อน ทำสิ่งที่ชอบ และเติบโตไปด้วยกันใน Me Guild</p>
            <div className={styles.heroActions}><Link href="/register" prefetch={false} className={styles.button}>เริ่มต้นการผจญภัย <Arrow /></Link><a href="#discover" className={styles.outlineButton}>สำรวจกิลด์</a></div>
            <p className={styles.heroNote}><FaDiscord aria-hidden="true" /> เริ่มต้นด้วยบัญชี Discord ของคุณ</p>
          </div>
        </div>
      </section>

      <nav className={styles.interestStrip} aria-label="ค้นหาสิ่งที่สนใจ">
        <a href="#discover"><FiUsers aria-hidden="true" /><span>พบเพื่อนร่วมกิลด์</span></a>
        <Link href={activitiesUrl} prefetch={false}><FiCalendar aria-hidden="true" /><span>ร่วมกิจกรรม</span></Link>
        <Link href="/adventure/skills/library" prefetch={false}><GiSprout aria-hidden="true" /><span>พัฒนาทักษะ</span></Link>
        <Link href={marketplaceUrl} prefetch={false}><FiPackage aria-hidden="true" /><span>แลกเปลี่ยนไอเทม</span></Link>
      </nav>

      <section id="discover" className={styles.discover} aria-labelledby="discover-title">
        <div className={styles.sectionHeading} data-reveal><Ornament /><h2 id="discover-title">มีกิลด์แล้ว ชีวิตสนุกขึ้นยังไง</h2><p>เลือกมุมที่ใช่ แล้วค่อย ๆ รู้จักเพื่อนร่วมทาง</p></div>
        <div className={styles.discoverGrid}>
          <div className={styles.community} data-reveal>
            <GuildTilt className={styles.communityFrame}><Image src="/adventure/guild-welcome.webp" alt="นักผจญภัยพบปะกันในลานกิลด์ ภาพประกอบโลกของ Me Guild" width={1122} height={1402} sizes="(max-width: 760px) 90vw, 46vw" className={styles.communityImage} /></GuildTilt>
            <h3>ชุมชนที่มีที่ให้คุณเสมอ</h3>
            <p>เพื่อนคุยเกม หนังสือ คอสเพลย์ และไอเดียใหม่ ๆ</p>
            <Link href="/adventure?community=guild" prefetch={false} className={styles.textLink}>ทำความรู้จักชุมชน <Arrow /></Link>
          </div>
          <div className={styles.features}>
            {features.map((feature, index) => <article className={styles.feature} key={feature.title} data-reveal>
              <span className={styles.number} aria-hidden="true">0{index + 1}</span>
              <div><h3>{feature.title}</h3><p>{feature.description}</p><Link href={feature.href} prefetch={false} className={styles.textLink}>{feature.label} <Arrow /></Link><small>{feature.note}</small></div>
            </article>)}
          </div>
        </div>
      </section>

      <section id="getting-started" className={styles.startSection} aria-labelledby="start-title">
        <div className={styles.startInner}>
          <div className={styles.sectionHeading} data-reveal><Ornament /><h2 id="start-title">เริ่มต้นง่าย ๆ แล้วพบกันในกิลด์</h2></div>
          <ol className={styles.steps}>
            {steps.map((step, index) => <li key={step.title} data-reveal><span className={styles.stepIcon}><step.icon aria-hidden="true" /></span><div><span className={styles.stepNumber}>0{index + 1}</span><h3>{step.title}</h3><p>{step.description}</p></div></li>)}
          </ol>
          <Link href="/register" prefetch={false} className={styles.lightButton}>สมัครสมาชิกด้วย Discord <Arrow /></Link>
        </div>
      </section>

      <section id="faq" className={styles.faq} aria-labelledby="faq-title">
        <div className={styles.sectionHeading} data-reveal><Ornament /><h2 id="faq-title">ก่อนออกเดินทาง</h2></div>
        <div className={styles.questions}>{questions.map((question) => <details key={question.title} className={styles.question}><summary>{question.title}<FiChevronDown aria-hidden="true" /></summary><p>{question.answer}</p></details>)}</div>
      </section>
    </main>

    <footer className={styles.footer}><div><GuildBrand /><p>พื้นที่ของคนรักเกมและการเรียนรู้</p></div><nav aria-label="ท้ายเว็บไซต์"><Link href="/">หน้าหลัก</Link><Link href="/register" prefetch={false}>สมัครสมาชิก</Link><Link href="/login" prefetch={false}>เข้าสู่ระบบ</Link></nav></footer>
  </Motion>;
}
