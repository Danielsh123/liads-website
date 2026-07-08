/**
 * Admin Studio — a private content tool for Liad and her team to add
 * Instagram posts and podcast episodes without touching code.
 *
 * No framework: a single state object, a full re-render of whichever "screen"
 * is active (gate vs. studio), and event delegation on the root element. Form
 * inputs are uncontrolled (read from the DOM at submit time) so typing never
 * fights a re-render — only the live preview updates per keystroke.
 *
 * Drafts persist in this browser's localStorage. Publishing writes straight to
 * GitHub (src/data/instagram-posts.json / podcast-episodes.json, and any
 * uploaded thumbnail under public/assets/feed/) via the REST API, using a
 * personal access token the admin pastes in once — see the "Publishing key"
 * panel. The token never leaves this browser except in calls to
 * api.github.com.
 */
import { parseSpotifyUrl } from "../lib/spotify";
import {
  writeJsonFile,
  writeBinaryFile,
  verifyAccess,
  stripDataUrlPrefix,
  GitHubApiError,
  type GitHubConfig,
} from "../lib/github";
import type { Post, Episode } from "../data/content";

// ---- Repo wiring -----------------------------------------------------------
const GH_OWNER = "Danielsh123";
const GH_REPO = "liads-website";
const GH_BRANCH = "main";
const SITE_ORIGIN = "https://danielsh123.github.io/liads-website";
const PATH_INSTAGRAM = "src/data/instagram-posts.json";
const PATH_PODCAST = "src/data/podcast-episodes.json";
const IMAGE_DIR = "public/assets/feed";

const LS_AUTHED = "liad-studio-authed";
const LS_LANG = "liad-studio-lang";
const LS_DRAFTS = "liad-studio-drafts-v1";
const LS_TOKEN = "liad-studio-gh-token";

// ---- Types ------------------------------------------------------------------
type Lang = "he" | "en";
type ContentType = "instagram" | "podcast";
type ThumbMode = "upload" | "url";
type FlashKind = "ok" | "info" | "err";

interface DraftItem {
  id: string;
  type: ContentType;
  status: "draft" | "published";
  dirty: boolean;
  titleHe: string;
  titleEn: string;
  captionHe: string;
  captionEn: string;
  month: string; // yyyy-mm
  link: string;
  thumbMode: ThumbMode;
  thumbUrl: string;
  thumbDataUrl: string; // data: URL, kept locally until published
  thumbExt: string;
  publishedImg: string; // e.g. "/assets/feed/xxxx.jpg" once uploaded
  epHe: string;
  epEn: string;
  lengthHe: string;
  lengthEn: string;
  embedRaw: string;
}

type FormSeed = Omit<DraftItem, "id" | "status" | "dirty">;

interface State {
  authed: boolean;
  lang: Lang;
  type: ContentType;
  thumbMode: ThumbMode;
  helperOpen: boolean;
  previewOpen: boolean;
  tokenPanelOpen: boolean;
  editId: string | null;
  form: FormSeed;
  errors: Record<string, string>;
  drafts: DraftItem[];
  flash: { kind: FlashKind; text: string } | null;
  busy: boolean;
}

function blankForm(): FormSeed {
  return {
    type: "instagram",
    titleHe: "",
    titleEn: "",
    captionHe: "",
    captionEn: "",
    month: currentMonth(),
    link: "",
    thumbMode: "upload",
    thumbUrl: "",
    thumbDataUrl: "",
    thumbExt: "",
    publishedImg: "",
    epHe: "",
    epEn: "",
    lengthHe: "",
    lengthEn: "",
    embedRaw: "",
  };
}

const state: State = {
  authed: false,
  lang: "he",
  type: "instagram",
  thumbMode: "upload",
  helperOpen: false,
  previewOpen: true,
  tokenPanelOpen: false,
  editId: null,
  form: blankForm(),
  errors: {},
  drafts: [],
  flash: null,
  busy: false,
};

let flashTimer: ReturnType<typeof setTimeout> | undefined;

