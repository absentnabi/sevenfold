"use client";

import { useCallback, useSyncExternalStore } from "react";

const nameKey = "sevenfold:name";

/** Server snapshot. A real name or player id is never this value. */
export const STORAGE_PENDING = "\u0000";

const listeners = new Set<() => void>();

function playerKey(code: string) {
  return `sevenfold:player:${code}`;
}

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getServerSnapshot() {
  return STORAGE_PENDING;
}

export function loadName(): string {
  try {
    return localStorage.getItem(nameKey) ?? "";
  } catch {
    return "";
  }
}

export function saveName(name: string) {
  try {
    localStorage.setItem(nameKey, name);
    emit();
  } catch {
    /* Private mode can block storage. The room still works for this visit. */
  }
}

export function loadPlayerId(code: string): string {
  try {
    return localStorage.getItem(playerKey(code)) ?? "";
  } catch {
    return "";
  }
}

export function savePlayerId(code: string, playerId: string) {
  try {
    localStorage.setItem(playerKey(code), playerId);
    emit();
  } catch {
    /* Same as above. */
  }
}

export function clearPlayerId(code: string) {
  try {
    localStorage.removeItem(playerKey(code));
    emit();
  } catch {
    /* Ignore. */
  }
}

export function useStoredName() {
  return useSyncExternalStore(subscribe, loadName, getServerSnapshot);
}

export function useStoredPlayerId(code: string) {
  const getSnapshot = useCallback(() => loadPlayerId(code), [code]);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
