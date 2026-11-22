
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import path from "node:path";
import { fileURLToPath } from "node:url";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, "../dist");

dotenv.config({ path: new URL("./.env", import.meta.url) });

console.log(
  "Gemini API key loaded:",
  Boolean(process.env.GEMINI_API_KEY)
);

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is missing in server/.env");
}

const app = express();
const PORT = process.env.PORT || 3001;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

app.use(
  cors({
    origin:
      process.env.CLIENT_ORIGIN || "http://localhost:5173",
  })
);

app.use(express.json({ limit: "20kb" }));

// ========================================
// BACKEND HEALTH CHECK
// ========================================
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// ========================================
// GENERATE MCQ QUESTIONS USING GEMINI
// ========================================
app.post("/api/generate-questions", async (req, res) => {
  try {
    const topic =
      typeof req.body.topic === "string"
        ? req.body.topic.trim()
        : "";

    const count = Number(req.body.count);

    if (topic.length < 2 || topic.length > 200) {
      return res.status(400).json({
        error: "Topic must be between 2 and 200 characters.",
      });
    }

    if (!Number.isInteger(count) || count < 1 || count > 12) {
      return res.status(400).json({
        error: "Question count must be between 1 and 12.",
      });
    }

    const prompt = `
Generate exactly ${count} multiple-choice quiz questions
about the following topic: ${topic}

Return only JSON in this format:
{
  "questions": [
    {
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option A",
      "explanation": "Short explanation"
    }
  ]
}

Rules:
- Each question must have exactly 4 distinct options.
- correctAnswer must exactly match one option.
- Questions must be clear and factually accurate.
- Do not repeat questions.
- Do not include Markdown outside the JSON.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.4,
      },
    });

    const result = JSON.parse(response.text || "{}");
    const questions = result.questions;

    const valid =
      Array.isArray(questions) &&
      questions.length === count &&
      questions.every(
        (q) =>
          typeof q.question === "string" &&
          Array.isArray(q.options) &&
          q.options.length === 4 &&
          new Set(q.options).size === 4 &&
          typeof q.correctAnswer === "string" &&
          q.options.includes(q.correctAnswer) &&
          typeof q.explanation === "string"
      );

    if (!valid) {
      return res.status(502).json({
        error: "Gemini returned invalid questions. Please retry.",
      });
    }

    return res.json({ questions });
  } catch (error) {
    console.error("Gemini request failed:", error.message);

    return res.status(500).json({
      error:
        "Question generation failed. Check the API key, model and quota.",
    });
  }
});

// ========================================
// GENERATE AI CRICKET TEXT COMMENTARY
// ========================================
app.post("/api/generate-commentary", async (req, res) => {
  try {
    const {
      battingTeam,
      bowlingTeam,
      innings,
      over,
      ball,
      deliveryType,
      result,
      runs,
      wickets,
      target,
    } = req.body;

    const validResults = ["six", "four", "two", "wicket"];

    const validDeliveries = [
      "yorker",
      "bouncer",
      "fulltoss",
      "spin",
      "inswing",
      "outswing",
    ];

    if (
      typeof battingTeam !== "string" ||
      !battingTeam.trim() ||
      typeof bowlingTeam !== "string" ||
      !bowlingTeam.trim() ||
      !["first", "second"].includes(innings) ||
      !Number.isInteger(over) ||
      over < 1 ||
      !Number.isInteger(ball) ||
      ball < 1 ||
      ball > 6 ||
      !validDeliveries.includes(deliveryType) ||
      !validResults.includes(result) ||
      !Number.isInteger(runs) ||
      runs < 0 ||
      !Number.isInteger(wickets) ||
      wickets < 0 ||
      (target != null &&
        (!Number.isInteger(target) || target < 1))
    ) {
      return res.status(400).json({
        error: "Invalid commentary details.",
      });
    }

    const prompt = `
You are an energetic live cricket commentator
for a cricket quiz game called Cricket Quiz Arena.

Write one exciting ball-by-ball commentary line in English.

Match details:
- Innings: ${innings === "first" ? "First" : "Second"}
- Batting team: ${battingTeam}
- Bowling team: ${bowlingTeam}
- Over: ${over}
- Ball: ${ball}
- Delivery: ${deliveryType}
- Result: ${result}
- Current score: ${runs}/${wickets}
- Target: ${target ?? "Not applicable"}

Rules:
- Write only 1 or 2 short sentences.
- Sound natural and exciting, like a live cricket commentator.
- For a six, describe a powerful shot over the boundary.
- For a four, describe a shot reaching the boundary.
- For two runs, describe quick running between the wickets.
- For a wicket, describe the batter getting out.
- Do not invent player names or events.
- Do not change or contradict the provided score.
- Return only JSON in this format:
{"commentary":"Your commentary here"}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.8,
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    const commentary = parsed.commentary;

    if (
      typeof commentary !== "string" ||
      !commentary.trim()
    ) {
      return res.status(502).json({
        error: "Gemini returned invalid commentary. Please retry.",
      });
    }

    return res.json({
      commentary: commentary.trim(),
    });
  } catch (error) {
    console.error(
      "Commentary generation failed:",
      error.message
    );

    return res.status(500).json({
      error:
        "Commentary generation failed. Check the API key, model and quota.",
    });
  }
});

// ========================================
// GENERATE AI CRICKET COMMENTARY AUDIO
// ========================================
app.post("/api/generate-commentary-audio", async (req, res) => {
  try {
    const { commentary } = req.body;

    if (
      typeof commentary !== "string" ||
      !commentary.trim()
    ) {
      return res.status(400).json({
        error: "Commentary text is required.",
      });
    }

    if (commentary.length > 1000) {
      return res.status(400).json({
        error: "Commentary is too long.",
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash-tts",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: commentary.trim(),
              speech_metadata: {
                style:
                  "Deep, confident male cricket commentator. " +
                  "Energetic IPL-style delivery, dramatic emphasis, " +
                  "Indian English accent, exciting and natural pacing. " +
                  "Use extra excitement for sixes and wickets. " +
                  "Read the supplied commentary exactly as written.",
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: "Charon",
            },
          },
        },
      },
    });

    const audioPart =
      response.candidates?.[0]?.content?.parts?.find(
        (part) => part.inlineData?.data
      );

    if (!audioPart?.inlineData?.data) {
      console.error("Gemini TTS returned no audio.");

      return res.status(502).json({
        error: "Gemini did not return audio.",
      });
    }

    return res.json({
      audio: audioPart.inlineData.data,
      mimeType:
        audioPart.inlineData.mimeType || "audio/wav",
    });
  } catch (error) {
    console.error(
      "Commentary TTS error:",
      error.message
    );

    return res.status(500).json({
      error:
        "Failed to generate commentary audio. Check the TTS model and API access.",
    });
  }
});


// Serve the React frontend
app.use(express.static(distPath));

// Handle frontend routes (React SPA)
app.use((req, res, next) => {
  if (req.method !== "GET" || req.path.startsWith("/api/")) {
    return next();
  }

  res.sendFile(path.join(distPath, "index.html"));
});
// ========================================
// START SERVER
// ========================================
app.listen(PORT, () => {
  console.log(`AI backend running on port ${PORT}`);
});
