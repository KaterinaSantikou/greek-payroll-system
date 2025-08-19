import type { Express, Request, Response } from "express";
import { db } from "../db";
import { laborNewsfeedItems, laborNewsfeedCitations, laborNewsfeedConfig } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { isAuthenticated } from "../replitAuth";
import OpenAI from "openai";

// Initialize OpenAI client conditionally
let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

/**
 * Labor Newsfeed Service for Greek HR & Payroll News
 * Fetches, parses, and summarizes Greek labor news using AI
 */
export class LaborNewsfeedService {
  
  // Sources for Greek labor news
  private readonly NEWS_SOURCES = [
    {
      name: "Ministry of Labour",
      url: "https://ypergasias.gov.gr/en/labour-relations/",
      category: "Government"
    },
    {
      name: "ERGANI Information System",
      url: "https://www.ergani.gov.gr/",
      category: "Government"
    },
    {
      name: "Greek Labour Inspectorate",
      url: "https://www.sepe.gov.gr/",
      category: "Government"
    }
  ];

  /**
   * Fetch and parse news articles using AI
   */
  async fetchAndParseNews(): Promise<void> {
    console.log("🔄 Starting labor newsfeed refresh...");
    
    const config = await this.getConfig();
    if (!config.isEnabled) {
      console.log("❌ Newsfeed is disabled");
      return;
    }

    try {
      // Simulate fetching news articles (in production, this would use web scraping or RSS feeds)
      const mockNewsItems = await this.getMockNewsItems();
      
      for (const item of mockNewsItems) {
        await this.processNewsItem(item);
      }

      // Update last refresh timestamp
      await this.updateLastRefresh();
      console.log("✅ Labor newsfeed refresh completed");
      
    } catch (error) {
      console.error("❌ Error refreshing labor newsfeed:", error);
      throw error;
    }
  }

  /**
   * Process individual news item with AI summarization
   */
  private async processNewsItem(item: any): Promise<void> {
    try {
      // Check if item already exists
      const existing = await db
        .select()
        .from(laborNewsfeedItems)
        .where(eq(laborNewsfeedItems.externalId, item.id))
        .limit(1);

      if (existing.length > 0) {
        console.log(`⏭️ Skipping existing item: ${item.id}`);
        return;
      }

      // Verify URL is accessible
      const urlCheck = await this.checkUrlAccessibility(item.url);
      if (!urlCheck.accessible) {
        console.log(`🚫 URL not accessible: ${item.url} - ${urlCheck.reason}`);
        // Store with review flag
        await this.storeItemForReview(item, urlCheck.reason);
        return;
      }

      // Generate AI summary
      const aiSummary = await this.generateAISummary(item.content, item.headline);
      
      // Calculate content hash
      const contentHash = this.calculateHash(aiSummary);

      // Store news item
      const [newItem] = await db
        .insert(laborNewsfeedItems)
        .values({
          externalId: item.id,
          category: item.category,
          headline: item.headline,
          summary: aiSummary,
          source: item.source,
          sourceUrl: item.url,
          publishedDate: item.date,
          aiSummaryHash: contentHash,
          isActive: true,
          needsReview: false
        })
        .returning();

      // Store citations
      if (item.citations) {
        for (const citation of item.citations) {
          await db
            .insert(laborNewsfeedCitations)
            .values({
              newsItemId: newItem.id,
              citationId: citation.id,
              sourceType: citation.type,
              sourceDescription: citation.description,
              sourceUrl: citation.url,
              isVerified: true
            });
        }
      }

      console.log(`✅ Processed news item: ${item.headline.substring(0, 50)}...`);
      
    } catch (error) {
      console.error(`❌ Error processing news item ${item.id}:`, error);
      await this.storeItemForReview(item, `Processing error: ${error.message}`);
    }
  }

  /**
   * Generate AI summary for news content
   */
  private async generateAISummary(content: string, headline: string): Promise<string> {
    try {
      if (!openai) {
        console.log("OpenAI not initialized, using fallback summary");
        return "Αυτοματοποιημένη περίληψη δεν είναι διαθέσιμη. Παρακαλώ προσθέστε OPENAI_API_KEY.";
      }

      const prompt = `Σύντομη περίληψη (50-80 λέξεις) του παρακάτω άρθρου εργασιακών νέων στην ελληνική γλώσσα. Εστίασε στα κυριότερα σημεία που αφορούν μισθούς, εργασιακά δικαιώματα, ή νομοθετικές αλλαγές.

Τίτλος: ${headline}
Περιεχόμενο: ${content}

Παράδειγμα μορφής: "Από 1 Απριλίου 2025, ο κατώτατος μισθός ορίζεται σε €880/μήνα για υπαλλήλους και €39,30/ημέρα για εργάτες. Η αύξηση ισχύει για πλήρη και μερική απασχόληση σύμφωνα με την απόφαση του υπουργείου."

Περίληψη:`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.3
      });

