import { OpenAI } from "openai";
import { Hyperbrowser } from "@hyperbrowser/sdk";
import { ClarificationModule } from "./modules/clarification";
import { SearchModule } from "./modules/search";
import { SummarizationModule } from "./modules/summarization";
import { BrainModule } from "./modules/brain";
import { ResearchQuery, ResearchReport, ResearchState } from "./types";
import { usageTracker } from "./utils";

export class ResearchOrchestrator {
  private clarificationModule: ClarificationModule;
  private searchModule: SearchModule;
  private summarizationModule: SummarizationModule;
  private brainModule: BrainModule;
  private state: ResearchState | null = null;

  constructor(
    private openai: OpenAI,
    private hbClient: InstanceType<typeof Hyperbrowser>
  ) {
    this.clarificationModule = new ClarificationModule(openai);
    this.searchModule = new SearchModule(hbClient, openai);
    this.summarizationModule = new SummarizationModule(openai);
    this.brainModule = new BrainModule(openai);
  }

  private saveState(newState: Partial<ResearchState>) {
    this.state = {
      ...this.state,
      ...newState,
    } as ResearchState;
  }

  private createCheckpoint() {
    if (this.state) {
      this.state.checkpoint = { ...this.state };
    }
  }

  private restoreCheckpoint() {
    if (this.state?.checkpoint) {
      this.state = { ...this.state.checkpoint };
    }
  }

  async conductResearch(initialTopic: string): Promise<ResearchReport> {
    try {
      // Reset usage tracking for new research
      usageTracker.reset();

      // Initialize state with required fields
      this.state = {
        query: {
          topic: initialTopic,
          depth: "deep", // Set default depth
        },
        stage: "clarification",
        documentSummaries: [],
        searchQueries: [],
        partialDrafts: new Map(),
      } as ResearchState;

      // 1. Clarification stage
      console.log("Starting clarification stage...");
      const refinedQuery = await this.clarificationModule.clarifyQuery(
        initialTopic
      );
      this.saveState({ query: refinedQuery, stage: "search" });
      this.createCheckpoint();

      console.log(`Done with Clarification stage`);
      console.log(JSON.stringify(this.state, null, 2));

      // 2. Search stage
      console.log("Starting search stage...");
      const searchResults = await this.searchModule.search(refinedQuery);
      this.saveState({ stage: "summarization" });

      console.log(`Done with Search stage`);
      console.log(JSON.stringify(this.state, null, 2));

      // 3. Summarization stage
      console.log("Starting summarization stage...");
      const documentSummaries = await this.summarizationModule.processBatch(
        searchResults,
        refinedQuery
      );
      this.saveState({ documentSummaries, stage: "outline" });

      console.log(`Done with Summarization stage`);
      console.log(JSON.stringify(this.state, null, 2));

      console.log(JSON.stringify(documentSummaries, null, 2));

      // If we don't have enough relevant documents, backtrack to search
      if (documentSummaries.length < 3) {
        console.log("Insufficient relevant documents found, backtracking...");
        this.restoreCheckpoint();
        return this.conductResearch(initialTopic); // Retry with the original topic
      }

      // 4. Generate report
      console.log("Generating final report...");
      const report = await this.brainModule.generateReport(
        refinedQuery,
        documentSummaries
      );

      // Add usage metrics to the report
      const metrics = usageTracker.getMetrics();
      report.metadata.usageMetrics = metrics;

      console.log(JSON.stringify(metrics, null, 2));

      this.saveState({ stage: "final" });
      return report;
    } catch (error) {
      console.error("Error during research process:", error);
      if (this.state?.checkpoint) {
        console.log("Attempting to recover from checkpoint...");
        this.restoreCheckpoint();
        return this.conductResearch(initialTopic);
      }
      throw error;
    }
  }
}
