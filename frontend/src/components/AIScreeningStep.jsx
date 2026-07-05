import { useState, useEffect } from "preact/hooks";
import { apiClient } from "../utils/api.js";

export function AIScreeningStep({
  stepNode,
  formState,
  onRecordAiEvaluation,
  onComplete,
}) {
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState(null);

  useEffect(() => {
    executeInference();
  }, [stepNode]);

  const executeInference = async () => {
    setLoading(true);
    setErrorState(null);

    try {
      const modelElement = stepNode.querySelector("model");
      const inputsPayload = {};
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

      const payload = {
        model_name: modelElement?.getAttribute("name") || "default-model",
        version_constraint:
          modelElement?.getAttribute("version_constraint") || "*",
        inputs: inputsPayload,
      };

      const result = await apiClient.post("/api/v1/ai/screen", payload);

      onRecordAiEvaluation({
        step_id: stepNode.getAttribute("id"),
        model: payload.model_name,
        result: result,
      });

      const fallbackThreshold = parseFloat(
        stepNode.querySelector("fallback")?.getAttribute("threshold") || "0.70",
      );
      const fallbackTarget = stepNode
        .querySelector("fallback")
        ?.getAttribute("target");

      // FIXED: Swapped out server-side logger reference with proper client logging wrappers
      if (result.fallback_triggered || result.confidence < fallbackThreshold) {
        console.warn(
          `[Tanuh AI Evaluation] Confidence (${result.confidence}) beneath threshold (${fallbackThreshold}). Executing fallback.`,
        );
        if (fallbackTarget) return onComplete(fallbackTarget);
        throw new Error(
          "Threshold unfulfilled with no fallback target designated.",
        );
      }

      const branches = Array.from(
        stepNode.querySelectorAll("routing branch, branch"),
      );
      const matchedBranch = branches.find(
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
        {/* Portable Core CSS Micro-Spinner */}
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
          Evaluating Clinical Telemetry
        </p>
        <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
          Processing localized risk factors via Tanuh AI nodes...
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
            onClick={executeInference}
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
