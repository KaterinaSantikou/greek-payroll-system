/**
 * Simple Distributed Job Queue Service using BullMQ
 * Handles background jobs with Redis locks and idempotency
 */

import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';

// Simple Redlock implementation for distributed locking
class SimpleRedlock {
  private redis: IORedis;
  
  constructor(redis: IORedis) {
    this.redis = redis;
  }
  
  async acquire(keys: string[], ttl: number): Promise<{ key: string; release: () => Promise<void> }> {
    const key = keys[0];
    const lockValue = `lock:${Date.now()}:${Math.random()}`;
    
    // Try to acquire lock
    const result = await this.redis.set(key, lockValue, 'PX', ttl, 'NX');
    
    if (result !== 'OK') {
      throw new Error(`Failed to acquire lock: ${key}`);
    }
    
    return {
      key,
      release: async () => {
        // Only release if we own the lock
        const script = `
          if redis.call("GET", KEYS[1]) == ARGV[1] then
            return redis.call("DEL", KEYS[1])
          else
            return 0
          end
        `;
        await this.redis.eval(script, 1, key, lockValue);
      }
    };
  }
}

// Job Types
export interface SEPAGenerationJobData {
  payrollRunId: string;
  idempotencyKey: string;
  userId: string;
  timestamp: Date;
}

export interface PayrollProcessingJobData {
  payrollRunId: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  employeeIds: string[];
  idempotencyKey: string;
}

export interface ERGANISyncJobData {
  employeeId: string;
  punchEvents: any[];
  idempotencyKey: string;
}

export class SimpleJobQueueService {
  private redis: IORedis;
  private redlock: SimpleRedlock;
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();

  // Queue names
  public static readonly QUEUES = {
    SEPA_GENERATION: 'sepa-generation',
    PAYROLL_PROCESSING: 'payroll-processing',
    ERGANI_SYNC: 'ergani-sync'
  } as const;

