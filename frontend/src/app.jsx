import { useState, useEffect } from "preact/hooks";
import { parseWorkflowXML } from "./utils/xmlParser.js";
import { apiClient } from "./utils/api.js";
import { Uploader } from "./components/Uploader.jsx";
import { WorkflowTable } from "./components/WorkflowTable.jsx";
import { SubmissionTable } from "./components/SubmissionTable.jsx";
import { WorkflowEngine } from "./WorkflowEngine.jsx";

export function App() {
  const [engineConfig, setEngineConfig] = useState(null);
  const [dbWorkflows, setDbWorkflows] = useState([]);
  const [dbSubmissions, setDbSubmissions] = useState([]);

  const fetchData = async () => {
    try {
      const wfRes = await apiClient.get("/api/v1/workflows");
      setDbWorkflows(wfRes.workflows);
      const subRes = await apiClient.get("/api/v1/submissions");
      setDbSubmissions(subRes.submissions);
    } catch (err) {
      console.error("Failed to fetch database records:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUploadSuccess = async (payload) => {
    try {
      await apiClient.post("/api/v1/workflows", {
        workflow_id: payload.workflowId,
        xml_content: payload.rawText,
      });
      fetchData();
      alert(
        `Workflow ${payload.workflowId} synchronized to database successfully!`,
      );
    } catch (err) {
      alert("Failed to save workflow to database: " + err.message);
    }
  };

  const handleLaunchWorkflow = async (workflowId) => {
    try {
      const xmlText = await apiClient.get(`/api/v1/workflows/${workflowId}`);
      const parsedConfig = parseWorkflowXML(xmlText);
      setEngineConfig({
        ...parsedConfig,
        workflowId: workflowId,
      });
    } catch (err) {
      alert(`Failed to load workflow execution engine: ${err.message}`);
    }
  };

  const handleEditSubmission = async (submission) => {
    try {
      const xmlText = await apiClient.get(
        `/api/v1/workflows/${submission.workflow_id}`,
      );
      const parsedConfig = parseWorkflowXML(xmlText);
      setEngineConfig({
        ...parsedConfig,
        workflowId: submission.workflow_id,
        existingSubmissionId: submission.submission_id,
        initialFormState: submission.collected_inputs,
        initialAiSummary: submission.ai_summary,
      });
    } catch (err) {
      alert(`Failed to load submission for editing: ${err.message}`);
    }
  };

  if (engineConfig) {
    return (
      <WorkflowEngine
        xmlDoc={engineConfig.doc}
        workflowId={engineConfig.workflowId}
        initialStepId={engineConfig.firstStepId}
        existingSubmissionId={engineConfig.existingSubmissionId}
        initialFormState={engineConfig.initialFormState}
        initialAiSummary={engineConfig.initialAiSummary}
        // THE FIX: Pass a clean exit handler that drops you back to the Gateway
        onExit={() => {
          setEngineConfig(null);
          fetchData(); // Ensures the tables show any edits you just made
        }}
      />
    );
  }

  return (
    <div>
      <Uploader onFileLoaded={handleUploadSuccess} />
      <WorkflowTable workflows={dbWorkflows} onLaunch={handleLaunchWorkflow} />
      <SubmissionTable
        submissions={dbSubmissions}
        onEdit={handleEditSubmission}
      />
    </div>
  );
}
