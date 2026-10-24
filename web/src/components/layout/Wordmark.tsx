import { Link } from "react-router-dom";

/** Original Mablytic wordmark (type only — no borrowed logos or marks). */
export function Wordmark({ size = "lg" }: { size?: "sm" | "lg" }) {
  return (
    <Link
      to="/"
      aria-label="Mablytic home"
      className={`font-headline font-bold tracking-tight text-ink ${size === "lg" ? "text-4xl sm:text-5xl md:text-6xl" : "text-2xl"}`}
    >
      Mablytic
    </Link>
  );
}
