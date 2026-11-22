export const FREEMAIL = ["gmail.com", "azet.sk", "centrum.sk", "post.sk", "zoznam.sk", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "pobox.sk"];

export function emailProblem(email: string): string | null {
  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) return "Skontroluj e-mail, chýba v ňom zavináč alebo doména.";
  const domain = email.split("@")[1].toLowerCase();
  if (FREEMAIL.includes(domain)) return "Na overenie použi školský alebo firemný e-mail, napríklad meno@euba.sk.";
  return null;
}
