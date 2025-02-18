import { createInterface } from "readline";

// Ask each clarifying question and get user input
const readline = createInterface({
  input: process.stdin,
  output: process.stdout,
});

export const askQuestion = (question: string): Promise<string> => {
  return new Promise((resolve) => {
    readline.question(`${question}\n> `, (answer: string) => {
      resolve(answer);
    });
  });
};
