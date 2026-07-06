import { useState, useEffect } from "preact/hooks";
import { apiClient } from "../utils/api.js";

export function AIScreeningStep({
  stepNode,
  formState,
  sessionId, // Received from WorkflowEngine for stateful tracking
  onRecordAiEvaluation,
  onComplete,
}) {
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState(null);

  useEffect(() => {
    // Enterprise Memory Management: Native cancellation token
    const abortController = new AbortController();

    executeInference(abortController.signal);

    // Cleanup function fires if the component unmounts mid-request
    return () => abortController.abort();
  }, [stepNode]);

  const executeInference = async (signal) => {
    setLoading(true);
    setErrorState(null);

    try {
      const modelElement = stepNode.querySelector("model");
      const inputsPayload = {};

      // Support both <bindings> (legacy) and <map> (modern) syntax
      const bindings = stepNode.querySelectorAll("bindings input, map input");

      if (bindings.length > 0) {
        bindings.forEach((binding) => {
          const apiKey = binding.getAttribute("key");
          const formRef = binding.getAttribute("ref");
          inputsPayload[apiKey] = formState[formRef];
        });
      } else {
        Object.assign(inputsPayload, formState);
      }

      // Dynamically extract allowed branches to constrain the backend LLM prompt
      const branchNodes = Array.from(
        stepNode.querySelectorAll("routing branch, branch"),
      );
      const availableBranches = branchNodes
        .map((b) => b.getAttribute("when"))
        .filter(Boolean);

      const payload = {
        session_id: sessionId,
        model_name:
          modelElement?.getAttribute("name") || "llama-3.1-8b-instant",
        current_step_id: stepNode.getAttribute("id") || "ai_eval",
        step_inputs: inputsPayload,
        available_branches: availableBranches,
      };

      // Execute stateful inference against the new endpoint
      const result = await apiClient.post(
        "/api/v1/ai/mid-screen-eval",
        payload,
        { signal },
      );

      onRecordAiEvaluation({
        step_id: payload.current_step_id,
        model: payload.model_name,
        result: result,
      });

      const fallbackThreshold = parseFloat(
        stepNode.querySelector("fallback")?.getAttribute("threshold") || "0.70",
      );
      const fallbackTarget = stepNode
        .querySelector("fallback")
        ?.getAttribute("target");

      if (result.fallback_triggered) {
        console.warn(
          `[Tanuh AI Evaluation] Fallback triggered by server. Reason: ${result.error}`,
        );
      } else if (result.confidence < fallbackThreshold) {
        console.warn(
          `[Tanuh AI Evaluation] Confidence (${result.confidence}) is below threshold (${fallbackThreshold}). Executing fallback.`,
        );
      }

      // Route to human fallback if confidence is low or API explicitly triggered it
      if (result.fallback_triggered || result.confidence < fallbackThreshold) {
        if (fallbackTarget) return onComplete(fallbackTarget);
        throw new Error(
          "Threshold unfulfilled with no fallback target designated.",
        );
      }

      // Standard Deterministic Routing
      const matchedBranch = branchNodes.find(
        (b) => b.getAttribute("when") === result.label,
      );

      if (matchedBranch) {
        return onComplete(matchedBranch.getAttribute("target"));
      }

      const defaultNext = stepNode.getAttribute("next");
      if (defaultNext) {
        return onComplete(defaultNext);
      }

      throw new Error(
        `Unresolvable routing path for label configuration: "${result.label}"`,
      );
    } catch (err) {
      if (err.name === "AbortError") return; // Ignore errors caused by intentional unmounting

      console.error("[Tanuh AI Routing Crash]:", err);

      const errorTarget =
        stepNode
          .querySelector("fallback[type='error']")
          ?.getAttribute("target") ||
        stepNode.querySelector("fallback")?.getAttribute("target");

      if (errorTarget) {
        setErrorState({
          message:
            "Localized connectivity fluctuations observed. Routing safely to manual referral parameters.",
          target: errorTarget,
        });
      } else {
        setErrorState({
          message:
            "Communication dropout encountered. System was unable to map standard telemetry paths.",
          target: null,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "40px 20px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            width: "32px",
            height: "32px",
            border: "3px solid #e2e8f0",
            borderTop: "3px solid #1e293b",
            borderRadius: "50%",
            margin: "0 auto 16px auto",
            animation: "spin 0.8s linear infinite",
          }}
        ></div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        <p
          style={{
            fontSize: "15px",
            fontWeight: "600",
            color: "#1e293b",
            margin: "0 0 4px 0",
          }}
        >
          Evaluating Case Context
        </p>
        <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
          Processing accumulated state via Tanuh AI orchestration...
        </p>
      </div>
    );
  }

  if (errorState) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "20px 10px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ color: "#ef4444", marginBottom: "16px" }}>
          <svg
            style={{ width: "40px", height: "40px", margin: "0 auto" }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <p
          style={{
            color: "#0f172a",
            fontWeight: "600",
            fontSize: "15px",
            margin: "0 0 6px 0",
          }}
        >
          Evaluation Pipeline Disrupted
        </p>
        <p
          style={{
            color: "#475569",
            marginBottom: "24px",
            fontSize: "13px",
            lineHeight: "1.5",
          }}
        >
          {errorState.message}
        </p>

        {errorState.target ? (
          <button
            onClick={() => onComplete(errorState.target)}
            style={{
              width: "100%",
              padding: "12px",
              background: "#ef4444",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: "600",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Force Manual Safety Referral
          </button>
        ) : (
          <button
            onClick={() => executeInference()} // Retry without passing the event object
            style={{
              width: "100%",
              padding: "12px",
              background: "#2563eb",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: "600",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Retry Network Connection
          </button>
        )}
      </div>
    );
  }

  return null;
}
