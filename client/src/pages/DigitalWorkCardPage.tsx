import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Settings, Clock, BarChart3, Shield, Zap, FileText } from 'lucide-react';
import { DigitalWorkCardSettings } from '@/components/DigitalWorkCardSettings';
import { RetrospectiveOvertimeEntry } from '@/components/RetrospectiveOvertimeEntry';
import { DigitalWorkCardComplianceDashboard } from '@/components/DigitalWorkCardComplianceDashboard';

export function DigitalWorkCardPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">
                Ψηφιακή Κάρτα Εργασίας
              </h1>
              <p className="text-lg text-gray-600 mt-2">
                Σύστημα Διαχείρισης Απολογιστικού & Προαναγγελτικού Τρόπου Λειτουργίας
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="px-3 py-1">
                <Shield className="w-4 h-4 mr-1" />
                ERGANI II Compliant
              </Badge>
              <Badge variant="secondary" className="px-3 py-1">
                <FileText className="w-4 h-4 mr-1" />
                Greek Law 4808/2021
              </Badge>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Τρέχων Τρόπος</p>
                    <p className="text-lg font-bold text-blue-600">Απολογιστικό</p>
                  </div>
                  <Zap className="w-6 h-6 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Κίνδυνος Προστίμου</p>
                    <p className="text-lg font-bold text-red-600">€42,000</p>
                  </div>
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Συμμόρφωση</p>
                    <p className="text-lg font-bold text-green-600">95.4%</p>
                  </div>
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Διατήρηση</p>
                    <p className="text-lg font-bold text-purple-600">5+ έτη</p>
                  </div>
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Compliance Dashboard
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Ρυθμίσεις Συστήματος
            </TabsTrigger>
            <TabsTrigger value="retrospective" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Απολογιστικές Καταχωρήσεις
            </TabsTrigger>
            <TabsTrigger value="help" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Οδηγός & Βοήθεια
            </TabsTrigger>
          </TabsList>

          {/* Compliance Dashboard */}
          <TabsContent value="dashboard" className="space-y-6">
            <DigitalWorkCardComplianceDashboard companyId="COMPANY_001" />
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings" className="space-y-6">
            <DigitalWorkCardSettings />
          </TabsContent>

          {/* Retrospective Entry */}
          <TabsContent value="retrospective" className="space-y-6">
            <RetrospectiveOvertimeEntry />
          </TabsContent>

          {/* Help & Guide */}
          <TabsContent value="help" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Οδηγός Χρήσης - Ψηφιακή Κάρτα Εργασίας
                </CardTitle>
                <CardDescription>
                  Πλήρης οδηγός για τη σωστή χρήση του απολογιστικού συστήματος
                </CardDescription>
              </CardHeader>
              <CardContent className="prose max-w-none">
                <div className="space-y-6">
                  {/* Legal Framework */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Νομικό Πλαίσιο</h3>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                      <p><strong>Νόμος 4808/2021:</strong> Ψηφιακή Κάρτα Εργασίας και ERGANI II</p>
                      <p><strong>Υπουργική Απόφαση:</strong> Οδηγός Εφαρμογής ΨΚΕ 2024</p>
                      <p><strong>Πρόστιμα:</strong> €10,500 ανά παράβαση για λανθασμένα χτυπήματα</p>
                      <p><strong>Διατήρηση:</strong> Ελάχιστο 5 έτη αρχειοθέτηση</p>
                    </div>
                  </div>

                  {/* Operational Modes */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Τρόποι Λειτουργίας</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border rounded-lg p-4">
                        <h4 className="font-semibold text-green-700 mb-2">Προαναγγελτικό Σύστημα</h4>
                        <ul className="text-sm space-y-1 text-gray-600">
                          <li>• Προκαταρκτική δήλωση αλλαγών ωραρίου</li>
                          <li>• Real-time συγχρονισμός με ERGANI II</li>
                          <li>• Υποχρεωτική προέγκριση υπερωριών</li>
                          <li>• Μηδενική ανοχή καθυστέρησης</li>
                        </ul>
                      </div>
                      <div className="border rounded-lg p-4">
                        <h4 className="font-semibold text-amber-700 mb-2">Απολογιστικό Σύστημα</h4>
                        <ul className="text-sm space-y-1 text-gray-600">
                          <li>• Εκ των υστέρων καταχώρηση γεγονότων</li>
                          <li>• Προθεσμία: 72 ώρες (γενικά)</li>
                          <li>• Υπερωρίες: 24 ώρες προθεσμία</li>
                          <li>• Αυξημένος κίνδυνος προστίμων</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Key Deadlines */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Κρίσιμες Προθεσμίες</h3>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold text-amber-800">Απολογιστικές Καταχωρήσεις</h4>
                          <p className="text-sm text-amber-700 mt-1">
                            <strong>72 ώρες:</strong> Μέγιστη προθεσμία για γενικές καταχωρήσεις<br />
                            <strong>24 ώρες:</strong> Αναφορά υπερωριών και αλλαγών ωραρίου
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-red-800">Αλλαγή Τρόπου Λειτουργίας</h4>
                          <p className="text-sm text-red-700 mt-1">
                            <strong>Πριν τον μήνα:</strong> Δήλωση αλλαγής τρόπου<br />
                            <strong>Απαγόρευση:</strong> Μικτοί τρόποι στον ίδιο μήνα
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Best Practices */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Βέλτιστες Πρακτικές</h3>
                    <div className="space-y-3">
                      <div className="border-l-4 border-green-500 pl-4">
                        <h4 className="font-semibold text-green-700">Συμμόρφωση</h4>
                        <p className="text-sm text-gray-600">
                          Χρησιμοποιείτε το Compliance Dashboard για καθημερινή παρακολούθηση και έγκαιρη διόρθωση παραβάσεων.
                        </p>
                      </div>
                      <div className="border-l-4 border-blue-500 pl-4">
                        <h4 className="font-semibold text-blue-700">Εκπαίδευση Προσωπικού</h4>
                        <p className="text-sm text-gray-600">
                          Εκπαιδεύστε τους εργαζομένους στις προθεσμίες και τη σωστή χρήση του συστήματος.
                        </p>
                      </div>
                      <div className="border-l-4 border-purple-500 pl-4">
                        <h4 className="font-semibold text-purple-700">Audit Trail</h4>
                        <p className="text-sm text-gray-600">
                          Διατηρείτε immutable audit trails για νομική προστασία και 5-ετή αρχειοθέτηση.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Emergency Procedures */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Διαδικασίες Έκτακτης Ανάγκης</h3>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="font-semibold text-red-800 mb-2">Σε περίπτωση παραβάσεων €10,500+:</h4>
                      <ol className="list-decimal list-inside text-sm text-red-700 space-y-1">
                        <li>Άμεση διόρθωση μέσω του συστήματος</li>
                        <li>Τεκμηρίωση των ενεργειών στο Audit Trail</li>
                        <li>Ενημέρωση νομικού τμήματος</li>
                        <li>Υποβολή διορθωτικών αναφορών στο ERGANI II</li>
                        <li>Αξιολόγηση και βελτίωση διαδικασιών</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}