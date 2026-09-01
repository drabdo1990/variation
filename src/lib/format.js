const DAY = 86_400_000;

/** "Mohamed Mansour" -> "MM". Used by the generated avatars. */
export function initials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

/**
 * Deterministic hue from a string, so a given person always gets the
 * same avatar colour without storing one on the record.
 */
export function hueFrom(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 360;
  }
  return hash;
}

export function shortDate(iso) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export function longDate(iso) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Compact relative time: "just now", "4h ago", "3d ago". */
export function relativeTime(iso, now = new Date()) {
  const diff = now.getTime() - new Date(iso).getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return shortDate(iso);
}

/**
 * Days until a date, as a phrase. Negative values read as overdue so the
 * caller never has to special-case the sign.
 */
export function duePhrase(iso, now = new Date()) {
  const days = Math.ceil((new Date(iso).getTime() - now.getTime()) / DAY);
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, overdue: true };
  if (days === 0) return { text: "Due today", overdue: false, urgent: true };
  if (days === 1) return { text: "Due tomorrow", overdue: false, urgent: true };
  if (days <= 7) return { text: `${days}d left`, overdue: false, urgent: true };
  return { text: shortDate(iso), overdue: false };
}

export function greetingFor(now = new Date()) {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
