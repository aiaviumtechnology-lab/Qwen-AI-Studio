import React, { useState } from 'react';
import { AgentConfig, AgentTool, SupportedLanguage, ReasoningDepth } from '../types/agent';
import { AVAILABLE_TOOLS, DEFAULT_AGENTS } from '../data/defaultAgents';
import {
  ShieldAlert,
  Cpu,
  Terminal,
  Layers,
  Sparkles,
  Check,
  Plus,
  Sliders,
  Code2,
  Wrench,
  HelpCircle,
} from 'lucide-react';

interface AgentStudioProps {
  currentAgent: AgentConfig;
  onSelectAgent: (agent: AgentConfig) => void;
  onUpdateAgent: (agent: AgentConfig) => void;
  onRunAudit: () => void;
  isAuditing: boolean;
}

const ALL_LANGUAGES: { id: SupportedLanguage; label: string }[] = [
  { id: 'python', label: 'Python' },
  { id: 'rust', label: 'Rust' },
  { id: 'java', label: 'Java' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'c', label: 'C' },
  { id: 'cpp', label: 'C++' },
];

export const AgentStudio: React.FC<AgentStudioProps> = ({
  currentAgent,
  onSelectAgent,
  onUpdateAgent,
  onRunAudit,
  isAuditing,
}) => {
  const [agentsList, setAgentsList] = useState<AgentConfig[]>(DEFAULT_AGENTS);
  const [isEditingCustom, setIsEditingCustom] = useState(false);

  const handleToolToggle = (toolId: string) => {
    const tools = currentAgent.tools.includes(toolId)
      ? currentAgent.tools.filter((t) => t !== toolId)
      : [...currentAgent.tools, toolId];
    onUpdateAgent({ ...currentAgent, tools });
  };

  const handleDepthChange = (depth: ReasoningDepth) => {
    onUpdateAgent({ ...currentAgent, reasoningDepth: depth });
  };

  const handleLanguageToggle = (lang: SupportedLanguage) => {
    const langs = currentAgent.focusLanguages.includes(lang)
      ? currentAgent.focusLanguages.filter((l) => l !== lang)
      : [...currentAgent.focusLanguages, lang];
    onUpdateAgent({ ...currentAgent, focusLanguages: langs });
  };

  const handleCreateNewAgent = () => {
    const newAgent: AgentConfig = {
      id: `custom-agent-${Date.now()}`,
      name: 'Custom Polyglot Reasoning Agent',
      role: 'Autonomous Defect Analyst',
      persona: 'Custom specialized agent with user-defined reasoning invariants',
      reasoningDepth: 'deep',
      temperature: 0.2,
      tools: ['tool-ast-walk', 'tool-patch-synthesizer'],
      systemInstruction: `You are a custom autonomous Qwen code reasoning agent.\nExamine code across Python, Rust, Java, JavaScript, C, and C++ for subtle architectural and safety defects.\nOutput your rigorous chain of thought inside <think>...</think> tags.`,
      focusLanguages: ['python', 'rust', 'c', 'cpp'],
      isCustom: true,
    };
    setAgentsList([...agentsList, newAgent]);
    onSelectAgent(newAgent);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Overview kicker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">
            Autonomous Agent Builder & Orchestrator
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure specialized Qwen reasoning agents with custom thinking depth, tool plugins, and multi-language heuristics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCreateNewAgent}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Custom Agent</span>
          </button>
          <button
            onClick={onRunAudit}
            disabled={isAuditing}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 rounded-lg transition-colors shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Audit Active Codebase</span>
          </button>
        </div>
      </div>

      {/* Agent Selector Grid */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
          <span>Preset & Custom Qwen Agents</span>
          <span className="text-slate-500 font-mono text-[11px]">
            Active: {currentAgent.name}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {agentsList.map((agent) => {
            const isSelected = agent.id === currentAgent.id;
            return (
              <div
                key={agent.id}
                onClick={() => onSelectAgent(agent)}
                className={`cursor-pointer p-4 rounded-xl border transition-all text-left flex flex-col justify-between ${
                  isSelected
                    ? 'bg-indigo-950/30 border-indigo-500/60 shadow-lg shadow-indigo-950/50'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-slate-800 text-indigo-400 border border-slate-700">
                      {agent.id.includes('memory') ? (
                        <ShieldAlert className="w-4 h-4" />
                      ) : agent.id.includes('concurrency') ? (
                        <Cpu className="w-4 h-4" />
                      ) : agent.id.includes('syntax') ? (
                        <Terminal className="w-4 h-4" />
                      ) : (
                        <Layers className="w-4 h-4" />
                      )}
                    </div>
                    {isSelected && (
                      <span className="text-[11px] font-mono text-indigo-400 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Active
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-semibold text-slate-100 line-clamp-1">
                    {agent.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {agent.persona}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Depth: {agent.reasoningDepth}</span>
                  <span>{agent.tools.length} Tools</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Agent Configuration Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Prompt & Persona Settings */}
        <div className="lg:col-span-2 space-y-5 bg-slate-900/40 p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-semibold text-slate-100">
                Agent Specification: {currentAgent.name}
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Model Base: Qwen-2.5-Coder / QwQ CoT
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Agent Name
              </label>
              <input
                type="text"
                value={currentAgent.name}
                onChange={(e) =>
                  onUpdateAgent({ ...currentAgent, name: e.target.value })
                }
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Specialized Role
              </label>
              <input
                type="text"
                value={currentAgent.role}
                onChange={(e) =>
                  onUpdateAgent({ ...currentAgent, role: e.target.value })
                }
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Agent Persona & Invariant Mandate
            </label>
            <input
              type="text"
              value={currentAgent.persona}
              onChange={(e) =>
                onUpdateAgent({ ...currentAgent, persona: e.target.value })
              }
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-300">
                System Prompt & Reasoning Rules
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {currentAgent.systemInstruction.length} chars
              </span>
            </div>
            <textarea
              rows={8}
              value={currentAgent.systemInstruction}
              onChange={(e) =>
                onUpdateAgent({
                  ...currentAgent,
                  systemInstruction: e.target.value,
                })
              }
              className="w-full p-3 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed"
            />
          </div>

          {/* Languages in Scope */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Focus Languages & Compiler Standard
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_LANGUAGES.map((lang) => {
                const isChecked = currentAgent.focusLanguages.includes(lang.id);
                return (
                  <button
                    key={lang.id}
                    onClick={() => handleLanguageToggle(lang.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
                      isChecked
                        ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>{lang.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Col: Reasoning Depth & Tool Plugins */}
        <div className="space-y-6">
          {/* Reasoning Depth */}
          <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-slate-100">
                Reasoning Depth (Chain of Thought)
              </h3>
            </div>

            <div className="space-y-2.5">
              {(['standard', 'deep', 'exhaustive'] as ReasoningDepth[]).map(
                (depth) => (
                  <div
                    key={depth}
                    onClick={() => handleDepthChange(depth)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      currentAgent.reasoningDepth === depth
                        ? 'bg-indigo-950/40 border-indigo-500 text-slate-100'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold capitalize font-mono">
                        {depth}
                      </span>
                      {currentAgent.reasoningDepth === depth && (
                        <Check className="w-3.5 h-3.5 text-indigo-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {depth === 'standard'
                        ? 'Fast syntax & basic control flow heuristics'
                        : depth === 'deep'
                        ? 'Rigorous ownership, borrow checks & concurrency invariant traces'
                        : 'Exhaustive formal counter-example search & multi-step theorem proof'}
                    </p>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Tool Plugins */}
          <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <Wrench className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-slate-100">
                Agent Tool Capabilities
              </h3>
            </div>

            <div className="space-y-2">
              {AVAILABLE_TOOLS.map((tool) => {
                const isEnabled = currentAgent.tools.includes(tool.id);
                return (
                  <div
                    key={tool.id}
                    onClick={() => handleToolToggle(tool.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                      isEnabled
                        ? 'bg-indigo-950/30 border-indigo-500/40 text-slate-100'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 mt-0.5 rounded flex items-center justify-center shrink-0 border ${
                        isEnabled
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'border-slate-700 bg-slate-900'
                      }`}
                    >
                      {isEnabled && <Check className="w-3 h-3" />}
                    </div>
                    <div>
                      <div className="text-xs font-medium text-slate-200">
                        {tool.name}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        {tool.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
