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
  const [isProcessing, setIsProcessing] = useState(false); // NEW: Tracks AI ETL Processing

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
    setIsProcessing(true); // Trigger loading overlay
    try {
      await apiClient.post("/api/v1/workflows", {
        workflow_id: payload.workflowId,
        xml_content: payload.rawText,
      });
      await fetchData();
    } catch (err) {
      alert("AI Formatting Engine Failed: " + err.message);
    } finally {
      setIsProcessing(false); // Release loading overlay
    }
  };

  const handleLaunchWorkflow = async (workflowId) => {
    try {
      const xmlText = await apiClient.get(`/api/v1/workflows/${workflowId}`);
      const parsedConfig = parseWorkflowXML(xmlText);
      setEngineConfig({ ...parsedConfig, workflowId: workflowId });
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
        onExit={() => {
          setEngineConfig(null);
          fetchData();
        }}
      />
    );
  }

  return (
    <div style={{ position: "relative" }}>
      {/* PROCESSING OVERLAY */}
      {isProcessing && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(255,255,255,0.85)",
            zIndex: 999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "system-ui",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "4px solid #cbd5e1",
              borderTop: "4px solid #2563eb",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          ></div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <h2 style={{ color: "#0f172a", marginTop: "20px" }}>
            AI Sanitization Engine Active
          </h2>
          <p style={{ color: "#64748b", margin: 0 }}>
            Restructuring XML to strict enterprise schema...
          </p>
        </div>
      )}

      <Uploader onFileLoaded={handleUploadSuccess} />
      <WorkflowTable workflows={dbWorkflows} onLaunch={handleLaunchWorkflow} />
      <SubmissionTable
        submissions={dbSubmissions}
        onEdit={handleEditSubmission}
      />
    </div>
  );
}
