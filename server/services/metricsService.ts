/**
 * Metrics & SLOs Service - Performance tracking and service level monitoring
 */

export interface LatencyMetrics {
  submit_to_accepted: {
    median: number;
    p95: number;
    p99: number;
    samples: number;
  };
  accepted_to_settled: {
    median: number;
    p95: number;
    p99: number;
    samples: number;
  };
  end_to_end: {
    median: number;
    p95: number;
    p99: number;
    samples: number;
  };
}

export interface RejectMetrics {
  total_rejects: number;
  reject_rate_percent: number;
  by_reason_code: {
    [reasonCode: string]: {
      count: number;
      percentage: number;
      description: string;
    };
  };
}

export interface InstantMetrics {
  total_instant_attempts: number;
  successful_instant: number;
  sct_fallbacks: number;
  instant_success_rate: number;
  fallback_reasons: {
    [reason: string]: number;
  };
}

export interface ReconciliationFreshness {
  pain002: {
    last_ingest_time: string;
    freshness_minutes: number;
    status: 'fresh' | 'stale' | 'very_stale';
  };
  camt054: {
    last_ingest_time: string;
    freshness_minutes: number;
    status: 'fresh' | 'stale' | 'very_stale';
  };
  camt053: {
    last_ingest_time: string;
    freshness_minutes: number;
    status: 'fresh' | 'stale' | 'very_stale';
  };
}

export interface CutOffCompliance {
  total_batches: number;
  submitted_before_cutoff: number;
  submitted_after_cutoff: number;
  compliance_percentage: number;
  by_bank: {
    [bankId: string]: {
      cutoff_time: string;
      compliant_batches: number;
      late_batches: number;
      compliance_rate: number;
    };
  };
}

export class MetricsService {
  private static latencyData: Array<{
    batch_id: string;
    submit_time: Date;
    accepted_time?: Date;
    settled_time?: Date;
  }> = [];

  private static rejectData: Array<{
    line_id: string;
    reason_code: string;
    timestamp: Date;
  }> = [];

  private static instantData: Array<{
    batch_id: string;
    method: 'SCT_INST' | 'SCT';
    success: boolean;
    fallback_reason?: string;
    timestamp: Date;
  }> = [];

  private static reconciliationTimes = {
    pain002: new Date(),
    camt054: new Date(),
    camt053: new Date()
  };

  private static cutoffData: Array<{
    batch_id: string;
    bank_id: string;
    cutoff_time: string;
    submit_time: Date;
    before_cutoff: boolean;
  }> = [];

  // =============================================================================
  // LATENCY TRACKING
  // =============================================================================

  /**
   * Record batch submission
   */
  static recordBatchSubmission(batchId: string): void {
    this.latencyData.push({
      batch_id: batchId,
      submit_time: new Date()
    });
  }

  /**
   * Record batch acceptance
   */
  static recordBatchAcceptance(batchId: string): void {
    const entry = this.latencyData.find(d => d.batch_id === batchId);
    if (entry) {
      entry.accepted_time = new Date();
    }
  }

  /**
   * Record batch settlement
   */
  static recordBatchSettlement(batchId: string): void {
    const entry = this.latencyData.find(d => d.batch_id === batchId);
    if (entry) {
      entry.settled_time = new Date();
    }
  }

  /**
   * Calculate latency metrics
   */
  static getLatencyMetrics(periodHours = 24): LatencyMetrics {
    const cutoff = new Date(Date.now() - periodHours * 60 * 60 * 1000);
    const recentData = this.latencyData.filter(d => d.submit_time >= cutoff);

    // Submit to Accepted latencies
    const submitToAccepted = recentData
      .filter(d => d.accepted_time)
      .map(d => d.accepted_time!.getTime() - d.submit_time.getTime())
      .sort((a, b) => a - b);

    // Accepted to Settled latencies  
    const acceptedToSettled = recentData
      .filter(d => d.accepted_time && d.settled_time)
      .map(d => d.settled_time!.getTime() - d.accepted_time!.getTime())
      .sort((a, b) => a - b);

    // End to End latencies
    const endToEnd = recentData
      .filter(d => d.settled_time)
      .map(d => d.settled_time!.getTime() - d.submit_time.getTime())
      .sort((a, b) => a - b);

    return {
      submit_to_accepted: this.calculatePercentiles(submitToAccepted),
      accepted_to_settled: this.calculatePercentiles(acceptedToSettled),
      end_to_end: this.calculatePercentiles(endToEnd)
    };
  }

