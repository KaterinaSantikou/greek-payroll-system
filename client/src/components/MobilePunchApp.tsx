/**
 * Mobile Punch App - Offline-first time tracking for employees
 * Works offline, queues punches, syncs when online
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Clock,
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  MapPin,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { offlineStorage, type OfflinePunchEvent } from '@/lib/offlineStorage';
import { syncService, type SyncResult } from '@/lib/syncService';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface PunchAppProps {
  employeeId: string;
  propertyId: string;
}

interface LastPunchStatus {
  lastPunch?: {
    type: string;
    timestamp: string;
    location?: string;
  };
  isOnBreak: boolean;
  canPunchOut: boolean;
}

export function MobilePunchApp({ employeeId, propertyId }: PunchAppProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [pendingPunches, setPendingPunches] = useState<OfflinePunchEvent[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncResult | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load pending punches
  useEffect(() => {
    loadPendingPunches();
  }, []);

  // Listen for sync completion
  useEffect(() => {
    const handleSyncCompleted = (event: CustomEvent<SyncResult>) => {
      setSyncStatus(event.detail);
      loadPendingPunches();

      if (event.detail.success && event.detail.syncedItems > 0) {
        toast({
          title: 'Sync Complete',
          description: `${event.detail.syncedItems} items synced successfully`,
        });
      }
    };

    window.addEventListener(
      'syncCompleted',
      handleSyncCompleted as EventListener
    );
    return () =>
      window.removeEventListener(
        'syncCompleted',
        handleSyncCompleted as EventListener
      );
  }, [toast]);

  // Get current location
  const getCurrentLocation = (): Promise<{
    latitude: number;
    longitude: number;
  }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      setIsGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        position => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setLocation(coords);
          setIsGettingLocation(false);
          resolve(coords);
        },
        error => {
          setIsGettingLocation(false);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      );
    });
  };

  // Load pending punches from offline storage
  const loadPendingPunches = async () => {
    try {
      const pending = await offlineStorage.getPendingPunchEvents();
      setPendingPunches(pending);
    } catch (error) {
      console.error('Failed to load pending punches:', error);
    }
  };

  // Get last punch status
  const { data: lastPunchStatus, isLoading: isLoadingStatus } =
    useQuery<LastPunchStatus>({
      queryKey: ['/api/employees', employeeId, 'punch-status'],
      enabled: isOnline,
      refetchInterval: 30000, // Refresh every 30 seconds when online
      retry: false,
    });

  // Punch mutation (works offline)
  const punchMutation = useMutation({
    mutationFn: async ({
      type,
      location,
    }: {
      type: string;
      location?: { latitude: number; longitude: number };
    }) => {
      const timestamp = new Date().toISOString();
      const clientEventId = `punch_${employeeId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const punchData: OfflinePunchEvent = {
        clientEventId,
        employeeId,
        propertyId,
        timestamp,
        type: type as any,
        method: 'mobile',
        latitude: location?.latitude,
        longitude: location?.longitude,
        sourceDeviceId: navigator.userAgent,
        syncStatus: isOnline ? 'synced' : 'pending',
        syncAttempts: 0,
        createdAt: timestamp,
      };

      // Save to offline storage first
      await offlineStorage.savePunchEvent(punchData);

      // Try to sync immediately if online
      if (isOnline) {
        try {
          await apiRequest('POST', '/api/punch-events', {
            employeeId: punchData.employeeId,
            propertyId: punchData.propertyId,
            timestamp: punchData.timestamp,
            type: punchData.type,
            method: punchData.method,
            latitude: punchData.latitude,
            longitude: punchData.longitude,
            clientEventId: punchData.clientEventId,
            offlineFlag: false,
          });

          // Mark as synced
          await offlineStorage.updatePunchEventSyncStatus(
            clientEventId,
            'synced'
          );
        } catch (error) {
          // Mark as failed, will retry later
          await offlineStorage.updatePunchEventSyncStatus(
            clientEventId,
            'failed',
            error instanceof Error ? error.message : 'Sync failed'
          );
          throw error;
        }
      }

      return punchData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/employees', employeeId, 'punch-status'],
      });
      loadPendingPunches();
    },
    onError: error => {
      toast({
        variant: 'destructive',
        title: 'Punch Failed',
        description:
          error instanceof Error ? error.message : 'Failed to record punch',
      });
    },
  });

  // Handle punch action
  const handlePunch = async (type: string) => {
    try {
      let locationData = location;

      // Get fresh location if we don't have it or it's old
      if (!locationData) {
        try {
          locationData = await getCurrentLocation();
        } catch (error) {
          console.warn('Could not get location:', error);
          // Continue without location
        }
      }

      await punchMutation.mutateAsync({
        type,
        location: locationData || undefined,
      });

      const action =
        type === 'in'
          ? 'Clock In'
          : type === 'out'
            ? 'Clock Out'
            : type === 'break_in'
              ? 'Break Start'
              : 'Break End';

      toast({
        title: `${action} Recorded`,
        description: isOnline
          ? 'Synced immediately'
          : 'Saved offline - will sync when connected',
      });
    } catch (error) {
      // Error already handled in mutation
    }
  };

  // Force sync
  const handleForceSync = async () => {
    try {
      const result = await syncService.forcSync();
      setSyncStatus(result);
      loadPendingPunches();

      toast({
        title: result.success ? 'Sync Complete' : 'Sync Failed',
        description: result.success
          ? `${result.syncedItems} items synced, ${result.failedItems} failed`
          : 'Some items failed to sync',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Sync Error',
        description: 'Failed to sync data',
      });
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Time Clock
            </CardTitle>
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-800"
                >
                  <Wifi className="h-3 w-3 mr-1" />
                  Online
                </Badge>
              ) : (
                <Badge
                  variant="secondary"
                  className="bg-orange-100 text-orange-800"
                >
                  <WifiOff className="h-3 w-3 mr-1" />
                  Offline
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-2">
            <div className="text-2xl font-bold">
              {format(new Date(), 'HH:mm:ss')}
            </div>
            <div className="text-sm text-muted-foreground">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Status */}
      {lastPunchStatus && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Current Status</CardTitle>
          </CardHeader>
          <CardContent>
            {lastPunchStatus.lastPunch ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Last Action:
                  </span>
                  <Badge
                    variant={
                      lastPunchStatus.lastPunch.type === 'in'
                        ? 'default'
                        : lastPunchStatus.lastPunch.type === 'out'
                          ? 'secondary'
                          : 'outline'
                    }
                  >
                    {lastPunchStatus.lastPunch.type === 'in'
                      ? 'Clocked In'
                      : lastPunchStatus.lastPunch.type === 'out'
                        ? 'Clocked Out'
                        : lastPunchStatus.lastPunch.type === 'break_in'
                          ? 'On Break'
                          : 'Back from Break'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Time:</span>
                  <span className="text-sm">
                    {format(
                      new Date(lastPunchStatus.lastPunch.timestamp),
                      'HH:mm'
                    )}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center text-sm text-muted-foreground">
                No punches recorded today
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Punch Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <Button
          onClick={() => handlePunch('in')}
          disabled={punchMutation.isPending || isGettingLocation}
          className="h-16 bg-green-600 hover:bg-green-700"
        >
          {isGettingLocation ? (
            <MapPin className="h-4 w-4 animate-pulse" />
          ) : (
            <>
              <Clock className="h-4 w-4 mr-2" />
              Clock In
            </>
          )}
        </Button>

        <Button
          onClick={() => handlePunch('out')}
          disabled={punchMutation.isPending || isGettingLocation}
          variant="destructive"
          className="h-16"
        >
          {isGettingLocation ? (
            <MapPin className="h-4 w-4 animate-pulse" />
          ) : (
            <>
              <Clock className="h-4 w-4 mr-2" />
              Clock Out
            </>
          )}
        </Button>

        <Button
          onClick={() => handlePunch('break_in')}
          disabled={punchMutation.isPending || isGettingLocation}
          variant="outline"
          className="h-16"
        >
          Start Break
        </Button>

        <Button
          onClick={() => handlePunch('break_out')}
          disabled={punchMutation.isPending || isGettingLocation}
          variant="outline"
          className="h-16"
        >
          End Break
        </Button>
      </div>

      {/* Pending Punches */}
      {pendingPunches.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Pending Sync</CardTitle>
              <Button
                onClick={handleForceSync}
                disabled={!isOnline}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Sync
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingPunches.map(punch => (
                <div
                  key={punch.clientEventId}
                  className="flex items-center justify-between p-2 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    {punch.syncStatus === 'failed' ? (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-orange-500" />
                    )}
                    <div>
                      <div className="text-sm font-medium">
                        {punch.type === 'in'
                          ? 'Clock In'
                          : punch.type === 'out'
                            ? 'Clock Out'
                            : punch.type === 'break_in'
                              ? 'Break Start'
                              : 'Break End'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(punch.timestamp), 'HH:mm')}
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant={
                      punch.syncStatus === 'failed'
                        ? 'destructive'
                        : 'secondary'
                    }
                  >
                    {punch.syncStatus}
                  </Badge>
                </div>
              ))}
            </div>

            {!isOnline && (
              <Alert className="mt-3">
                <WifiOff className="h-4 w-4" />
                <AlertDescription>
                  {pendingPunches.length} punch
                  {pendingPunches.length > 1 ? 'es' : ''} will sync when
                  connection is restored
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Location Status */}
      {location && (
        <Card>
          <CardContent className="pt-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-3 w-3" />
              Location: {location.latitude.toFixed(6)},{' '}
              {location.longitude.toFixed(6)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sync Status */}
      {syncStatus && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              {syncStatus.success ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              )}
              Last Sync Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Synced:</span>
                <span className="text-sm font-medium">
                  {syncStatus.syncedItems}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Failed:</span>
                <span className="text-sm font-medium">
                  {syncStatus.failedItems}
                </span>
              </div>
              {syncStatus.conflicts.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm">Conflicts:</span>
                  <span className="text-sm font-medium text-orange-600">
                    {syncStatus.conflicts.length}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
