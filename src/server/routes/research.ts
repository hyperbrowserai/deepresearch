import express from "express";
import { ResearchOrchestrator } from "../../orchestrator";
import { openai, hbClient } from "../../client";
import { ResearchQuerySchema } from "../../types";
import { z } from "zod";

const router = express.Router();

// Initialize the orchestrator
const orchestrator = new ResearchOrchestrator(openai, hbClient);

router.post("/", async (req: express.Request, res: express.Response) => {
  try {
    // Validate input using our existing schema
    const validatedInput = ResearchQuerySchema.parse(req.body);

    // Conduct research
    const { markdown, report } = await orchestrator.conductResearch(
      validatedInput.topic
    );

    // Return both markdown and structured report
    res.json({
      success: true,
      data: {
        markdown,
        report: {
          topic: report.query.topic,
          angle: report.query.angle,
          generatedAt: report.metadata.generatedAt,
          sections: report.content.sections.map((s) => ({
            heading: s.heading,
            content: s.content,
          })),
        },
      },
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: "Invalid input",
        details: error.errors,
      });
    } else {
      console.error("Research error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to conduct research",
        message:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.message
            : "Internal server error",
      });
    }
  }
});

export default router;
