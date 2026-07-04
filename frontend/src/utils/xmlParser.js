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

  const firstStep = doc.querySelector("step");
  if (!firstStep) {
    throw new Error("Workflow carries no valid processing steps.");
  }

  return {
    doc,
    workflowId: workflowNode.getAttribute("id"),
    firstStepId: firstStep.getAttribute("id"),
  };
};
