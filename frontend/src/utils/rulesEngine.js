export const evaluateRuleSecurely = (conditionStr, aiLabel, formState) => {
  if (!conditionStr) return false;

  // 1. Evaluate AI Results (e.g., condition="result.label == 'severe'")
  const aiPattern = /result\.label\s*==\s*['"]([^'"]+)['"]/;
  const aiMatch = conditionStr.match(aiPattern);
  if (aiMatch && aiLabel === aiMatch[1]) {
    return true;
  }

  // 2. Evaluate Prior Form Answers (e.g., condition="form.patient_age > 60")
  const formPattern = /form\.([a-zA-Z0-9_]+)\s*(>|<|==)\s*([0-9]+)/;
  const formMatch = conditionStr.match(formPattern);
  if (formMatch) {
    const field = formMatch[1];
    const operator = formMatch[2];
    const targetValue = parseFloat(formMatch[3]);
    const actualFormValue = parseFloat(formState[field]);

    // Safely compare without using eval()
    if (operator === ">") return actualFormValue > targetValue;
    if (operator === "<") return actualFormValue < targetValue;
    if (operator === "==") return actualFormValue === targetValue;
  }

  return false;
};
