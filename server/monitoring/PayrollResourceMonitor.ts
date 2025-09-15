/**
 * Payroll Resource Monitor
 * 
 * Real-time memory and execution time monitoring for large payroll runs.
 * Tracks resource usage, detects memory leaks, and provides performance alerts
 * to ensure optimal performance during high-volume payroll processing.
 * 
 * FEATURES:
 * - Real-time memory tracking (heap, RSS, external, GC activity)
 * - Execution time monitoring for each processing phase
 * - Memory leak detection with trending analysis
 * - Performance alerts for resource exhaustion
 * - Automatic garbage collection suggestions
 * - Resource usage reports and recommendations
 */

import { EventEmitter } from 'events';
import { logger } from '../observability/logging.js';

export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  rss: number;
  external: number;
  arrayBuffers: number;
}

export interface ExecutionPhase {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryStart: MemorySnapshot;
  memoryEnd?: MemorySnapshot;
  memoryDelta?: number;
}

export interface ResourceAlert {
  type: 'MEMORY_HIGH' | 'MEMORY_LEAK' | 'SLOW_PROCESSING' | 'GC_PRESSURE';
  severity: 'WARNING' | 'CRITICAL';
  message: string;
  metrics: any;
  timestamp: number;
  recommendations: string[];
}

export interface PayrollResourceMetrics {
  scopeId: string;
  employeeCount: number;
  startTime: number;
  endTime?: number;
  totalDuration?: number;
  
  // Memory metrics
  peakMemoryUsage: number;
  averageMemoryUsage: number;
  memoryGrowth: number;
  memoryLeakScore: number;
  gcCount: number;
  gcTime: number;
  
  // Performance metrics
  employeesPerSecond: number;
  memoryPerEmployee: number;
  timePerEmployee: number;
  
  // Phase breakdown
  phases: ExecutionPhase[];
  
  // Resource alerts
  alerts: ResourceAlert[];
  
  // Efficiency scores
  memoryEfficiency: number; // 0-100 scale
  timeEfficiency: number;   // 0-100 scale
  overallScore: number;     // 0-100 scale
}

/**
 * Real-time resource monitor for payroll processing
 */
export class PayrollResourceMonitor extends EventEmitter {
  private scopeId: string;
  private employeeCount: number;
  private startTime: number;
  private phases: ExecutionPhase[] = [];
  private currentPhase: ExecutionPhase | null = null;
  private memorySnapshots: MemorySnapshot[] = [];
  private alerts: ResourceAlert[] = [];
  
  // Configuration
  private readonly snapshotInterval: number;
  private readonly memoryThreshold: number; // MB
  private readonly leakThreshold: number;   // MB growth per minute
  private readonly gcThreshold: number;     // GC time percentage
  
  // Monitoring state
  private snapshotTimer: NodeJS.Timeout | null = null;
  private initialMemory: MemorySnapshot;
  private gcStats: { count: number; time: number } = { count: 0, time: 0 };

  constructor(
    scopeId: string,
    employeeCount: number,
    options: {
      snapshotInterval?: number;
      memoryThreshold?: number;
      leakThreshold?: number;
      gcThreshold?: number;
    } = {}
  ) {
    super();
    
    this.scopeId = scopeId;
    this.employeeCount = employeeCount;
    this.startTime = Date.now();
    
    // Configuration
    this.snapshotInterval = options.snapshotInterval || 5000; // 5 seconds
    this.memoryThreshold = options.memoryThreshold || 1024;  // 1GB
    this.leakThreshold = options.leakThreshold || 50;        // 50MB/min
    this.gcThreshold = options.gcThreshold || 10;            // 10% of time in GC
    
    // Take initial memory snapshot
    this.initialMemory = this.takeMemorySnapshot();
    this.memorySnapshots.push(this.initialMemory);
    
    // Start continuous monitoring
    this.startMonitoring();
    
    logger.info('Payroll resource monitor started', {
      scopeId,
      employeeCount,
      initialMemory: `${Math.round(this.initialMemory.heapUsed / 1024 / 1024)}MB`,
      thresholds: {
        memory: `${this.memoryThreshold}MB`,
        leak: `${this.leakThreshold}MB/min`,
        gc: `${this.gcThreshold}%`
      }
    });
  }

