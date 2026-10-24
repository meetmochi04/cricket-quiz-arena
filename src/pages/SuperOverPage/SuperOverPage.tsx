import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaTrophy, FaHome, FaRedo, FaClock } from "react-icons/fa";
import "./SuperOverPage.css";

type Question = { id?: string; question: string; options: string[]; answer: string };
type Team = { name: string; logo?: string };
type Teams = { teamA: Team; teamB: Team };
type OverScore = { runs: number; wickets: number; balls: number };
const EMPTY: OverScore = { runs: 0, wickets: 0, balls: 0 };
const TIME_LIMIT = 15;

export default function SuperOverPage() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Teams | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [teamIndex, setTeamIndex] = useState<0 | 1>(0);
  const [ballIndex, setBallIndex] = useState(0);
  const [scores, setScores] = useState<[OverScore, OverScore]>([{ ...EMPTY }, { ...EMPTY }]);
  const [seconds, setSeconds] = useState(TIME_LIMIT);
  const [selected, setSelected] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [overNumber, setOverNumber] = useState(1);
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      const rawTeams = sessionStorage.getItem("selectedTeams");
      const rawQuestions = sessionStorage.getItem("questionBank");
      if (!rawTeams || !rawQuestions) {
        setMessage("Teams or questions are missing. Please set up a match first.");
        return;
      }
      const parsedTeams = JSON.parse(rawTeams) as Teams;
      const parsedQuestions = JSON.parse(rawQuestions) as Question[];
      if (!parsedTeams?.teamA?.name || !parsedTeams?.teamB?.name || !Array.isArray(parsedQuestions) || !parsedQuestions.length) {
        setMessage("Could not load teams/questions for the Super Over.");
        return;
      }
      setTeams(parsedTeams);
      // A Super Over needs six questions per team. Reuse the available bank cyclically if it contains fewer than 12.
      setQuestions(Array.from({ length: 12 }, (_, i) => parsedQuestions[i % parsedQuestions.length]));
      const savedOver = Number(sessionStorage.getItem("superOverNumber") || "1");
      setOverNumber(Number.isFinite(savedOver) && savedOver > 0 ? savedOver : 1);
    } catch {
      setMessage("Unable to read Super Over setup. Please restart the match.");
    }
  }, []);

  const currentQuestion = questions[teamIndex * 6 + ballIndex];
  const activeTeam = teams ? (teamIndex === 0 ? teams.teamA : teams.teamB) : null;
  const result = useMemo(() => {
    if (!finished) return null;
    if (scores[0].runs === scores[1].runs) return "tie" as const;
    return scores[0].runs > scores[1].runs ? "teamA" as const : "teamB" as const;
  }, [finished, scores]);

  useEffect(() => {
    if (finished || selected || !currentQuestion || !teams) return;
    const timer = window.setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [finished, selected, currentQuestion, teams, teamIndex, ballIndex]);

  useEffect(() => {
    if (seconds === 0 && !selected && currentQuestion && !finished) submitAnswer(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, selected, currentQuestion, finished]);

  const submitAnswer = (answer: string | null) => {
    if (!currentQuestion || selected || finished) return;
    const correct = answer !== null && answer === currentQuestion.answer;
    const runs = !correct ? 0 : seconds >= 11 ? 6 : seconds >= 6 ? 4 : seconds >= 1 ? 2 : 0;
    setSelected(answer ?? "__TIME_UP__");
    setScores((old) => {
      const next: [OverScore, OverScore] = [{ ...old[0] }, { ...old[1] }];
      next[teamIndex].balls += 1;
      next[teamIndex].runs += runs;
      if (!correct) next[teamIndex].wickets += 1;
      return next;
    });
  };

  const nextBall = () => {
    if (selected === null) return;
    setSelected(null);
    setSeconds(TIME_LIMIT);
    if (ballIndex < 5) {
      setBallIndex((n) => n + 1);
      return;
    }
    if (teamIndex === 0) {
      setTeamIndex(1);
      setBallIndex(0);
      return;
    }
    setFinished(true);
  };

  const playAgain = () => {
    const next = overNumber + 1;
    sessionStorage.setItem("superOverNumber", String(next));
    setOverNumber(next);
    setScores([{ ...EMPTY }, { ...EMPTY }]);
    setTeamIndex(0);
    setBallIndex(0);
    setSeconds(TIME_LIMIT);
    setSelected(null);
    setFinished(false);
  };

  if (message) return <main className="super-over-page"><section className="super-over-card"><h1>SUPER OVER</h1><p>{message}</p><button onClick={() => navigate("/")}>HOME</button></section></main>;
  if (!teams || questions.length < 12) return <main className="super-over-page"><section className="super-over-card"><h1>SUPER OVER</h1><p>Loading teams and questions…</p></section></main>;

  return (
    <main className="super-over-page">
      <section className="super-over-card">
        <div className="super-over-kicker">CRICKET QUIZ ARENA · SUPER OVER {overNumber}</div>
        <h1>{finished ? (result === "tie" ? "SUPER OVER TIED" : "SUPER OVER RESULT") : "SUPER OVER"}</h1>
        {!finished ? <>
          <p className="super-over-subtitle">One over each · Six questions per team · Same scoring rules</p>
          <div className="super-over-scoreboard">
            {[teams.teamA, teams.teamB].map((team, i) => <div key={team.name} className={`super-over-team ${i === teamIndex ? "active" : ""}`}>
              <span>{team.name}</span><strong>{scores[i as 0 | 1].runs}/{scores[i as 0 | 1].wickets}</strong><small>{scores[i as 0 | 1].balls}/6 balls</small>
            </div>)}
          </div>
          <div className="super-over-progress">{activeTeam?.name} · BALL {ballIndex + 1} OF 6</div>
          <div className="super-over-timer"><FaClock /> <strong>{seconds}s</strong></div>
          <h2 className="super-over-question">{currentQuestion?.question}</h2>
          <div className="super-over-options">{currentQuestion?.options?.map((option, i) => <button key={`${i}-${option}`} disabled={selected !== null} className={selected === option ? "selected" : ""} onClick={() => submitAnswer(option)}>{option}</button>)}</div>
          {selected !== null && <div className="super-over-feedback"><strong>{selected === "__TIME_UP__" ? "TIME UP — WICKET!" : selected === currentQuestion?.answer ? `CORRECT — ${seconds >= 11 ? 6 : seconds >= 6 ? 4 : seconds >= 1 ? 2 : 0} RUNS` : "WRONG ANSWER — WICKET!"}</strong><button onClick={nextBall}>{ballIndex === 5 && teamIndex === 0 ? "NEXT TEAM" : ballIndex === 5 ? "VIEW RESULT" : "NEXT BALL"}</button></div>}
        </> : <>
          <div className="super-over-final-scores"><div><span>{teams.teamA.name}</span><strong>{scores[0].runs}/{scores[0].wickets}</strong></div><div><span>{teams.teamB.name}</span><strong>{scores[1].runs}/{scores[1].wickets}</strong></div></div>
          <h2 className="super-over-winner">{result === "tie" ? "Scores are equal" : `${result === "teamA" ? teams.teamA.name : teams.teamB.name} WINS!`}</h2>
          {result === "tie" ? <button className="super-over-primary" onClick={playAgain}><FaRedo /> PLAY ANOTHER SUPER OVER</button> : <button className="super-over-primary" onClick={() => { sessionStorage.setItem("superOverResult", JSON.stringify({ overNumber, teamAScore: scores[0], teamBScore: scores[1], winner: result === "teamA" ? teams.teamA.name : teams.teamB.name })); navigate("/match-result"); }}><FaTrophy /> CONTINUE TO MATCH SUMMARY</button>}
          <button className="super-over-secondary" onClick={() => navigate("/")}><FaHome /> HOME</button>
        </>}
      </section>
    </main>
  );
}