function currentMonth(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(month: string, lang: Lang): string {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return "";
  const d = new Date(Date.UTC(y, m - 1, 1));
  const locale = lang === "he" ? "he-u-ca-gregory" : "en-US";
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(d);
}

function uid(): string {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

function save(): void {
  try {
    localStorage.setItem(LS_DRAFTS, JSON.stringify(state.drafts));
  } catch {
    /* ignore quota errors */
  }
}

function getToken(): string {
  try {
    return localStorage.getItem(LS_TOKEN) || "";
  } catch {
    return "";
  }
}

function ghConfig(): GitHubConfig {
  return { owner: GH_OWNER, repo: GH_REPO, branch: GH_BRANCH, token: getToken() };
}

function flash(kind: FlashKind, text: string): void {
  state.flash = { kind, text };
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => {
    state.flash = null;
    render();
  }, 4500);
}

function friendlyError(err: unknown): string {
  if (err instanceof GitHubApiError) {
    if (err.status === 401) return T().errTokenBad;
    if (err.status === 403) return T().errTokenScope;
    if (err.status === 404) return T().errNotFound;
    if (err.status === 409) return T().errConflict;
    return err.message;
  }
  return err instanceof Error ? err.message : String(err);
}

// ---- Translations -----------------------------------------------------------
interface Dict {
  gateTitle: string; gateSub: string; gatePassLabel: string; gateBtn: string; gateNote: string;
  studio: string; langToggle: string; exit: string;
  heading: string; subheading: string;
  instagram: string; podcast: string; newEntry: string; editEntry: string;
  lblTitleHe: string; lblTitleEn: string; phTitleHe: string; phTitleEn: string;
  lblMonth: string; lblCaptionHe: string; lblCaptionEn: string; phCaptionHe: string; phCaptionEn: string;
  lblSource: string; sourceHint: string;
  lblThumb: string; upload: string; urlMode: string; dropHint: string; uploadNote: string; urlNote: string;
  lblEp: string; phEp: string; lblLength: string; phLength: string;
  lblEmbed: string; embedBadChip: string; helperTitle: string; help1: string; help2: string; help3: string; help4: string;
  save: string; saveEdit: string; clear: string; cancelEdit: string;
  livePreview: string; open: string; closed: string; previewHint: string;
  viewOn: string; show: string;
  myContent: string; edit: string; publish: string; update: string; unpublish: string; remove: string; viewLive: string;
  draft: string; live: string; dirtyBadge: string; drafts: string; liveN: string;
  emptyTitle: string; emptySub: string; untitled: string; igType: string; podType: string;
  tokenTitle: string; tokenSub: string; tokenLabel: string; tokenSave: string; tokenClear: string; tokenVerify: string;
  tokenNone: string; tokenSet: string; tokenVerifying: string; tokenOk: string;
  errRequired: string; errLink: string; errThumb: string; errSpotify: string; errEp: string; errLength: string;
  errTokenMissing: string; errTokenBad: string; errTokenScope: string; errNotFound: string; errConflict: string;
  publishedMsg: string; unpublishedMsg: string; deletedMsg: string;
}

const DICTS: Record<Lang, Dict> = {
  he: {
    gateTitle: "הסטודיו של ליעד", gateSub: "כאן מוסיפים תוכן חדש לאתר — פשוט, מהיר ובלי כאב ראש.",
    gatePassLabel: "קוד כניסה", gateBtn: "כניסה לסטודיו", gateNote: "השטח הזה שמור לליעד ולצוות בלבד.",
    studio: "הסטודיו של ליעד", langToggle: "EN", exit: "יציאה",
    heading: "מה נוסיף היום?", subheading: "בוחרים סוג תוכן, ממלאים פרטים בעברית ובאנגלית, ורואים תצוגה חיה. שומרים כטיוטה — ומפרסמים כשמוכן.",
    instagram: "פוסט אינסטגרם", podcast: "פרק פודקאסט", newEntry: "פריט חדש", editEntry: "עריכת פריט",
    lblTitleHe: "כותרת (עברית)", lblTitleEn: "כותרת (אנגלית)", phTitleHe: "למשל: אתגר המעשים הטובים", phTitleEn: "e.g. The Good Deeds Challenge",
    lblMonth: "חודש", lblCaptionHe: "תיאור קצר (עברית)", lblCaptionEn: "תיאור קצר (אנגלית)",
    phCaptionHe: "משפט אחד שמסביר את הרגע…", phCaptionEn: "One line describing the moment…",
    lblSource: "קישור לפוסט", sourceHint: "הקישור לפוסט באינסטגרם — לוחצים שיתוף → העתקת קישור.",
    lblThumb: "תמונה", upload: "העלאה", urlMode: "קישור", dropHint: "גררו לכאן צילום מסך של הפוסט",
    uploadNote: "גררו תמונה או לחצו לבחירה מהמחשב.", urlNote: "הדביקו קישור לתמונה מהאינטרנט.",
    lblEp: "מספר וכותרת הפרק", phEp: "למשל: פרק 4 · הנושא של הפרק",
    lblLength: "משך הפרק", phLength: "למשל: 30 דק׳",
    lblEmbed: "קישור לפרק בספוטיפיי", embedBadChip: "לא זוהה קישור ספוטיפיי",
    helperTitle: "איך משיגים את הקישור לפרק?",
    help1: "פותחים את הפרק בספוטיפיי (באפליקציה או באתר).", help2: "לוחצים על שלוש הנקודות ··· ליד הפרק.",
    help3: "בוחרים ״שיתוף״ ואז ״העתקת קישור לפרק״.", help4: "מדביקים כאן — נזהה את הפרק אוטומטית.",
    save: "שמירה כטיוטה", saveEdit: "שמירת שינויים", clear: "ניקוי", cancelEdit: "ביטול עריכה",
    livePreview: "תצוגה חיה", open: "פתוח", closed: "סגור", previewHint: "כך זה ייראה באתר",
    viewOn: "צפו באינסטגרם ←", show: "הפודקאסט של ליעד",
    myContent: "התוכן שלי", edit: "עריכה", publish: "פרסום", update: "עדכון באתר", unpublish: "הסרה מהאתר", remove: "מחיקה", viewLive: "צפייה באתר",
    draft: "טיוטה", live: "מפורסם", dirtyBadge: "מפורסם · יש עדכון", drafts: "טיוטות", liveN: "מפורסמים",
    emptyTitle: "עוד אין תוכן כאן", emptySub: "מלאו את הטופס למעלה והתחילו — הכל יישמר כאן.",
    untitled: "ללא כותרת", igType: "אינסטגרם", podType: "פודקאסט",
    tokenTitle: "מפתח פרסום", tokenSub: "כדי שפרסום יעלה תוכן אמיתי לאתר, דרוש מפתח גישה חד־פעמי מ-GitHub. הוא נשמר רק בדפדפן הזה.",
    tokenLabel: "מפתח גישה (GitHub token)", tokenSave: "שמירה", tokenClear: "מחיקת מפתח", tokenVerify: "בדיקת חיבור",
    tokenNone: "לא הוגדר מפתח עדיין.", tokenSet: "מפתח מוגדר בדפדפן זה.", tokenVerifying: "בודק…", tokenOk: "החיבור תקין ✓",
    errRequired: "שדה חובה", errLink: "צריך קישור לפוסט", errThumb: "צריך תמונה",
    errSpotify: "הדביקו קישור ספוטיפיי תקין", errEp: "צריך מספר וכותרת לפרק", errLength: "צריך משך פרק",
    errTokenMissing: "קודם הגדירו מפתח פרסום.", errTokenBad: "המפתח נדחה — בדקו שהועתק נכון.",
    errTokenScope: "למפתח הזה אין הרשאת כתיבה למאגר.", errNotFound: "הקובץ או המאגר לא נמצאו.",
    errConflict: "מישהו אחר עדכן את הקובץ באותו רגע — נסו לפרסם שוב.",
    publishedMsg: "פורסם! התוכן יעלה לאתר בדקה־שתיים.", unpublishedMsg: "הוסר מהאתר וחזר לטיוטה.", deletedMsg: "נמחק.",
  },
  en: {
    gateTitle: "Liad's Studio", gateSub: "Add new content to the site here — simple, fast, no headache.",
    gatePassLabel: "Access code", gateBtn: "Enter studio", gateNote: "This space is for Liad and the team only.",
    studio: "Liad's Studio", langToggle: "עב", exit: "Exit",
    heading: "What are we adding today?", subheading: "Pick a content type, fill in details in Hebrew and English, and watch the live preview. Save as a draft — publish when ready.",
    instagram: "Instagram post", podcast: "Podcast episode", newEntry: "New item", editEntry: "Edit item",
    lblTitleHe: "Title (Hebrew)", lblTitleEn: "Title (English)", phTitleHe: "e.g. אתגר המעשים הטובים", phTitleEn: "e.g. The Good Deeds Challenge",
    lblMonth: "Month", lblCaptionHe: "Caption (Hebrew)", lblCaptionEn: "Caption (English)",
    phCaptionHe: "משפט אחד שמסביר את הרגע…", phCaptionEn: "One line describing the moment…",
    lblSource: "Post link", sourceHint: "The Instagram post link — tap Share → Copy link.",
    lblThumb: "Image", upload: "Upload", urlMode: "Link", dropHint: "Drop a screenshot of the post here",
    uploadNote: "Drag an image in, or click to pick from your computer.", urlNote: "Paste a link to an image online.",
    lblEp: "Episode number & title", phEp: "e.g. Ep. 4 · Today's topic",
    lblLength: "Episode length", phLength: "e.g. 30 min",
    lblEmbed: "Spotify episode link", embedBadChip: "Not a Spotify link",
    helperTitle: "How do I get the episode link?",
    help1: "Open the episode in Spotify (app or web).", help2: "Tap the three dots ··· next to the episode.",
    help3: "Choose “Share”, then “Copy link to episode”.", help4: "Paste it here — we'll detect the episode automatically.",
    save: "Save as draft", saveEdit: "Save changes", clear: "Clear", cancelEdit: "Cancel edit",
    livePreview: "Live preview", open: "Open", closed: "Closed", previewHint: "This is how it'll look on the site",
    viewOn: "View on Instagram →", show: "Liad's Podcast",
    myContent: "My content", edit: "Edit", publish: "Publish", update: "Update on site", unpublish: "Remove from site", remove: "Delete", viewLive: "View live",
    draft: "Draft", live: "Published", dirtyBadge: "Published · has updates", drafts: "drafts", liveN: "published",
    emptyTitle: "No content here yet", emptySub: "Fill in the form above to get started — everything shows up here.",
    untitled: "Untitled", igType: "Instagram", podType: "Podcast",
    tokenTitle: "Publishing key", tokenSub: "For Publish to push real content to the site, a one-time GitHub access key is needed. It's stored only in this browser.",
    tokenLabel: "Access key (GitHub token)", tokenSave: "Save", tokenClear: "Clear key", tokenVerify: "Test connection",
    tokenNone: "No key set yet.", tokenSet: "A key is set in this browser.", tokenVerifying: "Checking…", tokenOk: "Connection works ✓",
    errRequired: "Required", errLink: "Post link is required", errThumb: "An image is required",
    errSpotify: "Paste a valid Spotify link", errEp: "Episode number & title is required", errLength: "Episode length is required",
    errTokenMissing: "Set a publishing key first.", errTokenBad: "That key was rejected — check it's copied correctly.",
    errTokenScope: "This key doesn't have write access to the repo.", errNotFound: "The file or repo wasn't found.",
    errConflict: "Someone else updated the file at the same moment — try publishing again.",
    publishedMsg: "Published! It'll be live on the site within a minute or two.", unpublishedMsg: "Removed from the site, back to draft.", deletedMsg: "Deleted.",
  },
};

function T(): Dict {
  return DICTS[state.lang];
}

// ---- Bootstrapping ------------------------------------------------------------
function boot(): void {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_DRAFTS) || "[]");
    state.drafts = Array.isArray(raw) ? raw : [];
  } catch {
    state.drafts = [];
  }
  try {
    state.authed = localStorage.getItem(LS_AUTHED) === "1";
    state.lang = (localStorage.getItem(LS_LANG) as Lang) || "he";
  } catch {
    /* ignore */
  }
  render();
}

