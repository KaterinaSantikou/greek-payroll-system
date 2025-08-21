import React from "react";
import { RetrospectiveModeManagement } from "@/components/RetrospectiveModeManagement";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Database, 
  FileText, 
  Send, 
  Settings, 
  Info,
  Shield,
  Clock,
  Archive
} from "lucide-react";

/**
 * Demo page showcasing the comprehensive Digital Work Card retrospective architecture
 * Implemented according to Greek legal requirements for 5-year retention and compliance
 */
export default function RetrospectiveModeDemo() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
            PayrollSync Digital Work Card
          </h1>
          <h2 className="text-2xl font-semibold text-gray-800">
            Comprehensive Retrospective Mode Architecture
          </h2>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto">
            Complete implementation of Greek legal compliance system for Digital Work Card (Ψηφιακή Κάρτα Εργασίας) 
            with retrospective ("απολογιστικό") and pre-announcement ("προαναγγελτικό") operational modes.
          </p>
          
          <div className="flex justify-center gap-4 flex-wrap">
            <Badge variant="outline" className="px-4 py-2">
              <Database className="h-4 w-4 mr-2" />
              EntityMonthMode System
            </Badge>
            <Badge variant="outline" className="px-4 py-2">
              <Clock className="h-4 w-4 mr-2" />
              Real-time Processing
            </Badge>
            <Badge variant="outline" className="px-4 py-2">
              <Send className="h-4 w-4 mr-2" />
              ERGANI II Integration
            </Badge>
            <Badge variant="outline" className="px-4 py-2">
              <Archive className="h-4 w-4 mr-2" />
              5-Year Retention
            </Badge>
          </div>
        </div>

        {/* Architecture Overview */}
        <Card className="border-2 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Shield className="h-6 w-6 text-blue-600" />
              Architecture Implementation Overview
            </CardTitle>
            <CardDescription className="text-lg">
              Complete retrospective mode system with baseline comparison, deviation detection, 
              ERGANI II batch submissions, and cryptographic evidence preservation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-green-200 bg-green-50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Settings className="h-5 w-5 text-green-600" />
                    Entity Month Mode
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>✓ Monthly mode declarations</div>
                  <div>✓ Cannot mix modes in month</div>
                  <div>✓ Legal deadline tracking</div>
                  <div>✓ Validation & compliance</div>
                </CardContent>
              </Card>
              
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Database className="h-5 w-5 text-blue-600" />
                    Processing Engine
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>✓ Real-time punch ingestion</div>
                  <div>✓ Shift consolidation/pairing</div>
                  <div>✓ Night zone processing</div>
                  <div>✓ Deviation detection</div>
                </CardContent>
              </Card>
              
              <Card className="border-purple-200 bg-purple-50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Send className="h-5 w-5 text-purple-600" />
                    ERGANI II Batches
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>✓ T+3 working days target</div>
                  <div>✓ Idempotency keys</div>
                  <div>✓ Retry logic & receipts</div>
                  <div>✓ Legal deadline enforcement</div>
                </CardContent>
              </Card>
              
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5 text-orange-600" />
                    Evidence Packs
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>✓ Timesheet snapshots</div>
                  <div>✓ GPS & geofence data</div>
                  <div>✓ Digital signatures</div>
                  <div>✓ 5-year legal retention</div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Database Schema Implementation */}
        <Card className="border-2 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Database className="h-6 w-6 text-green-600" />
              Database Schema Implementation
            </CardTitle>
            <CardDescription className="text-lg">
              Complete database architecture with comprehensive indexing and Greek legal compliance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-800">Core Tables Implemented:</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <div className="font-medium text-green-700">entity_month_mode</div>
                      <div className="text-sm text-gray-600">Monthly operational mode declarations with unique company/month constraint</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <div className="font-medium text-blue-700">employee_schedule_baselines</div>
                      <div className="text-sm text-gray-600">Contractual schedule patterns for comparison and deviation detection</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                    <div>
                      <div className="font-medium text-purple-700">timeline_events</div>
                      <div className="text-sm text-gray-600">Enhanced punch storage with GPS, device fingerprints, and cryptographic integrity</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                    <div>
                      <div className="font-medium text-orange-700">work_hour_change_items</div>
                      <div className="text-sm text-gray-600">Deviation detection results with overtime, night, Sunday, and holiday classifications</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                    <div>
                      <div className="font-medium text-red-700">ergani_declaration_batches</div>
                      <div className="text-sm text-gray-600">ERGANI II batch submission system with idempotency and compliance deadlines</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2"></div>
                    <div>
                      <div className="font-medium text-indigo-700">work_card_evidence_packs</div>
                      <div className="text-sm text-gray-600">Comprehensive evidence storage with 5-year retention and legal hold capabilities</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-800">Key Features:</h3>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Greek Legal Compliance</AlertTitle>
                  <AlertDescription className="space-y-2 text-sm">
                    <div>• <strong>Cannot mix modes:</strong> Unique constraint prevents mixing retrospective/preannounce in same month</div>
                    <div>• <strong>Deadline tracking:</strong> Internal T+3 working days target with legal deadline enforcement</div>
                    <div>• <strong>Evidence preservation:</strong> Cryptographic integrity with SHA-256 hashes and digital signatures</div>
                    <div>• <strong>5-year retention:</strong> Automatic retention policy with legal hold capabilities</div>
                    <div>• <strong>ERGANI compliance:</strong> Idempotency keys, receipt storage, and retry logic</div>
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Service Layer Implementation */}
        <Card className="border-2 border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Settings className="h-6 w-6 text-purple-600" />
              Service Layer Architecture
            </CardTitle>
            <CardDescription className="text-lg">
              Comprehensive service layer with processing engines, batch management, and compliance validation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-blue-700">RetrospectiveProcessingEngine</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div><strong>Ingestion:</strong> Real-time punch collection with validation</div>
                  <div><strong>Consolidation:</strong> Shift pairing, split detection, night zones</div>
                  <div><strong>Detection:</strong> Baseline comparison & deviation analysis</div>
                  <div><strong>Evidence:</strong> Comprehensive evidence pack generation</div>
                </CardContent>
              </Card>
              
              <Card className="border-green-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-green-700">ErganiDeclarationService</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div><strong>Batch Building:</strong> Optimal grouping for ERGANI submission</div>
                  <div><strong>Deadlines:</strong> T+3 working days with penalty risk calculation</div>
                  <div><strong>Submission:</strong> API integration with retry logic</div>
                  <div><strong>Compliance:</strong> Validation & Greek legal requirements</div>
                </CardContent>
              </Card>
              
              <Card className="border-orange-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-orange-700">EntityMonthModeService</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div><strong>Mode Declaration:</strong> Monthly operational mode management</div>
                  <div><strong>Validation:</strong> Greek legal requirement enforcement</div>
                  <div><strong>Compliance Reports:</strong> Risk assessment & recommendations</div>
                  <div><strong>Smart Suggestions:</strong> AI-powered mode recommendations</div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Live Management Interface */}
        <Card className="border-2 border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Clock className="h-6 w-6 text-gray-600" />
              Live Management Interface
            </CardTitle>
            <CardDescription className="text-lg">
              Complete management dashboard with bilingual support (Greek/English) and real-time processing capabilities.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RetrospectiveModeManagement 
              tenantId="demo_tenant_001" 
              companyId="DEMO_COMPANY_GR"
              locale="el"
            />
          </CardContent>
        </Card>

        {/* Technical Implementation Summary */}
        <Card className="border-2 border-indigo-200 bg-indigo-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Shield className="h-6 w-6 text-indigo-600" />
              Technical Implementation Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-indigo-800">Database Architecture ✅</h3>
                <div className="space-y-2 text-sm">
                  <div>✓ 6 new tables with comprehensive relationships</div>
                  <div>✓ Strategic indexing for performance</div>
                  <div>✓ Greek legal compliance constraints</div>
                  <div>✓ 5-year retention with legal hold support</div>
                  <div>✓ Cryptographic integrity validation</div>
                </div>
                
                <h3 className="text-xl font-semibold text-indigo-800">Processing Logic ✅</h3>
                <div className="space-y-2 text-sm">
                  <div>✓ Near-real-time punch ingestion</div>
                  <div>✓ Intelligent shift consolidation</div>
                  <div>✓ Baseline vs actual deviation detection</div>
                  <div>✓ Night zone processing (22:00-06:00)</div>
                  <div>✓ Evidence pack generation with GPS/device data</div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-indigo-800">ERGANI II Integration ✅</h3>
                <div className="space-y-2 text-sm">
                  <div>✓ Batch submission system with idempotency</div>
                  <div>✓ T+3 working days internal target</div>
                  <div>✓ Legal deadline enforcement</div>
                  <div>✓ Retry logic with exponential backoff</div>
                  <div>✓ Receipt storage and validation</div>
                </div>
                
                <h3 className="text-xl font-semibold text-indigo-800">User Experience ✅</h3>
                <div className="space-y-2 text-sm">
                  <div>✓ Bilingual interface (Greek/English)</div>
                  <div>✓ Real-time processing with progress tracking</div>
                  <div>✓ Comprehensive compliance reporting</div>
                  <div>✓ Smart mode recommendations</div>
                  <div>✓ Risk assessment and alerts</div>
                </div>
              </div>
            </div>
            
            <Alert className="mt-6 border-green-300 bg-green-50">
              <Shield className="h-4 w-4" />
              <AlertTitle className="text-green-800">Implementation Complete</AlertTitle>
              <AlertDescription className="text-green-700">
                The comprehensive retrospective mode architecture for PayrollSync's Digital Work Card system has been 
                fully implemented according to Greek legal requirements, including EntityMonthMode declarations, 
                baseline schedule comparison, deviation detection engine, ERGANI II batch submissions, and 
                evidence packs with 5-year retention capabilities.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}