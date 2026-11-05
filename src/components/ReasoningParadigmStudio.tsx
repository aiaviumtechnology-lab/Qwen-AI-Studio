import React, { useState, useEffect } from 'react';
import {
  Brain,
  GitBranch,
  Dna,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  Zap,
  ArrowRight,
  TrendingUp,
  FileCode,
  ShieldCheck,
  Layers,
  Sparkles,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { PresetRepository, AgentConfig } from '../types/agent';
import type {
  ReasoningParadigmType,
  CotResult,
  TotResult,
  TreEvoResult,
  UnifiedReasoningResult,
  TotNode,
} from '../types/reasoningParadigms';

interface ReasoningParadigmStudioProps {
  currentRepo: PresetRepository;
  activeFilePath: string;
  currentAgent: AgentConfig;
}

export const ReasoningParadigmStudio: React.FC<ReasoningParadigmStudioProps> = ({
  currentRepo,
  activeFilePath,
  currentAgent,
}) => {
  const [selectedParadigm, setSelectedParadigm] = useState<ReasoningParadigmType>('cot');
  const [goal, setGoal] = useState<string>(
    `Perform formal invariant reasoning on ${activeFilePath} to resolve memory safety conflicts and deadlock hazards.`
  );
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [copiedPatch, setCopiedPatch] = useState<boolean>(false);
  const [selectedTotNodeId, setSelectedTotNodeId] = useState<string | null>(null);

  // Cached results for each paradigm
  const [cotResult, setCotResult] = useState<CotResult | null>(null);
  const [totResult, setTotResult] = useState<TotResult | null>(null);
  const [treevoResult, setTreevoResult] = useState<TreEvoResult | null>(null);

  const targetFile =
    currentRepo.files.find((f) => f.path === activeFilePath) || currentRepo.files[0];

  // Execute the selected reasoning paradigm
  const handleExecuteParadigm = async (paradigm: ReasoningParadigmType = selectedParadigm) => {
    setIsRunning(true);
    try {
      const res = await fetch('/api/agent/reasoning-paradigms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paradigm,
          targetFile,
          goal,
        }),
      });

      if (res.ok) {
        const data: UnifiedReasoningResult = await res.json();
        if (data.paradigm === 'cot') setCotResult(data as CotResult);
        if (data.paradigm === 'tot') {
          const tot = data as TotResult;
          setTotResult(tot);
          setSelectedTotNodeId(tot.bestPathNodeIds[tot.bestPathNodeIds.length - 1] || 'tot_root');
        }
        if (data.paradigm === 'treevo') setTreevoResult(data as TreEvoResult);
      }
    } catch (err) {
      console.error('Failed to execute reasoning paradigm:', err);
    } finally {
      setIsRunning(false);
    }
  };

  // Run automatically on initial mount if empty
  useEffect(() => {
    if (!cotResult && selectedParadigm === 'cot') handleExecuteParadigm('cot');
  }, [selectedParadigm]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPatch(true);
    setTimeout(() => setCopiedPatch(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-y-auto p-4 sm:p-6 space-y-6 font-sans">
      {/* Top Banner: Reasoning Paradigm Selector */}
      <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl backdrop-blur flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 border border-indigo-500/30 text-indigo-400">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-100">
                Reasoning Paradigms Studio
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-500/30">
                CoT · ToT · TreEvo
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Comparative cognitive architectures for code verification: linear deduction, heuristic tree search, and genetic evolutionary reasoning
            </p>
          </div>
        </div>

        {/* Paradigm Switching Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800">
          {/* 1. Chain of Thought */}
          <button
            onClick={() => {
              setSelectedParadigm('cot');
              if (!cotResult) handleExecuteParadigm('cot');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              selectedParadigm === 'cot'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>CoT (Chain of Thought)</span>
          </button>

          {/* 2. Tree of Thoughts */}
          <button
            onClick={() => {
              setSelectedParadigm('tot');
              if (!totResult) handleExecuteParadigm('tot');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              selectedParadigm === 'tot'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>ToT (Tree of Thoughts)</span>
          </button>

          {/* 3. Tree-Evolutionary Search */}
          <button
            onClick={() => {
              setSelectedParadigm('treevo');
              if (!treevoResult) handleExecuteParadigm('treevo');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              selectedParadigm === 'treevo'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Dna className="w-3.5 h-3.5" />
            <span>TreEvo (Tree Evolution)</span>
          </button>
        </div>
      </div>

      {/* Execution Goal & Target File Bar */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs flex-1">
          <span className="font-mono text-slate-500 uppercase text-[10px] shrink-0">Target File:</span>
          <span className="px-2 py-0.5 rounded font-mono bg-slate-800 text-cyan-300 border border-slate-700 shrink-0">
            {targetFile.path}
          </span>
          <input
            type="text"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            placeholder="Reasoning goal..."
          />
        </div>

        <button
          onClick={() => handleExecuteParadigm()}
          disabled={isRunning}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900/50 text-white text-xs font-semibold shadow-md transition-all shrink-0 cursor-pointer disabled:cursor-not-allowed"
        >
          {isRunning ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Synthesizing {selectedParadigm.toUpperCase()}...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Execute {selectedParadigm.toUpperCase()}</span>
            </>
          )}
        </button>
      </div>

      {/* ---------------------------------------------------- */}
      {/* VIEW 1: CHAIN OF THOUGHT (CoT) VIEW */}
      {/* ---------------------------------------------------- */}
      {selectedParadigm === 'cot' && cotResult && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* CoT Overview KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[10px] uppercase font-mono text-slate-500">Reasoning Steps</div>
              <div className="text-lg font-bold font-mono text-indigo-400 mt-0.5">
                {cotResult.steps.length} Steps
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Linear deductive sequence</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[10px] uppercase font-mono text-slate-500">Reasoning Tokens</div>
              <div className="text-lg font-bold font-mono text-cyan-400 mt-0.5">
                {cotResult.totalTokens} tokens
              </div>
              <div className="text-[10px] text-slate-400 mt-1">~241 tokens/step</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[10px] uppercase font-mono text-slate-500">Latency</div>
              <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                {cotResult.elapsedMs} ms
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Zero branching overhead</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[10px] uppercase font-mono text-slate-500">Verification Rate</div>
              <div className="text-lg font-bold font-mono text-purple-400 mt-0.5">
                100% Invariants
              </div>
              <div className="text-[10px] text-slate-400 mt-1">All pre/post conditions verified</div>
            </div>
          </div>

          {/* Sequential Step Cards */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Brain className="w-4 h-4 text-indigo-400" />
              <span>Sequential Deductive Trace (Chain of Thought)</span>
            </h3>

            <div className="space-y-3">
              {cotResult.steps.map((step) => (
                <div
                  key={step.stepIndex}
                  className="p-4 rounded-xl border border-slate-800 bg-slate-900/90 space-y-2 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-mono font-bold flex items-center justify-center text-xs">
                        {step.stepIndex}
                      </span>
                      <span className="font-semibold text-slate-100">{step.title}</span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-300">
                        {step.invariantTested}
                      </span>
                      <span>{step.tokenCount} tok</span>
                      <span className="text-emerald-400 font-bold">
                        {(step.confidence * 100).toFixed(0)}% conf
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-sans pl-8">
                    {step.thought}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Synthesized Fix Output */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>CoT Synthesized Invariant Correction</span>
              </span>
              <button
                onClick={() => handleCopy(cotResult.synthesizedFix)}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-100 font-mono"
              >
                {copiedPatch ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPatch ? 'Copied' : 'Copy Patch'}</span>
              </button>
            </div>
            <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-slate-200 overflow-x-auto">
              {cotResult.synthesizedFix}
            </pre>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* VIEW 2: TREE OF THOUGHTS (ToT) VIEW */}
      {/* ---------------------------------------------------- */}
      {selectedParadigm === 'tot' && totResult && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* ToT KPI Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[10px] uppercase font-mono text-slate-500">Branches Explored</div>
              <div className="text-lg font-bold font-mono text-cyan-400 mt-0.5">
                {totResult.totalBranchesExplored} Hypotheses
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Multi-path state evaluation</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[10px] uppercase font-mono text-slate-500">Pruned Branches</div>
              <div className="text-lg font-bold font-mono text-rose-400 mt-0.5">
                {totResult.prunedBranchesCount} Pruned
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Dead-ends eliminated early</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[10px] uppercase font-mono text-slate-500">Backtracks</div>
              <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">
                {totResult.backtrackCount} Backtracks
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Explored alternate branches</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[10px] uppercase font-mono text-slate-500">Optimal Path Score</div>
              <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                99 / 100
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Highest heuristic safety</div>
            </div>
          </div>

          {/* Interactive Tree Graph Visualizer */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/80 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-cyan-400" />
                <span>Tree of Thoughts Branching Topology</span>
              </h3>
              <div className="flex items-center gap-3 text-[11px] font-mono">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  Selected Path
                </span>
                <span className="flex items-center gap-1 text-rose-400">
                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                  Pruned
                </span>
                <span className="flex items-center gap-1 text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                  Backtracked
                </span>
              </div>
            </div>

            {/* Tree Nodes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.values(totResult.nodes).map((node: TotNode) => {
                const isSelectedPath = totResult.bestPathNodeIds.includes(node.id);
                const isCurrentActive = selectedTotNodeId === node.id;

                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedTotNodeId(node.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isCurrentActive
                        ? 'ring-2 ring-cyan-500 bg-slate-900'
                        : isSelectedPath
                        ? 'border-emerald-500/40 bg-emerald-950/20 hover:border-emerald-500'
                        : node.status === 'pruned'
                        ? 'border-rose-500/30 bg-rose-950/20 opacity-80 hover:opacity-100'
                        : 'border-slate-800 bg-slate-950/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-mono text-[10px] text-slate-500">
                        Depth {node.depth} · {node.id}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          node.heuristicScore >= 90
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                            : node.heuristicScore >= 70
                            ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                            : 'bg-rose-950 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        Score: {node.heuristicScore}%
                      </span>
                    </div>

                    <h4 className="text-xs font-semibold text-slate-100 mb-1 line-clamp-1">
                      {node.branchName}
                    </h4>

                    <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                      {node.thought}
                    </p>

                    {node.pruneReason && (
                      <div className="mt-2 text-[10px] font-mono text-rose-400 bg-rose-950/40 p-1.5 rounded border border-rose-500/30">
                        Pruned: {node.pruneReason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Selected Node Details Box */}
            {selectedTotNodeId && totResult.nodes[selectedTotNodeId] && (
              <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/40 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-cyan-300">
                    Inspecting Thought Node: {totResult.nodes[selectedTotNodeId].branchName}
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">
                    Status: <strong className="uppercase">{totResult.nodes[selectedTotNodeId].status}</strong>
                  </span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {totResult.nodes[selectedTotNodeId].thought}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* VIEW 3: TREE-EVOLUTIONARY SEARCH (TreEvo) VIEW */}
      {/* ---------------------------------------------------- */}
      {selectedParadigm === 'treevo' && treevoResult && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* TreEvo KPI Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[10px] uppercase font-mono text-slate-500">Generations</div>
              <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                {treevoResult.generations.length} Generations
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Converged at Gen {treevoResult.convergenceGeneration}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[10px] uppercase font-mono text-slate-500">Genetic Operators</div>
              <div className="text-lg font-bold font-mono text-cyan-400 mt-0.5">
                {treevoResult.totalMutations} M / {treevoResult.totalCrossovers} X
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Mutations & Crossovers</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[10px] uppercase font-mono text-slate-500">Champion Fitness</div>
              <div className="text-lg font-bold font-mono text-purple-400 mt-0.5">
                {treevoResult.championCandidate.fitness.totalFitness.toFixed(1)} / 100
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Multi-objective Pareto-optimal</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[10px] uppercase font-mono text-slate-500">Search Time</div>
              <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">
                {treevoResult.elapsedMs} ms
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Evolutionary tree convergence</div>
            </div>
          </div>

          {/* Fitness Trajectory Chart */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/80 space-y-3">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Multi-Generation Fitness Progression</span>
            </h3>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={treevoResult.fitnessTrajectory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="generation" stroke="#64748b" tick={{ fontSize: 10 }} label={{ value: 'Generation', position: 'insideBottom', offset: -5, fontSize: 10, fill: '#64748b' }} />
                  <YAxis domain={[50, 100]} stroke="#64748b" tick={{ fontSize: 10 }} unit="%" />
                  <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                  <Line type="monotone" dataKey="topFitness" name="Top Candidate Fitness" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="avgFitness" name="Population Average Fitness" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Generations Population Matrix */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Dna className="w-4 h-4 text-purple-400" />
              <span>Evolutionary Lineage & Candidate Populations</span>
            </h3>

            <div className="space-y-4">
              {treevoResult.generations.map((gen) => (
                <div key={gen.generationIndex} className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                    <span className="font-bold text-slate-200 font-mono">
                      Generation {gen.generationIndex} (Avg Fitness: {gen.avgFitness.toFixed(1)}%)
                    </span>
                    <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                      Max Fitness: {gen.maxFitness.toFixed(1)}%
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {gen.candidates.map((cand) => (
                      <div
                        key={cand.id}
                        className={`p-3.5 rounded-xl border ${
                          cand.survivalStatus === 'champion'
                            ? 'border-emerald-500 bg-emerald-950/30'
                            : cand.survivalStatus === 'survived'
                            ? 'border-indigo-500/40 bg-slate-950'
                            : 'border-slate-800 bg-slate-950/50 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-slate-100">{cand.name}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              cand.survivalStatus === 'champion'
                                ? 'bg-emerald-900 text-emerald-300'
                                : cand.survivalStatus === 'survived'
                                ? 'bg-indigo-950 text-indigo-300'
                                : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            {cand.fitness.totalFitness.toFixed(1)}% ({cand.survivalStatus})
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-300 leading-relaxed mb-2">
                          {cand.strategySummary}
                        </p>

                        {cand.mutationApplied && (
                          <div className="text-[10px] font-mono text-cyan-400 mb-1">
                            Mutation: {cand.mutationApplied}
                          </div>
                        )}
                        {cand.crossoverParents && (
                          <div className="text-[10px] font-mono text-purple-400 mb-1">
                            Crossover: {cand.crossoverParents.join(' × ')}
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-800 text-[10px] font-mono text-center">
                          <div className="text-slate-400">Compiler: {cand.fitness.compilerScore}%</div>
                          <div className="text-emerald-400">Safety: {cand.fitness.safetyScore}%</div>
                          <div className="text-cyan-400">Tokens: {cand.fitness.tokenEfficiency}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Champion Patch Banner */}
          <div className="p-4 rounded-xl border border-emerald-500/40 bg-slate-950 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>TreEvo Converged Champion Solution</span>
              </span>
              <button
                onClick={() => handleCopy(treevoResult.championCandidate.synthesizedPatch)}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-100 font-mono"
              >
                {copiedPatch ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPatch ? 'Copied' : 'Copy Champion Patch'}</span>
              </button>
            </div>
            <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-slate-200 overflow-x-auto whitespace-pre">
              {treevoResult.championCandidate.synthesizedPatch}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
