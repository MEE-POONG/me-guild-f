import type { SiteLocale } from "@/lib/preferences";

type IconText = { title: string; body: string };
type PartyText = { title: string; time: string; tags: [string, string] };

export type HomeCopy = {
  home: string;
  menu: string;
  nav: [string, string, string, string];
  login: string;
  openHub: string;
  joinCommunity: string;
  profileStudio: string;
  season: string;
  hero: [string, string, string, string];
  intro: string;
  findPlayers: string;
  browseParties: string;
  trust: [string, string, string];
  commandSubtitle: string;
  partyReadiness: string;
  partyMembersAria: string;
  startIn: string;
  teamAverage: string;
  discordRoom: string;
  joinParty: string;
  newMessages: string;
  wins: string;
  thisWeek: string;
  stats: [string, string, string, string];
  loopHeading: [string, string];
  loopDescription: string;
  loop: [IconText, IconText, IconText, IconText];
  partyHeading: [string, string];
  viewAll: string;
  parties: [PartyText, PartyText, PartyText];
  open: string;
  members: string;
  time: string;
  requestJoin: string;
  guildHeading: [string, string];
  guildDescription: string;
  guildMembers: [string, string, string];
  guildOpen: [string, string, string];
  eventDescription: string;
  registerTeam: string;
  eventMeta: [[string, string], [string, string], [string, string]];
  ctaHeading: [string, string];
  ctaDescription: string;
  createProfile: string;
  footer: string;
};