// ---- HTML escaping ------------------------------------------------------------
function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

// ---- Root + render ------------------------------------------------------------
const root = document.getElementById("admin-root")!;

function render(): void {
  const t = T();
  const dir = state.lang === "he" ? "rtl" : "ltr";
  root.setAttribute("dir", dir);
  root.setAttribute("lang", state.lang);
  root.innerHTML = state.authed ? studioHtml(t) : gateHtml(t);
  refreshPreview();
}

// ---- Gate screen ------------------------------------------------------------
function gateHtml(t: Dict): string {
  return `
  <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1.5rem;background:radial-gradient(circle at 82% 12%,rgba(88,200,236,0.20),transparent 46%),radial-gradient(circle at 12% 88%,rgba(255,139,61,0.18),transparent 44%),var(--color-bg);">
    <div style="width:100%;max-width:420px;background:var(--color-surface);border-radius:26px;padding:2.6rem 2.2rem;box-shadow:0 24px 60px rgba(27,36,52,0.14);text-align:center;animation:ls-pop 0.5s cubic-bezier(0.16,1,0.3,1) both;">
      <span style="width:62px;height:62px;border-radius:999px;background:var(--gradient-primary);display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:1.7rem;box-shadow:0 10px 24px rgba(43,163,227,0.35);margin-bottom:1.1rem;">♥</span>
      <h1 style="margin:0 0 0.4rem;font-size:1.55rem;font-weight:900;">${esc(t.gateTitle)}</h1>
      <p style="margin:0 0 1.6rem;color:var(--color-text-muted);font-size:0.98rem;line-height:1.6;">${esc(t.gateSub)}</p>
      <div style="text-align:start;margin-bottom:1.1rem;">
        <label style="display:block;font-weight:800;font-size:0.85rem;margin-bottom:0.4rem;">${esc(t.gatePassLabel)}</label>
        <input id="gate-pass" class="adm-field" type="password" placeholder="••••••" style="text-align:center;letter-spacing:0.3em;font-size:1.15rem;">
      </div>
      <button data-action="enter-gate" class="adm-button" style="width:100%;background:var(--gradient-primary);color:#fff;font-weight:800;font-size:1.02rem;padding:0.85rem 1rem;border-radius:14px;">${esc(t.gateBtn)}</button>
      <p style="margin:1.1rem 0 0;font-size:0.78rem;color:var(--color-text-muted);">🔒 ${esc(t.gateNote)}</p>
    </div>
  </div>`;
}