  /**
   * Start a new processing phase
   */
  startPhase(name: string): void {
    // End current phase if exists
    if (this.currentPhase && !this.currentPhase.endTime) {
      this.endPhase();
    }
    
    const memorySnapshot = this.takeMemorySnapshot();
    
    this.currentPhase = {
      name,
      startTime: Date.now(),
      memoryStart: memorySnapshot
    };
    
    this.phases.push(this.currentPhase);
    
    logger.debug('Processing phase started', {
      scopeId: this.scopeId,
      phase: name,
      memory: `${Math.round(memorySnapshot.heapUsed / 1024 / 1024)}MB`
    });
  }

  /**
   * End current processing phase
   */
  endPhase(): void {
    if (!this.currentPhase) return;
    
    const endTime = Date.now();
    const memorySnapshot = this.takeMemorySnapshot();
    
    this.currentPhase.endTime = endTime;
    this.currentPhase.duration = endTime - this.currentPhase.startTime;
    this.currentPhase.memoryEnd = memorySnapshot;
    this.currentPhase.memoryDelta = memorySnapshot.heapUsed - this.currentPhase.memoryStart.heapUsed;
    
    logger.debug('Processing phase completed', {
      scopeId: this.scopeId,
      phase: this.currentPhase.name,
      duration: `${this.currentPhase.duration}ms`,
      memoryDelta: `${Math.round(this.currentPhase.memoryDelta / 1024 / 1024)}MB`
    });
    
    // Check for phase-specific alerts
    this.checkPhaseAlerts(this.currentPhase);
    
    this.currentPhase = null;
  }

  /**
   * Record custom metric during processing
   */
  recordMetric(name: string, value: number, unit: string = ''): void {
    logger.debug('Custom metric recorded', {
      scopeId: this.scopeId,
      metric: name,
      value,
      unit,
      memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
    });
  }

  /**
   * Take memory snapshot
   */
  private takeMemorySnapshot(): MemorySnapshot {
    const memory = process.memoryUsage();
    return {
      timestamp: Date.now(),
      heapUsed: memory.heapUsed,
      heapTotal: memory.heapTotal,
      rss: memory.rss,
      external: memory.external,
      arrayBuffers: memory.arrayBuffers
    };
  }

  /**
   * Start continuous resource monitoring
   */
  private startMonitoring(): void {
    // Track GC activity if available
    if (global.gc) {
      const originalGc = global.gc;
      global.gc = () => {
        const gcStart = Date.now();
        originalGc();
        const gcTime = Date.now() - gcStart;
        
        this.gcStats.count++;
        this.gcStats.time += gcTime;
        
        logger.debug('Garbage collection executed', {
          scopeId: this.scopeId,
          gcTime: `${gcTime}ms`,
          totalGcTime: `${this.gcStats.time}ms`,
          gcCount: this.gcStats.count
        });
      };
    }
    
    // Periodic memory snapshots
    this.snapshotTimer = setInterval(() => {
      const snapshot = this.takeMemorySnapshot();
      this.memorySnapshots.push(snapshot);
      
      // Keep only last 100 snapshots to prevent memory bloat
      if (this.memorySnapshots.length > 100) {
        this.memorySnapshots.shift();
      }
      
      // Check for resource alerts
      this.checkResourceAlerts(snapshot);
      
    }, this.snapshotInterval);
  }

