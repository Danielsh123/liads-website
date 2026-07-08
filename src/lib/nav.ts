/** A single sticky-nav link. Shared by the layout, the Nav component and pages. */
export interface LandingNavLink {
  href: string;
  /** Hebrew label (rendered by default). */
  label: string;
  /** English label, applied by the language toggle. */
  en: string;
  active?: boolean;
}
