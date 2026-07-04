````markdown
# Public Health Screening Platform - Backend Service

## 📖 Description

This repository contains the backend service for a config-driven, AI-assisted public health screening platform. Designed for field health workers operating on low-end devices in areas with poor internet connectivity, the system serves dynamic XML workflows. This allows new screenings (e.g., anemia, malnutrition) to be deployed instantly without requiring application code updates on the client devices.

The backend acts as the source of truth for the workflow engine, provides a simulated ML inference endpoint for AI-assisted diagnoses, and handles highly resilient, idempotent data submissions.

---

## 🏗 Technical Architecture

The service is built using **Python 3.11** and **FastAPI**, containerized via **Docker**.

### Key Architectural Pillars:

- **Server-Driven UI (SDUI):** The frontend is entirely generic. It fetches an XML blueprint from this API, parses it, and dynamically renders the UI step-by-step.
- **Low-Bandwidth Optimization:** The API utilizes `GZipMiddleware` to compress XML payloads. It also generates and validates `ETag` headers. If a device requests a workflow it already has, the server returns a `304 Not Modified`, saving critical bandwidth.
- **Idempotent Mutations:** To combat intermittent network drops, the submission endpoint requires an `X-Idempotency-Key`. Retried submissions from the field drop safely into a cache, returning a `200 OK` rather than duplicating medical records.
- **Unhappy Path Simulation:** The mock AI endpoint is designed to intentionally test the frontend's resilience. It can simulate HTTP 502 pipeline errors or return "low confidence" scores based on specific inputs, triggering the XML's defined fallback routing.

---

## 📜 API Contract

You can view the full interactive OpenAPI specification by running the project and navigating to `http://localhost:8000/docs`.

### 1. Fetch Workflow

- **Endpoint:** `GET /api/v1/workflows/{workflow_id}`
- **Headers:** Supports `If-None-Match: <etag>`
- **Response:** Returns `application/xml` (or `304 Not Modified`).

### 2. Mock AI Screening

- **Endpoint:** `POST /api/v1/ai/screen`
- **Payload:** `{"model_name": "string", "version_constraint": "string", "inputs": {}}`
- **Response:**
  ```json
  {
    "label": "severe",
    "score": 0.92,
    "confidence": 0.95,
    "fallback_triggered": false
  }
  ```
````

- **Errors:** Returns `502 Bad Gateway` if the AI pipeline fails.

### 3. Submit Outcome

- **Endpoint:** `POST /api/v1/submissions`
- **Headers:** `X-Idempotency-Key: <uuid>` (Required)
- **Payload:** `{"workflow_id": "string", "collected_inputs": {}, "final_outcome_id": "string"}`
- **Response:** Returns `201 Created` (first pass) or `200 OK` (cache hit/duplicate).

---

## 🧩 The XML Workflow Format

The XML format describes a finite state machine. It guarantees that adding a new screening requires zero code changes to the frontend or backend.

**Core Elements:**

- `<step>`: Defines a UI form or an AI evaluation step.
- `<model>` & `<inputs>`: Defines exactly which model to call and maps UI form answers to the AI's required input features.
- `<thresholds>` & `<fallback>`: Defines confidence floors and what the UI should do if the AI fails or is uncertain (e.g., "route to clinical exam").
- `<routing>`: Evaluates branch conditions (e.g., `result.label == 'severe'`) to direct the user to the correct next step.
- `<outcomes>`: The terminal states of the workflow (e.g., "URGENT_REFERRAL").

---

## ⚖️ Trade-offs & Design Choices (360° Alignment)

### What Was Deliberately Left Out

- **Persistent Database (Postgres/MongoDB):** For the scope of this assignment and to ensure frictionless local execution without heavy dependencies, workflows and idempotent submissions are stored in memory. In production, submissions would write to a persistent database, and workflows would be fetched from an S3 bucket or a CMS.
- **Authentication/Authorization:** Dropped to focus purely on the workflow engine mechanics.
- **Automated Tests:** Omitted as explicitly allowed by the assignment prompt, prioritizing architecture and contract design.

### Security

- **XSS Prevention:** The XML is purely declarative configuration. The frontend contract dictates that the XML must be parsed securely via `DOMParser` and never injected directly into the DOM via `innerHTML`.
- **Fail Closed:** If the backend receives unrecognized properties or a workflow requests a model that does not exist, the API drops the request and throws a 400-level error.

### Extensibility & Versioning

- **New Input Types:** Adding a new form field type (e.g., an image uploader) only requires updating the frontend interpreter to recognize `<field type="image">`. The backend is completely agnostic to the inputs; it simply stores the resulting JSON dictionary.
- **API Versioning:** The API is versioned at the route level (`/api/v1/`). Workflows themselves carry a `version="1.0.0"` attribute.

### Authoring & Provisioning (Future State)

- **Authoring:** Non-engineers (clinical teams) would author these workflows using a low-code drag-and-drop web interface (like a flowchart builder), which compiles the visual nodes into this XML format behind the scenes.
- **Provisioning:** Published workflows would be pushed to a CDN. Field devices could sync workflows in the background during periods of strong connectivity, allowing full offline capability later.

---

## 🚀 How to Run Locally

This project is fully containerized. You do not need Python installed on your local machine—only Docker.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

### Execution Steps

1. Open your terminal and navigate to the project directory:

```bash
cd health-screening-platform

```

2. Build and start the container using Docker Compose:

```bash
docker compose up --build

```

3. The server will start on port `8000`.
4. View the interactive API documentation and test endpoints directly at:
   **[http://localhost:8000/docs](http://localhost:8000/docs)**

### Stopping the Server

Press `CTRL+C` in your terminal, or run:

```bash
docker compose down

```

```

```
# health-screening-platform-
