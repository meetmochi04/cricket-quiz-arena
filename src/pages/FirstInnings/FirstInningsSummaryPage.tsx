import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowRight,
  FaBullseye,
  FaTrophy,
} from "react-icons/fa";
import "./FirstInningsSummary.css";

interface InningsScore {
  runs: number;
  wickets: number;
  balls: number;
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

export default function FirstInningsSummaryPage() {
  const navigate = useNavigate();

  const [score, setScore] =
    useState<InningsScore | null>(null);

  const [teams, setTeams] =
    useState<Teams | null>(null);

  const [overs, setOvers] = useState(2);

  useEffect(() => {
    const saved =
      sessionStorage.getItem("firstInnings");

    const savedTeams =
      sessionStorage.getItem("selectedTeams");

    const savedSetup =
      sessionStorage.getItem("matchSetup");

    if (!saved) {
      navigate("/first-innings");
      return;
    }

    try {
      setScore(JSON.parse(saved));

      if (savedTeams) {
        setTeams(JSON.parse(savedTeams));
      }

      if (savedSetup) {
        setOvers(
          Number(
            JSON.parse(savedSetup).overs || 2
          )
        );
      }
    } catch {
      navigate("/first-innings");
    }
  }, [navigate]);

  if (!score) {
    return (
      <div className="innings-summary loading">
        Loading innings summary...
      </div>
    );
  }

  const target = score.runs + 1;

  const ballsLeft = Math.max(
    0,
    overs * 6 - score.balls
  );

  return (
    <main className="innings-summary">

      <div className="summary-bg">
        <div className="summary-glow glow-one" />
        <div className="summary-glow glow-two" />
      </div>

      <section className="summary-card">

        <div className="summary-kicker">
          <FaTrophy />
          FIRST INNINGS COMPLETE
        </div>

        <h1>
          {teams?.teamA?.name || "TEAM A"} FINISHED
        </h1>

        <div className="big-score">
          <strong>{score.runs}</strong>
          <span>/{score.wickets}</span>
        </div>

        <div className="score-caption">
          {Math.floor(score.balls / 6)}.
          {score.balls % 6} OVERS PLAYED
        </div>

        <div className="summary-grid">

          <div>
            <small>
              TARGET FOR{" "}
              {teams?.teamB?.name || "TEAM B"}
            </small>

            <b>{target} RUNS</b>
          </div>

          <div>
            <small>BALLS AVAILABLE</small>
            <b>{ballsLeft}</b>
          </div>

          <div>
            <small>RUNS NEEDED TO WIN</small>
            <b>{target}</b>
          </div>

        </div>

        <div className="target-strip">

          <FaBullseye />

          <div>
            <small>
              {teams?.teamB?.name || "TEAM B"} NEEDS
            </small>

            <strong>
              {target} RUNS IN {ballsLeft} BALLS
            </strong>
          </div>

        </div>

        {/* SECOND INNINGS → NEW WORD QUESTION BANK */}

        <button
          className="start-second"
          onClick={() =>
            navigate("/question-bank?innings=second")
          }
        >
          START SECOND INNINGS
          <FaArrowRight />
        </button>

      </section>

    </main>
  );
}