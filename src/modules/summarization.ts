import { OpenAI } from "openai";
import {
  DocumentSummary,
  DocumentSummarySchema,
  ResearchQuery,
} from "../types";
import { zodResponseFormat } from "openai/helpers/zod";

export class SummarizationModule {
  constructor(private openai: OpenAI) {}

  private async summarizeContent(
    content: string,
    url: string,
    query: ResearchQuery
  ): Promise<DocumentSummary | null> {
    const response = await this.openai.beta.chat.completions.parse({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a research assistant helping to summarize and evaluate content for relevance to a research topic.
            Analyze the content and return a JSON object with the following structure:
            {
              "title": "Extracted or inferred title",
              "summary": "Concise summary focusing on key points (max 200 words)",
              "relevanceScore": number between 0 and 1,
              "sourceType": "academic" | "news" | "market" | "other",
              "extractedAt": "ISO 8601 timestamp of when the content was extracted",
              "url": "URL of the page"
            }
            
            If the content is not relevant (relevanceScore < 0.3) or appears to be spam/low quality, return null.`,
        },
        {
          role: "user",
          content: `Research Topic: ${query.topic}
            Research Angle: ${query.angle || "General overview"}
            URL: ${url}
            Date / Time Right Now: ${new Date().toISOString()}
            Content to analyze:\n${content.slice(0, 120_000)}`, // Limit content length
        },
      ],
      response_format: zodResponseFormat(
        DocumentSummarySchema,
        "DocumentSummary"
      ),
    });

    console.log(
      `Spent ${JSON.stringify(
        response.usage,
        null,
        2
      )} tokens on 4o-mini for summarization`
    );

    const parsed = response.choices[0].message.parsed;
    if (!parsed) {
      console.error("No parsed summary returned");
      return null;
    }

    return {
      ...parsed,
      extractedAt: new Date(),
      url,
    };
  }

  async processBatch(
    documents: Array<{ url: string; content: string }>,
    query: ResearchQuery
  ): Promise<DocumentSummary[]> {
    console.log(`\n\nSummarizing ${documents.length} documents:`);
    console.log(JSON.stringify(documents, null, 2));
    const summaries = await Promise.all(
      documents.map(async (doc) => {
        return this.summarizeContent(doc.content, doc.url, query);
      })
    );

    // Filter out null results and sort by relevance
    return summaries
      .filter((s): s is DocumentSummary => s !== null)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
}
