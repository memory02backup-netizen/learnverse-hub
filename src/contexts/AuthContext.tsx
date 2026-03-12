import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { UserDoc } from "@/types";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  userDoc: UserDoc | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<string>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshUserDoc: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}

// Cache user doc in localStorage
const USER_DOC_KEY = "lms_user_doc";
const USER_DOC_TS_KEY = "lms_user_doc_ts";
const USER_DOC_TTL = 5 * 60 * 1000; // 5 min

function getCachedUserDoc(): UserDoc | null {
  try {
    const ts = localStorage.getItem(USER_DOC_TS_KEY);
    if (ts && Date.now() - Number(ts) < USER_DOC_TTL) {
      const raw = localStorage.getItem(USER_DOC_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch {}
  return null;
}

function setCachedUserDoc(doc: UserDoc | null) {
  try {
    if (doc) {
      localStorage.setItem(USER_DOC_KEY, JSON.stringify(doc));
      localStorage.setItem(USER_DOC_TS_KEY, String(Date.now()));
    } else {
      localStorage.removeItem(USER_DOC_KEY);
      localStorage.removeItem(USER_DOC_TS_KEY);
    }
  } catch {}
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserDoc = async (uid: string) => {
    // Try cache first
    const cached = getCachedUserDoc();
    if (cached) {
      setUserDoc(cached);
    }
    // Always fetch fresh in background
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      const data = snap.data() as UserDoc;
      setUserDoc(data);
      setCachedUserDoc(data);
    } else {
      setUserDoc(null);
      setCachedUserDoc(null);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await fetchUserDoc(u.uid);
      } else {
        setUserDoc(null);
        setCachedUserDoc(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await fetchUserDoc(cred.user.uid);
  };

  const register = async (email: string, password: string, name: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const newUser: UserDoc = {
      name,
      email,
      role: "student",
      status: "pending",
      enrolledCourses: [],
      activeCourseId: "",
      paymentInfo: { method: "", paymentNumber: "", transactionId: "", screenshot: "" },
      createdAt: Timestamp.now(),
    };
    await setDoc(doc(db, "users", cred.user.uid), newUser);
    setUserDoc(newUser);
    setCachedUserDoc(newUser);
    return cred.user.uid;
  };

  const logout = async () => {
    await signOut(auth);
    setUserDoc(null);
    setCachedUserDoc(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const refreshUserDoc = async () => {
    if (user) await fetchUserDoc(user.uid);
  };

  return (
    <AuthContext.Provider value={{ user, userDoc, loading, login, register, logout, resetPassword, refreshUserDoc }}>
      {children}
    </AuthContext.Provider>
  );
}
