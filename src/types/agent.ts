export type SupportedLanguage = 'python' | 'rust' | 'java' | 'javascript' | 'c' | 'cpp';

export type ReasoningDepth = 'standard' | 'deep' | 'exhaustive';

export interface AgentTool {
  id: string;
  name: string;
  description: string;
  category: 'ast' | 'memory' | 'concurrency' | 'diff';
  enabled: boolean;
}

export interface AgentConfig {
  id: string;
  name: string;
  role: string;
  persona: string;
  reasoningDepth: ReasoningDepth;
  temperature: number;
  tools: string[];
  systemInstruction: string;
  focusLanguages: SupportedLanguage[];
  isCustom?: boolean;
}

export interface RepoFile {
  path: string;
  name: string;
  language: SupportedLanguage;
  content: string;
  isModified?: boolean;
}

export interface PresetRepository {
  id: string;
  name: string;
  description: string;
  primaryLanguage: SupportedLanguage;
  languages: SupportedLanguage[];
  files: RepoFile[];
}

export interface CodeIssue {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  file: string;
  line: number;
  column?: number;
  title: string;
  explanation: string;
  rootCause: string;
  ruleBroken: string;
  suggestedFix: string;
}

export interface PatchedFile {
  path: string;
  explanation: string;
  patchedContent: string;
  originalContent: string;
  unifiedDiff: string;
}

export interface AuditResult {
  thinking: string;
  summary: string;
  issues: CodeIssue[];
  patchedFiles: PatchedFile[];
  timestamp: string;
  agentUsed: {
    id: string;
    name: string;
    reasoningDepth: ReasoningDepth;
  };
}

export interface BpeToken {
  id: number;
  index: number;
  text: string;
  byteLength: number;
  hex: string;
  offsetStart?: number;
  offsetEnd?: number;
}

export interface BpeAnalysis {
  tokens: BpeToken[];
  totalTokens: number;
  originalBytes: number;
  compressionRatio: string;
  language: string;
}

export type QwenModelSize = '0.5B' | '1.5B' | '7B' | '14B' | '32B';
export type FineTuningMethod = 'qlora-4bit' | 'lora-16bit' | 'full-sft';

export interface TrainingConfig {
  modelSize: QwenModelSize;
  method: FineTuningMethod;
  contextLength: number;
  microBatchSize: number;
  gradientAccumulation: number;
  learningRate: number;
  loraRank: number;
  loraAlpha: number;
  epochs: number;
  warmupRatio: number;
  optimizer: 'adamw_torch_fused' | 'paged_adamw_8bit' | 'adamw_torch';
  gradientCheckpointing: boolean;
  flashAttention2: boolean;
}

export interface HyperparameterPreset {
  id: string;
  name: string;
  description: string;
  isDefault?: boolean;
  createdAt?: string;
  config: TrainingConfig;
}

export interface VramEstimate {
  weightsGb: number;
  optimizerGb: number;
  gradientsGb: number;
  activationsGb: number;
  totalGb: number;
  recommendedHardware: string;
  fitStatus: 'comfortable' | 'tight' | 'oom-risk';
}

export interface GrpoRollout {
  id: number;
  reasoning: string;
  patch: string;
  rewardFormat: number;
  rewardCompiler: number;
  rewardTests: number;
  totalReward: number;
  advantage: number;
  status: 'passed' | 'failed';
}

export interface DpoPair {
  chosen: {
    reasoning: string;
    patch: string;
    tokenCount: number;
  };
  rejected: {
    reasoning: string;
    patch: string;
    tokenCount: number;
    defectSummary: string;
  };
}

export interface DatasetItemValidation {
  valid: boolean;
  chatMlValid: boolean;
  thinkTagsBalanced: boolean;
  diffSyntaxValid: boolean;
  tokenBudgetValid: boolean;
  noSpecialTokenLeak: boolean;
  reasoningTokenCount: number;
  completionTokenCount: number;
  errors: string[];
}

export interface DatasetItem {
  id: string;
  language: SupportedLanguage;
  system: string;
  user: string;
  assistant: string;
  tokenCount: number;
  paradigm?: 'sft' | 'grpo' | 'dpo';
  category?: string;
  grpoRollouts?: GrpoRollout[];
  dpoPair?: DpoPair;
  validationStatus?: DatasetItemValidation;
}

// ----------------------------------------------------
// RCA Intelligence Layer Models (from _Reasoner_v1._5)
// ----------------------------------------------------
export interface ReasoningContext {
  repoName: string;
  activeFilePath: string;
  language: SupportedLanguage;
  files: RepoFile[];
  metadata?: Record<string, any>;
}

export interface StrategyStep {
  description: string;
  tool: string | null;
  arguments: Record<string, any> | null;
}

export interface StrategyPlan {
  goal: string;
  steps: StrategyStep[];
}

export interface ToolCall {
  call_id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface StepResult {
  step_index: number;
  thought: string;
  tool_calls: ToolCall[];
  tool_results: Record<string, any>;
  output: string | null;
}

export interface RcaExecution {
  goal: string;
  plan: StrategyPlan;
  step_results: StepResult[];
  final_output: string;
}