// ---- Studio screen ------------------------------------------------------------
function studioHtml(t: Dict): string {
  const isIg = state.type === "instagram";
  const isPod = state.type === "podcast";
  const editing = !!state.editId;
  const f = state.form;
  const err = state.errors;

  const tabStyle = (on: boolean) =>
    `cursor:pointer;font-family:inherit;font-weight:800;font-size:0.95rem;border:none;padding:0.55rem 1.3rem;border-radius:999px;transition:all 0.15s ease;` +
    (on
      ? "background:var(--gradient-primary);color:#fff;box-shadow:0 6px 14px rgba(255,139,61,0.3);"
      : "background:transparent;color:var(--color-text-muted);");

  const flashHtml = state.flash
    ? (() => {
        const map: Record<FlashKind, { bg: string; border: string; color: string; icon: string }> = {
          ok: { bg: "rgba(30,158,90,0.12)", border: "rgba(30,158,90,0.35)", color: "#137a44", icon: "✓" },
          info: { bg: "rgba(43,163,227,0.12)", border: "rgba(43,163,227,0.35)", color: "#1663a0", icon: "↩" },
          err: { bg: "rgba(229,72,77,0.12)", border: "rgba(229,72,77,0.35)", color: "var(--err)", icon: "✕" },
        };
        const c = map[state.flash!.kind];
        return `<div style="display:flex;align-items:center;gap:0.6rem;background:${c.bg};border:1.5px solid ${c.border};color:${c.color};font-weight:700;padding:0.75rem 1.1rem;border-radius:14px;margin-bottom:1.4rem;animation:ls-pop 0.35s ease both;">
          <span style="font-size:1.1rem;">${c.icon}</span><span>${esc(state.flash!.text)}</span>
        </div>`;
      })()
    : "";

  const gridCols = state.previewOpen ? "minmax(0,1.05fr) minmax(300px,0.95fr)" : "minmax(0,1fr) minmax(220px,320px)";

  return `
  <div>
    <div style="position:sticky;top:0;z-index:50;background:rgba(253,248,241,0.9);backdrop-filter:blur(12px);border-bottom:1px solid rgba(27,36,52,0.07);">
      <div style="max-width:1120px;margin:0 auto;padding:0.7rem 1.4rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:0.6rem;font-weight:900;font-size:1.1rem;">
          <span style="width:32px;height:32px;border-radius:999px;background:var(--gradient-primary);display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:1rem;">♥</span>
          <span>${esc(t.studio)}</span>
        </div>
        <div style="display:flex;align-items:center;gap:0.5rem;">
          <button data-action="toggle-token-panel" style="cursor:pointer;font-family:inherit;font-weight:700;font-size:0.82rem;border:2px solid rgba(27,36,52,0.14);background:transparent;color:var(--color-text-muted);padding:0.35rem 0.8rem;border-radius:999px;">🔑 ${esc(t.tokenTitle)}</button>
          <button data-action="toggle-lang" style="cursor:pointer;font-family:inherit;font-weight:800;font-size:0.82rem;border:2px solid var(--color-accent-2);background:transparent;color:var(--color-accent-2);padding:0.35rem 0.8rem;border-radius:999px;">${esc(t.langToggle)}</button>
          <button data-action="sign-out" style="cursor:pointer;font-family:inherit;font-weight:700;font-size:0.82rem;border:2px solid rgba(27,36,52,0.14);background:transparent;color:var(--color-text-muted);padding:0.35rem 0.8rem;border-radius:999px;">${esc(t.exit)}</button>
        </div>
      </div>
    </div>

    ${state.tokenPanelOpen ? tokenPanelHtml(t) : ""}

    <div style="max-width:1120px;margin:0 auto;padding:2rem 1.4rem 4rem;">
      <div style="margin-bottom:1.6rem;">
        <h1 style="margin:0 0 0.35rem;font-size:clamp(1.6rem,3.5vw,2.2rem);font-weight:900;">${esc(t.heading)}</h1>
        <p style="margin:0;color:var(--color-text-muted);font-size:1rem;line-height:1.6;max-width:640px;">${esc(t.subheading)}</p>
      </div>

      <div style="display:inline-flex;background:var(--color-surface);border:2px solid rgba(27,36,52,0.08);border-radius:999px;padding:0.3rem;gap:0.25rem;box-shadow:0 4px 14px rgba(27,36,52,0.05);margin-bottom:1.8rem;">
        <button data-action="pick-instagram" style="${tabStyle(isIg)}">📸 ${esc(t.instagram)}</button>
        <button data-action="pick-podcast" style="${tabStyle(isPod)}">🎙 ${esc(t.podcast)}</button>
      </div>

      ${flashHtml}

      <div style="display:grid;grid-template-columns:${gridCols};gap:1.6rem;align-items:start;">
        <div style="background:var(--color-surface);border-radius:22px;padding:1.8rem;box-shadow:0 4px 18px rgba(27,36,52,0.06);border:1px solid rgba(27,36,52,0.05);">
          <h2 style="margin:0 0 1.3rem;font-size:1.15rem;font-weight:900;display:flex;align-items:center;gap:0.5rem;">${isIg ? "📸" : "🎙"} ${esc(editing ? t.editEntry : t.newEntry)}</h2>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.9rem;margin-bottom:1.15rem;">
            <div>
              <label style="display:block;font-weight:800;font-size:0.88rem;margin-bottom:0.4rem;">${esc(t.lblTitleHe)} <span style="color:var(--err);">*</span></label>
              <input id="f-title-he" class="adm-field${err.titleHe ? " adm-field--err" : ""}" dir="rtl" value="${esc(f.titleHe)}" placeholder="${esc(t.phTitleHe)}">
              ${err.titleHe ? `<p style="color:var(--err);font-size:0.8rem;font-weight:700;margin:0.35rem 0 0;">${esc(err.titleHe)}</p>` : ""}
            </div>
            <div>
              <label style="display:block;font-weight:800;font-size:0.88rem;margin-bottom:0.4rem;">${esc(t.lblTitleEn)} <span style="color:var(--err);">*</span></label>
              <input id="f-title-en" class="adm-field${err.titleEn ? " adm-field--err" : ""}" dir="ltr" value="${esc(f.titleEn)}" placeholder="${esc(t.phTitleEn)}">
              ${err.titleEn ? `<p style="color:var(--err);font-size:0.8rem;font-weight:700;margin:0.35rem 0 0;">${esc(err.titleEn)}</p>` : ""}
            </div>
          </div>

          <div style="margin-bottom:1.15rem;">
            <label style="display:block;font-weight:800;font-size:0.88rem;margin-bottom:0.4rem;">${esc(t.lblMonth)} <span style="color:var(--err);">*</span></label>
            <input id="f-month" type="month" class="adm-field${err.month ? " adm-field--err" : ""}" value="${esc(f.month)}" style="max-width:220px;">
            ${err.month ? `<p style="color:var(--err);font-size:0.8rem;font-weight:700;margin:0.35rem 0 0;">${esc(err.month)}</p>` : ""}
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.9rem;margin-bottom:1.15rem;">
            <div>
              <label style="display:block;font-weight:800;font-size:0.88rem;margin-bottom:0.4rem;">${esc(t.lblCaptionHe)} <span style="color:var(--err);">*</span></label>
              <textarea id="f-caption-he" class="adm-field${err.captionHe ? " adm-field--err" : ""}" dir="rtl" placeholder="${esc(t.phCaptionHe)}" rows="2" style="resize:vertical;">${esc(f.captionHe)}</textarea>
              ${err.captionHe ? `<p style="color:var(--err);font-size:0.8rem;font-weight:700;margin:0.35rem 0 0;">${esc(err.captionHe)}</p>` : ""}
            </div>
            <div>
              <label style="display:block;font-weight:800;font-size:0.88rem;margin-bottom:0.4rem;">${esc(t.lblCaptionEn)} <span style="color:var(--err);">*</span></label>
              <textarea id="f-caption-en" class="adm-field${err.captionEn ? " adm-field--err" : ""}" dir="ltr" placeholder="${esc(t.phCaptionEn)}" rows="2" style="resize:vertical;">${esc(f.captionEn)}</textarea>
              ${err.captionEn ? `<p style="color:var(--err);font-size:0.8rem;font-weight:700;margin:0.35rem 0 0;">${esc(err.captionEn)}</p>` : ""}
            </div>
          </div>

          ${isIg ? instagramFieldsHtml(t) : podcastFieldsHtml(t)}

          <div style="display:flex;gap:0.7rem;margin-top:1.6rem;flex-wrap:wrap;">
            <button data-action="submit" class="adm-button" style="background:var(--gradient-primary);color:#fff;font-weight:800;font-size:0.98rem;padding:0.8rem 1.6rem;border-radius:999px;">${esc(editing ? t.saveEdit : t.save)}</button>
            <button data-action="reset-form" style="background:transparent;border:2px solid rgba(27,36,52,0.14);color:var(--color-text-muted);cursor:pointer;font-family:inherit;font-weight:700;font-size:0.9rem;padding:0.8rem 1.3rem;border-radius:999px;">${esc(t.clear)}</button>
            ${editing ? `<button data-action="cancel-edit" style="background:transparent;border:none;color:var(--color-text-muted);cursor:pointer;font-family:inherit;font-weight:700;font-size:0.9rem;padding:0.8rem 0.6rem;text-decoration:underline;">${esc(t.cancelEdit)}</button>` : ""}
          </div>
        </div>

        <div style="position:sticky;top:80px;">
          <button data-action="toggle-preview" style="width:100%;display:flex;align-items:center;justify-content:space-between;background:var(--color-surface);border:1px solid rgba(27,36,52,0.06);border-radius:16px;padding:0.8rem 1.1rem;cursor:pointer;font-family:inherit;">
            <span style="font-weight:900;font-size:0.98rem;">👁 ${esc(t.livePreview)}</span>
            <span style="font-size:0.82rem;font-weight:800;color:var(--color-accent-2);">${esc(state.previewOpen ? t.open : t.closed)}</span>
          </button>
          ${
            state.previewOpen
              ? `<div style="margin-top:0.9rem;border-radius:22px;padding:1.6rem 1.4rem;background-color:var(--color-surface);background-image:radial-gradient(circle, rgba(27,36,52,0.08) 1px, transparent 1px);background-size:20px 20px;">
                  <p style="margin:0 0 0.9rem;font-size:0.78rem;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;color:var(--color-text-muted);">${esc(t.previewHint)}</p>
                  <ul class="feed-list" id="preview-pane" style="margin:0;"></ul>
                </div>`
              : ""
          }
        </div>
      </div>

      <div style="margin-top:2.6rem;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-bottom:1.1rem;">
          <h2 style="margin:0;font-size:1.3rem;font-weight:900;">${esc(t.myContent)}</h2>
          <div style="display:flex;gap:0.5rem;">
            <span style="font-size:0.8rem;font-weight:800;color:var(--amber);background:rgba(217,138,0,0.12);padding:0.3rem 0.7rem;border-radius:999px;">${state.drafts.filter((d) => d.status === "draft").length} ${esc(t.drafts)}</span>
            <span style="font-size:0.8rem;font-weight:800;color:#137a44;background:rgba(30,158,90,0.12);padding:0.3rem 0.7rem;border-radius:999px;">${state.drafts.filter((d) => d.status === "published").length} ${esc(t.liveN)}</span>
          </div>
        </div>
        ${draftsListHtml(t)}
      </div>
    </div>
  </div>`;
}

