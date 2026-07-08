/**
 * Sample/site content for the landing pages.
 *
 * This is the single source of the copy that the Astro components render — the
 * live pages import it, and `scripts/build-design-cards.mjs` reuses the same
 * objects as representative sample props when generating the design cards. Edit
 * copy here; edit *markup* in `src/components/*.astro`.
 */
import { withBase } from "../lib/url";
import type { LandingNavLink } from "../lib/nav";

/** A Hebrew/English string pair (Hebrew is rendered; English drives the toggle). */
export interface Bilingual {
  he: string;
  en: string;
}

// Gradient tokens reused across pillar cards.
export const gradOrange = "linear-gradient(90deg,#ff8b3d,#ffc247)";
export const gradBlue = "linear-gradient(90deg,#2ba3e3,#58c8ec)";
export const gradWarm = "linear-gradient(90deg,#ffc247,#ff8b3d,#2ba3e3)";

// ---- Home ------------------------------------------------------------------

export const homeNavLinks: LandingNavLink[] = [
  { href: "#impact", label: "השפעה", en: "Impact" },
  { href: "#pillars", label: "תחומי פעולה", en: "Pillars" },
  { href: "#journey", label: "המסע", en: "Journey" },
  { href: withBase("/instagram/"), label: "אינסטגרם", en: "Instagram" },
  { href: withBase("/podcasts/"), label: "פודקאסטים", en: "Podcasts" },
  { href: "#contact", label: "צור קשר", en: "Contact" },
];

export interface HeroCta extends Bilingual {
  href: string;
}

export const hero = {
  kicker: { he: "אהבת חינם · כאן ועכשיו", en: "Senseless Love · Here & Now" },
  title: { he: "אהבת חינם, כאן ועכשיו.", en: "Senseless Love, Here and Now." },
  bio: {
    he: "אני ליעד שפירא — מנהיגת נוער בת 15 שהופכת מעשים טובים קטנים לתנועה ארצית. מבמת הכנסת ועד בתי אבות וכיתות, אני מאמינה שאהבת חינם יכולה לרפא את מה ששנאת חינם פירקה.",
    en: "I'm Liad Shapira — a 15-year-old youth leader turning everyday kindness into a national movement. From the Knesset podium to nursing homes and classrooms, I believe senseless love can heal what senseless hatred once tore apart.",
  },
  primaryCta: { he: "הצטרפו לאתגר המעשים הטובים", en: "Join the Good Deeds Challenge", href: "#contact" } as HeroCta,
  secondaryCta: { he: "גלו את תחומי הפעולה", en: "Explore the pillars", href: "#pillars" } as HeroCta,
  portrait: withBase("/assets/liad/header-avatar.jpeg"),
};

export interface Stat {
  target: number;
  suffix: string;
  label: Bilingual;
  sub: Bilingual;
}

export const impact = {
  heading: { he: "המספרים מאחורי התנועה", en: "The numbers behind the movement" },
  sub: { he: "מה שמתחיל בלב אחד, מגיע לאלפים.", en: "What begins in one heart reaches thousands." },
  stats: [
    { target: 15, suffix: "", label: { he: "שנים", en: "Years old" }, sub: { he: "הגיל הוא כוח העל שלי", en: "Age is my superpower" } },
    { target: 1, suffix: "", label: { he: "פרס ארצי", en: "National award" }, sub: { he: "אות שבט 2024", en: "Ot Shavot 2024" } },
    { target: 1000, suffix: "+", label: { he: "מעשים טובים", en: "Good deeds" }, sub: { he: "ההשפעה של הפרויקט", en: "Project impact" } },
    { target: 2, suffix: "", label: { he: "בתי אבות מאומצים", en: "Adopted nursing homes" }, sub: { he: "עבודת שטח שורשית", en: "Grassroots work" } },
  ] as Stat[],
};

export interface Pillar {
  icon: string;
  grad: string;
  title: Bilingual;
  body: Bilingual;
  tags: Bilingual[];
}

