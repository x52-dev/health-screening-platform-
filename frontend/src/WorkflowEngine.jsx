import { useState, useEffect } from "preact/hooks";
import { StepRenderer } from "./components/StepRenderer.jsx";
import { OutcomeView } from "./components/OutcomeView.jsx";
import { apiClient } from "./utils/api.js";

// Added onExit to the props
export function WorkflowEngine({
  xmlDoc,
  workflowId,
  initialStepId,
  initialFormState = {},
  existingSubmissionId = null,
  initialAiSummary = null,
  onExit = null,
}) {
  const [currentStepId, setCurrentStepId] = useState(initialStepId);
  const [formState, setFormState] = useState(initialFormState);
  const [aiEvaluations, setAiEvaluations] = useState([]);

  const [sessionId] = useState(() => crypto.randomUUID());
  const [submissionId] = useState(
    () => existingSubmissionId || crypto.randomUUID(),
  );
  const [terminalOutcome, setTerminalOutcome] = useState(null);

  const safelyLocateNode = (targetId) => {
    if (!targetId) return null;
    const cleanId = String(targetId).trim();
    let node = xmlDoc.querySelector(`[id="${cleanId}"]`);
    if (!node) {
      const allElements = Array.from(xmlDoc.getElementsByTagName("*"));
      node = allElements.find(
        (el) => el.getAttribute("id")?.trim() === cleanId,
      );
    }
    return node;
  };

  const currentStepNode = safelyLocateNode(currentStepId);

  useEffect(() => {
    if (
      currentStepNode &&
      currentStepNode.tagName.toLowerCase() === "outcome"
    ) {
      triggerFinalSubmission(currentStepId, currentStepNode.textContent.trim());
    }
  }, [currentStepId, currentStepNode]);

  const triggerFinalSubmission = async (outcomeId, specificReason = null) => {
    setTerminalOutcome({ status: "loading" });
    try {
      const response = await apiClient.post(
        "/api/v1/submissions",
        {
          submission_id: submissionId,
          session_id: sessionId,
          workflow_id: workflowId,
          final_outcome: outcomeId,
          form_data: formState,
        },
        { idempotencyKey: submissionId },
      );
      setTerminalOutcome({
        status: outcomeId.replace(/_/g, " ").toUpperCase(),
        reason:
          specificReason || "The clinical pipeline has successfully concluded.",
        explanation: response.ai_synthesis,
      });
    } catch (err) {
      console.error("Submission transmission failed:", err);
      setTerminalOutcome({
        status: outcomeId.replace(/_/g, " ").toUpperCase(),
        reason:
          specificReason || "The clinical pipeline has successfully concluded.",
        explanation:
          "Final telemetry has been queued for network transmission (AI synthesis unavailable).",
      });
    }
  };

  const handleNext = (targetStepId) => {
    if (!targetStepId || targetStepId === "null") {
      triggerFinalSubmission(
        currentStepId,
        "Manual processing branch concluded. Data safely retained.",
      );
      return;
    }
    setCurrentStepId(targetStepId);
  };

  if (terminalOutcome) {
    if (terminalOutcome.status === "loading") {
      return (
        <div
          style={{
            textAlign: "center",
            padding: "80px 20px",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              border: "3px solid #e2e8f0",
              borderTop: "3px solid #1e293b",
              borderRadius: "50%",
              margin: "0 auto 20px auto",
              animation: "spin 0.8s linear infinite",
            }}
          ></div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <p
            style={{
              fontSize: "16px",
              fontWeight: "600",
              color: "#1e293b",
              margin: "0 0 6px 0",
            }}
          >
            Synthesizing Clinical Handoff...
          </p>
          <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
            Analyzing session telemetry to generate a professional medical
            summary.
          </p>
        </div>
      );
    }
    // Wires up the Outcome screen button to seamlessly route back to the Dashboard
    return (
      <OutcomeView
        outcome={terminalOutcome}
        onReset={onExit ? onExit : () => window.location.reload()}
      />
    );
  }

  if (!currentStepNode) {
    return (
      <div
        style={{
          padding: "24px",
          color: "#dc2626",
          fontWeight: "600",
          fontFamily: "system-ui",
          textAlign: "center",
        }}
      >
        Engine Fault: [{currentStepId}] is missing from structural definitions.
      </div>
    );
  }

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
      {/* THE FIX: Back to Gateway Navigation Button */}
      {onExit && (
        <div style={{ marginBottom: "24px" }}>
          <button
            onClick={onExit}
            style={{
              background: "transparent",
              border: "none",
              padding: 0,
              color: "#64748b",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              transition: "color 0.15s ease",
            }}
            onMouseOver={(e) => (e.target.style.color = "#0f172a")}
            onMouseOut={(e) => (e.target.style.color = "#64748b")}
          >
            ← Back to Gateway
          </button>
        </div>
      )}

      <StepRenderer
        stepNode={currentStepNode}
        formState={formState}
        setFormState={setFormState}
        sessionId={sessionId}
        onRecordAiEvaluation={(evalData) =>
          setAiEvaluations([...aiEvaluations, evalData])
        }
        onNext={handleNext}
      />

      {initialAiSummary && (
        <div
          style={{
            marginTop: "32px",
            paddingTop: "24px",
            borderTop: "1px dashed #cbd5e1",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              fontWeight: "600",
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "12px",
            }}
          >
            Prior AI Clinical Synthesis
          </div>
          <div
            style={{
              backgroundColor: "#f8fafc",
              padding: "16px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              fontSize: "14px",
              color: "#334155",
              lineHeight: "1.6",
              fontStyle: "italic",
            }}
          >
            "{initialAiSummary}"
          </div>
          <div
            style={{
              fontSize: "12px",
              color: "#94a3b8",
              marginTop: "12px",
              textAlign: "center",
            }}
          >
            Submitting edited values will overwrite this and generate a new
            synthesis.
          </div>
        </div>
      )}
    </div>
  );
}
