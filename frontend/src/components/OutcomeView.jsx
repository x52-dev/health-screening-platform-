export function OutcomeView({ outcome }) {
  return (
    <div
      style={{
        padding: "40px",
        maxWidth: "500px",
        margin: "auto",
        textAlign: "center",
        border: "1px solid #eaeaea",
        borderRadius: "8px",
      }}
    >
      <h3
        style={{
          color: outcome.status.includes("REFERRAL") ? "#d32f2f" : "#2e7d32",
        }}
      >
        Screening Concluded
      </h3>

      <p style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "5px" }}>
        Outcome: {outcome.status}
      </p>

      {outcome.reason && (
        <p
          style={{
            fontSize: "14px",
            color: "#666",
            marginTop: "0",
            paddingBottom: "10px",
          }}
        >
          {outcome.reason}
        </p>
      )}

      {outcome.explanation && (
        <div
          style={{
            marginTop: "20px",
            padding: "15px",
            backgroundColor: "#f5f5f5",
            borderRadius: "6px",
            textAlign: "left",
          }}
        >
          <strong
            style={{ display: "block", marginBottom: "8px", color: "#333" }}
          >
            AI Medical Assessment:
          </strong>
          <p style={{ margin: 0, color: "#444", lineHeight: "1.5" }}>
            {outcome.explanation}
          </p>
        </div>
      )}

      <button
        onClick={() => location.reload()}
        style={{
          padding: "8px 16px",
          background: "#333",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          marginTop: "25px",
          cursor: "pointer",
        }}
      >
        Run Another Screening
      </button>
    </div>
  );
}
