"use client";

import { useRouter } from "next/navigation";

type ResearchCollection = {
  title: string;
  description: string;
  icon: string;
  accent: string;
  glow: string;
  query: string;
};

const collections: ResearchCollection[] = [
  {
    title: "Metabolic Systems",
    description:
      "Explore compounds studied across energy balance, signaling, and metabolic pathways.",
    icon: "M",
    accent: "#ff45d8",
    glow: "rgba(255,69,216,.24)",
    query: "metabolic",
  },
  {
    title: "Cellular Signaling",
    description:
      "Investigate pathways involved in communication, regulation, and cellular response.",
    icon: "C",
    accent: "#00d9ff",
    glow: "rgba(0,217,255,.24)",
    query: "cellular",
  },
  {
    title: "Neural Pathways",
    description:
      "Browse compounds associated with cognition, signaling, and neurological models.",
    icon: "N",
    accent: "#8f7cff",
    glow: "rgba(143,124,255,.24)",
    query: "neural",
  },
  {
    title: "Regenerative Science",
    description:
      "Discover materials studied in tissue models, repair signaling, and cellular recovery.",
    icon: "R",
    accent: "#00ff99",
    glow: "rgba(0,255,153,.22)",
    query: "regenerative",
  },
  {
    title: "Longevity & Senescence",
    description:
      "Explore compounds used in aging, resilience, and cellular longevity research.",
    icon: "L",
    accent: "#ffd166",
    glow: "rgba(255,209,102,.22)",
    query: "longevity",
  },
  {
    title: "Mitochondrial Function",
    description:
      "Investigate compounds studied in energy production and mitochondrial pathways.",
    icon: "µ",
    accent: "#ff7a59",
    glow: "rgba(255,122,89,.22)",
    query: "mitochondrial",
  },
  {
    title: "Endocrine Signaling",
    description:
      "Browse compounds associated with hormonal pathways and receptor signaling.",
    icon: "E",
    accent: "#7df9ff",
    glow: "rgba(125,249,255,.22)",
    query: "endocrine",
  },
  {
    title: "Full Research Library",
    description:
      "View the complete catalog and explore every available compound.",
    icon: "∞",
    accent: "#ffffff",
    glow: "rgba(255,255,255,.16)",
    query: "",
  },
];

export default function ResearchCollections() {
  const router = useRouter();

  function openCollection(query: string) {
    const target = query
      ? `/?collection=${encodeURIComponent(query)}#laboratory`
      : "/#laboratory";

    router.push(target);

    window.setTimeout(() => {
      document
        .getElementById("laboratory")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 60);
  }

  return (
    <section
      aria-labelledby="research-collections-title"
      style={section}
    >
      <div style={container}>
        <header style={header}>
          <div>
            <p style={eyebrow}>
              RESEARCH COLLECTIONS
            </p>

            <h2
              id="research-collections-title"
              style={title}
            >
              Choose Your Path
            </h2>

            <p style={subtitle}>
              Explore the catalog through focused scientific disciplines.
            </p>
          </div>

          <button
            type="button"
            onClick={() => openCollection("")}
            style={viewAllButton}
          >
            View Full Library
          </button>
        </header>

        <div style={grid}>
          {collections.map((collection) => (
            <button
              key={collection.title}
              type="button"
              onClick={() =>
                openCollection(collection.query)
              }
              style={{
                ...card,
                borderColor: `${collection.accent}66`,
                boxShadow: `0 0 22px ${collection.glow}`,
              }}
            >
              <span
                style={{
                  ...iconWrap,
                  color: collection.accent,
                  borderColor: `${collection.accent}88`,
                  background: `${collection.accent}12`,
                  boxShadow: `0 0 16px ${collection.glow}`,
                }}
              >
                {collection.icon}
              </span>

              <span style={cardContent}>
                <strong
                  style={{
                    ...cardTitle,
                    color: collection.accent,
                  }}
                >
                  {collection.title}
                </strong>

                <span style={cardDescription}>
                  {collection.description}
                </span>
              </span>

              <span
                aria-hidden="true"
                style={{
                  ...arrow,
                  color: collection.accent,
                }}
              >
                →
              </span>
            </button>
          ))}
        </div>
      </div>

      <style jsx>{`
        button {
          transition:
            transform 180ms ease,
            border-color 180ms ease,
            box-shadow 180ms ease,
            background 180ms ease;
        }

        button:hover {
          transform: translateY(-4px);
        }

        button:focus-visible {
          outline: 2px solid #7df9ff;
          outline-offset: 3px;
        }

        @media (max-width: 720px) {
          header {
            align-items: flex-start !important;
          }

          header button {
            width: 100%;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          button {
            transition: none !important;
          }

          button:hover {
            transform: none !important;
          }
        }
      `}</style>
    </section>
  );
}

const section = {
  position: "relative" as const,
  padding:
    "clamp(68px, 9vw, 112px) clamp(18px, 4vw, 52px)",
  background:
    "linear-gradient(180deg, #020203 0%, #060609 100%)",
  color: "#ffffff",
};

const container = {
  width: "100%",
  maxWidth: 1320,
  margin: "0 auto",
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "end",
  gap: 24,
  flexWrap: "wrap" as const,
  marginBottom: 28,
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
  fontSize: "clamp(32px, 6vw, 52px)",
  letterSpacing: "-.035em",
};

const subtitle = {
  maxWidth: 650,
  margin: "10px 0 0",
  color: "#a7a7af",
  fontSize: 16,
  lineHeight: 1.65,
};

const viewAllButton = {
  minHeight: 48,
  padding: "11px 16px",
  border: "1px solid rgba(0,217,255,.48)",
  borderRadius: 11,
  background: "rgba(0,217,255,.06)",
  color: "#7df9ff",
  fontWeight: 900,
  cursor: "pointer",
};

const grid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(min(100%, 270px), 1fr))",
  gap: 15,
};

const card = {
  width: "100%",
  minHeight: 182,
  padding: 18,
  display: "grid",
  gridTemplateColumns: "52px minmax(0, 1fr) auto",
  alignItems: "start",
  gap: 14,
  border: "1px solid",
  borderRadius: 16,
  background:
    "linear-gradient(145deg, rgba(13,13,18,.96), rgba(7,7,10,.96))",
  color: "#ffffff",
  textAlign: "left" as const,
  cursor: "pointer",
};

const iconWrap = {
  width: 48,
  height: 48,
  display: "grid",
  placeItems: "center",
  border: "1px solid",
  borderRadius: 13,
  fontSize: 21,
  fontWeight: 900,
};

const cardContent = {
  minWidth: 0,
  display: "grid",
  gap: 9,
};

const cardTitle = {
  fontSize: 18,
  lineHeight: 1.25,
};

const cardDescription = {
  color: "#9d9da6",
  fontSize: 13,
  lineHeight: 1.58,
};

const arrow = {
  alignSelf: "center",
  fontSize: 22,
  fontWeight: 900,
};