export function SubmissionTable({ submissions, onEdit }) {
  if (!submissions || submissions.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        maxWidth: "640px",
        margin: "40px auto 60px auto",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h3
        style={{
          fontSize: "18px",
          fontWeight: "700",
          color: "#0f172a",
          marginBottom: "16px",
          padding: "0 20px",
        }}
      >
        Saved Patient Records
      </h3>

      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            textAlign: "left",
          }}
        >
          <thead
            style={{
              backgroundColor: "#f8fafc",
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            <tr>
              <th
                style={{
                  padding: "12px 20px",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#64748b",
                  textTransform: "uppercase",
                }}
              >
                Workflow Type
              </th>
              <th
                style={{
                  padding: "12px 20px",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#64748b",
                  textTransform: "uppercase",
                }}
              >
                Final Status
              </th>
              <th
                style={{
                  padding: "12px 20px",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#64748b",
                  textTransform: "uppercase",
                  textAlign: "right",
                }}
              >
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((sub) => (
              <tr
                key={sub.submission_id}
                style={{ borderBottom: "1px solid #f1f5f9" }}
              >
                <td
                  style={{
                    padding: "16px 20px",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#0f172a",
                  }}
                >
                  {sub.workflow_id}
                </td>
                <td
                  style={{
                    padding: "16px 20px",
                    fontSize: "13px",
                    color: "#475569",
                  }}
                >
                  <span
                    style={{
                      backgroundColor: "#f1f5f9",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontWeight: "500",
                    }}
                  >
                    {sub.final_outcome.replace(/_/g, " ")}
                  </span>
                </td>
                <td style={{ padding: "16px 20px", textAlign: "right" }}>
                  <button
                    onClick={() => onEdit(sub)}
                    style={{
                      padding: "6px 14px",
                      backgroundColor: "#0f172a",
                      color: "#ffffff",
                      fontSize: "13px",
                      fontWeight: "600",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    Edit & Resume
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
