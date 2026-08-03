"use client";

type TrustItem = {
  title: string;
  description: string;
  icon: string;
  accent: string;
  glow: string;
};

const trustItems: TrustItem[] = [
  {
    title: "Veteran Owned",
    description:
      "Built with discipline, accountability, and a commitment to reliable service.",
    icon: "★",
    accent: "#ff45d8",
    glow: "rgba(255,69,216,.22)",
  },
  {
    title: "Third-Party Tested",
    description:
      "Quality documentation and testing information are available for qualifying compounds.",
    icon: "✓",
    accent: "#00d9ff",
    glow: "rgba(0,217,255,.22)",
  },
  {
    title: "Fast Delivery",
    description:
      "Choose Standard or Express delivery based on your preferred timeline.",
    icon: "↗",
    accent: "#00ff99",
    glow: "rgba(0,255,153,.20)",
  },
  {
    title: "Dedicated Support",
    description:
      "Get help through Discord, Telegram, email, and direct customer support.",
    icon: "◆",
    accent: "#ffd166",
    glow: "rgba(255,209,102,.20)",
  },
];

export default function WhyPugPep() {
  return (
    <section
      aria-labelledby="why-pugpep-title"
      style={section}
    >
      <div style={container}>
        <header style={header}>
          <p style={eyebrow}>
            WHY PUGPEP
          </p>

          <h2
            id="why-pugpep-title"
            style={title}
          >
            Built on Trust
          </h2>

          <p style={subtitle}>
            A cleaner, more transparent experience from discovery through delivery.
          </p>
        </header>

        <div style={grid}>
          {trustItems.map(
            (
              item
            ) => (
              <article
                key={
                  item.title
                }
                style={{
                  ...card,
                  borderColor:
                    `${item.accent}66`,
                  boxShadow:
                    `0 0 22px ${item.glow}`,
                }}
              >
                <span
                  style={{
                    ...iconWrap,
                    color:
                      item.accent,
                    borderColor:
                      `${item.accent}88`,
                    background:
                      `${item.accent}12`,
                    boxShadow:
                      `0 0 16px ${item.glow}`,
                  }}
                >
                  {item.icon}
                </span>

                <h3
                  style={{
                    ...cardTitle,
                    color:
                      item.accent,
                  }}
                >
                  {item.title}
                </h3>

                <p style={description}>
                  {item.description}
                </p>
              </article>
            )
          )}
        </div>
      </div>

      <style jsx>{`
        article {
          transition:
            transform 180ms ease,
            border-color 180ms ease,
            box-shadow 180ms ease;
        }

        article:hover {
          transform: translateY(-4px);
        }

        @media (prefers-reduced-motion: reduce) {
          article {
            transition: none !important;
          }

          article:hover {
            transform: none !important;
          }
        }
      `}</style>
    </section>
  );
}

const section = {
  padding:
    "clamp(68px, 9vw, 112px) clamp(18px, 4vw, 52px)",
  background:
    "radial-gradient(circle at 15% 15%, rgba(0,217,255,.07), transparent 30%), linear-gradient(180deg, #020203 0%, #060609 100%)",
  color: "#ffffff",
};

const container = {
  width: "100%",
  maxWidth: 1320,
  margin: "0 auto",
};

const header = {
  maxWidth: 760,
  marginBottom: 30,
};

const eyebrow = {
  margin: 0,
  color: "#ff45d8",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: ".15em",
};

const title = {
  margin: "7px 0 0",
  color: "#ffffff",
  fontSize:
    "clamp(32px, 6vw, 52px)",
  letterSpacing: "-.035em",
};

const subtitle = {
  margin: "10px 0 0",
  color: "#a7a7af",
  fontSize: 16,
  lineHeight: 1.65,
};

const grid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(min(100%, 250px), 1fr))",
  gap: 16,
};

const card = {
  minHeight: 220,
  padding: 20,
  display: "grid",
  alignContent: "start",
  gap: 14,
  border: "1px solid",
  borderRadius: 16,
  background:
    "linear-gradient(145deg, rgba(13,13,18,.96), rgba(7,7,10,.96))",
};

const iconWrap = {
  width: 50,
  height: 50,
  display: "grid",
  placeItems: "center",
  border: "1px solid",
  borderRadius: 13,
  fontSize: 22,
  fontWeight: 900,
};

const cardTitle = {
  margin: 0,
  fontSize: 20,
};

const description = {
  margin: 0,
  color: "#a8a8b0",
  fontSize: 14,
  lineHeight: 1.65,
};