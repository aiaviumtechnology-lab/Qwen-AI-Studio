import type { SupportedLanguage } from './agent';

export type ReasoningParadigmType = 'cot' | 'tot' | 'treevo';

// ----------------------------------------------------
// 1. Chain of Thought (CoT)
// ----------------------------------------------------
export interface CotStep {
  stepIndex: number;
  title: string;
  thought: string;
  tokenCount: number;
  invariantTested: string;
  confidence: number; // 0..1
  status: 'analyzing' | 'verified' | 'refuted';
}

export interface CotResult {
  paradigm: 'cot';
  goal: string;
  totalTokens: number;
  elapsedMs: number;
  steps: CotStep[];
  conclusion: string;
  synthesizedFix: string;
}

// ----------------------------------------------------
// 2. Tree of Thoughts (ToT)
// ----------------------------------------------------
export interface TotNode {
  id: string;
  parentId: string | null;
  depth: number;
  branchName: string;
  thought: string;
  heuristicScore: number; // 0..100
  status: 'exploring' | 'selected' | 'pruned' | 'backtracked';
  pruneReason?: string;
  childrenIds: string[];
}

export interface TotResult {
  paradigm: 'tot';
  goal: string;
  rootId: string;
  nodes: Record<string, TotNode>;
  bestPathNodeIds: string[];
  totalBranchesExplored: number;
  prunedBranchesCount: number;
  backtrackCount: number;
  elapsedMs: number;
  selectedSolution: string;
}

// ----------------------------------------------------
// 3. Tree-Evolutionary Reasoning (TreEvo)
// ----------------------------------------------------
export interface TreEvoCandidate {
  id: string;
  generation: number;
  name: string;
  strategySummary: string;
  mutationApplied?: string;
  crossoverParents?: string[];
  fitness: {
    compilerScore: number;    // 0..100
    safetyScore: number;      // 0..100
    tokenEfficiency: number;  // 0..100
    totalFitness: number;     // 0..100
  };
  survivalStatus: 'survived' | 'eliminated' | 'champion';
  reasoningSteps: string[];
  synthesizedPatch: string;
}

export interface TreEvoGeneration {
  generationIndex: number;
  candidates: TreEvoCandidate[];
  avgFitness: number;
  maxFitness: number;
}

export interface TreEvoResult {
  paradigm: 'treevo';
  goal: string;
  generations: TreEvoGeneration[];
  convergenceGeneration: number;
  championCandidate: TreEvoCandidate;
  totalMutations: number;
  totalCrossovers: number;
  elapsedMs: number;
  fitnessTrajectory: { generation: number; avgFitness: number; topFitness: number }[];
}

export type UnifiedReasoningResult = CotResult | TotResult | TreEvoResult;
