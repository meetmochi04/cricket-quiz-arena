import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaUsers, FaSignOutAlt, FaUser, FaHistory } from "react-icons/fa";
import { observeAuth, getTeacherName, logoutTeacher } from "../../firebase/auth";

import "./HomePage.css";

export default function HomePage() {
  const navigate = useNavigate();

  const [teacherName, setTeacherName] = useState("Teacher");
  const [loading, setLoading] = useState(true);
  const [showTerms, setShowTerms] = useState(false);
  const [showGameTerms, setShowGameTerms] = useState(false);

  // =========================================
  // LOAD LOGGED-IN TEACHER NAME
  // =========================================
  useEffect(() => {
    const unsubscribe = observeAuth(async (user) => {
      if (!user) {
        navigate("/login", { replace: true });
        return;
      }

      try {
        // First check sessionStorage
        const savedName = sessionStorage.getItem("teacherName");

        if (savedName) {
          setTeacherName(savedName);
        } else {
          // Get name from Firebase / Firestore
          const name = await getTeacherName(user);

          setTeacherName(name);

          sessionStorage.setItem(
            "teacherName",
            name
          );
        }
      } catch (error) {
        console.error(
          "Unable to load teacher name:",
          error
        );

        setTeacherName(
          user.displayName || "Teacher"
        );
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // =========================================
  // CREATE MATCH
  // =========================================
  const handleCreateMatch = () => {
    navigate("/team-selection");
  };

  // =========================================
  // LOGOUT
  // =========================================
  const handleQuit = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to logout from Cricket Quiz Arena?"
    );

    if (!confirmed) return;

    try {
      await logoutTeacher();

      sessionStorage.removeItem("teacherName");
      sessionStorage.removeItem("playerName");

      navigate("/login", {
        replace: true,
      });
    } catch (error) {
      console.error("Logout error:", error);

      alert("Unable to logout. Please try again.");
    }
  };

  return (
    <main className="main-home">

      {/* =========================================
          STADIUM BACKGROUND
      ========================================= */}
      <div className="stadium-background" />

      <div className="stadium-dark-overlay" />

      {/* =========================================
          MAIN HOME PANEL
      ========================================= */}
      <section className="home-panel">

        {/* =========================================
            LOGO
        ========================================= */}
        <div className="logo-section">

          <h1 className="logo-title">

            <span className="logo-cricket">
              CRICKET
            </span>

            <span className="logo-quiz">
              QUIZ
            </span>

            <span className="logo-arena">
              ARENA
            </span>

          </h1>

          <div className="logo-ball">
            🏏
          </div>

        </div>

        {/* =========================================
            SUBTITLE
        ========================================= */}
        <div className="subtitle-wrapper">

          <span className="subtitle-line" />

          <p>
            Test your cricket knowledge!
          </p>

          <span className="subtitle-line" />

        </div>

        {/* =========================================
            TEACHER WELCOME CARD
        ========================================= */}
        <div className="teacher-welcome-card">

          <div className="teacher-avatar">
            <FaUser />
          </div>

          <div className="teacher-info">

            <span>
              WELCOME BACK
            </span>

            {!loading && (
              <h2>
                {teacherName}
              </h2>
            )}

            {loading && (
              <h2>
                Loading...
              </h2>
            )}

            <small>
              TEACHER
            </small>

          </div>

        </div>

        {/* =========================================
            ACTION BUTTONS
        ========================================= */}
        <div className="action-buttons">

          {/* CREATE MATCH */}
          <button
            className="create-match-button"
            onClick={handleCreateMatch}
          >

            <span className="button-icon">
              <FaUsers />
            </span>

            <span className="button-text">
              CREATE MATCH
            </span>

          </button>

          {/* MATCH HISTORY */}
          <button
            className="match-history-button"
            onClick={() => navigate("/history")}
            type="button"
          >
            <span className="button-icon">
              <FaHistory />
            </span>
            <span className="button-text">
              MATCH HISTORY
            </span>
          </button>

          {/* QUIT / LOGOUT */}
          <button
            className="quit-button"
            onClick={handleQuit}
          >

            <span className="button-icon">
              <FaSignOutAlt />
            </span>

            <span className="button-text">
              LOGOUT
            </span>

          </button>

        </div>

        {/* =========================================
            FOOTER
        ========================================= */}
        <div className="version-text">
          CRICKET QUIZ ARENA • 3D EXPERIENCE
        </div>

        <div className="terms-links-row">
          <button
            type="button"
            className="terms-link"
            onClick={() => setShowTerms(true)}
          >
            Terms &amp; Conditions
          </button>
          <span className="terms-link-separator">|</span>
          <button
            type="button"
            className="terms-link"
            onClick={() => setShowGameTerms(true)}
          >
            Game Rules &amp; Scoring
          </button>
        </div>

      </section>

      {showTerms && (
        <div
          className="terms-modal-overlay"
          role="presentation"
          onClick={() => setShowTerms(false)}
        >
          <section
            className="terms-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="terms-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="terms-modal-header">
              <div>
                <span className="terms-eyebrow">CRICKET QUIZ ARENA</span>
                <h2 id="terms-title">Terms &amp; Conditions</h2>
              </div>
              <button
                type="button"
                className="terms-close-button"
                aria-label="Close Terms and Conditions"
                onClick={() => setShowTerms(false)}
              >
                ×
              </button>
            </div>

            <div className="terms-modal-content">
              <p>
                By accessing or using Cricket Quiz Arena, you agree to follow
                these Terms &amp; Conditions.
              </p>

              <h3>1. Account Responsibility</h3>
              <p>
                Keep your login details secure. You are responsible for activity
                carried out through your account. Do not use another person’s
                account without permission.
              </p>

              <h3>2. Fair Play</h3>
              <p>
                Use the quiz honestly. Do not attempt to manipulate scores,
                exploit bugs, disrupt matches, or access another user’s data.
              </p>

              <h3>3. Teams, Questions and Matches</h3>
              <p>
                You are responsible for the teams and quiz content you create.
                Make sure names and content are appropriate and that you have
                permission to use any logos or material you upload.
              </p>

              <h3>4. Scores and Results</h3>
              <p>
                Scores and results are intended for gameplay and learning.
                Technical issues or corrections may affect displayed results.
              </p>

              <h3>5. Privacy and Data</h3>
              <p>
                The app uses account and gameplay data to provide its features.
                Do not enter sensitive personal information into team names,
                questions, or other content fields. Access to data should follow
                the app’s configured permissions.
              </p>

              <h3>6. Acceptable Use</h3>
              <p>
                Do not misuse the app, interfere with its operation, upload
                harmful content, or try to access systems or data without
                authorization.
              </p>

              <h3>7. Availability and Changes</h3>
              <p>
                Features may be updated, changed, or temporarily unavailable
                during maintenance. These terms may also be updated as the app
                evolves.
              </p>

              <h3>8. Contact</h3>
              <p>
                If you have a question about these terms, contact the person
                or organization that manages your Cricket Quiz Arena deployment.
              </p>
            </div>

            <div className="terms-modal-actions">
              <button
                type="button"
                onClick={() => setShowTerms(false)}
              >
                I UNDERSTAND
              </button>
            </div>
          </section>
        </div>
      )}

      {showGameTerms && (
        <div
          className="terms-modal-overlay"
          role="presentation"
          onClick={() => setShowGameTerms(false)}
        >
          <section
            className="terms-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="game-terms-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="terms-modal-header">
              <div>
                <span className="terms-eyebrow">CRICKET QUIZ ARENA</span>
                <h2 id="game-terms-title">Game Rules &amp; Scoring</h2>
              </div>
              <button
                type="button"
                className="terms-close-button"
                aria-label="Close Game Rules and Scoring"
                onClick={() => setShowGameTerms(false)}
              >
                ×
              </button>
            </div>

            <div className="terms-modal-content">
              <p>
                Cricket Quiz Arena combines cricket gameplay with quiz questions.
                The match scoreboard records runs, wickets, overs/balls and the
                innings result according to the game’s configured match rules.
              </p>

              <h3>1. Create a Match</h3>
              <p>
                The teacher selects two teams and starts the match. The team
                batting first plays its innings before the second team gets its
                turn to chase the target.
              </p>

              <h3>2. 15-Second Question Timer</h3>
              <p>
                Every question has a 15-second timer. The player must select an
                answer before the timer reaches zero. Runs depend on how quickly
                the player submits a correct answer:
              </p>
              <ul className="game-rules-list">
                <li><strong>11–15 seconds: Six (6) runs</strong> for a correct answer.</li>
                <li><strong>6–10 seconds: Four (4) runs</strong> for a correct answer.</li>
                <li><strong>1–5 seconds: Two (2) runs</strong> for a correct answer.</li>
              </ul>
              <p>
                The time band is based on the remaining time when the correct
                answer is submitted. Answering faster earns the run value for
                that time band.
              </p>

              <h3>3. Wrong Answer and Time Up</h3>
              <ul className="game-rules-list">
                <li><strong>Wrong answer:</strong> the batting team loses one wicket.</li>
                <li><strong>Time up (15 seconds expire):</strong> if no answer is submitted in time, the batting team loses one wicket.</li>
                <li><strong>One delivery:</strong> a question counts as one delivery. Do not count a single wrong answer or timeout as more than one wicket.</li>
              </ul>
              <p>
                A wicket does not add runs. The batting team’s wicket total
                increases by one for each wrong answer or unanswered question
                when time expires.
              </p>

              <h3>4. Overs and Innings</h3>
              <p>
                Each question is one delivery. Six deliveries make one over, so
                the over count advances after every six questions/deliveries.
                An innings ends when its configured over/ball limit is reached
                or the batting team has lost all available wickets, according to
                the match settings.
              </p>

              <h3>5. Second Innings and Target</h3>
              <p>
                After the first innings ends, the second team bats. Its target is
                the first team’s total plus one run. For example, if the first
                team scores 45, the chasing team needs 46 runs to win. The chase
                ends when the target is reached or the innings ends under the
                match’s configured limits. If the scores are level at the end,
                the match is a tie unless a tie-break rule is configured.
              </p>

              <h3>6. Winner and Final Score</h3>
              <p>
                The team that reaches the target wins. If the chasing team does
                not reach the target, the first-innings team wins. The final
                scoreboard displays the recorded runs, wickets and innings
                result. Any overs, ball limits or dismissal rules configured in
                the game take priority where they differ from these general
                explanations.
              </p>

              <h3>7. Fair Play and Technical Issues</h3>
              <p>
                Players should answer honestly and should not manipulate the
                scoreboard. If a display or connection problem occurs, the
                teacher should review the match state before continuing.
              </p>
            </div>

            <div className="terms-modal-actions">
              <button type="button" onClick={() => setShowGameTerms(false)}>
                GOT IT
              </button>
            </div>
          </section>
        </div>
      )}

    </main>
  );
}