export function FormStep({ stepNode, formState, setFormState, onNext }) {
  const stepId = stepNode.getAttribute("id") || "unnamed_step";
  const nextTarget = stepNode.getAttribute("next");
  const fields = Array.from(stepNode.querySelectorAll("field") || []);

  const handleSubmit = (e) => {
    e.preventDefault();
    onNext(nextTarget);
  };

  const handleInputChange = (fieldId, type, value) => {
    // Treat both number and double as JavaScript Numbers for the JSON payload
    const processedValue =
      (type === "number" || type === "double") && value !== ""
        ? Number(value)
        : value;
    setFormState((prev) => ({ ...prev, [fieldId]: processedValue }));
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ fontFamily: "system-ui, sans-serif", color: "#0f172a" }}
    >
      <div
        style={{
          borderBottom: "1px solid #e2e8f0",
          paddingBottom: "16px",
          marginBottom: "24px",
        }}
      >
        <h3
          style={{
            fontSize: "20px",
            fontWeight: "700",
            textTransform: "capitalize",
            margin: 0,
          }}
        >
          {stepId.replace(/_/g, " ")}
        </h3>
      </div>

      {fields.length === 0 && (
        <div style={{ color: "#64748b", marginBottom: "20px" }}>
          No form inputs configured.
        </div>
      )}

      {fields.map((field, i) => {
        const fid = field.getAttribute("id") || `field_${i}`;
        const fType = field.getAttribute("type") || "string"; // The AI will map this to string, number, or double
        const isRequired = field.getAttribute("required") === "true";
        const hint = field.getAttribute("hint");

        // Define exact HTML attributes based on the rigid enum type
        let inputType = "text";
        let stepAttr = undefined;

        if (fType === "number") {
          inputType = "number";
          stepAttr = "1"; // Integers only
        } else if (fType === "double") {
          inputType = "number";
          stepAttr = "any"; // Allows decimals (floats)
        }

        return (
          <div key={fid} style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "6px",
                fontWeight: "600",
                fontSize: "14px",
              }}
            >
              {field.getAttribute("label") || fid}
              {isRequired && (
                <span style={{ color: "#ef4444", marginLeft: "4px" }}>*</span>
              )}
            </label>
            <input
              type={inputType}
              step={stepAttr}
              required={isRequired}
              placeholder={field.getAttribute("placeholder") || ""}
              onChange={(e) => handleInputChange(fid, fType, e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                fontSize: "14px",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                boxSizing: "border-box",
              }}
              value={formState[fid] ?? ""}
            />
            {hint && (
              <span
                style={{
                  display: "block",
                  marginTop: "6px",
                  fontSize: "12px",
                  color: "#64748b",
                  lineHeight: "1.4",
                }}
              >
                💡 {hint}
              </span>
            )}
          </div>
        );
      })}

      <button
        type="submit"
        style={{
          width: "100%",
          padding: "12px",
          background: "#1e293b",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          marginTop: "12px",
        }}
      >
        {nextTarget ? "Continue Pipeline" : "Conclude Pipeline"}
      </button>
    </form>
  );
}
