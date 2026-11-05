import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  Zap,
  Cpu,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  Sliders,
  FileCode,
  AlertCircle,
  RefreshCw,
  CornerDownLeft,
  User,
  ShieldAlert,
  Info,
} from 'lucide-react';
import type { PresetRepository } from '../types/agent';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  model?: string;
  isError?: boolean;
}

export type GeminiModelChoice = 'gemini-3.8-flash' | 'gemini-3.1-flash-lite' | 'gemini-4-argon';

export interface ChatRolePreset {
  id: string;
  name: string;
  description: string;
  model: GeminiModelChoice;
  systemInstruction: string;
}

export const CHAT_ROLES: ChatRolePreset[] = [
  {
    id: 'code-reasoner',
    name: 'Autonomous Code Reasoner',
    description: 'Deep AST invariants, Rust borrow checker, C memory safety, concurrency',
    model: 'gemini-3.8-flash',
    systemInstruction:
      'You are the Qwen Autonomous Code Reasoner. You specialize in deep static analysis, invariant deduction, memory safety (Rust borrow checker E0502, C pointer safety, CWE-120), and concurrency hazards (AB-BA deadlocks, race conditions). Always explain the root cause and provide complete, verified code patches.',
  },
  {
    id: 'training-architect',
    name: 'Hyperparameter & Training Architect',
    description: 'QLoRA, LoRA, GRPO rollouts, DPO alignment, VRAM estimation',
    model: 'gemini-3.8-flash',
    systemInstruction:
      'You are the AI Training & Hyperparameter Specialist. You specialize in Qwen-2.5-Coder and Qwen-QwQ fine-tuning, Group Relative Policy Optimization (GRPO), Direct Preference Optimization (DPO), 8-bit AdamW optimizer memory savings, and VRAM budget planning.',
  },
  {
    id: 'fast-explainer',
    name: 'Rapid Code Explainer',
    description: 'Fast answers, syntax questions, concise API lookups',
    model: 'gemini-3.1-flash-lite',
    systemInstruction:
      'You are a high-speed code assistant. Provide direct, concise, and accurate explanations for programming questions with zero fluff.',
  },
  {
    id: 'deep-architect',
    name: 'Complex Reasoning & STEM Architect',
    description: 'Formal proofs, complex algorithmic modeling, advanced architecture',
    model: 'gemini-4-argon',
    systemInstruction:
      'You are the Deep Reasoning Architect utilizing gemini-4-argon for particularly complex engineering, mathematical logic, distributed systems architectures, and formal invariant proofs.',
  },
];

interface GeminiChatbotProps {
  currentRepo?: PresetRepository;
  activeFilePath?: string;
}

