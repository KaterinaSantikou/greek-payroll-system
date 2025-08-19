import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Target, 
  Clock, 
  MapPin,
  Smartphone,
  Monitor,
  CheckCircle,
  AlertCircle,
  Eye,
  History,
  Calendar
} from "lucide-react";

export default function Punches() {
  const todayPunches = [
    {
      id: 1,
      employeeName: "Maria Kostas",
      department: "Front Office",
      timeIn: "07:58",
      timeOut: null,
      location: "Front Desk Kiosk",
      method: "QR Code",
      status: "active",
      scheduledStart: "08:00",
      variance: "-2min"
    },
    {
      id: 2,
      employeeName: "Dimitris Panos",
      department: "Housekeeping", 
      timeIn: "08:02",
      timeOut: "16:31",
      location: "Housekeeping Station",
      method: "NFC Card",
      status: "completed",
      scheduledStart: "08:00",
      variance: "+2min"
    },
    {
      id: 3,
      employeeName: "Sofia Nikolaou",
      department: "F&B",
      timeIn: "14:55",
      timeOut: null,
      location: "Restaurant Tablet",
      method: "Facial Recognition",
      status: "active",
      scheduledStart: "15:00",
      variance: "-5min"
    },
    {
      id: 4,
      employeeName: "Kostas Dimitriou",
      department: "Maintenance",
      timeIn: "06:58",
      timeOut: "15:05",
      location: "Mobile App",
      method: "Geofence",
      status: "completed",
      scheduledStart: "07:00",
      variance: "-2min"
    }
  ];

  const deviceLocations = [
    { name: "Front Desk Kiosk", active: 12, location: "Main Lobby", status: "online" },
    { name: "Housekeeping Station", active: 8, location: "Service Floor", status: "online" },
    { name: "Restaurant Tablet", active: 6, location: "Restaurant", status: "online" },
    { name: "Pool Bar Terminal", active: 3, location: "Pool Area", status: "offline" },
    { name: "Security Desk", active: 2, location: "Entrance", status: "online" }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'completed': return 'secondary';
      case 'late': return 'destructive';
      default: return 'outline';
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'QR Code': return <Target className="h-3 w-3" />;
      case 'NFC Card': return <Smartphone className="h-3 w-3" />;
      case 'Facial Recognition': return <Eye className="h-3 w-3" />;
      case 'Geofence': return <MapPin className="h-3 w-3" />;
      default: return <Monitor className="h-3 w-3" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Time Punches</h1>
          <p className="text-gray-600 dark:text-gray-400">Today, History, Device/Geofence map</p>
        </div>
        <div className="flex gap-2">
          <Button>
            <History className="h-4 w-4 mr-2" />
            View History
          </Button>
          <Button variant="outline">
            <MapPin className="h-4 w-4 mr-2" />
            Device Map
          </Button>
        </div>
      </div>

      {/* Today's Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Active Now</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">24</p>
                <p className="text-xs text-gray-500">Currently clocked in</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Today's Punches</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">156</p>
                <p className="text-xs text-gray-500">Total clock events</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <AlertCircle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Late Arrivals</p>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">3</p>
                <p className="text-xs text-gray-500">&gt;15min late</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Target className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Devices Online</p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">8/9</p>
                <p className="text-xs text-gray-500">Punch terminals</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Punches */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today's Punches - January 19, 2025
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {todayPunches.map((punch) => (
              <div key={punch.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="font-semibold text-gray-900 dark:text-white">{punch.employeeName}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{punch.department}</p>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">TIME IN</p>
                      <p className="font-mono text-sm font-medium">{punch.timeIn}</p>
                      <p className={`text-xs ${punch.variance.startsWith('-') ? 'text-green-600' : 'text-orange-600'}`}>
                        {punch.variance}
                      </p>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">TIME OUT</p>
                      <p className="font-mono text-sm font-medium">
                        {punch.timeOut || '--:--'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">METHOD</p>
                    <div className="flex items-center gap-1 mt-1">
                      {getMethodIcon(punch.method)}
                      <span className="text-xs">{punch.method}</span>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">LOCATION</p>
                    <p className="text-xs">{punch.location}</p>
                  </div>
                  
                  <Badge variant={getStatusColor(punch.status)}>
                    {punch.status.toUpperCase()}
                  </Badge>
                  
                  <Button size="sm" variant="outline">
                    <Eye className="h-3 w-3 mr-1" />
                    Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Device Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Device Status & Locations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {deviceLocations.map((device, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{device.name}</h3>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      device.status === 'online' ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <Badge variant={device.status === 'online' ? 'default' : 'destructive'}>
                      {device.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Location</span>
                    <span className="text-sm">{device.location}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Active Today</span>
                    <span className="text-sm font-medium">{device.active} punches</span>
                  </div>
                </div>
                
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    <MapPin className="h-3 w-3 mr-1" />
                    View Map
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    <History className="h-3 w-3 mr-1" />
                    History
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}