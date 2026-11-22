export const FREEMAIL = ["gmail.com", "azet.sk", "centrum.sk", "post.sk", "zoznam.sk", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "pobox.sk"];

export function emailProblem(email: string): string | null {
  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) return "Skontroluj e-mail, chýba v ňom zavináč alebo doména.";
  return null;
}

/** Bežná schránka (Gmail a pod.) je povolená, ale profil nedostane odznak overenia. */
export function isFreemail(email: string): boolean {
  return FREEMAIL.includes((email.split("@")[1] ?? "").toLowerCase());
}
