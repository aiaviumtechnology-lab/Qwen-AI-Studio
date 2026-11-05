import type { Pool as PgPoolType, PoolConfig } from 'pg';
import type { QwenModelSize, FineTuningMethod, TrainingConfig } from '../types/agent';

// ----------------------------------------------------
// Data Model Interfaces for PostgreSQL Service Layer
// ----------------------------------------------------

export interface TrainingExperimentRecord {
  id: string;
  name: string;
  modelSize: QwenModelSize;
  method: FineTuningMethod | string;
  config: Partial<TrainingConfig> & {
    microBatchSize?: number;
    gradientAccumulation?: number;
    learningRate?: number;
    loraRank?: number;
    loraAlpha?: number;
    epochs?: number;
    optimizer?: string;
    warmupRatio?: number;
    use8bitOptimizer?: boolean;
    flashAttention2?: boolean;
  };
  datasetId?: string;
  datasetSampleSize?: number;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'paused';
  metrics?: {
    lossHistory?: { step: number; loss: number; valLoss?: number; gradNorm?: number; learningRate?: number }[];
    finalLoss?: number;
    evalAccuracy?: number;
    tokensProcessed?: number;
    peakVramGb?: number;
    epochProgress?: number;
  };
  error?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AuditLogRecord {
  id: string;
  experimentId?: string;
  target: string;
  eventType: 
    | 'CODE_AUDIT_SESSION'
    | 'EXPERIMENT_CREATED'
    | 'EXPERIMENT_STARTED'
    | 'EXPERIMENT_COMPLETED'
    | 'EXPERIMENT_FAILED'
    | 'EXPERIMENT_PAUSED'
    | 'HYPERPARAMETER_UPDATED'
    | 'DATASET_VALIDATED'
    | 'MODEL_CHECKPOINT_SAVED'
    | 'SYSTEM_EVENT';
  severity: AuditSeverity;
  details: Record<string, any>;
  timestamp: string;
  actor?: string;
}

export interface ExperimentFilter {
  status?: string;
  modelSize?: string;
  method?: string;
  limit?: number;
  offset?: number;
}

export interface AuditLogFilter {
  experimentId?: string;
  eventType?: string;
  severity?: AuditSeverity;
  limit?: number;
  offset?: number;
}

export interface DatabaseStatus {
  connected: boolean;
  provider: 'postgresql' | 'memory-store';
  host?: string;
  database?: string;
  totalExperiments: number;
  totalLogs: number;
}

// ----------------------------------------------------
// In-Memory Fallback Seed State
// ----------------------------------------------------

const INITIAL_EXPERIMENTS: TrainingExperimentRecord[] = [
  {
    id: 'exp_qwen_7b_grpo_001',
    name: 'Qwen-2.5-Coder-7B GRPO Reasoning Baseline',
    modelSize: '7B',
    method: 'qlora-4bit',
    config: {
      modelSize: '7B',
      method: 'qlora-4bit',
      contextLength: 4096,
      microBatchSize: 2,
      gradientAccumulation: 8,
      learningRate: 0.00005,
      loraRank: 32,
      loraAlpha: 64,
      epochs: 3,
      warmupRatio: 0.05,
      optimizer: 'paged_adamw_8bit',
      gradientCheckpointing: true,
      flashAttention2: true,
    },
    datasetId: 'dataset_reasoning_cot_master_v1',
    datasetSampleSize: 1420,
    status: 'completed',
    metrics: {
      lossHistory: [
        { step: 50, loss: 2.14, valLoss: 2.22, gradNorm: 1.45, learningRate: 0.00002 },
        { step: 100, loss: 1.76, valLoss: 1.84, gradNorm: 1.12, learningRate: 0.000045 },
        { step: 200, loss: 1.28, valLoss: 1.35, gradNorm: 0.88, learningRate: 0.000035 },
        { step: 350, loss: 0.89, valLoss: 0.94, gradNorm: 0.62, learningRate: 0.000015 },
        { step: 500, loss: 0.64, valLoss: 0.71, gradNorm: 0.44, learningRate: 0.000002 },
      ],
      finalLoss: 0.64,
      evalAccuracy: 92.4,
      tokensProcessed: 5820000,
      peakVramGb: 14.8,
      epochProgress: 3,
    },
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    completedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'exp_qwen_1_5b_dpo_002',
    name: 'Qwen-1.5B DPO Safety Alignment',
    modelSize: '1.5B',
    method: 'lora-16bit',
    config: {
      modelSize: '1.5B',
      method: 'lora-16bit',
      contextLength: 2048,
      microBatchSize: 4,
      gradientAccumulation: 4,
      learningRate: 0.0001,
      loraRank: 16,
      loraAlpha: 32,
      epochs: 2,
      warmupRatio: 0.1,
      optimizer: 'adamw_torch_fused',
      gradientCheckpointing: false,
      flashAttention2: true,
    },
    datasetId: 'dataset_dpo_pairwise_audit',
    datasetSampleSize: 850,
    status: 'running',
    metrics: {
      lossHistory: [
        { step: 25, loss: 1.95, valLoss: 2.01, gradNorm: 1.8, learningRate: 0.00005 },
        { step: 75, loss: 1.42, valLoss: 1.50, gradNorm: 1.05, learningRate: 0.00009 },
        { step: 150, loss: 1.08, valLoss: 1.15, gradNorm: 0.78, learningRate: 0.00007 },
      ],
      finalLoss: 1.08,
      evalAccuracy: 88.6,
      tokensProcessed: 1740000,
      peakVramGb: 6.2,
      epochProgress: 1.2,
    },
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 600000).toISOString(),
  },
];

