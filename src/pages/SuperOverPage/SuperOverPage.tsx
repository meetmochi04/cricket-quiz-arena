
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import mammoth from "mammoth";
import {
  FaTrophy,
  FaHome,
  FaRedo,
  FaClock,
  FaFileWord,
  FaUpload,
  FaPlay,
} from "react-icons/fa";

import CricketAnimation from "../../components/CricketAnimation/CricketAnimation";
import "./SuperOverPage.css";

type Question = {
  id: string;
  question: string;
  options: string[];
  answer: string;
};

type Team = {
  name: string;
  logo?: string;
};

type Teams = {
  teamA: Team;
  teamB: Team;
};

type OverScore = {
  runs: number;
  wickets: number;
  balls: number;
};

type BallResult = "six" | "four" | "two" | "wicket" | null;
type GamePhase = "setup" | "select" | "bowling" | "question" | "result";

const EMPTY: OverScore = {
  runs: 0,
  wickets: 0,
  balls: 0,
};

const TIME_LIMIT = 15;
const BALL_TYPES = ["yorker", "bouncer", "fulltoss", "spin"] as const;

export default function SuperOverPage() {
  const navigate = useNavigate();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [teams, setTeams] = useState<Teams | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);

  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [phase, setPhase] = useState<GamePhase>("setup");

  const [teamIndex, setTeamIndex] = useState<0 | 1>(0);
  const [ballIndex, setBallIndex] = useState(0);

  const [scores, setScores] = useState<[OverScore, OverScore]>([
    { ...EMPTY },
    { ...EMPTY },
  ]);

  const [seconds, setSeconds] = useState(TIME_LIMIT);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<BallResult>(null);

  const [animationComplete, setAnimationComplete] = useState(false);
  const [finished, setFinished] = useState(false);
  const [overNumber, setOverNumber] = useState(1);

  const [, setSelectedBallType] =
    useState<string | null>(null);

  const [message, setMessage] = useState("");

  // Load teams only. Questions must be imported separately.
  useEffect(() => {
    try {
      const rawTeams = sessionStorage.getItem("selectedTeams");

      if (!rawTeams) {
        setMessage("Teams not found. Please set up a match first.");
        return;
      }

      const parsedTeams = JSON.parse(rawTeams) as Teams;

      if (!parsedTeams?.teamA?.name || !parsedTeams?.teamB?.name) {
        setMessage("Unable to load match teams.");
        return;
      }

      setTeams(parsedTeams);

      const savedOver = Number(
        sessionStorage.getItem("superOverNumber") || "1"
      );

      setOverNumber(
        Number.isFinite(savedOver) && savedOver > 0 ? savedOver : 1
      );
    } catch {
      setMessage("Unable to load match setup.");
    }
  }, []);

  // Parse questions in the same format supported by QuestionBank.
  const parseQuestions = (rawText: string): Question[] => {
    const lines = rawText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const parsed: Question[] = [];

    let currentQuestion = "";
    let currentOptions: string[] = [];
    let currentAnswer = "";

    const saveCurrentQuestion = () => {
      if (
        !currentQuestion ||
        currentOptions.length !== 4 ||
        !currentAnswer
      ) {
        return;
      }

      parsed.push({
        id: `${Date.now()}-${parsed.length}`,
        question: currentQuestion,
        options: [...currentOptions],
        answer: currentAnswer,
      });

      currentQuestion = "";
      currentOptions = [];
      currentAnswer = "";
    };

    for (const line of lines) {
      const numberedQuestion = line.match(
        /^(?:Q(?:uestion)?\s*)?(\d+)[.):\-]\s*(.+)$/i
      );

      if (numberedQuestion) {
        if (currentQuestion) saveCurrentQuestion();

        currentQuestion = numberedQuestion[2].trim();
        continue;
      }

      if (/^question\s*:/i.test(line)) {
        if (currentQuestion) saveCurrentQuestion();

        currentQuestion = line.replace(/^question\s*:/i, "").trim();
        continue;
      }

      const optionMatch = line.match(
        /^([A-D])[).:\-]\s*(.+)$/i
      );

      if (optionMatch) {
        if (currentOptions.length < 4) {
          currentOptions.push(optionMatch[2].trim());
        }
        continue;
      }

      const answerMatch = line.match(
        /^(?:correct\s*)?(?:answer|option)\s*[:\-]\s*(.+)$/i
      );

      if (answerMatch) {
        const rawAnswer = answerMatch[1].trim();
        const answerLetter = rawAnswer.charAt(0).toUpperCase();
        const answerIndex = "ABCD".indexOf(answerLetter);

        if (answerIndex >= 0 && currentOptions[answerIndex]) {
          currentAnswer = currentOptions[answerIndex];
        } else {
          const exactOption = currentOptions.find(
            (option) =>
              option.toLowerCase() === rawAnswer.toLowerCase()
          );

          if (exactOption) currentAnswer = exactOption;
        }
      }
    }

    if (currentQuestion) saveCurrentQuestion();

    return parsed;
  };

  // Import Super Over questions from DOCX.
  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setError("");
    setSuccess("");
    setQuestions([]);
    setFileName("");

    if (!file.name.toLowerCase().endsWith(".docx")) {
      setError("Please select a Microsoft Word .docx file.");
      event.target.value = "";
      return;
    }

    setImporting(true);

    try {
      const arrayBuffer = await file.arrayBuffer();

      const extracted = await mammoth.extractRawText({
        arrayBuffer,
      });

      if (!extracted.value.trim()) {
        throw new Error("The Word file is empty.");
      }

      const parsedQuestions = parseQuestions(extracted.value);

      if (parsedQuestions.length < 12) {
        throw new Error(
          `Only ${parsedQuestions.length} valid questions found. Please import at least 12 questions for the Super Over.`
        );
      }

      const selectedQuestions = parsedQuestions.slice(0, 12);

      setQuestions(selectedQuestions);
      setFileName(file.name);

      sessionStorage.setItem(
        "superOverQuestions",
        JSON.stringify(selectedQuestions)
      );

      setSuccess(
        `${selectedQuestions.length} questions imported successfully.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to import the Word file."
      );
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  };

  const currentQuestion =
    questions[teamIndex * 6 + ballIndex];

  const activeTeam = teams
    ? teamIndex === 0
      ? teams.teamA
      : teams.teamB
    : null;

  const resultWinner = useMemo(() => {
    if (!finished) return null;

    if (scores[0].runs === scores[1].runs) {
      return "tie" as const;
    }

    return scores[0].runs > scores[1].runs
      ? "teamA" as const
      : "teamB" as const;
  }, [finished, scores]);

  const animationKey = `${overNumber}-${teamIndex}-${ballIndex}`;

  // Stop timer when leaving question phase.
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (phase !== "question" || selected !== null || finished) {
      return;
    }

    timerRef.current = setInterval(() => {
      setSeconds((previous) => Math.max(0, previous - 1));
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [phase, selected, finished, teamIndex, ballIndex]);

  function submitAnswer(answer: string | null) {
    if (
      phase !== "question" ||
      selected !== null ||
      finished ||
      !currentQuestion
    ) {
      return;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const correct =
      answer !== null && answer === currentQuestion.answer;

    let nextResult: BallResult = "wicket";

    if (correct) {
      if (seconds >= 11) nextResult = "six";
      else if (seconds >= 6) nextResult = "four";
      else if (seconds >= 1) nextResult = "two";
    }

    setSelected(answer ?? "__TIME_UP__");
    setResult(nextResult);
    setAnimationComplete(false);

    setScores((old) => {
      const next: [OverScore, OverScore] = [
        { ...old[0] },
        { ...old[1] },
      ];

      next[teamIndex].balls += 1;

      if (nextResult === "six") next[teamIndex].runs += 6;
      if (nextResult === "four") next[teamIndex].runs += 4;
      if (nextResult === "two") next[teamIndex].runs += 2;

      if (nextResult === "wicket") {
        // Only one wicket is allowed per team in a Super Over.
        next[teamIndex].wickets = 1;
      }

      return next;
    });

    setPhase("result");
  }

  // Timeout = wicket.
  useEffect(() => {
    if (
      seconds === 0 &&
      phase === "question" &&
      selected === null &&
      currentQuestion
    ) {
      submitAnswer(null);
    }
  }, [seconds, phase, selected, currentQuestion]);

  const startSuperOver = () => {
    if (!teams || questions.length < 12) {
      setError("Please import at least 12 questions first.");
      return;
    }

    setError("");
    setSuccess("");
    setPhase("select");
    setTeamIndex(0);
    setBallIndex(0);
    setScores([{ ...EMPTY }, { ...EMPTY }]);
    setSeconds(TIME_LIMIT);
    setSelected(null);
    setResult(null);
    setFinished(false);
    setAnimationComplete(false);
  };

  const startBowling = (ballType: string) => {
    if (phase !== "select" || finished) return;

    setSelectedBallType(ballType);
    setSeconds(TIME_LIMIT);
    setSelected(null);
    setResult(null);
    setAnimationComplete(false);
    setPhase("bowling");
  };

  const handleQuestionReady = () => {
    if (phase === "bowling") {
      setPhase("question");
      setSeconds(TIME_LIMIT);
    }
  };

  const handleAnimationComplete = () => {
    if (phase === "result") {
      setAnimationComplete(true);
    }
  };

  const nextBall = () => {
    if (!animationComplete || selected === null) return;

    const currentScore = scores[teamIndex];

    const inningsEnded =
      currentScore.wickets >= 1 ||
      currentScore.balls >= 6;

    const teamBHasWon =
      teamIndex === 1 &&
      scores[1].runs > scores[0].runs;

    if (teamBHasWon) {
      setFinished(true);
      return;
    }

    if (inningsEnded) {
      if (teamIndex === 0) {
        setTeamIndex(1);
        setBallIndex(0);
        setSelected(null);
        setResult(null);
        setSeconds(TIME_LIMIT);
        setAnimationComplete(false);
        setPhase("select");
        return;
      }

      setFinished(true);
      return;
    }

    setBallIndex((previous) => previous + 1);
    setSelected(null);
    setResult(null);
    setSeconds(TIME_LIMIT);
    setAnimationComplete(false);
    setSelectedBallType(null);
    setPhase("select");
  };

  const playAgain = () => {
    const nextOver = overNumber + 1;

    sessionStorage.setItem("superOverNumber", String(nextOver));

    setOverNumber(nextOver);
    setScores([{ ...EMPTY }, { ...EMPTY }]);
    setTeamIndex(0);
    setBallIndex(0);
    setSeconds(TIME_LIMIT);
    setSelected(null);
    setResult(null);
    setFinished(false);
    setAnimationComplete(false);
    setSelectedBallType(null);
    setPhase("select");
  };

  const continueToSummary = () => {
    if (!teams || !resultWinner || resultWinner === "tie") return;

    const winner =
      resultWinner === "teamA"
        ? teams.teamA.name
        : teams.teamB.name;

    sessionStorage.setItem(
      "superOverResult",
      JSON.stringify({
        overNumber,
        teamAScore: scores[0],
        teamBScore: scores[1],
        winner,
      })
    );

    navigate("/match-result");
  };

  if (message) {
    return (
      <main className="super-over-page">
        <section className="super-over-card">
          <h1>SUPER OVER</h1>
          <p>{message}</p>
          <button onClick={() => navigate("/")}>HOME</button>
        </section>
      </main>
    );
  }

  if (!teams) {
    return (
      <main className="super-over-page">
        <section className="super-over-card">
          <h1>SUPER OVER</h1>
          <p>Loading teams...</p>
        </section>
      </main>
    );
  }

  // IMPORT / SETUP SCREEN
  if (phase === "setup") {
    return (
      <main className="super-over-page">
        <section className="super-over-card super-over-setup">
          <div className="super-over-kicker">
            CRICKET QUIZ ARENA
          </div>

          <h1>SUPER OVER SETUP</h1>

          <p className="super-over-subtitle">
            The match is tied! Import your Super Over questions to continue.
          </p>

          <div className="super-over-team-preview">
            <div>
              <span>TEAM A</span>
              <strong>{teams.teamA.name}</strong>
            </div>

            <div>
              <span>TEAM B</span>
              <strong>{teams.teamB.name}</strong>
            </div>
          </div>

          <div className="super-over-upload">
            <FaFileWord />

            <h2>Import Word Questions</h2>

            <p>
              Select a .docx file containing at least 12 MCQ questions.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".docx"
              hidden
              onChange={handleFileChange}
            />

            <button
              className="super-over-primary"
              disabled={importing}
              onClick={() => fileInputRef.current?.click()}
            >
              <FaUpload />
              {importing ? "IMPORTING..." : "CHOOSE WORD FILE"}
            </button>

            {fileName && (
              <div className="super-over-file-name">
                <FaFileWord /> {fileName}
              </div>
            )}

            {success && (
              <p className="super-over-success">{success}</p>
            )}

            {error && (
              <p className="super-over-error">{error}</p>
            )}

            <p className="super-over-question-count">
              {questions.length} / 12 questions imported
            </p>
          </div>

          <button
            className="super-over-primary super-over-start"
            disabled={questions.length < 12 || importing}
            onClick={startSuperOver}
          >
            <FaPlay />
            START SUPER OVER
          </button>

          <button
            className="super-over-secondary"
            onClick={() => navigate("/")}
          >
            <FaHome /> HOME
          </button>
        </section>
      </main>
    );
  }

  // FINAL RESULT SCREEN
  if (finished) {
    return (
      <main className="super-over-page">
        <section className="super-over-card">
          <div className="super-over-kicker">
            CRICKET QUIZ ARENA · SUPER OVER {overNumber}
          </div>

          <h1>
            {resultWinner === "tie"
              ? "SUPER OVER TIED"
              : "SUPER OVER RESULT"}
          </h1>

          <div className="super-over-final-scores">
            <div>
              <span>{teams.teamA.name}</span>
              <strong>
                {scores[0].runs}/{scores[0].wickets}
              </strong>
              <small>{scores[0].balls}/6 balls</small>
            </div>

            <div>
              <span>{teams.teamB.name}</span>
              <strong>
                {scores[1].runs}/{scores[1].wickets}
              </strong>
              <small>{scores[1].balls}/6 balls</small>
            </div>
          </div>

          <h2 className="super-over-winner">
            {resultWinner === "tie"
              ? "Scores are equal"
              : `${
                  resultWinner === "teamA"
                    ? teams.teamA.name
                    : teams.teamB.name
                } WINS!`}
          </h2>

          {resultWinner === "tie" ? (
            <button
              className="super-over-primary"
              onClick={playAgain}
            >
              <FaRedo /> PLAY ANOTHER SUPER OVER
            </button>
          ) : (
            <button
              className="super-over-primary"
              onClick={continueToSummary}
            >
              <FaTrophy /> CONTINUE TO MATCH SUMMARY
            </button>
          )}

          <button
            className="super-over-secondary"
            onClick={() => navigate("/")}
          >
            <FaHome /> HOME
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="super-over-page">
      <section className="super-over-card">
        <div className="super-over-kicker">
          CRICKET QUIZ ARENA · SUPER OVER {overNumber}
        </div>

        <h1>SUPER OVER</h1>

        <p className="super-over-subtitle">
          One over each · One wicket per team
        </p>

        <div className="super-over-scoreboard">
          {[teams.teamA, teams.teamB].map((team, index) => (
            <div
              key={team.name}
              className={`super-over-team ${
                index === teamIndex ? "active" : ""
              }`}
            >
              <span>{team.name}</span>

              <strong>
                {scores[index as 0 | 1].runs}/
                {scores[index as 0 | 1].wickets}
              </strong>

              <small>
                {scores[index as 0 | 1].balls}/6 balls
              </small>
            </div>
          ))}
        </div>

        <div className="super-over-progress">
          {activeTeam?.name} · BALL {ballIndex + 1} OF 6
        </div>

        <div className="super-over-timer">
          <FaClock /> <strong>{seconds}s</strong>
        </div>

        {/* Existing cricket animation */}
        <div className="super-over-animation">
          <CricketAnimation
            ballKey={animationKey}
            phase={
              phase === "bowling"
                ? "bowling"
                : phase === "result"
                ? "result"
                : "question"
            }
            result={result}
            onQuestionReady={handleQuestionReady}
            onAnimationComplete={handleAnimationComplete}
          />
        </div>

        {phase === "select" && (
          <div className="super-over-delivery">
            <h2>Select Bowling Style</h2>

            <div className="super-over-options">
              {BALL_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => startBowling(type)}
                >
                  {type.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === "question" && currentQuestion && (
          <>
            <h2 className="super-over-question">
              {currentQuestion.question}
            </h2>

            <div className="super-over-options">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={`${index}-${option}`}
                  disabled={selected !== null}
                  onClick={() => submitAnswer(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </>
        )}

        {phase === "result" && selected !== null && (
          <div className="super-over-feedback">
            <strong>
              {result === "wicket"
                ? selected === "__TIME_UP__"
                  ? "TIME UP — WICKET!"
                  : "WRONG ANSWER — WICKET!"
                : `CORRECT — ${
                    result === "six"
                      ? 6
                      : result === "four"
                      ? 4
                      : 2
                  } RUNS`}
            </strong>

            {animationComplete ? (
              <button onClick={nextBall}>
                {scores[teamIndex].wickets === 1 ||
                scores[teamIndex].balls >= 6
                  ? teamIndex === 0
                    ? "NEXT TEAM"
                    : "VIEW RESULT"
                  : "NEXT BALL"}
              </button>
            ) : (
              <p>Playing result animation...</p>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
