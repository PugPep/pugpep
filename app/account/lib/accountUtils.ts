export function money(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export function formatDate(value?: string | null) {
  if (!value) {
    return "Date unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getTierTheme(tier: string) {
  const normalized = tier.trim().toLowerCase();

  const themes: Record<
    string,
    {
      color: string;
      border: string;
      glow: string;
      background: string;
    }
  > = {
    stone: {
      color: "#b8bcc4",
      border: "#b8bcc4",
      glow: "rgba(184,188,196,.4)",
      background:
        "linear-gradient(135deg, rgba(184,188,196,.14), rgba(0,217,255,.07))",
    },
    iron: {
      color: "#8f9aa8",
      border: "#8f9aa8",
      glow: "rgba(143,154,168,.46)",
      background:
        "linear-gradient(135deg, rgba(143,154,168,.18), rgba(0,217,255,.07))",
    },
    bronze: {
      color: "#cd7f32",
      border: "#cd7f32",
      glow: "rgba(205,127,50,.5)",
      background:
        "linear-gradient(135deg, rgba(205,127,50,.20), rgba(255,47,208,.08))",
    },
    silver: {
      color: "#d8dde6",
      border: "#d8dde6",
      glow: "rgba(216,221,230,.52)",
      background:
        "linear-gradient(135deg, rgba(216,221,230,.18), rgba(0,217,255,.09))",
    },
    gold: {
      color: "#ffd700",
      border: "#ffd700",
      glow: "rgba(255,215,0,.55)",
      background:
        "linear-gradient(135deg, rgba(255,215,0,.22), rgba(255,47,208,.09))",
    },
    platinum: {
      color: "#e5e4e2",
      border: "#e5e4e2",
      glow: "rgba(229,228,226,.58)",
      background:
        "linear-gradient(135deg, rgba(229,228,226,.20), rgba(0,217,255,.10))",
    },
    emerald: {
      color: "#00ff99",
      border: "#00ff99",
      glow: "rgba(0,255,153,.56)",
      background:
        "linear-gradient(135deg, rgba(0,255,153,.20), rgba(0,217,255,.10))",
    },
    sapphire: {
      color: "#2f80ff",
      border: "#2f80ff",
      glow: "rgba(47,128,255,.58)",
      background:
        "linear-gradient(135deg, rgba(47,128,255,.22), rgba(255,47,208,.09))",
    },
    ruby: {
      color: "#ff3b5c",
      border: "#ff3b5c",
      glow: "rgba(255,59,92,.58)",
      background:
        "linear-gradient(135deg, rgba(255,59,92,.22), rgba(255,47,208,.10))",
    },
    diamond: {
      color: "#7df9ff",
      border: "#7df9ff",
      glow: "rgba(125,249,255,.65)",
      background:
        "linear-gradient(135deg, rgba(125,249,255,.22), rgba(255,47,208,.12))",
    },
  };

  return (
    themes[normalized] || {
      color: "#ff45d8",
      border: "#ff45d8",
      glow: "rgba(255,69,216,.52)",
      background:
        "linear-gradient(135deg, rgba(255,69,216,.16), rgba(0,217,255,.10))",
    }
  );
}

export function getTierThresholds() {
  return [
    { name: "Stone", amount: 0 },
    { name: "Iron", amount: 250 },
    { name: "Bronze", amount: 500 },
    { name: "Silver", amount: 1000 },
    { name: "Gold", amount: 2500 },
    { name: "Platinum", amount: 5000 },
    { name: "Emerald", amount: 10000 },
    { name: "Sapphire", amount: 20000 },
    { name: "Ruby", amount: 35000 },
    { name: "Diamond", amount: 50000 },
  ];
}

export function getTierProgress(
  currentTier: string,
  lifetimeSpend: number
) {
  const tiers = getTierThresholds();

  const index = Math.max(
    0,
    tiers.findIndex(
      (tier) =>
        tier.name.toLowerCase() ===
        currentTier.toLowerCase()
    )
  );

  const current = tiers[index] || tiers[0];
  const next = tiers[index + 1] || null;

  if (!next) {
    return {
      percent: 100,
      remaining: 0,
      nextTier: "Top Tier",
    };
  }

  const span = next.amount - current.amount;
  const progress = lifetimeSpend - current.amount;

  const percent =
    span > 0
      ? Math.max(
          0,
          Math.min(
            100,
            (progress / span) * 100
          )
        )
      : 100;

  return {
    percent,
    remaining: Math.max(
      0,
      next.amount - lifetimeSpend
    ),
    nextTier: next.name,
  };
}
