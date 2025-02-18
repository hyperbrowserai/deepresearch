import { createInterface } from "readline";
import { Usage, TokenCount } from "./types";

// Create a single readline interface that can be reused and closed
const readline = createInterface({
  input: process.stdin,
  output: process.stdout,
});

export const askQuestion = (question: string): Promise<string> => {
  return new Promise((resolve) => {
    readline.question(`${question}\n> `, (answer: string) => {
      resolve(answer);
    });
  });
};

// Add function to close readline interface
export const closeReadline = () => {
  readline.close();
};

class UsageTracker {
  private static instance: UsageTracker;
  private usages: Usage[] = [];

  private constructor() {}

  static getInstance(): UsageTracker {
    if (!UsageTracker.instance) {
      UsageTracker.instance = new UsageTracker();
    }
    return UsageTracker.instance;
  }

  trackUsage(usage: Usage) {
    this.usages.push(usage);
    console.log(
      `[Usage] ${usage.module}.${usage.operation}: ${usage.tokens.total_tokens} tokens (${usage.model})`
    );
  }

  getUsages(): Usage[] {
    return this.usages;
  }

  getTotalTokens(): number {
    return this.usages.reduce(
      (sum, usage) => sum + usage.tokens.total_tokens,
      0
    );
  }

  getCostEstimate(): number {
    const rates: Record<
      string,
      { input: number; cached_input: number; output: number }
    > = {
      "gpt-4o": { input: 2.5, cached_input: 1.25, output: 10.0 },
      "gpt-4o-mini": { input: 0.15, cached_input: 0.075, output: 0.6 },
      o1: { input: 15.0, cached_input: 7.5, output: 60.0 },
      "o3-mini": { input: 1.1, cached_input: 0.55, output: 4.4 },
    };

    return this.usages.reduce((sum, usage) => {
      const modelRates = rates[usage.model];
      if (!modelRates) return sum;

      // Calculate cost for input tokens (prompt) - price per 1M tokens
      const inputCost =
        (usage.tokens.prompt_tokens / 1_000_000) * modelRates.input;

      // Calculate cost for output tokens (completion) - price per 1M tokens
      const outputCost =
        (usage.tokens.completion_tokens / 1_000_000) * modelRates.output;

      return sum + inputCost + outputCost;
    }, 0);
  }

  getDetailedCostBreakdown(): {
    totalCost: number;
    byModel: Record<
      string,
      {
        inputCost: number;
        outputCost: number;
        totalCost: number;
        inputTokens: number;
        outputTokens: number;
      }
    >;
  } {
    const rates: Record<
      string,
      { input: number; cached_input: number; output: number }
    > = {
      "gpt-4o": { input: 2.5, cached_input: 1.25, output: 10.0 },
      "gpt-4o-mini": { input: 0.15, cached_input: 0.075, output: 0.6 },
      o1: { input: 15.0, cached_input: 7.5, output: 60.0 },
      "o3-mini": { input: 1.1, cached_input: 0.55, output: 4.4 },
    };

    const breakdown: Record<
      string,
      {
        inputCost: number;
        outputCost: number;
        totalCost: number;
        inputTokens: number;
        outputTokens: number;
      }
    > = {};

    let totalCost = 0;

    this.usages.forEach((usage) => {
      const modelRates = rates[usage.model];
      if (!modelRates) return;

      if (!breakdown[usage.model]) {
        breakdown[usage.model] = {
          inputCost: 0,
          outputCost: 0,
          totalCost: 0,
          inputTokens: 0,
          outputTokens: 0,
        };
      }

      // Calculate costs using per 1M tokens pricing
      const inputCost =
        (usage.tokens.prompt_tokens / 1_000_000) * modelRates.input;
      const outputCost =
        (usage.tokens.completion_tokens / 1_000_000) * modelRates.output;

      breakdown[usage.model].inputCost += inputCost;
      breakdown[usage.model].outputCost += outputCost;
      breakdown[usage.model].totalCost += inputCost + outputCost;
      breakdown[usage.model].inputTokens += usage.tokens.prompt_tokens;
      breakdown[usage.model].outputTokens += usage.tokens.completion_tokens;

      totalCost += inputCost + outputCost;
    });

    return { totalCost, byModel: breakdown };
  }

  getMetrics() {
    const costBreakdown = this.getDetailedCostBreakdown();
    return {
      usages: this.usages,
      totalTokens: this.getTotalTokens(),
      costEstimate: costBreakdown.totalCost,
      costBreakdown: costBreakdown.byModel,
    };
  }

  reset() {
    this.usages = [];
  }
}

export const usageTracker = UsageTracker.getInstance();
