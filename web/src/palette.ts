import type { Color } from "./api/client";

/** Hex values for the API's palette keys, with a text color that keeps contrast readable. */
export const PALETTE: Record<Color, { background: string; text: string }> = {
  yellow: { background: "#f5d90a", text: "#1f1f1f" },
  orange: { background: "#f59e0b", text: "#1f1f1f" },
  red: { background: "#dc2626", text: "#ffffff" },
  pink: { background: "#ec4899", text: "#1f1f1f" },
  purple: { background: "#7c3aed", text: "#ffffff" },
  blue: { background: "#2563eb", text: "#ffffff" },
  teal: { background: "#0d9488", text: "#ffffff" },
  green: { background: "#16a34a", text: "#ffffff" },
  gray: { background: "#6b7280", text: "#ffffff" },
  brown: { background: "#92400e", text: "#ffffff" },
};

export const COLORS = Object.keys(PALETTE) as Color[];

export function swatch(color: string): { background: string; text: string } {
  return PALETTE[color as Color] ?? PALETTE.gray;
}