  private static calculatePercentiles(values: number[]): {
    median: number;
    p95: number;
    p99: number;
    samples: number;
  } {
    if (values.length === 0) {
      return { median: 0, p95: 0, p99: 0, samples: 0 };
    }

    const medianIdx = Math.floor(values.length * 0.5);
    const p95Idx = Math.floor(values.length * 0.95);
    const p99Idx = Math.floor(values.length * 0.99);

    return {
      median: Math.round(values[medianIdx] / 1000), // Convert to seconds
      p95: Math.round(values[p95Idx] / 1000),
      p99: Math.round(values[p99Idx] / 1000),
      samples: values.length
    };
  }

  // =============================================================================
  // REJECT RATE TRACKING
  // =============================================================================

  /**
   * Record payment rejection
   */
  static recordRejection(lineId: string, reasonCode: string): void {
    this.rejectData.push({
      line_id: lineId,
      reason_code: reasonCode,
      timestamp: new Date()
    });
  }

  /**
   * Get reject rate metrics
   */
  static getRejectMetrics(periodHours = 24): RejectMetrics {
    const cutoff = new Date(Date.now() - periodHours * 60 * 60 * 1000);
    const recentRejects = this.rejectData.filter(r => r.timestamp >= cutoff);
    
    // Calculate total transactions in period (mock data for demo)
    const totalTransactions = Math.max(recentRejects.length * 10, 1000);
    
    const reasonCodeCounts = new Map<string, number>();
    recentRejects.forEach(r => {
      reasonCodeCounts.set(r.reason_code, (reasonCodeCounts.get(r.reason_code) || 0) + 1);
    });

    const reasonCodeDescriptions: { [key: string]: string } = {
      'AC04': 'Closed account',
      'AC06': 'Account blocked',
      'AM04': 'Insufficient funds',
      'FF05': 'Invalid IBAN format',
      'AG01': 'Transaction not supported',
      'BE05': 'Unrecognized beneficiary',
      'RR01': 'Regulatory reason',
      'DT01': 'Invalid date/time'
    };

    const byReasonCode: { [key: string]: any } = {};
    Array.from(reasonCodeCounts.entries()).forEach(([code, count]) => {
      byReasonCode[code] = {
        count,
        percentage: Math.round((count / recentRejects.length) * 100 * 100) / 100,
        description: reasonCodeDescriptions[code] || 'Unknown reason'
      };
    });

    return {
      total_rejects: recentRejects.length,
      reject_rate_percent: Math.round((recentRejects.length / totalTransactions) * 100 * 100) / 100,
      by_reason_code: byReasonCode
    };
  }

  // =============================================================================
  // INSTANT SUCCESS TRACKING
  // =============================================================================

  /**
   * Record instant payment attempt
   */
  static recordInstantAttempt(batchId: string, method: 'SCT_INST' | 'SCT', success: boolean, fallbackReason?: string): void {
    this.instantData.push({
      batch_id: batchId,
      method,
      success,
      fallback_reason: fallbackReason,
      timestamp: new Date()
    });
  }

  /**
   * Get instant success metrics
   */
  static getInstantMetrics(periodHours = 24): InstantMetrics {
    const cutoff = new Date(Date.now() - periodHours * 60 * 60 * 1000);
    const recentData = this.instantData.filter(d => d.timestamp >= cutoff);
    
    const instantAttempts = recentData.filter(d => d.method === 'SCT_INST');
    const successful = instantAttempts.filter(d => d.success);
    const fallbacks = instantAttempts.filter(d => !d.success);

    const fallbackReasons: { [key: string]: number } = {};
    fallbacks.forEach(f => {
      if (f.fallback_reason) {
        fallbackReasons[f.fallback_reason] = (fallbackReasons[f.fallback_reason] || 0) + 1;
      }
    });

    return {
      total_instant_attempts: instantAttempts.length,
      successful_instant: successful.length,
      sct_fallbacks: fallbacks.length,
      instant_success_rate: instantAttempts.length > 0 
        ? Math.round((successful.length / instantAttempts.length) * 100 * 100) / 100 
        : 0,
      fallback_reasons: fallbackReasons
    };
  }

  // =============================================================================
  // RECONCILIATION FRESHNESS
  // =============================================================================

