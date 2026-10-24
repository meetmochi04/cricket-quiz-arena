import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../firebase/firebase";
import {
  FaArrowLeft,
  FaHome,
  FaHistory,
  FaTrophy,
  FaBullseye,
  FaCheckCircle,
} from "react-icons/fa";
import "./MatchResult.css";

interface InningsScore {
  runs: number;
  wickets: number;
  balls: number;
}

interface Team {
  id?: string;
  name: string;
  shortName?: string;
  logo?: string;
}

interface Teams {
  teamA: Team;
  teamB: Team;
}

interface MatchSetup {
  overs: number;
  playersPerTeam?: number;
  questionCount?: number;
}

export default function MatchResultPage() {
  const navigate = useNavigate();

  const [firstInnings, setFirstInnings] =
    useState<InningsScore | null>(null);

  const [secondInnings, setSecondInnings] =
    useState<InningsScore | null>(null);

  const [teams, setTeams] =
    useState<Teams | null>(null);

  const [setup, setSetup] =
    useState<MatchSetup | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [saved, setSaved] =
    useState(false);

  const [saveError, setSaveError] =
    useState("");

  useEffect(() => {
    try {
      const savedFirst =
        sessionStorage.getItem("firstInnings");

      const savedSecond =
        sessionStorage.getItem("secondInnings");

      const savedTeams =
        sessionStorage.getItem("selectedTeams");

      const savedSetup =
        sessionStorage.getItem("matchSetup");

      if (!savedFirst || !savedSecond) {
        navigate("/second-innings");
        return;
      }

      const first =
        JSON.parse(savedFirst);

      const second =
        JSON.parse(savedSecond);

      setFirstInnings(first);
      setSecondInnings(second);

      if (savedTeams) {
        setTeams(JSON.parse(savedTeams));
      }

      if (savedSetup) {
        setSetup(JSON.parse(savedSetup));
      }
    } catch (error) {
      console.error(
        "Unable to load match result:",
        error
      );

      navigate("/second-innings");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const handleSaveMatch = async () => {
    if (
      saving ||
      saved ||
      !firstInnings ||
      !secondInnings ||
      !teams ||
      !matchResult
    ) {
      return;
    }

    try {
      setSaving(true);
      setSaveError("");

      const currentUser = auth.currentUser;

      const matchData = {
        status: "completed",

        teacherId: currentUser?.uid || null,
        teacherEmail: currentUser?.email || null,

        teamA: {
          id: teams.teamA.id || null,
          name: teams.teamA.name,
          shortName: teams.teamA.shortName || null,
          logo: teams.teamA.logo || null,
          score: firstInnings.runs,
          wickets: firstInnings.wickets,
          balls: firstInnings.balls,
        },

        teamB: {
          id: teams.teamB.id || null,
          name: teams.teamB.name,
          shortName: teams.teamB.shortName || null,
          logo: teams.teamB.logo || null,
          score: secondInnings.runs,
          wickets: secondInnings.wickets,
          balls: secondInnings.balls,
        },

        firstInnings,
        secondInnings,

        winner: {
          team: matchResult.winnerTeam,
          name: matchResult.winner,
          title: matchResult.title,
          margin: matchResult.margin,
        },

        target,
        overs: setup?.overs || 0,
        playersPerTeam: setup?.playersPerTeam || 0,
        questionCount: totalQuestions,

        createdAt: serverTimestamp(),
      };

      const matchRef = await addDoc(
        collection(db, "matches"),
        matchData
      );

      sessionStorage.setItem("matchCompleted", "true");
      sessionStorage.setItem("savedMatchId", matchRef.id);

      setSaved(true);
      navigate("/history");
    } catch (error) {
      console.error("Unable to save match:", error);
      setSaveError(
        "Match save nahi thai. Firebase connection ane Firestore permissions check karo."
      );
    } finally {
      setSaving(false);
    }
  };

  const target = useMemo(() => {
    if (!firstInnings) return 0;

    return firstInnings.runs + 1;
  }, [firstInnings]);

  const matchResult = useMemo(() => {
    if (
      !firstInnings ||
      !secondInnings ||
      !teams
    ) {
      return null;
    }

    /*
      SECOND INNINGS REACHED TARGET
    */

    if (secondInnings.runs >= target) {
      const wicketsRemaining =
        Math.max(
          0,
          (setup?.playersPerTeam || 7) -
            secondInnings.wickets
        );

      return {
        winner: teams.teamB.name,
        winnerTeam: "teamB",
        title: `${teams.teamB.name} WON`,
        subtitle: `BY ${wicketsRemaining} WICKET${
          wicketsRemaining === 1
            ? ""
            : "S"
        }`,
        margin: `${wicketsRemaining} WICKET${
          wicketsRemaining === 1
            ? ""
            : "S"
        }`,
      };
    }

    /*
      FIRST INNINGS TEAM WON
    */

    const runDifference =
      firstInnings.runs -
      secondInnings.runs;

    return {
      winner: teams.teamA.name,
      winnerTeam: "teamA",
      title: `${teams.teamA.name} WON`,
      subtitle: `BY ${runDifference} RUN${
        runDifference === 1
          ? ""
          : "S"
      }`,
      margin: `${runDifference} RUN${
        runDifference === 1
          ? ""
          : "S"
      }`,
    };
  }, [
    firstInnings,
    secondInnings,
    teams,
    target,
    setup,
  ]);

  const firstOvers = firstInnings
    ? `${Math.floor(firstInnings.balls / 6)}.${firstInnings.balls % 6}`
    : "0.0";

  const secondOvers = secondInnings
    ? `${Math.floor(secondInnings.balls / 6)}.${secondInnings.balls % 6}`
    : "0.0";

  const totalQuestions =
    setup?.questionCount ||
    (setup?.overs || 0) * 6;

  if (loading) {
    return (
      <main className="match-result-page loading">
        <div className="result-loading">
          Loading match summary...
        </div>
      </main>
    );
  }

  if (
    !firstInnings ||
    !secondInnings ||
    !teams ||
    !matchResult
  ) {
    return (
      <main className="match-result-page loading">
        <div className="result-loading">
          Match result unavailable.
        </div>
      </main>
    );
  }

  return (
    <main className="match-result-page">

      {/* BACKGROUND */}

      <div className="result-background">
        <div className="result-glow glow-one" />
        <div className="result-glow glow-two" />
      </div>

      {/* HEADER */}

      <header className="result-header">

        <button
          className="result-back-button"
          onClick={() =>
            navigate("/second-innings")
          }
        >
          <FaArrowLeft />
          <span>BACK</span>
        </button>

        <div className="result-title">
          <span>MATCH</span>
          <h1>SUMMARY</h1>
        </div>

        <div className="result-completed">
          <FaCheckCircle />
          COMPLETED
        </div>

      </header>

      {/* MAIN */}

      <section className="result-content">

        {/* TROPHY */}

        <div className="result-trophy">
          <div className="trophy-circle">
            <FaTrophy />
          </div>

          <span>MATCH COMPLETED</span>
        </div>

        {/* WINNER */}

        <div className="winner-section">

          <small>WINNER</small>

          <h2>
            {matchResult.winner}
          </h2>

          <strong>
            {matchResult.subtitle}
          </strong>

        </div>

        {/* SCORECARD */}

        <div className="final-scorecard">

          {/* TEAM A */}

          <div
            className={`final-team ${
              matchResult.winnerTeam ===
              "teamA"
                ? "winner"
                : ""
            }`}
          >

            <div className="team-logo">
              <span>
                {(teams.teamA.shortName || teams.teamA.name)
                  .trim()
                  .slice(0, 3)
                  .toUpperCase()}
              </span>
            </div>

            <div className="team-info">

              <span>
                {teams.teamA.name}
              </span>

              <strong>
                {firstInnings.runs}
                <small>
                  /
                  {firstInnings.wickets}
                </small>
              </strong>

              <em>
                {firstOvers} OVERS
              </em>

            </div>

            {matchResult.winnerTeam ===
              "teamA" && (
              <div className="winner-badge">
                <FaTrophy />
                WINNER
              </div>
            )}

          </div>

          {/* VS */}

          <div className="versus">
            <span>VS</span>
          </div>

          {/* TEAM B */}

          <div
            className={`final-team ${
              matchResult.winnerTeam ===
              "teamB"
                ? "winner"
                : ""
            }`}
          >

            <div className="team-logo">
              <span>
                {(teams.teamB.shortName || teams.teamB.name)
                  .trim()
                  .slice(0, 3)
                  .toUpperCase()}
              </span>
            </div>

            <div className="team-info">

              <span>
                {teams.teamB.name}
              </span>

              <strong>
                {secondInnings.runs}
                <small>
                  /
                  {secondInnings.wickets}
                </small>
              </strong>

              <em>
                {secondOvers} OVERS
              </em>

            </div>

            {matchResult.winnerTeam ===
              "teamB" && (
              <div className="winner-badge">
                <FaTrophy />
                WINNER
              </div>
            )}

          </div>

        </div>

        {/* RESULT STRIP */}

        <div className="result-strip">

          <FaTrophy />

          <div>
            <small>MATCH RESULT</small>

            <strong>
              {matchResult.title}{" "}
              {matchResult.subtitle}
            </strong>
          </div>

        </div>

        {/* MATCH STATS */}

        <div className="match-stats">

          <div className="stat-card">

            <FaBullseye />

            <span>TARGET</span>

            <strong>
              {target}
            </strong>

            <small>RUNS</small>

          </div>

          <div className="stat-card">

            <FaTrophy />

            <span>WIN MARGIN</span>

            <strong>
              {matchResult.margin
                .split(" ")[0]}
            </strong>

            <small>
              {matchResult.margin
                .split(" ")
                .slice(1)
                .join(" ")}
            </small>

          </div>

          <div className="stat-card">

            <span>OVERS</span>

            <strong>
              {setup?.overs || 0}
            </strong>

            <small>PER INNINGS</small>

          </div>

          <div className="stat-card">

            <span>QUESTIONS</span>

            <strong>
              {totalQuestions}
            </strong>

            <small>TOTAL</small>

          </div>

        </div>

        {/* MATCH DETAILS */}

        <div className="match-details">

          <div className="details-heading">
            MATCH DETAILS
          </div>

          <div className="details-grid">

            <div>
              <span>WINNER</span>
              <strong>
                {matchResult.winner}
              </strong>
            </div>

            <div>
              <span>FIRST INNINGS</span>
              <strong>
                {firstInnings.runs}/
                {firstInnings.wickets}
              </strong>
            </div>

            <div>
              <span>SECOND INNINGS</span>
              <strong>
                {secondInnings.runs}/
                {secondInnings.wickets}
              </strong>
            </div>

            <div>
              <span>TARGET</span>
              <strong>
                {target} RUNS
              </strong>
            </div>

            <div>
              <span>FIRST OVERS</span>
              <strong>
                {firstOvers}
              </strong>
            </div>

            <div>
              <span>SECOND OVERS</span>
              <strong>
                {secondOvers}
              </strong>
            </div>

          </div>

        </div>

        {/* ACTIONS */}

        {saveError && (
          <div className="save-error" role="alert">
            {saveError}
          </div>
        )}

        <div className="result-actions">

          <button
            className={`save-result-button ${
              saving ? "saving" : ""
            } ${saved ? "saved" : ""}`}
            onClick={handleSaveMatch}
            disabled={saving || saved}
          >
            <FaCheckCircle />
            {saving
              ? "SAVING..."
              : saved
              ? "MATCH SAVED"
              : "SAVE MATCH"}
          </button>

          <button
            className="history-button"
            onClick={() => navigate("/history")}
            disabled={saving}
          >
            <FaHistory />
            MATCH HISTORY
          </button>

          <button
            className="home-button"
            onClick={() => navigate("/")}
            disabled={saving}
          >
            <FaHome />
            HOME
          </button>

        </div>

      </section>

      {/* FOOTER */}

      <footer className="result-footer">
        CRICKET QUIZ ARENA
        <span>•</span>
        MATCH SUMMARY
      </footer>

    </main>
  );
}