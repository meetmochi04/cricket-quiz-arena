import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaArrowRight,
  FaBolt,
  FaCheckCircle,
  FaClock,
  FaTrophy,
} from "react-icons/fa";
import "./FirstInnings.css";
import "./FirstInnings.layout-fix.css";
import CricketAnimation from "../../components/CricketAnimation/CricketAnimation";
interface Question {
  id: string;
  question: string;
  options: string[];
  answer: string;
}
interface MatchSetup {
  overs: number;
  playersPerTeam?: number;
  totalQuestions?: number;
}
interface Teams {
  teamA: {
    name: string;
    logo?: string;
  };
  teamB: {
    name: string;
    logo?: string;
  };
}
type ResultType =
  | "six"
  | "four"
  | "two"
  | "wicket"
  | null;
type BallType =
  | "yorker"
  | "bouncer"
  | "fulltoss"
  | "spin"
  | "inswing"
  | "outswing";
type GamePhase =
  | "select"
  | "bowling"
  | "question"
  | "result";
export type InningsMode =
  | "first"
  | "second";
const TOTAL_TIME = 15;
const deliveryNames: Record<BallType, string> = {
  yorker: "YORKER",
  bouncer: "BOUNCER",
  fulltoss: "FULL TOSS",
  spin: "SPIN",
  inswing: "IN SWING",
  outswing: "OUT SWING",
};
const deliveryIcons: Record<BallType, string> = {
  yorker: "🎯",
  bouncer: "🚀",
  fulltoss: "⚡",
  spin: "🌀",
  inswing: "↙",
  outswing: "↘",
};
function CricketGameScene({
  gamePhase,
  selectedBallType,
  result,
  animationKey,
  onQuestionReady,
  onAnimationComplete,
}: {
  gamePhase: GamePhase;
  selectedBallType: BallType | null;
  result: ResultType;
  animationKey: string;
  onQuestionReady: () => void;
  onAnimationComplete: () => void;
}) {
  return (
    <div
      className={[
        "game-scene",
        gamePhase === "bowling" ? "phase-bowling" : "",
        gamePhase === "result" &&
        (result === "six" || result === "four" || result === "two")
          ? "phase-batting"
          : "",
      ].filter(Boolean).join(" ")}
    >
      <CricketAnimation
        ballKey={animationKey}
        phase={gamePhase}
        result={result}
        onQuestionReady={onQuestionReady}
        onAnimationComplete={onAnimationComplete}
      />
      {gamePhase === "bowling" && (
        <div className="delivery-caption">
          <span>{selectedBallType ? deliveryNames[selectedBallType] : "DELIVERY"}</span>
        </div>
      )}
      {result && (
        <div className={`field-result field-result-${result}`}>
          {result === "six" && "6"}
          {result === "four" && "4"}
          {result === "two" && "2"}
          {result === "wicket" && "OUT"}
        </div>
      )}
    </div>
  );
}
export function InningsGamePage({
  innings = "first",
}: {
  innings?: InningsMode;
}) {
  const navigate = useNavigate();
  const timerRef =
    useRef<ReturnType<typeof setInterval> | null>(
      null
    );
  const [questions, setQuestions] =
    useState<Question[]>([]);
  const [matchSetup, setMatchSetup] =
    useState<MatchSetup | null>(null);
  const [teams, setTeams] =
    useState<Teams | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] =
    useState(0);
  const [timeLeft, setTimeLeft] =
    useState(TOTAL_TIME);
  const [selectedAnswer, setSelectedAnswer] =
    useState<string | null>(null);
  const [isAnswered, setIsAnswered] =
    useState(false);
  const [result, setResult] =
    useState<ResultType>(null);
  const [runs, setRuns] =
    useState(0);
  const [wickets, setWickets] =
    useState(0);
  const [target, setTarget] =
    useState<number | null>(null);
  const [balls, setBalls] =
    useState(0);
  const [currentOver, setCurrentOver] =
    useState(1);
  const [isTransitioning, setIsTransitioning] =
    useState(false);
  const [animationComplete, setAnimationComplete] =
    useState(false);
  const [gamePhase, setGamePhase] =
    useState<GamePhase>("select");
  const [selectedBallType, setSelectedBallType] =
    useState<BallType | null>(null);
  const [aiCommentary, setAiCommentary] = useState("");
  const [commentaryLoading, setCommentaryLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const [, setBowlingStage] =
    useState<
      "idle" |
      "runup" |
      "release" |
      "finished"
    >("idle");
  useEffect(() => {
    const savedQuestions =
      sessionStorage.getItem("questionBank");
    const savedSetup =
      sessionStorage.getItem("matchSetup");
    const savedTeams =
      sessionStorage.getItem("selectedTeams");
    if (!savedQuestions) {
      navigate("/question-bank");
      return;
    }
    try {
      const parsedQuestions =
        JSON.parse(savedQuestions);
      setQuestions(
        Array.isArray(parsedQuestions)
          ? parsedQuestions
          : []
      );
      if (savedSetup) {
        setMatchSetup(
          JSON.parse(savedSetup)
        );
      }
      if (savedTeams) {
        setTeams(
          JSON.parse(savedTeams)
        );
      }
      if (innings === "second") {
        const savedFirst =
          sessionStorage.getItem(
            "firstInnings"
          );
        if (savedFirst) {
          const first =
            JSON.parse(savedFirst);
          const firstRuns =
            Number(first.runs || 0);
          setTarget(firstRuns + 1);
        }
      }
    } catch {
      navigate("/question-bank");
    }
  }, [navigate, innings]);
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
  const currentQuestion =
    questions[currentQuestionIndex];
  const totalBalls =
    (matchSetup?.overs || 2) * 6;
  const ballNumber =
    (balls % 6) + 1;
  const timerPercentage =
    (timeLeft / TOTAL_TIME) * 100;
  const timerDanger =
    timeLeft <= 5;
  const startBowling = (
    ballType: BallType
  ) => {
    if (
      gamePhase !== "select" ||
      isTransitioning
    ) {
      return;
    }
    setSelectedBallType(ballType);
    setResult(null);
    setAnimationComplete(false);
    setBowlingStage("runup");
    setGamePhase("bowling");
  };
  useEffect(() => {
    if (
      gamePhase !== "question" ||
      !currentQuestion ||
      isAnswered ||
      isTransitioning
    ) {
      return;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current =
      setInterval(() => {
        setTimeLeft(
          (previous) => {
            if (previous <= 1) {
              if (timerRef.current) {
                clearInterval(
                  timerRef.current
                );
              }
              return 0;
            }
            return previous - 1;
          }
        );
      }, 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(
          timerRef.current
        );
      }
    };
  }, [
    gamePhase,
    currentQuestionIndex,
    currentQuestion,
    isAnswered,
    isTransitioning,
  ]);
  useEffect(() => {
    if (
      gamePhase === "question" &&
      timeLeft === 0 &&
      !isAnswered
    ) {
      handleTimeout();
    }
  }, [
    timeLeft,
    gamePhase,
    isAnswered,
  ]);
  // Convert Gemini's raw PCM audio into a WAV file the browser can play.
  const pcmToWav = (pcmBytes: Uint8Array, sampleRate = 24000) => {
    const wavBuffer = new ArrayBuffer(44 + pcmBytes.length);
    const view = new DataView(wavBuffer);
    const writeText = (offset: number, value: string) => {
      for (let i = 0; i < value.length; i++) {
        view.setUint8(offset + i, value.charCodeAt(i));
      }
    };

    writeText(0, "RIFF");
    view.setUint32(4, 36 + pcmBytes.length, true);
    writeText(8, "WAVE");
    writeText(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // 16-bit mono
    view.setUint16(32, 2, true); // Block align
    view.setUint16(34, 16, true); // Bits per sample
    writeText(36, "data");
    view.setUint32(40, pcmBytes.length, true);
    new Uint8Array(wavBuffer, 44).set(pcmBytes);
    return new Blob([wavBuffer], { type: "audio/wav" });
  };

  // Play the audio generated by Gemini, not the browser's default voice.
  const playAICommentaryAudio = async (text: string) => {
    const spokenText = text.trim();
    if (!spokenText) return;

    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }

      const response = await fetch(
        "/api/generate-commentary-audio",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ commentary: spokenText }),
        }
      );

      const data: { audio?: string; mimeType?: string; error?: string } =
        await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate commentary audio.");
      }
      if (!data.audio) {
        throw new Error("No audio data received from the backend.");
      }

      const binary = atob(data.audio);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const mimeType = (data.mimeType || "").toLowerCase();
      const audioBlob = mimeType.includes("wav")
        ? new Blob([bytes], { type: "audio/wav" })
        : pcmToWav(bytes, 24000);
      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlRef.current = audioUrl;

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        if (audioRef.current === audio) audioRef.current = null;
        if (audioUrlRef.current === audioUrl) audioUrlRef.current = null;
      };
      audio.onerror = () => {
        console.error("Could not play the AI commentary audio.");
      };

      await audio.play();
    } catch (error) {
      console.error("AI commentary audio error:", error);
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) audioRef.current.pause();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
  }, []);

  const generateAICommentary = async (
    ballResult: Exclude<ResultType, null>,
    updatedRuns: number,
    updatedWickets: number
  ) => {
    setCommentaryLoading(true);
    setAiCommentary("");

    const battingTeam =
      innings === "first"
        ? teams?.teamA?.name ?? "Team A"
        : teams?.teamB?.name ?? "Team B";
    const bowlingTeam =
      innings === "first"
        ? teams?.teamB?.name ?? "Team B"
        : teams?.teamA?.name ?? "Team A";

    try {
      const response = await fetch(
        "/api/generate-commentary",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            battingTeam,
            bowlingTeam,
            innings,
            over: currentOver,
            ball: ballNumber,
            deliveryType: selectedBallType ?? "spin",
            result: ballResult,
            runs: updatedRuns,
            wickets: updatedWickets,
            target: target ?? undefined,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Could not generate commentary");
      }
      const commentaryText =
        typeof data?.commentary === "string" && data.commentary.trim()
          ? data.commentary.trim()
          : "What a moment in Cricket Quiz Arena!";

      setAiCommentary(commentaryText);
      void playAICommentaryAudio(commentaryText);
    } catch (error) {
      console.error("AI commentary error:", error);
      setAiCommentary("🏏 What a moment in Cricket Quiz Arena!");
    } finally {
      setCommentaryLoading(false);
    }
  };

  const calculateRuns = (
    secondsLeft: number
  ): ResultType => {
    if (secondsLeft >= 11) {
      return "six";
    }
    if (secondsLeft >= 6) {
      return "four";
    }
    if (secondsLeft >= 1) {
      return "two";
    }
    return "wicket";
  };
  const handleAnswer = (
    answer: string
  ) => {
    if (
      isAnswered ||
      isTransitioning ||
      !currentQuestion ||
      gamePhase !== "question"
    ) {
      return;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setSelectedAnswer(answer);
    setIsAnswered(true);
    setAnimationComplete(false);
    setGamePhase("result");
    if (
      answer !== currentQuestion.answer
    ) {
      setResult("wicket");
      setAnimationComplete(false);
      const updatedWickets = wickets + 1;
      setWickets(updatedWickets);
      void generateAICommentary("wicket", runs, updatedWickets);
      return;
    }
    const resultType =
      calculateRuns(timeLeft);
    setResult(resultType);
    const runValue =
      resultType === "six" ? 6 :
      resultType === "four" ? 4 :
      resultType === "two" ? 2 : 0;
    void generateAICommentary(resultType ?? "wicket", runs + runValue, wickets);
    if (resultType === "six") {
      setRuns(
        (previous) =>
          previous + 6
      );
    }
    if (resultType === "four") {
      setRuns(
        (previous) =>
          previous + 4
      );
    }
    if (resultType === "two") {
      setRuns(
        (previous) =>
          previous + 2
      );
    }
  };
  const handleTimeout = () => {
    if (
      isAnswered ||
      isTransitioning
    ) {
      return;
    }
    if (timerRef.current) {
      clearInterval(
        timerRef.current
      );
    }
    setIsAnswered(true);
    setAnimationComplete(false);
    setGamePhase("result");
    setResult("wicket");
    const updatedWickets = wickets + 1;
    setWickets(updatedWickets);
    void generateAICommentary("wicket", runs, updatedWickets);
  };
  const finishInnings = (
    finalRuns: number,
    finalWickets: number,
    finalBalls: number
  ) => {
    const finalInnings = {
      runs: finalRuns,
      wickets: finalWickets,
      balls: finalBalls,
    };
    if (innings === "first") {
      sessionStorage.setItem(
        "firstInnings",
        JSON.stringify(finalInnings)
      );
      navigate("/first-innings-summary");
      return;
    }
    sessionStorage.setItem(
      "secondInnings",
      JSON.stringify(finalInnings)
    );
    navigate("/match-result");
  };
  const handleAnimationComplete = () => {
    setAnimationComplete(true);
    if (!result) {
      return;
    }
    const maxWickets =
      Math.max(1, matchSetup?.playersPerTeam || 7);
    const nextWicketCount =
      wickets;
    const targetReached =
      innings === "second" &&
      target !== null &&
      runs >= target;
    const allOut =
      nextWicketCount >= maxWickets;
    const maxBalls =
      Math.min(
        questions.length,
        totalBalls
      );
    const inningsComplete =
      balls + 1 >= maxBalls;
    if (
      targetReached ||
      allOut ||
      inningsComplete
    ) {
      window.setTimeout(() => {
        finishInnings(
          runs,
          wickets,
          balls + 1
        );
      }, 0);
    }
  };
  const nextBall = () => {
    if (
      isTransitioning ||
      !animationComplete
    ) {
      return;
    }
    const maxWickets =
      Math.max(
        1,
        matchSetup?.playersPerTeam || 7
      );
    const maxBalls =
      Math.min(
        questions.length,
        totalBalls
      );
    const targetReached =
      innings === "second" &&
      target !== null &&
      runs >= target;
    const allOut =
      wickets >= maxWickets;
    const inningsComplete =
      balls + 1 >= maxBalls;
    if (
      targetReached ||
      allOut ||
      inningsComplete
    ) {
      finishInnings(
        runs,
        wickets,
        balls + 1
      );
      return;
    }
    setIsTransitioning(true);
    window.setTimeout(() => {
      const nextIndex =
        currentQuestionIndex + 1;
      const nextBallNumber =
        balls + 1;
      setCurrentQuestionIndex(
        nextIndex
      );
      setBalls(
        nextBallNumber
      );
      setCurrentOver(
        Math.floor(
          nextBallNumber / 6
        ) + 1
      );
      setSelectedAnswer(null);
      setIsAnswered(false);
      setResult(null);
      setAnimationComplete(false);
      setTimeLeft(TOTAL_TIME);
      setGamePhase("select");
      setSelectedBallType(null);
      setBowlingStage("idle");
      setIsTransitioning(false);
    }, 0);
  };
  useEffect(() => {
    if (
      innings !== "second" ||
      target === null ||
      runs < target ||
      gamePhase !== "result"
    ) {
      return;
    }
    sessionStorage.setItem(
      "secondInnings",
      JSON.stringify({
        runs,
        wickets,
        balls,
      })
    );
  }, [
    innings,
    target,
    runs,
    wickets,
    balls,
    gamePhase,
  ]);
  const overBalls = useMemo(() => {
    const completed =
      balls % 6;
    return Array.from(
      { length: 6 },
      (_, index) =>
        index < completed
          ? "done"
          : index === completed
          ? "current"
          : "empty"
    );
  }, [balls]);
  if (!currentQuestion) {
    return (
      <div className="innings-loading">
        <FaTrophy />
        <h2>
          Loading{" "}
          {innings === "first"
            ? "First"
            : "Second"}{" "}
          Innings...
        </h2>
      </div>
    );
  }
  return (
    <main className="first-innings-page">
      <header className="game-topbar">
        <button
          className="exit-button"
          onClick={() =>
            navigate(
              "/question-bank"
            )
          }
        >
          <FaArrowLeft />
          EXIT
        </button>
        <div className="game-logo">
          <span>
            CRICKET
          </span>
          <strong>
            QUIZ ARENA ·{" "}
            {innings === "first"
              ? "1ST INNINGS"
              : "2ND INNINGS"}
          </strong>
        </div>
        <div className="live-pill">
          <i />
          LIVE MATCH
        </div>
      </header>
      <section className="scoreboard">
        <div className="score-team">
          <div className="team-badge">
  {(innings === "first"
    ? teams?.teamA?.name
    : teams?.teamB?.name
  )?.trim().slice(0, 3).toUpperCase() ||
    (innings === "first" ? "A" : "B")}
</div>
          <div>
            <small>
              BATTING
            </small>
            <b>
              {innings === "first"
                ? (
                  teams?.teamA?.name ||
                  "TEAM A"
                )
                : (
                  teams?.teamB?.name ||
                  "TEAM B"
                )}
            </b>
          </div>
        </div>
        <div className="score-center">
          <strong>
            {runs}
            <em>
              /{wickets}
            </em>
          </strong>
          <span>
            {balls} BALLS
          </span>
        </div>
        <div className="score-over">
          <small>
            {innings === "second"
              ? "TARGET"
              : "OVER"}
          </small>
          <b>
            {innings === "second"
              ? target ?? "-"
              : currentOver}
          </b>
          <span>
            {innings === "second"
              ? `${Math.max(
                  0,
                  (target ?? 0) -
                    runs
                )} RUNS NEEDED`
              : `${
                  matchSetup?.overs ||
                  2
                } OVER MATCH`}
          </span>
        </div>
      </section>
      <section className="game-wrapper">
        {innings === "second" &&
          target !== null && (
            <div className="target-banner">
              TARGET{" "}
              <b>
                {target}
              </b>
              {" · "}
              NEED{" "}
              <b>
                {Math.max(
                  0,
                  target - runs
                )}
              </b>{" "}
              RUNS
            </div>
          )}
        <div className="game-hud">
          <span>
            🏏 BOWLER
          </span>
          <b>
            {innings === "first"
              ? (
                teams?.teamB?.name ||
                "TEAM B"
              )
              : (
                teams?.teamA?.name ||
                "TEAM A"
              )}
          </b>
        </div>
        <CricketGameScene
          gamePhase={gamePhase}
          selectedBallType={selectedBallType}
          result={result}
          animationKey={`${innings}-${currentQuestionIndex}-${selectedBallType ?? "none"}`}
          onQuestionReady={() => {
            if (gamePhase !== "bowling" || isTransitioning) {
              return;
            }
            setBowlingStage("finished");
            setGamePhase("question");
            setTimeLeft(TOTAL_TIME);
          }}
          onAnimationComplete={handleAnimationComplete}
        />
        <div className="bottom-status">
          <span>
            {gamePhase ===
            "select"
              ? "SELECT DELIVERY"
              : gamePhase ===
                "bowling"
              ? "BALL IN PLAY"
              : "PLAY COMPLETE"}
          </span>
        </div>
        {gamePhase ===
          "select" && (
          <div className="delivery-panel">
            <div className="delivery-title">
              <small>
                SELECT YOUR DELIVERY
              </small>
              <b>
                BALL{" "}
                {ballNumber}
              </b>
            </div>
            <div className="delivery-grid">
              {(
                Object.keys(
                  deliveryNames
                ) as BallType[]
              ).map(
                (type) => (
                  <button
                    key={type}
                    onClick={() =>
                      startBowling(
                        type
                      )
                    }
                  >
                    <span>
                      {
                        deliveryIcons[
                          type
                        ]
                      }
                    </span>
                    <strong>
                      {
                        deliveryNames[
                          type
                        ]
                      }
                    </strong>
                    <small>
                      {type ===
                        "yorker" &&
                        "Fast & low"}
                      {type ===
                        "bouncer" &&
                        "Short & high"}
                      {type ===
                        "fulltoss" &&
                        "Direct attack"}
                      {type ===
                        "spin" &&
                        "Turning ball"}
                      {type ===
                        "inswing" &&
                        "Curves in"}
                      {type ===
                        "outswing" &&
                        "Curves away"}
                    </small>
                  </button>
                )
              )}
            </div>
          </div>
        )}
        <div className="over-tracker">
          <div>
            <small>
              OVER{" "}
              {currentOver}
            </small>
            <b>
              BALL{" "}
              {ballNumber}
            </b>
          </div>
          <div className="over-balls">
            {overBalls.map(
              (
                status,
                index
              ) => (
                <i
                  key={index}
                  className={
                    status
                  }
                >
                  {status ===
                  "done"
                    ? "✓"
                    : index + 1}
                </i>
              )
            )}
          </div>
        </div>
        {(
          gamePhase ===
            "question" ||
          gamePhase ===
            "result"
        ) && (
          <div
            className={`question-overlay ${
              result === "wicket" ? "wicket-overlay" : ""
            }`}
          >
            <section className="question-card">
              <div
                className={`question-timer ${
                  timerDanger
                    ? "danger"
                    : ""
                }`}
              >
                <div className="timer-left">
                  <FaClock />
                  <span>
                    TIME LEFT{" "}
                    <b>
                      {timeLeft}s
                    </b>
                  </span>
                </div>
                <div className="timer-line">
                  <i
                    style={{
                      width: `${timerPercentage}%`,
                    }}
                  />
                </div>
              </div>
              <div className="question-meta">
                QUESTION{" "}
                {currentQuestionIndex +
                  1}
                <span>
                  {Math.min(
                    questions.length,
                    totalBalls
                  )}
                </span>
              </div>
              <h1>
                {
                  currentQuestion.question
                }
              </h1>
              <div className="answers">
                {currentQuestion.options.map(
                  (
                    option,
                    index
                  ) => {
                    const isSelected =
                      selectedAnswer ===
                      option;
                    const isCorrect =
                      option ===
                      currentQuestion.answer;
                    let cls =
                      "answer";
                    if (
                      isAnswered &&
                      isSelected &&
                      isCorrect
                    ) {
                      cls +=
                        " correct";
                    }
                    if (
                      isAnswered &&
                      isSelected &&
                      !isCorrect
                    ) {
                      cls +=
                        " wrong";
                    }
                    if (
                      isAnswered &&
                      isCorrect
                    ) {
                      cls +=
                        " reveal-correct";
                    }
                    return (
                      <button
                        key={index}
                        className={
                          cls
                        }
                        onClick={() =>
                          handleAnswer(
                            option
                          )
                        }
                        disabled={
                          isAnswered
                        }
                      >
                        <span>
                          {String.fromCharCode(
                            65 +
                              index
                          )}
                        </span>
                        <b>
                          {option}
                        </b>
                        {isAnswered &&
                          isCorrect && (
                            <FaCheckCircle />
                          )}
                      </button>
                    );
                  }
                )}
              </div>
              {result && (
                <div
                  className={`answer-result ${result}`}
                >
                  {result ===
                    "six" && (
                    <FaBolt />
                  )}
                  <strong>
                    {result ===
                      "six" &&
                      "SIX!"}
                    {result ===
                      "four" &&
                      "FOUR!"}
                    {result ===
                      "two" &&
                      "2 RUNS!"}
                    {result ===
                      "wicket" &&
                      "WICKET!"}
                  </strong>
                  <small>
                    {result ===
                      "six" &&
                      "MASSIVE SHOT"}
                    {result ===
                      "four" &&
                      "BEAUTIFUL SHOT"}
                    {result ===
                      "two" &&
                      "QUICK RUNNING"}
                    {result ===
                      "wicket" &&
                      "OUT"}
                  </small>
                </div>
              )}
              {(isAnswered || commentaryLoading || aiCommentary) && (
                <div className="ai-commentary" aria-live="polite">
                  <div className="ai-commentary-heading">🎙️ AI LIVE COMMENTARY</div>
                  {commentaryLoading ? (
                    <p>🏏 Generating live commentary...</p>
                  ) : (
                    <p>{aiCommentary}</p>
                  )}
                </div>
              )}
              {isAnswered && (
                <button
                  className="next-ball"
                  onClick={
                    nextBall
                  }
                  disabled={
                    isTransitioning ||
                    !animationComplete
                  }
                >
                  {currentQuestionIndex +
                    1 >=
                  Math.min(
                    questions.length,
                    totalBalls
                  )
                    ? "FINISH INNINGS"
                    : "NEXT BALL"}
                  <FaArrowRight />
                </button>
              )}
            </section>
          </div>
        )}
      </section>
      <footer className="run-rule">
        <span>
          <FaBolt />
          11–15s = 6 RUNS
        </span>
        <span>
          6–10s = 4 RUNS
        </span>
        <span>
          1–5s = 2 RUNS
        </span>
        <span>
          WRONG / TIMEOUT =
          WICKET
        </span>
      </footer>
    </main>
  );
}
export default function FirstInningsPage() {
  return (
    <InningsGamePage
      innings="first"
    />
  );
}
