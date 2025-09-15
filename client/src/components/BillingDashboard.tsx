import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CreditCard,
  FileText,
  Calendar,
  Euro,
  Users,
  Download,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Clock,
  Building2,
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface BillingPlan {
  id: string;
  name: string;
  displayName: string;
  baseFeeEur: string;
  perEmployeeFeeEur: string;
  billingCycle: string;
  maxEmployees: number | null;
  features: string[];
}

interface Subscription {
  id: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  companyName: string;
  vatNumber: string;
  billingEmail: string;
  invoiceLanguage: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  totalCents: number;
  vatAmountCents: number;
  subtotalCents: number;
  mydataTransmitted: boolean;
  language: string;
  type: string;
}

interface PaymentMethod {
  id: string;
  type: string;
  isDefault: boolean;
  cardLast4?: string;
  cardBrand?: string;
  sepaIban?: string;
  status: string;
}

interface Props {
  organizationId: string;
}

export function BillingDashboard({ organizationId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Fetch subscription data
  const { data: subscriptionData, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['/api/billing/subscription', organizationId],
    queryFn: () =>
      apiRequest('GET', `/api/billing/subscription/${organizationId}`).then(
        res => res.json()
      ),
  });

  // Fetch invoices
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['/api/billing/invoices', organizationId],
    queryFn: () =>
      apiRequest('GET', `/api/billing/invoices/${organizationId}`).then(res =>
        res.json()
      ),
  });

  // Fetch payment methods
  const { data: paymentMethods = [], isLoading: paymentMethodsLoading } =
    useQuery({
      queryKey: ['/api/billing/payment-methods', organizationId],
      queryFn: () =>
        apiRequest(
          'GET',
          `/api/billing/payment-methods/${organizationId}`
        ).then(res => res.json()),
    });

  // Fetch metering data
  const { data: meteringData = [] } = useQuery({
    queryKey: ['/api/billing/metering', organizationId],
    queryFn: () =>
      apiRequest('GET', `/api/billing/metering/${organizationId}`).then(res =>
        res.json()
      ),
  });

  // Payment processing mutation
  const processPaymentMutation = useMutation({
    mutationFn: ({
      invoiceId,
      paymentMethodId,
    }: {
      invoiceId: string;
      paymentMethodId?: string;
    }) =>
      apiRequest('POST', `/api/billing/payment/${invoiceId}`, {
        paymentMethodId,
      }),
    onSuccess: () => {
      toast({ title: 'Payment processed successfully' });
      queryClient.invalidateQueries({
        queryKey: ['/api/billing/invoices', organizationId],
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Payment failed',
        description: error.message || 'Failed to process payment',
        variant: 'destructive',
      });
    },
  });

  // myDATA transmission mutation
  const transmitToMyDataMutation = useMutation({
    mutationFn: (invoiceId: string) =>
      apiRequest('POST', `/api/billing/invoice/${invoiceId}/mydata`),
    onSuccess: () => {
      toast({ title: 'Invoice transmitted to myDATA' });
      queryClient.invalidateQueries({
        queryKey: ['/api/billing/invoices', organizationId],
      });
    },
    onError: (error: any) => {
      toast({
        title: 'myDATA transmission failed',
        description: error.message || 'Failed to transmit to myDATA',
        variant: 'destructive',
      });
    },
  });

  if (subscriptionLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const subscription: Subscription = subscriptionData?.subscription;
  const plan: BillingPlan = subscriptionData?.plan;

  if (!subscription || !plan) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          No active subscription found for this organization.
        </AlertDescription>
      </Alert>
    );
  }

  // Calculate metrics
  const overdueInvoices = invoices.filter(
    (inv: Invoice) =>
      inv.status === 'overdue' ||
      (inv.status === 'sent' && new Date(inv.dueDate) < new Date())
  );
  const totalOutstanding = overdueInvoices.reduce(
    (sum: number, inv: Invoice) => sum + inv.totalCents,
    0
  );
  const currentPeriodEnd = new Date(subscription.currentPeriodEnd);
  const daysUntilRenewal = Math.ceil(
    (currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  // Get latest metering data
  const latestMetering = meteringData[0];

  const formatCurrency = (cents: number) => `€${(cents / 100).toFixed(2)}`;

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      draft: 'secondary',
      sent: 'secondary',
      paid: 'default',
      overdue: 'destructive',
      cancelled: 'secondary',
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Current Plan
                </p>
                <p className="text-2xl font-bold">{plan.displayName}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Billable Employees
                </p>
                <p className="text-2xl font-bold">
                  {latestMetering?.billableEmployees || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Euro className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Outstanding</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(totalOutstanding)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Renewal</p>
                <p className="text-2xl font-bold">{daysUntilRenewal} days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="invoices">Invoices & Payments</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="payment-methods">Payment Methods</TabsTrigger>
          <TabsTrigger value="usage">Usage & Metering</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Recent Invoices
              </CardTitle>
            </CardHeader>
            <CardContent>
              {invoicesLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="h-16 bg-gray-200 rounded animate-pulse"
                    ></div>
                  ))}
                </div>
              ) : invoices.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No invoices found
                </p>
              ) : (
                <div className="space-y-4">
                  {invoices.slice(0, 10).map((invoice: Invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <FileText className="h-5 w-5 text-gray-500" />
                        <div>
                          <div className="font-medium">
                            {invoice.invoiceNumber}
                          </div>
                          <div className="text-sm text-gray-500">
                            Issued:{' '}
                            {new Date(invoice.issueDate).toLocaleDateString()}
                            {' • '}
                            Due:{' '}
                            {new Date(invoice.dueDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="font-medium">
                            {formatCurrency(invoice.totalCents)}
                          </div>
                          {getStatusBadge(invoice.status)}
                        </div>

                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              window.open(
                                `/api/billing/invoice/${invoice.id}/pdf`,
                                '_blank'
                              );
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>

                          {invoice.status === 'sent' && (
                            <Button
                              size="sm"
                              onClick={() =>
                                processPaymentMutation.mutate({
                                  invoiceId: invoice.id,
                                })
                              }
                              disabled={processPaymentMutation.isPending}
                            >
                              Pay Now
                            </Button>
                          )}

                          {!invoice.mydataTransmitted &&
                            invoice.status !== 'draft' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  transmitToMyDataMutation.mutate(invoice.id)
                                }
                                disabled={transmitToMyDataMutation.isPending}
                              >
                                <ExternalLink className="h-4 w-4" />
                                myDATA
                              </Button>
                            )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Plan
                  </label>
                  <p className="text-lg font-semibold">{plan.displayName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Status
                  </label>
                  <p>{getStatusBadge(subscription.status)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Base Fee
                  </label>
                  <p className="text-lg">
                    {formatCurrency(
                      Math.round(parseFloat(plan.baseFeeEur) * 100)
                    )}
                    /month
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Per Employee
                  </label>
                  <p className="text-lg">
                    {formatCurrency(
                      Math.round(parseFloat(plan.perEmployeeFeeEur) * 100)
                    )}
                    /employee/month
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Current Period
                  </label>
                  <p>
                    {new Date(
                      subscription.currentPeriodStart
                    ).toLocaleDateString()}{' '}
                    -{' '}
                    {new Date(
                      subscription.currentPeriodEnd
                    ).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Billing Email
                  </label>
                  <p>{subscription.billingEmail}</p>
                </div>
              </div>

              <Separator />

              <div>
                <label className="text-sm font-medium text-gray-600">
                  Plan Features
                </label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {((plan.features as string[]) || []).map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-gray-600">
                  Next renewal:{' '}
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </div>
                <Button variant="outline">Change Plan</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment-methods" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Methods
                </span>
                <Button variant="outline">Add Payment Method</Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {paymentMethodsLoading ? (
                <div className="space-y-2">
                  {[...Array(2)].map((_, i) => (
                    <div
                      key={i}
                      className="h-16 bg-gray-200 rounded animate-pulse"
                    ></div>
                  ))}
                </div>
              ) : paymentMethods.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No payment methods configured
                </p>
              ) : (
                <div className="space-y-4">
                  {paymentMethods.map((method: PaymentMethod) => (
                    <div
                      key={method.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <CreditCard className="h-5 w-5 text-gray-500" />
                        <div>
                          {method.type === 'card' ? (
                            <div>
                              <div className="font-medium">
                                **** **** **** {method.cardLast4}
                              </div>
                              <div className="text-sm text-gray-500">
                                {method.cardBrand?.toUpperCase()}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="font-medium">
                                SEPA Direct Debit
                              </div>
                              <div className="text-sm text-gray-500">
                                ***{method.sepaIban?.slice(-4)}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {method.isDefault && <Badge>Default</Badge>}
                        {getStatusBadge(method.status)}
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Employee Usage & Metering
              </CardTitle>
            </CardHeader>
            <CardContent>
              {meteringData.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No usage data available
                </p>
              ) : (
                <div className="space-y-6">
                  {/* Current Month Summary */}
                  {latestMetering && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h3 className="font-medium mb-2">
                        Current Month ({latestMetering.month}/
                        {latestMetering.year})
                      </h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <div className="text-2xl font-bold">
                            {latestMetering.billableEmployees}
                          </div>
                          <div className="text-sm text-gray-600">
                            Billable Employees
                          </div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold">
                            {latestMetering.uniqueActiveEmployees}
                          </div>
                          <div className="text-sm text-gray-600">
                            Active Headcount
                          </div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold">
                            {latestMetering.employeesWithPayActivity}
                          </div>
                          <div className="text-sm text-gray-600">
                            With Pay Activity
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        Method:{' '}
                        {latestMetering.meteringMethod === 'active_headcount'
                          ? 'Active Headcount'
                          : 'Pay Activity'}
                        {latestMetering.isPartialMonth && ' (Partial Month)'}
                      </div>
                    </div>
                  )}

                  {/* Historical Data */}
                  <div>
                    <h3 className="font-medium mb-4">Historical Usage</h3>
                    <div className="space-y-4">
                      {meteringData.slice(0, 6).map((data: any) => (
                        <div
                          key={`${data.year}-${data.month}`}
                          className="flex items-center justify-between p-3 border rounded"
                        >
                          <div>
                            <div className="font-medium">
                              {data.month}/{data.year}
                            </div>
                            <div className="text-sm text-gray-500">
                              {data.periodStart} - {data.periodEnd}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">
                              {data.billableEmployees} employees
                            </div>
                            <div className="text-sm text-gray-500">
                              {data.meteringMethod === 'active_headcount'
                                ? 'Headcount'
                                : 'Pay Activity'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
