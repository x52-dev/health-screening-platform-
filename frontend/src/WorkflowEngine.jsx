import { useState, useEffect } from "preact/hooks";
import { StepRenderer } from "./components/StepRenderer.jsx";
import { apiClient } from "./utils/api.js";

export function WorkflowEngine({ xmlDoc, workflowId, initialStepId }) {
  const [currentStepId, setCurrentStepId] = useState(initialStepId);
  const [formState, setFormState] = useState({});
  const [aiEvaluations, setAiEvaluations] = useState([]);
  const [submissionId] = useState(() => crypto.randomUUID());
  const [submissionStatus, setSubmissionStatus] = useState({
    loading: false,
    error: null,
    success: false,
  });

  // Locate the current active step node within the XML document tree
  const currentStepNode = xmlDoc.querySelector(
    `step[id="${currentStepId}"], outcome[id="${currentStepId}"]`,
  );

  useEffect(() => {
    if (!currentStepNode) return;

    // Detect if we have entered a terminal outcome node
    if (currentStepNode.tagName.toLowerCase() === "outcome") {
      submitFinalScreening(currentStepId);
    }
  }, [currentStepId]);

  const submitFinalScreening = async (finalOutcomeId) => {
    setSubmissionStatus({ loading: true, error: null, success: false });
    try {
      await apiClient.post(
        "/api/v1/submissions",
        {
          submission_id: submissionId,
          workflow_id: workflowId,
          collected_inputs: formState,
          ai_evaluations: aiEvaluations,
          final_outcome: finalOutcomeId,
        },
        {
          headers: { "Idempotency-Key": submissionId }, // Absorb duplicates on poor networks
        },
      );
      setSubmissionStatus({ loading: false, error: null, success: true });
    } catch (err) {
      console.error("Submission crash:", err);
      setSubmissionStatus({
        loading: false,
        error: "Network transmission failure. Data is safe locally.",
        success: false,
      });
    }
  };

  if (!currentStepNode) {
    return (
      <div
        style={{
          padding: "24px",
          color: "#dc2626",
          fontWeight: "600",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
        }}
      >
        Target State Configuration Exception: [{currentStepId}] is missing from
        structural definitions.
      </div>
    );
  }

  // --- Render Dynamic Tanuh AI Enterprise Outcome Card ---
  if (currentStepNode.tagName.toLowerCase() === "outcome") {
    const isUrgent =
      currentStepId.toLowerCase().includes("urgent") ||
      currentStepId.toLowerCase().includes("emergency") ||
      currentStepId.toLowerCase().includes("referral");

    return (
      <div
        style={{
          padding: "40px 32px",
          maxWidth: "520px",
          margin: "40px auto",
          fontFamily:
            'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          color: "#0f172a",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          backgroundColor: "#ffffff",
          boxShadow:
            "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 14px",
            backgroundColor: isUrgent ? "#fef2f2" : "#f0fdf4",
            border: `1px solid ${isUrgent ? "#fecaca" : "#bbf7d0"}`,
            borderRadius: "9999px",
            fontSize: "12px",
            fontWeight: "600",
            color: isUrgent ? "#dc2626" : "#16a34a",
            textTransform: "uppercase",
            letterSpacing: "0.025em",
            marginBottom: "24px",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: isUrgent ? "#dc2626" : "#16a34a",
            }}
          ></span>
          Assessment Terminated
        </div>

        <h2
          style={{
            fontSize: "22px",
            fontWeight: "700",
            letterSpacing: "-0.025em",
            margin: "0 0 12px 0",
          }}
        >
          {currentStepNode.getAttribute("label") ||
            currentStepId.replace("_", " ").toUpperCase()}
        </h2>

        <p
          style={{
            fontSize: "14px",
            color: "#475569",
            lineHeight: "1.6",
            margin: "0 0 28px 0",
          }}
        >
          {currentStepNode.textContent.trim()}
        </p>

        {/* --- Network Sync Telemetry State Updates --- */}
        <div
          style={{
            padding: "16px",
            borderRadius: "8px",
            backgroundColor: "#f8fafc",
            border: "1px solid #f1f5f9",
            marginBottom: "24px",
          }}
        >
          {submissionStatus.loading && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                fontSize: "13px",
                color: "#64748b",
              }}
            >
              <div
                style={{
                  width: "14px",
                  height: "14px",
                  border: "2px solid #e2e8f0",
                  borderTop: "2px solid #64748b",
                  borderRadius: "50%",
                  animation: "spin 0.6s linear infinite",
                }}
              ></div>
              <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
              <span>Synchronizing session parameters securely...</span>
            </div>
          )}

          {submissionStatus.error && (
            <div style={{ textAlign: "center" }}>
              <p
                style={{
                  color: "#ef4444",
                  fontSize: "13px",
                  fontWeight: "500",
                  margin: "0 0 10px 0",
                }}
              >
                ⚠️ {submissionStatus.error}
              </p>
              <button
                onClick={() => submitFinalScreening(currentStepId)}
                style={{
                  padding: "6px 14px",
                  fontSize: "12px",
                  fontWeight: "600",
                  background: "#ef4444",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Retry Cloud Sync
              </button>
            </div>
          )}

          {submissionStatus.success && (
            <p
              style={{
                color: "#16a34a",
                fontSize: "13px",
                fontWeight: "600",
                margin: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              ✓ Transmission successfully archived on Tanuh AI ledger.
            </p>
          )}
        </div>

        {/* --- Primary Navigation Escape Escape Trigger Button --- */}
        <button
          onClick={() => window.location.reload()} // Cleanly re-triggers the app file loader landing page
          style={{
            width: "100%",
            padding: "12px",
            background: "#1e293b",
            color: "#ffffff",
            fontSize: "14px",
            fontWeight: "600",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            transition: "background 0.15s ease",
            boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
          }}
          onMouseOver={(e) => (e.target.style.background = "#0f172a")}
          onMouseOut={(e) => (e.target.style.background = "#1e293b")}
        >
          Return to Gateway Homepage
        </button>
      </div>
    );
  }

  // --- Render Active Evaluation Form/AI Interface Screen View Stage ---
  return (
    <div
      style={{
        padding: "32px",
        maxWidth: "500px",
        margin: "40px auto",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        backgroundColor: "#ffffff",
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
      }}
    >
      <StepRenderer
        stepNode={currentStepNode}
        formState={formState}
        setFormState={setFormState}
        onRecordAiEvaluation={(evalData) =>
          setAiEvaluations([...aiEvaluations, evalData])
        }
        onNext={(targetStepId) => setCurrentStepId(targetStepId)}
      />
    </div>
  );
}
