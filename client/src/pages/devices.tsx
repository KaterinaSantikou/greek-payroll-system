import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Smartphone, 
  Monitor,
  Wifi,
  WifiOff,
  Battery,
  MapPin,
  Settings,
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle
} from "lucide-react";

export default function Devices() {
  const devices = [
    {
      id: 1,
      name: "Front Desk Kiosk",
      type: "tablet",
      location: "Main Lobby",
      status: "online",
      battery: 89,
      lastPing: "2 minutes ago",
      todayPunches: 24,
      ipAddress: "192.168.1.101",
      version: "v2.1.3"
    },
    {
      id: 2,
      name: "Housekeeping Station",
      type: "tablet",
      location: "Service Floor 3",
      status: "online", 
      battery: 67,
      lastPing: "1 minute ago",
      todayPunches: 18,
      ipAddress: "192.168.1.102",
      version: "v2.1.3"
    },
    {
      id: 3,
      name: "Restaurant Terminal",
      type: "tablet",
      location: "Restaurant",
      status: "online",
      battery: 43,
      lastPing: "30 seconds ago",
      todayPunches: 15,
      ipAddress: "192.168.1.103", 
      version: "v2.1.2"
    },
    {
      id: 4,
      name: "Pool Bar Kiosk",
      type: "tablet",
      location: "Pool Area",
      status: "offline",
      battery: 12,
      lastPing: "2 hours ago",
      todayPunches: 8,
      ipAddress: "192.168.1.104",
      version: "v2.0.8"
    },
    {
      id: 5,
      name: "Security Checkpoint",
      type: "tablet",
      location: "Main Entrance",
      status: "warning",
      battery: 25,
      lastPing: "5 minutes ago",
      todayPunches: 6,
      ipAddress: "192.168.1.105",
      version: "v2.1.3"
    }
  ];

  const qrCodes = [
    { id: 1, location: "Staff Room A", scans: 12, status: "active" },
    { id: 2, location: "Staff Room B", scans: 8, status: "active" },
    { id: 3, location: "Kitchen", scans: 15, status: "active" },
    { id: 4, location: "Maintenance Shop", scans: 4, status: "expired" }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'default';
      case 'warning': return 'secondary';
      case 'offline': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'offline': return <WifiOff className="h-4 w-4 text-red-600" />;
      default: return <Wifi className="h-4 w-4" />;
    }
  };

  const getBatteryColor = (level: number) => {
    if (level > 60) return "text-green-600";
    if (level > 30) return "text-orange-600";
    return "text-red-600";
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Time Clock Devices</h1>
          <p className="text-gray-600 dark:text-gray-400">Kiosks, QR sets, health monitoring</p>
        </div>
        <div className="flex gap-2">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Device
          </Button>
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync All
          </Button>
        </div>
      </div>

      {/* Device Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Online</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {devices.filter(d => d.status === 'online').length}
                </p>
                <p className="text-xs text-gray-500">Devices active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Warning</p>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                  {devices.filter(d => d.status === 'warning').length}
                </p>
                <p className="text-xs text-gray-500">Need attention</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <WifiOff className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Offline</p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                  {devices.filter(d => d.status === 'offline').length}
                </p>
                <p className="text-xs text-gray-500">Disconnected</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Smartphone className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Total Punches</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {devices.reduce((sum, d) => sum + d.todayPunches, 0)}
                </p>
                <p className="text-xs text-gray-500">Today across all devices</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Device List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Device Status & Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {devices.map((device) => (
              <div key={device.id} className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                      <Monitor className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{device.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        {device.location}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-xs text-gray-500">STATUS</p>
                      <div className="flex items-center gap-1 mt-1">
                        {getStatusIcon(device.status)}
                        <Badge variant={getStatusColor(device.status)}>
                          {device.status.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-xs text-gray-500">BATTERY</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Battery className={`h-3 w-3 ${getBatteryColor(device.battery)}`} />
                        <span className={`text-sm font-medium ${getBatteryColor(device.battery)}`}>
                          {device.battery}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-xs text-gray-500">TODAY</p>
                      <p className="text-sm font-medium mt-1">{device.todayPunches} punches</p>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-xs text-gray-500">LAST PING</p>
                      <p className="text-sm mt-1">{device.lastPing}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Settings className="h-3 w-3 mr-1" />
                      Configure
                    </Button>
                    <Button size="sm" variant="outline">
                      <MapPin className="h-3 w-3 mr-1" />
                      Locate
                    </Button>
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">IP Address:</span>
                      <span className="ml-2 font-mono">{device.ipAddress}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Version:</span>
                      <span className="ml-2">{device.version}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Type:</span>
                      <span className="ml-2 capitalize">{device.type}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* QR Code Stations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            QR Code Stations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {qrCodes.map((qr) => (
              <div key={qr.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{qr.location}</h3>
                  <Badge variant={qr.status === 'active' ? 'default' : 'destructive'}>
                    {qr.status.toUpperCase()}
                  </Badge>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Scans Today</span>
                    <span className="text-sm font-medium">{qr.scans}</span>
                  </div>
                </div>
                
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    Regenerate QR
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    Print Label
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Device Health */}
      <Card>
        <CardHeader>
          <CardTitle>Device Health Monitoring</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">System connectivity stable</span>
              </div>
              <span className="text-xs text-gray-500">Last checked: 1 min ago</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
              <div className="flex items-center gap-3">
                <Battery className="h-4 w-4 text-orange-600" />
                <span className="text-sm">2 devices below 30% battery</span>
              </div>
              <Button size="sm" variant="outline">
                View Details
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-4 w-4 text-blue-600" />
                <span className="text-sm">Auto-sync enabled every 5 minutes</span>
              </div>
              <span className="text-xs text-gray-500">Next sync: 3:24 min</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}