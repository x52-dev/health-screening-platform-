import { useState } from "preact/hooks";
import { apiClient } from "../utils/api";
import { evaluateRuleSecurely } from "../utils/rulesEngine";

export function AIScreeningStep({ stepNode, formState, onComplete }) {
  const [loading, setLoading] = useState(false);

  const invokeAI = async () => {
    setLoading(true);
    try {
      const payload = {
        model_name: stepNode.querySelector("model")?.getAttribute("name"),
        version_constraint:
          stepNode.querySelector("model")?.getAttribute("version_constraint") ||
          "*",
        inputs: formState,
      };

      const result = await apiClient.post("/api/v1/ai/screen", payload);

      if (result.fallback_triggered || result.confidence < 0.75) {
        onComplete(
          null,
          "REFERRAL",
          "Confidence threshold not met",
          result.explanation,
        );
      } else {
        onComplete(null, "SUCCESS", null, result.explanation);
      }
    } catch (err) {
      console.error("Enterprise API Error:", err);
      onComplete(null, "ERROR", "System error during screening");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button disabled={loading} onClick={invokeAI}>
      Verify Assessment
    </button>
  );
}
