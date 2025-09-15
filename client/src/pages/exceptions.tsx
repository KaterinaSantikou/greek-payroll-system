import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertTriangle,
  Clock,
  MapPin,
  Copy,
  Check,
  X,
  Eye,
  FileEdit,
  Users,
} from 'lucide-react';

export default function Exceptions() {
  const exceptions = [
    {
      id: 1,
      type: 'missed_punch',
      employeeName: 'Maria Kostas',
      department: 'Front Office',
      date: '2025-01-19',
      time: '08:00',
      details: 'No time-out punch recorded',
      severity: 'high',
      autoResolution: 'Suggest 17:00 based on schedule',
      managerNote: 'Left early - family emergency',
      status: 'pending',
    },
    {
      id: 2,
      type: 'duplicate_punch',
      employeeName: 'Dimitris Panos',
      department: 'Housekeeping',
      date: '2025-01-19',
      time: '08:02',
      details: 'Multiple time-in punches within 5 minutes',
      severity: 'low',
      autoResolution: 'Keep first punch at 08:02',
      managerNote: null,
      status: 'pending',
    },
    {
      id: 3,
      type: 'wrong_location',
      employeeName: 'Sofia Nikolaou',
      department: 'F&B',
      date: '2025-01-19',
      time: '15:00',
      details: 'Punched at Front Desk instead of Restaurant',
      severity: 'medium',
      autoResolution: 'Transfer punch to Restaurant location',
      managerNote: 'Covering for colleague briefly',
      status: 'resolved',
    },
    {
      id: 4,
      type: 'late_arrival',
      employeeName: 'Kostas Dimitriou',
      department: 'Maintenance',
      date: '2025-01-18',
      time: '07:23',
      details: '23 minutes late for 07:00 shift',
      severity: 'medium',
      autoResolution: 'No deduction needed - within tolerance',
      managerNote: 'Traffic due to road construction',
      status: 'approved',
    },
    {
      id: 5,
      type: 'missed_punch',
      employeeName: 'Elena Papadaki',
      department: 'Front Office',
      date: '2025-01-18',
      time: '16:00',
      details: 'No time-out punch recorded',
      severity: 'high',
      autoResolution: 'Suggest 00:00 based on night audit schedule',
      managerNote: null,
      status: 'pending',
    },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'destructive';
      case 'resolved':
        return 'default';
      case 'approved':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getExceptionIcon = (type: string) => {
    switch (type) {
      case 'missed_punch':
        return <Clock className="h-4 w-4" />;
      case 'duplicate_punch':
        return <Copy className="h-4 w-4" />;
      case 'wrong_location':
        return <MapPin className="h-4 w-4" />;
      case 'late_arrival':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const pendingExceptions = exceptions.filter(e => e.status === 'pending');
  const resolvedExceptions = exceptions.filter(e => e.status !== 'pending');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Time Exceptions
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Missed/duplicate/wrong site; bulk resolve
          </p>
        </div>
        <div className="flex gap-2">
          <Button>
            <Users className="h-4 w-4 mr-2" />
            Bulk Resolve
          </Button>
          <Button variant="outline">
            <FileEdit className="h-4 w-4 mr-2" />
            Exception Rules
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium">High Priority</p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                  {
                    exceptions.filter(
                      e => e.severity === 'high' && e.status === 'pending'
                    ).length
                  }
                </p>
                <p className="text-xs text-gray-500">Needs attention</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Missed Punches</p>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                  {exceptions.filter(e => e.type === 'missed_punch').length}
                </p>
                <p className="text-xs text-gray-500">Missing clock events</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Copy className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Duplicates</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {exceptions.filter(e => e.type === 'duplicate_punch').length}
                </p>
                <p className="text-xs text-gray-500">Multiple punches</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Check className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Auto-Resolved</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                  87%
                </p>
                <p className="text-xs text-gray-500">This week</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Exceptions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Pending Exceptions ({pendingExceptions.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Checkbox id="selectAll" />
              <label htmlFor="selectAll" className="text-sm">
                Select All
              </label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pendingExceptions.map(exception => (
              <div
                key={exception.id}
                className="p-4 border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-950/20 rounded-r-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <Checkbox className="mt-1" />

                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="p-1 bg-orange-100 dark:bg-orange-900/30 rounded">
                          {getExceptionIcon(exception.type)}
                        </div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {exception.employeeName} - {exception.department}
                        </h3>
                        <Badge variant={getSeverityColor(exception.severity)}>
                          {exception.severity.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Exception:</span>{' '}
                          {exception.type.replace('_', ' ')}
                        </div>
                        <div>
                          <span className="font-medium">Date/Time:</span>{' '}
                          {exception.date} {exception.time}
                        </div>
                        <div>
                          <span className="font-medium">Details:</span>{' '}
                          {exception.details}
                        </div>
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded">
                        <p className="text-sm">
                          <span className="font-medium">Auto-Resolution:</span>{' '}
                          {exception.autoResolution}
                        </p>
                        {exception.managerNote && (
                          <p className="text-sm mt-1">
                            <span className="font-medium">Manager Note:</span>{' '}
                            {exception.managerNote}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button size="sm" variant="outline">
                      <Eye className="h-3 w-3 mr-1" />
                      Details
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Accept
                    </Button>
                    <Button size="sm" variant="destructive">
                      <X className="h-3 w-3 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recently Resolved */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            Recently Resolved ({resolvedExceptions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {resolvedExceptions.map(exception => (
              <div
                key={exception.id}
                className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 dark:bg-gray-800"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1 bg-gray-200 dark:bg-gray-700 rounded">
                    {getExceptionIcon(exception.type)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {exception.employeeName} -{' '}
                      {exception.type.replace('_', ' ')}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {exception.date} {exception.time} - {exception.details}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={getStatusColor(exception.status)}>
                    {exception.status.toUpperCase()}
                  </Badge>
                  <Button size="sm" variant="outline">
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Selected: 0 exceptions
        </p>
        <div className="flex gap-2">
          <Button variant="outline" disabled>
            Approve Selected
          </Button>
          <Button variant="destructive" disabled>
            Reject Selected
          </Button>
        </div>
      </div>
    </div>
  );
}