  constructor() {
    this.redis = new IORedis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: null, // Required for BullMQ blocking operations
      lazyConnect: true,
    });

    this.redlock = new SimpleRedlock(this.redis);
    this.initializeQueues();
    this.setupWorkers();
  }

  private initializeQueues(): void {
    // Initialize all queues
    Object.values(SimpleJobQueueService.QUEUES).forEach(queueName => {
      this.queues.set(queueName, new Queue(queueName, {
        connection: this.redis,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 10,
          removeOnFail: 5,
        },
      }));
    });

    console.log('✅ Job queues initialized');
  }

  private setupWorkers(): void {
    // SEPA Generation Worker
    const sepaWorker = new Worker(
      SimpleJobQueueService.QUEUES.SEPA_GENERATION,
      this.processSEPAGeneration.bind(this),
      { connection: this.redis, concurrency: 5 }
    );

    // Payroll Processing Worker  
    const payrollWorker = new Worker(
      SimpleJobQueueService.QUEUES.PAYROLL_PROCESSING,
      this.processPayrollJob.bind(this),
      { connection: this.redis, concurrency: 3 }
    );

    // ERGANI Sync Worker
    const erganiWorker = new Worker(
      SimpleJobQueueService.QUEUES.ERGANI_SYNC,
      this.processERGANISync.bind(this),
      { connection: this.redis, concurrency: 10 }
    );

    this.workers.set(SimpleJobQueueService.QUEUES.SEPA_GENERATION, sepaWorker);
    this.workers.set(SimpleJobQueueService.QUEUES.PAYROLL_PROCESSING, payrollWorker);
    this.workers.set(SimpleJobQueueService.QUEUES.ERGANI_SYNC, erganiWorker);

    console.log('✅ Job workers initialized');
  }

  /**
   * Add SEPA generation job with idempotency and locking
   */
  async addSEPAGenerationJob(data: SEPAGenerationJobData): Promise<Job<SEPAGenerationJobData> | null> {
    const idempotencyKey = `idempotent:sepa:${data.idempotencyKey}`;

    try {
      // Check idempotency - if already processed, return null
      const existingResult = await this.redis.get(idempotencyKey);
      if (existingResult) {
        console.log(`⚡ SEPA job already processed: ${data.payrollRunId}`);
        return null;
      }

      const queue = this.queues.get(SimpleJobQueueService.QUEUES.SEPA_GENERATION);
      if (!queue) throw new Error('SEPA generation queue not initialized');

      return await queue.add('generate-sepa', data, {
        jobId: data.idempotencyKey,
        priority: 1,
      });

    } catch (error) {
      console.error('Error adding SEPA generation job:', error);
      throw error;
    }
  }

  /**
   * Process SEPA generation with distributed lock
   */
  private async processSEPAGeneration(job: Job<SEPAGenerationJobData>): Promise<any> {
    const { payrollRunId, idempotencyKey } = job.data;
    const lockKey = `lock:sepa-generation:${payrollRunId}`;
    const idempotencyResultKey = `idempotent:sepa:${idempotencyKey}`;

    console.log(`🔄 Processing SEPA generation for payroll run: ${payrollRunId}`);

    let lock;
    try {
      // Acquire distributed lock
      lock = await this.redlock.acquire([lockKey], 30000);
      
      // Double-check idempotency after acquiring lock
      const existingResult = await this.redis.get(idempotencyResultKey);
      if (existingResult) {
        console.log(`⚡ SEPA already generated during lock wait: ${payrollRunId}`);
        return JSON.parse(existingResult);
      }

      await job.updateProgress(25);

      // Mock SEPA generation - replace with real implementation
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate work
      
      const sepaResult = {
        fileUrl: `/api/files/sepa/${payrollRunId}.xml`,
        status: 'generated',
        payrollRunId,
        timestamp: new Date(),
        payments: Math.floor(Math.random() * 100) + 1
      };

      await job.updateProgress(75);

      // Store result with 24-hour expiration
      await this.redis.setex(idempotencyResultKey, 86400, JSON.stringify(sepaResult));

      await job.updateProgress(100);
      console.log(`✅ SEPA file generated: ${payrollRunId}`);
      
      return sepaResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ SEPA generation failed for ${payrollRunId}:`, errorMessage);
      throw error;
    } finally {
      if (lock) {
        try {
          await lock.release();
        } catch (releaseError) {
          console.warn('Error releasing SEPA generation lock:', releaseError);
        }
      }
    }
  }

  /**
   * Add payroll processing job
   */
  async addPayrollProcessingJob(data: PayrollProcessingJobData): Promise<Job<PayrollProcessingJobData>> {
    const queue = this.queues.get(SimpleJobQueueService.QUEUES.PAYROLL_PROCESSING);
    if (!queue) throw new Error('Payroll processing queue not initialized');

    return await queue.add('process-payroll', data, {
      jobId: data.idempotencyKey,
      priority: 5,
    });
  }

  /**
   * Process payroll calculation job with distributed lock
   */
  private async processPayrollJob(job: Job<PayrollProcessingJobData>): Promise<any> {
    const { payrollRunId, employeeIds } = job.data;
    const lockKey = `lock:payroll-processing:${payrollRunId}`;

    console.log(`🔄 Processing payroll for ${employeeIds.length} employees`);

    let lock;
    try {
      lock = await this.redlock.acquire([lockKey], 120000); // 2 minute lock
      
      await job.updateProgress(10);

      const results = [];
      for (let i = 0; i < employeeIds.length; i++) {
        const employeeId = employeeIds[i];
        
        // Mock payroll calculation - replace with real implementation
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate work
        
        const payrollResult = {
          employeeId,
          grossPay: Math.floor(Math.random() * 5000) + 2000,
          netPay: Math.floor(Math.random() * 3500) + 1500,
          taxes: Math.floor(Math.random() * 1000) + 300,
          deductions: Math.floor(Math.random() * 500) + 100,
          status: 'calculated'
        };
        
        results.push(payrollResult);

        const progress = 10 + (80 * (i + 1) / employeeIds.length);
        await job.updateProgress(progress);
      }

      await job.updateProgress(100);
      console.log(`✅ Payroll processed for ${employeeIds.length} employees`);
      
      return { employeeCount: employeeIds.length, results };

    } catch (error) {
      console.error(`❌ Payroll processing failed:`, error);
      throw error;
    } finally {
      if (lock) {
        try {
          await lock.release();
        } catch (releaseError) {
          console.warn('Error releasing payroll processing lock:', releaseError);
        }
      }
    }
  }

  /**
   * Add ERGANI sync job
   */
  async addERGANISyncJob(data: ERGANISyncJobData): Promise<Job<ERGANISyncJobData>> {
    const queue = this.queues.get(SimpleJobQueueService.QUEUES.ERGANI_SYNC);
    if (!queue) throw new Error('ERGANI sync queue not initialized');

    return await queue.add('sync-ergani', data, {
      jobId: data.idempotencyKey,
      priority: 3,
      delay: 5000, // 5 second delay to batch updates
    });
  }

  /**
   * Process ERGANI synchronization with distributed lock
   */
  private async processERGANISync(job: Job<ERGANISyncJobData>): Promise<any> {
    const { employeeId, punchEvents } = job.data;
    const lockKey = `lock:ergani-sync:${employeeId}`;

    console.log(`🔄 Syncing ${punchEvents.length} punch events to ERGANI for employee: ${employeeId}`);

    let lock;
    try {
      lock = await this.redlock.acquire([lockKey], 60000); // 1 minute lock
      
      await job.updateProgress(20);

      // Mock ERGANI sync - replace with real implementation
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      
      await job.updateProgress(50);

      const syncResult = {
        employeeId,
        eventsSynced: punchEvents.length,
        status: 'synced',
        timestamp: new Date(),
        erganiId: `ERG-${Date.now()}`
      };

      await job.updateProgress(100);
      console.log(`✅ ERGANI sync completed for employee: ${employeeId}`);
      
      return syncResult;

    } catch (error) {
      console.error(`❌ ERGANI sync failed for employee ${employeeId}:`, error);
      throw error;
    } finally {
      if (lock) {
        try {
          await lock.release();
        } catch (releaseError) {
          console.warn('Error releasing ERGANI sync lock:', releaseError);
        }
      }
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(queueName: string, jobId: string): Promise<any> {
    const queue = this.queues.get(queueName);
    if (!queue) throw new Error(`Queue ${queueName} not found`);

    const job = await queue.getJob(jobId);
    if (!job) return null;

    return {
      id: job.id,
      name: job.name,
      data: job.data,
      progress: job.progress,
      failedReason: job.failedReason,
      finishedOn: job.finishedOn,
      processedOn: job.processedOn,
      returnvalue: job.returnvalue,
      attemptsMade: job.attemptsMade,
    };
  }

  /**
   * Clean up and close connections
   */
  async shutdown(): Promise<void> {
    console.log('🔄 Shutting down job queue service...');

    await Promise.all(Array.from(this.workers.values()).map(worker => worker.close()));
    await Promise.all(Array.from(this.queues.values()).map(queue => queue.close()));
    await this.redis.quit();
    
    console.log('✅ Job queue service shut down completed');
  }
}

// Singleton instance
export const jobQueueService = new SimpleJobQueueService();