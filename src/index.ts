import { config } from "dotenv";
import { openai, hbClient } from "./client";
import { ResearchOrchestrator } from "./orchestrator";

config();

async function main() {
  try {
    const orchestrator = new ResearchOrchestrator(openai, hbClient);

    // Example usage
    const topic =
      process.argv[2] ||
      "The impact of artificial intelligence on healthcare in 2024";
    console.log(`Starting deep research on topic: ${topic}`);

    const report = await orchestrator.conductResearch(topic);

    // Output the report
    console.log("\n=== Research Report ===\n");
    console.log("Topic:", report.query.topic);
    console.log("Angle:", report.query.angle || "General overview");
    console.log("\nIntroduction:");
    console.log(report.content.introduction);

    console.log("\nMain Sections:");
    for (const section of report.content.sections) {
      console.log(`\n## ${section.heading}`);
      console.log(section.content);
      console.log("\nSources:", section.sources.join(", "));
    }

    console.log("\nConclusion:");
    console.log(report.content.conclusion);

    console.log("\nMetadata:");
    console.log("Generated at:", report.metadata.generatedAt);
    console.log("Number of sources used:", report.metadata.sourcesUsed.length);
  } catch (error) {
    console.error("Error in research process:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
