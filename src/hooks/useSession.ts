import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "../lib/invoke";
import type { CodexSession } from "../../shared/types";
import { useTauriEvent } from "./useTauriEvent";

interface SessionState {
  session: CodexSession | null;
  loading: boolean;
  sessionPath: string;
}

const initialSessionState: SessionState = {
  session: null,
  loading: false,
  sessionPath: "",
};

export function useSession() {
  const [state, setState] = useState<SessionState>(initialSessionState);
  const requestGeneration = useRef(0);

  const loadSession = useCallback(async (path: string) => {
    const generation = ++requestGeneration.current;
    setState((prev) => ({ ...prev, loading: true }));
    try {
      try {
        await invoke<void>("unwatch_session");
      } catch {
        // ignore
      }
      const session = await invoke<CodexSession>("load_session", { path });
      if (generation !== requestGeneration.current) return;
      setState({ session, loading: false, sessionPath: path });
      try {
        await invoke<void>("watch_session", { path });
        if (generation !== requestGeneration.current) {
          await invoke<void>("unwatch_session");
        }
      } catch {
        // watcher is optional
      }
    } catch (err) {
      console.error("Failed to load session:", err);
      if (generation === requestGeneration.current) {
        setState((prev) => ({ ...prev, loading: false }));
      }
    }
  }, []);

  const resetSession = useCallback(async () => {
    requestGeneration.current += 1;
    setState(initialSessionState);
    try {
      await invoke<void>("unwatch_session");
    } catch {
      // watcher is optional
    }
  }, []);

  useTauriEvent<{ session: CodexSession }>("session-update", (payload) => {
    setState((prev) => (prev.sessionPath ? { ...prev, session: payload.session } : prev));
  });

  useEffect(() => {
    return () => {
      requestGeneration.current += 1;
      invoke<void>("unwatch_session").catch(() => {});
    };
  }, []);

  return {
    ...state,
    loadSession,
    resetSession,
  };
}
