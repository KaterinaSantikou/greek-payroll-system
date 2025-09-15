/**
 * Performance Monitoring for Greek Payroll System
 * 
 * Tracks and reports performance metrics for large-scale payroll processing.
 * Monitors the effectiveness of database optimizations and identifies bottlenecks.
 * 
 * FEATURES:
 * - Real-time performance tracking during payroll runs
 * - Database query timing and efficiency metrics  
 * - Memory usage monitoring for large employee datasets
 * - Performance regression detection
 * - Greek compliance processing speed tracking
 */

import { logger } from '../observability/logging.js';

export interface PayrollPerformanceMetrics {
  scopeId: string;
  employeeCount: number;
  
  // Timing metrics (milliseconds)
  totalProcessingTime: number;
  employeeDataFetchTime: number;
  timesheetDataFetchTime: number;
  validationTime: number;
  calculationTime: number;
  persistenceTime: number;
  complianceSubmissionTime: number;
  
  // Database performance
  databaseQueryCount: number;
  databaseConnectionTime: number;
  bulkOperationCount: number;
  indexHitRatio: number;
  
  // Memory usage
  peakMemoryUsage: number;
  averageMemoryUsage: number;
  
  // Processing efficiency
  employeesPerSecond: number;
  calculationsPerSecond: number;
  databaseQueriesPerEmployee: number;
  
  // Error tracking
  errorCount: number;
  warningCount: number;
  retryCount: number;
  
  // Greek compliance specific
  erganiSubmissionTime: number;
  efkaProcessingTime: number;
  aadeReportingTime: number;
  
  timestamp: Date;
}

export interface PerformanceBenchmarks {
  small: { // < 100 employees
    targetProcessingTime: number; // milliseconds
    maxMemoryUsage: number; // MB
    targetEmployeesPerSecond: number;
  };
  medium: { // 100-1000 employees
    targetProcessingTime: number;
    maxMemoryUsage: number;
    targetEmployeesPerSecond: number;
  };
  large: { // 1000-5000 employees
    targetProcessingTime: number;
    maxMemoryUsage: number;
    targetEmployeesPerSecond: number;
  };
  enterprise: { // 5000+ employees
    targetProcessingTime: number;
    maxMemoryUsage: number;
    targetEmployeesPerSecond: number;
  };
}

export class PayrollPerformanceMonitor {
  private static readonly BENCHMARKS: PerformanceBenchmarks = {
    small: {
      targetProcessingTime: 30000, // 30 seconds
      maxMemoryUsage: 256, // 256 MB
      targetEmployeesPerSecond: 10
    },
    medium: {
      targetProcessingTime: 180000, // 3 minutes
      maxMemoryUsage: 512, // 512 MB
      targetEmployeesPerSecond: 15
    },
    large: {
      targetProcessingTime: 600000, // 10 minutes
      maxMemoryUsage: 1024, // 1 GB
      targetEmployeesPerSecond: 20
    },
    enterprise: {
      targetProcessingTime: 1800000, // 30 minutes
      maxMemoryUsage: 2048, // 2 GB
      targetEmployeesPerSecond: 25
    }
  };

  private startTime: number;
  private scopeId: string;
  private employeeCount: number;
  private metrics: Partial<PayrollPerformanceMetrics> = {};
  private memorySnapshots: number[] = [];

  constructor(scopeId: string, employeeCount: number) {
    this.scopeId = scopeId;
    this.employeeCount = employeeCount;
    this.startTime = Date.now();
    
    logger.info('Performance monitoring started', {
      scopeId,
      employeeCount,
      category: this.getEmployeeCategory(employeeCount)
    });
  }

  /**
   * Mark the start of a specific operation
   */
  startOperation(operation: string): () => void {
    const startTime = Date.now();
    this.recordMemorySnapshot();
    
    return () => {
      const duration = Date.now() - startTime;
      this.recordOperationTime(operation, duration);
      
      logger.debug(`Operation completed: ${operation}`, {
        scopeId: this.scopeId,
        operation,
        duration,
        employeeCount: this.employeeCount
      });
    };
  }

  /**
   * Record timing for specific operation types
   */
  private recordOperationTime(operation: string, duration: number): void {
    switch (operation) {
      case 'employeeDataFetch':
        this.metrics.employeeDataFetchTime = (this.metrics.employeeDataFetchTime || 0) + duration;
        break;
      case 'timesheetDataFetch':
        this.metrics.timesheetDataFetchTime = (this.metrics.timesheetDataFetchTime || 0) + duration;
        break;
      case 'validation':
        this.metrics.validationTime = (this.metrics.validationTime || 0) + duration;
        break;
      case 'calculation':
        this.metrics.calculationTime = (this.metrics.calculationTime || 0) + duration;
        break;
      case 'persistence':
        this.metrics.persistenceTime = (this.metrics.persistenceTime || 0) + duration;
        break;
      case 'erganiSubmission':
        this.metrics.erganiSubmissionTime = (this.metrics.erganiSubmissionTime || 0) + duration;
        break;
      case 'efkaProcessing':
        this.metrics.efkaProcessingTime = (this.metrics.efkaProcessingTime || 0) + duration;
        break;
      case 'aadeReporting':
        this.metrics.aadeReportingTime = (this.metrics.aadeReportingTime || 0) + duration;
        break;
    }
  }

