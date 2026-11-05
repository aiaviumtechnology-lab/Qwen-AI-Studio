import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Gauge,
  Cpu,
  HardDrive,
  Clock,
  Zap,
  Activity,
  Layers,
  Sparkles,
  Database,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  FolderGit2,
  Server,
  Sliders,
  ChevronDown,
  RefreshCw,
  TrendingUp,
  Flame,
  Binary,
  ArrowUpRight,
  Download,
  Share2,
  History,
  LayoutDashboard,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import type { PresetRepository, AgentConfig, TrainingConfig, QwenModelSize, FineTuningMethod } from '../types/agent';
import { PRESET_REPOSITORIES } from '../data/presetRepos';
import type { TrainingExperimentRecord } from '../services/db';
import { AuditHistoryView } from './AuditHistoryView';

interface OpsDashboardProps {
  currentRepo: PresetRepository;
  onSelectRepo?: (repo: PresetRepository) => void;
  currentAgent: AgentConfig;
}

interface MetricHistoryPoint {
  timeStr: string;
  step: number;
  vramGb: number;
  ramGb: number;
  tokenThroughput: number; // tokens/sec
  inferenceReqsSec: number;
  cumulativeTokens: number;
  inferenceTokens: number;
}

export const OpsDashboard: React.FC<OpsDashboardProps> = ({
  currentRepo,
  onSelectRepo,
  currentAgent,
}) => {
  // Project Name state (user can customize or pick from preset repositories)
  const [projectName, setProjectName] = useState<string>(currentRepo.name);
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const [dashboardView, setDashboardView] = useState<'telemetry' | 'audit-history'>('telemetry');

  // Active Hyperparameters state
  const [hyperparameters, setHyperparameters] = useState<TrainingConfig>({
    modelSize: '7B',
    method: 'qlora-4bit',
    contextLength: 4096,
    microBatchSize: 2,
    gradientAccumulation: 8,
    learningRate: 0.0002,
    loraRank: 32,
    loraAlpha: 64,
    epochs: 3,
    warmupRatio: 0.03,
    optimizer: 'paged_adamw_8bit',
    gradientCheckpointing: true,
    flashAttention2: true,
  });

  // Live streaming simulation state
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [stepCount, setStepCount] = useState<number>(142);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(3725); // 1h 02m 05s
  
  // Real-time telemetry values
  const [cumulativeTokens, setCumulativeTokens] = useState<number>(4820350);
  const [inferenceCallCount, setInferenceCallCount] = useState<number>(1420);
  const [inferenceTokensUsed, setInferenceTokensUsed] = useState<number>(684200);
  const [inferenceLatencyMs, setInferenceLatencyMs] = useState<number>(38.4);
  const [tokenThroughput, setTokenThroughput] = useState<number>(4120);

  // VRAM & RAM hardware specs and live usage
  const maxVramGb = 24.0; // RTX 4090 / L40
  const maxRamGb = 64.0;  // Host Workstation RAM

  // Dynamic calculated memory usage based on hyperparameters and noise
  const calculatedVram = useMemo(() => {
    const baseWeights = {
      '0.5B': 0.5,
      '1.5B': 1.5,
      '7B': hyperparameters.method === 'qlora-4bit' ? 4.2 : 14.0,
      '14B': hyperparameters.method === 'qlora-4bit' ? 8.4 : 28.0,
      '32B': hyperparameters.method === 'qlora-4bit' ? 18.5 : 64.0,
    }[hyperparameters.modelSize] || 7.0;

    const optCost = hyperparameters.optimizer === 'paged_adamw_8bit' ? 1.8 : 4.6;
    const activations = (hyperparameters.contextLength / 2048) * (hyperparameters.microBatchSize * 0.9);
    const vramAllocated = Number((baseWeights + optCost + activations + 1.5).toFixed(1));
    return Math.min(vramAllocated, maxVramGb);
  }, [hyperparameters]);

  const [liveVramGb, setLiveVramGb] = useState<number>(calculatedVram);
  const [liveRamGb, setLiveRamGb] = useState<number>(18.6);

  // Time-series telemetry points for Recharts
  const [historyData, setHistoryData] = useState<MetricHistoryPoint[]>(() => {
    const points: MetricHistoryPoint[] = [];
    let tokens = 4400000;
    let infTokens = 610000;
    for (let i = 20; i >= 0; i--) {
      const pastSeconds = elapsedSeconds - i * 15;
      const m = Math.floor((pastSeconds % 3600) / 60).toString().padStart(2, '0');
      const s = Math.floor(pastSeconds % 60).toString().padStart(2, '0');
      tokens += 21000;
      infTokens += 3700;
      points.push({
        timeStr: `${m}:${s}`,
        step: 142 - i,
        vramGb: Number((calculatedVram + (Math.sin(i * 0.8) * 0.4)).toFixed(2)),
        ramGb: Number((18.2 + (Math.cos(i * 0.6) * 0.5)).toFixed(2)),
        tokenThroughput: Math.floor(3900 + Math.sin(i) * 350),
        inferenceReqsSec: Number((12.4 + Math.cos(i) * 1.8).toFixed(1)),
        cumulativeTokens: tokens,
        inferenceTokens: infTokens,
      });
    }
    return points;
  });

  // Synchronize projectName when currentRepo changes
  useEffect(() => {
    setProjectName(currentRepo.name);
  }, [currentRepo.name]);

  // Real-time ticking effect
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
      setStepCount((prev) => prev + 1);

      // Random stochastic jitter for realistic live operational metrics
      const throughputDelta = Math.floor(4000 + (Math.random() - 0.5) * 450);
      setTokenThroughput(throughputDelta);

      const addedTokens = Math.floor(throughputDelta * 0.35);
      setCumulativeTokens((prev) => prev + addedTokens);

      const addedInfTokens = Math.floor(180 + Math.random() * 60);
      setInferenceTokensUsed((prev) => prev + addedInfTokens);
      setInferenceCallCount((prev) => prev + (Math.random() > 0.6 ? 1 : 0));
      setInferenceLatencyMs(Number((37.5 + (Math.random() - 0.5) * 3.5).toFixed(1)));

      const currentVram = Number((calculatedVram + (Math.random() - 0.5) * 0.3).toFixed(2));
      const currentRam = Number((18.4 + (Math.random() - 0.5) * 0.4).toFixed(2));
      setLiveVramGb(currentVram);
      setLiveRamGb(currentRam);

      // Update history buffer
      setHistoryData((prev) => {
        const nextSeconds = elapsedSeconds + 1;
        const m = Math.floor((nextSeconds % 3600) / 60).toString().padStart(2, '0');
        const s = Math.floor(nextSeconds % 60).toString().padStart(2, '0');
        const newPoint: MetricHistoryPoint = {
          timeStr: `${m}:${s}`,
          step: stepCount + 1,
          vramGb: currentVram,
          ramGb: currentRam,
          tokenThroughput: throughputDelta,
          inferenceReqsSec: Number((12.8 + (Math.random() - 0.5) * 2).toFixed(1)),
          cumulativeTokens: cumulativeTokens + addedTokens,
          inferenceTokens: inferenceTokensUsed + addedInfTokens,
        };
        return [...prev.slice(1), newPoint];
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, elapsedSeconds, stepCount, calculatedVram, cumulativeTokens, inferenceTokensUsed]);

  // Format seconds to HH:MM:SS
  const formatRunTime = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hrs.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  };

  // Snapshot active dashboard metrics to PostgreSQL database
  const [snapshotState, setSnapshotState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const handleSnapshotToDatabase = async () => {
    setSnapshotState('saving');
    try {
      const payload: Partial<TrainingExperimentRecord> = {
        name: `${projectName} - ${hyperparameters.modelSize} Live Run`,
        modelSize: hyperparameters.modelSize,
        method: hyperparameters.method,
        config: { ...hyperparameters },
        status: isRunning ? 'running' : 'paused',
        datasetId: `dataset_${currentRepo.id}`,
        datasetSampleSize: 1420,
        metrics: {
          lossHistory: [
            { step: 50, loss: 1.84, valLoss: 1.95, gradNorm: 1.15, learningRate: hyperparameters.learningRate },
            { step: 100, loss: 1.22, valLoss: 1.34, gradNorm: 0.82, learningRate: hyperparameters.learningRate },
            { step: stepCount, loss: 0.74, valLoss: 0.81, gradNorm: 0.51, learningRate: hyperparameters.learningRate },
          ],
          finalLoss: 0.74,
          evalAccuracy: 93.8,
          tokensProcessed: cumulativeTokens,
          peakVramGb: liveVramGb,
          epochProgress: Number(((stepCount / 200) * hyperparameters.epochs).toFixed(2)),
        },
      };

      const res = await fetch('/api/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSnapshotState('saved');
        setTimeout(() => setSnapshotState('idle'), 3000);
      }
    } catch {
      setSnapshotState('idle');
    }
  };

  // Reset live counters
  const handleReset = () => {
    setElapsedSeconds(0);
    setStepCount(0);
    setCumulativeTokens(0);
    setInferenceTokensUsed(0);
    setInferenceCallCount(0);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-y-auto p-4 sm:p-6 space-y-6">
      {/* Top Banner & Command Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-5 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur shadow-xl">
        {/* Project Name & Target Info */}
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 border border-indigo-500/30 text-indigo-400 shrink-0">
            <FolderGit2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                Project Name
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-950/80 text-indigo-300 border border-indigo-500/30">
                Active Target
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-cyan-300 border border-slate-700">
                {currentRepo.primaryLanguage.toUpperCase()}
              </span>
            </div>

            {isEditingProjectName ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  onBlur={() => setIsEditingProjectName(false)}
                  onKeyDown={(e) => e.key === 'Enter' && setIsEditingProjectName(false)}
                  autoFocus
                  className="px-2 py-1 text-lg font-bold bg-slate-950 border border-indigo-500 rounded text-slate-100 focus:outline-none"
                />
                <button
                  onClick={() => setIsEditingProjectName(false)}
                  className="px-2 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium"
                >
                  Done
                </button>
              </div>
            ) : (
              <div
                onClick={() => setIsEditingProjectName(true)}
                className="group flex items-center gap-2 cursor-pointer mt-0.5"
                title="Click to rename project"
              >
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 group-hover:text-indigo-300 transition-colors">
                  {projectName}
                </h1>
                <span className="text-xs text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  (edit)
                </span>
              </div>
            )}
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
              {currentRepo.description}
            </p>
          </div>
        </div>

        {/* Global Controls & PostgreSQL Snapshot */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Preset repo switcher dropdown */}
          {onSelectRepo && (
            <div className="relative">
              <select
                value={currentRepo.id}
                onChange={(e) => {
                  const found = PRESET_REPOSITORIES.find((r) => r.id === e.target.value);
                  if (found) onSelectRepo(found);
                }}
                className="appearance-none pl-3 pr-8 py-2 text-xs font-medium rounded-xl bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-600 focus:outline-none cursor-pointer"
              >
                {PRESET_REPOSITORIES.map((r) => (
                  <option key={r.id} value={r.id}>
                    Repo: {r.name} ({r.primaryLanguage})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          )}

          {/* Play/Pause live stream */}
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all ${
              isRunning
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isRunning ? 'Pause Live Ticker' : 'Resume Live Ticker'}</span>
          </button>

          {/* Reset run */}
          <button
            onClick={handleReset}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Reset telemetry counters"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Snapshot to PostgreSQL */}
          <button
            onClick={handleSnapshotToDatabase}
            disabled={snapshotState === 'saving'}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
          >
            <Database className="w-3.5 h-3.5" />
            <span>
              {snapshotState === 'saving'
                ? 'Persisting...'
                : snapshotState === 'saved'
                ? 'Saved to PostgreSQL'
                : 'Save Snapshot to DB'}
            </span>
          </button>
        </div>
      </div>

      {/* View Switcher: Live Telemetry vs PostgreSQL Audit History */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-1">
        <button
          onClick={() => setDashboardView('telemetry')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            dashboardView === 'telemetry'
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Real-Time Telemetry & Operations</span>
        </button>

        <button
          onClick={() => setDashboardView('audit-history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            dashboardView === 'audit-history'
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Audit History (PostgreSQL)</span>
        </button>
      </div>

      {dashboardView === 'audit-history' ? (
        <AuditHistoryView />
      ) : (
        <>
          {/* ---------------------------------------------------- */}
          {/* 7 KEY METRICS CARDS (The exact 7 dimensions requested) */}
          {/* ---------------------------------------------------- */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3.5">
        
        {/* 1. PROJECT NAME CARD */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/90 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider">Project</span>
            <FolderGit2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <div className="text-base font-bold text-slate-100 truncate" title={projectName}>
              {projectName}
            </div>
            <div className="text-[11px] font-mono text-indigo-400 mt-0.5 truncate">
              {currentRepo.id}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
            <span>Lang: {currentRepo.primaryLanguage}</span>
            <span className="text-emerald-400 font-semibold">Active</span>
          </div>
        </div>

        {/* 2. TOKEN COUNT CARD */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/90 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider">Token Count</span>
            <Binary className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-slate-100 tracking-tight">
              {(cumulativeTokens / 1_000_000).toFixed(2)}M
            </div>
            <div className="text-[11px] font-mono text-cyan-400 mt-0.5 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>{tokenThroughput.toLocaleString()} tok/s</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
            <span>CoT: 72%</span>
            <span className="text-slate-300">Total: {cumulativeTokens.toLocaleString()}</span>
          </div>
        </div>

        {/* 3. RUN TIME CARD */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/90 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider">Run Time</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-base font-bold font-mono text-emerald-400 tracking-tight">
              {formatRunTime(elapsedSeconds)}
            </div>
            <div className="text-[11px] font-mono text-slate-400 mt-0.5">
              Step {stepCount} (Epoch 1.4/3)
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
            <span>Step Latency</span>
            <span className="text-slate-300 font-mono">182 ms</span>
          </div>
        </div>

        {/* 4. INFERENCE USED CARD */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/90 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider">Inference Used</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-slate-100 tracking-tight">
              {inferenceCallCount.toLocaleString()}
            </div>
            <div className="text-[11px] font-mono text-amber-400 mt-0.5">
              {(inferenceTokensUsed / 1_000).toFixed(1)}k tokens ({inferenceLatencyMs}ms)
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
            <span>Engine: QwQ</span>
            <span className="text-emerald-400 font-semibold">Ready</span>
          </div>
        </div>

        {/* 5. VRAM USED CARD */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/90 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider">VRAM Used</span>
            <Cpu className="w-4 h-4 text-rose-400" />
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-slate-100 tracking-tight">
              {liveVramGb.toFixed(1)} <span className="text-xs font-normal text-slate-400">/ {maxVramGb} GB</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-rose-500 rounded-full transition-all duration-300"
                style={{ width: `${(liveVramGb / maxVramGb) * 100}%` }}
              />
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
            <span>GPU Load: {((liveVramGb / maxVramGb) * 100).toFixed(0)}%</span>
            <span className="text-emerald-400">Safe Headroom</span>
          </div>
        </div>

        {/* 6. RAM USED CARD */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/90 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider">RAM Used</span>
            <HardDrive className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-slate-100 tracking-tight">
              {liveRamGb.toFixed(1)} <span className="text-xs font-normal text-slate-400">/ {maxRamGb} GB</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all duration-300"
                style={{ width: `${(liveRamGb / maxRamGb) * 100}%` }}
              />
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
            <span>Host Load: {((liveRamGb / maxRamGb) * 100).toFixed(0)}%</span>
            <span className="text-slate-300">Ring Buffer OK</span>
          </div>
        </div>

        {/* 7. HYPERPARAMETERS SUMMARY CARD */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/90 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider">Hyperparams</span>
            <Sliders className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 font-mono text-[11px] font-bold border border-indigo-500/30">
                {hyperparameters.modelSize}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[10px] uppercase">
                {hyperparameters.method}
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-300 mt-1.5">
              LR: <span className="text-indigo-400 font-semibold">{hyperparameters.learningRate}</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
            <span>Batch: {hyperparameters.microBatchSize * hyperparameters.gradientAccumulation}</span>
            <span className="text-amber-400">r={hyperparameters.loraRank}</span>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* REAL-TIME DYNAMICS CHARTS (VRAM, RAM, TOKENS, INFERENCE) */}
      {/* ---------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* CHART 1: VRAM & SYSTEM RAM OVER TIME */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/80 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  Memory Utilization Dynamics (VRAM vs Host RAM)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Continuous hardware telemetry over the active training trajectory
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1 text-rose-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                VRAM: {liveVramGb.toFixed(1)} GB
              </span>
              <span className="flex items-center gap-1 text-purple-400">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
                Host RAM: {liveRamGb.toFixed(1)} GB
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="vramGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="ramGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="timeStr" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 30]} stroke="#64748b" tick={{ fontSize: 10 }} unit="GB" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
                />
                <ReferenceLine y={maxVramGb} stroke="#ef4444" strokeDasharray="4 4" label={{ value: '24GB VRAM Limit', fill: '#ef4444', fontSize: 10 }} />
                <Area type="monotone" dataKey="vramGb" name="VRAM Used" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#vramGrad)" />
                <Area type="monotone" dataKey="ramGb" name="Host RAM Used" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#ramGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Allocation Breakdown Bar */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px] font-mono">
            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
              <div className="text-slate-500 text-[10px]">Model Weights</div>
              <div className="text-slate-200 font-semibold">4.2 GB (4-bit)</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
              <div className="text-slate-500 text-[10px]">Optimizer States</div>
              <div className="text-amber-400 font-semibold">1.8 GB (8-bit)</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
              <div className="text-slate-500 text-[10px]">DataLoader Buffer</div>
              <div className="text-purple-400 font-semibold">8.2 GB (Host)</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
              <div className="text-slate-500 text-[10px]">Pinned Memory</div>
              <div className="text-cyan-400 font-semibold">4.5 GB (Host)</div>
            </div>
          </div>
        </div>

        {/* CHART 2: TOKEN THROUGHPUT & INFERENCE VELOCITY */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/80 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Binary className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  Throughput & Inference Concurrency
                </h3>
                <p className="text-[11px] text-slate-400">
                  Tokens processed per second and active inference request throughput
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1 text-cyan-400">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block" />
                {tokenThroughput} tok/s
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                12.8 req/s
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="timeStr" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" stroke="#06b6d4" tick={{ fontSize: 10 }} unit=" t/s" />
                <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" tick={{ fontSize: 10 }} unit=" r/s" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line yAxisId="left" type="monotone" dataKey="tokenThroughput" name="Training Tokens / sec" stroke="#06b6d4" strokeWidth={2.5} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="inferenceReqsSec" name="Inference Requests / sec" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="3 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Inference Metrics Breakdown */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px] font-mono">
            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
              <div className="text-slate-500 text-[10px]">Inference P50 Latency</div>
              <div className="text-emerald-400 font-semibold">{inferenceLatencyMs} ms</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
              <div className="text-slate-500 text-[10px]">Inference P99 Latency</div>
              <div className="text-amber-400 font-semibold">118.2 ms</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
              <div className="text-slate-500 text-[10px]">Active Workers</div>
              <div className="text-cyan-400 font-semibold">8 Rollouts</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
              <div className="text-slate-500 text-[10px]">Cache Hit Rate</div>
              <div className="text-indigo-400 font-semibold">94.2% Prefix</div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* DETAILED HYPERPARAMETERS CONTROL & SPECIFICATION TABLE */}
      {/* ---------------------------------------------------- */}
      <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/80 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                Active Hyperparameters & Execution Engine
              </h3>
              <p className="text-[11px] text-slate-400">
                Real-time training configuration governing tokenization, memory footprint, and convergence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setHyperparameters((prev) => ({
                  ...prev,
                  optimizer: prev.optimizer === 'paged_adamw_8bit' ? 'adamw_torch_fused' : 'paged_adamw_8bit',
                }));
              }}
              className="px-3 py-1.5 text-xs font-mono font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              Toggle 8-bit Optimizer
            </button>
            <button
              onClick={() => {
                setHyperparameters((prev) => ({
                  ...prev,
                  flashAttention2: !prev.flashAttention2,
                }));
              }}
              className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg border transition-colors ${
                hyperparameters.flashAttention2
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              FlashAttention-2: {hyperparameters.flashAttention2 ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Hyperparameters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Model Size */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="text-[10px] uppercase font-mono text-slate-500">Model Scale</div>
            <select
              value={hyperparameters.modelSize}
              onChange={(e) =>
                setHyperparameters({
                  ...hyperparameters,
                  modelSize: e.target.value as QwenModelSize,
                })
              }
              className="mt-1 w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-indigo-300 font-bold focus:outline-none"
            >
              <option value="0.5B">0.5B (Edge)</option>
              <option value="1.5B">1.5B (Mobile)</option>
              <option value="7B">7B (Standard)</option>
              <option value="14B">14B (Heavy)</option>
              <option value="32B">32B (Full Cluster)</option>
            </select>
          </div>

          {/* Tuning Paradigm */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="text-[10px] uppercase font-mono text-slate-500">Paradigm / Method</div>
            <select
              value={hyperparameters.method}
              onChange={(e) =>
                setHyperparameters({
                  ...hyperparameters,
                  method: e.target.value as FineTuningMethod,
                })
              }
              className="mt-1 w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-cyan-300 font-bold focus:outline-none"
            >
              <option value="qlora-4bit">QLoRA (4-bit NF4)</option>
              <option value="lora-16bit">LoRA (16-bit BF16)</option>
              <option value="full-sft">Full SFT</option>
            </select>
          </div>

          {/* Learning Rate */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="text-[10px] uppercase font-mono text-slate-500">Learning Rate</div>
            <div className="mt-1 text-xs font-mono font-bold text-slate-100 flex items-center justify-between">
              <span>{hyperparameters.learningRate}</span>
              <span className="text-[10px] text-slate-500 font-normal">Cosine Warmup</span>
            </div>
            <div className="text-[10px] font-mono text-indigo-400 mt-1">
              Warmup: {(hyperparameters.warmupRatio * 100).toFixed(0)}%
            </div>
          </div>

          {/* Micro Batch & Accum */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="text-[10px] uppercase font-mono text-slate-500">Batch Dynamics</div>
            <div className="mt-1 text-xs font-mono font-bold text-slate-100">
              {hyperparameters.microBatchSize} × {hyperparameters.gradientAccumulation}
            </div>
            <div className="text-[10px] font-mono text-emerald-400 mt-1">
              Effective: {hyperparameters.microBatchSize * hyperparameters.gradientAccumulation} seq/step
            </div>
          </div>

          {/* LoRA Rank & Alpha */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="text-[10px] uppercase font-mono text-slate-500">LoRA Rank / Alpha</div>
            <div className="mt-1 text-xs font-mono font-bold text-slate-100">
              r = {hyperparameters.loraRank} / α = {hyperparameters.loraAlpha}
            </div>
            <div className="text-[10px] font-mono text-amber-400 mt-1">
              Scaling factor: {(hyperparameters.loraAlpha / hyperparameters.loraRank).toFixed(1)}x
            </div>
          </div>

          {/* Context Window */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="text-[10px] uppercase font-mono text-slate-500">Context Window</div>
            <div className="mt-1 text-xs font-mono font-bold text-slate-100">
              {hyperparameters.contextLength.toLocaleString()} tokens
            </div>
            <div className="text-[10px] font-mono text-purple-400 mt-1">
              RoPE Scaling: 1.0 (Qwen-2.5)
            </div>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
};
