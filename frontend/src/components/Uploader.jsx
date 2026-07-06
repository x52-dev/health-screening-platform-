import { useState } from "preact/hooks";

export function Uploader({ onFileLoaded }) {
  const [dragActive, setDragActive] = useState(false);
  const [errorState, setErrorState] = useState(null);

  const handleFile = (file) => {
    if (!file) return;
    setErrorState(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const rawText = evt.target.result;

      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(rawText, "application/xml");
        const parseError = xmlDoc.getElementsByTagName("parsererror");

        if (parseError.length > 0) {
          setErrorState("Upload Error: Invalid XML syntax detected.");
          return;
        }

        const workflowNode = xmlDoc.querySelector("workflow");
        if (!workflowNode) {
          setErrorState("Upload Error: Missing <workflow> root node.");
          return;
        }

        const workflowId = workflowNode.getAttribute("id");
        if (!workflowId) {
          setErrorState(
            "Upload Error: <workflow> must contain a valid 'id' attribute.",
          );
          return;
        }

        // Pass an object containing both the raw string and the extracted ID
        onFileLoaded({ rawText, workflowId });
      } catch (error) {
        console.error("XML Parsing fault:", error);
        setErrorState("Critical failure parsing the workflow file.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      style={{
        padding: "60px 20px",
        maxWidth: "640px",
        margin: "40px auto",
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: "#0f172a",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <div
          style={{
            display: "inline-block",
            padding: "6px 12px",
            background: "#f1f5f9",
            borderRadius: "9999px",
            fontSize: "12px",
            fontWeight: "600",
            color: "#64748b",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            marginBottom: "12px",
          }}
        >
          Tanuh AI • Gateway
        </div>
        <h2
          style={{
            fontSize: "28px",
            fontWeight: "700",
            letterSpacing: "-0.025em",
            margin: "0 0 10px 0",
            color: "#0f172a",
          }}
        >
          Dynamic Screening Engine
        </h2>
        <p
          style={{
            fontSize: "14px",
            lineHeight: "1.6",
            color: "#475569",
            maxWidth: "520px",
            margin: "0 auto",
          }}
        >
          Deploy or update clinical assessment configurations instantly without
          infrastructure downtime. Upload a conforming screening workflow
          configuration to initialize localized form steps, algorithmic
          branching trees, and downstream AI inference limits.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          handleFile(e.dataTransfer.files[0]);
        }}
        style={{
          border: `2px dashed ${errorState ? "#ef4444" : dragActive ? "#2563eb" : "#cbd5e1"}`,
          padding: "48px 32px",
          borderRadius: "12px",
          cursor: "pointer",
          background: errorState
            ? "#fef2f2"
            : dragActive
              ? "#eff6ff"
              : "#ffffff",
          boxShadow:
            "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)",
          textAlign: "center",
          transition: "all 0.2s ease-in-out",
        }}
      >
        <div style={{ marginBottom: "16px" }}>
          <svg
            style={{
              width: "48px",
              height: "48px",
              margin: "0 auto",
              color: errorState
                ? "#ef4444"
                : dragActive
                  ? "#2563eb"
                  : "#94a3b8",
              transition: "color 0.2s ease",
            }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength="1"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
        </div>

        {errorState ? (
          <p
            style={{
              fontSize: "15px",
              fontWeight: "600",
              color: "#b91c1c",
              margin: "0 0 24px 0",
            }}
          >
            {errorState}
          </p>
        ) : (
          <>
            <p
              style={{
                fontSize: "15px",
                fontWeight: "500",
                color: "#334155",
                margin: "0 0 6px 0",
              }}
            >
              Drag and drop your workflow file here
            </p>
            <p
              style={{
                fontSize: "13px",
                color: "#64748b",
                margin: "0 0 24px 0",
              }}
            >
              Supports XML structure definitions up to 5MB
            </p>
          </>
        )}

        <input
          type="file"
          accept=".xml"
          onChange={(e) => handleFile(e.target.files[0])}
          id="file-upload"
          style={{ display: "none" }}
        />

        <label
          htmlFor="file-upload"
          style={{
            display: "inline-block",
            padding: "10px 20px",
            background: "#1e293b",
            color: "#ffffff",
            fontSize: "14px",
            fontWeight: "600",
            borderRadius: "6px",
            cursor: "pointer",
            boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
            transition: "background 0.15s ease",
          }}
          onMouseOver={(e) => (e.target.style.background = "#0f172a")}
          onMouseOut={(e) => (e.target.style.background = "#1e293b")}
        >
          Browse Local Files
        </label>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          marginTop: "24px",
          fontSize: "12px",
          color: "#94a3b8",
        }}
      >
        <svg
          style={{ width: "14px", height: "14px", color: "#10b981" }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
        <span>Validated using Tanuh AI structural schema requirements</span>
      </div>
    </div>
  );
}
