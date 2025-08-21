import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  Sun, 
  Moon, 
  MapPin,
  AlertTriangle,
  CheckCircle
} from "lucide-react";

interface TimeEvent {
  id: string;
  timestamp: string;
  type: 'in' | 'out';
  location?: string;
  isOffSite?: boolean;
}

interface WorkDay {
  date: string;
  isSunday: boolean;
  isHoliday: boolean;
  holidayName?: string;
  events: TimeEvent[];
  totalMinutes?: number;
  nightMinutes?: number;
  hasExceptions?: boolean;
  exceptionTypes?: string[];
}

interface EmployeeTimelineProps {
  employeeId: string;
  employeeName: string;
  workDays: WorkDay[];
  locale?: 'en' | 'el';
  onEventClick?: (eventId: string) => void;
}

/**
 * Employee Timeline with Night Zone Shading (22:00-06:00) and Sunday/Holiday Badges
 * Χρονογραμμή εργαζομένου (band 22:00–06:00 σκίαση) + badges Κυριακή/Αργία
 */
export function EmployeeTimeline({
  employeeId,
  employeeName,
  workDays,
  locale = 'el',
  onEventClick
}: EmployeeTimelineProps) {
  
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString(locale === 'el' ? 'el-GR' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(locale === 'el' ? 'el-GR' : 'en-US', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit'
    });
  };

  const isNightTime = (timestamp: string) => {
    const hour = new Date(timestamp).getHours();
    return hour >= 22 || hour < 6; // 22:00-06:00 night zone
  };

  const getEventIcon = (event: TimeEvent) => {
    if (isNightTime(event.timestamp)) {
      return <Moon className="h-3 w-3" />;
    }
    return <Sun className="h-3 w-3" />;
  };

  const getEventBadgeColor = (event: TimeEvent) => {
    if (event.isOffSite) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (isNightTime(event.timestamp)) return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    return 'bg-blue-100 text-blue-800 border-blue-300';
  };

  const getDayBadges = (day: WorkDay) => {
    const badges = [];
    
    if (day.isSunday) {
      badges.push(
        <Badge key="sunday" variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
          {locale === 'el' ? 'Κυριακή' : 'Sunday'}
        </Badge>
      );
    }
    
    if (day.isHoliday) {
      badges.push(
        <Badge key="holiday" variant="outline" className="bg-red-100 text-red-800 border-red-300">
          {locale === 'el' ? 'Αργία' : 'Holiday'}
          {day.holidayName && `: ${day.holidayName}`}
        </Badge>
      );
    }

    if (day.nightMinutes && day.nightMinutes > 0) {
      badges.push(
        <Badge key="night" variant="outline" className="bg-indigo-100 text-indigo-800 border-indigo-300">
          <Moon className="h-3 w-3 mr-1" />
          {day.nightMinutes}' {locale === 'el' ? 'νυχτερινά' : 'night'}
        </Badge>
      );
    }

    return badges;
  };

  const renderNightZoneBackground = () => {
    return (
      <div className="absolute inset-0 pointer-events-none">
        {/* Night zone shading: 22:00-24:00 */}
        <div 
          className="absolute bg-indigo-50 opacity-60"
          style={{
            left: '91.67%', // 22/24 * 100%
            width: '8.33%', // 2 hours
            top: 0,
            bottom: 0
          }}
        />
        {/* Night zone shading: 00:00-06:00 */}
        <div 
          className="absolute bg-indigo-50 opacity-60"
          style={{
            left: '0%',
            width: '25%', // 6/24 * 100%
            top: 0,
            bottom: 0
          }}
        />
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {employeeName}
          </CardTitle>
          <div className="text-sm text-gray-600">
            ID: {employeeId}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {workDays.map((day) => (
          <div key={day.date} className="border rounded-lg p-4 space-y-3">
            {/* Day Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-medium text-gray-800">
                  {formatDate(day.date)}
                </span>
                <div className="flex gap-2">
                  {getDayBadges(day)}
                </div>
              </div>
              
              {day.hasExceptions && (
                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {day.exceptionTypes?.length || 0} {locale === 'el' ? 'εξαιρέσεις' : 'exceptions'}
                </Badge>
              )}
            </div>

            {/* Timeline Bar with Night Zone Shading */}
            <div className="relative h-12 bg-gray-100 rounded-lg overflow-hidden">
              {renderNightZoneBackground()}
              
              {/* 24-hour timeline markers */}
              <div className="absolute inset-0 flex">
                {Array.from({ length: 24 }, (_, i) => (
                  <div 
                    key={i} 
                    className="flex-1 border-r border-gray-200 flex items-end justify-center pb-1"
                  >
                    <span className="text-xs text-gray-500">{i}</span>
                  </div>
                ))}
              </div>

              {/* Time Events */}
              {day.events.map((event, index) => {
                const hour = new Date(event.timestamp).getHours();
                const minute = new Date(event.timestamp).getMinutes();
                const position = (hour + minute / 60) / 24 * 100;

                return (
                  <div
                    key={event.id}
                    className="absolute top-1 cursor-pointer transform -translate-x-1/2"
                    style={{ left: `${position}%` }}
                    onClick={() => onEventClick?.(event.id)}
                  >
                    <div className={`
                      flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border
                      ${getEventBadgeColor(event)}
                      hover:shadow-md transition-shadow
                    `}>
                      {getEventIcon(event)}
                      <span className="uppercase">
                        {event.type}
                      </span>
                      {event.isOffSite && (
                        <MapPin className="h-3 w-3" />
                      )}
                    </div>
                    <div className="text-xs text-center mt-1 font-mono">
                      {formatTime(event.timestamp)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Day Summary */}
            <div className="flex justify-between items-center text-sm">
              <div className="flex gap-4">
                {day.totalMinutes && (
                  <span className="text-gray-600">
                    {locale === 'el' ? 'Συνολικά' : 'Total'}: {Math.floor(day.totalMinutes / 60)}h {day.totalMinutes % 60}m
                  </span>
                )}
                
                {day.nightMinutes && day.nightMinutes > 0 && (
                  <span className="text-indigo-600">
                    <Moon className="h-3 w-3 inline mr-1" />
                    {locale === 'el' ? 'Νυχτερινά' : 'Night'}: {Math.floor(day.nightMinutes / 60)}h {day.nightMinutes % 60}m
                  </span>
                )}
              </div>

              {day.hasExceptions ? (
                <Button variant="outline" size="sm" className="text-yellow-700 border-yellow-300 hover:bg-yellow-50">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {locale === 'el' ? 'Επιλυση εξαιρέσεων' : 'Resolve Exceptions'}
                </Button>
              ) : (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  <span>{locale === 'el' ? 'Εντάξει' : 'OK'}</span>
                </div>
              )}
            </div>

            {/* Exception Details */}
            {day.hasExceptions && day.exceptionTypes && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <div className="text-sm font-medium text-yellow-800 mb-1">
                  {locale === 'el' ? 'Εξαιρέσεις:' : 'Exceptions:'}
                </div>
                <div className="flex flex-wrap gap-1">
                  {day.exceptionTypes.map((type, index) => (
                    <Badge key={index} variant="outline" className="bg-white text-yellow-700 border-yellow-300">
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Legend */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-800 mb-3">
            {locale === 'el' ? 'Επεξήγηση:' : 'Legend:'}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-indigo-50 border border-indigo-200 rounded"></div>
              <span>{locale === 'el' ? 'Νυχτερινή ζώνη (22:00-06:00)' : 'Night Zone (22:00-06:00)'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4 text-yellow-600" />
              <span>{locale === 'el' ? 'Ημερήσιο χτύπημα' : 'Day time punch'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Moon className="h-4 w-4 text-indigo-600" />
              <span>{locale === 'el' ? 'Νυχτερινό χτύπημα' : 'Night time punch'}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-yellow-600" />
              <span>{locale === 'el' ? 'Εκτός εγκαταστάσεων' : 'Off-site location'}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}