/**
 * Ship Test: Evented Platform - Payroll to GL Integration
 * 
 * Validates the complete flow:
 * 1. payroll.run.finalized event → Event Queue → GL Auto-Post → <30s completion
 * 2. Idempotency and replay safety
 * 3. Zero CSV integrations (webhook-driven GL posting)
 * 4. Performance compliance and monitoring
 * 
 * Definition of Done:
 * - Payroll finalization triggers GL posting within 30 seconds
 * - Idempotency prevents duplicate processing
 * - Events are replay-safe with proper error handling
 * - Comprehensive monitoring and metrics available
 */

import { EventQueueService } from "../services/EventQueueService";

/**
 * Ship Test Runner - Validates Evented Platform capabilities
 */
export class EventedPlatformShipTest {
  private eventQueueService: EventQueueService;
  private testResults: Array<{ test: string; passed: boolean; message: string; duration: number }> = [];

  constructor() {
    this.eventQueueService = EventQueueService.getInstance();
  }

  /**
   * Run all ship tests
   */
  public async runShipTests(): Promise<{
    passed: boolean;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    results: Array<{ test: string; passed: boolean; message: string; duration: number }>;
    summary: string;
  }> {
    console.log("🚀 Starting Evented Platform Ship Tests");
    console.log("=" .repeat(60));

    // Core functionality tests
    await this.testEventEnqueuing();
    await this.testPerformanceTarget();
    await this.testIdempotency();
    await this.testGLIntegration();
    await this.testReplaySafety();
    await this.testErrorHandling();
    await this.testMonitoring();
    await this.testZeroCsvIntegration();

    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = this.testResults.length - passedTests;
    const passed = failedTests === 0;

    const summary = `${passedTests}/${this.testResults.length} tests passed${
      !passed ? ` (${failedTests} failed)` : ""
    }`;

    console.log("\n" + "=" .repeat(60));
    console.log(`📊 Ship Test Results: ${summary}`);
    console.log(passed ? "✅ SHIP TEST PASSED - Ready for Production" : "❌ SHIP TEST FAILED");

    return {
      passed,
      totalTests: this.testResults.length,
      passedTests,
      failedTests,
      results: this.testResults,
      summary,
    };
  }

