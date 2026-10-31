import React, { useState, useEffect, useRef } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  Activity,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  Zap,
  TrendingDown,
  Gauge,
  CheckCircle2,
  SlidersHorizontal,
  Flame,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import { TrainingConfig } from '../types/agent';

export interface TelemetryPoint {
  step: number;
  epoch: number;
  trainLoss: number;
  valLoss: number;
  gradNorm: number;
  rewardMean: number;
  learningRate: number;
  throughput: number; // tok/s
  clipped: boolean;
}

interface TrainingTelemetryProps {
  config: TrainingConfig;
  estimatedVramGb: number;
}

// Generate realistic synthetic initial training trajectory (steps 1..40)
const generateInitialTelemetry = (baseLr: number): TelemetryPoint[] => {
  const points: TelemetryPoint[] = [];
  let trainLoss = 3.25;
  let valLoss = 3.42;
  const warmupSteps = 10;
  const totalSteps = 40;

  for (let s = 1; s <= totalSteps; s++) {
    const epoch = Number(((s / 120) * 3).toFixed(2));
    
    // Learning rate warmup then cosine
    let lr = baseLr;
    if (s <= warmupSteps) {
      lr = baseLr * (s / warmupSteps);
    } else {
      const progress = (s - warmupSteps) / (200 - warmupSteps);
      lr = baseLr * 0.5 * (1 + Math.cos(Math.PI * progress));
    }

    // Loss decay with natural mini-batch fluctuations
    const decayFactor = 0.965 + (Math.sin(s * 0.4) * 0.015);
    trainLoss = Math.max(0.42, trainLoss * decayFactor + (Math.random() - 0.48) * 0.04);
    valLoss = Math.max(0.48, valLoss * (decayFactor + 0.005) + (Math.random() - 0.48) * 0.03);

    // Gradient norm dynamics
    const isSpike = s === 18 || s === 31;
    let gradNorm = 0.65 + Math.sin(s * 0.3) * 0.22 + (Math.random() - 0.5) * 0.15;
    if (isSpike) gradNorm = 1.65 + Math.random() * 0.4;
    const clipped = gradNorm > 1.0;

    // GRPO Compiler Reward (-1.0 to +1.0)
    const rewardMean = Math.min(0.92, -0.65 + Math.log(s + 2) * 0.42 + (Math.random() - 0.5) * 0.06);

    // Throughput in tokens/sec
    const throughput = Math.round(210000 + Math.sin(s * 0.5) * 15000 + (Math.random() - 0.5) * 8000);

    points.push({
      step: s,
      epoch,
      trainLoss: Number(trainLoss.toFixed(4)),
      valLoss: Number(valLoss.toFixed(4)),
      gradNorm: Number(gradNorm.toFixed(3)),
      rewardMean: Number(rewardMean.toFixed(3)),
      learningRate: Number(lr.toExponential(2)),
      throughput,
      clipped,
    });
  }

  return points;
};

