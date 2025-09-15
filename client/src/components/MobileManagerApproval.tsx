import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  MapPin,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface PendingApproval {
  id: string;
  type: 'overtime' | 'leave' | 'schedule_change' | 'expense';
  employeeName: string;
  employeeId: string;
  requestDate: string;
  details: {
    date?: string;
    hours?: number;
    reason?: string;
    amount?: number;
    description?: string;
    startTime?: string;
    endTime?: string;
  };
  urgency: 'high' | 'medium' | 'low';
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
}

const priorityColors = {
  high: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200',
  medium:
    'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200',
  low: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200',
};

const typeLabels = {
  overtime: 'Overtime',
  leave: 'Leave Request',
  schedule_change: 'Schedule Change',
  expense: 'Expense Approval',
};

export default function MobileManagerApproval() {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [approvalComment, setApprovalComment] = useState<
    Record<string, string>
  >({});

  const queryClient = useQueryClient();

  // Fetch pending approvals
  const { data: approvals = [], isLoading } = useQuery({
    queryKey: ['/api/manager/pending-approvals'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Approve/reject mutation
  const approvalMutation = useMutation({
    mutationFn: async ({
      approvalId,
      action,
      comment,
    }: {
      approvalId: string;
      action: 'approve' | 'reject';
      comment?: string;
    }) => {
      return apiRequest(`/api/manager/approvals/${approvalId}`, {
        method: 'POST',
        body: { action, comment },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/manager/pending-approvals'],
      });
      setApprovalComment({});
    },
  });

  const handleApproval = (approvalId: string, action: 'approve' | 'reject') => {
    approvalMutation.mutate({
      approvalId,
      action,
      comment: approvalComment[approvalId] || '',
    });
  };

  const filteredApprovals = approvals.filter((approval: PendingApproval) => {
    const matchesType = filterType === 'all' || approval.type === filterType;
    const matchesSearch =
      approval.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      approval.details.description
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('el-GR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return '';
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('el-GR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getUrgencyColor = (urgency: string) => {
    return (
      priorityColors[urgency as keyof typeof priorityColors] ||
      priorityColors.low
    );
  };

  if (isLoading) {
    return (
      <div className="container-mobile py-6 space-y-4">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p>Loading pending approvals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-mobile py-4 space-y-4">
      {/* Skip link for accessibility */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Header */}
      <div id="main-content" className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Manager Approvals</h1>
          <p className="text-muted-foreground">
            {filteredApprovals.length} pending approval
            {filteredApprovals.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by employee name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 touch-target"
              aria-label="Search pending approvals"
            />
          </div>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="px-3 py-2 border border-input bg-background rounded-md touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Filter by approval type"
          >
            <option value="all">All Types</option>
            <option value="overtime">Overtime</option>
            <option value="leave">Leave</option>
            <option value="schedule_change">Schedule Changes</option>
            <option value="expense">Expenses</option>
          </select>
        </div>
      </div>

      {/* Approval Cards */}
      <div className="space-y-3">
        {filteredApprovals.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <p className="text-lg font-medium">All caught up!</p>
              <p className="text-muted-foreground">
                No pending approvals at this time.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredApprovals.map((approval: PendingApproval) => (
            <Card key={approval.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        variant="outline"
                        className={getUrgencyColor(approval.urgency)}
                      >
                        {approval.urgency.toUpperCase()}
                      </Badge>
                      <Badge variant="secondary">
                        {typeLabels[approval.type]}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">
                      {approval.employeeName}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      ID: {approval.employeeId}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setExpandedCard(
                        expandedCard === approval.id ? null : approval.id
                      )
                    }
                    className="touch-target"
                    aria-expanded={expandedCard === approval.id}
                    aria-label={`${expandedCard === approval.id ? 'Collapse' : 'Expand'} details for ${approval.employeeName}`}
                  >
                    {expandedCard === approval.id ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Quick Summary */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>{formatDate(approval.submittedAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {approval.type === 'overtime' &&
                        approval.details.hours &&
                        `${approval.details.hours} hours`}
                      {approval.type === 'leave' &&
                        approval.details.date &&
                        formatDate(approval.details.date)}
                      {approval.type === 'expense' &&
                        approval.details.amount &&
                        `€${approval.details.amount}`}
                      {approval.type === 'schedule_change' && 'Schedule Change'}
                    </span>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedCard === approval.id && (
                  <div className="space-y-4 pt-4 border-t">
                    {approval.details.description && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Description
                        </label>
                        <p className="mt-1">{approval.details.description}</p>
                      </div>
                    )}

                    {approval.details.startTime && approval.details.endTime && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Time Period
                        </label>
                        <p className="mt-1">
                          {formatTime(approval.details.startTime)} -{' '}
                          {formatTime(approval.details.endTime)}
                        </p>
                      </div>
                    )}

                    {approval.details.reason && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Reason
                        </label>
                        <p className="mt-1">{approval.details.reason}</p>
                      </div>
                    )}

                    {/* Comment Section */}
                    <div>
                      <label
                        htmlFor={`comment-${approval.id}`}
                        className="text-sm font-medium text-muted-foreground"
                      >
                        Add Comment (Optional)
                      </label>
                      <Textarea
                        id={`comment-${approval.id}`}
                        placeholder="Add a comment for this approval..."
                        value={approvalComment[approval.id] || ''}
                        onChange={e =>
                          setApprovalComment(prev => ({
                            ...prev,
                            [approval.id]: e.target.value,
                          }))
                        }
                        className="mt-1 touch-target"
                        rows={3}
                      />
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() => handleApproval(approval.id, 'approve')}
                    disabled={approvalMutation.isPending}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white touch-target btn-focus"
                    aria-label={`Approve request from ${approval.employeeName}`}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => handleApproval(approval.id, 'reject')}
                    disabled={approvalMutation.isPending}
                    variant="destructive"
                    className="flex-1 touch-target btn-focus"
                    aria-label={`Reject request from ${approval.employeeName}`}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Loading Overlay */}
      {approvalMutation.isPending && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              <span>Processing approval...</span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
