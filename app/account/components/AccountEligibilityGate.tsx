"use client";

type AccountEligibilityGateProps = {
  organization: string;
  ageConfirmed: boolean;
  researchConfirmed: boolean;
  saving: boolean;
  message: string;
  onOrganizationChange: (value: string) => void;
  onAgeConfirmedChange: (value: boolean) => void;
  onResearchConfirmedChange: (value: boolean) => void;
  onSave: () => void;
};

export default function AccountEligibilityGate({
  organization,
  ageConfirmed,
  researchConfirmed,
  saving,
  message,
  onOrganizationChange,
  onAgeConfirmedChange,
  onResearchConfirmedChange,
  onSave,
}: AccountEligibilityGateProps) {
  const disabled =
    saving ||
    !organization.trim() ||
    !ageConfirmed ||
    !researchConfirmed;

  return (
    <main style={page}>
      <div style={eligibilityGateShell}>
        <section style={eligibilityGateCard}>
          <p style={eligibilityGateEyebrow}>
            ACCOUNT ELIGIBILITY
          </p>

          <h1 style={eligibilityGateTitle}>
            Complete Research Eligibility
          </h1>

          <p style={eligibilityGateText}>
            Before accessing your account and product details, please
            complete the required research eligibility information below.
          </p>

          <label style={eligibilityField}>
            <span style={eligibilityFieldLabel}>
              Organization / Lab Name
            </span>

            <input
              type="text"
              value={organization}
              onChange={(event) =>
                onOrganizationChange(event.target.value)
              }
              placeholder="Organization or laboratory name"
              autoComplete="organization"
              style={eligibilityInput}
              required
            />
          </label>

          <label style={eligibilityCheckRow}>
            <input
              type="checkbox"
              checked={ageConfirmed}
              onChange={(event) =>
                onAgeConfirmedChange(event.target.checked)
              }
              style={eligibilityCheckbox}
            />

            <span>
              I confirm that I am 21 years of age or older.
            </span>
          </label>

          <label style={eligibilityCheckRow}>
            <input
              type="checkbox"
              checked={researchConfirmed}
              onChange={(event) =>
                onResearchConfirmedChange(event.target.checked)
              }
              style={eligibilityCheckbox}
            />

            <span>
              I confirm that I am an authorized representative of an
              independent research laboratory, research organization, or
              other qualified research entity, and that I am accessing
              PUGPEP solely for lawful laboratory research purposes.
              Products are not for human or veterinary use.
            </span>
          </label>

          {message && (
            <p style={eligibilityGateMessage}>
              {message}
            </p>
          )}

          <button
            type="button"
            onClick={onSave}
            disabled={disabled}
            style={{
              ...eligibilitySaveButton,
              opacity: disabled ? 0.5 : 1,
              cursor: disabled
                ? "not-allowed"
                : "pointer",
            }}
          >
            {saving
              ? "SAVING..."
              : "CONFIRM & CONTINUE"}
          </button>

          <div style={eligibilityResearchNotice}>
            <strong style={{ color: "#00ff99" }}>
              RESEARCH USE ONLY
            </strong>
            <br />
            Products are intended for laboratory research purposes only.
            Not for human or veterinary use.
          </div>
        </section>
      </div>
    </main>
  );
}

const page = {
  minHeight: "100vh",
  overflowX: "hidden" as const,
  padding: "clamp(16px, 3vw, 32px)",
  background:
    "radial-gradient(circle at 12% 0%, rgba(255,47,208,.15), transparent 27%), radial-gradient(circle at 88% 4%, rgba(0,217,255,.15), transparent 30%), radial-gradient(circle at 50% 100%, rgba(0,255,153,.06), transparent 36%), #000",
  color: "#ffffff",
};


const eligibilityGateShell = {
  width: "100%",
  minHeight: "calc(100vh - 64px)",
  display: "grid",
  placeItems: "start center",
  padding: "70px 0 40px",
};

const eligibilityGateCard = {
  width: "100%",
  maxWidth: 620,
  padding: "28px 24px",
  border: "1px solid rgba(255,69,216,.52)",
  borderRadius: 18,
  background:
    "linear-gradient(180deg, rgba(12,12,16,.98), rgba(5,5,8,.98))",
  boxShadow:
    "0 0 30px rgba(255,69,216,.12), 0 0 45px rgba(0,217,255,.07)",
};

const eligibilityGateEyebrow = {
  margin: 0,
  color: "#00ff99",
  fontSize: 11,
  fontWeight: 1000,
  letterSpacing: ".14em",
};

const eligibilityGateTitle = {
  margin: "7px 0 6px",
  color: "#ff45d8",
  fontSize: "clamp(30px, 6vw, 44px)",
  lineHeight: 1.1,
};

const eligibilityGateText = {
  margin: "0 0 20px",
  color: "#bfc1c7",
  lineHeight: 1.65,
  fontSize: 14,
};

const eligibilityField = {
  display: "grid",
  gap: 7,
  marginBottom: 14,
};

const eligibilityFieldLabel = {
  color: "#7df9ff",
  fontSize: 12,
  fontWeight: 900,
};

const eligibilityInput = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "13px 14px",
  border: "1px solid rgba(0,217,255,.35)",
  borderRadius: 10,
  background: "#07080a",
  color: "#fff",
  outline: "none",
  fontSize: 15,
};

const eligibilityCheckRow = {
  marginTop: 12,
  padding: 14,
  display: "flex",
  alignItems: "flex-start",
  gap: 11,
  border: "1px solid rgba(0,255,153,.22)",
  borderRadius: 12,
  background: "rgba(0,255,153,.035)",
  color: "#e4e4e9",
  lineHeight: 1.6,
  fontSize: 13,
  cursor: "pointer",
};

const eligibilityCheckbox = {
  width: 20,
  height: 20,
  marginTop: 2,
  flex: "0 0 auto",
  accentColor: "#00ff99",
  cursor: "pointer",
};

const eligibilityGateMessage = {
  margin: "14px 0 0",
  color: "#ffb0c9",
  fontSize: 13,
  lineHeight: 1.5,
};

const eligibilitySaveButton = {
  width: "100%",
  minHeight: 48,
  marginTop: 18,
  border: "1px solid #00ff99",
  borderRadius: 10,
  background:
    "linear-gradient(90deg, rgba(0,255,153,.18), rgba(0,217,255,.15))",
  color: "#00ff99",
  fontWeight: 1000,
  letterSpacing: ".06em",
  boxShadow: "0 0 18px rgba(0,255,153,.14)",
};

const eligibilityResearchNotice = {
  marginTop: 18,
  padding: 12,
  border: "1px solid rgba(0,255,153,.18)",
  borderRadius: 10,
  background: "rgba(0,255,153,.025)",
  color: "#9da0a7",
  fontSize: 11,
  lineHeight: 1.6,
};
