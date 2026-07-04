import { useState } from "preact/hooks";
import { parseWorkflowXML } from "./utils/xmlParser.js"; // add .js
import { Uploader } from "./components/Uploader.jsx"; // add .jsx
import { WorkflowEngine } from "./WorkflowEngine.jsx"; // add .jsx

export function App() {
  const [engineConfig, setEngineConfig] = useState(null);

  const handleXmlContent = (text) => {
    try {
      setEngineConfig(parseWorkflowXML(text));
    } catch (err) {
      alert(err.message);
    }
  };

  if (!engineConfig) {
    return <Uploader onFileLoaded={handleXmlContent} />;
  }

  return (
    <WorkflowEngine
      xmlDoc={engineConfig.doc}
      workflowId={engineConfig.workflowId}
      initialStepId={engineConfig.firstStepId}
    />
  );
}
