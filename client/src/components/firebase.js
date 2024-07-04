import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, query, getDocs, updateDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const provider = new GoogleAuthProvider();

const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    console.log("User signed in: ", user);

    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        name: user.displayName,
        email: user.email,
        pronouns: "they/them",
        resumeText: "",
      });
    }
    return user;
  } catch (error) {
    console.error("Error signing in with Google: ", error);
    throw error;
  }
};

const getUserData = async (uid) => {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    return userSnap.data();
  } else {
    return null;
  }
};

const updateUserData = async (uid, data) => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, data);
};

const saveInterviewFeedback = async (uid, feedbackData) => {
  try {
    const interviewRef = collection(db, 'users', uid, 'interviews');
    const docRef = await addDoc(interviewRef, {
      ...feedbackData,
      timestamp: new Date(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error saving interview feedback:", error);
    throw error;
  }
};

const getInterviewHistory = async (uid) => {
  try {
    const interviewsRef = collection(db, 'users', uid, 'interviews');
    const q = query(interviewsRef);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting interview history:", error);
    throw error;
  }
};

const saveUserToFirestore = async (user, data) => {
  const userRef = doc(db, 'users', user.uid);
  await setDoc(userRef, data, { merge: true });
};

const updateUserResume = async (uid, resumeText) => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, { resumeText });
};

export { 
  auth, 
  signInWithGoogle, 
  getUserData, 
  updateUserData, 
  saveInterviewFeedback, 
  getInterviewHistory,
  saveUserToFirestore,
  updateUserResume
};