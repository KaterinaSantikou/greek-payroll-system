/**
 * PWA (Progressive Web App) Hook
 * Handles installation prompts, offline status, and push notifications
 */

import { useState, useEffect } from 'react';

interface PWAInstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOffline: boolean;
  installPrompt: PWAInstallEvent | null;
  canInstall: boolean;
  pushSupported: boolean;
  notificationPermission: NotificationPermission;
}

export interface PWAActions {
  promptInstall: () => Promise<void>;
  requestNotificationPermission: () => Promise<NotificationPermission>;
  subscribeToGreekPayrollNotifications: () => Promise<boolean>;
  checkForUpdates: () => Promise<boolean>;
}

export function usePWA(): [PWAState, PWAActions] {
  const [installPrompt, setInstallPrompt] = useState<PWAInstallEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Check if already installed (standalone mode)
    const checkInstallStatus = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebApp = 'standalone' in window.navigator && (window.navigator as any).standalone;
      setIsInstalled(isStandalone || isInWebApp);
    };

    checkInstallStatus();

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const installEvent = e as PWAInstallEvent;
      setInstallPrompt(installEvent);
      setIsInstallable(true);
      
      console.log('PWA: Install prompt available');
    };

    // Listen for successful install
    const handleAppInstalled = () => {
      console.log('PWA: App installed successfully');
      setIsInstalled(true);
      setIsInstallable(false);
      setInstallPrompt(null);
      
      // Track installation
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'pwa_install', {
          event_category: 'pwa',
          event_label: 'greek_payroll'
        });
      }
    };

    // Listen for online/offline status
    const handleOnlineStatus = () => setIsOffline(false);
    const handleOfflineStatus = () => setIsOffline(true);

    // Register event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOfflineStatus);

    // Check notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('PWA: Service Worker registered:', registration);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            console.log('PWA: Update found, installing...');
          });
        })
        .catch((error) => {
          console.error('PWA: Service Worker registration failed:', error);
        });
    }

    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOfflineStatus);
    };
  }, []);

  // Prompt user to install PWA
  const promptInstall = async () => {
    if (!installPrompt) {
      console.log('PWA: No install prompt available');
      return;
    }

    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      
      console.log('PWA: Install prompt result:', outcome);
      
      if (outcome === 'accepted') {
        setIsInstallable(false);
        setInstallPrompt(null);
      }
    } catch (error) {
      console.error('PWA: Install prompt failed:', error);
    }
  };

  // Request notification permission
  const requestNotificationPermission = async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) {
      console.log('PWA: Notifications not supported');
      return 'denied';
    }

    if (Notification.permission !== 'default') {
      return Notification.permission;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      console.log('PWA: Notification permission:', permission);
      return permission;
    } catch (error) {
      console.error('PWA: Notification permission request failed:', error);
      return 'denied';
    }
  };

  // Subscribe to Greek payroll notifications
  const subscribeToGreekPayrollNotifications = async (): Promise<boolean> => {
    try {
      const permission = await requestNotificationPermission();
      
      if (permission !== 'granted') {
        console.log('PWA: Notification permission denied');
        return false;
      }

      if (!('serviceWorker' in navigator)) {
        console.log('PWA: Service Worker not supported');
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      
      // Check if push is supported
      if (!('PushManager' in window)) {
        console.log('PWA: Push notifications not supported');
        return false;
      }

      // Get existing subscription
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // Create new subscription
        const vapidPublicKey = 'BLGghbXjTKq7HHzGMYhk6tF8dKPLgG8N1J5TN2v6nLZ8vDr8aX6MsO-JzMV3e-7j9L3bS1pN8wA-_5VzA2Rq0';
        
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlB64ToUint8Array(vapidPublicKey)
        });
      }

      // Send subscription to server for Greek payroll notifications
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription,
          topics: ['ergani_deadlines', 'payroll_ready', 'efka_reminders', 'greek_compliance']
        })
      });

      if (response.ok) {
        console.log('PWA: Subscribed to Greek payroll notifications');
        return true;
      } else {
        console.error('PWA: Failed to subscribe to notifications');
        return false;
      }
    } catch (error) {
      console.error('PWA: Notification subscription failed:', error);
      return false;
    }
  };

  // Check for app updates
  const checkForUpdates = async (): Promise<boolean> => {
    if (!('serviceWorker' in navigator)) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      
      if (registration) {
        await registration.update();
        
        if (registration.waiting) {
          console.log('PWA: Update available');
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('PWA: Update check failed:', error);
      return false;
    }
  };

  const state: PWAState = {
    isInstallable,
    isInstalled,
    isOffline,
    installPrompt,
    canInstall: isInstallable && !isInstalled,
    pushSupported: 'PushManager' in window,
    notificationPermission
  };

  const actions: PWAActions = {
    promptInstall,
    requestNotificationPermission,
    subscribeToGreekPayrollNotifications,
    checkForUpdates
  };

  return [state, actions];
}

// Helper function to convert VAPID key
function urlB64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
}

// Greek payroll specific notification helpers
export const GreekNotifications = {
  // Schedule ERGANI deadline reminders
  scheduleErganiReminders: async (deadlines: Array<{ date: string; type: string }>) => {
    if (!('serviceWorker' in navigator)) return;
    
    const registration = await navigator.serviceWorker.ready;
    
    deadlines.forEach((deadline, index) => {
      const deadlineDate = new Date(deadline.date);
      const reminderDate = new Date(deadlineDate.getTime() - (2 * 24 * 60 * 60 * 1000));
      
      if (reminderDate > new Date()) {
        setTimeout(() => {
          registration.showNotification('ΕΡΓΑΝΗ ΙΙ Deadline Reminder', {
            body: `${deadline.type} filing due in 2 days`,
            icon: '/images/icon-192x192.png',
            tag: `ergani-${index}`,
            requireInteraction: true
          });
        }, reminderDate.getTime() - Date.now());
      }
    });
  },

  // Show payroll completion notification
  showPayrollComplete: async (amount: number, employeeCount: number) => {
    if (!('serviceWorker' in navigator)) return;
    
    const registration = await navigator.serviceWorker.ready;
    
    registration.showNotification('Payroll Complete! 🎉', {
      body: `Processed €${amount.toLocaleString()} for ${employeeCount} employees`,
      icon: '/images/icon-192x192.png',
      tag: 'payroll-complete'
    });
  },

  // Show EFKA payment reminder
  showEfkaReminder: async (amount: number, dueDate: string) => {
    if (!('serviceWorker' in navigator)) return;
    
    const registration = await navigator.serviceWorker.ready;
    
    registration.showNotification('ΕΦΚΑ Payment Due', {
      body: `€${amount.toLocaleString()} due by ${dueDate}`,
      icon: '/images/icon-192x192.png',
      tag: 'efka-reminder',
      requireInteraction: true
    });
  }
};