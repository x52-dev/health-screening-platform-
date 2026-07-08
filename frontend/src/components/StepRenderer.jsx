import { FormStep } from "./FormStep.jsx";
import { AIScreeningStep } from "./AIScreeningStep.jsx";
import { OutcomeView } from "./OutcomeView.jsx";

export function StepRenderer({
  stepNode,
  formState,
  setFormState,
  sessionId,
  onRecordAiEvaluation,
  onNext,
}) {
  if (!stepNode) return null;

  const tagName = stepNode.tagName.toLowerCase();
  const typeAttr = stepNode.getAttribute("type");

  if (tagName === "ai_screening" || typeAttr === "ai_screening") {
    return (
      <AIScreeningStep
        stepNode={stepNode}
        formState={formState}
        sessionId={sessionId}
        onRecordAiEvaluation={onRecordAiEvaluation}
        onComplete={onNext}
      />
    );
  }

  if ((tagName === "step" && typeAttr === "form") || tagName === "form") {
    return (
      <FormStep
        stepNode={stepNode}
        formState={formState}
        setFormState={setFormState}
        onNext={onNext}
      />
    );
  }

  if (tagName === "outcome" || typeAttr === "outcome") {
    const syntheticOutcome = {
      status:
        stepNode.getAttribute("label") ||
        stepNode.getAttribute("id") ||
        "Pipeline Concluded",
      reason:
        stepNode.textContent.trim() ||
        "The orchestration matrix reached a terminal node.",
      explanation: "Telemetry processed successfully.",
    };
    return (
      <OutcomeView
        outcome={syntheticOutcome}
        onReset={() => window.location.reload()}
      />
    );
  }

  // Graceful fallback for entirely unknown node types
  return (
    <div
      style={{
        padding: "20px",
        backgroundColor: "#f8fafc",
        border: "1px solid #cbd5e1",
        borderRadius: "8px",
        fontFamily: "system-ui",
      }}
    >
      <p style={{ margin: "0 0 10px 0", fontWeight: "600" }}>
        Processing Step: {stepNode.getAttribute("id") || "Unknown"}
      </p>
      <button
        onClick={() => onNext(stepNode.getAttribute("next"))}
        style={{
          padding: "8px 16px",
          background: "#2563eb",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Continue Pipeline
      </button>
    </div>
  );
}
