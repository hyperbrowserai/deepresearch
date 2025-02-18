import { createInterface } from "readline";
import { Usage, TokenCount } from "./types";

// Ask each clarifying question and get user input
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
    const rates: Record<string, number> = {
      "gpt-4o": 0.03,
      o1: 0.02,
      "o3-mini": 0.01,
      "gpt-4o-mini": 0.015,
    };

    return this.usages.reduce((sum, usage) => {
      const rate = rates[usage.model] || 0.02;
      return sum + (usage.tokens.total_tokens / 1000) * rate;
    }, 0);
  }

  getMetrics() {
    return {
      usages: this.usages,
      totalTokens: this.getTotalTokens(),
      costEstimate: this.getCostEstimate(),
    };
  }

  reset() {
    this.usages = [];
  }
}

export const usageTracker = UsageTracker.getInstance();
