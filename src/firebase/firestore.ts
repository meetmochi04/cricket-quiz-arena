import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { auth, db } from "./firebase";

// ======================================================
// TYPES
// ======================================================

// -------------------------
// Teacher
// -------------------------
export interface TeacherProfile {
  uid: string;
  email: string;
  name: string;
  role: "teacher" | "admin";
  createdAt?: unknown;
}

// -------------------------
// Team
// -------------------------
export interface Team {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  color: string;
  createdBy: string;
  active: boolean;
  createdAt?: unknown;
}

// -------------------------
// Match Setup
// -------------------------
export interface MatchSetupData {
  teamAId: string;
  teamAName: string;

  teamBId: string;
  teamBName: string;

  playersPerTeam: number;
  overs: number;

  // 1 over = 6 questions
  questionCount: number;

  answerTime: number;

  createdBy?: string;
  createdAt?: unknown;
}

// -------------------------
// Question Bank
// -------------------------
export interface QuestionBank {
  id: string;
  name: string;
  fileName?: string;
  topic?: string;
  createdBy: string;
  createdAt?: unknown;
}

// -------------------------
// Quiz Question
// -------------------------
export interface QuizQuestion {
  id?: string;

  matchId: string;

  innings: 1 | 2;

  question: string;

  options: string[];

  answer: string;

  bowlingType: string;

  source: "manual" | "word" | "ai";

  used: boolean;

  createdBy?: string;

  createdAt?: unknown;
}

// -------------------------
// Match
// -------------------------
export interface MatchData {
  id?: string;

  teamAId: string;
  teamAName: string;

  teamBId: string;
  teamBName: string;

  overs: number;
  playersPerTeam: number;

  tossWinner?: string;
  tossDecision?: "bat" | "bowl";

  battingTeam?: string;
  bowlingTeam?: string;

  teamAScore: number;
  teamBScore: number;

  status:
    | "setup"
    | "toss-completed"
    | "in-progress"
    | "innings-1-completed"
    | "innings-2-completed"
    | "completed";

  winnerTeam?: string;

  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

// -------------------------
// Ball Event
// -------------------------
export interface BallEvent {
  id?: string;

  matchId: string;

  innings: 1 | 2;

  ballNo: number;

  questionId?: string;

  bowlingType?: string;

  result:
    | "six"
    | "four"
    | "two"
    | "wicket";

  runs: number;

  commentary?: string;

  createdAt?: unknown;
}

// -------------------------
// Match History
// -------------------------
export interface MatchHistoryData {
  id?: string;

  matchId: string;

  teamAName: string;
  teamBName: string;

  teamAScore: number;
  teamBScore: number;

  winnerTeam: string;

  playedBy: string;

  createdAt?: unknown;
}

// -------------------------
// Admin Stats
// -------------------------
export interface AdminStats {
  teachers: number;
  users: number;
  teams: number;
  questionBanks: number;
  matches: number;
  completedMatches: number;
}

// -------------------------
// Toss
// -------------------------
export interface TossResultData {
  matchId: string;

  tossWinner: string;

  tossDecision?: "bat" | "bowl";

  battingTeam: string;

  bowlingTeam: string;

  createdBy?: string;

  createdAt?: unknown;
}

// ======================================================
// HELPER
// ======================================================

const requireUser = () => {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("User is not logged in.");
  }

  return user;
};

// ======================================================
// TEACHER FUNCTIONS
// ======================================================

/**
 * Create / update teacher profile
 *
 * teachers/{uid}
 */
export const createTeacherProfile = async (
  uid: string,
  email: string,
  name: string,
  role: "teacher" | "admin" = "teacher"
): Promise<void> => {
  try {
    await setDoc(
      doc(db, "teachers", uid),
      {
        uid,
        email,
        name,
        role,
        createdAt: serverTimestamp(),
      },
      {
        merge: true,
      }
    );
  } catch (error) {
    console.error("Error creating teacher profile:", error);
    throw error;
  }
};

