import { FormStep } from "./FormStep.jsx";
import { AIScreeningStep } from "./AIScreeningStep.jsx";

export function StepRenderer({
  stepNode,
  formState,
  setFormState,
  onRecordAiEvaluation,
  onNext,
}) {
  const type = stepNode.getAttribute("type");

  switch (type) {
    case "form":
      return (
        <FormStep
          stepNode={stepNode}
          formState={formState}
          setFormState={setFormState}
          onNext={onNext}
        />
      );
    case "ai_screening":
      return (
        <AIScreeningStep
          stepNode={stepNode}
          formState={formState}
          onRecordAiEvaluation={onRecordAiEvaluation}
          onComplete={onNext}
        />
      );
    default:
      return (
        <div style={{ color: "red" }}>
          Unsupported step execution context: {type}
        </div>
      );
  }
}
