import { useState } from "preact/hooks";
import { parseWorkflowXML } from "./utils/xmlParser.js";
import { Uploader } from "./components/Uploader.jsx";
import { WorkflowEngine } from "./WorkflowEngine.jsx";

export function App() {
  const [engineConfig, setEngineConfig] = useState(null);

  // Updated to accept the robust payload from the Enterprise Uploader
  const handleFileLoaded = (payload) => {
    try {
      const parsedConfig = parseWorkflowXML(payload.rawText);
      setEngineConfig({
        ...parsedConfig,
        // Override with the securely extracted ID from the Uploader if present
        workflowId: payload.workflowId || parsedConfig.workflowId,
      });
    } catch (err) {
      alert(err.message);
    }
  };

  if (!engineConfig) {
    return <Uploader onFileLoaded={handleFileLoaded} />;
  }

  return (
    <WorkflowEngine
      xmlDoc={engineConfig.doc}
      workflowId={engineConfig.workflowId}
      initialStepId={engineConfig.firstStepId}
    />
  );
}
