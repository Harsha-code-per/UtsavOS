"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/ai/types";
import { api, errorMessage } from "@/lib/api/client";
import type { Plan, PlanChange } from "@/lib/domain/schema";

export type Outcome =
  { kind: "applied" } | { kind: "dismissed" } | { kind: "failed"; reason: string };

export interface Turn extends ChatMessage {
  id: string;
  changes?: PlanChange[];
  outcome?: Outcome;
}

/** How many recent messages are sent as context (the API accepts up to 16). */
const HISTORY = 12;

/** Conversation state for the co-planner: sending, replies, and settling proposals. */
export function useCoPlannerChat(plan: Plan) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const planRef = useRef(plan);
  const turnsRef = useRef(turns);

  // Read the latest plan and history inside `send` without re-creating it.
  useEffect(() => {
    planRef.current = plan;
    turnsRef.current = turns;
  }, [plan, turns]);

  const send = useCallback(async (text: string) => {
    const message = text.trim();
    if (!message) return;
    const history: Turn[] = [
      ...turnsRef.current,
      { id: crypto.randomUUID(), role: "user", text: message },
    ];
    setTurns(history);
    setError(null);
    setBusy(true);
    try {
      const context = history.slice(-HISTORY).map(({ role, text: t }) => ({ role, text: t }));
      const { reply, changes } = await api.chat(planRef.current, context);
      setTurns((t) => [...t, { id: crypto.randomUUID(), role: "model", text: reply, changes }]);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }, []);

  const settle = useCallback((id: string, outcome: Outcome) => {
    setTurns((t) => t.map((turn) => (turn.id === id ? { ...turn, outcome } : turn)));
  }, []);

  return { turns, busy, error, setError, send, settle };
}

export type CoPlannerChat = ReturnType<typeof useCoPlannerChat>;
