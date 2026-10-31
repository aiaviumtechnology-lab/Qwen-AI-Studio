# Qwen Agent Studio: Autonomous Code & Repo Reasoning System

An enterprise-grade developer studio designed to build, configure, test, and export autonomous Qwen-based reasoning agents that analyze multi-file repositories for syntax, memory, concurrency, and logic errors across Python, Rust, Java, JavaScript, C, and C++.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The primary focus confirmed by the user is **building autonomous agents**. To deliver this with maximum engineering rigor, the application will provide a complete Agent Builder & Orchestrator that produces working code analysis agents, paired with an interactive multi-language repo testing workbench, live reasoning traces, and exportable Python (Accelerate + Qwen-Transformers + BPE) and Rust (Candle + Tokenizers) execution pipelines.

- **Confirmed Core Goal**: Building autonomous reasoning agents specialized in finding and correcting code errors across 6 languages: Python, Rust, Java, JavaScript, C, and C++.
- **Reasoning Mechanism**: Qwen-QwQ / DeepSeek-R1 style explicit step-by-step reasoning tokens (`<think> ... </think>`) with root cause isolation, causal verification, and structured diff generation.
- **Python & Rust Dual Stack**: The app provides both live interactive web execution (powered by server-side `@google/genai` reasoning model) AND downloadable, production-ready Python (`qwen_agent.py` with HuggingFace `accelerate`, `transformers`, BPE tokenization) and Rust (`src/main.rs` + `Cargo.toml` with `candle` and `tokenizers`) agent runtimes.

---

### 1. Overview & Core Concept

**Qwen Agent Studio** equips software engineers, security researchers, and systems architects with an end-to-end environment to:
1. **Design & Specialize Agents**: Create autonomous agents (e.g. *Memory & Safety Auditor*, *Concurrency & Race Condition Hunter*, *Syntax & Type Inference Agent*, *Refactoring & Patch Synthesizer*).
2. **Execute Multi-File Repo Audits**: Ingest projects or test files across Python, Rust, Java, JavaScript, C, and C++, parse dependencies, and detect complex cross-file errors.
3. **Inspect Deep Chain-of-Thought**: Observe real-time reasoning traces breaking down the error context, hypotheses tested, eliminated false positives, and final proof of defect.
4. **Interactive Unified Diff & Patching**: Review side-by-side or unified git diffs, inspect line-by-line recommendations, and apply verified fixes into the live editor.
5. **BPE Tokenizer & Vocab Inspector**: An interactive Byte-Pair Encoding visualizer demonstrating how Qwen transforms source code into subwords, byte tokens, and token IDs across different language syntaxes.
6. **Production-Ready Python & Rust Code Export**: One-click export of complete Python scripts (using HuggingFace `accelerate launch`, `transformers`, `torch`) and Rust crates (using `candle-core`, `candle-transformers`, `tokenizers`) to run these agents on local workstations or GPU clusters.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Agent Orchestrator View**:
   - Select or customize an agent persona (*Memory Safety Agent*, *Syntax & Type Agent*, *Concurrency Agent*, or custom agent).
   - Configure agent parameters: reasoning depth (`standard`, `deep`, `exhaustive`), tool access (AST parsing, multi-file indexer, static borrow check, patch validator), and system prompt instructions.
2. **Repository & Code Workbench**:
   - File tree explorer with multi-language preset repositories (e.g., Python async deadlock, Rust borrow checker / lifetime conflict, C buffer overflow / use-after-free, C++ RAII / smart pointer leak, Java null pointer / synchronized block contention, JavaScript closure memory retention).
   - Multi-tab syntax-highlighted code editor with line numbers and error diagnostics.
   - Ability to upload custom files or edit code in real-time.
3. **Reasoning Trace & Diagnosis Hub**:
   - Run the active agent on the repo or file.
   - Live streaming reasoning block (`<think>`) highlighting the agent's internal deduction steps before issuing recommendations.
   - Categorized findings: Severity (Critical, Warning, Optimization), affected lines, language-specific explanation, and root-cause analysis.
4. **Patch Verification & Application**:
   - Unified diff viewer showing exact deletions and additions.
   - "Apply Patch" button immediately updates the active code buffer and updates diagnostics.
5. **BPE Tokenizer & Runtime Exporter**:
   - Visual tokenizer tool displaying token boundaries, byte counts, and token IDs.
   - Export tab generating full `accelerate` Python training/inference pipelines and high-performance Rust Candle code.

#### Visual Identity & Theme
- **Aesthetic Direction**: Clean, high-density developer console and IDE workbench adhering to Section 1 & Section 4 guidelines.
- **Color Palette**:
  - Neutral canvas: Deep slate background (`#090D16` / `#0F172A`) with hairline borders (`#1E293B`).
  - Text & Accents: Crisp readable typography (`#F8FAFC` headings, `#94A3B8` body), subtle indigo/cyan accents (`#6366F1` / `#06B6D4`) for active tabs and primary actions.
  - Status Indicators: Emerald (`#10B981`) for resolved/clean, Amber (`#F59E0B`) for warnings/borrow issues, Crimson (`#EF4444`) for critical memory/runtime bugs.
