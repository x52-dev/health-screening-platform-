export function FormStep({ stepNode, formState, setFormState, onNext }) {
  const stepId = stepNode.getAttribute("id");
  const nextTarget = stepNode.getAttribute("next");
  const fields = Array.from(stepNode.querySelectorAll("field"));

  const handleSubmit = (e) => {
    e.preventDefault();
    onNext(nextTarget);
  };

  const handleInputChange = (fieldId, type, value) => {
    const processedValue =
      type === "number" && value !== "" ? Number(value) : value;
    setFormState((prev) => ({ ...prev, [fieldId]: processedValue }));
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
          {stepId.replace(/_/g, " ")}
        </h3>
      </div>

      {fields.map((field) => {
        const fid = field.getAttribute("id");
        const fType = field.getAttribute("type") || "text";
        const isRequired = field.getAttribute("required") === "true";
        const minAttr = field.getAttribute("min");
        const maxAttr = field.getAttribute("max");
        const patternAttr = field.getAttribute("pattern");
        const explicitHint = field.getAttribute("hint");

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
              min={minAttr || undefined}
              max={maxAttr || undefined}
              pattern={patternAttr || undefined}
              placeholder={field.getAttribute("placeholder") || ""}
              onChange={(e) => handleInputChange(fid, fType, e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: "14px",
                color: "#0f172a",
                backgroundColor: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                boxSizing: "border-box",
              }}
              value={formState[fid] ?? ""}
            />
            {explicitHint && (
              <span
                style={{
                  display: "block",
                  marginTop: "6px",
                  fontSize: "12px",
                  color: "#64748b",
                  lineHeight: "1.4",
                }}
              >
                💡 {explicitHint}
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
        {nextTarget ? "Save & Continue Forward" : "Submit & Conclude Pipeline"}
      </button>
    </form>
  );
}
