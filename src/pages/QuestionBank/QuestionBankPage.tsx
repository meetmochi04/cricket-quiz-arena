import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import mammoth from "mammoth";

import {
  FaArrowLeft,
  FaArrowRight,
  FaCheckCircle,
  FaCloudUploadAlt,
  FaExclamationTriangle,
  FaFileWord,
  FaRobot,
  FaTrash,
} from "react-icons/fa";

import "./QuestionBank.css";

import {
  addQuestions,
} from "../../firebase/firestore";

interface Question {
  id: string;
  question: string;
  options: string[];
  answer: string;
  bowlingType?: string;
}

interface MatchSetup {
  id?: string;
  teamAId?: string;
  teamAName?: string;
  teamBId?: string;
  teamBName?: string;
  overs: number;
  playersPerTeam?: number;
  questionCount?: number;
  totalQuestions?: number;
  answerTime?: number;
}

export default function QuestionBankPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isSecondInnings = searchParams.get("innings") === "second";

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const [matchSetup, setMatchSetup] =
    useState<MatchSetup | null>(null);

  const [questions, setQuestions] =
    useState<Question[]>([]);

  const [fileName, setFileName] =
    useState("");

  const [isImporting, setIsImporting] =
    useState(false);

  const [isSaving, setIsSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  // AI question generator
  const [aiTopic, setAiTopic] = useState("");
  const [aiCount, setAiCount] = useState(12);
  const [generatedQuestions, setGeneratedQuestions] =
    useState<Question[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingAI, setIsSavingAI] = useState(false);
  const [showAIPreview, setShowAIPreview] = useState(false);

  /* =====================================================
     LOAD MATCH SETUP
  ===================================================== */

  useEffect(() => {
    /*
      SECOND INNINGS:
      Always start with a completely fresh question-bank session.
      This prevents first-innings questions from being reused.
    */
    if (isSecondInnings) {
      sessionStorage.removeItem("questionBank");
      sessionStorage.removeItem("questionBankInnings");
      sessionStorage.setItem("currentInnings", "2");

      setQuestions([]);
      setFileName("");
      setError("");
      setSuccess("");
    }

    const savedSetup =
      sessionStorage.getItem("matchSetup");

    const matchId =
      sessionStorage.getItem("matchId");

    /*
      Match setup and matchId both required.
    */

    if (!savedSetup || !matchId) {
      navigate("/match-setup");
      return;
    }

    try {
      const parsedSetup =
        JSON.parse(savedSetup);

      setMatchSetup(parsedSetup);
    } catch {
      setError(
        "Unable to read match setup."
      );
    }
  }, [navigate, isSecondInnings]);

  /* =====================================================
     REQUIRED QUESTIONS

     1 OVER = 6 QUESTIONS
  ===================================================== */

  const requiredQuestions = useMemo(() => {
    if (!matchSetup) {
      return 12;
    }

    /*
      New database field:
      questionCount
    */

    if (
      matchSetup.questionCount &&
      matchSetup.questionCount > 0
    ) {
      return matchSetup.questionCount;
    }

    /*
      Backward compatibility
    */

    if (
      matchSetup.totalQuestions &&
      matchSetup.totalQuestions > 0
    ) {
      return matchSetup.totalQuestions;
    }

    const overs =
      Number(matchSetup.overs) || 2;

    return overs * 6;
  }, [matchSetup]);

  /* =====================================================
     PROGRESS
  ===================================================== */

  const progress = useMemo(() => {
    if (requiredQuestions <= 0) {
      return 0;
    }

    return Math.min(
      100,
      Math.round(
        (questions.length /
          requiredQuestions) *
          100
      )
    );
  }, [
    questions.length,
    requiredQuestions,
  ]);

  /* =====================================================
     STATUS
  ===================================================== */

  const isReady =
    questions.length >=
    requiredQuestions;

  /* =====================================================
     OPEN FILE SELECTOR
  ===================================================== */

  const openFileSelector = () => {
    if (
      isImporting ||
      isSaving
    ) {
      return;
    }

    fileInputRef.current?.click();
  };

  /* =====================================================
     FILE CHANGE
  ===================================================== */

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    const matchId =
      sessionStorage.getItem("matchId");

    if (!matchId) {
      setError(
        "Match ID not found. Please restart the match."
      );
      return;
    }

    setError("");
    setSuccess("");
    setQuestions([]);
    setFileName(file.name);
    setIsImporting(true);

    try {
      /* -----------------------------------------------
         CHECK FILE TYPE
      ------------------------------------------------ */

      const isDocx =
        file.name
          .toLowerCase()
          .endsWith(".docx");

      if (!isDocx) {
        throw new Error(
          "Please select a Microsoft Word .docx file."
        );
      }

      /* -----------------------------------------------
         READ FILE
      ------------------------------------------------ */

      const arrayBuffer =
        await file.arrayBuffer();

      const result =
        await mammoth.extractRawText({
          arrayBuffer,
        });

      const text =
        result.value;

      if (!text.trim()) {
        throw new Error(
          "The Word file is empty."
        );
      }

      /* -----------------------------------------------
         PARSE QUESTIONS
      ------------------------------------------------ */

      const parsedQuestions =
        parseQuestions(text);

      if (
        parsedQuestions.length === 0
      ) {
        throw new Error(
          "No valid MCQs were found. Please use the required Word format."
        );
      }

      /*
        Never allow more questions than
        the match requires.
      */

      const selectedQuestions =
        parsedQuestions.slice(
          0,
          requiredQuestions
        );

      /*
        If Word file has fewer questions,
        match is not ready yet.
      */

      setQuestions(
        selectedQuestions
      );

      /* -----------------------------------------------
         SAVE QUESTIONS TO FIRESTORE
      ------------------------------------------------ */

      setIsSaving(true);

      const currentInnings = isSecondInnings
        ? 2
        : Number(
            sessionStorage.getItem(
              "currentInnings"
            )
          ) || 1;

      /*
        Save Word questions in Firestore.
        No manual questions.
      */

      await addQuestions(
        selectedQuestions.map(
          (item) => ({
            matchId,

            innings:
              currentInnings === 2
                ? 2
                : 1,

            question:
              item.question,

            options:
              item.options,

            answer:
              item.answer,

            bowlingType:
              item.bowlingType ||
              "medium",

            source:
              "word" as const,
          })
        )
      );

      /*
        Save only required questions
        for the current innings session.
      */

      sessionStorage.setItem(
        "questionBank",
        JSON.stringify(
          selectedQuestions
        )
      );

      sessionStorage.setItem(
        "questionBankInnings",
        String(
          currentInnings
        )
      );

      /* -----------------------------------------------
         SUCCESS MESSAGE
      ------------------------------------------------ */

      if (
        selectedQuestions.length >=
        requiredQuestions
      ) {
        setSuccess(
          `${selectedQuestions.length} questions imported successfully. Your match is ready.`
        );
      } else {
        const remaining =
          requiredQuestions -
          selectedQuestions.length;

        setSuccess(
          `${selectedQuestions.length} questions imported. ${remaining} more question${
            remaining === 1
              ? ""
              : "s"
          } required.`
        );
      }
    } catch (err) {
      console.error(
        "Question import error:",
        err
      );

      const message =
        err instanceof Error
          ? err.message
          : "Unable to read the Word file.";

      setError(message);

      setQuestions([]);

      setFileName("");
    } finally {
      setIsImporting(false);
      setIsSaving(false);

      /*
        Reset input so same file
        can be selected again.
      */

      if (fileInputRef.current) {
        fileInputRef.current.value =
          "";
      }
    }
  };

  /* =====================================================
     PARSE WORD DOCUMENT
  ===================================================== */

  const parseQuestions = (
    text: string
  ): Question[] => {
    const lines = text
      .split(/\r?\n/)
      .map((line) =>
        line.trim()
      )
      .filter(
        (line) =>
          line.length > 0
      );

    const parsed: Question[] = [];

    let currentQuestion = "";

    let currentOptions: string[] =
      [];

    let currentAnswer = "";

    const saveCurrentQuestion =
      () => {
        if (
          !currentQuestion ||
          currentOptions.length !==
            4 ||
          !currentAnswer
        ) {
          return;
        }

        parsed.push({
          id:
            `${Date.now()}-${parsed.length}-${Math.random()}`,

          question:
            currentQuestion,

          options:
            [...currentOptions],

          answer:
            currentAnswer,
        });

        currentQuestion = "";

        currentOptions = [];

        currentAnswer = "";
      };

    for (
      let i = 0;
      i < lines.length;
      i++
    ) {
      const line =
        lines[i];

      /* -----------------------------------------------
         FORMAT:

         Q1. Question text
         Q2. Question text
      ------------------------------------------------ */

      const numberedQuestion =
        line.match(
          /^(?:Q(?:uestion)?\s*)?(\d+)[.):\-]\s*(.+)$/i
        );

      if (numberedQuestion) {
        /*
          Save previous question
        */

        if (
          currentQuestion
        ) {
          saveCurrentQuestion();
        }

        currentQuestion =
          numberedQuestion[2].trim();

        continue;
      }

      /* -----------------------------------------------
         FORMAT:

         Question: Question text
      ------------------------------------------------ */

      if (
        /^question\s*:/i.test(
          line
        )
      ) {
        if (
          currentQuestion
        ) {
          saveCurrentQuestion();
        }

        currentQuestion =
          line
            .replace(
              /^question\s*:/i,
              ""
            )
            .trim();

        continue;
      }

      /* -----------------------------------------------
         OPTIONS:

         A. Option
         B. Option
         C. Option
         D. Option

         Also supports:

         A) Option
         A: Option
         A- Option
      ------------------------------------------------ */

      const optionMatch =
        line.match(
          /^([A-D])[\).:\-]\s*(.+)$/i
        );

      if (optionMatch) {
        if (
          currentOptions.length <
          4
        ) {
          currentOptions.push(
            optionMatch[2].trim()
          );
        }

        continue;
      }

      /* -----------------------------------------------
         ANSWER:

         Answer: B
         Correct Answer: B
         Correct: B
      ------------------------------------------------ */

      const answerMatch =
        line.match(
          /^(?:correct\s*)?(?:answer|option)\s*[:\-]\s*(.+)$/i
        );

      if (answerMatch) {
        const rawAnswer =
          answerMatch[1].trim();

        /*
          If answer is A/B/C/D,
          convert it into actual
          option text.
        */

        const answerLetter =
          rawAnswer
            .charAt(0)
            .toUpperCase();

        const answerIndex =
          "ABCD".indexOf(
            answerLetter
          );

        if (
          answerIndex >= 0 &&
          currentOptions[
            answerIndex
          ]
        ) {
          currentAnswer =
            currentOptions[
              answerIndex
            ];
        } else {
          /*
            Also allow exact
            answer text.
          */

          const exactOption =
            currentOptions.find(
              (option) =>
                option.toLowerCase() ===
                rawAnswer.toLowerCase()
            );

          if (exactOption) {
            currentAnswer =
              exactOption;
          } else {
            currentAnswer =
              rawAnswer;
          }
        }

        continue;
      }
    }

    /*
      Save last question.
    */

    if (
      currentQuestion
    ) {
      saveCurrentQuestion();
    }

    return parsed;
  };

  /* =====================================================
     AI QUESTION GENERATOR
  ===================================================== */

  const generateAIQuestions = async () => {
    const topic = aiTopic.trim();

    if (!topic) {
      setError("Please enter a cricket topic first.");
      return;
    }

    const matchId = sessionStorage.getItem("matchId");
    if (!matchId) {
      setError("Match ID not found. Please restart the match.");
      return;
    }

    setError("");
    setSuccess("");
    setGeneratedQuestions([]);
    setShowAIPreview(false);
    setIsGenerating(true);

    try {
      const requestedCount = Math.min(
        Math.max(Number(aiCount) || 1, 1),
        requiredQuestions
      );

      const response = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          count: requestedCount,
          questionCount: requestedCount,
          matchId,
          innings: isSecondInnings ? 2 : 1,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.error || payload?.message || "AI question generation failed."
        );
      }

      // Accept either { questions: [...] } or a direct array response.
      const rawQuestions = Array.isArray(payload)
        ? payload
        : payload?.questions ?? payload?.data?.questions;

      if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
        throw new Error(
          "The AI response did not contain questions. Check the backend response format."
        );
      }

      const parsed: Question[] = rawQuestions
        .map((item: any, index: number) => {
          const options = Array.isArray(item?.options)
            ? item.options.map((option: unknown) => String(option).trim()).filter(Boolean)
            : [];

          const rawAnswer = String(
            item?.answer ?? item?.correctAnswer ?? item?.correct_answer ?? ""
          ).trim();

          const answerIndex = /^[A-D]$/i.test(rawAnswer)
            ? "ABCD".indexOf(rawAnswer.toUpperCase())
            : -1;

          const answer = answerIndex >= 0
            ? options[answerIndex] ?? ""
            : rawAnswer;

          return {
            id: `ai-${Date.now()}-${index}`,
            question: String(item?.question ?? item?.text ?? "").trim(),
            options: options.slice(0, 4),
            answer,
            bowlingType: String(item?.bowlingType ?? item?.bowling_type ?? "medium"),
          };
        })
        .filter(
          (item) =>
            item.question.length > 0 &&
            item.options.length === 4 &&
            item.answer.length > 0 &&
            item.options.includes(item.answer)
        )
        .slice(0, requestedCount);

      if (parsed.length === 0) {
        throw new Error(
          "AI returned questions, but none matched the required MCQ format (question, 4 options, and answer)."
        );
      }

      // Save generated questions automatically; preview is optional.
      setIsSavingAI(true);
      const currentInnings = isSecondInnings
        ? 2
        : Number(sessionStorage.getItem("currentInnings")) || 1;
      const selectedQuestions = parsed.slice(0, requiredQuestions);

      await addQuestions(
        selectedQuestions.map((item) => ({
          matchId,
          innings: currentInnings === 2 ? 2 : 1,
          question: item.question,
          options: item.options,
          answer: item.answer,
          bowlingType: item.bowlingType || "medium",
          source: "ai" as const,
        }))
      );

      setGeneratedQuestions(parsed);
      setQuestions(selectedQuestions);
      setShowAIPreview(false);
      setFileName("");
      sessionStorage.setItem("questionBank", JSON.stringify(selectedQuestions));
      sessionStorage.setItem("questionBankInnings", String(currentInnings));

      if (selectedQuestions.length >= requiredQuestions) {
        setSuccess(
          `${selectedQuestions.length} AI questions generated and saved. Your match is ready. Use PREVIEW QUESTIONS if you want to review them.`
        );
      } else {
        const remaining = requiredQuestions - selectedQuestions.length;
        setSuccess(
          `${selectedQuestions.length} AI questions generated and saved. ${remaining} more question${remaining === 1 ? "" : "s"} required. Use PREVIEW QUESTIONS if you want to review them.`
        );
      }
    } catch (err) {
      console.error("AI question generation error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to generate questions. Please check that the AI backend is running."
      );
    } finally {
      setIsGenerating(false);
      setIsSavingAI(false);
    }
  };

  /* =====================================================
     CLEAR IMPORTED QUESTIONS
  ===================================================== */

  const clearQuestions = () => {
    setQuestions([]);

    setFileName("");

    setError("");

    setSuccess("");

    sessionStorage.removeItem(
      "questionBank"
    );
  };

  /* =====================================================
     START FIRST INNINGS
  ===================================================== */

  const startMatch = () => {
    if (!isReady) {
      const remaining =
        requiredQuestions -
        questions.length;

      setError(
        `${remaining} more question${
          remaining === 1
            ? ""
            : "s"
        } required before starting the ${
          isSecondInnings
            ? "second"
            : "first"
        } innings.`
      );

      return;
    }

    /*
      Questions were already saved
      to Firestore during import.

      Save only the current innings questions
      in session for the game engine.
    */

    const selectedQuestions =
      questions.slice(
        0,
        requiredQuestions
      );

    sessionStorage.setItem(
      "questionBank",
      JSON.stringify(
        selectedQuestions
      )
    );

    sessionStorage.setItem(
      "questionBankInnings",
      isSecondInnings
        ? "2"
        : "1"
    );

    sessionStorage.setItem(
      "currentInnings",
      isSecondInnings
        ? "2"
        : "1"
    );

    navigate(
      isSecondInnings
        ? "/second-innings"
        : "/first-innings"
    );
  };

  return (
    <main className="question-bank-page">

      {/* =================================================
          BACKGROUND
      ================================================= */}

      <div className="question-bank-bg" />

      <div className="question-bank-overlay" />

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="question-bank-header">

        <button
          className="question-back-button"
          onClick={() =>
            navigate("/toss")
          }
          disabled={
            isImporting ||
            isSaving
          }
        >
          <FaArrowLeft />

          <span>
            BACK
          </span>
        </button>

        <div className="question-bank-title">

          <div />

          <h1>
            {isSecondInnings
              ? "SECOND INNINGS QUESTION BANK"
              : "QUESTION BANK"}
          </h1>

          <div />

        </div>

        <div className="question-bank-step">

          <strong>
            05
          </strong>

          <span>
            / 08
          </span>

        </div>

      </header>

      {/* =================================================
          MAIN CONTENT
      ================================================= */}

      <section className="question-bank-content">

        <p className="question-bank-subtitle">
          {isSecondInnings
            ? "Import a NEW MCQ question bank for the second innings"
            : "Import your MCQs before the match begins"}
        </p>

        {/* =================================================
            MATCH SUMMARY
        ================================================= */}

        <div className="question-bank-summary">

          <div>

            <span>
              MATCH OVERS
            </span>

            <strong>
              {matchSetup?.overs ||
                2}
            </strong>

          </div>

          <div>

            <span>
              QUESTIONS / OVER
            </span>

            <strong>
              6
            </strong>

          </div>

          <div>

            <span>
              REQUIRED
            </span>

            <strong>
              {requiredQuestions}
            </strong>

          </div>

          <div>

            <span>
              IMPORTED
            </span>

            <strong
              className={
                isReady
                  ? "complete"
                  : ""
              }
            >
              {questions.length}
            </strong>

          </div>

        </div>

        {/* =================================================
            IMPORT CARDS
        ================================================= */}

        <div className="question-bank-grid">

          {/* ---------------------------------------------
              WORD IMPORT
          --------------------------------------------- */}

          <div className="word-import-card">

            <div className="word-card-icon">

              <FaFileWord />

            </div>

            <h2>
              IMPORT WORD FILE
            </h2>

            <p>
              Upload your MCQ question bank
              in Microsoft Word format.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".docx"
              hidden
              onChange={
                handleFileChange
              }
            />

            <button
              className="upload-word-button"
              onClick={
                openFileSelector
              }
              disabled={
                isImporting ||
                isSaving
              }
            >

              <FaCloudUploadAlt />

              {isImporting
                ? "READING FILE..."
                : isSaving
                ? "SAVING QUESTIONS..."
                : "CHOOSE WORD FILE"}

            </button>

            {fileName && (

              <div className="selected-file">

                <FaFileWord />

                <span>
                  {fileName}
                </span>

              </div>

            )}

            <div className="word-format">

              <strong>
                Supported
              </strong>

              <span>
                .DOCX
              </span>

            </div>

          </div>

          {/* ---------------------------------------------
              AI GENERATOR
          --------------------------------------------- */}

          <div className="ai-import-card">

            <div className="ai-card-icon">

              <FaRobot />

            </div>

            <h2>
              AI QUESTION GENERATOR
            </h2>

            <p>
              Generate MCQs automatically
              from your selected topic.
            </p>

            <label
              htmlFor="ai-topic"
              style={{ display: "block", margin: "16px 0 6px", fontWeight: 600 }}
            >
              CRICKET TOPIC
            </label>
            <input
              id="ai-topic"
              type="text"
              value={aiTopic}
              onChange={(event) => setAiTopic(event.target.value)}
              placeholder="e.g. ICC Cricket World Cup"
              disabled={isGenerating || isSavingAI || isSaving}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "12px 14px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.25)",
                background: "rgba(0,0,0,0.18)",
                color: "inherit",
                font: "inherit",
                marginBottom: "12px",
              }}
            />

            <label
              htmlFor="ai-count"
              style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}
            >
              NUMBER OF QUESTIONS (MAX {requiredQuestions})
            </label>
            <input
              id="ai-count"
              type="number"
              min={1}
              max={requiredQuestions}
              value={aiCount}
              onChange={(event) => {
                const value = Number(event.target.value);
                setAiCount(Math.min(requiredQuestions, Math.max(1, value || 1)));
              }}
              disabled={isGenerating || isSavingAI || isSaving}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "12px 14px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.25)",
                background: "rgba(0,0,0,0.18)",
                color: "inherit",
                font: "inherit",
                marginBottom: "14px",
              }}
            />

            <button
              className="ai-button"
              onClick={generateAIQuestions}
              disabled={isImporting || isSaving || isGenerating || isSavingAI}
            >
              <FaRobot />
              {isGenerating ? "GENERATING..." : "GENERATE WITH AI"}
            </button>

            <div className="coming-soon">
              GEMINI AI
              <span>{isGenerating ? "WORKING..." : "READY"}</span>
            </div>

          </div>

        </div>

        {/* =================================================
            ERROR MESSAGE
        ================================================= */}

        {error && (

          <div className="question-error">

            <FaExclamationTriangle />

            <span>
              {error}
            </span>

          </div>

        )}

        {/* =================================================
            SUCCESS MESSAGE
        ================================================= */}

        {success && (

          <div className="question-success">

            <FaCheckCircle />

            <span>
              {success}
            </span>

          </div>

        )}

        {/* =================================================
            AI GENERATED QUESTION REVIEW
        ================================================= */}

        {generatedQuestions.length > 0 && (
          <button
            className="ai-button"
            onClick={() => setShowAIPreview((visible) => !visible)}
            style={{ marginTop: "24px" }}
          >
            {showAIPreview ? "HIDE PREVIEW" : "PREVIEW QUESTIONS"}
          </button>
        )}

        {showAIPreview && generatedQuestions.length > 0 && (
          <section
            className="question-preview"
            style={{ marginTop: "24px", textAlign: "left" }}
          >
            <div className="preview-header">
              <div className="preview-heading">
                <span>AI GENERATED PREVIEW</span>
                <strong>
                  {generatedQuestions.length} QUESTIONS · {aiTopic.trim()}
                </strong>
              </div>

            </div>

            <div style={{ display: "grid", gap: "14px", marginTop: "16px" }}>
              {generatedQuestions.map((item, index) => (
                <article
                  key={item.id}
                  style={{
                    padding: "16px",
                    borderRadius: "10px",
                    border: "1px solid rgba(255,255,255,0.16)",
                    background: "rgba(0,0,0,0.14)",
                  }}
                >
                  <strong style={{ display: "block", marginBottom: "10px" }}>
                    {index + 1}. {item.question}
                  </strong>
                  <ol
                    type="A"
                    style={{
                      margin: "0 0 10px",
                      paddingLeft: "24px",
                      display: "grid",
                      gap: "5px",
                    }}
                  >
                    {item.options.map((option, optionIndex) => (
                      <li key={`${item.id}-option-${optionIndex}`}>{option}</li>
                    ))}
                  </ol>
                  <div style={{ fontSize: "0.92em" }}>
                    <strong>Correct answer:</strong> {item.answer}
                  </div>
                </article>
              ))}
            </div>

            <p style={{ marginTop: "8px", fontSize: "0.9em" }}>These questions are already saved and ready to use in the current innings.</p>
          </section>
        )}

        {/* =================================================
            PROGRESS
        ================================================= */}

        <div className="question-progress">

          <div className="progress-header">

            <span>
              QUESTION BANK PROGRESS
            </span>

            <strong>
              {questions.length}
              {" / "}
              {requiredQuestions}
            </strong>

          </div>

          <div className="progress-track">

            <div
              className="progress-fill"
              style={{
                width:
                  `${progress}%`,
              }}
            />

          </div>

          <div className="progress-footer">

            <span>
              {progress}% COMPLETE
            </span>

            <span>
              {isReady
                ? "READY TO PLAY"
                : `${requiredQuestions - questions.length} MORE REQUIRED`}
            </span>

          </div>

        </div>

        {/* =================================================
            IMPORTED QUESTIONS STATUS
            NO QUESTION PREVIEW
        ================================================= */}

        {questions.length > 0 && (

          <div className="question-preview">

            <div className="preview-header">

              <div className="preview-heading">

                <span>
                  QUESTION BANK LOADED
                </span>

                <strong>
                  {questions.length}
                  {" "}
                  QUESTIONS
                </strong>

              </div>

              <button
                className="clear-button"
                onClick={
                  clearQuestions
                }
                disabled={
                  isImporting ||
                  isSaving
                }
              >

                <FaTrash />

                CLEAR ALL

              </button>

            </div>

          </div>

        )}

        {/* =================================================
            NO QUESTIONS
        ================================================= */}

        {questions.length === 0 &&
          !isImporting && (

            <div className="empty-question-state">

              <FaFileWord />

              <strong>
                No questions imported yet
              </strong>

              <span>
                Upload a .docx file or generate questions with AI
                to continue.
              </span>

            </div>

          )}

        {/* =================================================
            START MATCH
        ================================================= */}

        <button
          className={
            isReady
              ? "start-match-button"
              : "start-match-button disabled"
          }
          onClick={
            startMatch
          }
          disabled={
            !isReady ||
            isImporting ||
            isSaving
          }
        >

          <span>
            {isSecondInnings
              ? "START SECOND INNINGS"
              : "START FIRST INNINGS"}
          </span>

          <div />

          <FaArrowRight />

        </button>

      </section>

      {/* =================================================
          FOOTER
      ================================================= */}

      <footer className="question-bank-footer">

        CRICKET QUIZ ARENA

        <span>
          •
        </span>

        QUESTION BANK

      </footer>

    </main>
  );
}