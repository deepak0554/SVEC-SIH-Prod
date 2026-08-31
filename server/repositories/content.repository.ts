import { BaseRepository } from "./base.repository";
import { 
  ProblemStatement, 
  HomepageContent, 
  CustomPage, 
  MenuItem, 
  LiveUpdate, 
  FeeConfig 
} from "../../src/types";
import { BroadcastLog } from "../db";

export class ContentRepository extends BaseRepository {
  // Problem Statements
  public async getProblemStatements(): Promise<ProblemStatement[]> {
    return this.dbManager.getProblemStatements();
  }

  public async saveProblemStatements(statements: ProblemStatement[]): Promise<boolean> {
    return this.dbManager.saveProblemStatements(statements);
  }

  // App Settings
  public async getSettings(): Promise<FeeConfig> {
    return this.dbManager.getSettings();
  }

  public async saveSettings(settings: FeeConfig): Promise<boolean> {
    return this.dbManager.saveSettings(settings);
  }

  // Homepage Content
  public async getHomepageContent(): Promise<HomepageContent> {
    return this.dbManager.getHomepageContent();
  }

  public async saveHomepageContent(content: HomepageContent): Promise<boolean> {
    return this.dbManager.saveHomepageContent(content);
  }

  // Custom Pages
  public async getCustomPages(): Promise<CustomPage[]> {
    return this.dbManager.getCustomPages();
  }

  public async saveCustomPages(pages: CustomPage[]): Promise<boolean> {
    return this.dbManager.saveCustomPages(pages);
  }

  public async saveCustomPage(page: CustomPage): Promise<boolean> {
    return this.dbManager.saveCustomPage(page);
  }

  public async deleteCustomPage(id: string): Promise<boolean> {
    return this.dbManager.deleteCustomPage(id);
  }

  // Menu Items
  public async getMenuItems(): Promise<MenuItem[]> {
    return this.dbManager.getMenuItems();
  }

  public async saveMenuItems(items: MenuItem[]): Promise<boolean> {
    return this.dbManager.saveMenuItems(items);
  }

  // Live Updates
  public async getLiveUpdates(): Promise<LiveUpdate[]> {
    return this.dbManager.getLiveUpdates();
  }

  public async saveLiveUpdates(updates: LiveUpdate[]): Promise<boolean> {
    return this.dbManager.saveLiveUpdates(updates);
  }

  // Broadcast Logs
  public async getBroadcastLogs(): Promise<BroadcastLog[]> {
    return this.dbManager.getBroadcastLogs();
  }

  public async saveBroadcastLog(log: BroadcastLog): Promise<boolean> {
    return this.dbManager.saveBroadcastLog(log);
  }
}

export const contentRepository = new ContentRepository();
