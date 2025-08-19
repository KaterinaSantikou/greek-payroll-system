/**
 * Cut-Off Logic API - Bank timing and routing recommendations
 */

import type { Express } from "express";
import { CutOffLogic } from "../services/cutOffLogic";

export function cutOffLogicRoutes(app: Express) {

  // =============================================================================
  // CUT-OFF STATUS MONITORING
  // =============================================================================

  /**
   * Get Cut-Off Status for Bank Profile
   * GET /v1/cut-off/status/:bank_profile_id
   */
  app.get('/v1/cut-off/status/:bank_profile_id', async (req, res) => {
    try {
      const { bank_profile_id } = req.params;
      const { timezone = 'Europe/Athens' } = req.query;

      if (!['alpha', 'piraeus', 'eurobank', 'nbg'].includes(bank_profile_id)) {
        return res.status(400).json({
          error: 'INVALID_BANK_PROFILE',
          detail: `Bank profile ${bank_profile_id} not supported`,
          hint: 'Supported profiles: alpha, piraeus, eurobank, nbg'
        });
      }

      const cutOffStatus = await CutOffLogic.getCutOffStatus(bank_profile_id, timezone as string);

      res.json({
        bank_profile_id,
        cut_off_status: cutOffStatus,
        cockpit_display: {
          countdown: cutOffStatus.timeRemaining?.displayString || 'Past cut-off',
          status_badge: {
            variant: cutOffStatus.isPastCutOff ? 'error' : 
                    cutOffStatus.timeRemaining && cutOffStatus.timeRemaining.totalMinutes <= 30 ? 'warning' : 'success',
            text: cutOffStatus.isPastCutOff ? 'PAST CUT-OFF' : 
                  cutOffStatus.timeRemaining && cutOffStatus.timeRemaining.totalMinutes <= 30 ? 'APPROACHING' : 'ACTIVE',
          },
          business_day_status: cutOffStatus.businessDay ? 'ACTIVE' : 'NON_BUSINESS_DAY',
        },
        recommendations: {
          use_sct_instant: cutOffStatus.isPastCutOff,
          risk_level: cutOffStatus.isPastCutOff ? 'HIGH' : 
                     cutOffStatus.timeRemaining && cutOffStatus.timeRemaining.totalMinutes <= 30 ? 'MEDIUM' : 'LOW',
        },
      });
    } catch (error) {
      console.error('Cut-off status error:', error);
      res.status(500).json({
        error: 'CUT_OFF_STATUS_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to retrieve cut-off status'
      });
    }
  });

  /**
   * Get Cut-Off Countdown for Cockpit
   * GET /v1/cut-off/countdown/:bank_profile_id
   */
  app.get('/v1/cut-off/countdown/:bank_profile_id', async (req, res) => {
    try {
      const { bank_profile_id } = req.params;

      const countdown = await CutOffLogic.getCutOffCountdown(bank_profile_id);

      res.json({
        bank_profile_id,
        countdown_display: countdown,
        cockpit_integration: {
          show_banner: countdown.banner.show,
          banner_message: countdown.banner.message,
          banner_variant: countdown.banner.variant,
          countdown_text: countdown.countdown,
          risk_indicator: countdown.riskLevel,
        },
        auto_refresh: {
          enabled: countdown.status === 'ACTIVE',
          interval_seconds: countdown.status === 'ACTIVE' ? 60 : 300,
        },
      });
    } catch (error) {
      console.error('Cut-off countdown error:', error);
      res.status(500).json({
        error: 'CUT_OFF_COUNTDOWN_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to retrieve cut-off countdown'
      });
    }
  });

  /**
   * Get All Bank Cut-Off Statuses (Multi-Bank Cockpit)
   * GET /v1/cut-off/all-banks
   */
  app.get('/v1/cut-off/all-banks', async (req, res) => {
    try {
      const allStatuses = await CutOffLogic.getAllBankCutOffStatuses();

      // Transform for cockpit display
      const cockpitData = Object.entries(allStatuses).map(([bankId, status]) => ({
        bank_id: bankId,
        bank_name: getBankDisplayName(bankId),
        cut_off_time: status.sctCutOffTime.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' }),
        status: status.isPastCutOff ? 'PAST_CUTOFF' : 
               status.timeRemaining && status.timeRemaining.totalMinutes <= 30 ? 'APPROACHING' : 'ACTIVE',
        time_remaining: status.timeRemaining?.displayString || 'Past cut-off',
        risk_level: status.isPastCutOff ? 'HIGH' : 
                   status.timeRemaining && status.timeRemaining.totalMinutes <= 30 ? 'MEDIUM' : 'LOW',
        business_day: status.businessDay,
        sct_instant_available: true, // All Greek banks support SCT Instant
      }));

      res.json({
        all_banks_status: cockpitData,
        summary: {
          total_banks: cockpitData.length,
          past_cut_off: cockpitData.filter(b => b.status === 'PAST_CUTOFF').length,
          approaching_cut_off: cockpitData.filter(b => b.status === 'APPROACHING').length,
          active: cockpitData.filter(b => b.status === 'ACTIVE').length,
        },
        global_recommendation: {
          prefer_sct_instant: cockpitData.some(b => b.status === 'PAST_CUTOFF'),
          mixed_status: new Set(cockpitData.map(b => b.status)).size > 1,
        },
      });
    } catch (error) {
      console.error('All banks cut-off error:', error);
      res.status(500).json({
        error: 'ALL_BANKS_CUT_OFF_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to retrieve all bank cut-off statuses'
      });
    }
  });

  // =============================================================================
  // PAYMENT RECOMMENDATIONS
  // =============================================================================

  /**
   * Get Payment Method Recommendation
   * POST /v1/cut-off/recommend-payment-method
   */
  app.post('/v1/cut-off/recommend-payment-method', async (req, res) => {
    try {
      const { 
        amount, 
        bank_profile_id, 
        current_method, 
        is_reissue = false 
      } = req.body;

      if (!amount || !bank_profile_id) {
        return res.status(400).json({
          error: 'MISSING_PARAMETERS',
          detail: 'amount and bank_profile_id are required',
          hint: 'Provide payment details for cut-off aware recommendation'
        });
      }

      const recommendation = await CutOffLogic.getPaymentRecommendation(
        amount,
        bank_profile_id,
        current_method,
        is_reissue
      );

      res.json({
        payment_details: { amount, bank_profile_id, current_method, is_reissue },
        recommendation,
        decision_helper: {
          use_recommended_method: recommendation.recommendedMethod,
          reason: recommendation.reason,
          risk_assessment: recommendation.riskLevel,
          cut_off_impact: recommendation.cutOffImpact,
        },
        cockpit_guidance: {
          show_warning: recommendation.warnings.length > 0,
          warning_messages: recommendation.warnings,
          fallback_available: recommendation.fallbackOptions.length > 0,
          fallback_methods: recommendation.fallbackOptions,
        },
      });
    } catch (error) {
      console.error('Payment recommendation error:', error);
      res.status(500).json({
        error: 'PAYMENT_RECOMMENDATION_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to generate payment recommendation'
      });
    }
  });

  /**
   * Get Cut-Off Decision with Full Context
   * POST /v1/cut-off/decision
   */
  app.post('/v1/cut-off/decision', async (req, res) => {
    try {
      const { 
        amount, 
        bank_profile_id, 
        current_method, 
        is_reissue = false 
      } = req.body;

      if (!amount || !bank_profile_id) {
        return res.status(400).json({
          error: 'MISSING_PARAMETERS',
          detail: 'amount and bank_profile_id are required'
        });
      }

      const decision = await CutOffLogic.getCutOffDecision(
        amount,
        bank_profile_id,
        current_method,
        is_reissue
      );

      res.json({
        cut_off_decision: decision,
        cockpit_display: {
          recommended_method: decision.recommendation.recommendedMethod,
          method_badge: {
            text: decision.recommendation.recommendedMethod,
            variant: decision.recommendation.recommendedMethod === 'SCT_INST' ? 'success' : 'default',
          },
          cut_off_status: {
            past_cut_off: decision.cutOffStatus.isPastCutOff,
            time_remaining: decision.cutOffStatus.timeRemaining?.displayString,
            business_day: decision.cutOffStatus.businessDay,
          },
          risk_indicators: {
            level: decision.recommendation.riskLevel,
            cut_off_impact: decision.recommendation.cutOffImpact,
            warnings: decision.recommendation.warnings,
          },
        },
        decision_logic: {
          amount_check: amount > 100000 ? 'Exceeds SCT Instant limit' : 'Within limits',
          cut_off_check: decision.cutOffStatus.isPastCutOff ? 'Past cut-off' : 'Within cut-off',
          bank_support: 'SCT Instant supported',
          final_recommendation: decision.recommendation.reason,
        },
      });
    } catch (error) {
      console.error('Cut-off decision error:', error);
      res.status(500).json({
        error: 'CUT_OFF_DECISION_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to generate cut-off decision'
      });
    }
  });

  // =============================================================================
  // RE-ISSUE ELIGIBILITY
  // =============================================================================

  /**
   * Check Re-issue Eligibility for Pending/Rejected Payments
   * POST /v1/cut-off/check-reissue-eligibility
   */
  app.post('/v1/cut-off/check-reissue-eligibility', async (req, res) => {
    try {
      const { line_id, new_amount } = req.body;

      if (!line_id) {
        return res.status(400).json({
          error: 'MISSING_PARAMETER',
          detail: 'line_id is required',
          hint: 'Provide payment instruction line ID for re-issue eligibility check'
        });
      }

      const eligibility = await CutOffLogic.checkReissueEligibility(line_id, new_amount);

      res.json({
        line_id,
        reissue_eligibility: eligibility,
        cockpit_actions: {
          show_reissue_button: eligibility.eligible,
          button_text: eligibility.eligible ? 'Re-issue as SCT Instant' : 'Re-issue Not Available',
          button_variant: eligibility.eligible ? 'default' : 'outline',
          urgency_indicator: eligibility.urgency,
        },
        business_impact: {
          estimated_settlement: eligibility.estimatedSettlement,
          urgency_level: eligibility.urgency,
          limitations: eligibility.limitations,
        },
        next_steps: eligibility.eligible ? [
          '1. Confirm re-issue as SCT Instant',
          '2. Original payment will be marked as superseded',
          '3. New payment processed with higher urgency',
        ] : [
          '1. Review eligibility limitations',
          '2. Consider alternative resolution',
          '3. Manual intervention may be required',
        ],
      });
    } catch (error) {
      console.error('Re-issue eligibility error:', error);
      res.status(500).json({
        error: 'REISSUE_ELIGIBILITY_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to check re-issue eligibility'
      });
    }
  });

  // =============================================================================
  // CUT-OFF CONFIGURATION
  // =============================================================================

  /**
   * Get Cut-Off Configuration for All Banks
   * GET /v1/cut-off/config
   */
  app.get('/v1/cut-off/config', async (req, res) => {
    try {
      const bankConfigs = [
        {
          bank_id: 'alpha',
          bank_name: 'Alpha Bank',
          sct_cut_off: '16:00',
          sct_inst_support: true,
          sct_inst_limit: 100000,
          sct_inst_cut_off: 'Always On',
          timezone: 'Europe/Athens',
          weekdays: '1-5 (Mon-Fri)',
        },
        {
          bank_id: 'piraeus',
          bank_name: 'Piraeus Bank',
          sct_cut_off: '15:30',
          sct_inst_support: true,
          sct_inst_limit: 100000,
          sct_inst_cut_off: 'Always On',
          timezone: 'Europe/Athens',
          weekdays: '1-5 (Mon-Fri)',
        },
        {
          bank_id: 'eurobank',
          bank_name: 'Eurobank',
          sct_cut_off: '17:00',
          sct_inst_support: true,
          sct_inst_limit: 100000,
          sct_inst_cut_off: 'Always On',
          timezone: 'Europe/Athens',
          weekdays: '1-5 (Mon-Fri)',
        },
        {
          bank_id: 'nbg',
          bank_name: 'National Bank of Greece',
          sct_cut_off: '16:15',
          sct_inst_support: true,
          sct_inst_limit: 100000,
          sct_inst_cut_off: 'Always On',
          timezone: 'Europe/Athens',
          weekdays: '1-5 (Mon-Fri)',
        },
      ];

      res.json({
        bank_configurations: bankConfigs,
        cut_off_logic: {
          decision_rules: [
            'If now > cutoff.sct.time → default new issues to SCT Inst (when supported)',
            'If amount > sctInstAmountLimit → fallback to SCT; warn',
            'If SCT already submitted and pending → allow re-issue as SCT Inst (sets original to superseded)',
          ],
          risk_assessment: {
            low: 'More than 30 minutes until cut-off',
            medium: 'Within 30 minutes of cut-off',
            high: 'Past cut-off or non-business day',
          },
        },
        cockpit_features: {
          countdown_timer: 'Real-time cut-off countdown per bank',
          risk_banner: 'Contextual warnings for cut-off breaches',
          method_recommendations: 'Automatic SCT vs SCT Instant routing',
          multi_bank_overview: 'All bank cut-offs in single view',
        },
      });
    } catch (error) {
      console.error('Cut-off config error:', error);
      res.status(500).json({
        error: 'CUT_OFF_CONFIG_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to retrieve cut-off configuration'
      });
    }
  });

}

// Helper function for bank display names
function getBankDisplayName(bankId: string): string {
    const displayNames: Record<string, string> = {
      alpha: 'Alpha Bank',
      piraeus: 'Piraeus Bank',
      eurobank: 'Eurobank',
      nbg: 'National Bank of Greece',
    };
    return displayNames[bankId] || bankId;
}