export const pillars = {
  heading: { he: "שלושה עמודי פעולה", en: "Three pillars of action" },
  sub: { he: "כל יוזמה נולדה משאלה פשוטה: איך אפשר לעזור עוד?", en: "Every initiative was born from one simple question: how can we help more?" },
  items: [
    {
      icon: "🕊️",
      grad: gradOrange,
      title: { he: "אתגר המעשים הטובים", en: "The Good Deeds Challenge" },
      body: {
        he: "הפיכת תשעה באב מיום של שנאת חינם ליום של אהבת חינם — יום שלם של מעשים טובים, בגיבוי עיריית רמת גן.",
        en: "Reclaiming Tisha B'Av — turning a day of senseless hatred into a full day of senseless love and kindness, backed by the Ramat Gan municipality.",
      },
      tags: [
        { he: "תשעה באב", en: "Tisha B'Av" },
        { he: "רמת גן", en: "Ramat Gan" },
        { he: "יוזמה ארצית", en: "National" },
      ],
    },
    {
      icon: "🤝",
      grad: gradBlue,
      title: { he: "נגד בריונות · למען הכלה", en: "Anti-Bullying & Inclusion" },
      body: {
        he: "שותפות עם 'ים של חברים' במאבק בביוש ברשת ובהשמעת קולם של 'הילדים הבלתי נראים' שאיש לא שם לב אליהם.",
        en: "A partnership with 'Yam Shel Chaverim' fighting online shaming and amplifying the voices of the 'invisible children' no one notices.",
      },
      tags: [
        { he: "ים של חברים", en: "Yam Shel Chaverim" },
        { he: "אנטי-בריונות", en: "Anti-bullying" },
        { he: "הכלה", en: "Inclusion" },
      ],
    },
    {
      icon: "🌷",
      grad: gradWarm,
      title: { he: "קהילה וחוסן", en: "Community & Resilience" },
      body: {
        he: "עיצוב שיער לנערות בת-מצווה במצוקה, אימוץ בתי אבות, והובלת חוסן נפשי לבני נוער בתקופת המלחמה.",
        en: "Styling hair for underprivileged Bat Mitzvah girls, adopting elderly nursing homes, and leading youth resilience during wartime.",
      },
      tags: [
        { he: "בת מצווה", en: "Bat Mitzvah" },
        { he: "בתי אבות", en: "Nursing homes" },
        { he: "חוסן", en: "Resilience" },
      ],
    },
  ] as Pillar[],
};

export interface Milestone {
  when: Bilingual;
  title: Bilingual;
  body: Bilingual;
}

export const journey = {
  heading: { he: "המסע — מגיל 8½ ועד הכנסת", en: "The journey — from age 8½ to the Knesset" },
  sub: { he: "כל שנה, עוד צעד של טוב.", en: "Every year, another step of good." },
  milestones: [
    { when: { he: "גיל 8½", en: "Age 8½" }, title: { he: "הניצוץ הראשון", en: "The first spark" }, body: { he: "התחלתי לארגן מעשים טובים קטנים בשכונה — הרגע שבו הבנתי שאפשר לרתום אנשים לטוב.", en: "I began organizing small good deeds in my neighborhood — the moment I realized people can be rallied toward good." } },
    { when: { he: "2021", en: "2021" }, title: { he: "אימוץ בית האבות הראשון", en: "First nursing home adopted" }, body: { he: "התחלתי לבקר קשישים באופן קבוע ולהביא אליהם נוער — בית שני, משפחה נוספת.", en: "Started visiting the elderly regularly and bringing youth along — a second home, another family." } },
    { when: { he: "2022", en: "2022" }, title: { he: "יופי לכל נערה", en: "Beauty for every girl" }, body: { he: "יוזמת עיצוב שיער לנערות בת-מצווה במצוקה, שכל אחת תרגיש נסיכה ביום שלה.", en: "Launched hair-styling for underprivileged Bat Mitzvah girls, so each one feels like royalty on her day." } },
    { when: { he: "2023", en: "2023" }, title: { he: "ים של חברים", en: "Yam Shel Chaverim" }, body: { he: "שותפות במאבק בביוש ברשת ובהשמעת קולם של הילדים שנשארים מאחור.", en: "Partnered in the fight against online shaming and gave voice to the children left behind." } },
    { when: { he: "2024", en: "2024" }, title: { he: "אתגר המעשים הטובים · אות שבט", en: "Good Deeds Challenge · Ot Shavot" }, body: { he: "השקת האתגר הארצי בתשעה באב בגיבוי עיריית רמת גן, והובלת חוסן נוער במלחמה — והוענק לי אות שבט 2024.", en: "Launched the national challenge on Tisha B'Av backed by Ramat Gan, led youth resilience during the war — and was awarded Ot Shavot 2024." } },
    { when: { he: "2025", en: "2025" }, title: { he: "מבמת הכנסת", en: "From the Knesset podium" }, body: { he: "נאמתי בכנסת וזכיתי בפרס החוסן הנוער — קול של דור שלם שבוחר באהבת חינם.", en: "Addressed the Knesset and received the Youth Resilience award — the voice of a generation choosing senseless love." } },
  ] as Milestone[],
};

