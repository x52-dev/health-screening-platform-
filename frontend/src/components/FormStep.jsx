export function FormStep({ stepNode, formState, setFormState, onNext }) {
  const stepId = stepNode.getAttribute("id");
  const nextTarget = stepNode.getAttribute("next");
  const fields = Array.from(stepNode.querySelectorAll("field"));

  const handleSubmit = (e) => {
    e.preventDefault();
    onNext(nextTarget);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>{stepId.replace("_", " ").toUpperCase()}</h3>
      {fields.map((field) => {
        const fid = field.getAttribute("id");
        return (
          <div key={fid} style={{ marginBottom: "15px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontWeight: "bold",
              }}
            >
              {field.getAttribute("label") || fid}
            </label>
            <input
              type={field.getAttribute("type") === "number" ? "number" : "text"}
              required={field.getAttribute("required") === "true"}
              style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
              value={formState[fid] || ""}
              onInput={(e) =>
                setFormState({ ...formState, [fid]: e.target.value })
              }
            />
          </div>
        );
      })}
      <button
        type="submit"
        style={{
          width: "100%",
          padding: "10px",
          background: "#222",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
        }}
      >
        Continue Next
      </button>
    </form>
  );
}