export const homeCopy: Record<SiteLocale, HomeCopy> = {
  th: {
    home: "หน้าหลัก Me Guild", menu: "เปิดเมนู", nav: ["หาปาร์ตี้", "กิลด์", "กิจกรรม", "ความก้าวหน้า"], login: "เข้าสู่ระบบ", openHub: "เปิด Member Hub", joinCommunity: "เข้าร่วมคอมมูนิตี้", profileStudio: "แต่งโปรไฟล์",
    season: "ซีซัน 01 • เปิดแล้ว", hero: ["หา", "ทีมของคุณ", "สร้าง", "ตำนาน"], intro: "พื้นที่กลางของเกมเมอร์สำหรับหาเพื่อน สร้างปาร์ตี้ เข้ากิลด์ และเปลี่ยนทุกแมตช์ให้เป็นความก้าวหน้าของคุณ", findPlayers: "เริ่มหาเพื่อนเล่น", browseParties: "สำรวจปาร์ตี้สด", trust: ["โปรไฟล์ยืนยันตัวตน", "เชื่อมต่อ Discord", "เก็บผลงานทุกแมตช์"],
    commandSubtitle: "ค้นหาทีมที่เข้ากับคุณ", partyReadiness: "ความพร้อมของปาร์ตี้", partyMembersAria: "สมาชิกปาร์ตี้ 4 จาก 5 คน", startIn: "อีกประมาณ 8 นาที", teamAverage: "ค่าเฉลี่ยทีม D2", discordRoom: "Discord • ห้อง #12", joinParty: "เข้าร่วมปาร์ตี้", newMessages: "ข้อความใหม่", wins: "ชัยชนะ 4 ครั้ง", thisWeek: "สัปดาห์นี้", stats: ["สมาชิกพร้อมเล่น", "ปาร์ตี้วันนี้", "กิลด์เปิดรับ", "กิจกรรมเดือนนี้"],
    loopHeading: ["ทุกเกมมีความหมาย", "เมื่อเราเล่นไปด้วยกัน"], loopDescription: "Me Guild เชื่อมทุกกิจกรรมให้เป็นเส้นทางเดียว ตั้งแต่เจอคนใหม่ ไปจนถึงสร้างโปรไฟล์ที่เล่าเรื่องคุณได้จริง", loop: [{title:"ค้นพบผู้คน",body:"เจอเพื่อนร่วมทีมที่เกม แรงก์ และเวลาเล่นตรงกับคุณ"},{title:"เล่นด้วยกัน",body:"สร้างปาร์ตี้ เชื่อม Discord และเริ่มเล่นได้ในไม่กี่คลิก"},{title:"รับผลงาน",body:"เก็บ Achievement รีวิว และประวัติการเล่นไว้ในโปรไฟล์เดียว"},{title:"เติบโตไปด้วยกัน",body:"ปลดล็อกสิทธิ์ เข้าร่วมกิลด์ และต่อยอดสู่กิจกรรมใหม่"}],
    partyHeading: ["พร้อมเล่นแล้ว", "ขาดแค่คุณ"], viewAll: "ดูปาร์ตี้ทั้งหมด", parties: [{title:"ไต่แรงก์ก่อนเที่ยงคืน",time:"เริ่มใน 8 นาที",tags:["จริงจัง","มีไมค์"]},{title:"ทีมชิลแต่เอาแต้ม",time:"เริ่มทันที",tags:["เป็นมิตร","18+"]},{title:"ล่ามังกรรอบดึก",time:"21:30 น.",tags:["มือใหม่ได้","Discord"]}], open:"เปิด", members:"สมาชิก", time:"เวลา", requestJoin:"ขอเข้าร่วม",
    guildHeading: ["มากกว่าทีม", "นี่คือกิลด์ของคุณ"], guildDescription: "ค้นหาคอมมูนิตี้ที่เข้ากับสไตล์การเล่น เติบโตผ่านภารกิจ และสร้างตำนานของกลุ่มไปด้วยกัน", guildMembers:["284 สมาชิก","196 สมาชิก","351 สมาชิก"], guildOpen:["รับเพิ่ม 12 คน","เปิดรับทุกระดับ","รับสายซัพพอร์ต"],
    eventDescription:"การแข่งขันระหว่างกิลด์ประจำซีซัน รวม 16 ทีม 4 เกม และรางวัลพิเศษสำหรับทีมที่ทำงานร่วมกันได้ดีที่สุด", registerTeam:"ลงทะเบียนทีม", eventMeta:[["วันแข่งขัน","14–16 ก.ย."],["รูปแบบ","5 คน / ทีม"],["เงินรางวัล","50K MeCoin"]], ctaHeading:["ปาร์ตี้ถัดไป","กำลังรอคุณอยู่"], ctaDescription:"เข้าสู่ระบบด้วย Google หรือ Discord เลือกเกมที่คุณชอบ แล้วให้ Me Guild พาคุณไปเจอทีมที่ใช่", createProfile:"สร้างโปรไฟล์เกมเมอร์", footer:"ค้นพบผู้คน • เล่นด้วยกัน • สร้างตำนาน",
  },
  zh: {
    home:"Me Guild 首页",menu:"打开菜单",nav:["寻找队伍","公会","活动","成长"],login:"登录",openHub:"打开会员中心",joinCommunity:"加入社区",profileStudio:"装扮主页",
    season:"第 01 赛季 • 现已开启",hero:["寻找", "你的队伍", "创造", "传奇"],intro:"属于玩家的聚集地：认识伙伴、组建队伍、加入公会，让每场对局都成为你的成长记录。",findPlayers:"开始寻找队友",browseParties:"查看实时队伍",trust:["认证玩家主页","连接 Discord","记录每场成就"],
    commandSubtitle:"寻找适合你的队伍",partyReadiness:"队伍准备度",partyMembersAria:"队伍成员 4/5",startIn:"约 8 分钟后",teamAverage:"队伍平均 D2",discordRoom:"Discord • 房间 #12",joinParty:"加入队伍",newMessages:"条新消息",wins:"本周 4 胜",thisWeek:"本周",stats:["在线玩家","今日队伍","招募中公会","本月活动"],
    loopHeading:["每一场游戏都有意义","因为我们并肩作战"],loopDescription:"Me Guild 将认识伙伴、共同游戏和个人主页串成一条完整的成长路线。",loop:[{title:"认识伙伴",body:"按游戏、段位和在线时间找到合适的队友"},{title:"一起开黑",body:"组建队伍、连接 Discord，几步即可开始"},{title:"收集成就",body:"把成就、评价和对局记录放进同一个主页"},{title:"共同成长",body:"解锁权益、加入公会并参与新的活动"}],
    partyHeading:["队伍已准备好","只差你了"],viewAll:"查看全部队伍",parties:[{title:"午夜前冲分",time:"8 分钟后",tags:["认真上分","有麦"]},{title:"轻松打但要加分",time:"立即开始",tags:["友好","18+"]},{title:"深夜狩猎巨龙",time:"21:30",tags:["欢迎新手","Discord"]}],open:"招募中",members:"成员",time:"时间",requestJoin:"申请加入",
    guildHeading:["不只是队伍","这是你的公会"],guildDescription:"找到契合你玩法的社区，通过任务一起成长，并创造属于团队的传奇。",guildMembers:["284 名成员","196 名成员","351 名成员"],guildOpen:["还可加入 12 人","所有等级均可","招募辅助位"],
    eventDescription:"赛季公会对抗赛：16 支队伍、4 款游戏，并为协作最佳的团队准备特别奖励。",registerTeam:"报名队伍",eventMeta:[["比赛日期","9月14–16日"],["赛制","5 人 / 队"],["奖金","50K MeCoin"]],ctaHeading:["你的下一支队伍","正在等你"],ctaDescription:"使用 Google 或 Discord 登录，选择喜欢的游戏，让 Me Guild 帮你遇见合适的伙伴。",createProfile:"创建玩家主页",footer:"认识伙伴 • 一起游戏 • 创造传奇",
  },
  en: {
    home:"Me Guild home",menu:"Open menu",nav:["Find a party","Guilds","Events","Progress"],login:"Sign in",openHub:"Open Member Hub",joinCommunity:"Join community",profileStudio:"Profile Studio",
    season:"SEASON 01 • NOW LIVE",hero:["Find your", "squad.", "Build a", "legacy."],intro:"A home for players to meet, form parties, join guilds, and turn every match into meaningful progress.",findPlayers:"Find teammates",browseParties:"Explore live parties",trust:["Verified profiles","Discord connected","Every match remembered"],
    commandSubtitle:"Find a team that fits you",partyReadiness:"Party readiness",partyMembersAria:"Party members, 4 of 5",startIn:"In about 8 minutes",teamAverage:"Team average D2",discordRoom:"Discord • Room #12",joinParty:"Join party",newMessages:"new messages",wins:"4 victories",thisWeek:"this week",stats:["Players ready","Parties today","Guilds recruiting","Events this month"],
    loopHeading:["Every game matters","when we play together"],loopDescription:"Me Guild connects discovery, play, and a personal profile into one continuous player journey.",loop:[{title:"Discover people",body:"Match with players who share your game, rank, and schedule"},{title:"Play together",body:"Create a party, connect Discord, and start in a few clicks"},{title:"Earn your story",body:"Keep achievements, reviews, and match history in one profile"},{title:"Grow together",body:"Unlock access, join a guild, and move into new events"}],
    partyHeading:["Ready to play", "just missing you"],viewAll:"View all parties",parties:[{title:"Rank up before midnight",time:"Starts in 8 min",tags:["Focused","Mic on"]},{title:"Chill squad, real points",time:"Start now",tags:["Friendly","18+"]},{title:"Late-night dragon hunt",time:"9:30 PM",tags:["Beginners welcome","Discord"]}],open:"Open",members:"Members",time:"Time",requestJoin:"Request to join",
    guildHeading:["More than a team", "this is your guild"],guildDescription:"Find a community that fits your play style, grow through quests, and build a shared legacy.",guildMembers:["284 members","196 members","351 members"],guildOpen:["12 spots open","All levels welcome","Supports wanted"],
    eventDescription:"A seasonal clash across 16 guild teams and four games, with a special prize for the strongest teamwork.",registerTeam:"Register team",eventMeta:[["Event dates","Sep 14–16"],["Format","5 players / team"],["Prize pool","50K MeCoin"]],ctaHeading:["Your next party","is waiting for you"],ctaDescription:"Sign in with Google or Discord, choose the games you love, and let Me Guild introduce your next squad.",createProfile:"Create gamer profile",footer:"Discover people • Play together • Build a legacy",
  },
  ja: {
    home:"Me Guild ホーム",menu:"メニューを開く",nav:["パーティーを探す","ギルド","イベント","成長記録"],login:"ログイン",openHub:"メンバーハブを開く",joinCommunity:"コミュニティに参加",profileStudio:"プロフィール編集",
    season:"シーズン01 • 開催中",hero:["仲間を", "見つけよう。", "伝説を", "作ろう。"],intro:"仲間探し、パーティー結成、ギルド参加をひとつに。すべてのマッチをあなたの成長記録に変えるプレイヤーの居場所です。",findPlayers:"仲間を探す",browseParties:"ライブパーティーを見る",trust:["認証プロフィール","Discord 連携","全マッチを記録"],
    commandSubtitle:"自分に合うチームを探す",partyReadiness:"パーティー準備度",partyMembersAria:"パーティーメンバー 5人中4人",startIn:"約8分後",teamAverage:"チーム平均 D2",discordRoom:"Discord • ルーム #12",joinParty:"パーティーに参加",newMessages:"件の新着メッセージ",wins:"今週4勝",thisWeek:"今週",stats:["プレイ可能メンバー","本日のパーティー","募集中ギルド","今月のイベント"],
    loopHeading:["すべてのゲームに意味がある", "一緒に遊ぶから"],loopDescription:"Me Guild は出会いからプレイ、あなたらしいプロフィールまでをひとつの成長ルートにつなぎます。",loop:[{title:"仲間と出会う",body:"ゲーム、ランク、プレイ時間が合う仲間を見つける"},{title:"一緒に遊ぶ",body:"パーティーを作り Discord と連携してすぐに開始"},{title:"実績を残す",body:"実績、レビュー、プレイ履歴をひとつのプロフィールへ"},{title:"一緒に成長",body:"特典を開放し、ギルドや新しいイベントへ進む"}],
    partyHeading:["準備はできている", "あとはあなただけ"],viewAll:"すべてのパーティー",parties:[{title:"深夜前のランク上げ",time:"8分後に開始",tags:["真剣","VCあり"]},{title:"気楽にポイント狙い",time:"今すぐ開始",tags:["フレンドリー","18+"]},{title:"深夜のドラゴン狩り",time:"21:30",tags:["初心者歓迎","Discord"]}],open:"募集中",members:"メンバー",time:"時間",requestJoin:"参加を申請",
    guildHeading:["チーム以上の場所", "ここがあなたのギルド"],guildDescription:"プレイスタイルに合うコミュニティを見つけ、クエストを通じて成長し、仲間との伝説を作ろう。",guildMembers:["メンバー 284人","メンバー 196人","メンバー 351人"],guildOpen:["残り12枠","全レベル歓迎","サポート募集中"],
    eventDescription:"16チーム・4ゲームで競うシーズンギルド戦。最高のチームワークには特別賞も用意されています。",registerTeam:"チーム登録",eventMeta:[["開催日","9月14–16日"],["形式","5人 / チーム"],["賞金","50K MeCoin"]],ctaHeading:["次のパーティーが", "あなたを待っている"],ctaDescription:"Google または Discord でログインし、好きなゲームを選べば、Me Guild がぴったりの仲間へつなぎます。",createProfile:"ゲーマープロフィールを作る",footer:"仲間と出会う • 一緒に遊ぶ • 伝説を作る",
  },
};
