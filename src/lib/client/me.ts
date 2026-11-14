"use client";

import { useEffect, useSyncExternalStore } from "react";

import { api, type Me } from "./api";

export type MeState = { status: "loading" } | { status: "ready"; me: Me } | { status: "error" };

/** One shared copy of the player's summary for every component on the page. */
let state: MeState = { status: "loading" };
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function set(next: MeState) {
  state = next;
  listeners.forEach((listener) => listener());
}

/** Fetches the summary again, e.g. after a case ends and the streak may have changed. */
export function refreshMe(): Promise<void> {
  inflight ??= api
    .me()
    .then(
      (me) => set({ status: "ready", me }),
      () => set({ status: "error" }),
    )
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const LOADING: MeState = { status: "loading" };

export function useMe(): MeState {
  const snapshot = useSyncExternalStore(subscribe, () => state, () => LOADING);
  useEffect(() => {
    if (state.status === "loading") void refreshMe();
  }, []);
  return snapshot;
}
