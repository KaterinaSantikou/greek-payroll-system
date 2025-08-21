import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertTriangle, 
  Clock, 
  MapPin, 
  Coffee,
  CheckSquare,
  X,
  Settings,
  Zap
} from "lucide-react";

interface Exception {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  type: 'missed' | 'duplicate' | 'off-site' | 'break_overrun' | 'schedule_deviation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestedFix?: string;
  canAutoFix?: boolean;
  affectedMinutes?: number;
  location?: string;
  timestamp?: string;
}

interface ExceptionBoardProps {
  exceptions: Exception[];
  locale?: 'en' | 'el';
  onBulkFix?: (exceptionIds: string[], fixType: string, reason: string) => void;
  onIndividualFix?: (exceptionId: string, fixType: string, reason: string) => void;
}

/**
 * Exception Board with Bulk Fix Capabilities
 * Exception board (missed, duplicate, off-site, break overrun) με bulk fix
 */
export function ExceptionBoard({
  exceptions,
  locale = 'el',
  onBulkFix,
  onIndividualFix
}: ExceptionBoardProps) {
  const [selectedExceptions, setSelectedExceptions] = useState<Set<string>>(new Set());
  const [bulkFixType, setBulkFixType] = useState<string>('');
  const [bulkFixReason, setBulkFixReason] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  const exceptionTypes = {
    missed: {
      icon: <X className="h-4 w-4" />,
      color: 'bg-red-100 text-red-800 border-red-300',
      label: locale === 'el' ? 'Χαμένο χτύπημα' : 'Missed Punch'
    },
    duplicate: {
      icon: <CheckSquare className="h-4 w-4" />,
      color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      label: locale === 'el' ? 'Διπλό χτύπημα' : 'Duplicate Punch'
    },
    'off-site': {
      icon: <MapPin className="h-4 w-4" />,
      color: 'bg-orange-100 text-orange-800 border-orange-300',
      label: locale === 'el' ? 'Εκτός εγκαταστάσεων' : 'Off-site Location'
    },
    break_overrun: {
      icon: <Coffee className="h-4 w-4" />,
      color: 'bg-blue-100 text-blue-800 border-blue-300',
      label: locale === 'el' ? 'Υπέρβαση διαλείμματος' : 'Break Overrun'
    },
    schedule_deviation: {
      icon: <Clock className="h-4 w-4" />,
      color: 'bg-purple-100 text-purple-800 border-purple-300',
      label: locale === 'el' ? 'Απόκλιση προγράμματος' : 'Schedule Deviation'
    }
  };

  const severityColors = {
    low: 'text-green-600',
    medium: 'text-yellow-600',
    high: 'text-orange-600',
    critical: 'text-red-600'
  };

  const filteredExceptions = exceptions.filter(exception => {
    if (filterType !== 'all' && exception.type !== filterType) return false;
    if (filterSeverity !== 'all' && exception.severity !== filterSeverity) return false;
    return true;
  });

  const handleSelectAll = () => {
    if (selectedExceptions.size === filteredExceptions.length) {
      setSelectedExceptions(new Set());
    } else {
      setSelectedExceptions(new Set(filteredExceptions.map(e => e.id)));
    }
  };

  const handleSelectException = (exceptionId: string) => {
    const newSelected = new Set(selectedExceptions);
    if (newSelected.has(exceptionId)) {
      newSelected.delete(exceptionId);
    } else {
      newSelected.add(exceptionId);
    }
    setSelectedExceptions(newSelected);
  };

  const handleBulkFix = () => {
    if (selectedExceptions.size > 0 && bulkFixType && bulkFixReason) {
      onBulkFix?.(Array.from(selectedExceptions), bulkFixType, bulkFixReason);
      setSelectedExceptions(new Set());
      setBulkFixType('');
      setBulkFixReason('');
    }
  };

  const getExceptionTypeInfo = (type: string) => {
    return exceptionTypes[type as keyof typeof exceptionTypes] || {
      icon: <AlertTriangle className="h-4 w-4" />,
      color: 'bg-gray-100 text-gray-800 border-gray-300',
      label: type
    };
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(locale === 'el' ? 'el-GR' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString(locale === 'el' ? 'el-GR' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-4">
      {/* Header and Filters */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              {locale === 'el' ? 'Πίνακας Εξαιρέσεων' : 'Exception Board'}
              <Badge variant="outline" className="ml-2">
                {filteredExceptions.length} {locale === 'el' ? 'εξαιρέσεις' : 'exceptions'}
              </Badge>
            </CardTitle>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="type-filter">
                {locale === 'el' ? 'Τύπος εξαίρεσης' : 'Exception Type'}
              </Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{locale === 'el' ? 'Όλα' : 'All'}</SelectItem>
                  <SelectItem value="missed">{locale === 'el' ? 'Χαμένα χτυπήματα' : 'Missed Punches'}</SelectItem>
                  <SelectItem value="duplicate">{locale === 'el' ? 'Διπλά χτυπήματα' : 'Duplicate Punches'}</SelectItem>
                  <SelectItem value="off-site">{locale === 'el' ? 'Εκτός εγκαταστάσεων' : 'Off-site'}</SelectItem>
                  <SelectItem value="break_overrun">{locale === 'el' ? 'Υπέρβαση διαλείμματος' : 'Break Overruns'}</SelectItem>
                  <SelectItem value="schedule_deviation">{locale === 'el' ? 'Αποκλίσεις προγράμματος' : 'Schedule Deviations'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="severity-filter">
                {locale === 'el' ? 'Σοβαρότητα' : 'Severity'}
              </Label>
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{locale === 'el' ? 'Όλα' : 'All'}</SelectItem>
                  <SelectItem value="low">{locale === 'el' ? 'Χαμηλή' : 'Low'}</SelectItem>
                  <SelectItem value="medium">{locale === 'el' ? 'Μεσαία' : 'Medium'}</SelectItem>
                  <SelectItem value="high">{locale === 'el' ? 'Υψηλή' : 'High'}</SelectItem>
                  <SelectItem value="critical">{locale === 'el' ? 'Κρίσιμη' : 'Critical'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={handleSelectAll}
                className="w-full"
              >
                {selectedExceptions.size === filteredExceptions.length 
                  ? (locale === 'el' ? 'Αποεπιλογή όλων' : 'Deselect All')
                  : (locale === 'el' ? 'Επιλογή όλων' : 'Select All')
                }
              </Button>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedExceptions.size > 0 && (
            <Alert className="bg-blue-50 border-blue-200">
              <Settings className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-3">
                  <div className="font-medium">
                    {locale === 'el' 
                      ? `Μαζική επιδιόρθωση για ${selectedExceptions.size} εξαιρέσεις:` 
                      : `Bulk fix for ${selectedExceptions.size} exceptions:`
                    }
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Select value={bulkFixType} onValueChange={setBulkFixType}>
                      <SelectTrigger>
                        <SelectValue placeholder={locale === 'el' ? 'Τύπος επιδιόρθωσης' : 'Fix Type'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual_entry">{locale === 'el' ? 'Χειροκίνητη καταχώριση' : 'Manual Entry'}</SelectItem>
                        <SelectItem value="auto_correct">{locale === 'el' ? 'Αυτόματη διόρθωση' : 'Auto Correct'}</SelectItem>
                        <SelectItem value="policy_override">{locale === 'el' ? 'Παράκαμψη πολιτικής' : 'Policy Override'}</SelectItem>
                        <SelectItem value="dismiss">{locale === 'el' ? 'Απόρριψη' : 'Dismiss'}</SelectItem>
                      </SelectContent>
                    </Select>

                    <Input
                      placeholder={locale === 'el' ? 'Αιτιολογία...' : 'Reason...'}
                      value={bulkFixReason}
                      onChange={(e) => setBulkFixReason(e.target.value)}
                    />

                    <Button 
                      onClick={handleBulkFix}
                      disabled={!bulkFixType || !bulkFixReason}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      {locale === 'el' ? 'Εφαρμογή' : 'Apply'}
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Exception List */}
      <div className="space-y-3">
        {filteredExceptions.map((exception) => {
          const typeInfo = getExceptionTypeInfo(exception.type);
          
          return (
            <Card key={exception.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Selection Checkbox */}
                  <Checkbox
                    checked={selectedExceptions.has(exception.id)}
                    onCheckedChange={() => handleSelectException(exception.id)}
                    className="mt-1"
                  />

                  {/* Exception Info */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={typeInfo.color}>
                        {typeInfo.icon}
                        <span className="ml-1">{typeInfo.label}</span>
                      </Badge>
                      
                      <Badge variant="outline" className={severityColors[exception.severity]}>
                        {exception.severity.toUpperCase()}
                      </Badge>

                      {exception.canAutoFix && (
                        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                          <Zap className="h-3 w-3 mr-1" />
                          {locale === 'el' ? 'Αυτό-επιδιόρθωση' : 'Auto-fix'}
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-medium">{exception.employeeName}</span>
                        <span className="text-gray-600 ml-2">ID: {exception.employeeId}</span>
                      </div>
                      
                      <div className="text-gray-600">
                        {formatDate(exception.date)}
                        {exception.timestamp && (
                          <span className="ml-2">{formatTime(exception.timestamp)}</span>
                        )}
                      </div>
                    </div>

                    <div className="text-gray-700">
                      {exception.description}
                    </div>

                    {exception.suggestedFix && (
                      <div className="bg-green-50 p-2 rounded border border-green-200">
                        <div className="text-sm text-green-800">
                          <strong>{locale === 'el' ? 'Προτεινόμενη λύση:' : 'Suggested Fix:'}</strong>
                          <br />
                          {exception.suggestedFix}
                        </div>
                      </div>
                    )}

                    {exception.location && (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <MapPin className="h-3 w-3" />
                        <span>{exception.location}</span>
                      </div>
                    )}

                    {exception.affectedMinutes && (
                      <div className="flex items-center gap-1 text-sm text-orange-600">
                        <Clock className="h-3 w-3" />
                        <span>
                          {locale === 'el' 
                            ? `Επηρεάζει ${exception.affectedMinutes} λεπτά` 
                            : `Affects ${exception.affectedMinutes} minutes`
                          }
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Individual Actions */}
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onIndividualFix?.(exception.id, 'manual_fix', '')}
                    >
                      {locale === 'el' ? 'Επιδιόρθωση' : 'Fix'}
                    </Button>
                    
                    {exception.canAutoFix && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-700 border-green-300 hover:bg-green-50"
                        onClick={() => onIndividualFix?.(exception.id, 'auto_fix', '')}
                      >
                        <Zap className="h-3 w-3 mr-1" />
                        {locale === 'el' ? 'Αυτό' : 'Auto'}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredExceptions.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <CheckSquare className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="font-medium text-gray-800 mb-2">
                {locale === 'el' ? 'Δεν υπάρχουν εξαιρέσεις!' : 'No Exceptions Found!'}
              </h3>
              <p className="text-gray-600">
                {locale === 'el' 
                  ? 'Όλα τα χτυπήματα είναι σε τάξη για τα επιλεγμένα κριτήρια.' 
                  : 'All punches are in order for the selected criteria.'
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}