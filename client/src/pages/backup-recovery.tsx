/**
 * Database Backup and Recovery Management Page
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  DownloadIcon, 
  RefreshCwIcon, 
  DatabaseIcon, 
  ShieldCheckIcon, 
  ClockIcon, 
  HardDriveIcon,
  AlertTriangleIcon,
  CheckCircleIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface BackupMetadata {
  id: string;
  timestamp: string;
  type: 'automated' | 'manual' | 'pre-deployment';
  size: number;
  tables: string[];
  status: 'completed' | 'failed' | 'in_progress';
  location: string;
  checksum?: string;
}

interface BackupHealth {
  totalBackups: number;
  lastBackupTime: string | null;
  totalSize: number;
  oldestBackup: string | null;
  failedBackups: number;
  status: 'healthy' | 'warning';
  lastBackupAge: number | null;
}

export default function BackupRecoveryPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch backups list
  const { data: backupsData, isLoading: backupsLoading, refetch: refetchBackups } = useQuery({
    queryKey: ['/api/backup/list'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch backup health
  const { data: healthData, isLoading: healthLoading } = useQuery({
    queryKey: ['/api/backup/health'],
    refetchInterval: 60000 // Refresh every minute
  });

  // Create backup mutation
  const createBackupMutation = useMutation({
    mutationFn: (type: 'manual' | 'pre-deployment') => 
      apiRequest('/api/backup/create', {
        method: 'POST',
        body: { type }
      }),
    onSuccess: () => {
      toast({
        title: 'Backup Created',
        description: 'Database backup has been created successfully'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/backup/list'] });
      queryClient.invalidateQueries({ queryKey: ['/api/backup/health'] });
    },
    onError: () => {
      toast({
        title: 'Backup Failed',
        description: 'Failed to create database backup',
        variant: 'destructive'
      });
    }
  });

  // Restore backup mutation (dry run)
  const restoreBackupMutation = useMutation({
    mutationFn: ({ backupId, dryRun }: { backupId: string; dryRun: boolean }) =>
      apiRequest('/api/backup/restore', {
        method: 'POST',
        body: { backupId, dryRun }
      }),
    onSuccess: (_, variables) => {
      toast({
        title: variables.dryRun ? 'Restore Validated' : 'Restore Prepared',
        description: variables.dryRun 
          ? 'Backup validation completed successfully'
          : 'Restore preparation completed - manual execution required'
      });
    },
    onError: () => {
      toast({
        title: 'Restore Failed',
        description: 'Failed to restore from backup',
        variant: 'destructive'
      });
    }
  });

  const backups: BackupMetadata[] = backupsData?.backups || [];
  const health: BackupHealth = healthData?.health || {
    totalBackups: 0,
    lastBackupTime: null,
    totalSize: 0,
    oldestBackup: null,
    failedBackups: 0,
    status: 'warning',
    lastBackupAge: null
  };

  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const getBackupTypeColor = (type: string): string => {
    switch (type) {
      case 'automated': return 'bg-blue-500';
      case 'manual': return 'bg-green-500';
      case 'pre-deployment': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'in_progress': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Database Backup & Recovery</h1>
          <p className="text-muted-foreground">
            Manage database backups and recovery operations
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => refetchBackups()}
            variant="outline"
            size="sm"
          >
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            onClick={() => createBackupMutation.mutate('manual')}
            disabled={createBackupMutation.isPending}
          >
            <DatabaseIcon className="h-4 w-4 mr-2" />
            {createBackupMutation.isPending ? 'Creating...' : 'Create Backup'}
          </Button>
        </div>
      </div>

      {/* Backup Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <ShieldCheckIcon className="h-4 w-4 mr-2" />
              Health Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {health.status === 'healthy' ? (
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangleIcon className="h-5 w-5 text-orange-500" />
              )}
              <span className={`font-semibold ${
                health.status === 'healthy' ? 'text-green-600' : 'text-orange-600'
              }`}>
                {health.status === 'healthy' ? 'Healthy' : 'Warning'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <DatabaseIcon className="h-4 w-4 mr-2" />
              Total Backups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{health.totalBackups}</div>
            <p className="text-xs text-muted-foreground">
              {health.failedBackups > 0 && `${health.failedBackups} failed`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <ClockIcon className="h-4 w-4 mr-2" />
              Last Backup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {health.lastBackupTime ? (
                <>
                  {health.lastBackupAge !== null && health.lastBackupAge < 24 ? (
                    <span className="text-green-600">{health.lastBackupAge}h ago</span>
                  ) : (
                    <span className="text-orange-600">
                      {health.lastBackupAge !== null ? `${Math.floor(health.lastBackupAge / 24)}d ago` : 'N/A'}
                    </span>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(health.lastBackupTime)}
                  </p>
                </>
              ) : (
                <span className="text-red-600">No backups</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <HardDriveIcon className="h-4 w-4 mr-2" />
              Total Size
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatFileSize(health.totalSize)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Replit Point-in-Time Recovery Info */}
      <Alert>
        <DatabaseIcon className="h-4 w-4" />
        <AlertDescription>
          <strong>Replit Built-in Recovery:</strong> Your database supports point-in-time recovery 
          through the Database tool in your workspace. Access Settings → Restore to recover to any 
          specific timestamp within your retention period.
        </AlertDescription>
      </Alert>

      {/* Backups List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DatabaseIcon className="h-5 w-5 mr-2" />
            Backup History
          </CardTitle>
          <CardDescription>
            Recent database backups and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {backupsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DatabaseIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No backups found</p>
              <p className="text-sm">Create your first backup to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {backups.map((backup) => (
                <div key={backup.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${getBackupTypeColor(backup.type)}`} />
                      <div>
                        <h4 className="font-medium">{backup.id}</h4>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>{formatDate(backup.timestamp)}</span>
                          <Badge variant="outline">{backup.type}</Badge>
                          <span className={getStatusColor(backup.status)}>
                            {backup.status}
                          </span>
                          <span>{formatFileSize(backup.size)}</span>
                          <span>{backup.tables.length} tables</span>
                        </div>
                      </div>
                    </div>
                    
                    {backup.status === 'completed' && (
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => restoreBackupMutation.mutate({ 
                            backupId: backup.id, 
                            dryRun: true 
                          })}
                          disabled={restoreBackupMutation.isPending}
                        >
                          Validate
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => restoreBackupMutation.mutate({ 
                            backupId: backup.id, 
                            dryRun: false 
                          })}
                          disabled={restoreBackupMutation.isPending}
                        >
                          Prepare Restore
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recovery Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Recovery Procedures</CardTitle>
          <CardDescription>
            Step-by-step recovery instructions for different scenarios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">🕐 Point-in-Time Recovery (Replit Built-in)</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Go to Database tool in your workspace</li>
              <li>Click Settings tab</li>
              <li>Use Restore tool and enter target timestamp</li>
              <li>Click Restore to recover to that point in time</li>
            </ol>
          </div>
          
          <Separator />
          
          <div>
            <h4 className="font-medium mb-2">💾 Backup-based Recovery</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Validate backup integrity using "Validate" button</li>
              <li>Click "Prepare Restore" to ready backup for manual execution</li>
              <li>Follow provided SQL dump instructions</li>
              <li>Verify data integrity after restoration</li>
            </ol>
          </div>
          
          <Separator />
          
          <div>
            <h4 className="font-medium mb-2">🚀 Pre-deployment Backup</h4>
            <Button
              variant="outline"
              size="sm"
              onClick={() => createBackupMutation.mutate('pre-deployment')}
              disabled={createBackupMutation.isPending}
            >
              Create Pre-deployment Backup
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              Recommended before major deployments or schema changes
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}