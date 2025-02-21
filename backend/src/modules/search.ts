import { z } from "zod";
import { Hyperbrowser } from "@hyperbrowser/sdk";
import { OpenAI } from "openai";
import { zodResponseFormat } from "openai/helpers/zod";

import {
  ResearchQuery,
  SearchResultsSchema,
  SearchResults,
  SearchQueriesSchema,
  Usage,
} from "../types";
import { usageTracker } from "../utils";

export class SearchModule {
  constructor(
    private hbClient: InstanceType<typeof Hyperbrowser>,
    private openai: OpenAI
  ) {}

  private async generateSearchQueries(query: ResearchQuery): Promise<string[]> {
    const response = await this.openai.beta.chat.completions.parse({
      model: "o3-mini",
      reasoning_effort: "high",
      messages: [
        {
          role: "system",
          content:
            "You are a research assistant helping to generate effective search queries. Generate 3-5 search queries that would help find relevant information for the research topic.",
        },
        {
          role: "user",
          content: `Research Query: ${JSON.stringify(
            query,
            null,
            2
          )}\n\nGenerate search queries that would help find relevant information.`,
        },
      ],
      response_format: zodResponseFormat(SearchQueriesSchema, "SearchQueries"),
    });

    usageTracker.trackUsage({
      model: "o3-mini",
      tokens: {
        prompt_tokens: response.usage?.prompt_tokens || 0,
        completion_tokens: response.usage?.completion_tokens || 0,
        total_tokens: response.usage?.total_tokens || 0,
      },
      module: "search",
      operation: "generateSearchQueries",
      timestamp: new Date(),
    });

    const queries = response.choices[0].message.parsed?.queries;
    if (!queries) {
      throw new Error("No search queries generated");
    }

    console.log("\n\nSearch queries generated:");
    console.log(JSON.stringify(queries, null, 2));

    return queries;
  }

  private async searchGoogle(query: string): Promise<string[]> {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(
      query
    )}`;

    const results = await this.hbClient.extract.startAndWait({
      urls: [searchUrl],
      schema: SearchResultsSchema,
      prompt:
        "Extract the top 5 search results from the given search results page, in order.",
      sessionOptions: {
        useProxy: true,
        acceptCookies: true,
        solveCaptchas: true,
        adblock: true,
      },
    });

    console.log(`Results: ${JSON.stringify(results, null, 2)}`);

    console.log(
      `\n\nSearch results: ${JSON.stringify(results.data, null, 2)}\n\n`
    );

    return (results.data as SearchResults).topSearchResutls
      .map((r) => r.url)
      .filter((url): url is string => typeof url === "string")
      .slice(0, 5); // Limit to top 5 results per query
  }

  private async scrapeUrl(url: string): Promise<string> {
    try {
      const result = await this.hbClient.scrape.startAndWait({
        url,
        scrapeOptions: {
          onlyMainContent: true,
          formats: ["markdown"],
        },
        sessionOptions: {
          useProxy: true,
          useStealth: true,
          acceptCookies: true,
          solveCaptchas: true,
          adblock: true,
        },
      });

      return result.data?.markdown ?? "";
    } catch (error) {
      console.error(`Failed to scrape ${url}:`, error);
      return "";
    }
  }

  async search(
    query: ResearchQuery
  ): Promise<Array<{ url: string; content: string }>> {
    // Generate search queries
    const searchQueries = await this.generateSearchQueries(query);

    // Collect all URLs from all queries
    const urlSets = await Promise.all(
      searchQueries.map((q) => this.searchGoogle(q))
    );
    const uniqueUrls = [...new Set(urlSets.flat())];

    // Scrape content from each URL
    const results = await Promise.all(
      uniqueUrls.map(async (url) => {
        const content = await this.scrapeUrl(url);
        return { url, content };
      })
    );

    // Filter out failed scrapes
    return results.filter((r) => r.content.length > 0);
  }
}
