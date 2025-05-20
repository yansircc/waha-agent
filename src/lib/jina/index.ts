import { JinaCrawlerService } from "./crawler";

// Export types
export * from "./types";
// Export the crawler class

// Create singleton instance
export const jinaCrawler = new JinaCrawlerService();
