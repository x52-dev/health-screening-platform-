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
  const tagName = stepNode.tagName.toLowerCase();
  const typeAttr = stepNode.getAttribute("type");

  // 1. AI Inference Nodes
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

  // 2. Clinical Form Intakes
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

  // 3. Terminal Outcome Nodes (This is the block that was missing!)
  if (tagName === "outcome" || typeAttr === "outcome") {
    // Generate a synthetic outcome object derived directly from the XML node attributes
    const syntheticOutcome = {
      status:
        stepNode.getAttribute("label") ||
        stepNode.getAttribute("id") ||
        "Pipeline Concluded",
      reason:
        stepNode.textContent.trim() ||
        "The orchestration matrix reached a terminal node.",
      explanation: "All configured telemetry has been processed successfully.",
    };

    return (
      <OutcomeView
        outcome={syntheticOutcome}
        onReset={() => window.location.reload()}
      />
    );
  }

  // 4. Final Fallback Boundary
  return (
    <div
      style={{
        color: "#dc2626",
        padding: "20px",
        textAlign: "center",
        fontWeight: "600",
        fontFamily: "system-ui",
        backgroundColor: "#fef2f2",
        border: "1px solid #fecaca",
        borderRadius: "8px",
      }}
    >
      ⚠️ Unsupported Pipeline Variant: The orchestration layer cannot resolve
      execution context for &lt;{tagName} type="{typeAttr}"&gt;.
    </div>
  );
}