export const TrainingTelemetry: React.FC<TrainingTelemetryProps> = ({
  config,
  estimatedVramGb,
}) => {
  const [telemetry, setTelemetry] = useState<TelemetryPoint[]>(() =>
    generateInitialTelemetry(config.learningRate)
  );
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [streamSpeed, setStreamSpeed] = useState<number>(1); // 1x, 2x, 4x
  const [activeMetricTab, setActiveMetricTab] = useState<'loss' | 'gradNorm' | 'rewardLr'>('loss');
  const [clipCount, setClipCount] = useState<number>(4);
  const [anomalyTriggered, setAnomalyTriggered] = useState<boolean>(false);

  // Interval stream simulation
  useEffect(() => {
    if (!isRunning) return;

    const intervalMs = Math.max(250, 1000 / streamSpeed);
    const interval = setInterval(() => {
      setTelemetry((prev) => {
        const last = prev[prev.length - 1];
        if (!last) return prev;
        const nextStep = last.step + 1;
        const epoch = Number(((nextStep / 120) * config.epochs).toFixed(2));

        // Cosine LR update
        const progress = Math.min(1.0, nextStep / 200);
        const lr = config.learningRate * 0.5 * (1 + Math.cos(Math.PI * progress));

        // Natural loss decay
        const jitter = (Math.random() - 0.49) * 0.025;
        const nextTrainLoss = Math.max(0.24, last.trainLoss * 0.992 + jitter);
        const nextValLoss = Math.max(0.31, last.valLoss * 0.993 + jitter * 0.8);

        // Gradient norm calculation
        let nextGrad = 0.55 + Math.sin(nextStep * 0.35) * 0.2 + (Math.random() - 0.5) * 0.12;
        let isClipped = false;

        // If anomaly was triggered, produce a sharp spike
        if (anomalyTriggered) {
          nextGrad = 2.15 + Math.random() * 0.5;
          isClipped = true;
          setAnomalyTriggered(false);
          setClipCount((c) => c + 1);
        } else if (nextGrad > 1.0) {
          isClipped = true;
          setClipCount((c) => c + 1);
        }

        // GRPO Reward increases as reasoning converges
        const nextReward = Math.min(0.98, last.rewardMean + 0.006 + (Math.random() - 0.48) * 0.02);

        // Throughput
        const throughput = Math.round(218000 + Math.sin(nextStep) * 12000 + (Math.random() - 0.5) * 5000);

        const newPoint: TelemetryPoint = {
          step: nextStep,
          epoch,
          trainLoss: Number(nextTrainLoss.toFixed(4)),
          valLoss: Number(nextValLoss.toFixed(4)),
          gradNorm: Number(nextGrad.toFixed(3)),
          rewardMean: Number(nextReward.toFixed(3)),
          learningRate: Number(lr.toExponential(2)),
          throughput,
          clipped: isClipped,
        };

        // Maintain sliding window of last 70 points for smooth rendering
        const updated = [...prev.slice(-69), newPoint];
        return updated;
      });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isRunning, streamSpeed, config.learningRate, config.epochs, anomalyTriggered]);

  const latest = telemetry[telemetry.length - 1] || {
    step: 0,
    epoch: 0,
    trainLoss: 0,
    valLoss: 0,
    gradNorm: 0,
    rewardMean: 0,
    learningRate: 0,
    throughput: 0,
    clipped: false,
  };

  const initialLoss = telemetry[0]?.trainLoss || 3.25;
  const lossReductionPercent = (((initialLoss - latest.trainLoss) / initialLoss) * 100).toFixed(1);
  const avgGradNorm = (
    telemetry.reduce((acc, p) => acc + p.gradNorm, 0) / (telemetry.length || 1)
  ).toFixed(3);

  const handleReset = () => {
    setTelemetry(generateInitialTelemetry(config.learningRate));
    setClipCount(2);
    setAnomalyTriggered(false);
  };

  const handleInjectAnomaly = () => {
    setAnomalyTriggered(true);
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-5">
      {/* Header & Live Stream Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-indigo-400" />
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>Real-Time Training Telemetry & Gradient Dynamics</span>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono border border-emerald-500/30 bg-emerald-950/40 text-emerald-300">
                <span className={`w-1.5 h-1.5 rounded-full bg-emerald-400 ${isRunning ? 'animate-pulse' : ''}`} />
                <span>{isRunning ? 'LIVE IPC STREAM' : 'PAUSED'}</span>
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Tracking loss convergence, L2 gradient norm clipping, and GRPO reward optimization in real time.
          </p>
        </div>

        {/* Live Controls */}
        <div className="flex items-center gap-2 font-mono text-xs">
          {/* Play/Pause */}
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold transition-colors ${
              isRunning
                ? 'bg-amber-950/40 text-amber-300 border-amber-800/60 hover:bg-amber-900/40'
                : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900/40'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Resume</span>
              </>
            )}
          </button>

          {/* Speed selector */}
          <div className="flex items-center border border-slate-800 rounded-lg bg-slate-950 p-0.5">
            {[1, 2, 4].map((s) => (
              <button
                key={s}
                onClick={() => setStreamSpeed(s)}
                className={`px-2 py-1 rounded text-[11px] transition-colors ${
                  streamSpeed === s
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Inject Spike / Anomaly */}
          <button
            onClick={handleInjectAnomaly}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-rose-800/60 bg-rose-950/30 text-rose-300 hover:bg-rose-900/40 transition-colors text-[11px]"
            title="Inject simulated gradient surge to test max_grad_norm clipping"
          >
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            <span>Spike Grad</span>
          </button>

          {/* Reset */}
          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 transition-colors"
            title="Reset telemetry trajectory"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Real-Time Live Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
            Training Step / Epoch
          </div>
          <div className="text-xl font-bold font-mono text-slate-100 tabular-nums">
            Step {latest.step}{' '}
            <span className="text-xs text-indigo-400 font-normal">
              (Ep {latest.epoch})
            </span>
          </div>
          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-1">
            <div
              className="bg-indigo-500 h-full transition-all duration-300"
              style={{ width: `${Math.min(100, (latest.step / 200) * 100)}%` }}
            />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
            Train Loss (Convergence)
          </div>
          <div className="text-xl font-bold font-mono text-indigo-400 tabular-nums flex items-baseline gap-1.5">
            <span>{latest.trainLoss}</span>
            <span className="text-[11px] text-emerald-400 font-normal">
              -{lossReductionPercent}%
            </span>
          </div>
          <p className="text-[10px] font-mono text-slate-400">
            Val: {latest.valLoss} · Target: &lt; 0.50
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
            Gradient L2 Norm
          </div>
          <div className={`text-xl font-bold font-mono tabular-nums flex items-center gap-1.5 ${
            latest.gradNorm > 1.0 ? 'text-rose-400' : 'text-amber-400'
          }`}>
            <span>{latest.gradNorm}</span>
            {latest.clipped && (
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-rose-950 border border-rose-800 text-rose-300 font-semibold">
                CLIPPED
              </span>
            )}
          </div>
          <p className="text-[10px] font-mono text-slate-400">
            Avg: {avgGradNorm} · Clips: {clipCount}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
            GRPO Reward Mean
          </div>
          <div className="text-xl font-bold font-mono text-cyan-400 tabular-nums">
            {latest.rewardMean >= 0 ? `+${latest.rewardMean}` : latest.rewardMean}
          </div>
          <p className="text-[10px] font-mono text-slate-400">
            Compiler Invariant Pass Rate: {Math.max(0, Math.min(100, Math.round((latest.rewardMean + 1) * 50)))}%
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
            Throughput (tok/s)
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400 tabular-nums">
            {(latest.throughput / 1000).toFixed(0)}k <span className="text-xs text-slate-500 font-normal">tok/s</span>
          </div>
          <p className="text-[10px] font-mono text-slate-400">
            Multi-Threaded Rust RingBuffer
          </p>
        </div>
      </div>

      {/* Chart Selector Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2 text-xs font-mono">
          <button
            onClick={() => setActiveMetricTab('loss')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
              activeMetricTab === 'loss'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5 text-indigo-300" />
            <span>Loss Convergence (Train & Val)</span>
          </button>

          <button
            onClick={() => setActiveMetricTab('gradNorm')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
              activeMetricTab === 'gradNorm'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
            <span>Gradient L2 Norm & Clipping Threshold</span>
          </button>

          <button
            onClick={() => setActiveMetricTab('rewardLr')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
              activeMetricTab === 'rewardLr'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-cyan-300" />
            <span>GRPO Policy Advantage & LR Schedule</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-slate-400">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          <span>Active Window: Last {telemetry.length} steps</span>
        </div>
      </div>

      {/* CHART 1: Loss Convergence Curves */}
      {activeMetricTab === 'loss' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Cross-Entropy Loss (Lower is better)</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-indigo-500 inline-block" />
                <span className="text-indigo-300 font-semibold">Training Loss</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-emerald-500 inline-block" />
                <span className="text-emerald-300 font-semibold">Validation Loss</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-t border-dashed border-rose-500 inline-block" />
                <span className="text-rose-400">Target (0.50)</span>
              </span>
            </div>
          </div>

          <div className="h-64 w-full bg-slate-950 rounded-xl p-3 border border-slate-800/80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={telemetry} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="trainLossGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="valLossGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="step"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  label={{ value: 'Step', position: 'insideBottomRight', offset: -5, fill: '#64748b', fontSize: 10 }}
                />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} domain={['auto', 'auto']} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as TelemetryPoint;
                      return (
                        <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-xs font-mono shadow-xl space-y-1">
                          <div className="font-bold text-slate-200">
                            Step {label} (Epoch {data.epoch})
                          </div>
                          <div className="text-indigo-400">
                            Train Loss: <span className="font-bold">{data.trainLoss}</span>
                          </div>
                          <div className="text-emerald-400">
                            Val Loss: <span className="font-bold">{data.valLoss}</span>
                          </div>
                          <div className="text-slate-400 text-[10px]">
                            Throughput: {(data.throughput / 1000).toFixed(0)}k tok/s
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={0.5} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: 'Target 0.50', fill: '#f43f5e', fontSize: 10, position: 'right' }} />
                <Area
                  type="monotone"
                  dataKey="trainLoss"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#trainLossGrad)"
                  name="Train Loss"
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="valLoss"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  name="Val Loss"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* CHART 2: Gradient Norm & Clipping Threshold */}
      {activeMetricTab === 'gradNorm' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>L2 Gradient Norm ||g||₂ (Optimization Stability)</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-amber-500 inline-block" />
                <span className="text-amber-300 font-semibold">Gradient Norm</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-t border-dashed border-rose-500 inline-block" />
                <span className="text-rose-400 font-semibold">max_grad_norm Ceiling (1.0)</span>
              </span>
            </div>
          </div>

          <div className="h-64 w-full bg-slate-950 rounded-xl p-3 border border-slate-800/80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={telemetry} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradNormGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="step" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} domain={[0, 2.5]} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as TelemetryPoint;
                      return (
                        <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-xs font-mono shadow-xl space-y-1">
                          <div className="font-bold text-slate-200">
                            Step {label}
                          </div>
                          <div className={data.gradNorm > 1.0 ? 'text-rose-400 font-bold' : 'text-amber-400'}>
                            Grad Norm: {data.gradNorm} {data.clipped ? '(CLIPPED to 1.0)' : '(STABLE)'}
                          </div>
                          <div className="text-slate-400 text-[10px]">
                            Learning Rate: {data.learningRate}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine
                  y={1.0}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{ value: 'Clip Threshold = 1.0', fill: '#ef4444', fontSize: 10, position: 'insideTopLeft' }}
                />
                <Area
                  type="monotone"
                  dataKey="gradNorm"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#gradNormGrad)"
                  name="Grad Norm"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* CHART 3: GRPO Policy Reward & LR Schedule */}
      {activeMetricTab === 'rewardLr' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>GRPO Verification Reward Mean & Cosine Schedule</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-cyan-400 inline-block" />
                <span className="text-cyan-300 font-semibold">Reward Mean (AST/Compiler)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-purple-400 inline-block" />
                <span className="text-purple-300 font-semibold">Learning Rate Schedule</span>
              </span>
            </div>
          </div>

          <div className="h-64 w-full bg-slate-950 rounded-xl p-3 border border-slate-800/80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={telemetry} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="step" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis yAxisId="left" stroke="#06b6d4" fontSize={10} tickLine={false} domain={[-1, 1]} />
                <YAxis yAxisId="right" orientation="right" stroke="#a855f7" fontSize={10} tickLine={false} domain={[0, config.learningRate * 1.2]} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as TelemetryPoint;
                      return (
                        <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-xs font-mono shadow-xl space-y-1">
                          <div className="font-bold text-slate-200">
                            Step {label}
                          </div>
                          <div className="text-cyan-400">
                            Compiler Pass Reward: <span className="font-bold">{data.rewardMean}</span>
                          </div>
                          <div className="text-purple-400">
                            Learning Rate: <span className="font-bold">{data.learningRate}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine yAxisId="left" y={0.0} stroke="#475569" strokeDasharray="2 2" />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="rewardMean"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  dot={false}
                  name="Reward Mean"
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="learningRate"
                  stroke="#a855f7"
                  strokeWidth={2}
                  dot={false}
                  name="Learning Rate"
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Stability & IPC Diagnostics Footer */}
      <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 text-xs font-mono flex flex-wrap items-center justify-between gap-3 text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Optimizer State: Fused AdamW (bf16)</span>
          </div>
          <span className="text-slate-600">·</span>
          <div>
            Loss Drift: <span className="text-slate-200 font-semibold">&lt; 0.02% (Converging)</span>
          </div>
          <span className="text-slate-600">·</span>
          <div>
            Gradient Clipping: <span className="text-amber-400 font-semibold">{clipCount} events triggered</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-500">
          <span>Active VRAM:</span>
          <span className="text-indigo-400 font-bold">{estimatedVramGb} GB</span>
        </div>
      </div>
    </div>
  );
};
