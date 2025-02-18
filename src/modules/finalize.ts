import { OpenAI } from "openai";
import { ResearchReport, DocumentSummary } from "../types";
import { usageTracker } from "../utils";

export class FinalizeModule {
  constructor(private openai: OpenAI) {}

  private async generateOverview(report: ResearchReport): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: "o3-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a research expert crafting a clear, engaging overview of a research report. Create a brief overview that introduces the topic broadly and sets up the detailed introduction that follows.",
        },
        {
          role: "user",
          content: `Topic: ${report.query.topic}
          Angle: ${report.query.angle || "General overview"}
          Introduction: ${report.content.introduction}
          
          Create a concise overview (2-3 sentences) that introduces the topic broadly and leads into the introduction.`,
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
      module: "finalize",
      operation: "generateOverview",
      timestamp: new Date(),
    });

    return response.choices[0].message.content ?? "";
  }

  private async generateTransitions(
    sections: ResearchReport["content"]["sections"]
  ): Promise<string[]> {
    const transitions = await Promise.all(
      sections.map(async (section, index) => {
        if (index === 0) return ""; // No transition needed for first section

        const prevSection = sections[index - 1];
        const response = await this.openai.chat.completions.create({
          model: "o3-mini",
          messages: [
            {
              role: "system",
              content:
                "You are a research expert creating smooth transitions between sections of a research report. Create a brief transition sentence that connects the previous section to the next one.",
            },
            {
              role: "user",
              content: `Previous Section: ${prevSection.heading}
              Previous Content (last paragraph): ${
                prevSection.content.split("\n").slice(-1)[0]
              }
              
              Next Section: ${section.heading}
              Next Content (first paragraph): ${section.content.split("\n")[0]}
              
              Create a single sentence that smoothly transitions between these sections.`,
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
          module: "finalize",
          operation: "generateTransition",
          timestamp: new Date(),
        });

        return response.choices[0].message.content ?? "";
      })
    );

    return transitions;
  }

  private formatReferences(
    sources: DocumentSummary[],
    sections: ResearchReport["content"]["sections"]
  ): string {
    // Collect all unique source URLs that were actually used in the sections
    const usedSourceUrls = new Set<string>();
    sections.forEach((section) => {
      section.sources.forEach((sourceUrl) => usedSourceUrls.add(sourceUrl));
    });

    // Filter sources to only include those that were actually used
    const usedSources = sources.filter((source) =>
      usedSourceUrls.has(source.url)
    );

    if (usedSources.length === 0) {
      return ""; // Don't include references section if no sources were used
    }

    // Sort sources by type and then by title
    const sortedSources = [...usedSources].sort((a, b) => {
      if (a.sourceType !== b.sourceType) {
        return a.sourceType.localeCompare(b.sourceType);
      }
      return a.title.localeCompare(b.title);
    });

    const referencesByType: Record<string, string[]> = {};

    sortedSources.forEach((source) => {
      if (!referencesByType[source.sourceType]) {
        referencesByType[source.sourceType] = [];
      }

      // Format the reference in a more academic style
      let reference = `${source.title}`;
      if (source.sourceType === "academic") {
        reference += `. Retrieved from ${source.url}`;
      } else {
        reference += `. ${new URL(source.url).hostname}`;
      }

      referencesByType[source.sourceType].push(reference);
    });

    let referencesText = "## References\n\n";

    Object.entries(referencesByType)
      .filter(([_, refs]) => refs.length > 0)
      .forEach(([type, refs]) => {
        const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
        referencesText += `### ${typeLabel} Sources\n\n`;
        refs.forEach((ref, index) => {
          referencesText += `${index + 1}. ${ref}\n`;
        });
        referencesText += "\n";
      });

    return referencesText;
  }

  private async polishReport(report: ResearchReport): Promise<{
    overview: string;
    introduction: string;
    sections: Array<{ heading: string; content: string }>;
    conclusion: string;
  }> {
    const response = await this.openai.chat.completions.create({
      model: "o3-mini",
      messages: [
        {
          role: "system",
          content: `You are a research editor polishing a final report. Your task is to:
          1. Ensure the overview and introduction are distinct and complementary:
             - Overview should be a high-level executive summary (2-3 sentences)
             - Introduction should set up the detailed discussion without repeating the overview
          2. Review section transitions and enhance if needed
          3. Ensure the conclusion synthesizes key findings without introducing new information
          4. Remove any redundant content between sections
          
          Return the polished content maintaining the same factual information but with improved flow and clarity.`,
        },
        {
          role: "user",
          content: `Please polish this research report:

Overview:
${report.content.overview}

Introduction:
${report.content.introduction}

Sections:
${report.content.sections.map((s) => `${s.heading}\n${s.content}`).join("\n\n")}

Conclusion:
${report.content.conclusion}

Review and return the polished version, maintaining the same structure but improving clarity and flow.`,
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
      module: "finalize",
      operation: "polishReport",
      timestamp: new Date(),
    });

    const polishedContent = response.choices[0].message.content ?? "";

    // Parse the polished content
    const sections = polishedContent.split("\n\n");
    const overview =
      sections
        .find((s) => s.startsWith("Overview:"))
        ?.replace("Overview:", "")
        .trim() ?? report.content.overview;
    const introduction =
      sections
        .find((s) => s.startsWith("Introduction:"))
        ?.replace("Introduction:", "")
        .trim() ?? report.content.introduction;
    const conclusion =
      sections
        .find((s) => s.startsWith("Conclusion:"))
        ?.replace("Conclusion:", "")
        .trim() ?? report.content.conclusion;

    // Extract the main sections
    const mainSections = report.content.sections.map((section) => {
      const sectionContent =
        sections
          .find((s) => s.includes(section.heading))
          ?.split("\n")
          .slice(1)
          .join("\n")
          .trim() ?? section.content;
      return {
        heading: section.heading,
        content: sectionContent,
      };
    });

    return {
      overview,
      introduction,
      sections: mainSections,
      conclusion,
    };
  }

  private generateMarkdown(
    report: ResearchReport,
    polished: {
      overview: string;
      introduction: string;
      sections: Array<{ heading: string; content: string }>;
      conclusion: string;
    },
    references: string
  ): string {
    const timestamp = report.metadata.generatedAt.toISOString().split("T")[0];

    return `# ${report.query.topic}
${report.query.angle ? `\n*Research Angle: ${report.query.angle}*\n` : ""}

## Overview

${polished.overview}

## Introduction

${polished.introduction}

${polished.sections
  .map((section) => `## ${section.heading}\n\n${section.content}`)
  .join("\n\n")}

## Conclusion

${polished.conclusion}

${references}

---

*Report generated on ${report.metadata.generatedAt.toLocaleString()}*`;
  }

  async finalizeReport(
    report: ResearchReport
  ): Promise<{ markdown: string; report: ResearchReport }> {
    // Format initial markdown with all content
    const initialMarkdown = `# ${report.query.topic}
${report.query.angle ? `\n*Research Angle: ${report.query.angle}*\n` : ""}

## Overview

${report.content.overview}

## Introduction

${report.content.introduction}

${report.content.sections
  .map((section) => `## ${section.heading}\n\n${section.content}`)
  .join("\n\n")}

## Conclusion

${report.content.conclusion}

${this.formatReferences(report.metadata.sourcesUsed, report.content.sections)}

---

*Report generated on ${report.metadata.generatedAt.toLocaleString()}*`;

    // Polish the markdown
    const response = await this.openai.chat.completions.create({
      model: "o3-mini",
      messages: [
        {
          role: "system",
          content: `You are a research editor polishing a final report in markdown format. Your task is to:
          1. Ensure the overview and introduction are distinct and complementary
          2. Review section transitions and enhance if needed
          3. Ensure the conclusion synthesizes key findings without introducing new information
          4. Remove any redundant content between sections
          5. Maintain all markdown formatting
          
          Return the complete polished markdown, preserving all sections and formatting.`,
        },
        {
          role: "user",
          content: initialMarkdown,
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
      module: "finalize",
      operation: "polishMarkdown",
      timestamp: new Date(),
    });

    const finalMarkdown =
      response.choices[0].message.content ?? initialMarkdown;

    // Return both the markdown and an updated report object
    return {
      markdown: finalMarkdown,
      report: {
        ...report,
        content: {
          ...report.content,
          sections: report.content.sections.map((section) => ({
            ...section,
            sources: [],
          })),
        },
      },
    };
  }
}
