/**
 * Root Cause Analysis Service
 * Provides formal RCA framework with templates and structured processes
 */

import { db } from '../db';
import {
  rcaAnalyses,
  rcaFindings,
  rcaActionItems,
  rcaTimelines,
  statusPageIncidents,
  type RCAAnalysis,
  type RCAFinding,
  type RCAActionItem,
  type RCATimeline,
  type InsertRCAAnalysis,
  type InsertRCAFinding,
  type InsertRCAActionItem,
  type InsertRCATimeline,
} from '@shared/schema';
import { eq, desc, and, gte, lte, sql, or, isNull, not } from 'drizzle-orm';
import { EventEmitter } from 'events';

export type RCAMethodology = 
  | 'five_whys'
  | 'fishbone_ishikawa'
  | 'timeline_analysis'
  | 'fault_tree_analysis'
  | 'barrier_analysis'
  | 'change_analysis'
  | 'human_factors_analysis';

export type RCAStatus = 'initiated' | 'in_progress' | 'review' | 'approved' | 'completed' | 'archived';

export type RCASeverity = 'low' | 'medium' | 'high' | 'critical';

export type ActionItemPriority = 'low' | 'medium' | 'high' | 'critical';

export type ActionItemStatus = 'open' | 'in_progress' | 'completed' | 'verified' | 'cancelled';

export interface RCATemplate {
  methodology: RCAMethodology;
  name: string;
  description: string;
  sections: RCASection[];
  estimatedDuration: number; // in minutes
  requiredRoles: string[];
  artifacts: string[];
}

export interface RCASection {
  id: string;
  title: string;
  description: string;
  fields: RCAField[];
  required: boolean;
  order: number;
}

export interface RCAField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'date' | 'number' | 'boolean' | 'timeline' | 'causation_map';
  placeholder?: string;
  options?: string[];
  required: boolean;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

export interface RCAProcess {
  id: string;
  methodology: RCAMethodology;
  status: RCAStatus;
  facilitator: string;
  participants: string[];
  startedAt: Date;
  estimatedCompletionAt?: Date;
  completedAt?: Date;
  currentStep: number;
  totalSteps: number;
}

export interface RCAResult {
  analysis: RCAAnalysis;
  findings: RCAFinding[];
  actionItems: RCAActionItem[];
  timeline?: RCATimeline[];
  effectiveness: {
    completeness: number;
    quality: number;
    actionability: number;
    overall: number;
  };
}

export class RootCauseAnalysisService extends EventEmitter {
  private static instance: RootCauseAnalysisService;
  private templates: Map<RCAMethodology, RCATemplate> = new Map();

  constructor() {
    super();
    this.initializeTemplates();
  }

  public static getInstance(): RootCauseAnalysisService {
    if (!RootCauseAnalysisService.instance) {
      RootCauseAnalysisService.instance = new RootCauseAnalysisService();
    }
    return RootCauseAnalysisService.instance;
  }