  /**
   * Check for resource alerts based on current snapshot
   */
  private checkResourceAlerts(snapshot: MemorySnapshot): void {
    const memoryMB = snapshot.heapUsed / 1024 / 1024;
    
    // High memory usage alert
    if (memoryMB > this.memoryThreshold) {
      this.createAlert('MEMORY_HIGH', 'CRITICAL', 
        `Memory usage is ${Math.round(memoryMB)}MB, exceeding threshold of ${this.memoryThreshold}MB`,
        { memoryMB, threshold: this.memoryThreshold },
        [
          'Consider reducing batch size',
          'Enable manual garbage collection',
          'Check for memory leaks in employee data processing'
        ]
      );
    } else if (memoryMB > this.memoryThreshold * 0.8) {
      this.createAlert('MEMORY_HIGH', 'WARNING', 
        `Memory usage is ${Math.round(memoryMB)}MB, approaching threshold of ${this.memoryThreshold}MB`,
        { memoryMB, threshold: this.memoryThreshold },
        [
          'Monitor memory growth closely',
          'Consider smaller batch sizes for remaining employees'
        ]
      );
    }
    
    // Memory leak detection
    if (this.memorySnapshots.length >= 12) { // 1 minute of snapshots
      const oldSnapshot = this.memorySnapshots[this.memorySnapshots.length - 12];
      const memoryGrowth = (snapshot.heapUsed - oldSnapshot.heapUsed) / 1024 / 1024;
      const timeSpan = (snapshot.timestamp - oldSnapshot.timestamp) / (1000 * 60); // minutes
      const growthRate = memoryGrowth / timeSpan; // MB per minute
      
      if (growthRate > this.leakThreshold) {
        this.createAlert('MEMORY_LEAK', 'CRITICAL',
          `Detected memory leak: ${Math.round(growthRate)}MB/min growth rate`,
          { growthRate, threshold: this.leakThreshold, memoryGrowth, timeSpan },
          [
            'Check for unclosed database connections',
            'Review employee data caching logic',
            'Look for retained object references in calculations'
          ]
        );
      }
    }
    
    // GC pressure detection
    const totalTime = Date.now() - this.startTime;
    if (totalTime > 60000 && this.gcStats.time > 0) { // After 1 minute
      const gcPercentage = (this.gcStats.time / totalTime) * 100;
      
      if (gcPercentage > this.gcThreshold) {
        this.createAlert('GC_PRESSURE', 'WARNING',
          `High garbage collection activity: ${Math.round(gcPercentage)}% of time spent in GC`,
          { gcPercentage, gcTime: this.gcStats.time, gcCount: this.gcStats.count },
          [
            'Reduce object creation in hot paths',
            'Use object pooling for frequently created objects',
            'Increase Node.js heap size if needed'
          ]
        );
      }
    }
  }

  /**
   * Check for phase-specific performance alerts
   */
  private checkPhaseAlerts(phase: ExecutionPhase): void {
    if (!phase.duration) return;
    
    const timePerEmployee = phase.duration / this.employeeCount;
    
    // Slow processing alerts
    if (timePerEmployee > 1000) { // More than 1 second per employee
      this.createAlert('SLOW_PROCESSING', 'CRITICAL',
        `Phase "${phase.name}" is slow: ${Math.round(timePerEmployee)}ms per employee`,
        { phase: phase.name, timePerEmployee, duration: phase.duration },
        [
          'Check database query performance',
          'Review calculation complexity',
          'Consider parallel processing'
        ]
      );
    } else if (timePerEmployee > 500) { // More than 500ms per employee
      this.createAlert('SLOW_PROCESSING', 'WARNING',
        `Phase "${phase.name}" performance concern: ${Math.round(timePerEmployee)}ms per employee`,
        { phase: phase.name, timePerEmployee, duration: phase.duration },
        [
          'Monitor for performance degradation',
          'Consider optimization opportunities'
        ]
      );
    }
    
    // Memory growth during phase
    if (phase.memoryDelta && phase.memoryDelta > 100 * 1024 * 1024) { // 100MB growth
      const memoryMB = Math.round(phase.memoryDelta / 1024 / 1024);
      this.createAlert('MEMORY_HIGH', 'WARNING',
        `Phase "${phase.name}" consumed ${memoryMB}MB memory`,
        { phase: phase.name, memoryDelta: memoryMB },
        [
          'Check for memory-intensive operations',
          'Consider processing in smaller batches'
        ]
      );
    }
  }

  /**
   * Create and emit resource alert
   */
  private createAlert(
    type: ResourceAlert['type'], 
    severity: ResourceAlert['severity'],
    message: string,
    metrics: any,
    recommendations: string[]
  ): void {
    const alert: ResourceAlert = {
      type,
      severity,
      message,
      metrics,
      timestamp: Date.now(),
      recommendations
    };
    
    this.alerts.push(alert);
    
    // Log alert
    const logLevel = severity === 'CRITICAL' ? 'error' : 'warn';
    logger[logLevel]('Payroll resource alert', {
      scopeId: this.scopeId,
      alertType: type,
      severity,
      message,
      metrics,
      recommendations
    });
    
    // Emit event for external handlers
    this.emit('alert', alert);
  }