  /**
   * Update reconciliation ingest time
   */
  static updateReconciliationTime(type: 'pain002' | 'camt054' | 'camt053'): void {
    this.reconciliationTimes[type] = new Date();
  }

  /**
   * Get reconciliation freshness status
   */
  static getReconciliationFreshness(): ReconciliationFreshness {
    const now = new Date();
    
    const getFreshnessStatus = (lastIngest: Date): {
      freshness_minutes: number;
      status: 'fresh' | 'stale' | 'very_stale';
    } => {
      const minutes = Math.round((now.getTime() - lastIngest.getTime()) / (1000 * 60));
      let status: 'fresh' | 'stale' | 'very_stale';
      
      if (minutes <= 15) {
        status = 'fresh';
      } else if (minutes <= 60) {
        status = 'stale';
      } else {
        status = 'very_stale';
      }
      
      return { freshness_minutes: minutes, status };
    };

    return {
      pain002: {
        last_ingest_time: this.reconciliationTimes.pain002.toISOString(),
        ...getFreshnessStatus(this.reconciliationTimes.pain002)
      },
      camt054: {
        last_ingest_time: this.reconciliationTimes.camt054.toISOString(),
        ...getFreshnessStatus(this.reconciliationTimes.camt054)
      },
      camt053: {
        last_ingest_time: this.reconciliationTimes.camt053.toISOString(),
        ...getFreshnessStatus(this.reconciliationTimes.camt053)
      }
    };
  }

  // =============================================================================
  // CUT-OFF COMPLIANCE
  // =============================================================================

  /**
   * Record batch submission with cut-off compliance
   */
  static recordBatchCutoffCompliance(
    batchId: string, 
    bankId: string, 
    cutoffTime: string, 
    submitTime: Date = new Date()
  ): void {
    // Parse cut-off time (e.g., "16:00")
    const [hours, minutes] = cutoffTime.split(':').map(Number);
    const cutoffDateTime = new Date(submitTime);
    cutoffDateTime.setHours(hours, minutes, 0, 0);
    
    const beforeCutoff = submitTime <= cutoffDateTime;
    
    this.cutoffData.push({
      batch_id: batchId,
      bank_id: bankId,
      cutoff_time: cutoffTime,
      submit_time: submitTime,
      before_cutoff: beforeCutoff
    });
  }

  /**
   * Get cut-off compliance metrics
   */
  static getCutoffCompliance(periodHours = 24): CutOffCompliance {
    const cutoff = new Date(Date.now() - periodHours * 60 * 60 * 1000);
    const recentData = this.cutoffData.filter(d => d.submit_time >= cutoff);
    
    const beforeCutoff = recentData.filter(d => d.before_cutoff);
    const afterCutoff = recentData.filter(d => !d.before_cutoff);
    
    // Group by bank
    const byBank: { [bankId: string]: any } = {};
    const bankGroups = new Map<string, typeof recentData>();
    
    recentData.forEach(d => {
      if (!bankGroups.has(d.bank_id)) {
        bankGroups.set(d.bank_id, []);
      }
      bankGroups.get(d.bank_id)!.push(d);
    });
    
    Array.from(bankGroups.entries()).forEach(([bankId, data]) => {
      const compliant = data.filter((d: any) => d.before_cutoff);
      const late = data.filter((d: any) => !d.before_cutoff);
      
      byBank[bankId] = {
        cutoff_time: data[0]?.cutoff_time || 'Unknown',
        compliant_batches: compliant.length,
        late_batches: late.length,
        compliance_rate: data.length > 0 
          ? Math.round((compliant.length / data.length) * 100 * 100) / 100 
          : 0
      };
    });

    return {
      total_batches: recentData.length,
      submitted_before_cutoff: beforeCutoff.length,
      submitted_after_cutoff: afterCutoff.length,
      compliance_percentage: recentData.length > 0 
        ? Math.round((beforeCutoff.length / recentData.length) * 100 * 100) / 100 
        : 0,
      by_bank: byBank
    };
  }

  // =============================================================================
  // COMPREHENSIVE SLO DASHBOARD
  // =============================================================================

