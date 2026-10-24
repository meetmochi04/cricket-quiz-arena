import {
  addQuestion,
  addQuestions,
} from "./firestore";

export interface ParsedQuestion {
  question: string;
  options: string[];
  answer: string;
  bowlingType: string;
}

// ======================================================
// WORD TEXT PARSER
// ======================================================

export const parseWordQuestions = (
 text: string
): ParsedQuestion[] => {
  const questions: ParsedQuestion[] = [];

  const blocks = text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length < 6) {
      continue;
    }

    let question = "";
    const options: string[] = [];

    let answer = "";
    let bowlingType = "Normal";

    for (const line of lines) {
      const lower = line.toLowerCase();

      if (
        lower.startsWith("question:") ||
        lower.startsWith("q:")
      ) {
        question = line
          .split(":")
          .slice(1)
          .join(":")
          .trim();

        continue;
      }

      if (
        /^[A-D][.)]\s*/i.test(line)
      ) {
        options.push(
          line.replace(
            /^[A-D][.)]\s*/i,
            ""
          ).trim()
        );

        continue;
      }

      if (
        lower.startsWith("answer:") ||
        lower.startsWith("correct answer:")
      ) {
        answer = line
          .split(":")
          .slice(1)
          .join(":")
          .trim();

        continue;
      }

      if (
        lower.startsWith("bowling type:") ||
        lower.startsWith("type:")
      ) {
        bowlingType = line
          .split(":")
          .slice(1)
          .join(":")
          .trim();

        continue;
      }

      if (!question) {
        question = line;
      }
    }

    if (
      question &&
      options.length >= 2 &&
      answer
    ) {
      questions.push({
        question,
        options,
        answer,
        bowlingType,
      });
    }
  }

  return questions;
};

// ======================================================
// SAVE WORD QUESTIONS
// ======================================================

export const saveWordQuestions = async (
  matchId: string,
  innings: 1 | 2,
  questions: ParsedQuestion[]
) => {
  await addQuestions(
    questions.map((item) => ({
      matchId,

      innings,

      question: item.question,

      options: item.options,

      answer: item.answer,

      bowlingType: item.bowlingType,

      source: "word" as const,
    }))
  );
};

// ======================================================
// SAVE MANUAL QUESTION
// ======================================================

export const saveManualQuestion = async (
  matchId: string,
  innings: 1 | 2,
  question: string,
  options: string[],
  answer: string,
  bowlingType: string
) => {
  return addQuestion({
    matchId,

    innings,

    question,

    options,

    answer,

    bowlingType,

    source: "manual",
  });
};