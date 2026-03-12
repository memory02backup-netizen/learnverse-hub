import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AppSettings } from "@/types";
import { getCached, setCache, CACHE_TTL } from "@/lib/firestoreCache";

const defaultSettings: AppSettings = {
  appName: "Darpan Academy",
  appLogo: "",
  youtubeChannel: "",
  googleDrive: "",
  paymentMethods: [],
  socialLinks: [],
  usefulLinks: [],
};

const AppSettingsContext = createContext<AppSettings>(defaultSettings);

export function useAppSettings() {
  return useContext(AppSettingsContext);
}

const CACHE_KEY = "settings_app";

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => {
    // Load from cache immediately for instant render
    const cached = getCached<AppSettings>(CACHE_KEY);
    return cached || defaultSettings;
  });

  useEffect(() => {
    // Fetch fresh data (single read instead of onSnapshot listener)
    getDoc(doc(db, "settings", "app")).then((snap) => {
      if (snap.exists()) {
        const data = { ...defaultSettings, ...snap.data() } as AppSettings;
        setSettings(data);
        setCache(CACHE_KEY, data, CACHE_TTL.SETTINGS);
      }
    });
  }, []);

  return (
    <AppSettingsContext.Provider value={settings}>
      {children}
    </AppSettingsContext.Provider>
  );
}
