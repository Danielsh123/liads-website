export interface NavItem {
  text: string;
  url: string;
}

export interface SiteConfig {
  title: string;
  tagline: string;
  author: string;
  email: string;
  nav: NavItem[];
}

/** Site-wide config (was src/_data/site.json under Eleventy). */
export const site: SiteConfig = {
  title: "ליעד",
  tagline: "ברוכים הבאים לאתר האישי שלי.",
  author: "ליעד",
  email: "hello@example.com",
  nav: [
    { text: "בית", url: "/" },
    { text: "עבודות", url: "/work/" },
    { text: "פודקאסטים", url: "/podcasts/" },
    { text: "אינסטגרם", url: "/instagram/" },
    { text: "אודות", url: "/about/" },
    { text: "צור קשר", url: "/contact/" },
  ],
};
