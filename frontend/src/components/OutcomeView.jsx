export function OutcomeView({ outcome, onReset }) {
  // Determine color accents based on triage severity flags
  const isCritical =
    outcome.status.toLowerCase().includes("referral") ||
    outcome.status.toLowerCase().includes("emergency") ||
    outcome.status.toLowerCase().includes("urgent") ||
    outcome.status.toLowerCase().includes("fault");

  const statusColor = isCritical ? "#dc2626" : "#16a34a";
  const statusBg = isCritical ? "#fef2f2" : "#f0fdf4";
  const statusBorder = isCritical ? "#fecaca" : "#bbf7d0";

  return (
    <div
      style={{
        padding: "40px 32px",
        maxWidth: "520px",
        margin: "30px auto",
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        backgroundColor: "#ffffff",
        boxShadow:
          "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
        textAlign: "center",
      }}
    >
      {/* Dynamic Status Badge */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 16px",
          backgroundColor: statusBg,
          border: `1px solid ${statusBorder}`,
          borderRadius: "9999px",
          fontSize: "13px",
          fontWeight: "600",
          color: statusColor,
          marginBottom: "24px",
        }}
      >
        <span
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: statusColor,
          }}
        ></span>
        Screening Concluded
      </div>

      <h3
        style={{
          fontSize: "22px",
          fontWeight: "700",
          color: "#0f172a",
          margin: "0 0 8px 0",
          letterSpacing: "-0.02em",
        }}
      >
        {outcome.status.replace(/_/g, " ").toUpperCase()}
      </h3>

      {outcome.reason && (
        <p
          style={{
            fontSize: "14px",
            color: "#475569",
            lineHeight: "1.5",
            margin: "0 0 24px 0",
          }}
        >
          {outcome.reason}
        </p>
      )}

      {/* AI Telemetry Insights Box */}
      {outcome.explanation && (
        <div
          style={{
            marginTop: "24px",
            padding: "20px",
            backgroundColor: "#f8fafc",
            border: "1px solid #edf2f7",
            borderRadius: "8px",
            textAlign: "left",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginBottom: "8px",
            }}
          >
            <svg
              style={{ width: "16px", height: "16px", color: "#64748b" }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            <strong
              style={{
                fontSize: "13px",
                fontWeight: "600",
                color: "#334155",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              AI Synthesis
            </strong>
          </div>
          <p
            style={{
              margin: 0,
              color: "#334155",
              fontSize: "14px",
              lineHeight: "1.6",
            }}
          >
            {outcome.explanation}
          </p>
        </div>
      )}

      <button
        onClick={onReset || (() => window.location.reload())}
        style={{
          width: "100%",
          padding: "12px",
          background: "#1e293b",
          color: "#ffffff",
          fontSize: "14px",
          fontWeight: "600",
          border: "none",
          borderRadius: "6px",
          marginTop: "32px",
          cursor: "pointer",
          transition: "background 0.15s ease",
        }}
        onMouseOver={(e) => (e.target.style.background = "#0f172a")}
        onMouseOut={(e) => (e.target.style.background = "#1e293b")}
      >
        Initialize New Session
      </button>
    </div>
  );
}