/**
 * Get teacher profile
 */
export const getTeacherProfile = async (
  uid: string
): Promise<TeacherProfile | null> => {
  try {
    const teacherRef = doc(db, "teachers", uid);

    const teacherSnap = await getDoc(teacherRef);

    if (teacherSnap.exists()) {
      return teacherSnap.data() as TeacherProfile;
    }

    // Fallback for older auto-ID teacher documents
    const q = query(
      collection(db, "teachers"),
      where("uid", "==", uid)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data() as TeacherProfile;
  } catch (error) {
    console.error("Error getting teacher profile:", error);
    throw error;
  }
};

/**
 * Check admin role
 */
export const isAdmin = async (
  uid: string
): Promise<boolean> => {
  try {
    const profile = await getTeacherProfile(uid);

    return profile?.role === "admin";
  } catch (error) {
    console.error("Error checking admin:", error);

    return false;
  }
};

// ======================================================
// TEAM FUNCTIONS
// ======================================================

/**
 * Get all active teams
 */
export const getTeams = async (): Promise<Team[]> => {
  const user = requireUser();

  const q = query(
    collection(db, "teams"),
    where("createdBy", "==", user.uid),
    where("active", "==", true)
  );

  const snapshot = await getDocs(q);

  const teams = snapshot.docs.map((item) => ({
    id: item.id,
    ...(item.data() as Omit<Team, "id">),
  }));

  teams.sort((a, b) => a.name.localeCompare(b.name));
  return teams;
};
/**
 * Get all teams including inactive
 */
export const getAllTeams = async (): Promise<Team[]> => {
  try {
    const snapshot = await getDocs(
      collection(db, "teams")
    );

    const teams = snapshot.docs.map((item) => ({
      id: item.id,
      ...(item.data() as Omit<Team, "id">),
    }));

    teams.sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    return teams;
  } catch (error) {
    console.error("Error getting all teams:", error);
    throw error;
  }
};

/**
 * Create new team
 */
export const createTeam = async (
  data: Omit<
    Team,
    "id" | "createdBy" | "createdAt"
  >
): Promise<string> => {
  try {
    const user = requireUser();

    const teamRef = await addDoc(
      collection(db, "teams"),
      {
        ...data,
        createdBy: user.uid,
        active: true,
        createdAt: serverTimestamp(),
      }
    );

    return teamRef.id;
  } catch (error) {
    console.error("Error creating team:", error);
    throw error;
  }
};

/**
 * Update team
 */
export const updateTeam = async (
  teamId: string,
  data: Partial<
    Omit<
      Team,
      "id" | "createdBy" | "createdAt"
    >
  >
): Promise<void> => {
  try {
    await updateDoc(
      doc(db, "teams", teamId),
      data
    );
  } catch (error) {
    console.error("Error updating team:", error);
    throw error;
  }
};

/**
 * Soft delete team
 */
export const deleteTeam = async (
  teamId: string
): Promise<void> => {
  try {
    await updateDoc(
      doc(db, "teams", teamId),
      {
        active: false,
      }
    );
  } catch (error) {
    console.error("Error deleting team:", error);
    throw error;
  }
};

// ======================================================
// MATCH SETUP FUNCTIONS
// ======================================================

/**
 * Calculate question count
 *
 * 1 over = 6 questions
 */
export const calculateQuestionCount = (
  overs: number
): number => {
  return overs * 6;
};

/**
 * Save match setup
 *
 * Collection:
 * matchSetups
 */
export const saveMatchSetup = async (
  data: MatchSetupData
): Promise<string> => {
  try {
    const user = requireUser();

    const setupRef = await addDoc(
      collection(db, "matchSetups"),
      {
        ...data,

        createdBy: user.uid,

        createdAt: serverTimestamp(),
      }
    );

    return setupRef.id;
  } catch (error) {
    console.error("Error saving match setup:", error);
    throw error;
  }
};

/**
 * Get match setup
 */
export const getMatchSetup = async (
  setupId: string
): Promise<MatchSetupData | null> => {
  try {
    const setupSnap = await getDoc(
      doc(db, "matchSetups", setupId)
    );

    if (!setupSnap.exists()) {
      return null;
    }

    return {
      ...(setupSnap.data() as MatchSetupData),
    };
  } catch (error) {
    console.error("Error getting match setup:", error);
    throw error;
  }
};

/**
 * Update match setup
 */
export const updateMatchSetup = async (
  setupId: string,
  data: Partial<MatchSetupData>
): Promise<void> => {
  try {
    await updateDoc(
      doc(db, "matchSetups", setupId),
      data
    );
  } catch (error) {
    console.error("Error updating match setup:", error);
    throw error;
  }
};

// ======================================================
// TOSS FUNCTIONS
// ======================================================

/**
 * Save toss result
 *
 * Collection:
 * tossResults
 *
 * IMPORTANT:
 * This signature matches TossPage.tsx
 */
export const saveTossResult = async (
  data: Omit<
    TossResultData,
    "createdBy" | "createdAt"
  >
): Promise<string> => {
  try {
    const user = requireUser();

    const tossRef = await addDoc(
      collection(db, "tossResults"),
      {
        ...data,

        createdBy: user.uid,

        createdAt: serverTimestamp(),
      }
    );

    return tossRef.id;
  } catch (error) {
    console.error("Error saving toss result:", error);
    throw error;
  }
};

/**
 * Get toss result
 */
export const getTossResult = async (
  matchId: string
): Promise<TossResultData | null> => {
  try {
    const q = query(
      collection(db, "tossResults"),
      where("matchId", "==", matchId)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    return {
      ...(snapshot.docs[0].data() as TossResultData),
    };
  } catch (error) {
    console.error("Error getting toss result:", error);
    throw error;
  }
};

// ======================================================
// QUESTION BANK FUNCTIONS
// ======================================================

/**
 * Create Question Bank
 */
export const createQuestionBank = async (
  name: string,
  fileName?: string,
  topic?: string
): Promise<string> => {
  try {
    const user = requireUser();

    const bankRef = await addDoc(
      collection(db, "questionBanks"),
      {
        name,
        fileName: fileName || "",
        topic: topic || "",

        createdBy: user.uid,

        createdAt: serverTimestamp(),
      }
    );

    return bankRef.id;
  } catch (error) {
    console.error("Error creating question bank:", error);
    throw error;
  }
};

/**
 * Get Question Banks
 */
export const getQuestionBanks = async (): Promise<
  QuestionBank[]
> => {
  try {
    const snapshot = await getDocs(
      collection(db, "questionBanks")
    );

    const banks = snapshot.docs.map((item) => ({
      id: item.id,
      ...(item.data() as Omit<
        QuestionBank,
        "id"
      >),
    }));

    banks.sort((a, b) => {
      const aTime =
        (a.createdAt as any)?.seconds || 0;

      const bTime =
        (b.createdAt as any)?.seconds || 0;

      return bTime - aTime;
    });

    return banks;
  } catch (error) {
    console.error("Error getting question banks:", error);
    throw error;
  }
};

/**
 * Create quiz question inside question bank
 *
 * questionBanks/{bankId}/questions
 */
export const createQuizQuestion = async (
  questionBankId: string,
  data: Omit<
    QuizQuestion,
    | "id"
    | "questionBankId"
    | "createdBy"
    | "createdAt"
    | "matchId"
    | "innings"
    | "source"
    | "used"
  >
): Promise<string> => {
  try {
    const user = requireUser();

    const questionRef = await addDoc(
      collection(
        db,
        "questionBanks",
        questionBankId,
        "questions"
      ),
      {
        ...data,

        questionBankId,

        createdBy: user.uid,

        createdAt: serverTimestamp(),
      }
    );

    return questionRef.id;
  } catch (error) {
    console.error("Error creating quiz question:", error);
    throw error;
  }
};

/**
 * Get questions from question bank
 */
export const getQuestionBankQuestions = async (
  questionBankId: string
): Promise<QuizQuestion[]> => {
  try {
    const snapshot = await getDocs(
      collection(
        db,
        "questionBanks",
        questionBankId,
        "questions"
      )
    );

    const questions = snapshot.docs.map((item) => ({
      id: item.id,
      ...(item.data() as Omit<
        QuizQuestion,
        "id"
      >),
    }));

    return questions;
  } catch (error) {
    console.error("Error getting quiz questions:", error);
    throw error;
  }
};

/**
 * Delete quiz question
 */
export const deleteQuizQuestion = async (
  questionBankId: string,
  questionId: string
): Promise<void> => {
  try {
    await deleteDoc(
      doc(
        db,
        "questionBanks",
        questionBankId,
        "questions",
        questionId
      )
    );
  } catch (error) {
    console.error("Error deleting quiz question:", error);
    throw error;
  }
};

// ======================================================
// MATCH QUESTION FUNCTIONS
// ======================================================

/**
 * Add manual / Word / AI question
 *
 * Collection:
 * questions
 *
 * This function matches:
 * questionBank.ts
 * QuestionBankPage.tsx
 */
export const addQuestion = async (
  question: Omit<
    QuizQuestion,
    "id" | "createdAt" | "used"
  >
): Promise<string> => {
  try {
    const user = requireUser();

    const questionRef = await addDoc(
      collection(db, "questions"),
      {
        ...question,

        createdBy: user.uid,

        used: false,

        createdAt: serverTimestamp(),
      }
    );

    return questionRef.id;
  } catch (error) {
    console.error("Error adding question:", error);
    throw error;
  }
};

/**
 * Add multiple questions
 *
 * Used by Word/DOCX import.
 */
export const addQuestions = async (
  questions: Omit<
    QuizQuestion,
    "id" | "createdAt" | "used"
  >[]
): Promise<string[]> => {
  try {
    const user = requireUser();

    const ids: string[] = [];

    for (const question of questions) {
      const questionRef = await addDoc(
        collection(db, "questions"),
        {
          ...question,

          createdBy: user.uid,

          used: false,

          createdAt: serverTimestamp(),
        }
      );

      ids.push(questionRef.id);
    }

    return ids;
  } catch (error) {
    console.error("Error adding multiple questions:", error);
    throw error;
  }
};

/**
 * Get all questions for a particular match + innings
 */
export const getQuestionsForInnings = async (
  matchId: string,
  innings: 1 | 2
): Promise<QuizQuestion[]> => {
  try {
    const q = query(
      collection(db, "questions"),
      where("matchId", "==", matchId),
      where("innings", "==", innings)
    );

    const snapshot = await getDocs(q);

    const questions = snapshot.docs.map((item) => ({
      id: item.id,
      ...(item.data() as Omit<
        QuizQuestion,
        "id"
      >),
    }));

    return questions;
  } catch (error) {
    console.error(
      "Error getting questions for innings:",
      error
    );

    throw error;
  }
};

/**
 * Get unused questions for innings
 */
export const getUnusedQuestionsForInnings = async (
  matchId: string,
  innings: 1 | 2
): Promise<QuizQuestion[]> => {
  try {
    const q = query(
      collection(db, "questions"),
      where("matchId", "==", matchId),
      where("innings", "==", innings),
      where("used", "==", false)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((item) => ({
      id: item.id,
      ...(item.data() as Omit<
        QuizQuestion,
        "id"
      >),
    }));
  } catch (error) {
    console.error(
      "Error getting unused questions:",
      error
    );

    throw error;
  }
};

/**
 * Get all questions of a match
 *
 * Useful for second innings question filtering.
 */
export const getMatchQuestions = async (
  matchId: string
): Promise<QuizQuestion[]> => {
  try {
    const q = query(
      collection(db, "questions"),
      where("matchId", "==", matchId)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((item) => ({
      id: item.id,
      ...(item.data() as Omit<
        QuizQuestion,
        "id"
      >),
    }));
  } catch (error) {
    console.error("Error getting match questions:", error);
    throw error;
  }
};

/**
 * Mark question as used
 */
export const markQuestionUsed = async (
  questionId: string
): Promise<void> => {
  try {
    await updateDoc(
      doc(db, "questions", questionId),
      {
        used: true,
        usedAt: serverTimestamp(),
      }
    );
  } catch (error) {
    console.error("Error marking question used:", error);
    throw error;
  }
};

/**
 * Delete match question
 */
export const deleteQuestion = async (
  questionId: string
): Promise<void> => {
  try {
    await deleteDoc(
      doc(db, "questions", questionId)
    );
  } catch (error) {
    console.error("Error deleting question:", error);
    throw error;
  }
};

/**
 * Get question count
 */
export const getQuestionCount = async (
  matchId: string,
  innings: 1 | 2
): Promise<number> => {
  const questions =
    await getQuestionsForInnings(
      matchId,
      innings
    );

  return questions.length;
};

// ======================================================
// MATCH FUNCTIONS
// ======================================================

/**
 * Create actual match
 */
export const createMatch = async (
  data: Omit<
    MatchData,
    "id" | "createdBy" | "createdAt"
  >
): Promise<string> => {
  try {
    const user = requireUser();

    const matchRef = await addDoc(
      collection(db, "matches"),
      {
        ...data,

        createdBy: user.uid,

        createdAt: serverTimestamp(),

        updatedAt: serverTimestamp(),
      }
    );

    return matchRef.id;
  } catch (error) {
    console.error("Error creating match:", error);
    throw error;
  }
};

/**
 * Get match
 */
export const getMatch = async (
  matchId: string
): Promise<MatchData | null> => {
  try {
    const matchSnap = await getDoc(
      doc(db, "matches", matchId)
    );

    if (!matchSnap.exists()) {
      return null;
    }

    return {
      id: matchSnap.id,
      ...(matchSnap.data() as Omit<
        MatchData,
        "id"
      >),
    };
  } catch (error) {
    console.error("Error getting match:", error);
    throw error;
  }
};

/**
 * Update match score
 */
export const updateMatchScore = async (
  matchId: string,
  teamAScore: number,
  teamBScore: number
): Promise<void> => {
  try {
    await updateDoc(
      doc(db, "matches", matchId),
      {
        teamAScore,
        teamBScore,
        updatedAt: serverTimestamp(),
      }
    );
  } catch (error) {
    console.error("Error updating match score:", error);
    throw error;
  }
};

/**
 * Update match status
 */
export const updateMatchStatus = async (
  matchId: string,
  status: MatchData["status"],
  winnerTeam?: string
): Promise<void> => {
  try {
    const updateData: {
      status: MatchData["status"];
      updatedAt: unknown;
      winnerTeam?: string;
    } = {
      status,
      updatedAt: serverTimestamp(),
    };

    if (winnerTeam) {
      updateData.winnerTeam = winnerTeam;
    }

    await updateDoc(
      doc(db, "matches", matchId),
      updateData
    );
  } catch (error) {
    console.error("Error updating match status:", error);
    throw error;
  }
};

/**
 * Update toss details directly on match
 */
export const updateMatchToss = async (
  matchId: string,
  tossWinner: string,
  battingTeam: string,
  bowlingTeam: string,
  tossDecision?: "bat" | "bowl"
): Promise<void> => {
  try {
    await updateDoc(
      doc(db, "matches", matchId),
      {
        tossWinner,
        tossDecision,
        battingTeam,
        bowlingTeam,
        status: "toss-completed",
        updatedAt: serverTimestamp(),
      }
    );
  } catch (error) {
    console.error("Error updating match toss:", error);
    throw error;
  }
};

// ======================================================
// BALL EVENT FUNCTIONS
// ======================================================

/**
 * Save ball event
 *
 * matches/{matchId}/ballEvents
 */
export const saveBallEvent = async (
  data: Omit<BallEvent, "id" | "createdAt">
): Promise<string> => {
  try {
    const ballRef = await addDoc(
      collection(
        db,
        "matches",
        data.matchId,
        "ballEvents"
      ),
      {
        ...data,

        createdAt: serverTimestamp(),
      }
    );

    return ballRef.id;
  } catch (error) {
    console.error("Error saving ball event:", error);
    throw error;
  }
};

/**
 * Get ball events
 */
export const getBallEvents = async (
  matchId: string
): Promise<BallEvent[]> => {
  try {
    const q = query(
      collection(
        db,
        "matches",
        matchId,
        "ballEvents"
      ),
      orderBy("ballNo", "asc")
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((item) => ({
      id: item.id,
      ...(item.data() as Omit<
        BallEvent,
        "id"
      >),
    }));
  } catch (error) {
    console.error("Error getting ball events:", error);
    throw error;
  }
};

// ======================================================
// MATCH HISTORY
// ======================================================

/**
 * Save completed match history
 */
export const saveMatchHistory = async (
  data: Omit<
    MatchHistoryData,
    "id" | "playedBy" | "createdAt"
  >
): Promise<string> => {
  try {
    const user = requireUser();

    const historyRef = await addDoc(
      collection(db, "matchHistory"),
      {
        ...data,

        playedBy: user.uid,

        createdAt: serverTimestamp(),
      }
    );

    return historyRef.id;
  } catch (error) {
    console.error("Error saving match history:", error);
    throw error;
  }
};

/**
 * Get current teacher's match history
 */
export const getMatchHistory = async (): Promise<
  MatchHistoryData[]
> => {
  try {
    const user = requireUser();

    const q = query(
      collection(db, "matchHistory"),
      where("playedBy", "==", user.uid)
    );

    const snapshot = await getDocs(q);

    const history = snapshot.docs.map((item) => ({
      id: item.id,
      ...(item.data() as Omit<
        MatchHistoryData,
        "id"
      >),
    }));

    // Sort locally to avoid composite-index issue
    history.sort((a, b) => {
      const aTime =
        (a.createdAt as any)?.seconds || 0;

      const bTime =
        (b.createdAt as any)?.seconds || 0;

      return bTime - aTime;
    });

    return history;
  } catch (error) {
    console.error("Error getting match history:", error);
    throw error;
  }
};

// ======================================================
// ADMIN STATS
// ======================================================

/**
 * Get Admin Dashboard Statistics
 */
export const getAdminStats =
  async (): Promise<AdminStats> => {
    try {
      const [
        teachersSnapshot,
        usersSnapshot,
        teamsSnapshot,
        questionBanksSnapshot,
        matchesSnapshot,
      ] = await Promise.all([
        getDocs(
          collection(db, "teachers")
        ),

        getDocs(
          collection(db, "users")
        ),

        getDocs(
          collection(db, "teams")
        ),

        getDocs(
          collection(db, "questionBanks")
        ),

        getDocs(
          collection(db, "matches")
        ),
      ]);

      const completedMatches =
        matchesSnapshot.docs.filter(
          (item) =>
            item.data().status ===
            "completed"
        ).length;

      return {
        teachers: teachersSnapshot.size,

        users: usersSnapshot.size,

        teams: teamsSnapshot.size,

        questionBanks:
          questionBanksSnapshot.size,

        matches: matchesSnapshot.size,

        completedMatches,
      };
    } catch (error) {
      console.error("Error getting admin stats:", error);
      throw error;
    }
  };