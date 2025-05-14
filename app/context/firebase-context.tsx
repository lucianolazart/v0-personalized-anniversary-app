"use client";

import { createContext, useContext, ReactNode } from "react";
import { auth, db, storage } from "../lib/firebase";
import { User } from "firebase/auth";

interface FirebaseContextProps {
  auth: typeof auth;
  db: typeof db;
  storage: typeof storage;
  user: User | null;
}

const FirebaseContext = createContext<FirebaseContextProps | undefined>(undefined);

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error("useFirebase debe ser usado dentro de un FirebaseProvider");
  }
  return context;
}

interface FirebaseProviderProps {
  children: ReactNode;
}

export function FirebaseProvider({ children }: FirebaseProviderProps) {
  // Aquí podrías añadir un estado para el usuario actual si lo necesitas
  const user = auth.currentUser;

  return (
    <FirebaseContext.Provider value={{ auth, db, storage, user }}>
      {children}
    </FirebaseContext.Provider>
  );
} 