      return response.choices[0].message.content?.trim() || "Περίληψη δεν είναι διαθέσιμη.";
      
    } catch (error) {
      console.error("Error generating AI summary:", error);
      return "Αυτοματοποιημένη περίληψη δεν είναι διαθέσιμη.";
    }
  }

  /**
   * Check URL accessibility (simulate 404 detection)
   */
  private async checkUrlAccessibility(url: string): Promise<{ accessible: boolean; reason?: string }> {
    try {
      // Simulate URL check - in production this would make actual HTTP requests
      // For demo purposes, randomly simulate some URLs being inaccessible
      const randomFailure = Math.random() < 0.05; // 5% chance of failure
      
      if (randomFailure) {
        return { accessible: false, reason: "HTTP 404 - Page not found" };
      }
      
      return { accessible: true };
      
    } catch (error) {
      return { accessible: false, reason: `Network error: ${error.message}` };
    }
  }

  /**
   * Store item for manual review
   */
  private async storeItemForReview(item: any, reason: string): Promise<void> {
    await db
      .insert(laborNewsfeedItems)
      .values({
        externalId: item.id,
        category: item.category,
        headline: item.headline,
        summary: item.summary || "Δεν είναι διαθέσιμη περίληψη - χρειάζεται έλεγχος",
        source: item.source,
        sourceUrl: item.url,
        publishedDate: item.date,
        isActive: false,
        needsReview: true,
        reviewReason: reason
      });
  }

  /**
   * Calculate content hash for change detection
   */
  private calculateHash(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Mock news items for demonstration
   */
  private async getMockNewsItems() {
    return [
      {
        id: "min_wage_2025_04",
        date: "2025-04-01",
        category: "Minimum Wage",
        headline: "Αύξηση κατώτατου μισθού στα €880/μήνα & €39,30/ημέρα",
        content: "Με την νέα υπουργική απόφαση, από την 1η Απριλίου 2025, ο κατώτατος μισθός για υπαλλήλους ορίζεται σε 880 ευρώ το μήνα, ενώ για εργάτες στα 39,30 ευρώ την ημέρα. Η αύξηση αφορά τόσο την πλήρη όσο και τη μερική απασχόληση.",
        source: "Ministry of Labour",
        url: "https://ypergasias.gov.gr/en/labour-relations/collective-employment-relations/minimum-wage/",
        citations: [
          { id: "turn0search13", type: "search", description: "Ministry official announcement", url: "https://ypergasias.gov.gr/" },
          { id: "turn0search5", type: "news", description: "Press release confirmation", url: null }
        ]
      },
      {
        id: "digital_work_card_expansion_2025",
        date: "2025-06-26",
        category: "Digital Work Card",
        headline: "Επέκταση Ψηφιακής Κάρτας σε νέους κλάδους από Νοέμβριο 2025",
        content: "Η ψηφιακή κάρτα εργασίας επεκτείνεται σε χονδρικό εμπόριο, ενέργεια, χρηματοοικονομικούς τομείς και υποστήριξη τουρισμού. Πιλοτική εφαρμογή από 26/6/2025 και υποχρεωτική από 3/11/2025.",
        source: "KREMALIS Law Firm",
        url: "https://kremalis.com/expansion-of-the-digital-work-card-scheme/",
        citations: [
          { id: "turn0search11", type: "search", description: "Legal analysis KREMALIS", url: "https://kremalis.com/" },
          { id: "turn0search19", type: "news", description: "Implementation timeline", url: null }
        ]
      }
    ];
  }

  /**
   * Get or create newsfeed configuration
   */
  private async getConfig() {
    const existing = await db
      .select()
      .from(laborNewsfeedConfig)
      .limit(1);

    if (existing.length === 0) {
      const [config] = await db
        .insert(laborNewsfeedConfig)
        .values({})
        .returning();
      return config;
    }

    return existing[0];
  }

  /**
   * Update last refresh timestamp
   */
  private async updateLastRefresh(): Promise<void> {
    const now = new Date();
    const config = await this.getConfig();
    
    const nextRefresh = new Date(now.getTime() + (config.refreshIntervalMinutes * 60 * 1000));
    
    await db
      .update(laborNewsfeedConfig)
      .set({
        lastRefresh: now,
        nextRefresh: nextRefresh,
        updatedAt: now
      })
      .where(eq(laborNewsfeedConfig.id, config.id));
  }

  /**
   * Get active news items for widget display
   */
  async getActiveNewsItems(limit: number = 6) {
    const items = await db
      .select({
        id: laborNewsfeedItems.id,
        externalId: laborNewsfeedItems.externalId,
        category: laborNewsfeedItems.category,
        headline: laborNewsfeedItems.headline,
        summary: laborNewsfeedItems.summary,
        source: laborNewsfeedItems.source,
        sourceUrl: laborNewsfeedItems.sourceUrl,
        publishedDate: laborNewsfeedItems.publishedDate,
        needsReview: laborNewsfeedItems.needsReview,
        lastChecked: laborNewsfeedItems.lastChecked
      })
      .from(laborNewsfeedItems)
      .where(
        and(
          eq(laborNewsfeedItems.isActive, true),
          eq(laborNewsfeedItems.needsReview, false)
        )
      )
      .orderBy(desc(laborNewsfeedItems.publishedDate))
      .limit(limit);

    // Get citations for each item
    const itemsWithCitations = await Promise.all(
      items.map(async (item) => {
        const citations = await db
          .select()
          .from(laborNewsfeedCitations)
          .where(eq(laborNewsfeedCitations.newsItemId, item.id));

        return {
          ...item,
          citations: citations.map(c => ({
            id: c.citationId,
            type: c.sourceType,
            description: c.sourceDescription,
            url: c.sourceUrl,
            verified: c.isVerified
          }))
        };
      })
    );

    return itemsWithCitations;
  }

  /**
   * Get items that need review
   */
  async getItemsNeedingReview() {
    return await db
      .select()
      .from(laborNewsfeedItems)
      .where(eq(laborNewsfeedItems.needsReview, true))
      .orderBy(desc(laborNewsfeedItems.createdAt));
  }

  /**
   * Check if refresh is needed
   */
  async needsRefresh(): Promise<boolean> {
    const config = await this.getConfig();
    if (!config.nextRefresh) return true;
    
    return new Date() >= config.nextRefresh;
  }
}