function instagramFieldsHtml(t: Dict): string {
  const f = state.form;
  const err = state.errors;
  const miniStyle = (on: boolean) =>
    `cursor:pointer;font-family:inherit;font-weight:800;font-size:0.78rem;border:none;padding:0.35rem 0.85rem;border-radius:999px;transition:all 0.15s ease;` +
    (on ? "background:#fff;color:var(--color-accent-2);box-shadow:0 2px 6px rgba(27,36,52,0.12);" : "background:transparent;color:var(--color-text-muted);");
  return `
  <div>
    <div style="margin-bottom:1.15rem;">
      <label style="display:block;font-weight:800;font-size:0.88rem;margin-bottom:0.4rem;">${esc(t.lblSource)} <span style="color:var(--err);">*</span></label>
      <input id="f-link" class="adm-field${err.link ? " adm-field--err" : ""}" dir="ltr" value="${esc(f.link)}" placeholder="https://www.instagram.com/p/…" style="text-align:left;">
      <p style="margin:0.35rem 0 0;font-size:0.78rem;color:var(--color-text-muted);">${esc(t.sourceHint)}</p>
      ${err.link ? `<p style="color:var(--err);font-size:0.8rem;font-weight:700;margin:0.35rem 0 0;">${esc(err.link)}</p>` : ""}
    </div>
    <div style="margin-bottom:0.5rem;display:flex;align-items:center;justify-content:space-between;gap:0.5rem;flex-wrap:wrap;">
      <label style="font-weight:800;font-size:0.88rem;">${esc(t.lblThumb)} <span style="color:var(--err);">*</span></label>
      <div style="display:inline-flex;background:var(--color-bg);border-radius:999px;padding:0.2rem;gap:0.15rem;">
        <button data-action="pick-upload" style="${miniStyle(state.thumbMode === "upload")}">${esc(t.upload)}</button>
        <button data-action="pick-url" style="${miniStyle(state.thumbMode === "url")}">${esc(t.urlMode)}</button>
      </div>
    </div>
    ${
      state.thumbMode === "upload"
        ? `<label id="thumb-dropzone" style="display:flex;align-items:center;justify-content:center;text-align:center;border-radius:16px;overflow:hidden;border:2px dashed rgba(27,36,52,0.16);aspect-ratio:4/3;cursor:pointer;background:${f.thumbDataUrl ? `url('${f.thumbDataUrl}') center/cover` : "var(--color-bg)"};color:var(--color-text-muted);font-size:0.85rem;padding:1rem;">
            ${f.thumbDataUrl ? "" : esc(t.dropHint)}
            <input id="f-thumb-file" type="file" accept="image/*" style="display:none;">
          </label>
          <p style="margin:0.5rem 0 0;font-size:0.78rem;color:var(--color-text-muted);">${esc(t.uploadNote)}</p>`
        : `<input id="f-thumb-url" class="adm-field${err.thumb ? " adm-field--err" : ""}" dir="ltr" value="${esc(f.thumbUrl)}" placeholder="https://…" style="text-align:left;">
          <p style="margin:0.35rem 0 0;font-size:0.78rem;color:var(--color-text-muted);">${esc(t.urlNote)}</p>`
    }
    ${err.thumb ? `<p style="color:var(--err);font-size:0.8rem;font-weight:700;margin:0.35rem 0 0;">${esc(err.thumb)}</p>` : ""}
  </div>`;
}

function podcastFieldsHtml(t: Dict): string {
  const f = state.form;
  const err = state.errors;
  return `
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.9rem;margin-bottom:1.15rem;">
    <div>
      <label style="display:block;font-weight:800;font-size:0.88rem;margin-bottom:0.4rem;">${esc(t.lblEp)} <span style="color:var(--err);">*</span> (עב)</label>
      <input id="f-ep-he" class="adm-field${err.ep ? " adm-field--err" : ""}" dir="rtl" value="${esc(f.epHe)}" placeholder="${esc(t.phEp)}">
    </div>
    <div>
      <label style="display:block;font-weight:800;font-size:0.88rem;margin-bottom:0.4rem;">${esc(t.lblEp)} <span style="color:var(--err);">*</span> (EN)</label>
      <input id="f-ep-en" class="adm-field${err.ep ? " adm-field--err" : ""}" dir="ltr" value="${esc(f.epEn)}" placeholder="e.g. Ep. 4 · Today's topic">
    </div>
  </div>
  ${err.ep ? `<p style="color:var(--err);font-size:0.8rem;font-weight:700;margin:-0.8rem 0 1.15rem;">${esc(err.ep)}</p>` : ""}
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.9rem;margin-bottom:1.15rem;">
    <div>
      <label style="display:block;font-weight:800;font-size:0.88rem;margin-bottom:0.4rem;">${esc(t.lblLength)} <span style="color:var(--err);">*</span> (עב)</label>
      <input id="f-length-he" class="adm-field${err.length ? " adm-field--err" : ""}" dir="rtl" value="${esc(f.lengthHe)}" placeholder="${esc(t.phLength)}">
    </div>
    <div>
      <label style="display:block;font-weight:800;font-size:0.88rem;margin-bottom:0.4rem;">${esc(t.lblLength)} <span style="color:var(--err);">*</span> (EN)</label>
      <input id="f-length-en" class="adm-field${err.length ? " adm-field--err" : ""}" dir="ltr" value="${esc(f.lengthEn)}" placeholder="e.g. 30 min">
    </div>
  </div>
  ${err.length ? `<p style="color:var(--err);font-size:0.8rem;font-weight:700;margin:-0.8rem 0 1.15rem;">${esc(err.length)}</p>` : ""}
  <div>
    <label style="display:block;font-weight:800;font-size:0.88rem;margin-bottom:0.4rem;">${esc(t.lblEmbed)} <span style="color:var(--err);">*</span></label>
    <input id="f-embed" class="adm-field${err.embed ? " adm-field--err" : ""}" dir="ltr" value="${esc(f.embedRaw)}" placeholder="https://open.spotify.com/episode/…" style="text-align:left;">
    <div id="embed-chip"></div>
    ${err.embed ? `<p style="color:var(--err);font-size:0.8rem;font-weight:700;margin:0.35rem 0 0;">${esc(err.embed)}</p>` : ""}
    <button data-action="toggle-helper" style="margin-top:0.9rem;display:flex;align-items:center;gap:0.4rem;background:transparent;border:none;cursor:pointer;font-family:inherit;font-weight:800;font-size:0.85rem;color:var(--color-accent-2);padding:0;">
      <span style="display:inline-block;transition:transform 0.2s ease;transform:${state.helperOpen ? "rotate(90deg)" : "rotate(0deg)"};">▸</span> ${esc(t.helperTitle)}
    </button>
    ${
      state.helperOpen
        ? `<ol style="margin:0.7rem 0 0;color:var(--color-text-muted);font-size:0.85rem;line-height:1.8;background:var(--color-bg);border-radius:14px;padding:0.9rem 1.4rem;">
            <li>${esc(t.help1)}</li><li>${esc(t.help2)}</li><li>${esc(t.help3)}</li><li>${esc(t.help4)}</li>
          </ol>`
        : ""
    }
  </div>`;
}

function tokenPanelHtml(t: Dict): string {
  const has = !!getToken();
  return `
  <div style="max-width:1120px;margin:0.8rem auto 0;padding:0 1.4rem;">
    <div style="background:var(--color-surface);border:1.5px solid rgba(43,163,227,0.3);border-radius:18px;padding:1.3rem 1.4rem;margin-bottom:1rem;box-shadow:0 6px 20px rgba(27,36,52,0.07);">
      <h3 style="margin:0 0 0.3rem;font-size:1rem;font-weight:900;">🔑 ${esc(t.tokenTitle)}</h3>
      <p style="margin:0 0 0.9rem;color:var(--color-text-muted);font-size:0.85rem;line-height:1.6;">${esc(t.tokenSub)}</p>
      <label style="display:block;font-weight:800;font-size:0.85rem;margin-bottom:0.4rem;">${esc(t.tokenLabel)}</label>
      <input id="token-input" class="adm-field" dir="ltr" type="password" value="${esc(getToken())}" placeholder="github_pat_…" style="text-align:left;margin-bottom:0.7rem;">
      <p id="token-status" style="margin:0 0 0.9rem;font-size:0.82rem;font-weight:700;color:${has ? "#137a44" : "var(--color-text-muted)"};">${has ? esc(t.tokenSet) : esc(t.tokenNone)}</p>
      <div style="display:flex;gap:0.6rem;flex-wrap:wrap;">
        <button data-action="save-token" class="adm-button" style="background:var(--gradient-primary);color:#fff;font-weight:800;font-size:0.88rem;padding:0.6rem 1.2rem;border-radius:999px;">${esc(t.tokenSave)}</button>
        <button data-action="verify-token" style="cursor:pointer;font-family:inherit;font-weight:700;font-size:0.85rem;border:2px solid rgba(27,36,52,0.14);background:transparent;color:var(--color-text-muted);padding:0.6rem 1.1rem;border-radius:999px;">${esc(t.tokenVerify)}</button>
        <button data-action="clear-token" style="cursor:pointer;font-family:inherit;font-weight:700;font-size:0.85rem;border:none;background:transparent;color:var(--err);padding:0.6rem 0.4rem;text-decoration:underline;">${esc(t.tokenClear)}</button>
      </div>
    </div>
  </div>`;
}