  /**
   * Record database operation metrics
   */
  recordDatabaseMetrics(queryCount: number, connectionTime: number, bulkOperations: number): void {
    this.metrics.databaseQueryCount = (this.metrics.databaseQueryCount || 0) + queryCount;
    this.metrics.databaseConnectionTime = (this.metrics.databaseConnectionTime || 0) + connectionTime;
    this.metrics.bulkOperationCount = (this.metrics.bulkOperationCount || 0) + bulkOperations;
  }

  /**
   * Record error and warning counts
   */
  recordErrors(errorCount: number, warningCount: number, retryCount: number = 0): void {
    this.metrics.errorCount = (this.metrics.errorCount || 0) + errorCount;
    this.metrics.warningCount = (this.metrics.warningCount || 0) + warningCount;
    this.metrics.retryCount = (this.metrics.retryCount || 0) + retryCount;
  }

  /**
   * Take memory usage snapshot
   */
  private recordMemorySnapshot(): void {
    const memUsage = process.memoryUsage();
    const memoryMB = memUsage.heapUsed / 1024 / 1024;
    this.memorySnapshots.push(memoryMB);
  }

  /**
   * Get employee dataset category for benchmarking
   */
  private getEmployeeCategory(count: number): keyof PerformanceBenchmarks {
    if (count < 100) return 'small';
    if (count < 1000) return 'medium';
    if (count < 5000) return 'large';
    return 'enterprise';
  }

  /**
   * Complete monitoring and generate final report
   */
  finalize(): PayrollPerformanceMetrics {
    const totalTime = Date.now() - this.startTime;
    this.recordMemorySnapshot();
    
    // Calculate derived metrics
    const peakMemory = Math.max(...this.memorySnapshots);
    const avgMemory = this.memorySnapshots.reduce((a, b) => a + b, 0) / this.memorySnapshots.length;
    const employeesPerSecond = (this.employeeCount / totalTime) * 1000;
    const calculationsPerSecond = employeesPerSecond; // 1:1 ratio for now
    const queriesPerEmployee = (this.metrics.databaseQueryCount || 0) / this.employeeCount;

    const finalMetrics: PayrollPerformanceMetrics = {
      scopeId: this.scopeId,
      employeeCount: this.employeeCount,
      totalProcessingTime: totalTime,
      employeeDataFetchTime: this.metrics.employeeDataFetchTime || 0,
      timesheetDataFetchTime: this.metrics.timesheetDataFetchTime || 0,
      validationTime: this.metrics.validationTime || 0,
      calculationTime: this.metrics.calculationTime || 0,
      persistenceTime: this.metrics.persistenceTime || 0,
      complianceSubmissionTime: (this.metrics.erganiSubmissionTime || 0) + 
                               (this.metrics.efkaProcessingTime || 0) + 
                               (this.metrics.aadeReportingTime || 0),
      databaseQueryCount: this.metrics.databaseQueryCount || 0,
      databaseConnectionTime: this.metrics.databaseConnectionTime || 0,
      bulkOperationCount: this.metrics.bulkOperationCount || 0,
      indexHitRatio: 0.95, // Would be calculated from actual database metrics
      peakMemoryUsage: peakMemory,
      averageMemoryUsage: avgMemory,
      employeesPerSecond,
      calculationsPerSecond,
      databaseQueriesPerEmployee: queriesPerEmployee,
      errorCount: this.metrics.errorCount || 0,
      warningCount: this.metrics.warningCount || 0,
      retryCount: this.metrics.retryCount || 0,
      erganiSubmissionTime: this.metrics.erganiSubmissionTime || 0,
      efkaProcessingTime: this.metrics.efkaProcessingTime || 0,
      aadeReportingTime: this.metrics.aadeReportingTime || 0,
      timestamp: new Date()
    };

    this.generatePerformanceReport(finalMetrics);
    return finalMetrics;
  }

