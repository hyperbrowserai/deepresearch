"use client";
import { Thread } from "@/components/assistant-ui/thread";
import { AssistantRuntimeProvider, useLocalRuntime } from "@assistant-ui/react";
import { ThreadList } from "@/components/assistant-ui/thread-list";
import { useResearchChat } from "@/hooks/useResearchChat";

export default function Home() {
  const chatModelAdapter = useResearchChat();
  const runtime = useLocalRuntime(chatModelAdapter);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <main className="h-dvh grid grid-cols-[200px_1fr] gap-x-2 px-4 py-4">
        <ThreadList />
        <Thread />
      </main>
    </AssistantRuntimeProvider>
  );
}
