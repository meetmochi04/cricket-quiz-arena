import { Routes, Route, Navigate } from "react-router-dom";

import HomePage from "./pages/Home/HomePage";
import TeamSelectionPage from "./pages/TeamSelection/TeamSelectionPage";
import MatchSetupPage from "./pages/MatchSetup/MatchSetupPage";
import TossPage from "./pages/Toss/TossPage";
import QuestionBankPage from "./pages/QuestionBank/QuestionBankPage";

import FirstInningsPage from "./pages/FirstInnings/FirstInningsPage";
import FirstInningsSummaryPage from "./pages/FirstInnings/FirstInningsSummaryPage";
import SecondInningsPage from "./pages/FirstInnings/SecondInningsPage";

import AdminPage from "./pages/Admin/AdminPage";
import RegisterPage from "./pages/Register/RegisterPage";
import LoginPage from "./pages/Login/LoginPage";

import MatchResultPage from "./pages/MatchResult/MatchResultPage";
import MatchHistoryPage from "./pages/MatchHistoryPage";
import SuperOverPage from "./pages/SuperOverPage/SuperOverPage";

function App() {
  return (
    <Routes>

      {/* =========================
          LOGIN
      ========================= */}

      <Route
        path="/login"
        element={<LoginPage />}
      />

      {/* =========================
          REGISTER
      ========================= */}

      <Route
        path="/register"
        element={<RegisterPage />}
      />

      {/* =========================
          ADMIN
      ========================= */}

      <Route
        path="/admin"
        element={<AdminPage />}
      />

      {/* =========================
          HOME
      ========================= */}

      <Route
        path="/home"
        element={<HomePage />}
      />

      {/* =========================
          TEAM SELECTION
      ========================= */}

      <Route
        path="/team-selection"
        element={<TeamSelectionPage />}
      />

      {/* =========================
          MATCH SETUP
      ========================= */}

      <Route
        path="/match-setup"
        element={<MatchSetupPage />}
      />

      {/* =========================
          TOSS
      ========================= */}

      <Route
        path="/toss"
        element={<TossPage />}
      />

      {/* =========================
          QUESTION BANK
      ========================= */}

      <Route
        path="/question-bank"
        element={<QuestionBankPage />}
      />

      {/* =========================
          FIRST INNINGS
      ========================= */}

      <Route
        path="/first-innings"
        element={<FirstInningsPage />}
      />

      {/* =========================
          FIRST INNINGS SUMMARY
      ========================= */}

      <Route
        path="/first-innings-summary"
        element={<FirstInningsSummaryPage />}
      />

      {/* =========================
          SECOND INNINGS
      ========================= */}

      <Route
        path="/second-innings"
        element={<SecondInningsPage />}
      />

      {/* =========================
          MATCH RESULT
      ========================= */}

      <Route
        path="/match-result"
        element={<MatchResultPage />}
      />

      {/* =========================
          MATCH HISTORY
      ========================= */}

      <Route
        path="/history"
        element={<MatchHistoryPage />}
      />

      {/* =========================
          ROOT → LOGIN
      ========================= */}

      <Route
        path="/"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />

      {/* =========================
          UNKNOWN ROUTE
      ========================= */}

      <Route
        path="*"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />

  <Route
     path="/super-over"
    element={<SuperOverPage />}
  />

    </Routes>
  );
}

export default App;