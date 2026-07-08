import { useState, useEffect } from "preact/hooks";
import { apiClient } from "../utils/api.js";

export function AIScreeningStep({
  stepNode,
  formState,
  sessionId,
  onRecordAiEvaluation,
  onComplete,
}) {
  const [error, setError] = useState(null);

  useEffect(() => {
    const runInference = async () => {
      try {
        let inputNodes = Array.from(
          stepNode.querySelectorAll("bindings input"),
        );
        if (inputNodes.length === 0) {
          inputNodes = Array.from(stepNode.querySelectorAll("map input"));
        }

        const stepInputs = {};
        inputNodes.forEach((node) => {
          const key = node.getAttribute("key");
          const ref = node.getAttribute("ref");
          if (formState[ref] !== undefined) {
            stepInputs[key] = formState[ref];
          }
        });

        const modelNode = stepNode.querySelector("model");
        const modelName = modelNode
          ? modelNode.getAttribute("name")
          : "llama-3.1-8b-instant";

        const branchNodes = Array.from(
          stepNode.querySelectorAll("routing branch"),
        );
        const availableBranches = branchNodes.map((b) =>
          b.getAttribute("when"),
        );

        const res = await apiClient.post("/api/v1/ai/mid-screen-eval", {
          session_id: sessionId,
          model_name: modelName,
          current_step_id: stepNode.getAttribute("id"),
          step_inputs: stepInputs,
          available_branches: availableBranches,
        });

        if (onRecordAiEvaluation) {
          onRecordAiEvaluation(res);
        }

        if (res.fallback_triggered) {
          const fallbackNode = stepNode.querySelector("fallback");
          onComplete(fallbackNode ? fallbackNode.getAttribute("target") : null);
          return;
        }

        const selectedBranch = branchNodes.find(
          (b) => b.getAttribute("when") === res.label,
        );
        // THE FIX: Fall back to the 'next' attribute if the AI label doesn't match a specific branch
        const defaultTarget = stepNode.getAttribute("next");
        onComplete(
          selectedBranch
            ? selectedBranch.getAttribute("target")
            : defaultTarget,
        );
      } catch (err) {
        console.error("AI node exception:", err);
        const fallbackNode = stepNode.querySelector("fallback");
        onComplete(fallbackNode ? fallbackNode.getAttribute("target") : null);
      }
    };
    runInference();
  }, []);

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
        AI Inference Matrix Active
      </p>
      <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
        Evaluating telemetry against clinical parameters...
      </p>
    </div>
  );
}