  private initializeTemplates(): void {
    // Five Whys Template
    this.templates.set('five_whys', {
      methodology: 'five_whys',
      name: '5 Whys Analysis',
      description: 'Simple iterative technique to explore cause-and-effect relationships',
      estimatedDuration: 45,
      requiredRoles: ['facilitator', 'subject_matter_expert'],
      artifacts: ['problem_statement', 'why_sequence', 'root_cause', 'action_plan'],
      sections: [
        {
          id: 'problem_definition',
          title: 'Problem Definition',
          description: 'Clearly define the problem that occurred',
          required: true,
          order: 1,
          fields: [
            {
              id: 'incident_summary',
              label: 'Incident Summary',
              type: 'textarea',
              placeholder: 'Provide a clear, concise description of what happened',
              required: true,
              validation: { minLength: 50, maxLength: 500 }
            },
            {
              id: 'impact_assessment',
              label: 'Impact Assessment',
              type: 'textarea',
              placeholder: 'Describe the impact on users, systems, and business',
              required: true
            },
            {
              id: 'incident_timeline',
              label: 'When did this occur?',
              type: 'date',
              required: true
            }
          ]
        },
        {
          id: 'five_whys_analysis',
          title: '5 Whys Sequence',
          description: 'Ask "why" successively to drill down to root causes',
          required: true,
          order: 2,
          fields: [
            {
              id: 'why_1',
              label: 'Why did the problem occur?',
              type: 'textarea',
              placeholder: 'First level why - direct cause',
              required: true
            },
            {
              id: 'why_2',
              label: 'Why did that happen?',
              type: 'textarea',
              placeholder: 'Second level why - underlying cause',
              required: true
            },
            {
              id: 'why_3',
              label: 'Why did that happen?',
              type: 'textarea',
              placeholder: 'Third level why - deeper cause',
              required: true
            },
            {
              id: 'why_4',
              label: 'Why did that happen?',
              type: 'textarea',
              placeholder: 'Fourth level why - systemic cause',
              required: false
            },
            {
              id: 'why_5',
              label: 'Why did that happen?',
              type: 'textarea',
              placeholder: 'Fifth level why - root cause',
              required: false
            }
          ]
        },
        {
          id: 'root_cause_identification',
          title: 'Root Cause Summary',
          description: 'Identify and validate the root cause(s)',
          required: true,
          order: 3,
          fields: [
            {
              id: 'primary_root_cause',
              label: 'Primary Root Cause',
              type: 'textarea',
              placeholder: 'The fundamental reason the incident occurred',
              required: true
            },
            {
              id: 'contributing_factors',
              label: 'Contributing Factors',
              type: 'textarea',
              placeholder: 'Additional factors that contributed to the incident',
              required: false
            },
            {
              id: 'evidence_supporting',
              label: 'Supporting Evidence',
              type: 'textarea',
              placeholder: 'Evidence that supports your root cause hypothesis',
              required: true
            }
          ]
        }
      ]
    });

    // Fishbone (Ishikawa) Template
    this.templates.set('fishbone_ishikawa', {
      methodology: 'fishbone_ishikawa',
      name: 'Fishbone (Ishikawa) Analysis',
      description: 'Structured approach to identify potential causes across multiple categories',
      estimatedDuration: 90,
      requiredRoles: ['facilitator', 'technical_lead', 'operations_lead'],
      artifacts: ['fishbone_diagram', 'category_analysis', 'prioritized_causes'],
      sections: [
        {
          id: 'problem_statement',
          title: 'Problem Statement',
          description: 'Define the problem to be analyzed',
          required: true,
          order: 1,
          fields: [
            {
              id: 'effect_description',
              label: 'Effect (Problem) Description',
              type: 'textarea',
              placeholder: 'What is the effect/problem we are analyzing?',
              required: true
            },
            {
              id: 'scope_boundaries',
              label: 'Scope and Boundaries',
              type: 'textarea',
              placeholder: 'What is in scope for this analysis?',
              required: true
            }
          ]
        },
        {
          id: 'people_category',
          title: 'People Factors',
          description: 'Human factors that may have contributed',
          required: true,
          order: 2,
          fields: [
            {
              id: 'people_training',
              label: 'Training & Skills',
              type: 'textarea',
              placeholder: 'Were there training or skill gaps?',
              required: false
            },
            {
              id: 'people_communication',
              label: 'Communication',
              type: 'textarea',
              placeholder: 'Were there communication issues?',
              required: false
            },
            {
              id: 'people_procedures',
              label: 'Procedure Adherence',
              type: 'textarea',
              placeholder: 'Were procedures followed correctly?',
              required: false
            }
          ]
        },
        {
          id: 'process_category',
          title: 'Process Factors',
          description: 'Process-related causes',
          required: true,
          order: 3,
          fields: [
            {
              id: 'process_design',
              label: 'Process Design',
              type: 'textarea',
              placeholder: 'Are there issues with process design?',
              required: false
            },
            {
              id: 'process_controls',
              label: 'Process Controls',
              type: 'textarea',
              placeholder: 'Were adequate controls in place?',
              required: false
            },
            {
              id: 'process_documentation',
              label: 'Documentation',
              type: 'textarea',
              placeholder: 'Is process documentation adequate?',
              required: false
            }
          ]
        },
        {
          id: 'technology_category',
          title: 'Technology Factors',
          description: 'Technology and system-related causes',
          required: true,
          order: 4,
          fields: [
            {
              id: 'technology_systems',
              label: 'System Issues',
              type: 'textarea',
              placeholder: 'Were there system failures or limitations?',
              required: false
            },
            {
              id: 'technology_tools',
              label: 'Tools & Equipment',
              type: 'textarea',
              placeholder: 'Were appropriate tools available and working?',
              required: false
            },
            {
              id: 'technology_maintenance',
              label: 'Maintenance',
              type: 'textarea',
              placeholder: 'Was maintenance adequate?',
              required: false
            }
          ]
        },
        {
          id: 'environment_category',
          title: 'Environment Factors',
          description: 'Environmental factors that contributed',
          required: true,
          order: 5,
          fields: [
            {
              id: 'environment_physical',
              label: 'Physical Environment',
              type: 'textarea',
              placeholder: 'Were there physical environmental factors?',
              required: false
            },
            {
              id: 'environment_organizational',
              label: 'Organizational Environment',
              type: 'textarea',
              placeholder: 'Cultural or organizational factors?',
              required: false
            },
            {
              id: 'environment_external',
              label: 'External Environment',
              type: 'textarea',
              placeholder: 'External pressures or constraints?',
              required: false
            }
          ]
        }
      ]
    });

    // Timeline Analysis Template
    this.templates.set('timeline_analysis', {
      methodology: 'timeline_analysis',
      name: 'Timeline Analysis',
      description: 'Chronological reconstruction of events leading to the incident',
      estimatedDuration: 60,
      requiredRoles: ['facilitator', 'incident_responder', 'operations_engineer'],
      artifacts: ['detailed_timeline', 'critical_events', 'decision_points'],
      sections: [
        {
          id: 'timeline_scope',
          title: 'Timeline Scope',
          description: 'Define the timeframe for analysis',
          required: true,
          order: 1,
          fields: [
            {
              id: 'incident_start_time',
              label: 'Incident Start Time',
              type: 'date',
              required: true
            },
            {
              id: 'analysis_start_time',
              label: 'Analysis Start Time',
              type: 'date',
              placeholder: 'When should the timeline begin? (Usually hours/days before incident)',
              required: true
            },
            {
              id: 'resolution_time',
              label: 'Resolution Time',
              type: 'date',
              required: true
            }
          ]
        },
        {
          id: 'event_reconstruction',
          title: 'Event Reconstruction',
          description: 'Build a chronological sequence of events',
          required: true,
          order: 2,
          fields: [
            {
              id: 'timeline_events',
              label: 'Timeline Events',
              type: 'timeline',
              placeholder: 'Add events in chronological order',
              required: true
            }
          ]
        },
        {
          id: 'critical_analysis',
          title: 'Critical Event Analysis',
          description: 'Identify and analyze critical events and decision points',
          required: true,
          order: 3,
          fields: [
            {
              id: 'critical_events',
              label: 'Critical Events',
              type: 'textarea',
              placeholder: 'Which events were most critical to the incident?',
              required: true
            },
            {
              id: 'missed_opportunities',
              label: 'Missed Opportunities',
              type: 'textarea',
              placeholder: 'Where could the incident have been prevented or mitigated?',
              required: true
            },
            {
              id: 'decision_analysis',
              label: 'Decision Point Analysis',
              type: 'textarea',
              placeholder: 'Analyze key decisions made during the timeline',
              required: true
            }
          ]
        }
      ]
    });

    // Fault Tree Analysis Template
    this.templates.set('fault_tree_analysis', {
      methodology: 'fault_tree_analysis',
      name: 'Fault Tree Analysis',
      description: 'Systematic analysis of potential system failures using logical gates',
      estimatedDuration: 120,
      requiredRoles: ['systems_analyst', 'reliability_engineer', 'domain_expert'],
      artifacts: ['fault_tree_diagram', 'failure_modes', 'probability_analysis'],
      sections: [
        {
          id: 'top_event_definition',
          title: 'Top Event Definition',
          description: 'Define the undesired event at the top of the fault tree',
          required: true,
          order: 1,
          fields: [
            {
              id: 'top_event',
              label: 'Top Event',
              type: 'text',
              placeholder: 'The undesired event we are analyzing',
              required: true
            },
            {
              id: 'system_boundaries',
              label: 'System Boundaries',
              type: 'textarea',
              placeholder: 'Define what is included/excluded from analysis',
              required: true
            }
          ]
        },
        {
          id: 'fault_tree_construction',
          title: 'Fault Tree Construction',
          description: 'Build the fault tree with gates and basic events',
          required: true,
          order: 2,
          fields: [
            {
              id: 'immediate_causes',
              label: 'Immediate Causes',
              type: 'textarea',
              placeholder: 'What events directly led to the top event?',
              required: true
            },
            {
              id: 'secondary_causes',
              label: 'Secondary Causes',
              type: 'textarea',
              placeholder: 'What events led to the immediate causes?',
              required: true
            },
            {
              id: 'basic_events',
              label: 'Basic Events',
              type: 'textarea',
              placeholder: 'Identify the basic events that cannot be further analyzed',
              required: true
            }
          ]
        }
      ]
    });
  }

