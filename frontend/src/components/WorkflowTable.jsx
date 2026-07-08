export function WorkflowTable({ workflows, onLaunch }) {
  if (!workflows || workflows.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        maxWidth: "640px",
        margin: "0 auto 60px auto",
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
        Deployed Database Workflows
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
                Workflow ID
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
                Last Updated
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
            {workflows.map((wf) => (
              <tr
                key={wf.workflow_id}
                style={{ borderBottom: "1px solid #f1f5f9" }}
              >
                <td
                  style={{
                    padding: "16px 20px",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#0f172a",
                  }}
                >
                  {wf.workflow_id}
                </td>
                <td
                  style={{
                    padding: "16px 20px",
                    fontSize: "13px",
                    color: "#64748b",
                  }}
                >
                  {new Date(wf.updated_at).toLocaleDateString()}
                </td>
                <td style={{ padding: "16px 20px", textAlign: "right" }}>
                  <button
                    onClick={() => onLaunch(wf.workflow_id)}
                    style={{
                      padding: "6px 14px",
                      backgroundColor: "#2563eb",
                      color: "#ffffff",
                      fontSize: "13px",
                      fontWeight: "600",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    Launch
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
