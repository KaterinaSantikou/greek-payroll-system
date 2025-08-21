/**
 * Database Query Optimization Service
 * Real-time query monitoring and optimization recommendations
 */

import { db } from '../db';
import { productionPerformanceService } from './ProductionPerformanceService';
import { errorTrackingService } from './ErrorTrackingService';

interface QueryAnalysis {
  query: string;
  duration: number;
  rows: number;
  executionPlan?: any;
  tableName?: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'OTHER';
  indexUsage?: string[];
  suggestions?: string[];
}

interface OptimizationSuggestion {
  type: 'index' | 'query_rewrite' | 'schema_change' | 'caching';
  priority: 'high' | 'medium' | 'low';
  description: string;
  query?: string;
  impact: string;
  implementation: string;
}

export class DatabaseOptimizationService {
  private slowQueries: QueryAnalysis[] = [];
  private maxSlowQueries = 100;
  private indexUsageStats = new Map<string, { hits: number; misses: number }>();
  private queryCache = new Map<string, { result: any; timestamp: number; hits: number }>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.startOptimizationMonitoring();
  }

  /**
   * Start monitoring for optimization opportunities
   */
  private startOptimizationMonitoring(): void {
    // Enable query logging in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔍 Database optimization monitoring started');
    }
  }

  /**
   * Monitor and analyze a database query
   */
  async monitorQuery<T>(
    queryPromise: Promise<T>,
    queryString: string,
    context?: { operation?: string; table?: string }
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await queryPromise;
      const duration = performance.now() - startTime;
      
      // Analyze the query
      const analysis = await this.analyzeQuery(queryString, duration, result, context);
      
      // Record performance metrics
      productionPerformanceService.recordDatabaseQuery({
        query: queryString,
        duration,
        rowCount: Array.isArray(result) ? result.length : undefined
      });

      // Check for optimization opportunities
      if (duration > 1000) { // Slow query threshold
        await this.handleSlowQuery(analysis);
      }

      return result;
      
    } catch (error) {
      const duration = performance.now() - startTime;
      
      // Record error metrics
      productionPerformanceService.recordDatabaseQuery({
        query: queryString,
        duration,
        error: true
      });

      // Capture error with context
      errorTrackingService.captureError(error as Error, {
        tags: {
          query_type: context?.operation || 'unknown',
          table: context?.table || 'unknown'
        },
        extra: {
          query: queryString.substring(0, 200),
          duration
        }
      });

      throw error;
    }
  }

  /**
   * Analyze query performance and structure
   */
  private async analyzeQuery(
    query: string,
    duration: number,
    result: any,
    context?: { operation?: string; table?: string }
  ): Promise<QueryAnalysis> {
    const analysis: QueryAnalysis = {
      query: query.trim(),
      duration,
      rows: Array.isArray(result) ? result.length : 1,
      operation: this.getQueryOperation(query),
      tableName: context?.table || this.extractTableName(query)
    };

    // Get execution plan for slow queries
    if (duration > 500 && analysis.operation === 'SELECT') {
      try {
        const explainResult = await db.execute(`EXPLAIN (ANALYZE, BUFFERS) ${query}`);
        analysis.executionPlan = explainResult.rows;
        analysis.suggestions = this.generateOptimizationSuggestions(explainResult.rows, query);
      } catch (error) {
        // Explain might fail for complex queries
        console.warn('Failed to get execution plan:', error);
      }
    }

    return analysis;
  }

  /**
   * Handle slow query detection
   */
  private async handleSlowQuery(analysis: QueryAnalysis): Promise<void> {
    // Store slow query
    this.slowQueries.push(analysis);
    if (this.slowQueries.length > this.maxSlowQueries) {
      this.slowQueries.shift();
    }

    // Alert for very slow queries
    if (analysis.duration > 5000) {
      errorTrackingService.captureMessage(
        `Very slow database query detected: ${analysis.duration}ms`,
        'warning',
        {
          tags: {
            operation: analysis.operation,
            table: analysis.tableName || 'unknown'
          },
          extra: {
            query: analysis.query.substring(0, 200),
            duration: analysis.duration,
            rows: analysis.rows,
            suggestions: analysis.suggestions
          }
        }
      );
    }

    // Log slow query for analysis
    console.warn(`🐌 Slow query detected: ${analysis.duration}ms - ${analysis.operation} ${analysis.tableName}`);
    if (analysis.suggestions && analysis.suggestions.length > 0) {
      console.warn('💡 Optimization suggestions:', analysis.suggestions);
    }
  }

  /**
   * Generate optimization suggestions based on execution plan
   */
  private generateOptimizationSuggestions(executionPlan: any[], query: string): string[] {
    const suggestions: string[] = [];
    
    if (!executionPlan || executionPlan.length === 0) return suggestions;

    const planText = executionPlan.map(row => Object.values(row).join(' ')).join('\n').toLowerCase();

    // Check for sequential scans
    if (planText.includes('seq scan')) {
      suggestions.push('Consider adding an index for columns used in WHERE clauses');
    }

    // Check for sorting without index
    if (planText.includes('sort') && !planText.includes('index')) {
      suggestions.push('Consider adding an index for ORDER BY columns');
    }

    // Check for nested loops on large datasets
    if (planText.includes('nested loop') && planText.includes('rows=')) {
      const rowsMatch = planText.match(/rows=(\d+)/);
      if (rowsMatch && parseInt(rowsMatch[1]) > 1000) {
        suggestions.push('Consider optimizing JOIN conditions or adding appropriate indexes');
      }
    }

    // Check for missing statistics
    if (planText.includes('never executed')) {
      suggestions.push('Update table statistics with ANALYZE command');
    }

    // Check for large temporary files
    if (planText.includes('temp')) {
      suggestions.push('Query requires temporary storage - consider adding memory or optimizing query');
    }

    return suggestions;
  }

  /**
   * Get comprehensive optimization report
   */
  getOptimizationReport(): {
    slowQueries: QueryAnalysis[];
    recommendations: OptimizationSuggestion[];
    performance: {
      avgQueryTime: number;
      slowQueryCount: number;
      mostProblematicTables: Array<{ table: string; avgDuration: number; count: number }>;
    };
  } {
    const recommendations = this.generateRecommendations();
    const tableStats = this.calculateTablePerformance();
    
    const totalDuration = this.slowQueries.reduce((sum, q) => sum + q.duration, 0);
    const avgQueryTime = this.slowQueries.length > 0 ? totalDuration / this.slowQueries.length : 0;

    return {
      slowQueries: this.slowQueries.slice(-20), // Last 20 slow queries
      recommendations,
      performance: {
        avgQueryTime,
        slowQueryCount: this.slowQueries.length,
        mostProblematicTables: tableStats
      }
    };
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(): OptimizationSuggestion[] {
    const recommendations: OptimizationSuggestion[] = [];
    
    // Analyze slow queries for patterns
    const tableFrequency = new Map<string, number>();
    const operationFrequency = new Map<string, number>();
    
    this.slowQueries.forEach(query => {
      if (query.tableName) {
        tableFrequency.set(query.tableName, (tableFrequency.get(query.tableName) || 0) + 1);
      }
      operationFrequency.set(query.operation, (operationFrequency.get(query.operation) || 0) + 1);
    });

    // Recommend indexes for frequently slow tables
    Array.from(tableFrequency.entries())
      .filter(([_, count]) => count >= 3)
      .forEach(([table, count]) => {
        recommendations.push({
          type: 'index',
          priority: 'high',
          description: `Table "${table}" appears in ${count} slow queries`,
          impact: 'High - Could significantly improve query performance',
          implementation: `Review WHERE clauses and JOIN conditions for ${table} table and add appropriate indexes`
        });
      });

    // Recommend query optimization for frequent SELECT operations
    if ((operationFrequency.get('SELECT') || 0) > 5) {
      recommendations.push({
        type: 'query_rewrite',
        priority: 'medium',
        description: 'Multiple slow SELECT queries detected',
        impact: 'Medium - Could reduce overall response time',
        implementation: 'Review SELECT queries for unnecessary columns, optimize WHERE clauses, and consider pagination'
      });
    }

    // Recommend caching for read-heavy workloads
    const selectCount = operationFrequency.get('SELECT') || 0;
    const totalQueries = Array.from(operationFrequency.values()).reduce((sum, count) => sum + count, 0);
    
    if (selectCount / totalQueries > 0.8) {
      recommendations.push({
        type: 'caching',
        priority: 'medium',
        description: 'High read-to-write ratio detected',
        impact: 'High - Could dramatically reduce database load',
        implementation: 'Implement Redis caching for frequently accessed data'
      });
    }

    return recommendations;
  }

  /**
   * Calculate performance statistics by table
   */
  private calculateTablePerformance(): Array<{ table: string; avgDuration: number; count: number }> {
    const tableStats = new Map<string, { totalDuration: number; count: number }>();
    
    this.slowQueries.forEach(query => {
      if (query.tableName) {
        const stats = tableStats.get(query.tableName) || { totalDuration: 0, count: 0 };
        stats.totalDuration += query.duration;
        stats.count++;
        tableStats.set(query.tableName, stats);
      }
    });

    return Array.from(tableStats.entries())
      .map(([table, stats]) => ({
        table,
        avgDuration: stats.totalDuration / stats.count,
        count: stats.count
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 5);
  }

  /**
   * Extract query operation type
   */
  private getQueryOperation(query: string): QueryAnalysis['operation'] {
    const operation = query.trim().toUpperCase().split(' ')[0];
    switch (operation) {
      case 'SELECT': return 'SELECT';
      case 'INSERT': return 'INSERT';
      case 'UPDATE': return 'UPDATE';
      case 'DELETE': return 'DELETE';
      default: return 'OTHER';
    }
  }

  /**
   * Extract table name from query
   */
  private extractTableName(query: string): string | undefined {
    const normalizedQuery = query.toLowerCase().replace(/\s+/g, ' ');
    
    const patterns = [
      /from\s+["']?([a-zA-Z_][a-zA-Z0-9_]*)["']?/,
      /into\s+["']?([a-zA-Z_][a-zA-Z0-9_]*)["']?/,
      /update\s+["']?([a-zA-Z_][a-zA-Z0-9_]*)["']?/
    ];

    for (const pattern of patterns) {
      const match = normalizedQuery.match(pattern);
      if (match) return match[1];
    }

    return undefined;
  }

  /**
   * Health check
   */
  healthCheck(): { status: 'healthy' | 'unhealthy'; details: any } {
    const report = this.getOptimizationReport();
    const isHealthy = report.performance.avgQueryTime < 1000;

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      details: {
        avgQueryTime: report.performance.avgQueryTime,
        slowQueryCount: report.performance.slowQueryCount,
        recommendationCount: report.recommendations.length,
        monitoring: true
      }
    };
  }
}

// Export singleton instance
export const databaseOptimizationService = new DatabaseOptimizationService();