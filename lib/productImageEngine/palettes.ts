import type {
  CyberPalette,
} from "./types";

export const CYBER_PALETTES: CyberPalette[] = [
  {
    key: "neon-pink",
    primary: "#ff45d8",
    secondary: "#7df9ff",
    glow: "#ff45d8",
  },
  {
    key: "electric-cyan",
    primary: "#00d9ff",
    secondary: "#00ff99",
    glow: "#00d9ff",
  },
  {
    key: "acid-green",
    primary: "#00ff99",
    secondary: "#7df9ff",
    glow: "#00ff99",
  },
  {
    key: "ultraviolet",
    primary: "#a855f7",
    secondary: "#ff45d8",
    glow: "#a855f7",
  },
  {
    key: "plasma-orange",
    primary: "#ff7a18",
    secondary: "#ff45d8",
    glow: "#ff7a18",
  },
  {
    key: "laser-blue",
    primary: "#3b82f6",
    secondary: "#7df9ff",
    glow: "#3b82f6",
  },
  {
    key: "cyber-lime",
    primary: "#b7ff00",
    secondary: "#00d9ff",
    glow: "#b7ff00",
  },
  {
    key: "hot-magenta",
    primary: "#ff1493",
    secondary: "#a855f7",
    glow: "#ff1493",
  },
];

function stableHash(
  value: string
): number {
  let hash =
    2166136261;

  for (
    let index = 0;
    index < value.length;
    index += 1
  ) {
    hash ^=
      value.charCodeAt(
        index
      );

    hash =
      Math.imul(
        hash,
        16777619
      );
  }

  return hash >>> 0;
}

export function paletteForSlug(
  slug: string
): CyberPalette {
  const index =
    stableHash(
      slug
    ) %
    CYBER_PALETTES.length;

  return CYBER_PALETTES[
    index
  ];
}

export function paletteByKey(
  key: string
): CyberPalette | null {
  return (
    CYBER_PALETTES.find(
      (
        palette
      ) =>
        palette.key ===
        key
    ) || null
  );
}