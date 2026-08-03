"use client";

import Image from "next/image";
import Link from "next/link";

type CompoundCardProps = {
  name: string;
  slug: string;
  image: string;
  dosage?: string | null;
  price: number;
  status?: string | null;
  coaAvailable?: boolean;
  pointsEarned?: number;
  badge?: string | null;
  onAdd?: () => void;
};

function money(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export default function CompoundCard({
  name,
  slug,
  image,
  dosage,
  price,
  status = "In Stock",
  coaAvailable = false,
  pointsEarned,
  badge,
  onAdd,
}: CompoundCardProps) {
  const isAvailable =
    String(status || "")
      .trim()
      .toLowerCase() !==
    "out of stock";

  return (
    <article style={card}>
      <div style={imageWrap}>
        {badge && (
          <span style={badgeStyle}>
            {badge}
          </span>
        )}

        <Link
          href={`/products/${slug}`}
          style={imageLink}
          aria-label={`View ${name}`}
        >
          <Image
            src={image || "/pugpep-logo.png"}
            alt={name}
            width={520}
            height={420}
            style={imageStyle}
          />
        </Link>
      </div>

      <div style={content}>
        <div style={topRow}>
          <div style={titleWrap}>
            <Link
              href={`/products/${slug}`}
              style={titleLink}
            >
              {name}
            </Link>

            {dosage && (
              <span style={dosageStyle}>
                {dosage}
              </span>
            )}
          </div>

          <span
            style={{
              ...statusStyle,
              color: isAvailable
                ? "#00ff99"
                : "#ff6f6f",
              borderColor: isAvailable
                ? "rgba(0,255,153,.5)"
                : "rgba(255,111,111,.5)",
              background: isAvailable
                ? "rgba(0,255,153,.08)"
                : "rgba(255,111,111,.08)",
            }}
          >
            {status}
          </span>
        </div>

        <div style={metaRow}>
          {coaAvailable && (
            <span style={metaPill}>
              COA Available
            </span>
          )}

          {typeof pointsEarned ===
            "number" && (
            <span style={metaPill}>
              Earn {pointsEarned} PugPoints
            </span>
          )}
        </div>

        <div style={bottomRow}>
          <strong style={priceStyle}>
            {money(price)}
          </strong>

          <div style={buttonRow}>
            <Link
              href={`/products/${slug}`}
              style={viewButton}
            >
              View
            </Link>

            <button
              type="button"
              disabled={
                !isAvailable ||
                !onAdd
              }
              onClick={onAdd}
              style={{
                ...addButton,
                opacity:
                  !isAvailable ||
                  !onAdd
                    ? 0.55
                    : 1,
                cursor:
                  !isAvailable ||
                  !onAdd
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {isAvailable
                ? "Quick Add"
                : "Unavailable"}
            </button>
          </div>
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
          transform: translateY(-5px);
          border-color: rgba(255, 69, 216, 0.58);
          box-shadow:
            0 18px 38px rgba(0, 0, 0, 0.34),
            0 0 26px rgba(255, 69, 216, 0.12);
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
    </article>
  );
}

const card = {
  overflow: "hidden",
  display: "grid",
  gridTemplateRows: "auto 1fr",
  border:
    "1px solid rgba(0,217,255,.30)",
  borderRadius: 18,
  background:
    "linear-gradient(145deg, rgba(12,12,17,.97), rgba(6,6,9,.98))",
  boxShadow:
    "0 12px 28px rgba(0,0,0,.28)",
};

const imageWrap = {
  position: "relative" as const,
  aspectRatio: "1.2 / 1",
  overflow: "hidden",
  background:
    "radial-gradient(circle at 50% 20%, rgba(0,217,255,.10), transparent 55%), #08080b",
};

const badgeStyle = {
  position: "absolute" as const,
  zIndex: 2,
  top: 12,
  left: 12,
  padding: "6px 9px",
  border:
    "1px solid rgba(255,69,216,.58)",
  borderRadius: 999,
  background:
    "rgba(20,0,17,.84)",
  color: "#ff75df",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: ".08em",
};

const imageLink = {
  display: "block",
  width: "100%",
  height: "100%",
};

const imageStyle = {
  width: "100%",
  height: "100%",
  objectFit: "cover" as const,
};

const content = {
  padding: 16,
  display: "grid",
  gap: 14,
};

const topRow = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "flex-start",
  gap: 12,
};

const titleWrap = {
  minWidth: 0,
  display: "grid",
  gap: 5,
};

const titleLink = {
  color: "#ffffff",
  textDecoration: "none",
  fontSize: 19,
  fontWeight: 900,
  lineHeight: 1.25,
  overflowWrap:
    "anywhere" as const,
};

const dosageStyle = {
  color: "#9f9fa7",
  fontSize: 13,
};

const statusStyle = {
  flexShrink: 0,
  padding: "5px 8px",
  border: "1px solid",
  borderRadius: 999,
  fontSize: 10,
  fontWeight: 900,
  textTransform:
    "uppercase" as const,
};

const metaRow = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: 7,
};

const metaPill = {
  padding: "6px 8px",
  border:
    "1px solid rgba(255,255,255,.11)",
  borderRadius: 999,
  background:
    "rgba(255,255,255,.035)",
  color: "#bcbcc3",
  fontSize: 11,
  fontWeight: 700,
};

const bottomRow = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 14,
  flexWrap: "wrap" as const,
};

const priceStyle = {
  color: "#00ff99",
  fontSize: 23,
  textShadow:
    "0 0 12px rgba(0,255,153,.18)",
};

const buttonRow = {
  display: "flex",
  gap: 8,
};

const viewButton = {
  minHeight: 42,
  padding: "10px 13px",
  display: "grid",
  placeItems: "center",
  border:
    "1px solid rgba(0,217,255,.48)",
  borderRadius: 9,
  background:
    "rgba(0,217,255,.06)",
  color: "#7df9ff",
  textDecoration: "none",
  fontSize: 13,
  fontWeight: 900,
};

const addButton = {
  minHeight: 42,
  padding: "10px 14px",
  border:
    "1px solid #45d97a",
  borderRadius: 9,
  background:
    "linear-gradient(180deg, #2eea6f, #19b857)",
  color: "#ffffff",
  fontSize: 13,
  fontWeight: 900,
};