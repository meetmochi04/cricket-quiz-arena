import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";

import type { User } from "firebase/auth";

import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "./firebase";


// =========================================
// REGISTER TEACHER
// =========================================
export const registerTeacher = async (
  name: string,
  email: string,
  password: string
): Promise<User> => {

  const result = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );

  const user = result.user;

  // Save name in Firebase Authentication profile
  await updateProfile(user, {
    displayName: name,
  });

  // Save teacher information in Firestore
  await setDoc(doc(db, "teachers", user.uid), {
    name: name,
    email: email,
    createdAt: serverTimestamp(),
  });

  return user;
};


// =========================================
// LOGIN TEACHER
// =========================================
export const loginTeacher = async (
  email: string,
  password: string
): Promise<User> => {

  const result = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );

  return result.user;
};


// =========================================
// GET TEACHER NAME
// =========================================
export const getTeacherName = async (
  user: User
): Promise<string> => {

  // First try Firebase Auth displayName
  if (user.displayName) {
    return user.displayName;
  }

  // Otherwise get name from Firestore
  const teacherRef = doc(db, "teachers", user.uid);
  const teacherSnap = await getDoc(teacherRef);

  if (teacherSnap.exists()) {
    const data = teacherSnap.data();

    if (data.name) {
      return data.name;
    }
  }

  return "Teacher";
};


// =========================================
// LOGOUT TEACHER
// =========================================
export const logoutTeacher = async (): Promise<void> => {
  await signOut(auth);
};


// =========================================
// OBSERVE AUTH
// =========================================
export const observeAuth = (
  callback: (user: User | null) => void
) => {
  return onAuthStateChanged(auth, callback);
};


// =========================================
// OLD FUNCTION NAMES
// Keep compatibility with existing code
// =========================================
export const registerUser = async (
  email: string,
  password: string
): Promise<User> => {

  return registerTeacher(
    "Teacher",
    email,
    password
  );
};

export const loginUser = loginTeacher;

export const logoutUser = logoutTeacher;