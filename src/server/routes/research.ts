import express, { Router, RequestHandler } from "express";
import { ResearchOrchestrator } from "../../orchestrator";
import { openai, hbClient } from "../../client";
import { ResearchQuerySchema } from "../../types";
import { z } from "zod";

const router: Router = express.Router();

// Initialize the orchestrator
const orchestrator = new ResearchOrchestrator(openai, hbClient);

// Step 1: Get clarifying questions for a topic
const getClarifyingQuestions: RequestHandler = async (req, res) => {
  try {
    const { topic } = req.body;
    if (!topic) {
      res.status(400).json({
        success: false,
        error: "Topic is required",
      });
      return;
    }

    const questions = await orchestrator.getClarifyingQuestions(topic);

    res.json({
      success: true,
      data: {
        topic,
        questions,
      },
    });
  } catch (error: unknown) {
    console.error("Error getting questions:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get clarifying questions",
      message:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Internal server error",
    });
  }
};

// Step 2: Process answer and conduct research
const processAnswerAndResearch: RequestHandler = async (req, res) => {
  try {
    const { topic, question, answer } = req.body;

    if (!topic || !question || !answer) {
      res.status(400).json({
        success: false,
        error: "Topic, question, and answer are all required",
      });
      return;
    }

    // Process answer to get refined query
    const refinedQuery = await orchestrator.processAnswer(
      topic,
      question,
      answer
    );

    // Conduct research with refined query
    const { markdown, report } = await orchestrator.conductResearch(
      refinedQuery
    );

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
};

router.post("/questions", getClarifyingQuestions);
router.post("/process", processAnswerAndResearch);

export default router;
