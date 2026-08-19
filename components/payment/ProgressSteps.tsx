import {
  progressBar,
  progressCircle,
  progressLine,
  progressStep,
} from "./paymentTheme";

function ProgressStep({
  number,
  label,
  active = false,
  complete = false,
}: {
  number: string;
  label: string;
  active?: boolean;
  complete?: boolean;
}) {
  return (
    <div style={progressStep}>
      <span
        style={{
          ...progressCircle,

          borderColor:
            active || complete
              ? "#00d9ff"
              : "#444",

          background:
            complete
              ? "#00d9ff"
              : active
              ? "rgba(255,47,208,.18)"
              : "#0a0a0a",

          color:
            complete
              ? "#001016"
              : active
              ? "#ff75df"
              : "#777",

          boxShadow:
            active
              ? "0 0 16px rgba(255,47,208,.24)"
              : complete
              ? "0 0 14px rgba(0,217,255,.22)"
              : "none",
        }}
      >
        {complete ? "✓" : number}
      </span>

      <span
        style={{
          color:
            active || complete
              ? "#ffffff"
              : "#777",
          fontWeight:
            active || complete
              ? 800
              : 600,
        }}
      >
        {label}
      </span>
    </div>
  );
}

export function ProgressSteps() {
  return (
    <div style={progressBar}>
      <ProgressStep
        number="1"
        label="Checkout"
        complete
      />

      <div style={progressLine} />

      <ProgressStep
        number="2"
        label="Payment"
        active
      />

      <div style={progressLine} />

      <ProgressStep
        number="3"
        label="Submitted"
      />
    </div>
  );
}