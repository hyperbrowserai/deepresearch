import { OpenAI } from "openai";
import {
  ResearchQuery,
  ResearchQuerySchema,
  ClarifyingQuestionsSchema,
} from "../types";
import { zodResponseFormat } from "openai/helpers/zod";
import { askQuestion, usageTracker } from "../utils";

export class ClarificationModule {
  constructor(private openai: OpenAI) {}

  async getClarifyingQuestions(topic: string): Promise<string> {
    const response = await this.openai.beta.chat.completions.parse({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a research assistant helping to clarify research topics. Generate 2-3 key questions that would help refine and focus the research direction. Questions should be concise and specific.",
        },
        {
          role: "user",
          content: `Initial user query: ${topic}\nGenerate clarifying questions for the user so we can better understand their research needs. Make sure to note your chain of thought as you are generating the questions.`,
        },
      ],
      response_format: zodResponseFormat(
        ClarifyingQuestionsSchema,
        "ClarifyingQuestions"
      ),
    });

    usageTracker.trackUsage({
      model: "gpt-4o",
      tokens: {
        prompt_tokens: response.usage?.prompt_tokens || 0,
        completion_tokens: response.usage?.completion_tokens || 0,
        total_tokens: response.usage?.total_tokens || 0,
      },
      module: "clarification",
      operation: "getClarifyingQuestions",
      timestamp: new Date(),
    });

    const questions = response.choices[0].message.parsed?.questions;
    if (!questions) {
      throw new Error("No questions generated");
    }

    const prompt = `
    Got it. To help me better understand your research needs, could you please answer these clarifying questions:
    ${questions.map((q) => ` - ${q}`).join("\n")}
    `.trim();

    return prompt;
  }

  async processAnswer(
    topic: string,
    question: string,
    answer: string
  ): Promise<ResearchQuery> {
    const response = await this.openai.beta.chat.completions.parse({
      model: "o3-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a research assistant helping to structure research queries. Based on the user's answer, extract relevant preferences and research parameters.",
        },
        {
          role: "user",
          content: `Topic: ${topic}\nQuestion: ${question}\nAnswer: ${answer}\n\nExtract research parameters in JSON format matching the ResearchQuery type.`,
        },
      ],
      response_format: zodResponseFormat(ResearchQuerySchema, "ResearchQuery"),
    });

    usageTracker.trackUsage({
      model: "o3-mini",
      tokens: {
        prompt_tokens: response.usage?.prompt_tokens || 0,
        completion_tokens: response.usage?.completion_tokens || 0,
        total_tokens: response.usage?.total_tokens || 0,
      },
      module: "clarification",
      operation: "processAnswer",
      timestamp: new Date(),
    });

    const parsed = response.choices[0].message.parsed;
    if (!parsed) {
      throw new Error("Failed to process answers");
    }
    return parsed;
  }

  // async clarifyQuery(initialTopic: string): Promise<ResearchQuery> {
  //   let query: Partial<ResearchQuery> = {
  //     topic: initialTopic,
  //   };

  //   // Get clarifying questions
  //   const questions = await this.getClarifyingQuestions(initialTopic);

  //   const prompt = `
  //   Got it. To help me better understand your research needs, could you please answer these clarifying questions:
  //   ${questions.map((q) => ` - ${q}`).join("\n")}
  //   `.trim();
  //   const answer = await askQuestion(prompt);

  //   const refinements = await this.processAnswer(initialTopic, [answer]);
  //   query = { ...query, ...refinements };

  //   // Ensure the query matches our schema
  //   return ResearchQuerySchema.parse(query);
  // }
}