export const GeminiChatbot: React.FC<GeminiChatbotProps> = ({
  currentRepo,
  activeFilePath,
}) => {
  const [selectedRole, setSelectedRole] = useState<ChatRolePreset>(CHAT_ROLES[0]);
  const [selectedModel, setSelectedModel] = useState<GeminiModelChoice>('gemini-3.8-flash');
  const [customSystemInstruction, setCustomSystemInstruction] = useState<string>(
    CHAT_ROLES[0].systemInstruction
  );
  const [isEditingInstruction, setIsEditingInstruction] = useState<boolean>(false);
  const [attachCodeContext, setAttachCodeContext] = useState<boolean>(true);

  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'model',
      text: `Hello! I am your Gemini reasoning assistant. I'm configured with the **${CHAT_ROLES[0].name}** role using \`gemini-3.8-flash\`.

You can ask me about:
- **Code reasoning & bug auditing** across Python, Rust, Java, C, and C++
- **Memory invariants & lifetime bounds** in your active repository
- **Training hyperparameters & VRAM optimization** (QLoRA, GRPO, DPO)

How can I help you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      model: 'gemini-3.8-flash',
    },
  ]);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // When role changes, update default model & instruction
  const handleRoleChange = (role: ChatRolePreset) => {
    setSelectedRole(role);
    setSelectedModel(role.model);
    setCustomSystemInstruction(role.systemInstruction);
  };

  // Get active file content if context attachment is enabled
  const getContextPayload = () => {
    if (!attachCodeContext || !currentRepo) return '';
    const file = currentRepo.files.find((f) => f.path === activeFilePath) || currentRepo.files[0];
    if (!file) return '';
    return `\n\n[Active Project Context: ${currentRepo.name} (${currentRepo.primaryLanguage}) | File: ${file.path}]\n\`\`\`${file.language}\n${file.content.slice(0, 1800)}\n\`\`\``;
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Build conversation payload for the server
      const contextAddition = getContextPayload();
      const payloadMessages = newMessages.map((m, idx) => {
        // Attach repository context to the latest user message
        if (idx === newMessages.length - 1 && contextAddition) {
          return { role: m.role, text: `${m.text}${contextAddition}` };
        }
        return { role: m.role, text: m.text };
      });

      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: payloadMessages,
          systemInstruction: customSystemInstruction,
          model: selectedModel,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      const assistantMsg: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: data.reply || 'No response generated.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: data.model || selectedModel,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        text: `Unable to complete request: ${err.message}. Please verify connectivity or check your API key in Settings > Secrets.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: selectedModel,
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `init-${Date.now()}`,
        role: 'model',
        text: `Conversation cleared. Ready for a new topic with role **${selectedRole.name}**!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: selectedModel,
      },
    ]);
  };

  const starterPrompts = [
    'Analyze the active file for memory & concurrency hazards',
    'How do I calculate VRAM for QLoRA vs 16-bit LoRA?',
    'Explain the Rust E0502 borrow checker invariant',
    'What are the advantages of GRPO over standard PPO?',
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden font-sans">
      {/* Chat Header & Role Configuration Bar */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur shrink-0 space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 border border-indigo-500/30 text-indigo-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">Gemini Reasoning Assistant</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-500/30">
                  Multi-Turn
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Context-grounded assistant for code verification, AST reasoning, and training ops
              </p>
            </div>
          </div>

          {/* Model & Role Controls */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Role Preset Selector */}
            <div className="relative">
              <select
                value={selectedRole.id}
                onChange={(e) => {
                  const r = CHAT_ROLES.find((role) => role.id === e.target.value);
                  if (r) handleRoleChange(r);
                }}
                className="appearance-none pl-3 pr-8 py-1.5 text-xs font-medium rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-600 focus:outline-none cursor-pointer"
              >
                {CHAT_ROLES.map((r) => (
                  <option key={r.id} value={r.id}>
                    Role: {r.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Model Tier Selector (gemini-4-argon, gemini-3.8-flash, gemini-3.1-flash-lite) */}
            <div className="relative">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value as GeminiModelChoice)}
                className="appearance-none pl-3 pr-8 py-1.5 text-xs font-mono font-medium rounded-lg bg-slate-800 text-cyan-300 border border-slate-700 hover:border-slate-600 focus:outline-none cursor-pointer"
              >
                <option value="gemini-3.8-flash">gemini-3.8-flash (General Tasks)</option>
                <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Fast Tasks)</option>
                <option value="gemini-4-argon">gemini-4-argon (Complex STEM & Reasoning)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Toggle System Instruction Editor */}
            <button
              onClick={() => setIsEditingInstruction(!isEditingInstruction)}
              className={`p-1.5 rounded-lg border text-xs transition-colors ${
                isEditingInstruction
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              title="Edit system instruction role prompt"
            >
              <Sliders className="w-4 h-4" />
            </button>

            {/* Clear History */}
            <button
              onClick={handleClearHistory}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors"
              title="Clear conversation history"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Collapsible System Instruction Editor */}
        {isEditingInstruction && (
          <div className="p-3 rounded-xl bg-slate-950 border border-indigo-500/40 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-indigo-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                <span>Active System Instruction (Role Prompt)</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Model: {selectedModel}
              </span>
            </div>
            <textarea
              value={customSystemInstruction}
              onChange={(e) => setCustomSystemInstruction(e.target.value)}
              rows={3}
              className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 font-mono leading-relaxed focus:outline-none focus:border-indigo-500 resize-none"
              placeholder="Provide custom role and behavioral instructions for Gemini..."
            />
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Governs multi-turn persona, reasoning depth, and response format.</span>
              <button
                onClick={() => setCustomSystemInstruction(selectedRole.systemInstruction)}
                className="text-indigo-400 hover:underline"
              >
                Reset to Role Default
              </button>
            </div>
          </div>
        )}

        {/* Context Attachment Bar */}
        {currentRepo && (
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
            <label className="flex items-center gap-2 cursor-pointer select-none hover:text-slate-200">
              <input
                type="checkbox"
                checked={attachCodeContext}
                onChange={(e) => setAttachCodeContext(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0 focus:ring-offset-0"
              />
              <span className="flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                <span>
                  Ground conversation with active repository: <strong>{currentRepo.name}</strong> ({activeFilePath || currentRepo.files[0]?.path})
                </span>
              </span>
            </label>

            <span className="font-mono text-[10px] text-slate-500">
              {messages.length} messages in thread
            </span>
          </div>
        )}
      </div>

      {/* Scrollable Message Thread */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';

          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-4xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
            >
              {/* Avatar Icon */}
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-semibold ${
                  isUser
                    ? 'bg-indigo-600 text-white'
                    : msg.isError
                    ? 'bg-rose-950 text-rose-400 border border-rose-500/40'
                    : 'bg-slate-800 text-indigo-400 border border-slate-700'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble Container */}
              <div className="flex flex-col space-y-1 max-w-[85%] sm:max-w-[78%]">
                <div className="flex items-center gap-2 px-1 text-[10px] text-slate-500 font-mono">
                  <span>{isUser ? 'You' : 'Gemini'}</span>
                  <span>·</span>
                  <span>{msg.timestamp}</span>
                  {!isUser && msg.model && (
                    <>
                      <span>·</span>
                      <span className="text-cyan-400">{msg.model}</span>
                    </>
                  )}
                </div>

                <div
                  className={`p-4 rounded-2xl text-xs leading-relaxed group relative shadow-md ${
                    isUser
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : msg.isError
                      ? 'bg-rose-950/40 border border-rose-500/40 text-rose-200 rounded-tl-none'
                      : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                  }`}
                >
                  {/* Copy Button */}
                  <button
                    onClick={() => handleCopy(msg.id, msg.text)}
                    className="absolute top-2 right-2 p-1.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Copy response"
                  >
                    {copiedId === msg.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Message Content with basic Markdown formatting */}
                  <div className="whitespace-pre-wrap font-sans space-y-2">
                    {formatMessageContent(msg.text)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-3 max-w-2xl mr-auto">
            <div className="w-8 h-8 rounded-lg bg-slate-800 text-indigo-400 border border-slate-700 flex items-center justify-center shrink-0">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
            </div>
            <div className="p-3.5 rounded-2xl rounded-tl-none bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
              <span>Thinking with {selectedModel}...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Starter Chips */}
      {messages.length <= 2 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {starterPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(prompt)}
              className="text-[11px] px-3 py-1 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input Composer Box */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/90 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative flex items-center gap-2"
        >
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={`Ask Gemini (${selectedRole.name})... [Shift+Enter for newline]`}
            rows={2}
            disabled={isLoading}
            className="w-full p-3 pr-14 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={isLoading || !inputMessage.trim()}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white disabled:text-slate-500 shadow-md transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 px-1">
          <span>Role: {selectedRole.name} · Model: {selectedModel}</span>
          <span>Powered by Gemini API</span>
        </div>
      </div>
    </div>
  );
};

// Helper to render text with bold and code block highlighting
function formatMessageContent(raw: string) {
  const parts = raw.split(/(```[\s\S]*?```)/g);

  return parts.map((part, index) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const firstLineEnd = part.indexOf('\n');
      const lang = firstLineEnd !== -1 ? part.slice(3, firstLineEnd).trim() : '';
      const code = firstLineEnd !== -1 ? part.slice(firstLineEnd + 1, -3) : part.slice(3, -3);

      return (
        <div key={index} className="my-2 rounded-xl border border-slate-800 bg-slate-950 overflow-hidden font-mono text-[11px]">
          {lang && (
            <div className="px-3 py-1 bg-slate-900 border-b border-slate-800 text-slate-400 uppercase text-[9px] font-bold">
              {lang}
            </div>
          )}
          <div className="p-3 overflow-x-auto text-slate-200 leading-relaxed whitespace-pre">
            {code}
          </div>
        </div>
      );
    }

    return (
      <span key={index} className="whitespace-pre-wrap">
        {part}
      </span>
    );
  });
}
