/**
 * One-Click Flow (Disaster Mode) Component
 * Emergency offline payroll kit generation button
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Download, Shield, Clock } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface OneClickFlowButtonProps {
  runId: string;
  disabled?: boolean;
}

interface FreezeRequest {
  runId: string;
  reason: string;
  emergencyPassword: string;
  includeSepaXml?: boolean;
}

interface FreezeResult {
  success: boolean;
  freezeId?: string;
  freezeHash?: string;
  downloadUrl?: string;
  processingTime: number;
  errors?: string[];
  kitSize?: number;
}

export function OneClickFlowButton({
  runId,
  disabled,
}: OneClickFlowButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [password, setPassword] = useState('');
  const [includeSepa, setIncludeSepa] = useState(false);
  const { toast } = useToast();

  // Check if run is already in disaster mode
  const { data: disasterStatus } = useQuery({
    queryKey: ['/api/one-click-flow/status', runId],
    enabled: !!runId,
  });

  // Pre-checks query
  const { data: preChecks, isLoading: preChecksLoading } = useQuery({
    queryKey: ['/api/one-click-flow/pre-checks', runId],
    enabled: isOpen && !!runId,
  });

  // Freeze mutation
  const freezeMutation = useMutation({
    mutationFn: async (request: FreezeRequest): Promise<FreezeResult> => {
      const response = await fetch('/api/one-click-flow/freeze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to freeze run');
      }
      return response.json();
    },
    onSuccess: result => {
      if (result.success) {
        toast({
          title: 'Disaster Mode Activated',
          description: `Offline kit generated in ${result.processingTime}ms. Download ready.`,
        });
        queryClient.invalidateQueries({
          queryKey: ['/api/one-click-flow/status'],
        });
        setIsOpen(false);

        // Trigger download
        if (result.downloadUrl) {
          window.open(result.downloadUrl, '_blank');
        }
      } else {
        toast({
          title: 'Kit Generation Failed',
          description: result.errors?.join(', ') || 'Unknown error',
          variant: 'destructive',
        });
      }
    },
    onError: error => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleFreeze = () => {
    if (!reason.trim() || !password.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please provide both reason and emergency password',
        variant: 'destructive',
      });
      return;
    }

    freezeMutation.mutate({
      runId,
      reason: reason.trim(),
      emergencyPassword: password,
      includeSepaXml: includeSepa,
    });
  };

  // If already in disaster mode, show status
  if (disasterStatus?.isInDisasterMode) {
    return (
      <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
        <AlertTriangle className="w-5 h-5 text-orange-600" />
        <div className="flex-1">
          <div className="font-medium text-orange-800">
            Disaster Mode Active
          </div>
          <div className="text-sm text-orange-600">
            Frozen at {new Date(disasterStatus.frozenAt).toLocaleString()}
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            window.open(
              `/api/one-click-flow/download/${disasterStatus.freezeId}`,
              '_blank'
            )
          }
        >
          <Download className="w-4 h-4 mr-1" />
          Download Kit
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className="border-red-200 text-red-700 hover:bg-red-50"
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Enter Disaster Mode
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            One-Click Flow: Emergency Offline Kit
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Pre-checks Status */}
          {preChecksLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              Running pre-flight checks...
            </div>
          ) : preChecks ? (
            <div className="space-y-2">
              <div className="text-sm font-medium">Pre-flight Checks</div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${preChecks.runStatus === 'finalized' ? 'bg-green-500' : 'bg-red-500'}`}
                  />
                  Run Status: {preChecks.runStatus}
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${preChecks.blockingExceptions === 0 ? 'bg-green-500' : 'bg-red-500'}`}
                  />
                  Blocking Exceptions: {preChecks.blockingExceptions}
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${preChecks.bankChannelHealth === 'green' ? 'bg-green-500' : 'bg-red-500'}`}
                  />
                  Bank Channel: {preChecks.bankChannelHealth}
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${preChecks.eligibleForFreeze ? 'bg-green-500' : 'bg-red-500'}`}
                  />
                  Eligible: {preChecks.eligibleForFreeze ? 'Yes' : 'No'}
                </div>
              </div>
              {preChecks.warnings?.length > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="text-sm font-medium text-yellow-800">
                    Warnings:
                  </div>
                  <ul className="mt-1 text-sm text-yellow-700">
                    {preChecks.warnings.map((warning, i) => (
                      <li key={i}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}

          {/* Explanation */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <div className="font-medium mb-1">What this does:</div>
                <ul className="space-y-1">
                  <li>• Locks the payroll run to prevent further edits</li>
                  <li>
                    • Generates bank-specific CSV templates for manual import
                  </li>
                  <li>• Creates encrypted offline kit with all payment data</li>
                  <li>
                    • Protects against double payments with disbursement keys
                  </li>
                  <li>
                    • Provides reconciliation template for when systems recover
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Emergency Reason *</Label>
              <Textarea
                id="reason"
                placeholder="e.g., Bank API down, urgent payroll deadline, system maintenance..."
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="password">Emergency Kit Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Strong password for AES-256 encryption"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="mt-1"
              />
              <div className="text-xs text-muted-foreground mt-1">
                This password will encrypt the offline kit. Keep it secure!
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="sepa"
                checked={includeSepa}
                onCheckedChange={checked => setIncludeSepa(checked === true)}
              />
              <Label htmlFor="sepa" className="text-sm">
                Include SEPA pain.001 XML (optional)
              </Label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleFreeze}
              disabled={
                freezeMutation.isPending || !reason.trim() || !password.trim()
              }
              className="bg-red-600 hover:bg-red-700"
            >
              {freezeMutation.isPending ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Generating Kit...
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Generate Emergency Kit
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
