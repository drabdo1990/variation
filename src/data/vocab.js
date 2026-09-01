/**
 * Fixed vocabulary the app is built around. These are the choices offered
 * in forms — unlike people, projects, and tasks, they are not user data.
 */

export const GUILDS = {
  web: "Web",
  platform: "Platform",
  product: "Product Design",
  quality: "Quality",
  ops: "Operations",
};

export const PRESENCE = {
  onsite: { label: "Onsite", tone: "success" },
  remote: { label: "Remote", tone: "primary" },
  away: { label: "Away", tone: "neutral" },
};

export const PROJECT_PHASES = {
  discovery: { label: "Discovery", tone: "neutral" },
  building: { label: "Building", tone: "primary" },
  hardening: { label: "Hardening", tone: "warning" },
  shipped: { label: "Shipped", tone: "success" },
  paused: { label: "Paused", tone: "danger" },
};

export const BOARD_LANES = [
  { id: "backlog", label: "Backlog" },
  { id: "active", label: "In Flight" },
  { id: "review", label: "In Review" },
  { id: "shipped", label: "Shipped" },
];

export const URGENCY = {
  critical: { label: "Critical", tone: "danger" },
  normal: { label: "Normal", tone: "warning" },
  low: { label: "Low", tone: "neutral" },
};

export const HEALTH = {
  steady: { label: "Steady", tone: "success" },
  watch: { label: "Watch", tone: "warning" },
  behind: { label: "Behind", tone: "danger" },
  overdue: { label: "Overdue", tone: "danger" },
  paused: { label: "Paused", tone: "neutral" },
  done: { label: "Delivered", tone: "success" },
  empty: { label: "No tasks", tone: "neutral" },
};