const INITIAL_AUDIT_LOGS: AuditLogRecord[] = [
  {
    id: 'audit_sess_001',
    target: 'src/main.rs (rust-channel-queue)',
    eventType: 'CODE_AUDIT_SESSION',
    severity: 'critical',
    details: {
      summary: 'Autonomous agent detected RefCell dynamic borrow panic (E0502) and potential AB-BA deadlock in worker pool threads. Formulated deterministic scope-limiting patch.',
      totalIssues: 2,
      criticalIssues: 2,
      warningIssues: 0,
      infoIssues: 0,
      language: 'rust',
      repoName: 'rust-channel-queue',
      agentName: 'Qwen Rust Safety Auditor',
      reasoningDepth: 'exhaustive',
      issues: [
        {
          id: 'RS-001',
          severity: 'critical',
          title: 'RefCell Dynamic Borrow Panic (E0502)',
          line: 33,
          ruleBroken: 'Rust Aliasing XOR Mutability Invariant',
          file: 'src/main.rs',
          rootCause: 'Scope of borrow() overlaps with borrow_mut() in the worker loop before dropping the first reference.',
          suggestedFix: 'Limit scope of immutable borrow using explicit block or drop() before calling borrow_mut().',
        },
        {
          id: 'RS-002',
          severity: 'critical',
          title: 'Inverted Lock Acquisition Order Deadlock (AB-BA)',
          line: 58,
          ruleBroken: 'Strict Lock Ordering Hierarchy',
          file: 'src/main.rs',
          rootCause: 'Thread 1 locks lock_a then lock_b, whereas Thread 2 locks lock_b then lock_a.',
          suggestedFix: 'Standardize lock acquisition sequence across all worker threads.',
        },
      ],
      patchedFilesCount: 1,
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(), // 18 mins ago
    actor: 'Qwen Rust Safety Auditor',
  },
  {
    id: 'audit_sess_002',
    target: 'src/scanner.c (c-buffer-scanner)',
    eventType: 'CODE_AUDIT_SESSION',
    severity: 'critical',
    details: {
      summary: 'Buffer overflow detected in strcpy invocation lacking bound enforcement (CWE-120). Replaced with bounded strncpy and explicit null termination.',
      totalIssues: 1,
      criticalIssues: 1,
      warningIssues: 0,
      infoIssues: 0,
      language: 'c',
      repoName: 'c-buffer-scanner',
      agentName: 'Qwen C/C++ Memory Auditor',
      reasoningDepth: 'deep',
      issues: [
        {
          id: 'C-001',
          severity: 'critical',
          title: 'Buffer Overflow via unbounded strcpy (CWE-120)',
          line: 24,
          ruleBroken: 'Memory Safety & Bounds Invariant',
          file: 'src/scanner.c',
          rootCause: 'Direct copy of untrusted input string exceeding buffer allocation capacity.',
          suggestedFix: 'Replace with strncpy or snprintf specifying sizeof(dest) - 1 with null termination.',
        },
      ],
      patchedFilesCount: 1,
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
    actor: 'Qwen C/C++ Memory Auditor',
  },
  {
    id: 'audit_sess_003',
    target: 'pipeline.py (python-async-worker)',
    eventType: 'CODE_AUDIT_SESSION',
    severity: 'warning',
    details: {
      summary: 'Mutable default argument hazard in worker dispatch loop (W0102). Parameter accumulates mutations across calls; initialized with None sentinel.',
      totalIssues: 2,
      criticalIssues: 0,
      warningIssues: 2,
      infoIssues: 0,
      language: 'python',
      repoName: 'python-async-worker',
      agentName: 'Qwen Python Invariant Auditor',
      reasoningDepth: 'standard',
      issues: [
        {
          id: 'PY-001',
          severity: 'warning',
          title: 'Mutable Default Argument Hazard (W0102)',
          line: 8,
          ruleBroken: 'Idempotency and Parameter Isolation Invariant',
          file: 'pipeline.py',
          rootCause: 'Python function default parameter binding lifecycle binds default list at definition time.',
          suggestedFix: 'Use None as default parameter value and initialize param = [] if None.',
        },
        {
          id: 'PY-002',
          severity: 'warning',
          title: 'Blocking synchronous requests.get() in asyncio event loop',
          line: 19,
          ruleBroken: 'Non-blocking I/O Concurrency Contract',
          file: 'pipeline.py',
          rootCause: 'Synchronous socket read blocks the single-threaded asyncio reactor loop.',
          suggestedFix: 'Migrate to aiohttp.ClientSession or httpx.AsyncClient.',
        },
      ],
      patchedFilesCount: 1,
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
    actor: 'Qwen Python Invariant Auditor',
  },
  {
    id: 'audit_sess_004',
    target: 'src/main/Vault.java (java-concurrency-vault)',
    eventType: 'CODE_AUDIT_SESSION',
    severity: 'warning',
    details: {
      summary: 'Heavy synchronized block contention on hot path and unclosed AutoCloseable resource leak. Optimized lock granularity with ReentrantReadWriteLock.',
      totalIssues: 2,
      criticalIssues: 0,
      warningIssues: 1,
      infoIssues: 1,
      language: 'java',
      repoName: 'java-concurrency-vault',
      agentName: 'Qwen Java Enterprise Auditor',
      reasoningDepth: 'deep',
      issues: [
        {
          id: 'JV-001',
          severity: 'warning',
          title: 'Coarse-Grained Synchronized Contention',
          line: 42,
          ruleBroken: 'Concurrency Granularity Guidelines',
          file: 'src/main/Vault.java',
          rootCause: 'Monolithic class monitor lock restricts read scalability across threads.',
          suggestedFix: 'Partition read and write paths using ReentrantReadWriteLock.',
        },
        {
          id: 'JV-002',
          severity: 'info',
          title: 'Potential Unclosed AutoCloseable Resource',
          line: 67,
          ruleBroken: 'Resource Management Standard',
          file: 'src/main/Vault.java',
          rootCause: 'Stream instance not wrapped in try-with-resources block.',
          suggestedFix: 'Enclose file stream in try (var stream = Files.lines(...)) structure.',
        },
      ],
      patchedFilesCount: 1,
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(), // 4 hours ago
    actor: 'Qwen Java Enterprise Auditor',
  },
  {
    id: 'audit_sess_005',
    target: 'engine.cpp (cpp-lifetime-manager)',
    eventType: 'CODE_AUDIT_SESSION',
    severity: 'critical',
    details: {
      summary: 'Use-after-free hazard triggered by raw pointer escape preceding std::unique_ptr reset (CWE-416). Restructured ownership hierarchy.',
      totalIssues: 1,
      criticalIssues: 1,
      warningIssues: 0,
      infoIssues: 0,
      language: 'cpp',
      repoName: 'cpp-lifetime-manager',
      agentName: 'Qwen C/C++ Memory Auditor',
      reasoningDepth: 'exhaustive',
      issues: [
        {
          id: 'CPP-001',
          severity: 'critical',
          title: 'Raw Pointer Use-After-Free following unique_ptr reset (CWE-416)',
          line: 52,
          ruleBroken: 'Smart Pointer Lifetime & Ownership Protocol',
          file: 'engine.cpp',
          rootCause: 'Cached raw pointer dereferenced after owner std::unique_ptr::reset() executed.',
          suggestedFix: 'Retain std::shared_ptr or access strictly through owner scope.',
        },
      ],
      patchedFilesCount: 1,
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString(), // 6 hours ago
    actor: 'Qwen C/C++ Memory Auditor',
  },
  {
    id: 'audit_sess_006',
    target: 'src/lib.rs (qwen-code-guard)',
    eventType: 'CODE_AUDIT_SESSION',
    severity: 'info',
    details: {
      summary: 'Clean static invariant audit across 6 repository modules. All lifetime bounds, memory constraints, and type boundaries fully verified.',
      totalIssues: 0,
      criticalIssues: 0,
      warningIssues: 0,
      infoIssues: 0,
      language: 'rust',
      repoName: 'qwen-code-guard',
      agentName: 'Qwen Rust Safety Auditor',
      reasoningDepth: 'standard',
      issues: [],
      patchedFilesCount: 0,
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 720).toISOString(), // 12 hours ago
    actor: 'Qwen Rust Safety Auditor',
  },
  {
    id: 'log_init_001',
    experimentId: 'exp_qwen_7b_grpo_001',
    target: 'TrainingExperiment:exp_qwen_7b_grpo_001',
    eventType: 'EXPERIMENT_CREATED',
    severity: 'info',
    details: { modelSize: '7B', method: 'qlora-4bit', optimizer: 'paged_adamw_8bit' },
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    actor: 'QwenOrchestrator',
  },
  {
    id: 'log_init_002',
    experimentId: 'exp_qwen_7b_grpo_001',
    target: 'TrainingRun:GRPO_Loop',
    eventType: 'EXPERIMENT_COMPLETED',
    severity: 'info',
    details: { finalLoss: 0.64, evalAccuracy: 92.4, tokensProcessed: 5820000 },
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    actor: 'QwenTrainer',
  },
  {
    id: 'log_init_003',
    experimentId: 'exp_qwen_1_5b_dpo_002',
    target: 'TrainingExperiment:exp_qwen_1_5b_dpo_002',
    eventType: 'EXPERIMENT_STARTED',
    severity: 'info',
    details: { modelSize: '1.5B', targetEpochs: 2, batchSize: 16 },
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    actor: 'QwenOrchestrator',
  },
];

// ----------------------------------------------------
// Global Pool Cache for Hot-Reload Safety
// ----------------------------------------------------
declare global {
  // eslint-disable-next-line no-var
  var _postgresPool: PgPoolType | undefined;
  // eslint-disable-next-line no-var
  var _inMemoryExperiments: Map<string, TrainingExperimentRecord> | undefined;
  // eslint-disable-next-line no-var
  var _inMemoryAuditLogs: AuditLogRecord[] | undefined;
}

// ----------------------------------------------------
// PostgreSQL Service Layer Implementation
// ----------------------------------------------------

export class PostgresService {
  private schemaInitialized = false;

  constructor() {
    this.initFallbackStore();
  }

  private initFallbackStore() {
    if (!globalThis._inMemoryExperiments) {
      globalThis._inMemoryExperiments = new Map<string, TrainingExperimentRecord>();
      INITIAL_EXPERIMENTS.forEach((exp) => globalThis._inMemoryExperiments!.set(exp.id, { ...exp }));
    }
    if (!globalThis._inMemoryAuditLogs || globalThis._inMemoryAuditLogs.length < INITIAL_AUDIT_LOGS.length) {
      globalThis._inMemoryAuditLogs = [...INITIAL_AUDIT_LOGS];
    }
  }

  /**
   * Check if PostgreSQL environment variables are configured.
   */
  public isDatabaseConfigured(): boolean {
    const isNode = typeof process !== 'undefined' && process.env;
    if (!isNode) return false;
    return Boolean(process.env.SQL_HOST && process.env.SQL_USER && process.env.SQL_DB_NAME);
  }

  /**
   * Lazy Connection Pool creation using Object-style configuration
   * in strict compliance with Cloud SQL / PostgreSQL guidelines.
   */
  private async getPool(): Promise<PgPoolType | null> {
    if (typeof window !== 'undefined') {
      return null; // Browser environment
    }

    if (!this.isDatabaseConfigured()) {
      return null;
    }

    if (globalThis._postgresPool) {
      return globalThis._postgresPool;
    }

    try {
      // Dynamic import to avoid bundling 'pg' into client bundles
      const pgModule = await import('pg');
      const PoolConstructor = pgModule.default?.Pool || pgModule.Pool;

      const poolConfig: PoolConfig = {
        host: process.env.SQL_HOST,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DB_NAME,
        port: process.env.SQL_PORT ? parseInt(process.env.SQL_PORT, 10) : 5432,
        ssl: process.env.SQL_SSL === 'true' ? { rejectUnauthorized: false } : false,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      };

      globalThis._postgresPool = new PoolConstructor(poolConfig);

      // Handle idle client errors gracefully without crashing the process
      globalThis._postgresPool.on('error', (err: Error) => {
        console.error('Unexpected idle client error in PostgreSQL pool:', err.message);
      });

      return globalThis._postgresPool;
    } catch (err: any) {
      console.warn('PostgreSQL pool initialization skipped, falling back to resilient in-memory store:', err.message);
      return null;
    }
  }

  /**
   * Lazily initialize database schema if connected.
   */
  private async ensureSchema(pool: PgPoolType): Promise<void> {
    if (this.schemaInitialized) return;

    const createTablesQuery = `
      CREATE TABLE IF NOT EXISTS training_experiments (
        id VARCHAR(128) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        model_size VARCHAR(32) NOT NULL,
        method VARCHAR(64) NOT NULL,
        config JSONB NOT NULL DEFAULT '{}'::jsonb,
        dataset_id VARCHAR(128),
        dataset_sample_size INTEGER,
        status VARCHAR(32) NOT NULL DEFAULT 'queued',
        metrics JSONB DEFAULT '{}'::jsonb,
        error TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(128) PRIMARY KEY,
        experiment_id VARCHAR(128),
        target VARCHAR(255) NOT NULL,
        event_type VARCHAR(64) NOT NULL,
        severity VARCHAR(32) NOT NULL DEFAULT 'info',
        details JSONB NOT NULL DEFAULT '{}'::jsonb,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        actor VARCHAR(128) DEFAULT 'System'
      );

      CREATE INDEX IF NOT EXISTS idx_experiments_status ON training_experiments(status);
      CREATE INDEX IF NOT EXISTS idx_experiments_created ON training_experiments(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_experiment ON audit_logs(experiment_id);
      CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC);
    `;

    try {
      await pool.query(createTablesQuery);
      this.schemaInitialized = true;
    } catch (error: any) {
      console.error('Database schema initialization error:', error.message);
      // Let individual queries fallback safely
    }
  }

  // ----------------------------------------------------
  // Training Experiment Metadata Operations
  // ----------------------------------------------------

  public async saveExperiment(
    exp: Omit<TrainingExperimentRecord, 'createdAt' | 'updatedAt'> & {
      createdAt?: string;
      updatedAt?: string;
    }
  ): Promise<TrainingExperimentRecord> {
    const now = new Date().toISOString();
    const record: TrainingExperimentRecord = {
      ...exp,
      id: exp.id || `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: exp.createdAt || now,
      updatedAt: now,
    };

    const pool = await this.getPool();
    if (pool) {
      try {
        await this.ensureSchema(pool);
        const query = `
          INSERT INTO training_experiments (
            id, name, model_size, method, config, dataset_id,
            dataset_sample_size, status, metrics, error, created_at, updated_at, completed_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            model_size = EXCLUDED.model_size,
            method = EXCLUDED.method,
            config = EXCLUDED.config,
            dataset_id = EXCLUDED.dataset_id,
            dataset_sample_size = EXCLUDED.dataset_sample_size,
            status = EXCLUDED.status,
            metrics = EXCLUDED.metrics,
            error = EXCLUDED.error,
            updated_at = EXCLUDED.updated_at,
            completed_at = EXCLUDED.completed_at
          RETURNING *;
        `;

        const values = [
          record.id,
          record.name,
          record.modelSize,
          record.method,
          JSON.stringify(record.config || {}),
          record.datasetId || null,
          record.datasetSampleSize || null,
          record.status,
          JSON.stringify(record.metrics || {}),
          record.error || null,
          record.createdAt,
          record.updatedAt,
          record.completedAt || null,
        ];

        await pool.query(query, values);
      } catch (err: any) {
        console.error('PostgreSQL saveExperiment query failed, maintaining in memory store:', err.message);
      }
    }

    // Always keep memory store updated as primary cache / fallback
    globalThis._inMemoryExperiments!.set(record.id, record);

    // Record audit event
    await this.saveAuditLog({
      experimentId: record.id,
      target: `TrainingExperiment:${record.id}`,
      eventType: 'EXPERIMENT_CREATED',
      severity: 'info',
      details: {
        name: record.name,
        modelSize: record.modelSize,
        method: record.method,
        status: record.status,
      },
      actor: 'PostgresService',
    });

    return record;
  }

  public async getExperiment(id: string): Promise<TrainingExperimentRecord | null> {
    const pool = await this.getPool();
    if (pool) {
      try {
        await this.ensureSchema(pool);
        const result = await pool.query('SELECT * FROM training_experiments WHERE id = $1', [id]);
        if (result.rows.length > 0) {
          const row = result.rows[0];
          return this.mapExperimentRow(row);
        }
      } catch (err: any) {
        console.error('PostgreSQL getExperiment failed, querying fallback store:', err.message);
      }
    }

    return globalThis._inMemoryExperiments?.get(id) || null;
  }

  public async listExperiments(filter: ExperimentFilter = {}): Promise<TrainingExperimentRecord[]> {
    const pool = await this.getPool();
    if (pool) {
      try {
        await this.ensureSchema(pool);
        const conditions: string[] = [];
        const params: any[] = [];
        let paramIdx = 1;

        if (filter.status) {
          conditions.push(`status = $${paramIdx++}`);
          params.push(filter.status);
        }
        if (filter.modelSize) {
          conditions.push(`model_size = $${paramIdx++}`);
          params.push(filter.modelSize);
        }
        if (filter.method) {
          conditions.push(`method = $${paramIdx++}`);
          params.push(filter.method);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const limitClause = filter.limit ? `LIMIT ${filter.limit}` : 'LIMIT 100';
        const offsetClause = filter.offset ? `OFFSET ${filter.offset}` : '';

        const sql = `SELECT * FROM training_experiments ${whereClause} ORDER BY created_at DESC ${limitClause} ${offsetClause};`;
        const result = await pool.query(sql, params);

        if (result.rows.length > 0) {
          return result.rows.map((row) => this.mapExperimentRow(row));
        }
      } catch (err: any) {
        console.error('PostgreSQL listExperiments failed, using fallback store:', err.message);
      }
    }

    // In-memory filter fallback
    let list = Array.from(globalThis._inMemoryExperiments?.values() || []);
    if (filter.status) list = list.filter((e) => e.status === filter.status);
    if (filter.modelSize) list = list.filter((e) => e.modelSize === filter.modelSize);
    if (filter.method) list = list.filter((e) => e.method === filter.method);

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const start = filter.offset || 0;
    const end = start + (filter.limit || 100);
    return list.slice(start, end);
  }

  public async updateExperimentMetrics(
    id: string,
    metrics: TrainingExperimentRecord['metrics'],
    status?: TrainingExperimentRecord['status']
  ): Promise<TrainingExperimentRecord | null> {
    const existing = await this.getExperiment(id);
    if (!existing) return null;

    const updated: TrainingExperimentRecord = {
      ...existing,
      metrics: {
        ...existing.metrics,
        ...metrics,
      },
      status: status || existing.status,
      updatedAt: new Date().toISOString(),
      completedAt:
        status === 'completed'
          ? new Date().toISOString()
          : existing.completedAt,
    };

    const pool = await this.getPool();
    if (pool) {
      try {
        await this.ensureSchema(pool);
        const query = `
          UPDATE training_experiments
          SET metrics = $1, status = $2, updated_at = $3, completed_at = $4
          WHERE id = $5;
        `;
        await pool.query(query, [
          JSON.stringify(updated.metrics || {}),
          updated.status,
          updated.updatedAt,
          updated.completedAt || null,
          id,
        ]);
      } catch (err: any) {
        console.error('PostgreSQL updateExperimentMetrics failed:', err.message);
      }
    }

    globalThis._inMemoryExperiments!.set(id, updated);
    return updated;
  }

  public async deleteExperiment(id: string): Promise<boolean> {
    const pool = await this.getPool();
    if (pool) {
      try {
        await this.ensureSchema(pool);
        await pool.query('DELETE FROM training_experiments WHERE id = $1', [id]);
      } catch (err: any) {
        console.error('PostgreSQL deleteExperiment failed:', err.message);
      }
    }

    const had = globalThis._inMemoryExperiments?.delete(id) || false;
    await this.saveAuditLog({
      experimentId: id,
      target: `TrainingExperiment:${id}`,
      eventType: 'SYSTEM_EVENT',
      severity: 'warning',
      details: { action: 'EXPERIMENT_DELETED', id },
      actor: 'PostgresService',
    });
    return had;
  }

  // ----------------------------------------------------
  // Audit Log Management Operations
  // ----------------------------------------------------

  public async saveAuditLog(
    log: Omit<AuditLogRecord, 'id' | 'timestamp'> & { id?: string; timestamp?: string }
  ): Promise<AuditLogRecord> {
    const record: AuditLogRecord = {
      id: log.id || `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: log.timestamp || new Date().toISOString(),
      experimentId: log.experimentId,
      target: log.target,
      eventType: log.eventType,
      severity: log.severity,
      details: log.details || {},
      actor: log.actor || 'System',
    };

    const pool = await this.getPool();
    if (pool) {
      try {
        await this.ensureSchema(pool);
        const query = `
          INSERT INTO audit_logs (id, experiment_id, target, event_type, severity, details, timestamp, actor)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
        `;
        await pool.query(query, [
          record.id,
          record.experimentId || null,
          record.target,
          record.eventType,
          record.severity,
          JSON.stringify(record.details),
          record.timestamp,
          record.actor,
        ]);
      } catch (err: any) {
        console.error('PostgreSQL saveAuditLog query failed:', err.message);
      }
    }

    if (!globalThis._inMemoryAuditLogs) {
      globalThis._inMemoryAuditLogs = [];
    }
    globalThis._inMemoryAuditLogs.unshift(record);
    if (globalThis._inMemoryAuditLogs.length > 500) {
      globalThis._inMemoryAuditLogs.pop();
    }

    return record;
  }

  public async getAuditLogs(filter: AuditLogFilter = {}): Promise<AuditLogRecord[]> {
    const pool = await this.getPool();
    if (pool) {
      try {
        await this.ensureSchema(pool);
        const conditions: string[] = [];
        const params: any[] = [];
        let paramIdx = 1;

        if (filter.experimentId) {
          conditions.push(`experiment_id = $${paramIdx++}`);
          params.push(filter.experimentId);
        }
        if (filter.eventType) {
          conditions.push(`event_type = $${paramIdx++}`);
          params.push(filter.eventType);
        }
        if (filter.severity) {
          conditions.push(`severity = $${paramIdx++}`);
          params.push(filter.severity);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const limitClause = filter.limit ? `LIMIT ${filter.limit}` : 'LIMIT 100';
        const offsetClause = filter.offset ? `OFFSET ${filter.offset}` : '';

        const sql = `SELECT * FROM audit_logs ${whereClause} ORDER BY timestamp DESC ${limitClause} ${offsetClause};`;
        const result = await pool.query(sql, params);

        if (result.rows.length > 0) {
          return result.rows.map((row) => ({
            id: row.id,
            experimentId: row.experiment_id,
            target: row.target,
            eventType: row.event_type,
            severity: row.severity,
            details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details,
            timestamp: new Date(row.timestamp).toISOString(),
            actor: row.actor,
          }));
        }
      } catch (err: any) {
        console.error('PostgreSQL getAuditLogs query failed, using fallback:', err.message);
      }
    }

    let logs = [...(globalThis._inMemoryAuditLogs || [])];
    if (filter.experimentId) logs = logs.filter((l) => l.experimentId === filter.experimentId);
    if (filter.eventType) logs = logs.filter((l) => l.eventType === filter.eventType);
    if (filter.severity) logs = logs.filter((l) => l.severity === filter.severity);

    const start = filter.offset || 0;
    const end = start + (filter.limit || 100);
    return logs.slice(start, end);
  }

  public async getAuditLogsWithCount(
    filter: AuditLogFilter = {}
  ): Promise<{ logs: AuditLogRecord[]; total: number }> {
    const pool = await this.getPool();
    if (pool) {
      try {
        await this.ensureSchema(pool);
        const conditions: string[] = [];
        const params: any[] = [];
        let paramIdx = 1;

        if (filter.experimentId) {
          conditions.push(`experiment_id = $${paramIdx++}`);
          params.push(filter.experimentId);
        }
        if (filter.eventType) {
          conditions.push(`event_type = $${paramIdx++}`);
          params.push(filter.eventType);
        }
        if (filter.severity) {
          conditions.push(`severity = $${paramIdx++}`);
          params.push(filter.severity);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const countRes = await pool.query(
          `SELECT COUNT(*) as total FROM audit_logs ${whereClause};`,
          params
        );
        const total = parseInt(countRes.rows[0]?.total || '0', 10);

        const limitClause = filter.limit ? `LIMIT ${filter.limit}` : 'LIMIT 100';
        const offsetClause = filter.offset ? `OFFSET ${filter.offset}` : '';

        const sql = `SELECT * FROM audit_logs ${whereClause} ORDER BY timestamp DESC ${limitClause} ${offsetClause};`;
        const result = await pool.query(sql, params);

        const logs = result.rows.map((row) => ({
          id: row.id,
          experimentId: row.experiment_id,
          target: row.target,
          eventType: row.event_type,
          severity: row.severity,
          details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details,
          timestamp: new Date(row.timestamp).toISOString(),
          actor: row.actor,
        }));

        return { logs, total };
      } catch (err: any) {
        console.error('PostgreSQL getAuditLogsWithCount query failed, using fallback:', err.message);
      }
    }

    let all = [...(globalThis._inMemoryAuditLogs || [])];
    if (filter.experimentId) all = all.filter((l) => l.experimentId === filter.experimentId);
    if (filter.eventType) all = all.filter((l) => l.eventType === filter.eventType);
    if (filter.severity) all = all.filter((l) => l.severity === filter.severity);

    const total = all.length;
    const start = filter.offset || 0;
    const end = start + (filter.limit || 100);
    return { logs: all.slice(start, end), total };
  }

  public async clearAuditLogs(experimentId?: string): Promise<number> {
    let deletedCount = 0;
    const pool = await this.getPool();
    if (pool) {
      try {
        await this.ensureSchema(pool);
        const query = experimentId
          ? 'DELETE FROM audit_logs WHERE experiment_id = $1;'
          : 'DELETE FROM audit_logs;';
        const params = experimentId ? [experimentId] : [];
        const res = await pool.query(query, params);
        deletedCount = res.rowCount || 0;
      } catch (err: any) {
        console.error('PostgreSQL clearAuditLogs error:', err.message);
      }
    }

    if (globalThis._inMemoryAuditLogs) {
      if (experimentId) {
        const initialLen = globalThis._inMemoryAuditLogs.length;
        globalThis._inMemoryAuditLogs = globalThis._inMemoryAuditLogs.filter(
          (l) => l.experimentId !== experimentId
        );
        deletedCount = Math.max(deletedCount, initialLen - globalThis._inMemoryAuditLogs.length);
      } else {
        deletedCount = Math.max(deletedCount, globalThis._inMemoryAuditLogs.length);
        globalThis._inMemoryAuditLogs = [];
      }
    }

    return deletedCount;
  }

  // ----------------------------------------------------
  // Status & Telemetry Inspector
  // ----------------------------------------------------

  public async getDatabaseStatus(): Promise<DatabaseStatus> {
    const isConfigured = this.isDatabaseConfigured();
    const experiments = await this.listExperiments({ limit: 1 });
    const logs = await this.getAuditLogs({ limit: 1 });

    const totalExperiments = globalThis._inMemoryExperiments?.size || experiments.length;
    const totalLogs = globalThis._inMemoryAuditLogs?.length || logs.length;

    if (!isConfigured) {
      return {
        connected: false,
        provider: 'memory-store',
        totalExperiments,
        totalLogs,
      };
    }

    const pool = await this.getPool();
    if (!pool) {
      return {
        connected: false,
        provider: 'memory-store',
        totalExperiments,
        totalLogs,
      };
    }

    try {
      const res = await pool.query('SELECT current_database(), inet_server_addr()');
      const row = res.rows[0];
      return {
        connected: true,
        provider: 'postgresql',
        database: row?.current_database || process.env.SQL_DB_NAME,
        host: process.env.SQL_HOST,
        totalExperiments,
        totalLogs,
      };
    } catch {
      return {
        connected: false,
        provider: 'memory-store',
        database: process.env.SQL_DB_NAME,
        host: process.env.SQL_HOST,
        totalExperiments,
        totalLogs,
      };
    }
  }

  private mapExperimentRow(row: any): TrainingExperimentRecord {
    return {
      id: row.id,
      name: row.name,
      modelSize: row.model_size as QwenModelSize,
      method: row.method as FineTuningMethod,
      config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config || {},
      datasetId: row.dataset_id || undefined,
      datasetSampleSize: row.dataset_sample_size || undefined,
      status: row.status,
      metrics: typeof row.metrics === 'string' ? JSON.parse(row.metrics) : row.metrics || {},
      error: row.error || undefined,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
      completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : undefined,
    };
  }
}

// Export singleton instance
export const dbService = new PostgresService();