function draftsListHtml(t: Dict): string {
  if (state.drafts.length === 0) {
    return `<div style="text-align:center;padding:2.6rem 1.5rem;background:var(--color-surface);border:2px dashed rgba(27,36,52,0.12);border-radius:20px;color:var(--color-text-muted);">
      <div style="font-size:2rem;margin-bottom:0.5rem;">🌱</div>
      <p style="margin:0;font-weight:700;">${esc(t.emptyTitle)}</p>
      <p style="margin:0.3rem 0 0;font-size:0.9rem;">${esc(t.emptySub)}</p>
    </div>`;
  }
  return `<ul style="list-style:none;margin:0;padding:0;display:grid;gap:0.9rem;">
    ${state.drafts
      .map((d) => {
        const isLive = d.status === "published";
        const label = d.type === "instagram" ? t.igType : t.podType;
        const title = (state.lang === "he" ? d.titleHe : d.titleEn) || t.untitled;
        const tileBg = d.type === "instagram" ? "var(--gradient-instagram)" : "var(--gradient-podcast)";
        const thumb = d.type === "instagram" ? d.publishedImg || d.thumbUrl || d.thumbDataUrl : "";
        const statusText = isLive ? (d.dirty ? t.dirtyBadge : t.live) : t.draft;
        const statusColor = isLive ? "#137a44" : "var(--amber)";
        const statusBg = isLive ? "rgba(30,158,90,0.14)" : "rgba(217,138,0,0.14)";
        const primaryLabel = !isLive ? t.publish : d.dirty ? t.update : t.publish;
        const primaryAction = !isLive || d.dirty ? "publish" : "publish";
        return `<li style="background:var(--color-surface);border:1px solid rgba(27,36,52,0.07);border-radius:18px;padding:1.1rem 1.2rem;box-shadow:0 3px 12px rgba(27,36,52,0.05);display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">
          <span style="width:52px;height:52px;border-radius:12px;flex:none;background:${tileBg};display:flex;align-items:center;justify-content:center;font-size:1.4rem;overflow:hidden;">
            ${thumb ? `<img src="${esc(thumb)}" alt="" style="width:100%;height:100%;object-fit:cover;">` : `<span>${d.type === "instagram" ? "📸" : "🎙"}</span>`}
          </span>
          <span style="flex:1;min-width:180px;">
            <span style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
              <span style="font-weight:800;font-size:1rem;">${esc(title)}</span>
              <span style="font-size:0.72rem;font-weight:800;color:${statusColor};background:${statusBg};padding:0.2rem 0.55rem;border-radius:999px;">${esc(statusText)}</span>
            </span>
            <span style="display:block;color:var(--color-text-muted);font-size:0.82rem;margin-top:0.2rem;">${esc(formatMonth(d.month, state.lang))} · ${esc(label)}</span>
          </span>
          <span style="display:flex;gap:0.4rem;flex-wrap:wrap;align-items:center;">
            ${isLive ? `<a href="${SITE_ORIGIN}/${d.type === "instagram" ? "instagram" : "podcasts"}/" target="_blank" rel="noopener" style="font-weight:700;font-size:0.8rem;color:var(--color-accent-2);">${esc(t.viewLive)} ↗</a>` : ""}
            <button data-action="edit" data-id="${d.id}" style="background:transparent;border:2px solid rgba(27,36,52,0.12);color:var(--color-text-muted);cursor:pointer;font-family:inherit;font-weight:700;font-size:0.8rem;padding:0.45rem 0.9rem;border-radius:999px;">${esc(t.edit)}</button>
            <button data-action="${primaryAction}" data-id="${d.id}" ${state.busy ? "disabled" : ""} style="cursor:pointer;font-family:inherit;font-weight:800;font-size:0.8rem;padding:0.45rem 1rem;border-radius:999px;border:none;background:var(--gradient-primary);color:#fff;box-shadow:0 4px 12px rgba(255,139,61,0.3);opacity:${state.busy ? "0.6" : "1"};">${esc(primaryLabel)}</button>
            ${isLive ? `<button data-action="unpublish" data-id="${d.id}" ${state.busy ? "disabled" : ""} style="cursor:pointer;font-family:inherit;font-weight:800;font-size:0.8rem;padding:0.45rem 0.9rem;border-radius:999px;border:2px solid rgba(30,158,90,0.4);background:transparent;color:#137a44;">${esc(t.unpublish)}</button>` : ""}
            <button data-action="remove" data-id="${d.id}" title="${esc(t.remove)}" style="background:transparent;border:2px solid rgba(27,36,52,0.12);color:var(--color-text-muted);cursor:pointer;font-family:inherit;font-weight:700;font-size:0.8rem;padding:0.45rem 0.75rem;border-radius:999px;">✕</button>
          </span>
        </li>`;
      })
      .join("")}
  </ul>`;
}

// ---- Live preview (reads current DOM values directly; no re-render) --------
function readFormNow(): FormSeed {
  const val = (id: string) => (document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null)?.value ?? "";
  return {
    type: state.type,
    titleHe: val("f-title-he"),
    titleEn: val("f-title-en"),
    captionHe: val("f-caption-he"),
    captionEn: val("f-caption-en"),
    month: val("f-month") || currentMonth(),
    link: val("f-link"),
    thumbMode: state.thumbMode,
    thumbUrl: val("f-thumb-url"),
    thumbDataUrl: state.form.thumbDataUrl,
    thumbExt: state.form.thumbExt,
    publishedImg: state.form.publishedImg,
    epHe: val("f-ep-he"),
    epEn: val("f-ep-en"),
    lengthHe: val("f-length-he"),
    lengthEn: val("f-length-en"),
    embedRaw: val("f-embed"),
  };
}

