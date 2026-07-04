// src/components/StepRenderer.jsx
export function StepRenderer({ stepNode, formState, onStateChange, onNext }) {
  const type = stepNode.getAttribute("type");

  if (type === "form") {
    // Render standard UI inputs
    const fields = Array.from(stepNode.querySelectorAll("field"));

    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onNext(stepNode.getAttribute("next"));
        }}
      >
        {fields.map((field) => (
          <div key={field.getAttribute("id")}>
            <label>{field.getAttribute("label")}</label>
            <input
              type={field.getAttribute("type") === "number" ? "number" : "text"}
              onChange={(e) =>
                onStateChange({
                  ...formState,
                  [field.getAttribute("id")]: e.target.value,
                })
              }
            />
          </div>
        ))}
        <button type="submit">Next</button>
      </form>
    );
  }

  if (type === "ai_screening") {
    // Trigger your AI API call here
    // Use the explicit `<map>` tags in the XML to pull from formState
    // Then evaluate `<routing>` to determine what ID to pass to onNext()
    return <div>Evaluating AI... Please wait.</div>;
  }

  return <div>Unknown step type</div>;
}
