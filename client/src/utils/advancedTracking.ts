// Advanced tracking for conversion optimization and funnel analysis

interface TrafficSource {
  source: string;
  medium: string;
  campaign?: string;
  content?: string;
  term?: string;
}

interface LeadIntent {
  employeeCount?: string;
  industry?: string;
  company?: string;
  role?: string;
  timeline?: string;
}

interface ConversionEvent {
  event: string;
  properties: Record<string, any>;
  timestamp: number;
  sessionId: string;
  userId: string;
}

class AdvancedTracker {
  private static instance: AdvancedTracker;
  private sessionId: string;
  private userId: string;
  private trafficSource: TrafficSource;
  private leadIntent: Partial<LeadIntent> = {};
  private events: ConversionEvent[] = [];
  private sectionViewTimes: Map<string, number> = new Map();

  constructor() {
    this.sessionId = this.generateSessionId();
    this.userId = this.getUserId();
    this.trafficSource = this.getTrafficSource();
    this.initializeTracking();
  }

  static getInstance(): AdvancedTracker {
    if (!AdvancedTracker.instance) {
      AdvancedTracker.instance = new AdvancedTracker();
    }
    return AdvancedTracker.instance;
  }

  private generateSessionId(): string {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private getUserId(): string {
    let userId = localStorage.getItem('tracker_user_id');
    if (!userId) {
      userId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      localStorage.setItem('tracker_user_id', userId);
    }
    return userId;
  }

  private getTrafficSource(): TrafficSource {
    const urlParams = new URLSearchParams(window.location.search);
    
    return {
      source: urlParams.get('utm_source') || document.referrer || 'direct',
      medium: urlParams.get('utm_medium') || this.getMediumFromReferrer(),
      campaign: urlParams.get('utm_campaign') || undefined,
      content: urlParams.get('utm_content') || undefined,
      term: urlParams.get('utm_term') || undefined
    };
  }

  private getMediumFromReferrer(): string {
    const referrer = document.referrer;
    if (!referrer) return 'none';
    
    if (referrer.includes('google.')) return 'google';
    if (referrer.includes('facebook.') || referrer.includes('fb.')) return 'facebook';
    if (referrer.includes('linkedin.')) return 'linkedin';
    if (referrer.includes('twitter.') || referrer.includes('t.co')) return 'twitter';
    
    return 'referral';
  }

  private initializeTracking(): void {
    // Track page view
    this.trackEvent('page_view', {
      page: window.location.pathname,
      title: document.title,
      ...this.trafficSource
    });

    // Track section views with Intersection Observer
    this.initializeSectionTracking();

    // Track video engagement
    this.initializeVideoTracking();

    // Track scroll depth
    this.initializeScrollTracking();
  }

  private initializeSectionTracking(): void {
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.5 // Section is 50% visible
    };

    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.id;
          if (sectionId && !this.sectionViewTimes.has(sectionId)) {
            this.sectionViewTimes.set(sectionId, Date.now());
            this.trackEvent('section_view', {
              section: sectionId,
              timestamp: Date.now(),
              scroll_depth: Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100)
            });
          }
        } else {
          // Track time spent in section
          const sectionId = entry.target.id;
          if (sectionId && this.sectionViewTimes.has(sectionId)) {
            const viewTime = Date.now() - this.sectionViewTimes.get(sectionId)!;
            this.trackEvent('section_time', {
              section: sectionId,
              time_spent: viewTime
            });
          }
        }
      });
    }, observerOptions);

    // Observe all sections
    setTimeout(() => {
      const sections = document.querySelectorAll('[id]');
      sections.forEach(section => sectionObserver.observe(section));
    }, 1000);
  }

  private initializeVideoTracking(): void {
    // Track video events when videos are added to page
    const trackVideoEvents = (video: HTMLVideoElement) => {
      let quartiles = [25, 50, 75, 90];
      let trackedQuartiles: number[] = [];

      video.addEventListener('play', () => {
        this.trackEvent('video_play', {
          video_id: video.id || 'demo_video',
          duration: video.duration
        });
      });

      video.addEventListener('pause', () => {
        this.trackEvent('video_pause', {
          video_id: video.id || 'demo_video',
          current_time: video.currentTime,
          percent: Math.round((video.currentTime / video.duration) * 100)
        });
      });

      video.addEventListener('timeupdate', () => {
        const percent = Math.round((video.currentTime / video.duration) * 100);
        
        quartiles.forEach(quartile => {
          if (percent >= quartile && !trackedQuartiles.includes(quartile)) {
            trackedQuartiles.push(quartile);
            this.trackEvent('video_watch', {
              video_id: video.id || 'demo_video',
              percent: quartile,
              current_time: video.currentTime
            });
          }
        });
      });

      video.addEventListener('ended', () => {
        this.trackEvent('video_complete', {
          video_id: video.id || 'demo_video',
          duration: video.duration
        });
      });
    };

    // Monitor for dynamically added videos
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLVideoElement) {
            trackVideoEvents(node);
          } else if (node instanceof HTMLElement) {
            const videos = node.querySelectorAll('video');
            videos.forEach(trackVideoEvents);
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  private initializeScrollTracking(): void {
    let maxScroll = 0;
    let scrollMilestones = [25, 50, 75, 90];
    let trackedMilestones: number[] = [];

    const trackScroll = () => {
      const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
      
      if (scrollPercent > maxScroll) {
        maxScroll = scrollPercent;
      }

      scrollMilestones.forEach(milestone => {
        if (scrollPercent >= milestone && !trackedMilestones.includes(milestone)) {
          trackedMilestones.push(milestone);
          this.trackEvent('scroll_depth', {
            percent: milestone,
            max_scroll: maxScroll
          });
        }
      });
    };

    let scrollTimeout: NodeJS.Timeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(trackScroll, 250);
    });
  }

  // Public methods
  trackEvent(event: string, properties: Record<string, any> = {}): void {
    const conversionEvent: ConversionEvent = {
      event,
      properties: {
        ...properties,
        session_id: this.sessionId,
        user_id: this.userId,
        traffic_source: this.trafficSource,
        lead_intent: this.leadIntent,
        page: window.location.pathname,
        timestamp: Date.now()
      },
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId
    };

    this.events.push(conversionEvent);
    
    // Send to analytics platforms
    this.sendToAnalytics(conversionEvent);
    
    // Store in localStorage for funnel analysis
    this.storeEvent(conversionEvent);
  }

  trackCTAClick(type: 'start_free' | 'demo' | 'pricing' | 'start_first_run', section: string, additionalProps: Record<string, any> = {}): void {
    this.trackEvent(`cta_click:${type}`, {
      cta_type: type,
      section,
      ...additionalProps
    });
  }

  trackFormSubmit(form: 'signup' | 'demo_request' | 'contact' | 'checklist', formData: Record<string, any> = {}): void {
    // Extract lead intent from form data
    if (formData.employeeCount) this.leadIntent.employeeCount = formData.employeeCount;
    if (formData.industry) this.leadIntent.industry = formData.industry;
    if (formData.company) this.leadIntent.company = formData.company;
    if (formData.role) this.leadIntent.role = formData.role;

    this.trackEvent(`form_submit:${form}`, {
      form_type: form,
      form_data: formData,
      lead_intent: this.leadIntent
    });
  }

  updateLeadIntent(intent: Partial<LeadIntent>): void {
    this.leadIntent = { ...this.leadIntent, ...intent };
  }

  private sendToAnalytics(event: ConversionEvent): void {
    // Google Analytics 4
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', event.event, {
        event_category: 'conversion',
        event_label: event.properties.section,
        value: event.properties.value,
        custom_parameters: event.properties
      });
    }

    // Mixpanel
    if (typeof window !== 'undefined' && (window as any).mixpanel) {
      (window as any).mixpanel.track(event.event, event.properties);
    }

    // Facebook Pixel
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'CustomEvent', {
        event_name: event.event,
        ...event.properties
      });
    }
  }

  private storeEvent(event: ConversionEvent): void {
    const stored = localStorage.getItem('conversion_events') || '[]';
    const events = JSON.parse(stored);
    events.push(event);
    
    // Keep only last 100 events
    if (events.length > 100) {
      events.splice(0, events.length - 100);
    }
    
    localStorage.setItem('conversion_events', JSON.stringify(events));
  }

  // Funnel analysis
  getFunnelData(): ConversionEvent[] {
    const stored = localStorage.getItem('conversion_events') || '[]';
    return JSON.parse(stored);
  }

  getTrafficSourceData(): TrafficSource {
    return this.trafficSource;
  }

  getLeadIntent(): Partial<LeadIntent> {
    return this.leadIntent;
  }
}

export const advancedTracker = AdvancedTracker.getInstance();

// Convenience methods
export const trackCTAClick = (type: 'start_free' | 'demo' | 'pricing' | 'start_first_run', section: string, additionalProps?: Record<string, any>) => {
  advancedTracker.trackCTAClick(type, section, additionalProps);
};

export const trackFormSubmit = (form: 'signup' | 'demo_request' | 'contact' | 'checklist', formData?: Record<string, any>) => {
  advancedTracker.trackFormSubmit(form, formData);
};

export const trackCustomEvent = (event: string, properties?: Record<string, any>) => {
  advancedTracker.trackEvent(event, properties);
};

export const updateLeadIntent = (intent: Partial<LeadIntent>) => {
  advancedTracker.updateLeadIntent(intent);
};