/**
 * Exit-Intent Popup Demo Page
 * Showcases different exit intent popup variants
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ExitIntentPopup from '@/components/ExitIntentPopup';
import { 
  MousePointer, 
  Smartphone, 
  Monitor, 
  Target, 
  BarChart3,
  Gift,
  Mail,
  Phone,
  Calendar,
  Star,
  Zap,
  Info
} from 'lucide-react';

type PopupVariant = 'trial' | 'demo' | 'newsletter' | 'support' | 'discount';

export default function ExitIntentDemo() {
  const [selectedVariant, setSelectedVariant] = useState<PopupVariant>('trial');
  const [selectedLocale, setSelectedLocale] = useState<'en' | 'el'>('en');
  const [showDemo, setShowDemo] = useState(false);
  const [captureCount, setCaptureCount] = useState(0);
  const [lastCapture, setLastCapture] = useState<any>(null);

  const variants = [
    {
      id: 'trial',
      name: 'Free Trial',
      description: 'Encourage free trial signups',
      icon: <Zap className="h-4 w-4" />,
      color: 'bg-blue-100 text-blue-800'
    },
    {
      id: 'demo',
      name: 'Book Demo',
      description: 'Schedule product demonstrations',
      icon: <Calendar className="h-4 w-4" />,
      color: 'bg-green-100 text-green-800'
    },
    {
      id: 'newsletter',
      name: 'Newsletter',
      description: 'Email list subscriptions',
      icon: <Mail className="h-4 w-4" />,
      color: 'bg-purple-100 text-purple-800'
    },
    {
      id: 'support',
      name: 'Get Support',
      description: 'Connect with experts',
      icon: <Phone className="h-4 w-4" />,
      color: 'bg-orange-100 text-orange-800'
    },
    {
      id: 'discount',
      name: 'Special Offer',
      description: 'Limited time discounts',
      icon: <Gift className="h-4 w-4" />,
      color: 'bg-red-100 text-red-800'
    }
  ];

  const handleCapture = (data: any) => {
    setCaptureCount(prev => prev + 1);
    setLastCapture(data);
    setShowDemo(false);
  };

  const triggerExitIntent = () => {
    setShowDemo(true);
  };

  const resetDemo = () => {
    setShowDemo(false);
    localStorage.removeItem('exitIntentShown');
    localStorage.removeItem('exitIntentDate');
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Exit-Intent Popup System</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
          Capture visitors before they leave with intelligent exit-intent detection and targeted messaging.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Target className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="font-semibold">Smart Detection</p>
                  <p className="text-sm text-gray-600">Mouse movement & tab switching</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Smartphone className="h-8 w-8 text-green-600" />
                <div>
                  <p className="font-semibold">Mobile Optimized</p>
                  <p className="text-sm text-gray-600">Touch-friendly interface</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="font-semibold">High Conversion</p>
                  <p className="text-sm text-gray-600">Up to 15% capture rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Demo Controls */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Demo Controls</CardTitle>
              <CardDescription>Configure and test popup variants</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Popup Variant</label>
                <Select value={selectedVariant} onValueChange={(value: PopupVariant) => setSelectedVariant(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {variants.map(variant => (
                      <SelectItem key={variant.id} value={variant.id}>
                        <div className="flex items-center gap-2">
                          {variant.icon}
                          {variant.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Language</label>
                <Select value={selectedLocale} onValueChange={(value: 'en' | 'el') => setSelectedLocale(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">🇺🇸 English</SelectItem>
                    <SelectItem value="el">🇬🇷 Greek</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Button onClick={triggerExitIntent} className="w-full">
                  <MousePointer className="h-4 w-4 mr-2" />
                  Trigger Exit Intent
                </Button>
                <Button onClick={resetDemo} variant="outline" className="w-full">
                  Reset Demo State
                </Button>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Exit Intent Triggers:</strong><br />
                  • Desktop: Move mouse to browser top<br />
                  • Mobile: Switch tabs or minimize browser<br />
                  • Demo: Use the button above
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Demo Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Captures:</span>
                  <Badge variant="secondary">{captureCount}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Current Variant:</span>
                  <Badge className={variants.find(v => v.id === selectedVariant)?.color}>
                    {variants.find(v => v.id === selectedVariant)?.name}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Language:</span>
                  <Badge variant="outline">{selectedLocale === 'en' ? '🇺🇸 EN' : '🇬🇷 EL'}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Last Capture Data */}
          {lastCapture && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Last Capture</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div><strong>Email:</strong> {lastCapture.email}</div>
                  {lastCapture.company && <div><strong>Company:</strong> {lastCapture.company}</div>}
                  {lastCapture.phone && <div><strong>Phone:</strong> {lastCapture.phone}</div>}
                  <div><strong>Variant:</strong> {lastCapture.variant}</div>
                  <div><strong>Locale:</strong> {lastCapture.locale}</div>
                  <div><strong>Time on Page:</strong> {lastCapture.timeOnPage}s</div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Popup Variants Overview */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Available Popup Variants</CardTitle>
              <CardDescription>Choose the right popup for your conversion goals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {variants.map(variant => (
                  <div 
                    key={variant.id}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedVariant === variant.id 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedVariant(variant.id as PopupVariant)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded ${variant.color}`}>
                        {variant.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{variant.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {variant.description}
                        </p>
                        
                        {/* Variant-specific details */}
                        <div className="text-xs space-y-1">
                          {variant.id === 'trial' && (
                            <>
                              <p>✓ 30-day free trial offer</p>
                              <p>✓ No credit card required</p>
                              <p>✓ Feature highlights</p>
                            </>
                          )}
                          {variant.id === 'demo' && (
                            <>
                              <p>✓ Personalized demonstration</p>
                              <p>✓ Company info collection</p>
                              <p>✓ Calendar scheduling</p>
                            </>
                          )}
                          {variant.id === 'newsletter' && (
                            <>
                              <p>✓ Monthly Greek HR updates</p>
                              <p>✓ Compliance alerts</p>
                              <p>✓ Industry insights</p>
                            </>
                          )}
                          {variant.id === 'support' && (
                            <>
                              <p>✓ Expert consultation</p>
                              <p>✓ Greek payroll specialists</p>
                              <p>✓ Same-day response</p>
                            </>
                          )}
                          {variant.id === 'discount' && (
                            <>
                              <p>✓ 50% off first 3 months</p>
                              <p>✓ Limited time offer</p>
                              <p>✓ All premium features</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Key Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Monitor className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Desktop Detection</p>
                      <p className="text-sm text-gray-600">Mouse movement to browser top</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Mobile Detection</p>
                      <p className="text-sm text-gray-600">Tab switching & app switching</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Star className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="font-medium">Smart Timing</p>
                      <p className="text-sm text-gray-600">Minimum time on page delays</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Target className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="font-medium">Targeted Messaging</p>
                      <p className="text-sm text-gray-600">Page-specific popup variants</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <BarChart3 className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="font-medium">Session Management</p>
                      <p className="text-sm text-gray-600">Show once per session</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-indigo-600" />
                    <div>
                      <p className="font-medium">Lead Capture</p>
                      <p className="text-sm text-gray-600">Email, phone & company data</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Demo Popup */}
      <ExitIntentPopup 
        enabled={showDemo}
        variant={selectedVariant}
        locale={selectedLocale}
        onCapture={handleCapture}
        delay={0} // No delay for demo
      />
    </div>
  );
}