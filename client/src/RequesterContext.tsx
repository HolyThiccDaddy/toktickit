import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Requester } from "./api.js";

interface RequesterContextValue {
  requester: Requester | null;
  selectRequester: (requester: Requester) => void;
  clearRequester: () => void;
}

const STORAGE_KEY = "toktickit.developmentRequester";
const RequesterContext = createContext<RequesterContextValue | undefined>(undefined);

function readStoredRequester(): Requester | null {
  try {
    const value = sessionStorage.getItem(STORAGE_KEY);
    return value ? JSON.parse(value) as Requester : null;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function RequesterProvider({ children }: { children: ReactNode }) {
  const [requester, setRequester] = useState<Requester | null>(readStoredRequester);
  const value = useMemo<RequesterContextValue>(() => ({
    requester,
    selectRequester: (next) => {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setRequester(next);
    },
    clearRequester: () => {
      sessionStorage.removeItem(STORAGE_KEY);
      setRequester(null);
    },
  }), [requester]);
  return <RequesterContext.Provider value={value}>{children}</RequesterContext.Provider>;
}

export function useRequester() {
  const value = useContext(RequesterContext);
  if (!value) throw new Error("useRequester must be used within RequesterProvider");
  return value;
}
