export const evaluateRuleSecurely = (branchElement, aiLabel, formState) => {
  if (!branchElement) return false;

  // 1. Modern Architecture: Direct string matching against the 'when' attribute.
  // Example matches: <branch when="civil_litigation" target="..." />
  const whenAttr = branchElement.getAttribute("when");
  if (whenAttr && aiLabel) {
    return whenAttr === aiLabel;
  }

  // 2. Legacy Architecture: Evaluate complex string conditions if 'when' is absent.
  const conditionStr = branchElement.getAttribute("condition");
  if (!conditionStr) return false;

  // Evaluate AI Results (e.g., condition="result.label == 'severe'")
  const aiPattern = /result\.label\s*==\s*['"]([^'"]+)['"]/;
  const aiMatch = conditionStr.match(aiPattern);
  if (aiMatch && aiLabel === aiMatch[1]) {
    return true;
  }

  // Evaluate Prior Form Answers (e.g., condition="form.patient_age > 60")
  const formPattern = /form\.([a-zA-Z0-9_]+)\s*(>|<|==)\s*([0-9]+)/;
  const formMatch = conditionStr.match(formPattern);
  if (formMatch) {
    const field = formMatch[1];
    const operator = formMatch[2];
    const targetValue = parseFloat(formMatch[3]);
    const actualFormValue = parseFloat(formState[field]);

    if (operator === ">") return actualFormValue > targetValue;
    if (operator === "<") return actualFormValue < targetValue;
    if (operator === "==") return actualFormValue === targetValue;
  }

  return false;
};