  /**
   * Generate comprehensive performance report
   */
  private generatePerformanceReport(metrics: PayrollPerformanceMetrics): void {
    const category = this.getEmployeeCategory(metrics.employeeCount);
    const benchmark = PayrollPerformanceMonitor.BENCHMARKS[category];
    
    // Performance assessment
    const performanceGrade = this.calculatePerformanceGrade(metrics, benchmark);
    const bottlenecks = this.identifyBottlenecks(metrics);
    const recommendations = this.generateRecommendations(metrics, bottlenecks);

    logger.info('Payroll Performance Report Generated', {
      scopeId: this.scopeId,
      category,
      performanceGrade,
      metrics: {
        totalTime: `${(metrics.totalProcessingTime / 1000).toFixed(2)}s`,
        employeesPerSecond: metrics.employeesPerSecond.toFixed(2),
        peakMemory: `${metrics.peakMemoryUsage.toFixed(2)}MB`,
        databaseQueries: metrics.databaseQueryCount,
        queriesPerEmployee: metrics.databaseQueriesPerEmployee.toFixed(2),
        errorRate: `${((metrics.errorCount / metrics.employeeCount) * 100).toFixed(2)}%`
      },
      bottlenecks,
      recommendations
    });

    // Log performance comparison to benchmarks
    logger.info('Performance Benchmark Comparison', {
      scopeId: this.scopeId,
      benchmark: {
        targetTime: `${(benchmark.targetProcessingTime / 1000).toFixed(2)}s`,
        actualTime: `${(metrics.totalProcessingTime / 1000).toFixed(2)}s`,
        timePerformance: metrics.totalProcessingTime <= benchmark.targetProcessingTime ? 'PASS' : 'FAIL',
        targetEPS: benchmark.targetEmployeesPerSecond,
        actualEPS: metrics.employeesPerSecond.toFixed(2),
        epsPerformance: metrics.employeesPerSecond >= benchmark.targetEmployeesPerSecond ? 'PASS' : 'FAIL',
        targetMemory: `${benchmark.maxMemoryUsage}MB`,
        actualMemory: `${metrics.peakMemoryUsage.toFixed(2)}MB`,
        memoryPerformance: metrics.peakMemoryUsage <= benchmark.maxMemoryUsage ? 'PASS' : 'FAIL'
      }
    });
  }

