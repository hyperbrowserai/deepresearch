import {
  ChatModelAdapter,
  TextContentPart,
  type ThreadAssistantContentPart,
} from "@assistant-ui/react";
import { useState, useMemo } from "react";
import { researchApi } from "@/services/api";
import { handleResearchError } from "@/utils/errors";

interface ResearchState {
  clarifyingQuestion: string;
  generatedResearch: boolean;
  topic: string;
}

const createTextContent = (text: string) => ({
  content: [{ type: "text", text } as ThreadAssistantContentPart],
});

export function useResearchChat() {
  const [state, setState] = useState<ResearchState>({
    clarifyingQuestion: "",
    generatedResearch: false,
    topic: "",
  });

  const chatModelAdapter = useMemo(
    (): ChatModelAdapter => ({
      async run({ messages, abortSignal }) {
        try {
          const lastMessageText = (
            messages[messages.length - 1].content[0] as TextContentPart
          ).text;
          const { clarifyingQuestion, generatedResearch, topic } = state;

          if (!clarifyingQuestion && !generatedResearch) {
            const message = await researchApi.getClarifyingQuestions(
              lastMessageText,
              abortSignal
            );
            setState((prev) => ({
              ...prev,
              clarifyingQuestion: message,
              topic: lastMessageText,
            }));
            return createTextContent(message);
          }

          const message = await researchApi.processResearch({
            topic,
            question: clarifyingQuestion,
            answer: lastMessageText,
            signal: abortSignal,
          });

          if (!generatedResearch) {
            setState((prev) => ({ ...prev, generatedResearch: true }));
          }

          return createTextContent(message);
        } catch (error) {
          return createTextContent(handleResearchError(error));
        }
      },
    }),
    [state]
  );

  return chatModelAdapter;
}
