/**
 * Cut-Off Display Component - Real-time countdown and recommendations
 */

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, AlertTriangle, CheckCircle, Zap, Info } from 'lucide-react';

interface CutOffDisplayProps {
  bankProfileId: string;
  cutOffData: {
    countdown_display: {
      countdown: string;
      status: 'ACTIVE' | 'PAST_CUTOFF' | 'NON_BUSINESS_DAY';
      riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
      banner: {
        show: boolean;
        message: string;
        variant: 'info' | 'warning' | 'error';
      };
    };
    cockpit_integration: {
      show_banner: boolean;
      banner_message: string;
      banner_variant: 'info' | 'warning' | 'error';
      countdown_text: string;
      risk_indicator: 'LOW' | 'MEDIUM' | 'HIGH';
    };
    auto_refresh: {
      enabled: boolean;
      interval_seconds: number;
    };
  };
  onRecommendPayment?: () => void;
  onReissueAsInstant?: () => void;
}

interface AllBanksCutOffProps {
  allBanksData: {
    all_banks_status: Array<{
      bank_id: string;
      bank_name: string;
      cut_off_time: string;
      status: 'ACTIVE' | 'PAST_CUTOFF' | 'APPROACHING';
      time_remaining: string;
      risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
      business_day: boolean;
      sct_instant_available: boolean;
    }>;
    summary: {
      total_banks: number;
      past_cut_off: number;
      approaching_cut_off: number;
      active: number;
    };
    global_recommendation: {
      prefer_sct_instant: boolean;
      mixed_status: boolean;
    };
  };
}

const statusIcons = {
  ACTIVE: CheckCircle,
  PAST_CUTOFF: AlertTriangle,
  APPROACHING: Clock,
  NON_BUSINESS_DAY: AlertTriangle,
};

const statusColors = {
  ACTIVE: 'text-green-500',
  PAST_CUTOFF: 'text-red-500',
  APPROACHING: 'text-yellow-500',
  NON_BUSINESS_DAY: 'text-gray-500',
};

const riskColors = {
  LOW: 'text-green-600',
  MEDIUM: 'text-yellow-600',
  HIGH: 'text-red-600',
};