  /**
   * Get current resource usage summary
   */
  getCurrentUsage(): {
    memory: MemorySnapshot;
    elapsed: number;
    currentPhase: string | null;
    alertCount: number;
  } {
    const currentMemory = this.takeMemorySnapshot();
    
    return {
      memory: currentMemory,
      elapsed: Date.now() - this.startTime,
      currentPhase: this.currentPhase?.name || null,
      alertCount: this.alerts.length
    };
  }

  /**
   * Complete monitoring and generate final report
   */
  finalize(): PayrollResourceMetrics {
    // End current phase if active
    if (this.currentPhase) {
      this.endPhase();
    }
    
    // Stop monitoring
    if (this.snapshotTimer) {
      clearInterval(this.snapshotTimer);
      this.snapshotTimer = null;
    }
    
    const endTime = Date.now();
    const totalDuration = endTime - this.startTime;
    const finalMemory = this.takeMemorySnapshot();
    
    // Calculate memory metrics
    const memoryUsages = this.memorySnapshots.map(s => s.heapUsed);
    const peakMemoryUsage = Math.max(...memoryUsages);
    const averageMemoryUsage = memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length;
    const memoryGrowth = finalMemory.heapUsed - this.initialMemory.heapUsed;
    
    // Calculate memory leak score (0-100, where 100 is worst)
    const memoryLeakScore = Math.min(100, Math.max(0, 
      (memoryGrowth / (1024 * 1024)) / this.employeeCount * 10
    ));
    
    // Calculate performance metrics
    const employeesPerSecond = totalDuration > 0 ? (this.employeeCount / totalDuration) * 1000 : 0;
    const memoryPerEmployee = memoryGrowth / this.employeeCount;
    const timePerEmployee = totalDuration / this.employeeCount;
    
    // Calculate efficiency scores
    const memoryEfficiency = Math.max(0, 100 - (memoryLeakScore + (peakMemoryUsage / (1024 * 1024 * 10)))); // 10MB per point
    const timeEfficiency = Math.max(0, 100 - Math.min(100, timePerEmployee / 10)); // 10ms per point
    const overallScore = (memoryEfficiency + timeEfficiency) / 2;
    
    const metrics: PayrollResourceMetrics = {
      scopeId: this.scopeId,
      employeeCount: this.employeeCount,
      startTime: this.startTime,
      endTime,
      totalDuration,
      peakMemoryUsage: Math.round(peakMemoryUsage),
      averageMemoryUsage: Math.round(averageMemoryUsage),
      memoryGrowth: Math.round(memoryGrowth),
      memoryLeakScore: Math.round(memoryLeakScore * 100) / 100,
      gcCount: this.gcStats.count,
      gcTime: this.gcStats.time,
      employeesPerSecond: Math.round(employeesPerSecond * 100) / 100,
      memoryPerEmployee: Math.round(memoryPerEmployee),
      timePerEmployee: Math.round(timePerEmployee),
      phases: [...this.phases],
      alerts: [...this.alerts],
      memoryEfficiency: Math.round(memoryEfficiency),
      timeEfficiency: Math.round(timeEfficiency),
      overallScore: Math.round(overallScore)
    };
    
    // Generate final report
    this.generateFinalReport(metrics);
    
    return metrics;
  }