  /**
   * Get comprehensive SLO metrics
   */
  static getSLODashboard(periodHours = 24): {
    period_hours: number;
    generated_at: string;
    latency: LatencyMetrics;
    rejects: RejectMetrics;
    instant: InstantMetrics;
    reconciliation: ReconciliationFreshness;
    cutoff_compliance: CutOffCompliance;
    slo_targets: {
      submit_to_accepted_p95_seconds: number;
      reject_rate_max_percent: number;
      instant_success_rate_min_percent: number;
      reconciliation_freshness_max_minutes: number;
      cutoff_compliance_min_percent: number;
    };
    slo_status: {
      latency_sla_met: boolean;
      reject_rate_sla_met: boolean;
      instant_sla_met: boolean;
      reconciliation_sla_met: boolean;
      cutoff_sla_met: boolean;
      overall_sla_met: boolean;
    };
  } {
    const latency = this.getLatencyMetrics(periodHours);
    const rejects = this.getRejectMetrics(periodHours);
    const instant = this.getInstantMetrics(periodHours);
    const reconciliation = this.getReconciliationFreshness();
    const cutoffCompliance = this.getCutoffCompliance(periodHours);

    const sloTargets = {
      submit_to_accepted_p95_seconds: 300, // 5 minutes
      reject_rate_max_percent: 2.0,
      instant_success_rate_min_percent: 95.0,
      reconciliation_freshness_max_minutes: 30,
      cutoff_compliance_min_percent: 95.0
    };

    const sloStatus = {
      latency_sla_met: latency.submit_to_accepted.p95 <= sloTargets.submit_to_accepted_p95_seconds,
      reject_rate_sla_met: rejects.reject_rate_percent <= sloTargets.reject_rate_max_percent,
      instant_sla_met: instant.instant_success_rate >= sloTargets.instant_success_rate_min_percent,
      reconciliation_sla_met: Math.max(
        reconciliation.pain002.freshness_minutes,
        reconciliation.camt054.freshness_minutes
      ) <= sloTargets.reconciliation_freshness_max_minutes,
      cutoff_sla_met: cutoffCompliance.compliance_percentage >= sloTargets.cutoff_compliance_min_percent,
      overall_sla_met: false
    };

    sloStatus.overall_sla_met = Object.values(sloStatus)
      .filter(v => typeof v === 'boolean' && v !== sloStatus.overall_sla_met)
      .every(v => v);

    return {
      period_hours: periodHours,
      generated_at: new Date().toISOString(),
      latency,
      rejects,
      instant,
      reconciliation,
      cutoff_compliance: cutoffCompliance,
      slo_targets: sloTargets,
      slo_status: sloStatus
    };
  }

  /**
   * Initialize with mock data for demo
   */
  static initializeMockData(): void {
    const now = new Date();
    
    // Mock latency data
    for (let i = 0; i < 100; i++) {
      const submitTime = new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000);
      const batchId = `BATCH-${submitTime.getTime()}`;
      
      this.latencyData.push({
        batch_id: batchId,
        submit_time: submitTime,
        accepted_time: new Date(submitTime.getTime() + Math.random() * 300 * 1000), // 0-5 min
        settled_time: new Date(submitTime.getTime() + (300 + Math.random() * 7200) * 1000) // 5min - 2hr
      });
    }

    // Mock reject data
    const reasonCodes = ['AC04', 'AC06', 'AM04', 'FF05', 'AG01', 'BE05'];
    for (let i = 0; i < 25; i++) {
      this.rejectData.push({
        line_id: `LINE-${i}`,
        reason_code: reasonCodes[Math.floor(Math.random() * reasonCodes.length)],
        timestamp: new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000)
      });
    }

    // Mock instant data
    for (let i = 0; i < 50; i++) {
      const success = Math.random() > 0.05; // 95% success rate
      this.instantData.push({
        batch_id: `INST-${i}`,
        method: 'SCT_INST',
        success,
        fallback_reason: success ? undefined : ['Amount over limit', 'Bank not reachable', 'System maintenance'][Math.floor(Math.random() * 3)],
        timestamp: new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000)
      });
    }

    // Mock cut-off data
    const banks = ['alpha', 'piraeus', 'eurobank', 'nbg'];
    const cutoffs = ['16:00', '15:30', '17:00', '16:15'];
    for (let i = 0; i < 40; i++) {
      const bankIdx = Math.floor(Math.random() * banks.length);
      const submitTime = new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000);
      
      this.recordBatchCutoffCompliance(
        `BATCH-CUTOFF-${i}`,
        banks[bankIdx],
        cutoffs[bankIdx],
        submitTime
      );
    }

    console.log('Metrics service initialized with mock data');
  }

  // Initialize mock data on service start
  static {
    this.initializeMockData();
  }
}