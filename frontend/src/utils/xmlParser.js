export const parseWorkflowXML = (text) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "application/xml");

  if (doc.getElementsByTagName("parsererror").length > 0) {
    throw new Error("Invalid XML Structure detected.");
  }

  const workflowNode = doc.querySelector("workflow");
  if (!workflowNode) {
    throw new Error("Missing root <workflow> element.");
  }

  // 1. Attempt to read an explicit entry point from the root node[cite: 5]
  let firstStepId =
    workflowNode.getAttribute("firstStepId") ||
    workflowNode.getAttribute("first_step_id");

  // 2. Tag-Agnostic Fallback: Find the first top-level child that has an 'id' attribute
  if (!firstStepId) {
    const firstNodeWithId = Array.from(workflowNode.children).find((child) =>
      child.hasAttribute("id"),
    );
    if (!firstNodeWithId) {
      throw new Error(
        "Workflow carries no valid processing nodes with an 'id'.",
      );
    }
    firstStepId = firstNodeWithId.getAttribute("id");
  }

  return {
    doc,
    workflowId: workflowNode.getAttribute("id"),
    firstStepId,
  };
};