  /**
   * Generate comprehensive final report
   */
  private generateFinalReport(metrics: PayrollResourceMetrics): void {
    const memoryMB = Math.round(metrics.peakMemoryUsage / 1024 / 1024);
    const avgMemoryMB = Math.round(metrics.averageMemoryUsage / 1024 / 1024);
    const growthMB = Math.round(metrics.memoryGrowth / 1024 / 1024);
    
    logger.info('Payroll Resource Monitor - Final Report', {
      scopeId: this.scopeId,
      summary: {
        employees: metrics.employeeCount,
        duration: `${(metrics.totalDuration! / 1000).toFixed(2)}s`,
        employeesPerSecond: metrics.employeesPerSecond,
        overallScore: `${metrics.overallScore}/100`
      },
      memory: {
        peak: `${memoryMB}MB`,
        average: `${avgMemoryMB}MB`,
        growth: `${growthMB}MB`,
        perEmployee: `${Math.round(metrics.memoryPerEmployee / 1024)}KB`,
        leakScore: `${metrics.memoryLeakScore}/100`
      },
      performance: {
        timePerEmployee: `${metrics.timePerEmployee.toFixed(2)}ms`,
        phases: metrics.phases.length,
        gcActivity: `${metrics.gcCount} collections, ${metrics.gcTime}ms total`
      },
      alerts: {
        total: metrics.alerts.length,
        critical: metrics.alerts.filter(a => a.severity === 'CRITICAL').length,
        warnings: metrics.alerts.filter(a => a.severity === 'WARNING').length
      },
      efficiency: {
        memory: `${metrics.memoryEfficiency}/100`,
        time: `${metrics.timeEfficiency}/100`,
        overall: `${metrics.overallScore}/100`
      }
    });
    
    // Log recommendations if needed
    if (metrics.overallScore < 70) {
      const recommendations = this.generateRecommendations(metrics);
      logger.warn('Performance recommendations for future payroll runs', {
        scopeId: this.scopeId,
        score: metrics.overallScore,
        recommendations
      });
    }
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(metrics: PayrollResourceMetrics): string[] {
    const recommendations: string[] = [];
    
    if (metrics.memoryEfficiency < 70) {
      recommendations.push('Reduce memory usage by processing employees in smaller batches');
      recommendations.push('Implement object pooling for frequently created calculation objects');
      
      if (metrics.memoryLeakScore > 20) {
        recommendations.push('Investigate potential memory leaks in employee data processing');
      }
    }
    
    if (metrics.timeEfficiency < 70) {
      recommendations.push('Optimize slow processing phases identified in the report');
      recommendations.push('Consider parallel processing for independent calculations');
      
      if (metrics.employeesPerSecond < 10) {
        recommendations.push('Review database query performance and indexing');
      }
    }
    
    if (metrics.gcTime > metrics.totalDuration! * 0.1) {
      recommendations.push('Reduce object creation to minimize garbage collection pressure');
      recommendations.push('Consider increasing Node.js heap size for large payroll runs');
    }
    
    return recommendations;
  }
}

/**
 * Factory function to create resource monitor
 */
export function createPayrollResourceMonitor(
  scopeId: string, 
  employeeCount: number,
  options?: any
): PayrollResourceMonitor {
  return new PayrollResourceMonitor(scopeId, employeeCount, options);
}

/**
 * Global resource monitoring utilities
 */
export class ResourceMonitoringUtils {
  
  /**
   * Suggest garbage collection if memory pressure is high
   */
  static suggestGarbageCollection(): boolean {
    const memory = process.memoryUsage();
    const heapUsageMB = memory.heapUsed / 1024 / 1024;
    
    // Suggest GC if using more than 512MB
    if (heapUsageMB > 512 && global.gc) {
      logger.info('Suggesting garbage collection due to high memory usage', {
        heapUsed: `${Math.round(heapUsageMB)}MB`,
        heapTotal: `${Math.round(memory.heapTotal / 1024 / 1024)}MB`
      });
      
      const gcStart = Date.now();
      global.gc();
      const gcTime = Date.now() - gcStart;
      
      const newMemory = process.memoryUsage();
      const freedMB = Math.round((memory.heapUsed - newMemory.heapUsed) / 1024 / 1024);
      
      logger.info('Garbage collection completed', {
        gcTime: `${gcTime}ms`,
        memoryFreed: `${freedMB}MB`,
        newHeapUsed: `${Math.round(newMemory.heapUsed / 1024 / 1024)}MB`
      });
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Get current system resource status
   */
  static getSystemResourceStatus(): {
    memory: NodeJS.MemoryUsage;
    uptime: number;
    loadAverage: number[];
    cpuUsage: NodeJS.CpuUsage;
  } {
    return {
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      loadAverage: require('os').loadavg(),
      cpuUsage: process.cpuUsage()
    };
  }
}