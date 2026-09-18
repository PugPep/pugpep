"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "pugpep_age_verified";

export default function AgeGate() {
  const [ready, setReady] = useState(false);
  const [accepted, setAccepted] = useState(true);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [researchConfirmed, setResearchConfirmed] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      setAccepted(stored === "yes");
    } catch {
      setAccepted(false);
    } finally {
      setReady(true);
    }
  }, []);

  function confirmAccess() {
    if (!ageConfirmed || !researchConfirmed) return;

    try {
      localStorage.setItem(STORAGE_KEY, "yes");
    } catch {
      // Storage failure should not block the current session.
    }

    setAccepted(true);
  }

  if (!ready || accepted) return null;

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="age-gate-title">
      <div className="panel">
        <div className="brandRow">
          <span className="brand">PUGPEP</span>
          <span className="badge">21+</span>
        </div>

        <p className="eyebrow">RESEARCH ACCESS VERIFICATION</p>

        <h1 id="age-gate-title">Before You Enter</h1>

        <p className="intro">
          PugPep products are offered for lawful laboratory research use only.
          Please confirm the statements below to continue.
        </p>

        <label className="checkRow">
          <input
            type="checkbox"
            checked={ageConfirmed}
            onChange={(event) => setAgeConfirmed(event.target.checked)}
          />

          <span>
            I confirm that I am at least 21 years old.
          </span>
        </label>

        <label className="checkRow">
          <input
            type="checkbox"
            checked={researchConfirmed}
            onChange={(event) => setResearchConfirmed(event.target.checked)}
          />

          <span>
            I am accessing this site solely for lawful laboratory research and
            understand that PugPep products are not for human or veterinary use.
          </span>
        </label>

        <button
          type="button"
          onClick={confirmAccess}
          disabled={!ageConfirmed || !researchConfirmed}
        >
          ENTER PUGPEP
        </button>

        <p className="notice">
          By continuing, you acknowledge the site&apos;s research-use terms and
          product restrictions.
        </p>
      </div>

      <style jsx>{`
        .overlay {
          position: fixed;
          inset: 0;
          z-index: 10000;
          padding: 18px;
          display: grid;
          place-items: center;
          overflow-y: auto;
          background:
            radial-gradient(
              circle at 18% 15%,
              rgba(255, 69, 216, 0.15),
              transparent 30%
            ),
            radial-gradient(
              circle at 82% 15%,
              rgba(0, 217, 255, 0.14),
              transparent 30%
            ),
            rgba(0, 0, 0, 0.96);
          backdrop-filter: blur(10px);
        }

        .panel {
          width: min(100%, 560px);
          padding: 24px;
          border: 1px solid rgba(0, 217, 255, 0.28);
          border-radius: 18px;
          background:
            linear-gradient(
              145deg,
              rgba(12, 12, 17, 0.99),
              rgba(5, 5, 8, 0.99)
            );
          box-shadow:
            0 0 34px rgba(0, 217, 255, 0.08),
            0 0 42px rgba(255, 69, 216, 0.05);
          color: #fff;
        }

        .brandRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .brand {
          color: #00d9ff;
          font-size: 12px;
          font-weight: 1000;
          letter-spacing: 0.18em;
        }

        .badge {
          min-width: 42px;
          min-height: 30px;
          padding: 5px 9px;
          display: inline-grid;
          place-items: center;
          border: 1px solid rgba(0, 255, 153, 0.5);
          border-radius: 999px;
          background: rgba(0, 255, 153, 0.06);
          color: #00ff99;
          font-size: 10px;
          font-weight: 1000;
        }

        .eyebrow {
          margin: 24px 0 0;
          color: #ff45d8;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.14em;
        }

        h1 {
          margin: 7px 0 0;
          color: #fff;
          font-size: clamp(32px, 8vw, 48px);
          line-height: 1;
          letter-spacing: -0.04em;
        }

        .intro {
          margin: 13px 0 0;
          color: #a9abb3;
          font-size: 14px;
          line-height: 1.6;
        }

        .checkRow {
          margin-top: 14px;
          padding: 14px;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 11px;
          align-items: start;
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.025);
          cursor: pointer;
        }

        input {
          width: 18px;
          height: 18px;
          margin: 1px 0 0;
          accent-color: #00ff99;
        }

        .checkRow span {
          color: #c1c3c9;
          font-size: 12px;
          line-height: 1.5;
        }

        button {
          width: 100%;
          min-height: 48px;
          margin-top: 18px;
          border: 1px solid rgba(0, 255, 153, 0.5);
          border-radius: 999px;
          background:
            linear-gradient(
              90deg,
              rgba(0, 217, 255, 0.12),
              rgba(0, 255, 153, 0.12)
            );
          color: #00ff99;
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: 0.06em;
          cursor: pointer;
        }

        button:disabled {
          border-color: rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.025);
          color: #666a72;
          cursor: not-allowed;
        }

        .notice {
          margin: 11px 0 0;
          color: #6f737c;
          font-size: 10px;
          line-height: 1.5;
          text-align: center;
        }

        @media (max-width: 520px) {
          .overlay {
            padding: 12px;
          }

          .panel {
            padding: 18px;
            border-radius: 14px;
          }
        }
      `}</style>
    </div>
  );
}