  /**
   * Test: Event enqueuing works correctly
   */
  private async testEventEnqueuing(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const payrollData = {
        payrollRunId: "PR-SHIP-001",
        period: "2024-12",
        finalizedBy: "system",
        totalGrossPay: 25000,
        employeeCount: 15,
        autoPostGL: true,
      };

      const event = await this.eventQueueService.enqueueEvent(
        "payroll.run.finalized",
        payrollData,
        {
          idempotencyKey: `ship-test-enqueue-${Date.now()}`,
          priority: 10,
        }
      );

      const success = event && 
        event.eventType === "payroll.run.finalized" && 
        event.status === "pending" &&
        event.priority === 10;

      this.addTestResult(
        "Event Enqueuing",
        success,
        success ? "Events enqueue successfully with correct metadata" : "Event enqueuing failed",
        Date.now() - startTime
      );
    } catch (error) {
      this.addTestResult(
        "Event Enqueuing",
        false,
        `Failed with error: ${error}`,
        Date.now() - startTime
      );
    }
  }

  /**
   * Test: Performance target (<30s) is met
   */
  private async testPerformanceTarget(): Promise<void> {
    const startTime = Date.now();

    try {
      const event = await this.eventQueueService.enqueueEvent(
        "payroll.run.finalized",
        {
          payrollRunId: "PR-PERF-TEST",
          period: "2024-12",
          finalizedBy: "performance-test",
          totalGrossPay: 15000,
          employeeCount: 8,
        },
        {
          idempotencyKey: `ship-perf-test-${Date.now()}`,
          priority: 10,
        }
      );

      // Wait for processing with timeout
      const completed = await this.waitForEventCompletion(event.eventId, 35000);
      const processingTime = Date.now() - startTime;

      const success = completed && processingTime < 30000;

      this.addTestResult(
        "Performance Target (<30s)",
        success,
        success 
          ? `Completed in ${processingTime}ms (under 30s target)`
          : `Processing took ${processingTime}ms (exceeded 30s target)`,
        processingTime
      );
    } catch (error) {
      this.addTestResult(
        "Performance Target (<30s)",
        false,
        `Failed with error: ${error}`,
        Date.now() - startTime
      );
    }
  }

  /**
   * Test: Idempotency prevents duplicate processing
   */
  private async testIdempotency(): Promise<void> {
    const startTime = Date.now();

    try {
      const idempotencyKey = `ship-idempotency-${Date.now()}`;

      // Submit same event twice
      const event1 = await this.eventQueueService.enqueueEvent(
        "payroll.run.finalized",
        {
          payrollRunId: "PR-IDEM-001",
          period: "2024-12",
          totalGrossPay: 10000,
          employeeCount: 5,
        },
        { idempotencyKey }
      );

      const event2 = await this.eventQueueService.enqueueEvent(
        "payroll.run.finalized",
        {
          payrollRunId: "PR-IDEM-002",
          period: "2024-12", 
          totalGrossPay: 99999, // Different data
          employeeCount: 99,
        },
        { idempotencyKey }
      );

      const success = event1.eventId === event2.eventId && 
                     event2.payload.totalGrossPay === 10000; // Original preserved

      this.addTestResult(
        "Idempotency",
        success,
        success ? "Duplicate events prevented, original data preserved" : "Idempotency check failed",
        Date.now() - startTime
      );
    } catch (error) {
      this.addTestResult(
        "Idempotency",
        false,
        `Failed with error: ${error}`,
        Date.now() - startTime
      );
    }
  }

  /**
   * Test: GL Integration works correctly
   */
  private async testGLIntegration(): Promise<void> {
    const startTime = Date.now();

    try {
      const event = await this.eventQueueService.enqueueEvent(
        "payroll.run.finalized",
        {
          payrollRunId: "PR-GL-TEST",
          period: "2024-12",
          finalizedBy: "gl-test",
          totalGrossPay: 20000,
          employeeCount: 10,
        },
        {
          idempotencyKey: `ship-gl-test-${Date.now()}`,
        }
      );

      const completed = await this.waitForEventCompletion(event.eventId, 30000);
      const completedEvent = this.eventQueueService.getEvent(event.eventId);

      const success = completed && 
                     completedEvent?.status === "completed" &&
                     completedEvent?.processingResult?.success === true &&
                     completedEvent?.processingResult?.result?.journalId;

      this.addTestResult(
        "GL Integration",
        success,
        success 
          ? `GL journal generated: ${completedEvent?.processingResult?.result?.journalId}`
          : "GL integration failed or incomplete",
        Date.now() - startTime
      );
    } catch (error) {
      this.addTestResult(
        "GL Integration",
        false,
        `Failed with error: ${error}`,
        Date.now() - startTime
      );
    }
  }

  /**
   * Test: Replay safety
   */
  private async testReplaySafety(): Promise<void> {
    const startTime = Date.now();

    try {
      const event = await this.eventQueueService.enqueueEvent(
        "payroll.run.finalized",
        {
          payrollRunId: "PR-REPLAY-TEST",
          period: "2024-12",
          totalGrossPay: 12000,
          employeeCount: 6,
        },
        {
          idempotencyKey: `ship-replay-test-${Date.now()}`,
          maxAttempts: 3,
        }
      );

      // Wait for initial completion
      await this.waitForEventCompletion(event.eventId, 30000);

      // Attempt replay
      const replayResult = await this.eventQueueService.retryEvent(event.eventId);
      
      // For completed events, retry should return false (can't retry completed events)
      const success = replayResult === false; // Expected behavior for completed events

      this.addTestResult(
        "Replay Safety",
        success,
        success ? "Replay protection working - completed events can't be retried" : "Replay safety check failed",
        Date.now() - startTime
      );
    } catch (error) {
      this.addTestResult(
        "Replay Safety",
        false,
        `Failed with error: ${error}`,
        Date.now() - startTime
      );
    }
  }

  /**
   * Test: Error handling and resilience
   */
  private async testErrorHandling(): Promise<void> {
    const startTime = Date.now();

    try {
      // Test with invalid payload (missing required payrollRunId)
      const event = await this.eventQueueService.enqueueEvent(
        "payroll.run.finalized",
        {
          // Missing payrollRunId - should cause error
          period: "2024-12",
          totalGrossPay: 5000,
          employeeCount: 3,
        },
        {
          idempotencyKey: `ship-error-test-${Date.now()}`,
          maxAttempts: 2,
        }
      );

      // Wait for processing to fail
      await this.waitForEventCompletion(event.eventId, 15000);
      const completedEvent = this.eventQueueService.getEvent(event.eventId);

      // Should fail due to missing payrollRunId
      const success = completedEvent?.status === "failed" || completedEvent?.status === "dead_letter";

      this.addTestResult(
        "Error Handling",
        success,
        success 
          ? `Error handling working - event failed as expected: ${completedEvent?.errorMessage}`
          : "Error handling failed - event should have failed",
        Date.now() - startTime
      );
    } catch (error) {
      this.addTestResult(
        "Error Handling",
        false,
        `Failed with error: ${error}`,
        Date.now() - startTime
      );
    }
  }

  /**
   * Test: Monitoring and metrics
   */
  private async testMonitoring(): Promise<void> {
    const startTime = Date.now();

    try {
      // Get current status
      const status = this.eventQueueService.getQueueStatus();

      const success = status &&
                     typeof status.totalEvents === "number" &&
                     typeof status.metrics.eventsProcessed === "number" &&
                     typeof status.metrics.successRate === "number" &&
                     typeof status.metrics.averageProcessingTime === "number";

      this.addTestResult(
        "Monitoring & Metrics",
        success,
        success 
          ? `Metrics available - processed: ${status.metrics.eventsProcessed}, success rate: ${status.metrics.successRate.toFixed(1)}%`
          : "Monitoring metrics not available",
        Date.now() - startTime
      );
    } catch (error) {
      this.addTestResult(
        "Monitoring & Metrics",
        false,
        `Failed with error: ${error}`,
        Date.now() - startTime
      );
    }
  }

  /**
   * Test: Zero CSV integration (direct GL posting)
   */
  private async testZeroCsvIntegration(): Promise<void> {
    const startTime = Date.now();

    try {
      const event = await this.eventQueueService.enqueueEvent(
        "payroll.run.finalized",
        {
          payrollRunId: "PR-ZERO-CSV",
          period: "2024-12",
          finalizedBy: "zero-csv-test",
          totalGrossPay: 8000,
          employeeCount: 4,
        },
        {
          idempotencyKey: `ship-zero-csv-${Date.now()}`,
        }
      );

      const completed = await this.waitForEventCompletion(event.eventId, 30000);
      const completedEvent = this.eventQueueService.getEvent(event.eventId);

      // Success means GL journal was created directly (no CSV intermediate)
      const success = completed &&
                     completedEvent?.processingResult?.result?.journalId &&
                     completedEvent?.processingResult?.result?.status === "posted";

      this.addTestResult(
        "Zero CSV Integration",
        success,
        success 
          ? "Direct GL posting successful - no CSV intermediates required"
          : "Zero CSV integration failed",
        Date.now() - startTime
      );
    } catch (error) {
      this.addTestResult(
        "Zero CSV Integration",
        false,
        `Failed with error: ${error}`,
        Date.now() - startTime
      );
    }
  }

  /**
   * Wait for event to complete processing
   */
  private async waitForEventCompletion(eventId: string, timeoutMs: number): Promise<boolean> {
    const startTime = Date.now();

    return new Promise((resolve) => {
      const checkStatus = () => {
        const event = this.eventQueueService.getEvent(eventId);
        
        if (event?.status === "completed") {
          resolve(true);
        } else if (event?.status === "failed" || event?.status === "dead_letter") {
          resolve(false);
        } else if (Date.now() - startTime > timeoutMs) {
          console.warn(`Timeout waiting for event ${eventId}`);
          resolve(false);
        } else {
          setTimeout(checkStatus, 200);
        }
      };

      // Start checking after a brief delay
      setTimeout(checkStatus, 500);
    });
  }

  /**
   * Add test result
   */
  private addTestResult(test: string, passed: boolean, message: string, duration: number): void {
    this.testResults.push({ test, passed, message, duration });
    
    const status = passed ? "✅ PASS" : "❌ FAIL";
    const durationStr = `(${duration}ms)`;
    
    console.log(`${status} ${test}: ${message} ${durationStr}`);
  }
}

// Export test runner instance
export const shipTest = new EventedPlatformShipTest();

// Export function for API usage
export async function runEventedPlatformShipTest() {
  return await shipTest.runShipTests();
}