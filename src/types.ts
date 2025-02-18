import { z } from "zod";

// Core types for the research process

export const SearchResultsSchema = z.object({
  topSearchResutls: z.array(
    z.object({
      url: z.string(),
      title: z.string(),
      snippet: z.string(),
    })
  ),
});

export type SearchResults = z.infer<typeof SearchResultsSchema>;

export const SearchQueriesSchema = z.object({
  queries: z.array(z.string()),
});

export type SearchQueries = z.infer<typeof SearchQueriesSchema>;

export const ClarifyingQuestionsSchema = z.object({
  chainOfThought: z.string(),
  questions: z.array(z.string()),
});

export type ClarifyingQuestions = z.infer<typeof ClarifyingQuestionsSchema>;

export const ResearchQuerySchema = z.object({
  topic: z.string(),
  angle: z.string().optional(),
  depth: z.enum(["basic", "intermediate", "deep"]),
  preferences: z
    .object({
      includeAcademic: z.boolean(),
      includeNews: z.boolean(),
      includeMarketData: z.boolean(),
    })
    .optional(),
});

export type ResearchQuery = z.infer<typeof ResearchQuerySchema>;

export const DocumentSummarySchema = z.object({
  title: z.string(),
  summary: z.string(),
  relevanceScore: z.number(),
  sourceType: z.enum(["academic", "news", "market", "other"]),
});

export type DocumentSummary = z.infer<typeof DocumentSummarySchema> & {
  extractedAt: Date;
  url: string;
};

export const ResearchOutlineSchema = z.object({
  title: z.string(),
  sections: z.array(
    z.object({
      heading: z.string(),
      subheadings: z.array(z.string()),
      relevantDocuments: z.array(z.string()),
    })
  ),
});

export type ResearchOutline = z.infer<typeof ResearchOutlineSchema>;

export interface ResearchReport {
  query: ResearchQuery;
  outline: ResearchOutline;
  content: {
    introduction: string;
    sections: Array<{
      heading: string;
      content: string;
      sources: string[];
    }>;
    conclusion: string;
  };
  metadata: {
    generatedAt: Date;
    sourcesUsed: DocumentSummary[];
    searchQueries: string[];
    usageMetrics?: ResearchMetrics;
  };
}

// State management for backtracking
export interface ResearchState {
  query: ResearchQuery;
  stage:
    | "clarification"
    | "search"
    | "summarization"
    | "outline"
    | "drafting"
    | "final";
  documentSummaries: DocumentSummary[];
  outline?: ResearchOutline;
  partialDrafts: Map<string, string>; // section heading -> content
  searchQueries: string[];
  checkpoint?: ResearchState; // For backtracking
}

// Configuration for different models
export interface ModelConfig {
  summaryModel: string; // o3-mini for quick summaries
  reasoningModel: string; // o1 for main reasoning
  draftingModel: string; // o1 for section drafting
  finalModel: string; // o1 for final compilation
}

export interface TokenCount {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface Usage {
  model: "gpt-4o" | "o1" | "o3-mini" | "gpt-4o-mini";
  tokens: TokenCount;
  module: string;
  operation: string;
  timestamp: Date;
}

export interface ResearchMetrics {
  usages: Usage[];
  totalTokens: number;
  costEstimate: number;
}
