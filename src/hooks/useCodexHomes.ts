import { useCallback, useState } from "react";
import type { CodexHome, CodexHomesResponse } from "../../shared/types";
import { invoke } from "../lib/invoke";

interface CodexHomesState {
  homes: CodexHome[];
  activeHome: CodexHome | null;
  loading: boolean;
  error: string;
  multiHomeEnabled: boolean;
  selectedIndex: number;
}

const initialState: CodexHomesState = {
  homes: [],
  activeHome: null,
  loading: false,
  error: "",
  multiHomeEnabled: false,
  selectedIndex: 0,
};

export function useCodexHomes() {
  const [state, setState] = useState(initialState);

  const discoverHomes = useCallback(async (): Promise<CodexHomesResponse | null> => {
    setState((previous) => ({ ...previous, loading: true, error: "" }));
    try {
      const response = await invoke<CodexHomesResponse>("list_codex_homes");
      setState((previous) => ({
        ...previous,
        homes: response.homes,
        loading: false,
        error: "",
        multiHomeEnabled: response.multi_home_enabled,
        selectedIndex: 0,
      }));
      return response;
    } catch (error) {
      setState((previous) => ({
        ...previous,
        homes: [],
        loading: false,
        error: String(error),
        selectedIndex: 0,
      }));
      return null;
    }
  }, []);

  const selectHome = useCallback((home: CodexHome) => {
    setState((previous) => ({ ...previous, activeHome: home }));
  }, []);

  const clearActiveHome = useCallback(() => {
    setState((previous) => ({ ...previous, activeHome: null, selectedIndex: 0 }));
  }, []);

  const setSelectedIndex = useCallback((index: number) => {
    setState((previous) => ({ ...previous, selectedIndex: index }));
  }, []);

  return {
    ...state,
    discoverHomes,
    selectHome,
    clearActiveHome,
    setSelectedIndex,
  };
}
