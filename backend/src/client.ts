import { config } from "dotenv";
import OpenAI from "openai";
import { Hyperbrowser } from "@hyperbrowser/sdk";

config();

export const hbClient = new Hyperbrowser({
  apiKey: process.env.HYPERBROWSER_API_KEY!,
});

export const openai = new OpenAI();