export function CutOffDisplay({
  bankProfileId,
  cutOffData,
  onRecommendPayment,
  onReissueAsInstant,
}: CutOffDisplayProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { countdown_display, cockpit_integration, auto_refresh } = cutOffData;

  // Auto-refresh current time
  useEffect(() => {
    if (!auto_refresh.enabled) return;

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [auto_refresh.enabled]);

  const StatusIcon = statusIcons[countdown_display.status] || Clock;

  const getBankDisplayName = (bankId: string): string => {
    const displayNames: Record<string, string> = {
      alpha: 'Alpha Bank',
      piraeus: 'Piraeus Bank',
      eurobank: 'Eurobank',
      nbg: 'National Bank of Greece',
    };
    return displayNames[bankId] || bankId;
  };

  return (
    <div className="space-y-4">
      {/* Cut-Off Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <StatusIcon
                className={`h-6 w-6 ${statusColors[countdown_display.status]}`}
              />
              <div>
                <CardTitle className="text-lg">
                  {getBankDisplayName(bankProfileId)} Cut-Off
                </CardTitle>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge
                    variant={
                      countdown_display.status === 'ACTIVE'
                        ? 'default'
                        : countdown_display.status === 'NON_BUSINESS_DAY'
                          ? 'secondary'
                          : 'destructive'
                    }
                  >
                    {countdown_display.status.replace('_', ' ')}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={riskColors[countdown_display.riskLevel]}
                  >
                    {countdown_display.riskLevel} Risk
                  </Badge>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">
                {countdown_display.countdown}
              </div>
              <div className="text-sm text-gray-500">
                {countdown_display.status === 'ACTIVE'
                  ? 'Until SCT Cut-Off'
                  : 'Cut-Off Status'}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Current Time:{' '}
              {currentTime.toLocaleTimeString('el-GR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </div>

            <div className="flex space-x-2">
              {onRecommendPayment && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRecommendPayment}
                >
                  <Info className="h-4 w-4 mr-1" />
                  Get Recommendation
                </Button>
              )}

              {countdown_display.status === 'PAST_CUTOFF' &&
                onReissueAsInstant && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={onReissueAsInstant}
                  >
                    <Zap className="h-4 w-4 mr-1" />
                    Use SCT Instant
                  </Button>
                )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cut-Off Banner */}
      {cockpit_integration.show_banner && (
        <Alert
          variant={
            cockpit_integration.banner_variant === 'error'
              ? 'destructive'
              : 'default'
          }
        >
          {cockpit_integration.banner_variant === 'error' ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <Info className="h-4 w-4" />
          )}
          <AlertDescription>
            {cockpit_integration.banner_message}
          </AlertDescription>
        </Alert>
      )}

      {/* Recommendations Section */}
      {countdown_display.riskLevel !== 'LOW' && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <Zap className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-orange-800 mb-1">
                  Cut-Off Recommendations
                </h4>
                <ul className="text-sm text-orange-700 space-y-1">
                  {countdown_display.status === 'PAST_CUTOFF' && (
                    <>
                      <li>
                        • Use SCT Instant for immediate same-day processing
                      </li>
                      <li>• SCT payments will process next business day</li>
                      <li>• Consider batch consolidation for efficiency</li>
                    </>
                  )}
                  {countdown_display.status === 'APPROACHING' && (
                    <>
                      <li>• Consider SCT Instant for urgent payments</li>
                      <li>• Standard SCT may miss today's cut-off</li>
                      <li>• Monitor countdown for final submissions</li>
                    </>
                  )}
                  {countdown_display.status === 'NON_BUSINESS_DAY' && (
                    <>
                      <li>• SCT Instant available for immediate processing</li>
                      <li>• Standard SCT will process next business day</li>
                      <li>• Plan ahead for weekend/holiday periods</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function AllBanksCutOffDisplay({ allBanksData }: AllBanksCutOffProps) {
  const { all_banks_status, summary, global_recommendation } = allBanksData;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {summary.active}
          </div>
          <div className="text-sm text-gray-500">Active</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {summary.approaching_cut_off}
          </div>
          <div className="text-sm text-gray-500">Approaching</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">
            {summary.past_cut_off}
          </div>
          <div className="text-sm text-gray-500">Past Cut-Off</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-700">
            {summary.total_banks}
          </div>
          <div className="text-sm text-gray-500">Total Banks</div>
        </div>
      </div>

      {/* Global Recommendation */}
      {global_recommendation.prefer_sct_instant && (
        <Alert>
          <Zap className="h-4 w-4" />
          <AlertDescription>
            <strong>Recommendation:</strong> Use SCT Instant for new payments -
            {summary.past_cut_off} bank(s) past cut-off time.
          </AlertDescription>
        </Alert>
      )}

      {/* Individual Bank Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {all_banks_status.map(bank => {
          const StatusIcon = statusIcons[bank.status] || Clock;

          return (
            <Card key={bank.bank_id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <StatusIcon
                      className={`h-5 w-5 ${statusColors[bank.status]}`}
                    />
                    <CardTitle className="text-base">
                      {bank.bank_name}
                    </CardTitle>
                  </div>
                  <Badge
                    variant={
                      bank.status === 'ACTIVE'
                        ? 'default'
                        : bank.status === 'APPROACHING'
                          ? 'secondary'
                          : 'destructive'
                    }
                    className="text-xs"
                  >
                    {bank.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Cut-Off Time:</span>
                    <span className="font-medium">{bank.cut_off_time}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Time Remaining:</span>
                    <span
                      className={`font-medium ${riskColors[bank.risk_level]}`}
                    >
                      {bank.time_remaining}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">SCT Instant:</span>
                    <span className="font-medium text-green-600">
                      {bank.sct_instant_available
                        ? '✓ Available'
                        : '✗ Not Available'}
                    </span>
                  </div>

                  {!bank.business_day && (
                    <div className="text-xs text-gray-500 mt-2">
                      ⚠️ Non-business day - SCT will process next business day
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Mixed Status Warning */}
      {global_recommendation.mixed_status && (
        <Alert variant="default">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Banks have different cut-off statuses. Review individual bank timing
            when routing payments to ensure optimal processing.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
