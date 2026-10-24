import type { RegisterInput } from "@/types";

export type FieldErrors<T extends string = string> = Partial<Record<T, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLogin(username: string, password: string): FieldErrors<"username" | "password"> {
  const e: FieldErrors<"username" | "password"> = {};
  if (!username.trim()) e.username = "Enter your username.";
  if (!password) e.password = "Enter your password.";
  return e;
}

export type RegisterForm = Omit<RegisterInput, "age" | "preferences"> & { age: string; confirm: string; preferences: string[] };
export type RegisterField = keyof RegisterForm;

/** Mirrors the backend rules (letters+numbers username, 6–128 char password). */
export function validateRegister(f: RegisterForm): FieldErrors<RegisterField> {
  const e: FieldErrors<RegisterField> = {};
  if (!/^[a-zA-Z0-9]+$/.test(f.username)) e.username = "Use letters and numbers only, with no spaces.";
  else if (f.username.length < 3) e.username = "Use at least 3 characters.";
  if (!f.first_name.trim()) e.first_name = "Enter your first name.";
  if (!f.last_name.trim()) e.last_name = "Enter your last name.";
  if (!EMAIL.test(f.email)) e.email = "Enter a valid email address, like name@example.com.";
  if (f.password.length < 6) e.password = "Use at least 6 characters.";
  else if (f.password.length > 128) e.password = "Use 128 characters or fewer.";
  if (f.confirm !== f.password) e.confirm = "Passwords don't match.";
  const age = Number(f.age);
  if (!f.age || !Number.isInteger(age) || age < 13 || age > 120) e.age = "Enter an age between 13 and 120.";
  if (!f.gender) e.gender = "Choose an option.";
  return e;
}

export const hasErrors = (e: object): boolean => Object.keys(e).length > 0;
