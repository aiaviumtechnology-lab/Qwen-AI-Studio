import React, { useState, useEffect } from 'react';
import {
  TrainingConfig,
  QwenModelSize,
  FineTuningMethod,
  HyperparameterPreset,
  VramEstimate,
} from '../types/agent';
import {
  Sliders,
  Save,
  FolderOpen,
  Plus,
  Trash2,
  Copy,
  Check,
  Download,
  Upload,
  RefreshCw,
  Sparkles,
  Zap,
  HardDrive,
  Cpu,
  Layers,
  Info,
  X,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';

interface HyperparameterManagerProps {
  config: TrainingConfig;
  onChangeConfig: (newConfig: TrainingConfig) => void;
  vramEstimate: VramEstimate;
}

const STORAGE_KEY = 'qwen_hyperparameter_presets_v1';

// Default curated production presets
export const BUILTIN_PRESETS: HyperparameterPreset[] = [
  {
    id: 'preset-recommended-7b',
    name: '🎯 Recommended CoT Reasoning (7B · LoRA · Fused AdamW)',
    description:
      'Balanced multi-language reasoning alignment for single RTX 4090 / A10G (24GB VRAM).',
    isDefault: true,
    config: {
      modelSize: '7B',
      method: 'lora-16bit',
      contextLength: 4096,
      microBatchSize: 2,
      gradientAccumulation: 8,
      learningRate: 0.0002,
      loraRank: 32,
      loraAlpha: 64,
      epochs: 3,
      warmupRatio: 0.03,
      optimizer: 'adamw_torch_fused',
      gradientCheckpointing: true,
      flashAttention2: true,
    },
  },
  {
    id: 'preset-low-vram-14b',
    name: '💾 Low-VRAM QLoRA (14B · 4-bit NF4 · Paged 8-bit AdamW)',
    description:
      'Memory-optimized QLoRA running deep 14B parameter reasoning on 16GB–24GB GPU without OOM.',
    isDefault: true,
    config: {
      modelSize: '14B',
      method: 'qlora-4bit',
      contextLength: 4096,
      microBatchSize: 1,
      gradientAccumulation: 16,
      learningRate: 0.0001,
      loraRank: 64,
      loraAlpha: 128,
      epochs: 3,
      warmupRatio: 0.05,
      optimizer: 'paged_adamw_8bit',
      gradientCheckpointing: true,
      flashAttention2: true,
    },
  },
  {
    id: 'preset-fast-prototype-1.5b',
    name: '🚀 Fast Iteration & Edge Dev (1.5B · LoRA · Batch 4)',
    description:
      'Rapid turnaround prototyping pipeline for local development and fast iteration (<10 min epochs).',
    isDefault: true,
    config: {
      modelSize: '1.5B',
      method: 'lora-16bit',
      contextLength: 2048,
      microBatchSize: 4,
      gradientAccumulation: 4,
      learningRate: 0.0005,
      loraRank: 16,
      loraAlpha: 32,
      epochs: 2,
      warmupRatio: 0.02,
      optimizer: 'adamw_torch_fused',
      gradientCheckpointing: false,
      flashAttention2: true,
    },
  },
  {
    id: 'preset-enterprise-fsdp-32b',
    name: '⚡ High-Throughput Cluster (32B · Full SFT · FSDP ZeRO-3)',
    description:
      'Full parameter multi-GPU cluster training with PyTorch FSDP ZeRO-3 for complex enterprise codebases.',
    isDefault: true,
    config: {
      modelSize: '32B',
      method: 'full-sft',
      contextLength: 8192,
      microBatchSize: 2,
      gradientAccumulation: 16,
      learningRate: 0.00002,
      loraRank: 64,
      loraAlpha: 128,
      epochs: 4,
      warmupRatio: 0.05,
      optimizer: 'adamw_torch',
      gradientCheckpointing: true,
      flashAttention2: true,
    },
  },
  {
    id: 'preset-grpo-rl-7b',
    name: '🧪 GRPO Group RL Policy (7B · Batch 1 · Group Size 4)',
    description:
      'Group Relative Policy Optimization with compiler execution rewards and advantage normalization.',
    isDefault: true,
    config: {
      modelSize: '7B',
      method: 'lora-16bit',
      contextLength: 4096,
      microBatchSize: 1,
      gradientAccumulation: 16,
      learningRate: 0.0001,
      loraRank: 32,
      loraAlpha: 64,
      epochs: 3,
      warmupRatio: 0.03,
      optimizer: 'adamw_torch_fused',
      gradientCheckpointing: true,
      flashAttention2: true,
    },
  },
];

export const HyperparameterManager: React.FC<HyperparameterManagerProps> = ({
  config,
  onChangeConfig,
  vramEstimate,
}) => {
  const [presets, setPresets] = useState<HyperparameterPreset[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback to builtins
    }
    return BUILTIN_PRESETS;
  });

  const [activePresetId, setActivePresetId] = useState<string>(BUILTIN_PRESETS[0].id);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDesc, setNewPresetDesc] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [importJsonText, setImportJsonText] = useState('');
  const [showImportBox, setShowImportBox] = useState(false);

  // Sync presets to localStorage
  const savePresetsToStorage = (updated: HyperparameterPreset[]) => {
    setPresets(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save presets to localStorage', e);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Check if current config matches the selected preset
  const isModifiedFromActive = React.useMemo(() => {
    const activePreset = presets.find((p) => p.id === activePresetId);
    if (!activePreset) return true;
    return JSON.stringify(activePreset.config) !== JSON.stringify(config);
  }, [presets, activePresetId, config]);

  // Load a preset
  const handleSelectPreset = (presetId: string) => {
    const target = presets.find((p) => p.id === presetId);
    if (target) {
      setActivePresetId(target.id);
      onChangeConfig({ ...target.config });
      showToast(`Loaded preset: "${target.name}"`);
    }
  };

  // Open Save Modal
  const handleOpenSaveModal = () => {
    const activePreset = presets.find((p) => p.id === activePresetId);
    setNewPresetName(
      activePreset?.isDefault
        ? `${config.modelSize} Custom Run (${config.method.split('-')[0].toUpperCase()})`
        : activePreset?.name || `Custom ${config.modelSize} Configuration`
    );
    setNewPresetDesc(
      `Batch ${config.microBatchSize}x${config.gradientAccumulation} | LR ${config.learningRate} | ${config.optimizer}`
    );
    setIsSaveModalOpen(true);
  };

  // Save new preset
  const handleConfirmSavePreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;

    const newPreset: HyperparameterPreset = {
      id: `user-preset-${Date.now()}`,
      name: newPresetName.trim(),
      description: newPresetDesc.trim() || 'User defined hyperparameter configuration',
      isDefault: false,
      createdAt: new Date().toISOString(),
      config: { ...config },
    };

    const updated = [newPreset, ...presets];
    savePresetsToStorage(updated);
    setActivePresetId(newPreset.id);
    setIsSaveModalOpen(false);
    showToast(`Configuration "${newPreset.name}" saved!`);
  };

  // Delete preset
  const handleDeletePreset = (id: string) => {
    const target = presets.find((p) => p.id === id);
    if (!target || target.isDefault) return;

    const updated = presets.filter((p) => p.id !== id);
    savePresetsToStorage(updated);
    if (activePresetId === id) {
      setActivePresetId(BUILTIN_PRESETS[0].id);
      onChangeConfig({ ...BUILTIN_PRESETS[0].config });
    }
    showToast(`Deleted preset "${target.name}"`);
  };

  // Export current config as JSON file
  const handleExportJson = () => {
    const exportData = {
      name: presets.find((p) => p.id === activePresetId)?.name || 'Custom Config',
      timestamp: new Date().toISOString(),
      config,
      vramEstimate,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qwen-training-config-${config.modelSize}-${config.method}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Configuration exported as JSON');
  };

  // Import JSON configuration
  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(importJsonText);
      const importedConfig: TrainingConfig = parsed.config || parsed;

      // Validate mandatory fields
      if (
        !importedConfig.modelSize ||
        !importedConfig.method ||
        !importedConfig.microBatchSize ||
        !importedConfig.learningRate ||
        !importedConfig.optimizer
      ) {
        throw new Error('Missing required hyperparameter keys in JSON');
      }

      const importedPreset: HyperparameterPreset = {
        id: `imported-${Date.now()}`,
        name: parsed.name ? `[Imported] ${parsed.name}` : `Imported ${importedConfig.modelSize} Config`,
        description:
          parsed.description ||
          `Imported config with Batch ${importedConfig.microBatchSize}x${importedConfig.gradientAccumulation}`,
        isDefault: false,
        createdAt: new Date().toISOString(),
        config: importedConfig,
      };

      const updated = [importedPreset, ...presets];
      savePresetsToStorage(updated);
      setActivePresetId(importedPreset.id);
      onChangeConfig(importedConfig);
      setShowImportBox(false);
      setImportJsonText('');
      showToast('Configuration imported successfully!');
    } catch (err: any) {
      alert(`Failed to import configuration JSON: ${err?.message || 'Invalid format'}`);
    }
  };

  // Reset to factory defaults
  const handleResetDefaults = () => {
    if (window.confirm('Reset all presets to factory default configurations? Custom presets will be removed.')) {
      savePresetsToStorage(BUILTIN_PRESETS);
      setActivePresetId(BUILTIN_PRESETS[0].id);
      onChangeConfig({ ...BUILTIN_PRESETS[0].config });
      showToast('Presets reset to factory defaults');
    }
  };

  // Calculate effective batch size and token volume
  const effectiveBatchSize = config.microBatchSize * config.gradientAccumulation;
  const tokensPerStep = effectiveBatchSize * config.contextLength;

  return (
    <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-5 space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg shadow-xl border border-indigo-400 font-mono text-xs animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header and Preset Selection Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-slate-100 tracking-tight">
              Training Hyperparameters &amp; Config Manager
            </h2>
            {isModifiedFromActive && (
              <span className="px-2 py-0.5 text-[11px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-md">
                Unsaved Edits · Modified
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Define, customize, and save reproducible training hyperparameter configurations including
            batch size, learning rate schedules, and optimizer algorithms.
          </p>
        </div>

        {/* Preset Selector & Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs">
            <FolderOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <select
              value={activePresetId}
              onChange={(e) => handleSelectPreset(e.target.value)}
              className="bg-transparent text-slate-200 font-mono text-xs focus:outline-none cursor-pointer max-w-[230px] sm:max-w-[280px] truncate"
            >
              <optgroup label="Saved & Curated Configurations">
                {presets.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-950 text-slate-200">
                    {p.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <button
            onClick={handleOpenSaveModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors shrink-0"
            title="Save current parameters as a preset"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Config</span>
          </button>

          <button
            onClick={() => setIsManageModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shrink-0"
            title="Manage saved configurations"
          >
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>Manage ({presets.length})</span>
          </button>

          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors shrink-0"
            title="Export as JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export JSON</span>
          </button>
        </div>
      </div>

      {/* Real-Time Throughput & Hardware Impact Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
          <div className="text-[11px] text-slate-400 uppercase">Effective Batch Size</div>
          <div className="text-base font-bold text-slate-100 mt-0.5 tabular-nums flex items-baseline gap-1">
            <span>{effectiveBatchSize}</span>
            <span className="text-[10px] text-slate-500 font-normal">
              ({config.microBatchSize} × {config.gradientAccumulation} steps)
            </span>
          </div>
        </div>

        <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
          <div className="text-[11px] text-slate-400 uppercase">Tokens Per Optimizer Step</div>
          <div className="text-base font-bold text-indigo-400 mt-0.5 tabular-nums">
            {tokensPerStep.toLocaleString()}{' '}
            <span className="text-[10px] text-slate-500 font-normal">tok/step</span>
          </div>
        </div>

        <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
          <div className="text-[11px] text-slate-400 uppercase">Optimizer &amp; Precision</div>
          <div className="text-sm font-bold text-cyan-300 mt-1 truncate">
            {config.optimizer === 'adamw_torch_fused'
              ? 'Fused AdamW'
              : config.optimizer === 'paged_adamw_8bit'
              ? 'Paged 8-bit AdamW'
              : 'AdamW (Standard)'}
          </div>
        </div>

        <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
          <div className="text-[11px] text-slate-400 uppercase">Estimated VRAM Footprint</div>
          <div className="text-base font-bold text-emerald-400 mt-0.5 tabular-nums flex items-center justify-between">
            <span>{vramEstimate.totalGb} GB</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase font-bold">
              {vramEstimate.fitStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Grid of Hyperparameter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        {/* 1. Base Model & Precision */}
        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-3">
          <div className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between pb-1.5 border-b border-slate-800">
            <span>1. Architecture</span>
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Qwen Model Size</label>
            <select
              value={config.modelSize}
              onChange={(e) =>
                onChangeConfig({ ...config, modelSize: e.target.value as QwenModelSize })
              }
              className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 font-mono focus:border-indigo-500"
            >
              <option value="0.5B">Qwen2.5-Coder-0.5B (Edge / Fast)</option>
              <option value="1.5B">Qwen2.5-Coder-1.5B (Fast Prototype)</option>
              <option value="7B">Qwen2.5-Coder-7B (Recommended)</option>
              <option value="14B">Qwen2.5-Coder-14B (High Reasoning)</option>
              <option value="32B">Qwen2.5-Coder-32B (SOTA Flagship)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Training Method</label>
            <select
              value={config.method}
              onChange={(e) =>
                onChangeConfig({ ...config, method: e.target.value as FineTuningMethod })
              }
              className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 font-mono focus:border-indigo-500"
            >
              <option value="lora-16bit">LoRA (16-bit bfloat16) - Balanced</option>
              <option value="qlora-4bit">QLoRA (4-bit NF4) - Low VRAM</option>
              <option value="full-sft">Full SFT (FSDP / DeepSpeed)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Context Length (Tokens)</label>
            <select
              value={config.contextLength}
              onChange={(e) =>
                onChangeConfig({ ...config, contextLength: Number(e.target.value) })
              }
              className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 font-mono focus:border-indigo-500"
            >
              <option value={2048}>2,048 Tokens (Single File)</option>
              <option value={4096}>4,096 Tokens (Standard CoT)</option>
              <option value={8192}>8,192 Tokens (Multi-file Repo)</option>
              <option value={16384}>16,384 Tokens (Full Project)</option>
            </select>
          </div>
        </div>

        {/* 2. Batch Size & Gradient Accumulation */}
        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-3">
          <div className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between pb-1.5 border-b border-slate-800">
            <span>2. Batching Dynamics</span>
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-400 font-medium">Micro-Batch Size (per GPU)</label>
              <span className="text-cyan-400 font-mono font-bold">{config.microBatchSize}</span>
            </div>
            <select
              value={config.microBatchSize}
              onChange={(e) =>
                onChangeConfig({ ...config, microBatchSize: Number(e.target.value) })
              }
              className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 font-mono focus:border-indigo-500"
            >
              <option value={1}>1 sample / device (Low VRAM)</option>
              <option value={2}>2 samples / device (Standard)</option>
              <option value={4}>4 samples / device (High VRAM)</option>
              <option value={8}>8 samples / device (Multi-GPU)</option>
              <option value={16}>16 samples / device (Cluster)</option>
            </select>
            <p className="text-[10px] text-slate-500 mt-1 font-sans">
              Lowering micro-batch size directly prevents CUDA OOM on high context windows.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-400 font-medium">Gradient Accumulation</label>
              <span className="text-cyan-400 font-mono font-bold">
                {config.gradientAccumulation} steps
              </span>
            </div>
            <select
              value={config.gradientAccumulation}
              onChange={(e) =>
                onChangeConfig({ ...config, gradientAccumulation: Number(e.target.value) })
              }
              className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 font-mono focus:border-indigo-500"
            >
              <option value={1}>1 step (No Accumulation)</option>
              <option value={2}>2 steps (Effective Batch = {config.microBatchSize * 2})</option>
              <option value={4}>4 steps (Effective Batch = {config.microBatchSize * 4})</option>
              <option value={8}>8 steps (Effective Batch = {config.microBatchSize * 8})</option>
              <option value={16}>16 steps (Effective Batch = {config.microBatchSize * 16})</option>
              <option value={32}>32 steps (Effective Batch = {config.microBatchSize * 32})</option>
            </select>
            <p className="text-[10px] text-slate-500 mt-1 font-sans">
              Simulates large global batch sizes without extra VRAM consumption.
            </p>
          </div>
        </div>

        {/* 3. Learning Rate & Optimizer Type */}
        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-3">
          <div className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between pb-1.5 border-b border-slate-800">
            <span>3. Optimization &amp; LR</span>
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Optimizer Algorithm</label>
            <select
              value={config.optimizer}
              onChange={(e) =>
                onChangeConfig({
                  ...config,
                  optimizer: e.target.value as 'adamw_torch_fused' | 'paged_adamw_8bit' | 'adamw_torch',
                })
              }
              className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 font-mono focus:border-indigo-500"
            >
              <option value="adamw_torch_fused">adamw_torch_fused (Fastest CUDA Kernel)</option>
              <option value="paged_adamw_8bit">paged_adamw_8bit (BitsAndBytes -75% VRAM)</option>
              <option value="adamw_torch">adamw_torch (Standard PyTorch AdamW)</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-400 font-medium">Learning Rate (Peak)</label>
              <span className="text-amber-400 font-mono font-bold">{config.learningRate}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.00001"
                min="0.000001"
                max="0.01"
                value={config.learningRate}
                onChange={(e) =>
                  onChangeConfig({ ...config, learningRate: parseFloat(e.target.value) || 0.0001 })
                }
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 font-mono text-xs focus:border-indigo-500"
              />
            </div>
            {/* Quick selector buttons */}
            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
              {[0.00002, 0.00005, 0.0001, 0.0002, 0.0005].map((lr) => (
                <button
                  key={lr}
                  type="button"
                  onClick={() => onChangeConfig({ ...config, learningRate: lr })}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    config.learningRate === lr
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lr >= 0.0001 ? `${lr * 10000}e-4` : `${lr * 100000}e-5`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 4. LoRA Adapter & Memory Toggles */}
        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-3">
          <div className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between pb-1.5 border-b border-slate-800">
            <span>4. LoRA &amp; Efficiency</span>
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-400 font-medium">LoRA Rank (r) / Alpha</label>
              <span className="text-emerald-400 font-mono">
                r={config.loraRank} / α={config.loraAlpha}
              </span>
            </div>
            <select
              value={config.loraRank}
              disabled={config.method === 'full-sft'}
              onChange={(e) => {
                const rank = Number(e.target.value);
                onChangeConfig({
                  ...config,
                  loraRank: rank,
                  loraAlpha: rank * 2,
                });
              }}
              className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 font-mono focus:border-indigo-500 disabled:opacity-40"
            >
              <option value={16}>r = 16 (Alpha = 32) - Lightweight</option>
              <option value={32}>r = 32 (Alpha = 64) - Standard Balanced</option>
              <option value={64}>r = 64 (Alpha = 128) - Deep CoT Reasoning</option>
              <option value={128}>r = 128 (Alpha = 256) - Maximum Capacity</option>
            </select>
          </div>

          <div className="space-y-2 pt-1 border-t border-slate-800">
            {/* Gradient Checkpointing */}
            <label className="flex items-center justify-between cursor-pointer text-[11px]">
              <span className="text-slate-300 font-medium">Gradient Checkpointing</span>
              <input
                type="checkbox"
                checked={config.gradientCheckpointing}
                onChange={(e) =>
                  onChangeConfig({ ...config, gradientCheckpointing: e.target.checked })
                }
                className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0 focus:ring-offset-0"
              />
            </label>

            {/* FlashAttention-2 */}
            <label className="flex items-center justify-between cursor-pointer text-[11px]">
              <span className="text-slate-300 font-medium">FlashAttention-2</span>
              <input
                type="checkbox"
                checked={config.flashAttention2}
                onChange={(e) =>
                  onChangeConfig({ ...config, flashAttention2: e.target.checked })
                }
                className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0 focus:ring-offset-0"
              />
            </label>

            {/* Epochs & Warmup */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">Epochs</label>
                <select
                  value={config.epochs}
                  onChange={(e) => onChangeConfig({ ...config, epochs: Number(e.target.value) })}
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-slate-200 font-mono text-[11px]"
                >
                  {[1, 2, 3, 4, 5, 8, 10].map((ep) => (
                    <option key={ep} value={ep}>
                      {ep} {ep === 1 ? 'epoch' : 'epochs'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">Warmup</label>
                <select
                  value={config.warmupRatio}
                  onChange={(e) =>
                    onChangeConfig({ ...config, warmupRatio: Number(e.target.value) })
                  }
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-slate-200 font-mono text-[11px]"
                >
                  <option value={0.01}>1%</option>
                  <option value={0.03}>3% (Standard)</option>
                  <option value={0.05}>5%</option>
                  <option value={0.1}>10%</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Configuration Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Save className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-slate-100">
                  Save Hyperparameter Configuration
                </h3>
              </div>
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmSavePreset} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Configuration Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., RTX 4090 CoT Fine-Tuning v2"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Hardware notes, target dataset, or training objective..."
                  value={newPresetDesc}
                  onChange={(e) => setNewPresetDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-sans focus:border-indigo-500"
                />
              </div>

              {/* Parameter Preview Chips */}
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                <div className="text-[10px] text-slate-500 uppercase font-mono">Parameters Snapshot</div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono text-slate-300">
                  <div>Model: <span className="text-indigo-400">{config.modelSize}</span></div>
                  <div>Method: <span className="text-indigo-400">{config.method}</span></div>
                  <div>Batch: <span className="text-cyan-400">{config.microBatchSize}x{config.gradientAccumulation}</span></div>
                  <div>LR: <span className="text-amber-400">{config.learningRate}</span></div>
                  <div>Optimizer: <span className="text-emerald-400 truncate">{config.optimizer}</span></div>
                  <div>Context: <span className="text-cyan-400">{config.contextLength}</span></div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-sm transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Configuration</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Presets Modal */}
      {isManageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-slate-100">
                  Manage Hyperparameter Configurations
                </h3>
              </div>
              <button
                onClick={() => setIsManageModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowImportBox(!showImportBox)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Import JSON</span>
                </button>

                <button
                  onClick={handleResetDefaults}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset Defaults</span>
                </button>
              </div>

              <span className="text-[11px] font-mono text-slate-400">
                {presets.length} Presets Available
              </span>
            </div>

            {/* Import JSON Box */}
            {showImportBox && (
              <div className="p-3 bg-slate-950 rounded-lg border border-indigo-500/30 space-y-2 animate-in fade-in">
                <div className="text-[11px] text-slate-300 font-medium">
                  Paste Configuration JSON:
                </div>
                <textarea
                  rows={4}
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder='{"name": "My Preset", "config": { "modelSize": "7B", "microBatchSize": 2, "learningRate": 0.0002, ... }}'
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded text-slate-200 font-mono text-xs focus:border-indigo-500"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowImportBox(false)}
                    className="px-2.5 py-1 text-slate-400 hover:text-slate-200 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImportJson}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium"
                  >
                    Parse &amp; Import
                  </button>
                </div>
              </div>
            )}

            {/* Preset List */}
            <div className="space-y-2.5 overflow-y-auto pr-1 flex-1">
              {presets.map((preset) => {
                const isActive = preset.id === activePresetId;

                return (
                  <div
                    key={preset.id}
                    className={`p-3.5 rounded-lg border text-left transition-all ${
                      isActive
                        ? 'bg-slate-800/90 border-indigo-500/60 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-200 text-xs font-mono">
                            {preset.name}
                          </span>
                          {preset.isDefault ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                              Factory Preset
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                              User Saved
                            </span>
                          )}
                          {isActive && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono flex items-center gap-1">
                              <Check className="w-3 h-3" /> Active
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-400 font-sans">
                          {preset.description}
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!isActive && (
                          <button
                            onClick={() => {
                              handleSelectPreset(preset.id);
                              setIsManageModalOpen(false);
                            }}
                            className="px-2.5 py-1 text-xs font-medium rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                          >
                            Load
                          </button>
                        )}

                        {!preset.isDefault && (
                          <button
                            onClick={() => handleDeletePreset(preset.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors"
                            title="Delete custom preset"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Parameter Summary Badges */}
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono text-slate-300">
                      <div>
                        <span className="text-slate-500">Model:</span> {preset.config.modelSize} ({preset.config.method.split('-')[0].toUpperCase()})
                      </div>
                      <div>
                        <span className="text-slate-500">Batch:</span> {preset.config.microBatchSize} × {preset.config.gradientAccumulation} = {preset.config.microBatchSize * preset.config.gradientAccumulation}
                      </div>
                      <div>
                        <span className="text-slate-500">LR:</span> {preset.config.learningRate}
                      </div>
                      <div className="truncate">
                        <span className="text-slate-500">Optim:</span> {preset.config.optimizer}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