  /**
   * Get available RCA templates
   */
  public getAvailableTemplates(): RCATemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get specific RCA template
   */
  public getTemplate(methodology: RCAMethodology): RCATemplate | undefined {
    return this.templates.get(methodology);
  }

  /**
   * Create new RCA analysis
   */
  public async createRCAAnalysis(data: {
    incidentId?: string;
    methodology: RCAMethodology;
    facilitator: string;
    participants: string[];
    severity: RCASeverity;
    title: string;
    description: string;
  }): Promise<RCAAnalysis> {
    const template = this.getTemplate(data.methodology);
    if (!template) {
      throw new Error(`Template not found for methodology: ${data.methodology}`);
    }

    const [analysis] = await db.insert(rcaAnalyses).values({
      id: `rca_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      incidentId: data.incidentId,
      methodology: data.methodology,
      status: 'initiated',
      facilitator: data.facilitator,
      participants: data.participants,
      severity: data.severity,
      title: data.title,
      description: data.description,
      estimatedDuration: template.estimatedDuration,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    this.emit('rca_created', analysis);
    return analysis;
  }

  /**
   * Update RCA analysis status
   */
  public async updateRCAStatus(
    analysisId: string,
    status: RCAStatus,
    updatedBy: string
  ): Promise<void> {
    await db.update(rcaAnalyses)
      .set({
        status,
        updatedBy,
        updatedAt: new Date(),
        ...(status === 'completed' && { completedAt: new Date() })
      })
      .where(eq(rcaAnalyses.id, analysisId));

    this.emit('rca_status_updated', { analysisId, status, updatedBy });
  }

  /**
   * Add finding to RCA
   */
  public async addFinding(data: {
    analysisId: string;
    category: string;
    finding: string;
    evidence: string;
    severity: RCASeverity;
    addedBy: string;
  }): Promise<RCAFinding> {
    const [finding] = await db.insert(rcaFindings).values({
      id: `finding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      analysisId: data.analysisId,
      category: data.category,
      finding: data.finding,
      evidence: data.evidence,
      severity: data.severity,
      addedBy: data.addedBy,
      createdAt: new Date()
    }).returning();

    this.emit('rca_finding_added', finding);
    return finding;
  }

