import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaArrowRight,
  FaCoins,
  FaTrophy,
  FaHandPaper,
} from "react-icons/fa";
import { getMatchSetup, saveTossResult } from "../../firebase/firestore";
import "./TossPage.css";

interface Team {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  color: string;
}

type Choice = "heads" | "tails" | null;
type TossResult = "heads" | "tails" | null;
type Decision = "bat" | "bowl" | null;

export default function TossPage() {
  const navigate = useNavigate();
  const flipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [teamA, setTeamA] = useState<Team | null>(null);
  const [teamB, setTeamB] = useState<Team | null>(null);
  const [matchId, setMatchId] = useState("");
  const [selectedChoice, setSelectedChoice] = useState<Choice>(null);
  const [tossResult, setTossResult] = useState<TossResult>(null);
  const [flipOutcome, setFlipOutcome] = useState<"heads" | "tails">("heads");
  const [tossWinner, setTossWinner] = useState<Team | null>(null);
  const [decision, setDecision] = useState<Decision>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const savedMatchId = sessionStorage.getItem("matchId");
    const savedTeamA = sessionStorage.getItem("teamA");
    const savedTeamB = sessionStorage.getItem("teamB");

    if (!savedMatchId) {
      navigate("/match-setup");
      return;
    }

    setMatchId(savedMatchId);

    const loadMatch = async () => {
      try {
        const match = await getMatchSetup(savedMatchId);

        if (!match) {
          setError("Match setup not found. Please return to Match Setup.");
          return;
        }

        const firestoreTeamA: Team = {
          id: match.teamAId,
          name: match.teamAName,
          shortName: match.teamAName.substring(0, 3).toUpperCase(),
          logo: "",
          color: "#168cff",
        };

        const firestoreTeamB: Team = {
          id: match.teamBId,
          name: match.teamBName,
          shortName: match.teamBName.substring(0, 3).toUpperCase(),
          logo: "",
          color: "#ff3038",
        };

        if (savedTeamA && savedTeamB) {
          try {
            const parsedA = JSON.parse(savedTeamA) as Partial<Team>;
            const parsedB = JSON.parse(savedTeamB) as Partial<Team>;

            setTeamA({
              ...firestoreTeamA,
              ...parsedA,
              id: match.teamAId,
              name: match.teamAName,
            });

            setTeamB({
              ...firestoreTeamB,
              ...parsedB,
              id: match.teamBId,
              name: match.teamBName,
            });
            return;
          } catch {
            sessionStorage.removeItem("teamA");
            sessionStorage.removeItem("teamB");
          }
        }

        setTeamA(firestoreTeamA);
        setTeamB(firestoreTeamB);
        sessionStorage.setItem("teamA", JSON.stringify(firestoreTeamA));
        sessionStorage.setItem("teamB", JSON.stringify(firestoreTeamB));
      } catch (err) {
        console.error("Failed to load match setup:", err);
        setError("Unable to load match setup. Please try again.");
      }
    };

    void loadMatch();

    return () => {
      if (flipTimer.current) {
        clearTimeout(flipTimer.current);
      }
    };
  }, [navigate]);

  const selectChoice = (choice: Choice) => {
    if (isFlipping || tossResult || isSaving) return;
    setSelectedChoice(choice);
    setError("");
  };

  const startToss = () => {
    if (!selectedChoice) {
      setError("Please select HEADS or TAILS.");
      return;
    }

    if (!teamA || !teamB) {
      setError("Teams could not be loaded.");
      return;
    }

    if (isFlipping || isSaving) return;

    setError("");
    setIsFlipping(true);
    setTossResult(null);
    setTossWinner(null);
    setDecision(null);

    const result: TossResult = Math.random() < 0.5 ? "heads" : "tails";
    setFlipOutcome(result);

    flipTimer.current = setTimeout(() => {
      setTossResult(result);
      setIsFlipping(false);

      const winner = selectedChoice === result ? teamA : teamB;
      setTossWinner(winner);
    }, 3000);
  };

  const selectDecision = (value: Decision) => {
    if (!tossWinner || isFlipping || isSaving) return;
    setDecision(value);
    setError("");
  };

  const handleContinue = async () => {
    if (!tossWinner) {
      setError("Complete the toss first.");
      return;
    }

    if (!decision) {
      setError("Please choose BAT or BOWL.");
      return;
    }

    if (!tossResult || !selectedChoice || !teamA || !teamB || !matchId) {
      setError("Toss or match information is incomplete. Please restart the match.");
      return;
    }

    const otherTeam = tossWinner.id === teamA.id ? teamB : teamA;
    const battingTeam = decision === "bat" ? tossWinner : otherTeam;
    const bowlingTeam = decision === "bowl" ? tossWinner : otherTeam;

    setIsSaving(true);
    setError("");

    try {
      await saveTossResult({
        matchId,
        tossWinner: tossWinner.name,
        tossDecision: decision,
        battingTeam: battingTeam.name,
        bowlingTeam: bowlingTeam.name,
      });

      const tossData = {
        matchId,
        tossWinnerId: tossWinner.id,
        tossWinnerName: tossWinner.name,
        tossResult,
        selectedChoice,
        decision,
        battingTeamId: battingTeam.id,
        battingTeamName: battingTeam.name,
        bowlingTeamId: bowlingTeam.id,
        bowlingTeamName: bowlingTeam.name,
      };

      sessionStorage.setItem("tossData", JSON.stringify(tossData));
      sessionStorage.setItem("tossWinner", tossWinner.name);
      sessionStorage.setItem("battingTeam", battingTeam.name);
      sessionStorage.setItem("bowlingTeam", bowlingTeam.name);
      sessionStorage.setItem("battingTeamId", battingTeam.id);
      sessionStorage.setItem("bowlingTeamId", bowlingTeam.id);
      sessionStorage.setItem("currentInnings", "1");

      navigate("/question-bank");
    } catch (err) {
      console.error("Failed to save toss result:", err);
      setError("Failed to save toss result. Please try again.");
      setIsSaving(false);
    }
  };

  const coinClassName = [
    "coin",
    isFlipping ? `coin-flipping-${flipOutcome}` : "",
    !isFlipping && tossResult === "tails" ? "coin-show-tails" : "",
    !isFlipping && tossResult === "heads" ? "coin-show-heads" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <main className="toss-page">
      <div className="toss-background" />
      <div className="toss-overlay" />

      <header className="toss-header">
        <button
          className="toss-back-button"
          onClick={() => navigate("/match-setup")}
          disabled={isSaving || isFlipping}
          type="button"
        >
          <FaArrowLeft />
          <span>BACK</span>
        </button>

        <div className="toss-title">
          <div />
          <h1>TOSS</h1>
          <div />
        </div>

        <div className="toss-step">
          <strong>03</strong>
          <span>/ 08</span>
        </div>
      </header>

      <section className="toss-content">
        <p className="toss-subtitle">Time for the toss</p>

        <div className="toss-teams">
          <div
            className={`toss-team-card ${tossWinner?.id === teamA?.id ? "winner" : ""}`}
          >
            <div
              className="toss-team-logo"
              style={{ "--team-color": teamA?.color || "#168cff" } as CSSProperties}
            >
              {teamA?.logo && (teamA.logo.startsWith("http") || teamA.logo.startsWith("/")
                ? <img src={teamA.logo} alt={`${teamA.name} logo`} />
                : teamA.logo) || teamA?.shortName || "A"}
            </div>

            <div className="toss-team-info">
              <span>TEAM A</span>
              <h2>{teamA?.name || "Loading team..."}</h2>
            </div>

            {tossWinner?.id === teamA?.id && (
              <div className="winner-badge">
                <FaTrophy /> WINNER
              </div>
            )}
          </div>

          <div className="toss-vs">VS</div>

          <div
            className={`toss-team-card right ${tossWinner?.id === teamB?.id ? "winner" : ""}`}
          >
            {tossWinner?.id === teamB?.id && (
              <div className="winner-badge">
                <FaTrophy /> WINNER
              </div>
            )}

            <div className="toss-team-info">
              <span>TEAM B</span>
              <h2>{teamB?.name || "Loading team..."}</h2>
            </div>

            <div
              className="toss-team-logo"
              style={{ "--team-color": teamB?.color || "#ff3038" } as CSSProperties}
            >
              {teamB?.logo && (teamB.logo.startsWith("http") || teamB.logo.startsWith("/")
                ? <img src={teamB.logo} alt={`${teamB.name} logo`} />
                : teamB.logo) || teamB?.shortName || "B"}
            </div>
          </div>
        </div>

        <div className="toss-arena">
          <div className="toss-instruction">
            <FaCoins />
            <span>
              {isFlipping
                ? "THE COIN IS IN THE AIR..."
                : tossResult && tossWinner
                  ? `${tossWinner.name} WON THE TOSS`
                  : "CALL THE TOSS"}
            </span>
          </div>

          <div className="coin-scene" aria-live="polite">
            <div className={coinClassName}>
              <div className="coin-face coin-front">
                <span>H</span>
                <small>HEADS</small>
              </div>
              <div className="coin-face coin-back">
                <span>T</span>
                <small>TAILS</small>
              </div>
              {!isFlipping && !tossResult && (
                <div className="coin-question">?</div>
              )}
            </div>
          </div>

          {!tossResult && !isFlipping && (
            <div className="call-section">
              <p>Choose your call</p>
              <div className="call-buttons">
                <button
                  className={`call-button ${selectedChoice === "heads" ? "selected" : ""}`}
                  onClick={() => selectChoice("heads")}
                  disabled={isSaving}
                  type="button"
                >
                  <span className="mini-coin">H</span>
                  HEADS
                </button>

                <button
                  className={`call-button ${selectedChoice === "tails" ? "selected" : ""}`}
                  onClick={() => selectChoice("tails")}
                  disabled={isSaving}
                  type="button"
                >
                  <span className="mini-coin">T</span>
                  TAILS
                </button>
              </div>

              <button
                className="flip-button"
                onClick={startToss}
                disabled={isSaving || !teamA || !teamB}
                type="button"
              >
                <FaCoins />
                TOSS THE COIN
              </button>
            </div>
          )}

          {tossResult && tossWinner && (
            <div className="toss-decision">
              <div className="result-message">
                <strong>{tossWinner.name}</strong>
                <span>won the toss</span>
              </div>

              <p>What do you want to do?</p>

              <div className="decision-buttons">
                <button
                  className={`decision-button bat ${decision === "bat" ? "selected" : ""}`}
                  onClick={() => selectDecision("bat")}
                  disabled={isSaving}
                  type="button"
                >
                  🏏 <span>BAT FIRST</span>
                </button>

                <button
                  className={`decision-button bowl ${decision === "bowl" ? "selected" : ""}`}
                  onClick={() => selectDecision("bowl")}
                  disabled={isSaving}
                  type="button"
                >
                  <FaHandPaper /> <span>BOWL FIRST</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {error && <div className="toss-error" role="alert">{error}</div>}

        {tossResult && tossWinner && decision && (
          <button
            className="continue-toss-button"
            onClick={handleContinue}
            disabled={isSaving}
            type="button"
          >
            <span>{isSaving ? "SAVING TOSS..." : "CONTINUE TO QUESTION BANK"}</span>
            <div />
            <FaArrowRight />
          </button>
        )}
      </section>

      <footer className="toss-footer">
        CRICKET QUIZ ARENA <span>•</span> TOSS
      </footer>
    </main>
  );
}
