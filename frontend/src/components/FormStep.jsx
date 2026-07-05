export function FormStep({ stepNode, formState, setFormState, onNext }) {
  const stepId = stepNode.getAttribute("id");
  const nextTarget = stepNode.getAttribute("next");
  const fields = Array.from(stepNode.querySelectorAll("field"));

  const handleSubmit = (e) => {
    e.preventDefault();
    onNext(nextTarget);
  };

  const handleInputChange = (fieldId, type, value) => {
    // Instantly remove custom validation blocks so the user can re-submit
    const inputElement = document.getElementById(`input-${fieldId}`);
    if (inputElement) {
      inputElement.setCustomValidity("");
    }

    // Retain proper scalar type metrics for downstream AI payloads
    const processedValue =
      type === "number" && value !== "" ? Number(value) : value;
    setFormState({ ...formState, [fieldId]: processedValue });
  };

  const handleInvalidInput = (e, hintText) => {
    // Intercept default browser text and swap with custom XML or fallback strings
    if (hintText) {
      e.target.setCustomValidity(hintText);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: "#0f172a",
      }}
    >
      {/* Module Title Section */}
      <div
        style={{
          borderBottom: "1px solid #e2e8f0",
          paddingBottom: "16px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            fontWeight: "600",
            color: "#64748b",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: "4px",
          }}
        >
          Active Module Stage
        </div>
        <h3
          style={{
            fontSize: "20px",
            fontWeight: "700",
            textTransform: "capitalize",
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          {stepId.replace("_", " ")}
        </h3>
      </div>

      {/* Dynamic Field Generation Map */}
      {fields.map((field) => {
        const fid = field.getAttribute("id");
        const fType = field.getAttribute("type") || "text";
        const isRequired = field.getAttribute("required") === "true";

        const minAttr = field.getAttribute("min");
        const maxAttr = field.getAttribute("max");
        const patternAttr = field.getAttribute("pattern");
        let hintAttr = field.getAttribute("hint");

        // --- DEFENSIVE UX FALLBACK HINT ENGINE ---
        // Prevents unassisted browser blockages if the XML developer forgot hints
        if (!hintAttr) {
          if (patternAttr) {
            hintAttr =
              "Input value format constraint unmet. Verify options or syntax.";
          } else if (minAttr && maxAttr) {
            hintAttr = `Numerical value constraint violated. Input must lie between ${minAttr} and ${maxAttr}.`;
          } else if (minAttr) {
            hintAttr = `Value threshold violation. Minimum accepted range is ${minAttr}.`;
          } else if (maxAttr) {
            hintAttr = `Value threshold violation. Maximum accepted bounds limit is ${maxAttr}.`;
          } else if (isRequired) {
            hintAttr =
              "This clinical metrics marker is required for assessment computation.";
          }
        }

        return (
          <div key={fid} style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "6px",
                fontWeight: "600",
                fontSize: "14px",
                color: "#334155",
              }}
            >
              {field.getAttribute("label") || fid}
              {isRequired && (
                <span style={{ color: "#ef4444", marginLeft: "4px" }}>*</span>
              )}
            </label>

            <input
              id={`input-${fid}`}
              type={fType === "number" ? "number" : "text"}
              required={isRequired}
              min={minAttr}
              max={maxAttr}
              pattern={patternAttr}
              placeholder={field.getAttribute("placeholder") || ""}
              onInvalid={(e) => handleInvalidInput(e, hintAttr)}
              onInput={(e) => handleInputChange(fid, fType, e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: "14px",
                color: "#0f172a",
                backgroundColor: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                boxSizing: "border-box",
                transition: "border-color 0.15s ease",
              }}
              value={formState[fid] ?? ""}
            />

            {/* Visual Assist Helper Caption */}
            {hintAttr && (
              <span
                style={{
                  display: "block",
                  marginTop: "6px",
                  fontSize: "12px",
                  color: "#64748b",
                  lineHeight: "1.4",
                }}
              >
                💡 {hintAttr}
              </span>
            )}
          </div>
        );
      })}

      {/* Submission trigger */}
      <button
        type="submit"
        style={{
          width: "100%",
          padding: "12px",
          background: "#1e293b",
          color: "#ffffff",
          fontSize: "14px",
          fontWeight: "600",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          marginTop: "12px",
          transition: "background 0.15s ease",
          boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        }}
        onMouseOver={(e) => (e.target.style.background = "#0f172a")}
        onMouseOut={(e) => (e.target.style.background = "#1e293b")}
      >
        Save & Continue Forward
      </button>
    </form>
  );
}