  /**
   * Calculate overall performance grade
   */
  private calculatePerformanceGrade(
    metrics: PayrollPerformanceMetrics,
    benchmark: PerformanceBenchmarks[keyof PerformanceBenchmarks]
  ): string {
    let score = 0;
    
    // Time performance (40% weight)
    if (metrics.totalProcessingTime <= benchmark.targetProcessingTime) score += 40;
    else if (metrics.totalProcessingTime <= benchmark.targetProcessingTime * 1.5) score += 25;
    else if (metrics.totalProcessingTime <= benchmark.targetProcessingTime * 2) score += 10;
    
    // Throughput performance (30% weight)
    if (metrics.employeesPerSecond >= benchmark.targetEmployeesPerSecond) score += 30;
    else if (metrics.employeesPerSecond >= benchmark.targetEmployeesPerSecond * 0.75) score += 20;
    else if (metrics.employeesPerSecond >= benchmark.targetEmployeesPerSecond * 0.5) score += 10;
    
    // Memory performance (20% weight)
    if (metrics.peakMemoryUsage <= benchmark.maxMemoryUsage) score += 20;
    else if (metrics.peakMemoryUsage <= benchmark.maxMemoryUsage * 1.25) score += 15;
    else if (metrics.peakMemoryUsage <= benchmark.maxMemoryUsage * 1.5) score += 5;
    
    // Error rate (10% weight)
    const errorRate = (metrics.errorCount / metrics.employeeCount) * 100;
    if (errorRate === 0) score += 10;
    else if (errorRate < 1) score += 7;
    else if (errorRate < 5) score += 3;
    
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Identify performance bottlenecks
   */
  private identifyBottlenecks(metrics: PayrollPerformanceMetrics): string[] {
    const bottlenecks: string[] = [];
    const totalTime = metrics.totalProcessingTime;
    
    // Time distribution analysis
    if ((metrics.employeeDataFetchTime / totalTime) > 0.3) {
      bottlenecks.push('Employee data fetch is slow - consider database indexing');
    }
    
    if ((metrics.timesheetDataFetchTime / totalTime) > 0.25) {
      bottlenecks.push('Timesheet data fetch is slow - optimize timesheet queries');
    }
    
    if ((metrics.calculationTime / totalTime) > 0.4) {
      bottlenecks.push('Payroll calculations are slow - consider parallel processing');
    }
    
    if ((metrics.persistenceTime / totalTime) > 0.2) {
      bottlenecks.push('Database persistence is slow - use bulk operations');
    }
    
    // Database efficiency
    if (metrics.databaseQueriesPerEmployee > 5) {
      bottlenecks.push('Too many database queries per employee - implement bulk operations');
    }
    
    // Memory usage
    const category = this.getEmployeeCategory(metrics.employeeCount);
    const benchmark = PayrollPerformanceMonitor.BENCHMARKS[category];
    if (metrics.peakMemoryUsage > benchmark.maxMemoryUsage) {
      bottlenecks.push('High memory usage - implement streaming or batch processing');
    }
    
    // Error rates
    if (metrics.errorCount > metrics.employeeCount * 0.05) {
      bottlenecks.push('High error rate - improve data validation and error handling');
    }
    
    return bottlenecks;
  }

  /**
   * Generate performance improvement recommendations
   */
  private generateRecommendations(
    metrics: PayrollPerformanceMetrics,
    bottlenecks: string[]
  ): string[] {
    const recommendations: string[] = [];
    
    if (bottlenecks.some(b => b.includes('database'))) {
      recommendations.push('Run performance-indexes.sql to add database optimizations');
      recommendations.push('Enable database query logging to identify slow queries');
    }
    
    if (bottlenecks.some(b => b.includes('memory'))) {
      recommendations.push('Implement streaming processing for very large datasets');
      recommendations.push('Reduce batch sizes or enable pagination');
    }
    
    if (bottlenecks.some(b => b.includes('parallel'))) {
      recommendations.push('Increase concurrency limits for parallel processing');
      recommendations.push('Consider using worker threads for CPU-intensive calculations');
    }
    
    if (metrics.employeesPerSecond < 10) {
      recommendations.push('Enable bulk database operations in DatabaseOptimizations');
      recommendations.push('Consider caching frequently accessed reference data');
    }
    
    if (metrics.errorCount > 0) {
      recommendations.push('Review error logs and improve data validation');
      recommendations.push('Implement retry logic for transient failures');
    }
    
    return recommendations;
  }

  /**
   * Get current performance metrics snapshot
   */
  getCurrentMetrics(): Partial<PayrollPerformanceMetrics> {
    this.recordMemorySnapshot();
    
    return {
      scopeId: this.scopeId,
      employeeCount: this.employeeCount,
      totalProcessingTime: Date.now() - this.startTime,
      peakMemoryUsage: Math.max(...this.memorySnapshots),
      averageMemoryUsage: this.memorySnapshots.reduce((a, b) => a + b, 0) / this.memorySnapshots.length,
      databaseQueryCount: this.metrics.databaseQueryCount || 0,
      errorCount: this.metrics.errorCount || 0,
      warningCount: this.metrics.warningCount || 0,
      timestamp: new Date()
    };
  }
}

/**
 * Helper function to create performance monitor for payroll operations
 */
export function createPayrollPerformanceMonitor(
  scopeId: string, 
  employeeCount: number
): PayrollPerformanceMonitor {
  return new PayrollPerformanceMonitor(scopeId, employeeCount);
}

/**
 * Performance testing utility for benchmarking optimizations
 */
export class PayrollPerformanceTester {
  
  /**
   * Run performance test with different employee dataset sizes
   */
  static async runPerformanceTest(
    testSizes: number[] = [100, 500, 1000, 2500, 5000]
  ): Promise<PayrollPerformanceMetrics[]> {
    const results: PayrollPerformanceMetrics[] = [];
    
    for (const size of testSizes) {
      logger.info(`Starting performance test for ${size} employees`);
      
      const monitor = new PayrollPerformanceMonitor(`test-${size}`, size);
      
      // Simulate payroll processing operations
      const employeeFetch = monitor.startOperation('employeeDataFetch');
      await new Promise(resolve => setTimeout(resolve, size * 2)); // Simulate DB time
      employeeFetch();
      
      const timesheetFetch = monitor.startOperation('timesheetDataFetch');
      await new Promise(resolve => setTimeout(resolve, size * 1.5)); // Simulate DB time
      timesheetFetch();
      
      const calculation = monitor.startOperation('calculation');
      await new Promise(resolve => setTimeout(resolve, size * 3)); // Simulate calculation time
      calculation();
      
      const persistence = monitor.startOperation('persistence');
      await new Promise(resolve => setTimeout(resolve, size * 1)); // Simulate persistence time
      persistence();
      
      monitor.recordDatabaseMetrics(size * 3, 100, 5); // Simulate DB metrics
      monitor.recordErrors(Math.floor(size * 0.01), Math.floor(size * 0.05)); // Simulate errors
      
      const finalMetrics = monitor.finalize();
      results.push(finalMetrics);
      
      logger.info(`Performance test completed for ${size} employees`, {
        totalTime: `${(finalMetrics.totalProcessingTime / 1000).toFixed(2)}s`,
        employeesPerSecond: finalMetrics.employeesPerSecond.toFixed(2)
      });
    }
    
    return results;
  }
}