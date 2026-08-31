import { contentRepository, ContentRepository } from "../repositories/content.repository";
import { 
  ProblemStatement, 
  HomepageContent, 
  CustomPage, 
  MenuItem, 
  LiveUpdate, 
  FeeConfig 
} from "../../src/types";

export class ContentService {
  constructor(
    private contentRepo: ContentRepository = contentRepository
  ) {}

  // Problem Statements
  public async getProblemStatements(): Promise<ProblemStatement[]> {
    return this.contentRepo.getProblemStatements();
  }

  public async saveProblemStatements(statements: ProblemStatement[]): Promise<boolean> {
    return this.contentRepo.saveProblemStatements(statements);
  }

  // App Settings
  public async getSettings(): Promise<FeeConfig> {
    return this.contentRepo.getSettings();
  }

  public async updateSettings(settings: FeeConfig): Promise<boolean> {
    return this.contentRepo.saveSettings(settings);
  }

  // Homepage Content
  public async getHomepageContent(): Promise<HomepageContent> {
    return this.contentRepo.getHomepageContent();
  }

  public async updateHomepageContent(content: HomepageContent): Promise<boolean> {
    return this.contentRepo.saveHomepageContent(content);
  }

  // Custom Pages
  public async getCustomPages(): Promise<CustomPage[]> {
    return this.contentRepo.getCustomPages();
  }

  public async getCustomPageBySlug(slug: string): Promise<CustomPage | null> {
    const pages = await this.contentRepo.getCustomPages();
    return pages.find(p => p.slug === slug || p.id === slug) || null;
  }

  public async saveCustomPage(page: CustomPage): Promise<boolean> {
    return this.contentRepo.saveCustomPage(page);
  }

  public async saveCustomPages(pages: CustomPage[]): Promise<boolean> {
    return this.contentRepo.saveCustomPages(pages);
  }

  public async deleteCustomPage(id: string): Promise<boolean> {
    return this.contentRepo.deleteCustomPage(id);
  }

  // Menu Items
  public async getMenuItems(): Promise<MenuItem[]> {
    return this.contentRepo.getMenuItems();
  }

  public async updateMenuItems(items: MenuItem[]): Promise<boolean> {
    return this.contentRepo.saveMenuItems(items);
  }

  // Live Updates
  public async getLiveUpdates(): Promise<LiveUpdate[]> {
    return this.contentRepo.getLiveUpdates();
  }

  public async updateLiveUpdates(updates: LiveUpdate[]): Promise<boolean> {
    return this.contentRepo.saveLiveUpdates(updates);
  }
}

export const contentService = new ContentService();
