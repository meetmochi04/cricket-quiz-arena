import { useEffect, useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import {

  FaArrowLeft,

  FaCalendarAlt,

  FaChevronRight,

  FaHome,

  FaHistory,

  FaSearch,

  FaTrophy,

  FaTrash,

} from "react-icons/fa";

import {

  collection,

  deleteDoc,

  doc,

  getDocs,

  orderBy,

  query,

} from "firebase/firestore";

import { db } from "../firebase/firebase";

import "./MatchHistory.css";



interface SavedTeam {

  id?: string | null;

  name: string;

  shortName?: string | null;

  logo?: string | null;

  score: number;

  wickets: number;

  balls: number;

}



interface SavedWinner {

  team: "teamA" | "teamB";

  name: string;

  title: string;

  margin: string;

}



interface SavedInnings {

  runs: number;

  wickets: number;

  balls: number;

}



interface SavedMatch {

  id: string;

  status?: string;

  teacherId?: string | null;

  teamA: SavedTeam;

  teamB: SavedTeam;

  winner?: SavedWinner;

  target?: number;

  overs?: number;

  questionCount?: number;

  firstInnings?: SavedInnings;

  secondInnings?: SavedInnings;

  createdAt?: {

    seconds?: number;

    nanoseconds?: number;

  } | null;

}



function formatOvers(balls = 0) {

  return `${Math.floor(balls / 6)}.${balls % 6}`;

}



function formatDate(createdAt?: SavedMatch["createdAt"]) {

  if (!createdAt?.seconds) return "Date unavailable";



  return new Intl.DateTimeFormat("en-IN", {

    day: "2-digit",

    month: "short",

    year: "numeric",

    hour: "2-digit",

    minute: "2-digit",

  }).format(new Date(createdAt.seconds * 1000));

}



export default function MatchHistoryPage() {

  const navigate = useNavigate();



  const [matches, setMatches] = useState<SavedMatch[]>([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [selectedMatch, setSelectedMatch] = useState<SavedMatch | null>(null);



  const loadMatches = async () => {

    try {

      setLoading(true);



      const matchesQuery = query(

        collection(db, "matches"),

        orderBy("createdAt", "desc")

      );



      const snapshot = await getDocs(matchesQuery);



      const data: SavedMatch[] = snapshot.docs.map((item) => ({

        id: item.id,

        ...(item.data() as Omit<SavedMatch, "id">),

      }));



      setMatches(data);

    } catch (error) {

      console.error("Unable to load match history:", error);




      try {

        const snapshot = await getDocs(collection(db, "matches"));



        const data: SavedMatch[] = snapshot.docs

          .map((item) => ({

            id: item.id,

            ...(item.data() as Omit<SavedMatch, "id">),

          }))

          .sort(

            (a, b) =>

              (b.createdAt?.seconds || 0) -

              (a.createdAt?.seconds || 0)

          );



        setMatches(data);

      } catch (fallbackError) {

        console.error(

          "Unable to load match history:",

          fallbackError

        );

        setMatches([]);

      }

    } finally {

      setLoading(false);

    }

  };



  useEffect(() => {

    loadMatches();



    const savedId = sessionStorage.getItem("historyMatchId");

    if (savedId) {

   

      const openSavedMatch = async () => {

        try {

          const snapshot = await getDocs(collection(db, "matches"));

          const found = snapshot.docs.find((item) => item.id === savedId);

          if (found) {

            setSelectedMatch({

              id: found.id,

              ...(found.data() as Omit<SavedMatch, "id">),

            });

          } else {

            sessionStorage.removeItem("historyMatchId");

          }

        } catch (error) {

          console.error("Unable to open saved match:", error);

        }

      };

      openSavedMatch();

    }

  }, []);



  const handleViewMatch = (match: SavedMatch) => {

    sessionStorage.setItem("historyMatchId", match.id);

    setSelectedMatch(match);

  };



  const closeMatchDetails = () => {

    sessionStorage.removeItem("historyMatchId");

    setSelectedMatch(null);

  };



  const filteredMatches = useMemo(() => {

    const value = search.trim().toLowerCase();



    if (!value) return matches;



    return matches.filter((match) => {

      const teamA = match.teamA?.name?.toLowerCase() || "";

      const teamB = match.teamB?.name?.toLowerCase() || "";

      const winner = match.winner?.name?.toLowerCase() || "";



      return (

        teamA.includes(value) ||

        teamB.includes(value) ||

        winner.includes(value)

      );

    });

  }, [matches, search]);



  const handleDelete = async (matchId: string) => {

    const confirmed = window.confirm(

      "Delete this match from history?"

    );



    if (!confirmed) return;



    try {

      setDeletingId(matchId);



      await deleteDoc(doc(db, "matches", matchId));



      setMatches((current) =>

        current.filter((match) => match.id !== matchId)

      );

    } catch (error) {

      console.error("Unable to delete match:", error);

      alert("Match delete nahi thai. Please try again.");

    } finally {

      setDeletingId(null);

    }

  };



  return (

    <main className="match-history-page">

      <div className="history-bg">

        <div className="history-glow history-glow-one" />

        <div className="history-glow history-glow-two" />

      </div>



      <header className="history-header">

        <button

          className="history-back"

          onClick={() => navigate("/home")}

        >

          <FaArrowLeft />

          <span>BACK</span>

        </button>



        <div className="history-brand">

          <FaHistory />

          <div>

            <span>CRICKET QUIZ ARENA</span>

            <h1>MATCH HISTORY</h1>

          </div>

        </div>



        <button

          className="history-home"

          onClick={() => navigate("/home")}

        >

          <FaHome />

          <span>HOME</span>

        </button>

      </header>



      <section className="history-content">

        <div className="history-heading">

          <div>

            <span>COMPLETED MATCHES</span>

            <h2>Match History</h2>

          </div>



          <div className="history-count">

            <strong>{matches.length}</strong>

            <span>MATCHES</span>

          </div>

        </div>



        <div className="history-toolbar">

          <div className="history-search">

            <FaSearch />

            <input

              type="text"

              value={search}

              onChange={(event) =>

                setSearch(event.target.value)

              }

              placeholder="Search team or winner..."

            />

          </div>



          <button

            className="new-match-button"

            onClick={() => navigate("/home")}

          >

            + NEW MATCH

          </button>

        </div>



        {loading ? (

          <div className="history-empty loading-history">

            <div className="history-spinner" />

            <h3>Loading match history...</h3>

            <p>Please wait while your saved matches are loaded.</p>

          </div>

        ) : filteredMatches.length === 0 ? (

          <div className="history-empty">

            <div className="empty-icon">

              <FaHistory />

            </div>



            <h3>

              {search

                ? "No matching matches"

                : "No matches saved yet"}

            </h3>



            <p>

              {search

                ? "Try another team name or winner."

                : "Complete a match and save it to see it here."}

            </p>



            <button

              onClick={() => navigate("/home")}

              className="empty-action"

            >

              <FaHome />

              GO TO HOME

            </button>

          </div>

        ) : (

          <div className="history-list">

            {filteredMatches.map((match, index) => {

              const teamAWon =

                match.winner?.team === "teamA";

              const teamBWon =

                match.winner?.team === "teamB";



              return (

                <article

                  className="history-card"

                  key={match.id}

                >

                  <div className="match-card-top">

                    <div className="match-number">

                      MATCH #{filteredMatches.length - index}

                    </div>



                    <div className="match-date">

                      <FaCalendarAlt />

                      {formatDate(match.createdAt)}

                    </div>



                    <div className="completed-tag">

                      COMPLETED

                    </div>

                  </div>



                  <div className="history-matchup">

                    <div

                      className={`history-team ${

                        teamAWon ? "winner-team" : ""

                      }`}

                    >

                      <div className="history-team-logo">
                        <span>
                          {(match.teamA?.shortName || match.teamA?.name || "A")
                            .trim()
                            .slice(0, 3)
                            .toUpperCase()}
                        </span>
                      </div>



                      <div className="history-team-info">

                        <strong>

                          {match.teamA?.name || "Team A"}

                        </strong>



                        <div className="history-score">

                          {match.teamA?.score ?? 0}

                          <small>

                            /{match.teamA?.wickets ?? 0}

                          </small>

                        </div>



                        <span>

                          {formatOvers(

                            match.teamA?.balls || 0

                          )}{" "}

                          OVERS

                        </span>

                      </div>



                      {teamAWon && (

                        <div className="mini-winner">

                          <FaTrophy />

                        </div>

                      )}

                    </div>



                    <div className="history-vs">

                      <span>VS</span>

                    </div>



                    <div

                      className={`history-team ${

                        teamBWon ? "winner-team" : ""

                      }`}

                    >

                      <div className="history-team-logo">
                        <span>
                          {(match.teamB?.shortName || match.teamB?.name || "B")
                            .trim()
                            .slice(0, 3)
                            .toUpperCase()}
                        </span>
                      </div>



                      <div className="history-team-info">

                        <strong>

                          {match.teamB?.name || "Team B"}

                        </strong>



                        <div className="history-score">

                          {match.teamB?.score ?? 0}

                          <small>

                            /{match.teamB?.wickets ?? 0}

                          </small>

                        </div>



                        <span>

                          {formatOvers(

                            match.teamB?.balls || 0

                          )}{" "}

                          OVERS

                        </span>

                      </div>



                      {teamBWon && (

                        <div className="mini-winner">

                          <FaTrophy />

                        </div>

                      )}

                    </div>

                  </div>



                  <div className="history-result">

                    <div className="history-result-icon">

                      <FaTrophy />

                    </div>



                    <div>

                      <span>RESULT</span>

                      <strong>

                        {match.winner?.title ||

                          `${match.winner?.name || "Winner"} WON`}

                      </strong>

                    </div>



                    <em>

                      {match.winner?.margin || "MATCH COMPLETED"}

                    </em>

                  </div>



                  <div className="history-card-bottom">

                    <div className="history-meta">

                      <span>

                        TARGET{" "}

                        <strong>

                          {match.target ?? "-"}

                        </strong>

                      </span>



                      <span>

                        OVERS{" "}

                        <strong>

                          {match.overs ?? "-"}

                        </strong>

                      </span>



                      <span>

                        QUESTIONS{" "}

                        <strong>

                          {match.questionCount ?? "-"}

                        </strong>

                      </span>

                    </div>



                    <button

                      className="delete-match-button"

                      onClick={() =>

                        handleDelete(match.id)

                      }

                      disabled={deletingId === match.id}

                      title="Delete match"

                    >

                      <FaTrash />

                      {deletingId === match.id

                        ? "DELETING..."

                        : "DELETE"}

                    </button>



                    <button

                      className="view-match-button"

                      onClick={() => handleViewMatch(match)}

                    >

                      VIEW

                      <FaChevronRight />

                    </button>

                  </div>

                </article>

              );

            })}

          </div>

        )}

      </section>





      {selectedMatch && (

        <div className="match-details-overlay" onClick={closeMatchDetails}>

          <section

            className="match-details-modal"

            onClick={(event) => event.stopPropagation()}

          >

            <div className="match-details-header">

              <div>

                <span>MATCH DETAILS</span>

                <h2>{selectedMatch.teamA?.name || "Team A"} vs {selectedMatch.teamB?.name || "Team B"}</h2>

                <p>{formatDate(selectedMatch.createdAt)}</p>

              </div>

              <button className="close-details-button" onClick={closeMatchDetails}>

                ×

              </button>

            </div>



            <div className="details-result-card">

              <FaTrophy />

              <div>

                <span>FINAL RESULT</span>

                <strong>{selectedMatch.winner?.title || `${selectedMatch.winner?.name || "Winner"} WON`}</strong>

                <em>{selectedMatch.winner?.margin || "MATCH COMPLETED"}</em>

              </div>

            </div>



            <div className="details-score-grid">

              {[

                { label: "1ST INNINGS", team: selectedMatch.teamA, innings: selectedMatch.firstInnings },

                { label: "2ND INNINGS", team: selectedMatch.teamB, innings: selectedMatch.secondInnings },

              ].map((item) => (

                <div className="details-score-card" key={item.label}>

                  <span>{item.label}</span>

                  <h3>{item.team?.name || "Team"}</h3>

                  <div className="details-big-score">

                    {item.innings?.runs ?? item.team?.score ?? 0}

                    <small>/{item.innings?.wickets ?? item.team?.wickets ?? 0}</small>

                  </div>

                  <p>{formatOvers(item.innings?.balls ?? item.team?.balls ?? 0)} OVERS</p>

                </div>

              ))}

            </div>



            <div className="details-info-grid">

              <div><span>TARGET</span><strong>{selectedMatch.target ?? "-"}</strong></div>

              <div><span>OVERS</span><strong>{selectedMatch.overs ?? "-"}</strong></div>

              <div><span>QUESTIONS</span><strong>{selectedMatch.questionCount ?? "-"}</strong></div>

            </div>



            <button className="details-close-action" onClick={closeMatchDetails}>

              CLOSE DETAILS

            </button>

          </section>

        </div>

      )}



      <footer className="history-footer">

        CRICKET QUIZ ARENA <span>•</span> MATCH HISTORY

      </footer>

    </main>

  );

}
