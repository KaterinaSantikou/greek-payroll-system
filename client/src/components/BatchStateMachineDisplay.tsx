/**
 * Batch State Machine Display Component - Cockpit visualization
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';

interface BatchStateMachineDisplayProps {
  batchId: string;
  batchData: {
    is_split_batch: boolean;
    cockpit_display: {
      batch_status_badge: {
        status: string;
        variant: 'warning' | 'success' | 'destructive';
        text: string;
      };
      line_breakdown: {
        total_lines: number;
        active_lines: number;
        status_counts: Record<string, number>;
        progress_percentage: number;
      };
      split_batch_indicators?: {
        show_split_warning: boolean;
        accepted_count: number;
        rejected_count: number;
        reissue_candidates: number;
        success_rate: number;
      };
      action_buttons: {
        reissue_rejected: boolean;
        reconcile_batch: boolean;
        review_split: boolean;
        auto_update_status: boolean;
      };
    };
  };
  onReissueRejected?: () => void;
  onReconcileBatch?: () => void;
  onReviewSplit?: () => void;
  onAutoUpdateStatus?: () => void;
}

const statusIcons = {
  prepared: Clock,
  submitted: RefreshCw,
  accepted: CheckCircle,
  partially_settled: RefreshCw,
  settled: CheckCircle,
  reconciled: CheckCircle,
  failed: XCircle,
  rejected: XCircle,
};

const statusColors = {
  prepared: 'text-blue-500',
  submitted: 'text-yellow-500',
  accepted: 'text-green-500',
  partially_settled: 'text-orange-500',
  settled: 'text-green-600',
  reconciled: 'text-emerald-600',
  failed: 'text-red-500',
  rejected: 'text-red-500',
};

export function BatchStateMachineDisplay({
  batchId,
  batchData,
  onReissueRejected,
  onReconcileBatch,
  onReviewSplit,
  onAutoUpdateStatus,
}: BatchStateMachineDisplayProps) {
  const { cockpit_display, is_split_batch } = batchData;
  const {
    batch_status_badge,
    line_breakdown,
    split_batch_indicators,
    action_buttons,
  } = cockpit_display;

  const StatusIcon =
    statusIcons[batch_status_badge.status as keyof typeof statusIcons] || Clock;

  return (
    <div className="space-y-6">
      {/* Batch Status Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <StatusIcon
                className={`h-6 w-6 ${statusColors[batch_status_badge.status as keyof typeof statusColors]}`}
              />
              <div>
                <CardTitle className="text-lg">Batch {batchId}</CardTitle>
                <Badge variant={batch_status_badge.variant} className="mt-1">
                  {batch_status_badge.text}
                </Badge>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2">
              {action_buttons.auto_update_status && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onAutoUpdateStatus}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Auto-Update
                </Button>
              )}

              {action_buttons.reissue_rejected && (
                <Button variant="default" size="sm" onClick={onReissueRejected}>
                  <ArrowRight className="h-4 w-4 mr-1" />
                  Re-issue as Instant
                </Button>
              )}

              {action_buttons.reconcile_batch && (
                <Button variant="default" size="sm" onClick={onReconcileBatch}>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Reconcile
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Settlement Progress</span>
              <span>{line_breakdown.progress_percentage}%</span>
            </div>
            <Progress
              value={line_breakdown.progress_percentage}
              className="h-2"
            />
          </div>

          {/* Line Status Breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {line_breakdown.total_lines}
              </div>
              <div className="text-sm text-gray-500">Total Lines</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {line_breakdown.status_counts.settled || 0}
              </div>
              <div className="text-sm text-gray-500">Settled</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {line_breakdown.status_counts.accepted || 0}
              </div>
              <div className="text-sm text-gray-500">Accepted</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {line_breakdown.status_counts.rejected || 0}
              </div>
              <div className="text-sm text-gray-500">Rejected</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Split Batch Warning */}
      {is_split_batch && split_batch_indicators && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <CardTitle className="text-orange-800">
                Split Batch Detected
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-xl font-bold text-green-600">
                  {split_batch_indicators.accepted_count}
                </div>
                <div className="text-sm text-gray-600">Accepted</div>
              </div>

              <div className="text-center">
                <div className="text-xl font-bold text-red-600">
                  {split_batch_indicators.rejected_count}
                </div>
                <div className="text-sm text-gray-600">Rejected</div>
              </div>

              <div className="text-center">
                <div className="text-xl font-bold text-blue-600">
                  {split_batch_indicators.reissue_candidates}
                </div>
                <div className="text-sm text-gray-600">Re-issue Ready</div>
              </div>

              <div className="text-center">
                <div className="text-xl font-bold text-gray-700">
                  {split_batch_indicators.success_rate}%
                </div>
                <div className="text-sm text-gray-600">Success Rate</div>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button
                variant="default"
                size="sm"
                onClick={onReissueRejected}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Re-issue {split_batch_indicators.rejected_count} as SCT Instant
              </Button>

              {action_buttons.review_split && (
                <Button variant="outline" size="sm" onClick={onReviewSplit}>
                  Review Split Details
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* State Machine Flow Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">State Machine Flow</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="flex items-center justify-between text-sm">
            {/* Simplified state flow visualization */}
            {['prepared', 'submitted', 'accepted', 'settled', 'reconciled'].map(
              (state, index) => {
                const isActive = state === batch_status_badge.status;
                const isPassed =
                  ['prepared', 'submitted', 'accepted', 'settled'].indexOf(
                    batch_status_badge.status
                  ) > index;

                return (
                  <React.Fragment key={state}>
                    <div
                      className={`flex flex-col items-center ${
                        isActive
                          ? 'text-blue-600'
                          : isPassed
                            ? 'text-green-600'
                            : 'text-gray-400'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                          isActive
                            ? 'border-blue-600 bg-blue-100'
                            : isPassed
                              ? 'border-green-600 bg-green-100'
                              : 'border-gray-300'
                        }`}
                      >
                        {isPassed ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : isActive ? (
                          <Clock className="h-4 w-4" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <span className="mt-1 capitalize">
                        {state.replace('_', ' ')}
                      </span>
                    </div>

                    {index < 4 && (
                      <ArrowRight
                        className={`h-4 w-4 ${isPassed ? 'text-green-400' : 'text-gray-300'}`}
                      />
                    )}
                  </React.Fragment>
                );
              }
            )}
          </div>
        </CardContent>
      </Card>

      {/* Superseded Lines Information */}
      {line_breakdown.status_counts.superseded > 0 && (
        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-gray-700">
              <RefreshCw className="h-4 w-4" />
              <span className="text-sm">
                {line_breakdown.status_counts.superseded} payment(s) superseded
                by re-issue
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
