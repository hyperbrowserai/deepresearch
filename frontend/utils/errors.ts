export class ResearchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResearchError";
  }
}

export const handleResearchError = (error: unknown): string => {
  console.error(error);
  if (error instanceof ResearchError) {
    return error.message;
  }
  return "Sorry, I could not process your request.";
};
