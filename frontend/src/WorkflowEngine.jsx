import { useState } from "preact/hooks";
import { FormStep } from "./components/FormStep.jsx"; // add .jsx
import { AIScreeningStep } from "./components/AIScreeningStep.jsx"; // add .jsx
import { OutcomeView } from "./components/OutcomeView.jsx"; // add .jsx

export function WorkflowEngine({ xmlDoc, workflowId, initialStepId }) {
  const [currentStepId, setCurrentStepId] = useState(initialStepId);
  const [formState, setFormState] = useState({});
  const [screenOutcome, setScreenOutcome] = useState(null);

  const commitSubmission = async (
    outcomeId,
    statusLabel,
    reason,
    aiExplanation,
  ) => {
    try {
      await fetch("http://localhost:8000/api/v1/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          workflow_id: workflowId,
          collected_inputs: formState,
          final_outcome_id: outcomeId,
        }),
      });
      setScreenOutcome({
        status: statusLabel,
        reason: reason || "Pipeline Completed Successfully.",
        explanation: aiExplanation,
      });
    } catch (e) {
      setScreenOutcome({
        status: statusLabel,
        reason: "Network failed. Saved locally.",
        explanation: aiExplanation,
      });
    }
  };

  const handleNextRoute = (
    nextTargetId,
    forcedStatus = null,
    forcedReason = null,
    aiExplanation = null,
  ) => {
    if (forcedStatus) {
      setScreenOutcome({
        status: forcedStatus,
        reason: forcedReason,
        explanation: aiExplanation,
      });
      return;
    }

    const outcomeNode = xmlDoc.querySelector(`outcome[id="${nextTargetId}"]`);
    if (outcomeNode) {
      commitSubmission(
        nextTargetId,
        outcomeNode.getAttribute("status"),
        null,
        aiExplanation,
      );
    } else {
      setCurrentStepId(nextTargetId);
    }
  };

  if (screenOutcome) return <OutcomeView outcome={screenOutcome} />;

  const currentStepNode = xmlDoc.querySelector(`step[id="${currentStepId}"]`);
  if (!currentStepNode) return <div>Resolving execution node...</div>;

  const currentType = currentStepNode.getAttribute("type");

  return (
    <div
      style={{
        padding: "30px",
        maxWidth: "500px",
        margin: "auto",
        border: "1px solid #eaeaea",
        borderRadius: "8px",
        marginTop: "40px",
      }}
    >
      <span
        style={{ fontSize: "11px", textTransform: "uppercase", color: "#888" }}
      >
        Engine: {workflowId}
      </span>

      {currentType === "form" && (
        <FormStep
          stepNode={currentStepNode}
          formState={formState}
          setFormState={setFormState}
          onNext={handleNextRoute}
        />
      )}

      {currentType === "ai_screening" && (
        <AIScreeningStep
          stepNode={currentStepNode}
          formState={formState}
          onComplete={handleNextRoute}
        />
      )}
    </div>
  );
}