export const contact = {
  heading: { he: "בואו נפיץ טוב ביחד", en: "Let's spread the love together" },
  sub: {
    he: "רשויות, בתי ספר ובני נוער — רוצים להשיק את אתגר המעשים הטובים בעיר שלכם או לשתף פעולה בפרויקט קהילתי? כתבו לי.",
    en: "Municipalities, schools, and young people — want to launch the Good Deeds Challenge in your city or team up on a community project? Write to me.",
  },
  success: {
    title: { he: "תודה מכל הלב!", en: "Thank you, truly!" },
    body: { he: "ההודעה נקלטה. נחזור אליכם בקרוב כדי ליצור טוב ביחד.", en: "Your message is in. I'll be in touch soon so we can create good together." },
  },
  roleOptions: [
    { he: "רשות מקומית / עירייה", en: "Municipality" },
    { he: "בית ספר / מוסד חינוכי", en: "School / educator" },
    { he: "בן/בת נוער", en: "Young person" },
    { he: "אחר", en: "Other" },
  ] as Bilingual[],
};

// ---- Podcasts --------------------------------------------------------------

export interface Episode {
  title: Bilingual;
  ep: Bilingual;
  date: Bilingual;
  length: Bilingual;
  caption: Bilingual;
}

export const podcastEpisodes: Episode[] = [
  { title: { he: "מאהבת חינם לשנאת חינם — ובחזרה", en: "From senseless love to senseless hate — and back" }, ep: { he: "פרק 1 · הרעיון שמאחורי התנועה", en: "Ep. 1 · The idea behind the movement" }, date: { he: "יולי 2024", en: "July 2024" }, length: { he: "28 דק׳", en: "28 min" }, caption: { he: "איך הופכים יום של שנאה ליום של אהבה, ולמה זה מתחיל בכל אחד מאיתנו.", en: "How to turn a day of hate into a day of love, and why it starts with each of us." } },
  { title: { he: "בת 15 ומובילה תנועה ארצית", en: "15 years old, leading a national movement" }, ep: { he: "פרק 2 · הגיל הוא כוח על", en: "Ep. 2 · Age is a superpower" }, date: { he: "ספטמבר 2024", en: "September 2024" }, length: { he: "34 דק׳", en: "34 min" }, caption: { he: "על להיות צעירה, להאמין בגדול, ולא לחכות לרשות מאף אחד.", en: "On being young, thinking big, and not waiting for anyone's permission." } },
  { title: { he: "חוסן נוער בזמן מלחמה", en: "Youth resilience in wartime" }, ep: { he: "פרק 3 · להחזיק ביחד", en: "Ep. 3 · Holding on together" }, date: { he: "נובמבר 2024", en: "November 2024" }, length: { he: "41 דק׳", en: "41 min" }, caption: { he: "כלים אמיתיים לבני נוער ולמחנכים בתקופות של אי-ודאות.", en: "Real tools for young people and educators in times of uncertainty." } },
];

export const podcastMiniContact = {
  text: { he: "רוצים לארח את ליעד בפרק? דברו איתי 🎙", en: "Want Liad on your episode? Talk to me 🎙" },
  ctaLabel: { he: "בואו נתחבר", en: "Let's connect" },
  ctaHref: `${withBase("/")}#contact`,
};

// ---- Instagram -------------------------------------------------------------

export interface Post {
  title: Bilingual;
  date: Bilingual;
  link: string;
  img?: string;
  caption: Bilingual;
}

export const instagramPosts: Post[] = [
  { title: { he: "אתגר המעשים הטובים · תשעה באב", en: "Good Deeds Challenge · Tisha B'Av" }, date: { he: "יולי 2024", en: "July 2024" }, link: "#", caption: { he: "יום שלם של אהבת חינם ברמת גן — מאות מתנדבים, אלפי מעשים טובים.", en: "A full day of senseless love in Ramat Gan — hundreds of volunteers, thousands of good deeds." } },
  { title: { he: "ביקור בבית האבות המאומץ", en: "Visiting our adopted nursing home" }, date: { he: "מאי 2024", en: "May 2024" }, link: "#", caption: { he: "החיוכים של סבתות וסבים הם הדלק הכי טוב שיש.", en: "The smiles of grandmas and grandpas are the best fuel there is." } },
  { title: { he: "בת מצווה לכל נערה", en: "A Bat Mitzvah for every girl" }, date: { he: "מרץ 2024", en: "March 2024" }, link: "#", caption: { he: "עיצוב שיער לנערות במצוקה — כל אחת נסיכה ביום שלה.", en: "Hair styling for girls in need — everyone's a princess on her day." } },
  { title: { he: "נאום בכנסת", en: "Speaking at the Knesset" }, date: { he: "פברואר 2025", en: "February 2025" }, link: "#", img: withBase("/assets/liad/stage-moment.jpeg"), caption: { he: "קול של דור שבוחר לרפא. תודה על הבמה.", en: "The voice of a generation that chooses to heal. Thank you for the stage." } },
];

export const instagramMiniContact = {
  text: { he: "יש רגע טוב שתרצו לשתף? תייגו אותי ✨", en: "Have a good moment to share? Tag me ✨" },
  ctaLabel: { he: "בואו נתחבר", en: "Let's connect" },
  ctaHref: `${withBase("/")}#contact`,
};
