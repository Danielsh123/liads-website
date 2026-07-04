/** Format a date the way the rest of the site does — Hebrew long form. */
export function readableDate(date: Date): string {
  return new Intl.DateTimeFormat("he-IL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}
