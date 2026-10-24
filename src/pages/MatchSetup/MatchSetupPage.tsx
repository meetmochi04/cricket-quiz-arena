import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  FaArrowLeft,
  FaArrowRight,
  FaUsers,
  FaSyncAlt,
  FaInfoCircle,
} from "react-icons/fa";

import { saveMatchSetup } from "../../firebase/firestore";
import "./MatchSetup.css";
interface Team {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  color: string;
}

export default function MatchSetupPage() {
  const navigate = useNavigate();

  const [teamA, setTeamA] =
    useState<Team | null>(null);

  const [teamB, setTeamB] =
    useState<Team | null>(null);

  const [playersPerTeam, setPlayersPerTeam] =
    useState(7);

  const [overs, setOvers] =
    useState(2);

  const [error, setError] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  // ======================================================
  // LOAD SELECTED TEAMS
  // ======================================================

  useEffect(() => {
    const savedTeamA =
      sessionStorage.getItem("teamA");

    const savedTeamB =
      sessionStorage.getItem("teamB");

    if (!savedTeamA || !savedTeamB) {
      navigate("/team-selection");
      return;
    }

    try {
      const parsedTeamA =
        JSON.parse(savedTeamA);

      const parsedTeamB =
        JSON.parse(savedTeamB);

      setTeamA(parsedTeamA);
      setTeamB(parsedTeamB);
    } catch (err) {
      console.error(
        "Error reading selected teams:",
        err
      );

      setError(
        "Unable to load selected teams."
      );

      navigate("/team-selection");
    }
  }, [navigate]);

  // ======================================================
  // CONTINUE
  // ======================================================

  const handleContinue = async () => {
    if (!teamA || !teamB) {
      setError(
        "Please select both teams."
      );
      return;
    }

    if (teamA.id === teamB.id) {
      setError(
        "Both teams must be different."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      // ==================================================
      // TOTAL QUESTIONS
      // 1 OVER = 6 QUESTIONS
      // ==================================================

      const totalQuestions =
        overs * 6;

      // ==================================================
      // SAVE MATCH SETUP TO FIRESTORE
      // ==================================================

      const matchId =
        await saveMatchSetup({
          teamAId: teamA.id,
          teamAName: teamA.name,

          teamBId: teamB.id,
          teamBName: teamB.name,

          playersPerTeam,

          overs,

          questionCount:
            totalQuestions,

          answerTime: 15,
        });

      // ==================================================
      // SAVE MATCH ID
      // ==================================================

      sessionStorage.setItem(
        "matchId",
        matchId
      );

      // ==================================================
      // SAVE MATCH SETUP IN SESSION
      // ==================================================

      const matchSetup = {
        matchId,

        teamA,
        teamB,

        playersPerTeam,

        overs,

        totalQuestions,

        answerTime: 15,
      };

      sessionStorage.setItem(
        "matchSetup",
        JSON.stringify(matchSetup)
      );

      // ==================================================
      // CLEAR OLD MATCH DATA
      // ==================================================

      sessionStorage.removeItem(
        "tossWinner"
      );

      sessionStorage.removeItem(
        "tossDecision"
      );

      sessionStorage.removeItem(
        "battingTeam"
      );

      sessionStorage.removeItem(
        "bowlingTeam"
      );

      sessionStorage.removeItem(
        "firstInningsScore"
      );

      sessionStorage.removeItem(
        "secondInningsScore"
      );

      // ==================================================
      // GO TO TOSS
      // ==================================================

      navigate("/toss");

    } catch (err) {
      console.error(
        "Error saving match setup:",
        err
      );

      setError(
        "Unable to save match setup. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // ======================================================
  // BACK
  // ======================================================

  const handleBack = () => {
    if (saving) {
      return;
    }

    navigate("/team-selection");
  };

  return (
    <main className="match-setup-page">

      <div className="setup-background" />

      <div className="setup-overlay" />

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="setup-header">

        <button
          className="setup-back-button"
          onClick={handleBack}
          disabled={saving}
        >
          <FaArrowLeft />

          <span>
            BACK
          </span>
        </button>

        <div className="setup-title">

          <div />

          <h1>
            MATCH SETUP
          </h1>

          <div />

        </div>

        <div className="setup-step">

          <strong>
            02
          </strong>

          <span>
            / 08
          </span>

        </div>

      </header>

      {/* =================================================
          MAIN
      ================================================= */}

      <section className="setup-content">

        <p className="setup-subtitle">
          Configure your match before the toss
        </p>

        {/* =================================================
            SELECTED TEAMS
        ================================================= */}

        <div className="selected-teams">

          {/* TEAM A */}

          <div className="selected-team">

            <div
              className="selected-team-logo"
              style={{
                "--team-color":
                  teamA?.color ||
                  "#168cff",
              } as React.CSSProperties}
            >
              {teamA?.logo}
            </div>

            <div>

              <small>
                TEAM A
              </small>

              <h2>
                {teamA?.name ||
                  "TEAM A"}
              </h2>

            </div>

          </div>

          {/* VS */}

          <div className="setup-vs">
            VS
          </div>

          {/* TEAM B */}

          <div className="selected-team right">

            <div>

              <small>
                TEAM B
              </small>

              <h2>
                {teamB?.name ||
                  "TEAM B"}
              </h2>

            </div>

            <div
              className="selected-team-logo"
              style={{
                "--team-color":
                  teamB?.color ||
                  "#ff3038",
              } as React.CSSProperties}
            >
              {teamB?.logo}
            </div>

          </div>

        </div>

        {/* =================================================
            SETTINGS
        ================================================= */}

        <div className="setup-grid">

          {/* =================================================
              PLAYERS
          ================================================= */}

          <div className="setup-card">

            <div className="setup-card-icon blue">

              <FaUsers />

            </div>

            <div className="setup-card-title">

              <h3>
                PLAYERS PER TEAM
              </h3>

              <p>
                Select the number of players
              </p>

            </div>

            <div className="number-selector">

              <button
                onClick={() =>
                  setPlayersPerTeam(
                    Math.max(
                      2,
                      playersPerTeam - 1
                    )
                  )
                }
                disabled={saving}
              >
                −
              </button>

              <strong>
                {playersPerTeam}
              </strong>

              <button
                onClick={() =>
                  setPlayersPerTeam(
                    Math.min(
                      11,
                      playersPerTeam + 1
                    )
                  )
                }
                disabled={saving}
              >
                +
              </button>

            </div>

            <span className="range-text">
              Minimum 2 • Maximum 11 players
            </span>

          </div>

          {/* =================================================
              OVERS
          ================================================= */}

          <div className="setup-card">

            <div className="setup-card-icon gold">

              <FaSyncAlt />

            </div>

            <div className="setup-card-title">

              <h3>
                NUMBER OF OVERS
              </h3>

              <p>
                Six questions in every over
              </p>

            </div>

            <div className="number-selector">

              <button
                onClick={() =>
                  setOvers(
                    Math.max(
                      2,
                      overs - 1
                    )
                  )
                }
                disabled={saving}
              >
                −
              </button>

              <strong>
                {overs}
              </strong>

              <button
                onClick={() =>
                  setOvers(
                    Math.min(
                      5,
                      overs + 1
                    )
                  )
                }
                disabled={saving}
              >
                +
              </button>

            </div>

            <span className="range-text">
              2–5 overs •{" "}
              {overs * 6} questions
            </span>

          </div>

        </div>

        {/* =================================================
            MATCH INFORMATION
        ================================================= */}

        <div className="setup-information">

          <FaInfoCircle />

          <div>

            <strong>
              Match Rules
            </strong>

            <span>
              {playersPerTeam} players per team •{" "}
              {overs} overs •{" "}
              {overs * 6} questions •{" "}
              15 seconds per question
            </span>

          </div>

        </div>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="setup-error">
            {error}
          </div>
        )}

        {/* =================================================
            CONTINUE
        ================================================= */}

        <button
          className="continue-setup-button"
          onClick={handleContinue}
          disabled={
            saving ||
            !teamA ||
            !teamB
          }
        >

          <span>
            {saving
              ? "SAVING..."
              : "CONTINUE TO TOSS"}
          </span>

          <div />

          {!saving && (
            <FaArrowRight />
          )}

        </button>

      </section>

      {/* =================================================
          FOOTER
      ================================================= */}

      <footer className="setup-footer">

        CRICKET QUIZ ARENA

        <span>
          •
        </span>

        MATCH CONFIGURATION

      </footer>

    </main>
  );
}