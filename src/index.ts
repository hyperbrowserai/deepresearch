import { config } from "dotenv";
import { openai, hbClient } from "./client";
import { ResearchOrchestrator } from "./orchestrator";
import { closeReadline, askQuestion } from "./utils";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

config();

async function main() {
  try {
    const orchestrator = new ResearchOrchestrator(openai, hbClient);

    // Get initial topic
    const topic =
      process.argv[2] ||
      "The impact of artificial intelligence on healthcare in 2024";
    console.log(`Starting deep research on topic: ${topic}`);

    // Get clarifying questions
    const questions = await orchestrator.getClarifyingQuestions(topic);

    const prompt = `
    Got it. To help me better understand your research needs, could you please answer these clarifying questions:
    ${questions.map((q) => ` - ${q}`).join("\n")}
    `.trim();

    const answer = await askQuestion(prompt);

    // Process answers to get refined query
    const refinedQuery = await orchestrator.processAnswer(
      topic,
      prompt,
      answer
    );

    // Conduct research with refined query
    const { markdown, report } = await orchestrator.conductResearch(
      refinedQuery
    );

    // Create reports directory if it doesn't exist
    const reportsDir = join(process.cwd(), "reports");
    if (!existsSync(reportsDir)) {
      mkdirSync(reportsDir);
    }

    // Save markdown to file
    const timestamp = report.metadata.generatedAt.toISOString().split("T")[0];
    const filename = `${report.query.topic
      .slice(0, 50)
      .replace(/[^a-zA-Z0-9]/g, "-")}-${timestamp}.md`;

    writeFileSync(join(reportsDir, filename), markdown);
    console.log(`\nReport saved to: reports/${filename}`);

    // Output the report to console (simplified version)
    console.log("\n=== Research Report ===\n");
    console.log(markdown);
  } catch (error) {
    console.error("Error in research process:", error);
    process.exit(1);
  } finally {
    // Close the readline interface
    closeReadline();
  }
}

if (require.main === module) {
  main();
}
