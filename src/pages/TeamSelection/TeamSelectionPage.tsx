import {

  useEffect,

  useState,

  type CSSProperties,

} from "react";

import {

  useNavigate,

} from "react-router-dom";

import {

  FaChevronLeft,

  FaChevronRight,

  FaArrowRight,

  FaExclamationTriangle,

  FaHome,

  FaPlus,

  FaTimes,

  FaDatabase,

} from "react-icons/fa";

import {

  getTeams,

  createTeam,

} from "../../firebase/firestore";

import type {

  Team,

} from "../../firebase/firestore";

import "./TeamSelection.css";

export default function TeamSelectionPage() {

  const navigate = useNavigate();

  const [teams, setTeams] = useState<Team[]>([]);

  const [teamAIndex, setTeamAIndex] = useState(0);

  const [teamBIndex, setTeamBIndex] = useState(1);

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(true);

  const [showAddTeam, setShowAddTeam] =

    useState(false);

  const [addingTeam, setAddingTeam] =

    useState(false);

  const [newTeamName, setNewTeamName] =

    useState("");

  const [newTeamShortName, setNewTeamShortName] =

    useState("");

  const [newTeamLogo, setNewTeamLogo] =

    useState("");

  const [newTeamColor, setNewTeamColor] =

    useState("#168cff");

  useEffect(() => {

    const loadTeams = async () => {

      try {

        setLoading(true);

        setError("");

        const firestoreTeams = await getTeams();

        setTeams(firestoreTeams);

        setTeamAIndex(0);

        setTeamBIndex(

          firestoreTeams.length > 1 ? 1 : 0

        );

      } catch (err) {

        console.error(

          "Team loading error:",

          err

        );

        setError(

          "Unable to load teams from database."

        );

      } finally {

        setLoading(false);

      }

    };

    loadTeams();

  }, []);

  const teamA = teams[teamAIndex];

  const teamB = teams[teamBIndex];

  const changeTeamA = (

    direction: "next" | "previous"

  ) => {

    if (teams.length === 0) {

      return;

    }

    setError("");

    setTeamAIndex((current) => {

      if (direction === "next") {

        return (

          (current + 1) % teams.length

        );

      }

      return current === 0

        ? teams.length - 1

        : current - 1;

    });

  };

  const changeTeamB = (

    direction: "next" | "previous"

  ) => {

    if (teams.length === 0) {

      return;

    }

    setError("");

    setTeamBIndex((current) => {

      if (direction === "next") {

        return (

          (current + 1) % teams.length

        );

      }

      return current === 0

        ? teams.length - 1

        : current - 1;

    });

  };

  const handleAddTeam = async () => {

    setError("");

    const name =

      newTeamName.trim();

    const shortName =

      newTeamShortName

        .trim()

        .toUpperCase();

    const logo =

      newTeamLogo.trim() || shortName;

    if (!name) {

      setError(

        "Please enter team name."

      );

      return;

    }

    if (!shortName) {

      setError(

        "Please enter team short name."

      );

      return;

    }

    if (shortName.length > 5) {

      setError(

        "Short name must be maximum 5 characters."

      );

      return;

    }

    const duplicate = teams.some(

      (team) =>

        team.name.toLowerCase() ===

          name.toLowerCase() ||

        team.shortName.toLowerCase() ===

          shortName.toLowerCase()

    );

    if (duplicate) {

      setError(

        "This team already exists."

      );

      return;

    }

    try {

      setAddingTeam(true);

      const createdId =

        await createTeam({

          name: name.toUpperCase(),

          shortName,

          logo: logo.toUpperCase(),

          color: newTeamColor,

        });

      const createdTeam: Team = {

        id: createdId,

        name: name.toUpperCase(),

        shortName,

        logo: logo.toUpperCase(),

        color: newTeamColor,

        createdBy: "",

        active: true,

      };

      const updatedTeams = [...teams, createdTeam];
      setTeams(updatedTeams);

      // If this is the first team, select it for Team A as well.
      if (teams.length === 0) {
        setTeamAIndex(0);
      }

      // Select the newly added team for Team B.
      setTeamBIndex(updatedTeams.length - 1);

      setNewTeamName("");

      setNewTeamShortName("");

      setNewTeamLogo("");

      setNewTeamColor("#168cff");

      setShowAddTeam(false);

      setError("");

    } catch (err) {

      console.error(

        "Add team error:",

        err

      );

      setError(

        "Unable to add team. Please try again."

      );

    } finally {

      setAddingTeam(false);

    }

  };

  const handleNext = () => {

    if (!teamA || !teamB) {

      setError(

        "Please select both teams."

      );

      return;

    }

    if (teamA.id === teamB.id) {

      setError(

        "Please select two different teams."

      );

      return;

    }

    setError("");

    sessionStorage.setItem(

      "teamA",

      JSON.stringify(teamA)

    );

    sessionStorage.setItem(

      "teamB",

      JSON.stringify(teamB)

    );

    sessionStorage.setItem(

      "selectedTeams",

      JSON.stringify({

        teamA,

        teamB,

      })

    );

    navigate("/match-setup");

  };

  if (loading) {

    return (

      <main className="team-selection">

        <div className="team-stadium-bg" />

        <div className="team-stadium-overlay" />

        <div

          style={{

            position: "relative",

            zIndex: 20,

            height: "100vh",

            display: "flex",

            alignItems: "center",

            justifyContent: "center",

            color: "white",

            fontSize: "22px",

            fontWeight: 700,

          }}

        >

          <FaDatabase

            style={{

              marginRight: "12px",

            }}

          />

          Loading Teams...

        </div>

      </main>

    );

  }

  return (

    <main className="team-selection">

      <div className="team-stadium-bg" />

      <div className="team-stadium-overlay" />

      <header className="team-topbar">

        <button

          className="home-button"

          onClick={() =>

            navigate("/home")

          }

        >

          <FaHome />

          <span>

            HOME

          </span>

        </button>

        <div className="page-heading">

          <div className="heading-decoration" />

          <h1>

            TEAM SELECTION

          </h1>

          <div className="heading-decoration reverse" />

        </div>

        <div className="progress-box">

          <strong>

            01

          </strong>

          <span>

            / 08

          </span>

        </div>

      </header>

      <p className="team-subtitle">

        Choose two teams to start your cricket battle

      </p>

      <button

        type="button"

        className="add-team-button"

        onClick={() => {

          setError("");

          setShowAddTeam(true);

        }}

      >

        <FaPlus />

        <span>

          ADD TEAM

        </span>

      </button>

      {teamA && teamB && (

        <section className="team-battle" aria-label="Team selection">

          <div className="team-wrapper">

            <div className="team-tag team-tag-blue">

              TEAM A

            </div>

            <div

              className="team-card team-card-blue"

              style={{

                "--team-color":

                  teamA.color,

              } as CSSProperties}

            >

              <button

                type="button"

                className="team-arrow team-arrow-left"

                onClick={() =>

                  changeTeamA(

                    "previous"

                  )

                }

              >

                <FaChevronLeft />

              </button>

              <div className="team-content">

                <div className="team-logo-ring">

                  <div className="team-logo">

                    <span>{teamA.logo || teamA.shortName}</span>

                  </div>

                </div>

                <h2>

                  {teamA.name}

                </h2>

                <div className="team-name-line" />

                <span>

                  {teamA.shortName}

                </span>

              </div>

              <button

                type="button"

                className="team-arrow team-arrow-right"

                onClick={() =>

                  changeTeamA(

                    "next"

                  )

                }

              >

                <FaChevronRight />

              </button>

            </div>

          </div>

          <div className="versus">

            <div className="vs-light" />

            <div className="vs-text">

              VS

            </div>

            <div className="vs-light" />

          </div>

          <div className="team-wrapper">

            <div className="team-tag team-tag-red">

              TEAM B

            </div>

            <div

              className="team-card team-card-red"

              style={{

                "--team-color":

                  teamB.color,

              } as CSSProperties}

            >

              <button

                type="button"

                className="team-arrow team-arrow-left"

                onClick={() =>

                  changeTeamB(

                    "previous"

                  )

                }

              >

                <FaChevronLeft />

              </button>

              <div className="team-content">

                <div className="team-logo-ring">

                  <div className="team-logo">

                    <span>{teamB.logo || teamB.shortName}</span>

                  </div>

                </div>

                <h2>

                  {teamB.name}

                </h2>

                <div className="team-name-line" />

                <span>

                  {teamB.shortName}

                </span>

              </div>

              <button

                type="button"

                className="team-arrow team-arrow-right"

                onClick={() =>

                  changeTeamB(

                    "next"

                  )

                }

              >

                <FaChevronRight />

              </button>

            </div>

          </div>

        </section>

      )}

      <div
className={`team-error ${error ? "team-error-visible" : ""}`}

      >

        {error && (

          <>

            <FaExclamationTriangle />

            <span>

              {error}

            </span>

          </>

        )}

      </div>

      <button

        type="button"

        className="next-team-button"

        onClick={handleNext}

        disabled={

          !teamA || !teamB

        }

      >

        <span>

          NEXT

        </span>

        <span className="next-divider" />

        <FaArrowRight />

      </button>

      <footer className="team-footer-bar">

        <div className="footer-brand">

          <span>

            CRICKET

          </span>

          <strong>

            QUIZ

          </strong>

          <span>

            ARENA

          </span>

        </div>

        <div className="footer-slogan">

          PLAY CRICKET. ANSWER FAST. SCORE BIG.

        </div>

        <div className="footer-icons">

          <span>

            🏆

          </span>

          <span>

            ⚙

          </span>

          <span>

            👤

          </span>

        </div>

      </footer>

      {showAddTeam && (

        <div

          className="add-team-modal-overlay"

          onClick={() =>

            setShowAddTeam(false)

          }

        >

          <div

            className="add-team-modal"

            onClick={(event) =>

              event.stopPropagation()

            }

          >

            <div className="add-team-modal-header">

              <div>

                <span>

                  TEAM MANAGEMENT

                </span>

                <h2>

                  ADD NEW TEAM

                </h2>

              </div>

              <button

                type="button"

                onClick={() =>

                  setShowAddTeam(false)

                }

                disabled={addingTeam}

              >

                <FaTimes />

              </button>

            </div>

            <div className="add-team-field">

              <label>

                TEAM NAME

              </label>

              <input

                type="text"

                value={newTeamName}

                onChange={(event) =>

                  setNewTeamName(

                    event.target.value

                  )

                }

                placeholder="e.g. WEST INDIES"

                disabled={addingTeam}

              />

            </div>

            <div className="add-team-field">

              <label>

                SHORT NAME

              </label>

              <input

                type="text"

                value={newTeamShortName}

                onChange={(event) =>

                  setNewTeamShortName(

                    event.target.value

                      .toUpperCase()

                  )

                }

                placeholder="e.g. WI"

                maxLength={5}

                disabled={addingTeam}

              />

            </div>

            <div className="add-team-field">

              <label>

                LOGO / DISPLAY TEXT

              </label>

              <input

                type="text"

                value={newTeamLogo}

                onChange={(event) =>

                  setNewTeamLogo(

                    event.target.value

                      .toUpperCase()

                  )

                }

                placeholder="e.g. WI"

                maxLength={5}

                disabled={addingTeam}

              />

            </div>

            <div className="add-team-field">

              <label>

                TEAM COLOR

              </label>

              <div className="team-color-row">

                <input

                  type="color"

                  value={newTeamColor}

                  onChange={(event) =>

                    setNewTeamColor(

                      event.target.value

                    )

                  }

                  disabled={addingTeam}

                />

                <span>

                  {newTeamColor}

                </span>

              </div>

            </div>

            {error && (

              <div className="add-team-error">

                <FaExclamationTriangle />

                <span>

                  {error}

                </span>

              </div>

            )}

            <div className="add-team-actions">

              <button

                type="button"

                className="add-team-cancel"

                onClick={() =>

                  setShowAddTeam(false)

                }

                disabled={addingTeam}

              >

                CANCEL

              </button>

              <button

                type="button"

                className="add-team-save"

                onClick={handleAddTeam}

                disabled={addingTeam}

              >

                <FaPlus />

                {addingTeam

                  ? "SAVING..."

                  : "SAVE TEAM"}

              </button>

            </div>

          </div>

        </div>

      )}

    </main>

  );

}
