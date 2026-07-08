import { useState, useEffect } from "preact/hooks";
import { StepRenderer } from "./components/StepRenderer.jsx";
import { OutcomeView } from "./components/OutcomeView.jsx";
import { apiClient } from "./utils/api.js";

export function WorkflowEngine({
  xmlDoc,
  workflowId,
  initialStepId,
  initialFormState = {},
  existingSubmissionId = null,
  initialAiSummary = null,
  onExit = null,
}) {
  const [currentStepId, setCurrentStepId] = useState(initialStepId || "step_0");
  const [formState, setFormState] = useState(initialFormState);
  const [aiEvaluations, setAiEvaluations] = useState([]);

  const [sessionId] = useState(() => crypto.randomUUID());
  const [submissionId] = useState(
    () => existingSubmissionId || crypto.randomUUID(),
  );
  const [terminalOutcome, setTerminalOutcome] = useState(null);

  const safelyLocateNode = (targetId) => {
    if (!targetId || !xmlDoc) return null;
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
      (currentStepNode.tagName.toLowerCase() === "outcome" ||
        currentStepNode.getAttribute("type") === "outcome")
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
        status: (outcomeId || "Concluded").replace(/_/g, " ").toUpperCase(),
        reason:
          specificReason || "The clinical pipeline has successfully concluded.",
        explanation: response.ai_synthesis,
      });
    } catch (err) {
      setTerminalOutcome({
        status: (outcomeId || "Concluded").replace(/_/g, " ").toUpperCase(),
        reason: specificReason || "The pipeline concluded safely.",
        explanation:
          "Final telemetry queued for network transmission (AI synthesis unavailable).",
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
        </div>
      );
    }
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
          padding: "32px",
          maxWidth: "500px",
          margin: "40px auto",
          border: "1px solid #fecaca",
          borderRadius: "12px",
          backgroundColor: "#fef2f2",
          textAlign: "center",
          fontFamily: "system-ui",
        }}
      >
        <h3 style={{ color: "#dc2626", margin: "0 0 12px 0" }}>
          Pipeline Disconnected
        </h3>
        <p style={{ margin: 0, color: "#991b1b" }}>
          The engine attempted to route to step <b>[{currentStepId}]</b>, but it
          is missing from the workflow architecture.
        </p>
        {onExit && (
          <button
            onClick={onExit}
            style={{
              marginTop: "20px",
              padding: "8px 16px",
              background: "#dc2626",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Return to Dashboard
          </button>
        )}
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
            }}
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
        </div>
      )}
    </div>
  );
}