- **Typography & Layout**:
  - Sans display: `Plus Jakarta Sans` for clean titles and controls.
  - Monospace: `JetBrains Mono` / `tabular-nums` for code buffers, diffs, token IDs, and reasoning traces.
  - Strict Top Bar Contract: Brand title, single-line navigation links (`Agent Studio`, `Repo Workbench`, `Reasoning Diagnostics`, `BPE Inspector`, `Pipeline Export`), and a primary "Run Agent Audit" action.
  - Zero-Pill Discipline: Unboxed metadata tags separated by `·` and `/`.

---

### 3. Key Product Decisions & Trade-Offs

- **Agent-First Architecture vs. Plain Chatbot**:
  - *Chosen Approach*: Formal agent framework with specialized system prompts, reasoning budgets, tool capabilities, and structured error schemas.
  - *Why*: The user specifically clarified that the primary focus is building agents. A structured agent paradigm enables repeatable, production-grade audits rather than vague conversational suggestions.
- **Dual Pipeline: Interactive Web + Exportable Python/Rust**:
  - *Chosen Approach*: Implement full interactive analysis on the web via server-side `@google/genai` (using `gemini-3.8-flash` with reasoning instructions), while simultaneously providing complete, copyable, and downloadable Python (`accelerate` + `transformers`) and Rust (`candle` + `tokenizers`) standalone agent implementations.
  - *Why*: Users can immediately test and interact with the agent in the browser without requiring a local GPU, while having ready-to-run native Python and Rust code that uses actual Qwen model weights and BPE tokenization.
- **Comprehensive 6-Language Coverage**:
  - *Chosen Approach*: Explicit knowledge rules and AST/diagnostic models for Python, Rust, Java, JavaScript, C, and C++.
  - *Why*: Meets the user's explicit mandate for all six languages.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                          QWEN AGENT STUDIO                             │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌───────────────────────┐  ┌───────────────────────────────────────┐  │
│  │   Agent Builder       │  │       Repo & Code Workbench           │  │
│  │ - Persona & Roles     │  │ - Multi-file Repository Tree          │  │
│  │ - Reasoning Depth     │  │ - 6 Languages: Py, Rs, Java, JS, C, C │  │
│  │ - Tool Registry       │  │ - Syntax Editor & Error Diagnostics   │  │
│  └───────────┬───────────┘  └───────────────────┬───────────────────┘  │
│              │                                  │                      │
│              ▼                                  ▼                      │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │             Agent Orchestrator & Reasoning Dispatcher            │  │
│  │ - Multi-file Context Bundler                                      │  │
│  │ - Chain-of-Thought (<think>) Stream Controller                   │  │
│  │ - Error Classifier & AST Diagnostic Engine                       │  │
│  └──────────────────────────────┬───────────────────────────────────┘  │
│                                 │                                      │
│        ┌────────────────────────┴────────────────────────┐             │
│        ▼                                                 ▼             │
│  ┌───────────────────────────┐             ┌─────────────────────────┐ │
│  │ Server Express Backend    │             │ BPE Tokenizer & Export  │ │
│  │ - POST /api/agent/analyze │             │ - Token Boundary Viewer │ │
│  │ - @google/genai proxy     │             │ - Python Accelerate Code│ │
│  │ - Unified Diff Synthesizer│             │ - Rust Candle Pipeline  │ │
│  └───────────────────────────┘             └─────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

#### Key Components & Modules
1. **Frontend Architecture (`src/`)**:
   - `components/Header.tsx`: Compliant 3-zone Top Bar with active tab navigation.
   - `components/AgentStudio.tsx`: Agent builder, prompt configuration, reasoning parameters, and tool selection.
   - `components/RepoWorkbench.tsx`: File explorer, code editor, multi-language presets, upload/download.
   - `components/ReasoningTrace.tsx`: Live collapsible `<think>` reasoning tree and step-by-step audit diagnosis.
   - `components/DiffViewer.tsx`: Side-by-side and unified git diff with one-click patch application.
   - `components/BpeInspector.tsx`: Interactive subword tokenization visualizer with token ID breakdown.
   - `components/PipelineExporter.tsx`: Complete Python (`accelerate`, `transformers`) and Rust (`candle`, `tokenizers`) standalone project generator.
2. **Backend Server (`server.ts`)**:
   - Express server on port 3000 hosting Vite client and `/api` routes.
   - `/api/agent/analyze`: Analyzes code files with reasoning tokens using `@google/genai` (`gemini-3.8-flash`), returning structured errors, reasoning steps, and unified diffs.
   - `/api/agent/tokenize`: BPE subword token simulation for Qwen vocabulary.
3. **State Management**:
   - Active repository file system state stored with local edits and diff tracking.
   - Agent configurations with customized system prompts and tool flags.
   - Real-time diagnostic markers synced with editor line numbers.
