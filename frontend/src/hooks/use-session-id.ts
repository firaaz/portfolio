import { useState } from "react";

const KEY = "portfolio.sid";

function readOrCreate(): string {
  const existing = sessionStorage.getItem(KEY);
  if (existing) return existing;
  const fresh = crypto.randomUUID();
  sessionStorage.setItem(KEY, fresh);
  return fresh;
}

export function useSessionId(): string {
  const [id] = useState(readOrCreate);
  return id;
}
