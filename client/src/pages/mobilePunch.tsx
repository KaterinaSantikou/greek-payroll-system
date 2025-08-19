/**
 * Mobile Punch Page - Dedicated page for the mobile punch app
 */

import { MobilePunchApp } from '@/components/MobilePunchApp';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';

export default function MobilePunch() {
  const { user } = useAuth();
  
  // Get user's default property or let them select
  const { data: userProfile } = useQuery<{ id: string; defaultPropertyId?: string }>({
    queryKey: ['/api/user/profile'],
    enabled: !!user?.id,
  });

  // For demo purposes, use a default employee and property
  const employeeId = user?.id || 'demo-employee';
  const propertyId = userProfile?.defaultPropertyId || 'prop-princess';

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto">
        <MobilePunchApp 
          employeeId={employeeId} 
          propertyId={propertyId} 
        />
      </div>
    </div>
  );
}