  /**
   * Add action item to RCA
   */
  public async addActionItem(data: {
    analysisId: string;
    title: string;
    description: string;
    assignee: string;
    priority: ActionItemPriority;
    dueDate?: Date;
    createdBy: string;
  }): Promise<RCAActionItem> {
    const [actionItem] = await db.insert(rcaActionItems).values({
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      analysisId: data.analysisId,
      title: data.title,
      description: data.description,
      assignee: data.assignee,
      priority: data.priority,
      status: 'open',
      dueDate: data.dueDate,
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    this.emit('rca_action_item_added', actionItem);
    return actionItem;
  }

  /**
   * Update action item status
   */
  public async updateActionItemStatus(
    actionItemId: string,
    status: ActionItemStatus,
    updatedBy: string,
    notes?: string
  ): Promise<void> {
    await db.update(rcaActionItems)
      .set({
        status,
        notes,
        updatedBy,
        updatedAt: new Date(),
        ...(status === 'completed' && { completedAt: new Date() })
      })
      .where(eq(rcaActionItems.id, actionItemId));

    this.emit('rca_action_item_updated', { actionItemId, status, updatedBy });
  }

  /**
   * Get RCA analysis with all related data
   */
  public async getRCAResult(analysisId: string): Promise<RCAResult | null> {
    // Get analysis
    const [analysis] = await db.select()
      .from(rcaAnalyses)
      .where(eq(rcaAnalyses.id, analysisId));

    if (!analysis) return null;

    // Get findings
    const findings = await db.select()
      .from(rcaFindings)
      .where(eq(rcaFindings.analysisId, analysisId));

    // Get action items
    const actionItems = await db.select()
      .from(rcaActionItems)
      .where(eq(rcaActionItems.analysisId, analysisId));

    // Get timeline if exists
    const timeline = await db.select()
      .from(rcaTimelines)
      .where(eq(rcaTimelines.analysisId, analysisId))
      .orderBy(rcaTimelines.eventTime);

    // Calculate effectiveness metrics
    const effectiveness = this.calculateEffectiveness(analysis, findings, actionItems);

    return {
      analysis,
      findings,
      actionItems,
      timeline: timeline.length > 0 ? timeline : undefined,
      effectiveness
    };
  }

  /**
   * Get all RCA analyses with filtering
   */
  public async getRCAAnalyses(filters: {
    status?: RCAStatus[];
    methodology?: RCAMethodology[];
    facilitator?: string;
    dateFrom?: Date;
    dateTo?: Date;
  } = {}): Promise<RCAAnalysis[]> {
    let query = db.select().from(rcaAnalyses);

    if (filters.status && filters.status.length > 0) {
      query = query.where(or(...filters.status.map(status => eq(rcaAnalyses.status, status))));
    }

    if (filters.methodology && filters.methodology.length > 0) {
      query = query.where(or(...filters.methodology.map(method => eq(rcaAnalyses.methodology, method))));
    }

    if (filters.facilitator) {
      query = query.where(eq(rcaAnalyses.facilitator, filters.facilitator));
    }

    if (filters.dateFrom) {
      query = query.where(gte(rcaAnalyses.createdAt, filters.dateFrom));
    }

    if (filters.dateTo) {
      query = query.where(lte(rcaAnalyses.createdAt, filters.dateTo));
    }

    return query.orderBy(desc(rcaAnalyses.createdAt));
  }

  /**
   * Calculate effectiveness metrics
   */
  private calculateEffectiveness(
    analysis: RCAAnalysis,
    findings: RCAFinding[],
    actionItems: RCAActionItem[]
  ): RCAResult['effectiveness'] {
    // Completeness: based on template completion and findings count
    const completeness = Math.min(100, (findings.length * 20) + (analysis.status === 'completed' ? 40 : 0));

    // Quality: based on evidence depth and finding severity distribution
    const evidenceQuality = findings.reduce((acc, finding) => {
      return acc + (finding.evidence && finding.evidence.length > 50 ? 25 : 10);
    }, 0) / Math.max(findings.length, 1);

    const quality = Math.min(100, evidenceQuality);

    // Actionability: based on action items and their specificity
    const actionability = actionItems.length > 0 ? 
      Math.min(100, (actionItems.length * 20) + (actionItems.filter(ai => ai.assignee && ai.dueDate).length * 20)) :
      0;

    // Overall score
    const overall = (completeness + quality + actionability) / 3;

    return {
      completeness,
      quality,
      actionability,
      overall
    };
  }

  /**
   * Generate RCA summary report
   */
  public async generateRCASummary(analysisId: string): Promise<string> {
    const result = await this.getRCAResult(analysisId);
    if (!result) {
      throw new Error('RCA analysis not found');
    }

    const { analysis, findings, actionItems, effectiveness } = result;
    const template = this.getTemplate(analysis.methodology);

    return `
# Root Cause Analysis Summary

**Analysis ID:** ${analysis.id}
**Methodology:** ${template?.name || analysis.methodology}
**Status:** ${analysis.status}
**Facilitator:** ${analysis.facilitator}
**Participants:** ${analysis.participants.join(', ')}

## Problem Statement
${analysis.description}

## Key Findings
${findings.map(f => `- **${f.category}:** ${f.finding}`).join('\n')}

## Root Causes Identified
${findings.filter(f => f.severity === 'high' || f.severity === 'critical')
  .map(f => `- ${f.finding} (Evidence: ${f.evidence})`)
  .join('\n')}

## Action Items
${actionItems.map(ai => `- **${ai.title}** (Priority: ${ai.priority}, Assignee: ${ai.assignee}, Status: ${ai.status})`).join('\n')}

## Effectiveness Metrics
- **Completeness:** ${effectiveness.completeness.toFixed(1)}%
- **Quality:** ${effectiveness.quality.toFixed(1)}%
- **Actionability:** ${effectiveness.actionability.toFixed(1)}%
- **Overall Score:** ${effectiveness.overall.toFixed(1)}%

## Recommendations
Based on this analysis, we recommend implementing the identified action items in priority order and tracking their completion to prevent similar incidents.
`.trim();
  }
}