import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
interface RequesterContextValue {
  requesterId: number | null;
  selectRequester: (requesterId: number) => void;
  clearRequester: () => void;
}

const STORAGE_KEY = "toktickit.developmentRequester";
const RequesterContext = createContext<RequesterContextValue | undefined>(undefined);

function readStoredRequesterId(): number | null {
  const value = sessionStorage.getItem(STORAGE_KEY);
  if (!value) return null;
  const requesterId = Number(value);
  if (Number.isInteger(requesterId) && requesterId > 0) return requesterId;
  sessionStorage.removeItem(STORAGE_KEY);
  return null;
}

export function RequesterProvider({ children }: { children: ReactNode }) {
  const [requesterId, setRequesterId] = useState<number | null>(readStoredRequesterId);
  const value = useMemo<RequesterContextValue>(() => ({
    requesterId,
    selectRequester: (nextId) => {
      sessionStorage.setItem(STORAGE_KEY, String(nextId));
      setRequesterId(nextId);
    },
    clearRequester: () => {
      sessionStorage.removeItem(STORAGE_KEY);
      setRequesterId(null);
    },
  }), [requesterId]);
  return <RequesterContext.Provider value={value}>{children}</RequesterContext.Provider>;
}

export function useRequester() {
  const value = useContext(RequesterContext);
  if (!value) throw new Error("useRequester must be used within RequesterProvider");
  return value;
}