function refreshPreview(): void {
  if (!state.authed) return;
  const pane = document.getElementById("preview-pane");
  if (!pane) return;
  const f = readFormNow();
  const t = T();
  const isIg = state.type === "instagram";
  const title = (state.lang === "he" ? f.titleHe : f.titleEn) || t.untitled;
  const caption = (state.lang === "he" ? f.captionHe : f.captionEn) || (state.lang === "he" ? "התיאור הקצר יופיע כאן…" : "Your caption will appear here…");
  const monthLabel = formatMonth(f.month, state.lang) || formatMonth(currentMonth(), state.lang);

  if (isIg) {
    const thumbSrc = f.thumbMode === "url" ? f.thumbUrl : f.thumbDataUrl;
    pane.innerHTML = `
      <li class="feed-item feed-item--instagram ls-reveal ls-in" style="margin-bottom:0;">
        <span class="badge badge-instagram">📸 ${esc(t.igType)}</span>
        <h3>${esc(title)}</h3>
        <p class="feed-item__date">${esc(monthLabel)}</p>
        <div class="embed embed-instagram">
          <span class="embed-media" style="display:flex;align-items:center;justify-content:center;aspect-ratio:4/3;background:var(--gradient-instagram);">
            ${thumbSrc ? `<img src="${esc(thumbSrc)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;">` : `<span aria-hidden="true" style="font-size:3rem;opacity:0.6;">📸</span>`}
          </span>
          <span class="embed-instagram__label">${esc(t.viewOn)}</span>
        </div>
        <p class="feed-item__caption">${esc(caption)}</p>
      </li>`;
  } else {
    const sp = parseSpotifyUrl(f.embedRaw);
    const epLabel = (state.lang === "he" ? f.epHe : f.epEn) || title;
    const lengthLabel = state.lang === "he" ? f.lengthHe : f.lengthEn;
    pane.innerHTML = `
      <li class="feed-item feed-item--podcast ls-reveal ls-in" style="margin-bottom:0;">
        <span class="badge badge-podcast">🎙 ${esc(t.podType)}</span>
        <h3>${esc(title)}</h3>
        <p class="feed-item__date">${esc(monthLabel)}${lengthLabel ? " · " + esc(lengthLabel) : ""}</p>
        <div class="embed">
          ${
            sp.status === "valid"
              ? `<iframe src="${sp.embedSrc}" width="100%" height="152" loading="lazy" style="border:0;border-radius:var(--radius);display:block;" allow="encrypted-media"></iframe>`
              : `<div style="display:flex;align-items:center;gap:1rem;padding:1rem;border-radius:var(--radius);background:linear-gradient(120deg,#12233a,#1c3a5e);color:#fff;">
                  <span style="width:74px;height:74px;border-radius:12px;flex:none;background:var(--gradient-podcast);display:flex;align-items:center;justify-content:center;font-size:1.8rem;">🎙</span>
                  <span style="flex:1;min-width:0;">
                    <span style="display:block;font-weight:800;font-size:0.98rem;line-height:1.3;">${esc(epLabel)}</span>
                    <span style="display:block;color:rgba(255,255,255,0.7);font-size:0.82rem;margin-top:0.15rem;">${esc(t.show)}</span>
                    <span style="display:flex;align-items:center;gap:0.5rem;margin-top:0.6rem;">
                      <span style="width:30px;height:30px;border-radius:999px;background:#1ed760;display:inline-flex;align-items:center;justify-content:center;color:#0b1a10;">▶</span>
                      <span style="height:5px;flex:1;border-radius:999px;background:rgba(255,255,255,0.22);"></span>
                    </span>
                  </span>
                </div>`
          }
        </div>
        <p class="feed-item__caption">${esc(caption)}</p>
      </li>`;
  }

  const chip = document.getElementById("embed-chip");
  if (chip) {
    const sp = parseSpotifyUrl(f.embedRaw);
    if (sp.status === "valid") {
      const kindWord = sp.kind === "show" ? (state.lang === "he" ? "ערוץ" : "show") : sp.kind === "playlist" ? (state.lang === "he" ? "פלייליסט" : "playlist") : state.lang === "he" ? "פרק" : "episode";
      const text = (state.lang === "he" ? "זוהה " : "Detected ") + kindWord + (state.lang === "he" ? " בספוטיפיי" : " on Spotify");
      chip.innerHTML = `<div style="display:inline-flex;align-items:center;gap:0.45rem;margin-top:0.55rem;background:rgba(30,158,90,0.12);color:#137a44;font-weight:800;font-size:0.8rem;padding:0.35rem 0.75rem;border-radius:999px;">✓ ${esc(text)}</div>`;
    } else if (sp.status === "invalid") {
      chip.innerHTML = `<div style="display:inline-flex;align-items:center;gap:0.45rem;margin-top:0.55rem;background:rgba(229,72,77,0.12);color:var(--err);font-weight:800;font-size:0.8rem;padding:0.35rem 0.75rem;border-radius:999px;">✕ ${esc(t.embedBadChip)}</div>`;
    } else {
      chip.innerHTML = "";
    }
  }
}

// ---- Validation + submit -----------------------------------------------------
function validate(f: FormSeed): Record<string, string> {
  const t = T();
  const e: Record<string, string> = {};
  if (!f.titleHe.trim()) e.titleHe = t.errRequired;
  if (!f.titleEn.trim()) e.titleEn = t.errRequired;
  if (!f.month) e.month = t.errRequired;
  if (!f.captionHe.trim()) e.captionHe = t.errRequired;
  if (!f.captionEn.trim()) e.captionEn = t.errRequired;
  if (f.type === "instagram") {
    if (!f.link.trim()) e.link = t.errLink;
    const hasThumb = f.thumbMode === "upload" ? !!f.thumbDataUrl : !!f.thumbUrl.trim();
    if (!hasThumb) e.thumb = t.errThumb;
  } else {
    if (!f.epHe.trim() || !f.epEn.trim()) e.ep = t.errEp;
    if (!f.lengthHe.trim() || !f.lengthEn.trim()) e.length = t.errLength;
    if (parseSpotifyUrl(f.embedRaw).status !== "valid") e.embed = t.errSpotify;
  }
  return e;
}

function submitForm(): void {
  const f = readFormNow();
  const errors = validate(f);
  state.form = f;
  if (Object.keys(errors).length) {
    state.errors = errors;
    render();
    return;
  }

  const existing = state.editId ? state.drafts.find((d) => d.id === state.editId) : null;
  const item: DraftItem = {
    ...f,
    id: existing?.id ?? uid(),
    status: existing?.status ?? "draft",
    dirty: existing ? existing.status === "published" : false,
  };

  if (state.editId) {
    state.drafts = state.drafts.map((d) => (d.id === state.editId ? item : d));
  } else {
    state.drafts = [item, ...state.drafts];
  }
  save();

  state.editId = null;
  state.errors = {};
  state.form = blankForm();
  state.form.type = state.type;
  state.thumbMode = "upload";
  flash("ok", state.lang === "he" ? "נשמר! אפשר לפרסם מתי שנוח." : "Saved! Publish whenever you're ready.");
  render();
}

