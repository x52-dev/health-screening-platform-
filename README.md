# Tanuh AI • Dynamic Public Health Screening Platform

An enterprise-grade, configuration-driven full-stack wizard architecture built to empower field health workers executing AI-assisted clinical screenings (e.g., anemia risk, malnutrition triage) in disconnected, low-bandwidth, and low-resource environments.

The system serves dynamic XML workflows, allowing new screenings to be deployed instantly without requiring application code updates or frontend deployments on client devices.

---

## 📋 Overview

### What It Does

The platform converts clinical screening protocols into declarative **XML Schemas**. Instead of hardcoding specialized user interfaces or diagnostic code patterns for every separate public health initiative, a single full-stack runtime ingests any conforming XML file, dynamically builds multi-step forms, enforces native data boundary validations, triggers abstract AI evaluations, tracks branching decisions, and submits persistent telemetry back to base servers.

### How It Works

```
[ XML Config Ingestion ] ──> [ Generic Step Renderer ] ──> [ Native HTML5 Validation Engine ]
                                                                     │
[ Idempotent Ingestion ] <── [ Final Resolution ] <── [ Branching Matrix ] <── [ Async AI Node (Groq) ]


```

### Things to do next:

- OCR based screening and questionaire generation
- Multi tenant DB architecture for different vendor or organisation

1. **Schema Parsing:** The frontend fetches or accepts an XML blueprint declaring form panels, numeric ranges, text patterns, parameter mappings for AI models, and custom routing logic.
2. **Contextual UI Generation:** The generic layout generator initializes a clean multi-step wizard. It dynamically type-casts entries to maintain mathematical schema precision.
3. **Decoupled AI Processing:** Mid-form or terminal AI screening nodes isolate explicitly bounded variables and relay requests to an abstract FastAPI endpoint driven by high-speed Groq inference networks.
4. **Conditional Routing:** The engine processes the metric classifications returned by the model (`high_risk`, `mild`, `normal`) against local XML tags to trigger deep form branches or transition to final outcomes.
5. **Resilient Synchronization:** When a terminal screen is reached, a client-side transaction token is combined with a deduplication cache on the backend to guarantee safe data persistence over unstable networks.

---

## 🏗 Technical Architecture & Tech Stack

The architecture splits responsibilities cleanly between a lightweight, server-driven frontend client and a high-performance, stateless backend utility.

| Layer                   | Technology                 | Operational Justification                                                                                                                                                               |
| ----------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend Runtime**    | **Preact (v10+)**          | Chosen over heavy frontend frameworks to minimize bundle footprints (~3.5KB runtime library). Fast to download, parse, and reach Time to Interactive (TTI) on low-spec Android devices. |
| **Frontend Bundler**    | **Vite**                   | Blazing fast compilation, dead-code elimination, and highly streamlined asset tree shaking.                                                                                             |
| **Backend Core**        | **FastAPI (Python 3.11+)** | High-performance asynchronous execution loop, native OpenAPI documentation generation, and rapid JSON serialization.                                                                    |
| **AI Inference Engine** | **Groq Client SDK**        | Utilizes `llama-3.1-8b-instant` for ultra-low latency response compilation using strict structural JSON object returns.                                                                 |
| **Cache & Resilience**  | **Cachetools (TTLCache)**  | In-memory time-to-live structures optimizing deduplication filters without inflating infrastructure footprint.                                                                          |

### Low-Latency & Low-Bandwidth Network Optimization Strategies

- **Server-Driven UI (SDUI):** The frontend is entirely generic. It interprets the XML blueprint step-by-step, shifting operational configurations into data profiles rather than forcing heavy layout deployments over cellular loops.
- **Cache-Aware Workflows:** The API utilizes `GZipMiddleware` to compress XML payloads and generates `ETag` headers. If a field client requests a workflow configuration it has already cached locally, the server immediately returns a `304 Not Modified`, saving critical bandwidth.
- **Zero-Dependency Input Validation:** Rather than loading massive third-party client validation frameworks, the engine implements **native browser HTML5 constraints** (`min`, `max`, `pattern`). This offloads logic processing directly to browser engines, minimizing bundle bloat and CPU load on old hardware.
- **Zero-Trust Idempotency Pipeline:** To combat intermittent network drops, the final submission endpoint implements an automatic checking matrix (evaluating both HTTP headers and underlying JSON body parameters via `submission_id`). Retried submissions from the field drop safely into an in-memory deduplication cache, returning a safe resolution payload instead of creating duplicate records.

---

## 📜 API Contract

View the full interactive OpenAPI specification by running the server and navigating to `http://localhost:8000/docs`.

### 1. Fetch Workflow Definition

Serves raw XML workflow configurations dynamically to the generic frontend renderer client.

- **Endpoint:** `GET /api/v1/workflows/{workflow_id}`
- **Headers Supported:** `If-None-Match: <etag>`
- **Response Type:** `application/xml` (or `304 Not Modified`)

### 2. Mock AI Screening

Executes a step-specific or mid-workflow AI evaluation against abstract model versions using isolated JSON parameters.

- **Endpoint:** `POST /api/v1/ai/screen`
- **Payload Structure:**

```json
{
  "model_name": "pulmo-risk-classifier",
  "version_constraint": "^1.1.0",
  "inputs": {
    "cough": 5,
    "fever": "yes"
  }
}
```

- **Response Structure:**

```json
{
  "label": "moderate_risk",
  "confidence": 0.88,
  "fallback_triggered": false,
  "explanation": "Elevated cough durations paired with symptomatic fever indicators suggest specialized observation thresholds.",
  "error": null
}
```

