import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  FaUsers,
  FaUserTie,
  FaTrophy,
  FaQuestionCircle,
  FaFutbol,
  FaCheckCircle,
  FaArrowLeft,
  FaSyncAlt,
  FaShieldAlt,
} from "react-icons/fa";

import { observeAuth } from "../../firebase/auth";

import {
  getAdminStats,
  getTeacherProfile,
  type AdminStats,
} from "../../firebase/firestore";

import "./AdminPage.css";


export default function AdminPage() {
  const navigate = useNavigate();

  const [stats, setStats] = useState<AdminStats>({
    teachers: 0,
    users: 0,
    teams: 0,
    questionBanks: 0,
    matches: 0,
    completedMatches: 0,
  });

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);


  // ======================================================
  // CHECK ADMIN LOGIN
  // ======================================================

  useEffect(() => {
    const unsubscribe = observeAuth(async (user) => {
      if (!user) {
        navigate("/login", { replace: true });
        return;
      }

      try {
        const profile = await getTeacherProfile(user.uid);

        if (!profile || profile.role !== "admin") {
          setAuthorized(false);
          setLoading(false);

          alert("Access denied. Admin account required.");

          navigate("/", { replace: true });
          return;
        }

        setAuthorized(true);

        await loadStats();
      } catch (error) {
        console.error("Admin authentication error:", error);

        alert("Unable to verify admin account.");

        navigate("/", { replace: true });
      }
    });

    return () => unsubscribe();
  }, [navigate]);


  // ======================================================
  // LOAD DASHBOARD STATS
  // ======================================================

  const loadStats = async () => {
    try {
      setLoading(true);

      const data = await getAdminStats();

      setStats(data);
    } catch (error) {
      console.error("Failed to load admin stats:", error);
    } finally {
      setLoading(false);
    }
  };


  // ======================================================
  // LOADING
  // ======================================================

  if (loading) {
    return (
      <main className="admin-loading">
        <FaShieldAlt className="admin-loading-icon" />

        <h2>Loading Admin Dashboard...</h2>

        <p>Please wait...</p>
      </main>
    );
  }


  if (!authorized) {
    return null;
  }


  // ======================================================
  // ADMIN DASHBOARD
  // ======================================================

  return (
    <main className="admin-page">

      {/* HEADER */}

      <header className="admin-header">

        <button
          className="admin-back-button"
          onClick={() => navigate("/")}
        >
          <FaArrowLeft />
          HOME
        </button>


        <div className="admin-title">

          <div className="admin-title-icon">
            <FaShieldAlt />
          </div>

          <div>
            <h1>ADMIN PANEL</h1>
            <span>CRICKET QUIZ ARENA</span>
          </div>

        </div>


        <button
          className="admin-refresh-button"
          onClick={loadStats}
        >
          <FaSyncAlt />
          REFRESH
        </button>

      </header>


      {/* CONTENT */}

      <section className="admin-content">

        <div className="admin-welcome">

          <div>
            <small>ADMINISTRATOR</small>

            <h2>
              Dashboard
            </h2>

            <p>
              Manage teachers, users, teams, quizzes and matches.
            </p>
          </div>

        </div>


        {/* STAT CARDS */}

        <div className="admin-stats-grid">


          {/* TEACHERS */}

          <div className="admin-stat-card">

            <div className="admin-stat-icon">
              <FaUserTie />
            </div>

            <div>
              <small>TEACHERS</small>

              <strong>
                {stats.teachers}
              </strong>

              <span>
                Registered teachers
              </span>
            </div>

          </div>


          {/* USERS */}

          <div className="admin-stat-card">

            <div className="admin-stat-icon">
              <FaUsers />
            </div>

            <div>
              <small>USERS</small>

              <strong>
                {stats.users}
              </strong>

              <span>
                Registered users
              </span>
            </div>

          </div>


          {/* TEAMS */}

          <div className="admin-stat-card">

            <div className="admin-stat-icon">
              <FaTrophy />
            </div>

            <div>
              <small>TEAMS</small>

              <strong>
                {stats.teams}
              </strong>

              <span>
                Available teams
              </span>
            </div>

          </div>


          {/* QUESTION BANKS */}

          <div className="admin-stat-card">

            <div className="admin-stat-icon">
              <FaQuestionCircle />
            </div>

            <div>
              <small>QUESTION BANKS</small>

              <strong>
                {stats.questionBanks}
              </strong>

              <span>
                Quiz collections
              </span>
            </div>

          </div>


          {/* TOTAL MATCHES */}

          <div className="admin-stat-card">

            <div className="admin-stat-icon">
              <FaFutbol />
            </div>

            <div>
              <small>TOTAL MATCHES</small>

              <strong>
                {stats.matches}
              </strong>

              <span>
                Matches created
              </span>
            </div>

          </div>


          {/* COMPLETED MATCHES */}

          <div className="admin-stat-card">

            <div className="admin-stat-icon">
              <FaCheckCircle />
            </div>

            <div>
              <small>COMPLETED</small>

              <strong>
                {stats.completedMatches}
              </strong>

              <span>
                Finished matches
              </span>
            </div>

          </div>

        </div>


        {/* DATABASE SECTION */}

        <section className="admin-database">

          <div className="admin-section-title">

            <div>
              <small>FIREBASE DATABASE</small>

              <h2>
                System Collections
              </h2>
            </div>

          </div>


          <div className="collection-grid">

            <div className="collection-card">
              <b>teachers</b>
              <span>Teacher accounts & roles</span>
            </div>

            <div className="collection-card">
              <b>users</b>
              <span>User accounts</span>
            </div>

            <div className="collection-card">
              <b>teams</b>
              <span>Cricket teams</span>
            </div>

            <div className="collection-card">
              <b>questionBanks</b>
              <span>Quiz questions</span>
            </div>

            <div className="collection-card">
              <b>matches</b>
              <span>Live & completed matches</span>
            </div>

            <div className="collection-card">
              <b>commentaries</b>
              <span>Match commentary</span>
            </div>

            <div className="collection-card">
              <b>matchHistory</b>
              <span>Previous match records</span>
            </div>

          </div>

        </section>

      </section>

    </main>
  );
}