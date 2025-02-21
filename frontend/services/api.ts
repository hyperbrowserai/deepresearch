const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";

interface ResearchResponse {
  data: {
    questions?: string;
    markdown?: string;
  };
}

export const researchApi = {
  async getClarifyingQuestions(
    topic: string,
    signal?: AbortSignal
  ): Promise<string> {
    const response = await fetch(`${API_BASE}/api/research/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic }),
      signal,
    });

    if (!response.ok) {
      throw new Error("Failed to get questions");
    }

    const data: ResearchResponse = await response.json();
    return data.data.questions || "";
  },

  async processResearch(params: {
    topic: string;
    question: string;
    answer: string;
    signal?: AbortSignal;
  }): Promise<string> {
    const response = await fetch(`${API_BASE}/api/research/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      keepalive: true,
      signal: params.signal,
    });

    if (!response.ok) {
      throw new Error("Failed to process research");
    }

    const data: ResearchResponse = await response.json();
    return data.data.markdown || "";
  },
};
