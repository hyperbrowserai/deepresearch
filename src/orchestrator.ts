import { OpenAI } from "openai";
import { Hyperbrowser } from "@hyperbrowser/sdk";
import { ClarificationModule } from "./modules/clarification";
import { SearchModule } from "./modules/search";
import { SummarizationModule } from "./modules/summarization";
import { BrainModule } from "./modules/brain";
import { FinalizeModule } from "./modules/finalize";
import { ResearchReport, ResearchState, ResearchQuery } from "./types";
import { usageTracker } from "./utils";

export interface ResearchResult {
  markdown: string;
  report: ResearchReport;
}

export class ResearchOrchestrator {
  private clarificationModule: ClarificationModule;
  private searchModule: SearchModule;
  private summarizationModule: SummarizationModule;
  private brainModule: BrainModule;
  private finalizeModule: FinalizeModule;
  private state: ResearchState | null = null;

  constructor(
    private openai: OpenAI,
    private hbClient: InstanceType<typeof Hyperbrowser>
  ) {
    this.clarificationModule = new ClarificationModule(openai);
    this.searchModule = new SearchModule(hbClient, openai);
    this.summarizationModule = new SummarizationModule(openai);
    this.brainModule = new BrainModule(openai);
    this.finalizeModule = new FinalizeModule(openai);
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

  // Get clarifying questions for a topic
  async getClarifyingQuestions(topic: string): Promise<string[]> {
    return this.clarificationModule.getClarifyingQuestions(topic);
  }

  // Process answers and generate refined query
  async processAnswer(
    topic: string,
    question: string,
    answers: string
  ): Promise<ResearchQuery> {
    return this.clarificationModule.processAnswer(topic, question, answers);
  }

  // Conduct research with a refined query
  async conductResearch(refinedQuery: ResearchQuery): Promise<ResearchResult> {
    try {
      // Reset usage tracking for new research
      usageTracker.reset();

      // Initialize state with required fields
      this.state = {
        query: refinedQuery,
        stage: "search",
        documentSummaries: [],
        searchQueries: [],
        partialDrafts: new Map(),
      } as ResearchState;

      // 2. Search stage
      console.log("Starting search stage...");
      const searchResults = await this.searchModule.search(refinedQuery);
      this.saveState({ stage: "summarization" });

      console.log(`Done with Search stage`);

      // 3. Summarization stage
      console.log("Starting summarization stage...");
      const documentSummaries = await this.summarizationModule.processBatch(
        searchResults,
        refinedQuery
      );
      this.saveState({ documentSummaries, stage: "outline" });

      console.log(`Done with Summarization stage`);

      // If we don't have enough relevant documents, throw error
      if (documentSummaries.length < 3) {
        throw new Error("Insufficient relevant documents found");
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

      // 5. Finalize and format report
      console.log("Finalizing report format...");
      const finalResult = await this.finalizeModule.finalizeReport(report);

      this.saveState({ stage: "final" });
      return finalResult;
    } catch (error) {
      console.error("Error during research process:", error);
      throw error;
    }
  }
}
