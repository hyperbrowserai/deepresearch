import { OpenAI } from "openai";
import { zodResponseFormat } from "openai/helpers/zod";

import {
  DocumentSummary,
  ResearchOutline,
  ResearchOutlineSchema,
  ResearchQuery,
  ResearchReport,
} from "../types";
import { usageTracker } from "../utils";

export class BrainModule {
  constructor(private openai: OpenAI) {}

  private async generateOutline(
    query: ResearchQuery,
    summaries: DocumentSummary[]
  ): Promise<ResearchOutline> {
    const response = await this.openai.beta.chat.completions.parse({
      model: "o1",
      reasoning_effort: "high",
      messages: [
        {
          role: "system",
          content: `You are a research expert creating a structured outline for a comprehensive research report.
          Based on the available document summaries, create a logical outline that covers the topic thoroughly.
          Return a JSON object matching the ResearchOutline type, with sections and relevant document URLs.`,
        },
        {
          role: "user",
          content: `Research Query: ${JSON.stringify(query, null, 2)}
          Available Documents: ${JSON.stringify(summaries, null, 2)}
          
          Create a structured outline for the research report.`,
        },
      ],
      response_format: zodResponseFormat(
        ResearchOutlineSchema,
        "ResearchOutline"
      ),
    });

    usageTracker.trackUsage({
      model: "o1",
      tokens: {
        prompt_tokens: response.usage?.prompt_tokens || 0,
        completion_tokens: response.usage?.completion_tokens || 0,
        total_tokens: response.usage?.total_tokens || 0,
      },
      module: "brain",
      operation: "generateOutline",
      timestamp: new Date(),
    });

    const parsed = response.choices[0].message.parsed;

    if (!parsed) throw new Error("No outline generated");

    return parsed;
  }

  private async generateSectionContent(
    section: string,
    relevantDocs: DocumentSummary[],
    query: ResearchQuery
  ): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: "o3-mini",
      reasoning_effort: "high",
      messages: [
        {
          role: "system",
          content: `You are a research expert writing a section of a comprehensive research report.
          Use the provided document summaries to write a detailed, well-structured section.
          Include inline citations in APA style using the source URL's domain name in parentheses.
          For example: "According to recent studies (example.com), AI has significant impact..."
          Focus on accuracy, clarity, and logical flow.`,
        },
        {
          role: "user",
          content: `Section: ${section}
          Research Query: ${JSON.stringify(query, null, 2)}
          Relevant Documents: ${JSON.stringify(relevantDocs, null, 2)}
          
          Write a comprehensive section with inline citations. Use the source's domain name in parentheses for citations.`,
        },
      ],
    });

    usageTracker.trackUsage({
      model: "o3-mini",
      tokens: {
        prompt_tokens: response.usage?.prompt_tokens || 0,
        completion_tokens: response.usage?.completion_tokens || 0,
        total_tokens: response.usage?.total_tokens || 0,
      },
      module: "brain",
      operation: "generateSectionContent",
      timestamp: new Date(),
    });

    return response.choices[0].message.content ?? "";
  }

  private async generateIntroduction(
    query: ResearchQuery,
    outline: ResearchOutline
  ): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: "o3-mini",
      reasoning_effort: "high",
      messages: [
        {
          role: "system",
          content:
            "You are a research expert writing an introduction for a comprehensive research report.",
        },
        {
          role: "user",
          content: `Research Query: ${JSON.stringify(query, null, 2)}
          Report Outline: ${JSON.stringify(outline, null, 2)}
          
          Write an engaging introduction that sets up the research report.`,
        },
      ],
    });

    usageTracker.trackUsage({
      model: "o3-mini",
      tokens: {
        prompt_tokens: response.usage?.prompt_tokens || 0,
        completion_tokens: response.usage?.completion_tokens || 0,
        total_tokens: response.usage?.total_tokens || 0,
      },
      module: "brain",
      operation: "generateIntroduction",
      timestamp: new Date(),
    });

    return response.choices[0].message.content ?? "";
  }

  private async generateConclusion(
    query: ResearchQuery,
    sections: Array<{ heading: string; content: string }>
  ): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: "o3-mini",
      reasoning_effort: "high",
      messages: [
        {
          role: "system",
          content:
            "You are a research expert writing a conclusion for a comprehensive research report.",
        },
        {
          role: "user",
          content: `Research Query: ${JSON.stringify(query, null, 2)}
          Report Sections: ${JSON.stringify(sections, null, 2)}
          
          Write a conclusion that synthesizes the key findings and insights.`,
        },
      ],
    });

    usageTracker.trackUsage({
      model: "o3-mini",
      tokens: {
        prompt_tokens: response.usage?.prompt_tokens || 0,
        completion_tokens: response.usage?.completion_tokens || 0,
        total_tokens: response.usage?.total_tokens || 0,
      },
      module: "brain",
      operation: "generateConclusion",
      timestamp: new Date(),
    });

    return response.choices[0].message.content ?? "";
  }

  async generateReport(
    query: ResearchQuery,
    summaries: DocumentSummary[]
  ): Promise<ResearchReport> {
    // Generate outline
    const outline = await this.generateOutline(query, summaries);

    // Generate introduction
    const introduction = await this.generateIntroduction(query, outline);

    // Generate each section
    const sections = await Promise.all(
      outline.sections.map(async (section) => {
        const relevantDocs = summaries.filter((s) =>
          section.relevantDocuments.includes(s.url)
        );
        const content = await this.generateSectionContent(
          section.heading,
          relevantDocs,
          query
        );
        return {
          heading: section.heading,
          content,
          sources: section.relevantDocuments,
        };
      })
    );

    // Generate conclusion
    const conclusion = await this.generateConclusion(query, sections);

    // Compile final report
    return {
      query,
      outline,
      content: {
        overview: "", // Will be generated in finalize step
        introduction,
        sections,
        conclusion,
        references: "", // Will be generated in finalize step
      },
      metadata: {
        generatedAt: new Date(),
        sourcesUsed: summaries,
        searchQueries: [], // This would be populated from the search module
      },
    };
  }
}
