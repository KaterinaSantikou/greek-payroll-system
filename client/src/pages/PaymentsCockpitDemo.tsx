/**
 * Payments Cockpit Demo Page
 */

import React from 'react';
import { PaymentsCockpit } from '@/components/PaymentsCockpit';
import { useToast } from '@/hooks/use-toast';

export function PaymentsCockpitDemo() {
  const { toast } = useToast();

  const handleReissueLines = (lineIds: string[]) => {
    toast({
      title: "Re-issue Initiated",
      description: `Processing ${lineIds.length} line(s) for SCT Instant re-issue`,
    });
    
    // This would typically call the API
    console.log('Re-issuing lines as SCT Instant:', lineIds);
  };

  const handleCancelLines = (lineIds: string[]) => {
    toast({
      title: "Lines Cancelled",
      description: `Cancelled ${lineIds.length} payment line(s)`,
    });
    
    console.log('Cancelling lines:', lineIds);
  };

  const handleExportData = (format: 'csv' | 'excel') => {
    toast({
      title: "Export Started",
      description: `Exporting payments data in ${format.toUpperCase()} format`,
    });
    
    console.log('Exporting data in format:', format);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PaymentsCockpit
        batchId="BATCH-DEMO-2025-001"
        onReissueLines={handleReissueLines}
        onCancelLines={handleCancelLines}
        onExportData={handleExportData}
      />
    </div>
  );
}