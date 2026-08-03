"use client";

import Link from "next/link";

type CommunityCard = {
  title: string;
  description: string;
  action: string;
  href: string;
  icon: string;
  accent: string;
  glow: string;
  external?: boolean;
};

const communityCards: CommunityCard[] = [
  {
    title: "Discord Community",
    description:
      "Join announcements, product updates, support conversations, and member discussions.",
    action: "Join Discord",
    href: "https://discord.gg/yas8DetFz",
    icon: "D",
    accent: "#7b8cff",
    glow: "rgba(123,140,255,.22)",
    external: true,
  },
  {
    title: "PugPoints",
    description:
      "Earn points on qualifying orders and apply them toward future savings.",
    action: "View My Lab",
    href: "/account",
    icon: "P",
    accent: "#00ff99",
    glow: "rgba(0,255,153,.20)",
  },
  {
    title: "Lab Status",
    description:
      "Track your current tier, benefits, lifetime activity, and progress toward the next level.",
    action: "Check Status",
    href: "/account",
    icon: "L",
    accent: "#ffd166",
    glow: "rgba(255,209,102,.20)",
  },
  {
    title: "Customer Support",
    description:
      "Reach the team through email, Discord, Telegram, or the contact page.",
    action: "Contact Support",
    href: "/contact",
    icon: "S",
    accent: "#00d9ff",
    glow: "rgba(0,217,255,.22)",
  },
];

export default function CommunitySection() {
  return (
    <section
      aria-labelledby="community-title"
      style={section}
    >
      <div style={container}>
        <header style={header}>
          <p style={eyebrow}>
            PUGPEP COMMUNITY
          </p>

          <h2
            id="community-title"
            style={title}
          >
            More Than a Catalog
          </h2>

          <p style={subtitle}>
            Stay connected, track your benefits, and get support whenever you need it.
          </p>
        </header>

        <div style={grid}>
          {communityCards.map(
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
                  }}
                >
                  {item.icon}
                </span>

                <div style={cardBody}>
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
                </div>

                {item.external ? (
                  <a
                    href={
                      item.href
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      ...actionButton,
                      borderColor:
                        `${item.accent}88`,
                      color:
                        item.accent,
                      background:
                        `${item.accent}10`,
                    }}
                  >
                    {item.action}
                  </a>
                ) : (
                  <Link
                    href={
                      item.href
                    }
                    style={{
                      ...actionButton,
                      borderColor:
                        `${item.accent}88`,
                      color:
                        item.accent,
                      background:
                        `${item.accent}10`,
                    }}
                  >
                    {item.action}
                  </Link>
                )}
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
    "radial-gradient(circle at 80% 15%, rgba(255,47,208,.08), transparent 30%), linear-gradient(180deg, #060609 0%, #020203 100%)",
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
  color: "#00d9ff",
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
    "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
  gap: 16,
};

const card = {
  minHeight: 270,
  padding: 20,
  display: "grid",
  gridTemplateRows:
    "auto 1fr auto",
  gap: 16,
  border: "1px solid",
  borderRadius: 17,
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

const cardBody = {
  display: "grid",
  alignContent: "start",
  gap: 10,
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

const actionButton = {
  minHeight: 44,
  padding: "10px 14px",
  display: "grid",
  placeItems: "center",
  border: "1px solid",
  borderRadius: 10,
  textDecoration: "none",
  fontWeight: 900,
};