function loadDraftForEdit(id: string): void {
  const d = state.drafts.find((x) => x.id === id);
  if (!d) return;
  state.editId = id;
  state.type = d.type;
  state.thumbMode = d.thumbMode;
  state.form = { ...d };
  state.errors = {};
  state.previewOpen = true;
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ---- Publish / unpublish / remove -------------------------------------------
function extFromMime(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  return "jpg";
}

async function publishDraft(id: string): Promise<void> {
  const t = T();
  if (!getToken()) {
    flash("err", t.errTokenMissing);
    state.tokenPanelOpen = true;
    render();
    return;
  }
  const draft = state.drafts.find((d) => d.id === id);
  if (!draft) return;

  state.busy = true;
  render();
  try {
    const cfg = ghConfig();
    let imgPath = draft.publishedImg;

    if (draft.type === "instagram" && draft.thumbMode === "upload" && draft.thumbDataUrl) {
      const ext = draft.thumbExt || extFromMime(draft.thumbDataUrl.slice(5, draft.thumbDataUrl.indexOf(";")));
      const path = `${IMAGE_DIR}/${draft.id}.${ext}`;
      await writeBinaryFile(cfg, path, stripDataUrlPrefix(draft.thumbDataUrl), `Add thumbnail for ${draft.titleEn || draft.titleHe}`);
      imgPath = `/assets/feed/${draft.id}.${ext}`;
    }

    if (draft.type === "instagram") {
      const post: Post = {
        id: draft.id,
        title: { he: draft.titleHe, en: draft.titleEn },
        date: { he: formatMonth(draft.month, "he"), en: formatMonth(draft.month, "en") },
        link: draft.link,
        caption: { he: draft.captionHe, en: draft.captionEn },
        ...(draft.thumbMode === "url" && draft.thumbUrl ? { img: draft.thumbUrl } : imgPath ? { img: imgPath } : {}),
      };
      await writeJsonFile<Post[]>(cfg, PATH_INSTAGRAM, `Publish Instagram post: ${draft.titleEn || draft.titleHe}`, (current) => {
        const list = current ?? [];
        const idx = list.findIndex((p) => p.id === draft.id);
        if (idx === -1) return [post, ...list];
        const next = [...list];
        next[idx] = post;
        return next;
      });
    } else {
      const episode: Episode = {
        id: draft.id,
        title: { he: draft.titleHe, en: draft.titleEn },
        ep: { he: draft.epHe, en: draft.epEn },
        date: { he: formatMonth(draft.month, "he"), en: formatMonth(draft.month, "en") },
        length: { he: draft.lengthHe, en: draft.lengthEn },
        caption: { he: draft.captionHe, en: draft.captionEn },
        embedUrl: draft.embedRaw,
      };
      await writeJsonFile<Episode[]>(cfg, PATH_PODCAST, `Publish podcast episode: ${draft.titleEn || draft.titleHe}`, (current) => {
        const list = current ?? [];
        const idx = list.findIndex((e) => e.id === draft.id);
        if (idx === -1) return [episode, ...list];
        const next = [...list];
        next[idx] = episode;
        return next;
      });
    }

    state.drafts = state.drafts.map((d) => (d.id === id ? { ...d, status: "published", dirty: false, publishedImg: imgPath } : d));
    save();
    flash("ok", t.publishedMsg);
  } catch (err) {
    flash("err", friendlyError(err));
  } finally {
    state.busy = false;
    render();
  }
}

async function unpublishDraft(id: string): Promise<void> {
  const t = T();
  if (!getToken()) {
    flash("err", t.errTokenMissing);
    state.tokenPanelOpen = true;
    render();
    return;
  }
  const draft = state.drafts.find((d) => d.id === id);
  if (!draft) return;

  state.busy = true;
  render();
  try {
    const cfg = ghConfig();
    const path = draft.type === "instagram" ? PATH_INSTAGRAM : PATH_PODCAST;
    await writeJsonFile<(Post | Episode)[]>(cfg, path, `Unpublish: ${draft.titleEn || draft.titleHe}`, (current) => (current ?? []).filter((item) => item.id !== id));
    state.drafts = state.drafts.map((d) => (d.id === id ? { ...d, status: "draft", dirty: false } : d));
    save();
    flash("info", t.unpublishedMsg);
  } catch (err) {
    flash("err", friendlyError(err));
  } finally {
    state.busy = false;
    render();
  }
}

async function removeDraft(id: string): Promise<void> {
  const draft = state.drafts.find((d) => d.id === id);
  if (!draft) return;
  if (draft.status === "published") {
    const ok = confirm(state.lang === "he" ? "הפריט מפורסם באתר. למחוק אותו גם מהאתר?" : "This item is live on the site. Delete it from the site too?");
    if (!ok) return;
    await unpublishDraft(id);
  }
  state.drafts = state.drafts.filter((d) => d.id !== id);
  save();
  flash("info", T().deletedMsg);
  render();
}

// ---- Token panel actions ------------------------------------------------------
async function saveToken(): Promise<void> {
  const input = document.getElementById("token-input") as HTMLInputElement | null;
  const value = input?.value.trim() ?? "";
  try {
    if (value) localStorage.setItem(LS_TOKEN, value);
    else localStorage.removeItem(LS_TOKEN);
  } catch {
    /* ignore */
  }
  render();
}

function clearToken(): void {
  try {
    localStorage.removeItem(LS_TOKEN);
  } catch {
    /* ignore */
  }
  render();
}

async function verifyToken(): Promise<void> {
  const t = T();
  const status = document.getElementById("token-status");
  if (!status) return;
  const token = getToken();
  if (!token) {
    status.textContent = t.tokenNone;
    return;
  }
  status.textContent = t.tokenVerifying;
  try {
    await verifyAccess(ghConfig());
    status.textContent = t.tokenOk;
    (status as HTMLElement).style.color = "#137a44";
  } catch (err) {
    status.textContent = friendlyError(err);
    (status as HTMLElement).style.color = "var(--err)";
  }
}

// ---- Thumbnail file handling ---------------------------------------------------
function handleThumbFile(file: File): void {
  const reader = new FileReader();
  reader.onload = () => {
    state.form.thumbDataUrl = reader.result as string;
    state.form.thumbExt = extFromMime(file.type);
    render();
  };
  reader.readAsDataURL(file);
}

// ---- Event delegation ---------------------------------------------------------
root.addEventListener("click", (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>("[data-action]");
  if (!el) return;
  const action = el.dataset.action;
  const id = el.dataset.id;
  switch (action) {
    case "enter-gate": {
      try {
        localStorage.setItem(LS_AUTHED, "1");
      } catch {
        /* ignore */
      }
      state.authed = true;
      render();
      break;
    }
    case "sign-out":
      try {
        localStorage.setItem(LS_AUTHED, "0");
      } catch {
        /* ignore */
      }
      state.authed = false;
      render();
      break;
    case "toggle-lang": {
      const next: Lang = state.lang === "he" ? "en" : "he";
      state.lang = next;
      try {
        localStorage.setItem(LS_LANG, next);
      } catch {
        /* ignore */
      }
      render();
      break;
    }
    case "toggle-token-panel":
      state.tokenPanelOpen = !state.tokenPanelOpen;
      render();
      break;
    case "save-token":
      void saveToken();
      break;
    case "clear-token":
      clearToken();
      break;
    case "verify-token":
      void verifyToken();
      break;
    case "pick-instagram":
      state.form = { ...readFormNow(), type: "instagram" };
      state.type = "instagram";
      state.errors = {};
      render();
      break;
    case "pick-podcast":
      state.form = { ...readFormNow(), type: "podcast" };
      state.type = "podcast";
      state.errors = {};
      render();
      break;
    case "pick-upload":
      state.form = readFormNow();
      state.thumbMode = "upload";
      render();
      break;
    case "pick-url":
      state.form = readFormNow();
      state.thumbMode = "url";
      render();
      break;
    case "toggle-helper":
      state.form = readFormNow();
      state.helperOpen = !state.helperOpen;
      render();
      break;
    case "toggle-preview":
      state.form = readFormNow();
      state.previewOpen = !state.previewOpen;
      render();
      break;
    case "submit":
      submitForm();
      break;
    case "reset-form":
      state.editId = null;
      state.errors = {};
      state.form = blankForm();
      state.form.type = state.type;
      state.thumbMode = "upload";
      render();
      break;
    case "cancel-edit":
      state.editId = null;
      state.errors = {};
      state.form = blankForm();
      state.form.type = state.type;
      state.thumbMode = "upload";
      render();
      break;
    case "edit":
      if (id) loadDraftForEdit(id);
      break;
    case "publish":
      if (id) void publishDraft(id);
      break;
    case "unpublish":
      if (id) void unpublishDraft(id);
      break;
    case "remove":
      if (id) void removeDraft(id);
      break;
  }
});

root.addEventListener("input", (e) => {
  const el = e.target as HTMLElement;
  if (el.id === "f-thumb-file") return; // handled by change
  if (
    ["f-title-he", "f-title-en", "f-caption-he", "f-caption-en", "f-month", "f-link", "f-thumb-url", "f-ep-he", "f-ep-en", "f-length-he", "f-length-en", "f-embed"].includes(el.id)
  ) {
    refreshPreview();
    el.classList.remove("adm-field--err");
  }
});

root.addEventListener("change", (e) => {
  const el = e.target as HTMLInputElement;
  if (el.id === "f-thumb-file" && el.files && el.files[0]) {
    handleThumbFile(el.files[0]);
  }
});

root.addEventListener("click", (e) => {
  const dz = (e.target as HTMLElement).closest<HTMLElement>("#thumb-dropzone");
  if (dz) {
    const input = dz.querySelector<HTMLInputElement>("#f-thumb-file");
    input?.click();
  }
});

root.addEventListener("dragover", (e) => {
  if ((e.target as HTMLElement).closest("#thumb-dropzone")) e.preventDefault();
});
root.addEventListener("drop", (e) => {
  const dz = (e.target as HTMLElement).closest<HTMLElement>("#thumb-dropzone");
  if (!dz) return;
  e.preventDefault();
  const file = (e as DragEvent).dataTransfer?.files?.[0];
  if (file) handleThumbFile(file);
});

boot();
