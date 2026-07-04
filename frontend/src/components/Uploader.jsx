import { useState } from "preact/hooks";

export function Uploader({ onFileLoaded }) {
  const [dragActive, setDragActive] = useState(false);

  const handleFile = (file) => {
    const reader = new FileReader();
    reader.onload = (evt) => onFileLoaded(evt.target.result);
    reader.readAsText(file);
  };

  return (
    <div
      style={{
        padding: "40px",
        maxWidth: "600px",
        margin: "auto",
        textAlign: "center",
      }}
    >
      <h2>Public Health Screening Engine</h2>
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
          border: `2px dashed ${dragActive ? "#0070f3" : "#ccc"}`,
          padding: "40px 20px",
          borderRadius: "8px",
          cursor: "pointer",
          background: dragActive ? "#f0f8ff" : "#fafafa",
        }}
      >
        <p>
          Drag and drop your <strong>workflow XML file</strong> here
        </p>
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
            padding: "8px 16px",
            background: "#0070f3",
            color: "#fff",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Select File
        </label>
      </div>
    </div>
  );
}