- **Unhappy Paths:** Returns standard data profiles with `fallback_triggered: true` or throws a `502 Bad Gateway` error if upstream dependencies encounter pipeline faults.

### 3. Submit Final Outcome

Deduplicates and persists final completed records containing input history and logging states safely.

- **Endpoint:** `POST /api/v1/submissions`
- **Headers Required:** `Idempotency-Key: <uuid>` _(Automatically falls back to evaluating body `submission_id` tokens if custom headers are stripped by local cellular filters)_
- **Payload Structure:**

```json
{
  "submission_id": "c9a64cd8-5b12-4f81-9b11-ecbf142718ef",
  "workflow_id": "respiratory_risk",
  "collected_inputs": {
    "cough_duration_days": 5,
    "fever_present": "yes"
  },
  "ai_evaluations": [
    {
      "step_id": "ai_respiratory_eval",
      "model": "pulmo-risk-classifier",
      "result": { "label": "low_risk", "confidence": 0.94 }
    }
  ],
  "final_outcome": "routine_home_care"
}
```

- **Response Type:** `201 Created` (first pass processing) or `200 OK` (cache hit / duplicate request de-duplicated).

---

## 🧩 The XML Workflow Format

The XML format describes a clean finite state machine. It guarantees that adding or updating screening logic requires zero code changes to the running platforms.

### Core Architecture Tags

- `<step>`: Defines a user-facing layout stage. Standard values include `type="form"` (UI input building blocks) or `type="ai_screening"` (background inference loops).
- `<field>`: Generically builds input elements inside forms. Leverages attributes like `min`, `max`, `pattern`, and `hint` to provide declarative native validation targets.
- `<model>` & `<map>`: Declares target evaluation systems and binds collected client-side form variables explicitly to unique backend AI parameters.
- `<fallback>`: Defines confidence floors (`threshold`) and recovery directions (`target`) if communication timeouts occur or the model output is uncertain.
- `<routing>` & `<branch>`: Directs workflow state transitions dynamically by testing returned AI label metrics against defined targets.
- `<outcome>`: Represents a terminal conclusion panel providing clinical directives and triggering automated persistence loops.

---

## ⚖️ Trade-offs & Design Choices (360° Alignment)

### What Was Deliberately Left Out

- **Persistent Databases (Postgres/MongoDB):** To guarantee frictionless, zero-dependency local code evaluations, workflows and submission records are maintained via concurrent-safe in-memory dictionaries. Production environments would map these hooks directly to persistent datastores and standard cloud bucket systems (e.g., AWS S3).
- **Authentication layers:** Dropped from the active loop to maintain deep, unencumbered focus on the core workflow parsing mechanics.
- **Automated Testing Suite:** Omitted in complete alignment with assignment parameters to emphasize system architecture design patterns and API robustness.

### Security

- **XSS Defenses:** Workflows are structured as purely declarative data configurations. The frontend engine contract dictates that files must be parsed systematically using `DOMParser` trees, completely avoiding unsafe vector string mappings like `innerHTML`.
- **Fail Closed Processing:** If the backend ingest engine identifies unknown elements or validation profiles request models that are unregistered, the pipeline explicitly drops processing vectors and throws immediate 400-level errors.

### Extensibility & Versioning

- **New Field Additions:** Supporting novel input structures (e.g., custom camera or image upload nodes) only requires writing a single isolated rendering condition inside `StepRenderer.jsx` to parse `<field type="image">`. The backend remains completely decoupled because it stores parameters as free-form JSON blocks (`Dict[str, Any]`).
- **API Versioning Architecture:** The API contract is explicitly isolated at the path route level (`/api/v1/`). Individual XML workflows run concurrent version matrices using internal root node tracking properties (`version="1.0.0"`).

### Authoring & Provisioning (Future State)

- **Authoring Tooling:** Non-engineering clinical managers would coordinate or adjust screening configurations using a visual node builder interface (e.g., a flowchart application), which automatically compiles visual logic boxes into this compliant XML format behind the scenes.
- **Provisioning Delivery:** Published XML configurations would drop straight onto global CDN rings. Field devices synchronize new profiles in the background whenever strong network indicators are available, enabling flawless offline field operations later.

---

## 🚀 How to Run Locally

The entire system is containerized. You do not need Python, Node.js, or local database engines configured on your workspace—only Docker.

### Prerequisites

- Ensure [Docker Desktop](https://www.docker.com/products/docker-desktop/) is installed and actively running.

### Execution Steps

1. Open your system terminal and navigate directly to the root project location:

```bash
cd health-screening-platform-

```

2. Generate your local secret profile mapping file and append your secure upstream credentials:

```bash
touch .env
echo "GROQ_API_KEY=gsk_your_actual_enterprise_groq_api_key_goes_here" >> .env

```

3. Grant execution permissions and run the initialization script to assemble and start both backend and frontend layers simultaneously:

```bash
chmod +x run.sh
./run.sh

```

_(Alternatively, execute standard orchestrations manually via `docker compose up --build`)_ 4. The platform runtime maps services straight to your local interface loopbacks:

- 🖥️ **Tanuh AI Engine Frontend UI:** Access via **[http://localhost:5173](http://localhost:5173)**
- ⚙️ **FastAPI Interactive Backend Docs:** Access via **[http://localhost:8000/docs](http://localhost:8000/docs)**

### Stopping the Stack

To safely dismantle container operations, press `CTRL+C` inside your active terminal matrix or execute:

```bash
docker compose down

```

### Next step

-- Take XML from server in compressed format, unzip it
---Send it to local LLM for formatting push notification to receiever for filling form
---exection happens as before
---Enable logging