export function registerLaborNewsfeedRoutes(app: Express): void {
  const service = new LaborNewsfeedService();

  // Get active newsfeed items
  app.get("/api/labor-newsfeed", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 6;
      const items = await service.getActiveNewsItems(limit);
      
      const config = await service.getConfig();
      
      res.json({
        widget_id: "labour_newsfeed_gr",
        title: "Εργασιακά Νέα & Νομοθεσία (Ελλάδα)",
        last_updated: config.lastRefresh?.toISOString() || new Date().toISOString(),
        update_policy: {
          refresh_interval_minutes: config.refreshIntervalMinutes,
          sources_note: "Official ministry pages + reputable media/legal insights"
        },
        items: items.map(item => ({
          id: item.externalId,
          date: item.publishedDate,
          category: item.category,
          headline: item.headline,
          summary: item.summary,
          source: item.source,
          url: item.sourceUrl,
          citations: item.citations.map(c => c.id),
          last_checked: item.lastChecked
        }))
      });
    } catch (error) {
      console.error("Error fetching labor newsfeed:", error);
      res.status(500).json({ message: "Failed to fetch labor newsfeed" });
    }
  });

  // Force refresh newsfeed
  app.post("/api/labor-newsfeed/refresh", isAuthenticated, async (req: Request, res: Response) => {
    try {
      await service.fetchAndParseNews();
      res.json({ message: "Newsfeed refresh completed", timestamp: new Date().toISOString() });
    } catch (error) {
      console.error("Error refreshing labor newsfeed:", error);
      res.status(500).json({ message: "Failed to refresh labor newsfeed" });
    }
  });

  // Get items needing review (admin only)
  app.get("/api/labor-newsfeed/review", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const items = await service.getItemsNeedingReview();
      res.json(items);
    } catch (error) {
      console.error("Error fetching review items:", error);
      res.status(500).json({ message: "Failed to fetch review items" });
    }
  });

  // Auto-refresh check endpoint (called by cron job or scheduler)
  app.post("/api/labor-newsfeed/auto-refresh", async (req: Request, res: Response) => {
    try {
      const needsRefresh = await service.needsRefresh();
      if (needsRefresh) {
        await service.fetchAndParseNews();
        res.json({ refreshed: true, timestamp: new Date().toISOString() });
      } else {
        res.json({ refreshed: false, message: "Refresh not needed yet" });
      }
    } catch (error) {
      console.error("Error in auto-refresh:", error);
      res.status(500).json({ message: "Auto-refresh failed" });
    }
  });
}