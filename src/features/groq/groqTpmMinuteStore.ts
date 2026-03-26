import { GROQ_RECIPES_PER_BATCH } from "./groqConstants";

// Client-side TPM helper: sums Groq `usage.total_tokens` per request within the
// current calendar minute and forecasts the next "Generate" click from a
// rolling average of recent calls (each pipeline step = one HTTP call).
//
// Unknown persisted shape is treated as empty.

const STORAGE_KEY = "groq_tpm_minute_state";

const TPM_LIMIT_TOKENS_PER_MINUTE = 10_000;
const BUFFER_TOKENS = 2_000;

/** When Groq omits usage or state is new — per-request prior (several calls ≈ one recipe). */
const FALLBACK_TOKENS_PER_CALL = 3_500;

const RECENT_CALLS_MAX = 32;

/** When Groq omits a parseable retry hint on rate-limit errors. */
const COOLDOWN_MS_ON_RATE_LIMIT = 60_000;

/** Avoid a zero-second countdown when Groq returns e.g. 96ms. */
const MIN_COOLDOWN_WHEN_PARSED_MS = 1_000;

/**
 * Parse Groq rate-limit hints, e.g. `Please try again in 4.72 seconds`, `… in 4.59s`, `… in 96ms`.
 * Returns milliseconds for `cooldownUntilMs = now + value`, or null if not found.
 */
export function parseGroqRetryAfterMsFromMessage(msg: string): number | null {
  const msMatch = msg.match(/try again in\s+(\d+(?:\.\d+)?)\s*ms\b/i);
  if (msMatch) {
    const v = Number(msMatch[1]);
    if (Number.isFinite(v) && v >= 0) return Math.ceil(v);
  }
  // Word "seconds" must come before the bare `s` pattern — `\s*s\b` does not match "seconds".
  const secWordMatch = msg.match(/try again in\s+(\d+(?:\.\d+)?)\s*seconds?\b/i);
  if (secWordMatch) {
    const sec = Number(secWordMatch[1]);
    if (Number.isFinite(sec) && sec >= 0) return Math.ceil(sec * 1000);
  }
  const secAbbrMatch = msg.match(/try again in\s+(\d+(?:\.\d+)?)\s*secs?\b/i);
  if (secAbbrMatch) {
    const sec = Number(secAbbrMatch[1]);
    if (Number.isFinite(sec) && sec >= 0) return Math.ceil(sec * 1000);
  }
  const sMatch = msg.match(/try again in\s+(\d+(?:\.\d+)?)\s*s\b/i);
  if (sMatch) {
    const sec = Number(sMatch[1]);
    if (Number.isFinite(sec) && sec >= 0) return Math.ceil(sec * 1000);
  }
  return null;
}

type GroqTpmMinuteState = {
  minuteIndex: number;
  tokensUsedThisMinute: number;
  cooldownUntilMs: number | null;
  recentCallTotalTokens: number[];
};

function getMinuteIndex(nowMs: number): number {
  return Math.floor(nowMs / 60_000);
}

function isValidNumberArray(x: unknown): x is number[] {
  return (
    Array.isArray(x) &&
    x.every((n) => typeof n === "number" && Number.isFinite(n) && n >= 0)
  );
}

function loadState(): GroqTpmMinuteState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed.minuteIndex !== "number") return null;
    if (typeof parsed.tokensUsedThisMinute !== "number") return null;
    if (
      parsed.cooldownUntilMs !== null &&
      typeof parsed.cooldownUntilMs !== "number"
    )
      return null;
    if (!isValidNumberArray(parsed.recentCallTotalTokens)) return null;
    return {
      minuteIndex: parsed.minuteIndex,
      tokensUsedThisMinute: parsed.tokensUsedThisMinute,
      cooldownUntilMs: parsed.cooldownUntilMs ?? null,
      recentCallTotalTokens: parsed.recentCallTotalTokens.slice(-RECENT_CALLS_MAX),
    };
  } catch {
    return null;
  }
}

function saveState(state: GroqTpmMinuteState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota/private mode
  }
}

function averageTokensPerCall(st: GroqTpmMinuteState): number {
  const arr = st.recentCallTotalTokens;
  if (arr.length === 0) return FALLBACK_TOKENS_PER_CALL;
  const sum = arr.reduce((a, b) => a + b, 0);
  return sum / arr.length;
}

function ensureStateForNow(nowMs: number): GroqTpmMinuteState {
  const curMinute = getMinuteIndex(nowMs);
  const loaded = loadState();

  if (!loaded) {
    const fresh: GroqTpmMinuteState = {
      minuteIndex: curMinute,
      tokensUsedThisMinute: 0,
      cooldownUntilMs: null,
      recentCallTotalTokens: [],
    };
    saveState(fresh);
    return fresh;
  }

  if (loaded.minuteIndex !== curMinute) {
    const fresh: GroqTpmMinuteState = {
      ...loaded,
      minuteIndex: curMinute,
      tokensUsedThisMinute: 0,
      cooldownUntilMs: null,
    };
    saveState(fresh);
    return fresh;
  }

  if (loaded.cooldownUntilMs !== null && loaded.cooldownUntilMs <= nowMs) {
    const cleaned: GroqTpmMinuteState = { ...loaded, cooldownUntilMs: null };
    saveState(cleaned);
    return cleaned;
  }

  return loaded;
}

function estimateTokensCostNextClick(st: GroqTpmMinuteState): number {
  const perCall = averageTokensPerCall(st);
  /** One-shot architecture: exactly one backend generation call per recipe. */
  const callsPerRecipe = 1;
  return GROQ_RECIPES_PER_BATCH * callsPerRecipe * perCall;
}

function getSecondsUntil(nowMs: number, targetMs: number): number {
  const ms = targetMs - nowMs;
  if (ms <= 0) return 0;
  return Math.ceil(ms / 1000);
}

export function getBudgetState(nowMs: number): {
  minuteIndex: number;
  tokensUsedThisMinute: number;
  cooldownUntilMs: number | null;
  estimatedTokensUsed: number;
  estimatedTokensRemaining: number;
  avgTokensPerCall: number;
} {
  const st = ensureStateForNow(nowMs);
  const estimatedTokensUsed = st.tokensUsedThisMinute;
  const estimatedTokensRemaining =
    TPM_LIMIT_TOKENS_PER_MINUTE - BUFFER_TOKENS - estimatedTokensUsed;
  return {
    minuteIndex: st.minuteIndex,
    tokensUsedThisMinute: st.tokensUsedThisMinute,
    cooldownUntilMs: st.cooldownUntilMs,
    estimatedTokensUsed,
    estimatedTokensRemaining,
    avgTokensPerCall: averageTokensPerCall(st),
  };
}

/**
 * Record one Groq chat completion's token usage (each field request counts as one call).
 * If `totalTokens` is missing, uses the current rolling average or fallback.
 */
export function recordGroqApiUsage(nowMs: number, totalTokens?: number): void {
  const st = ensureStateForNow(nowMs);
  const fallback = averageTokensPerCall(st);
  const raw =
    typeof totalTokens === "number" &&
    Number.isFinite(totalTokens) &&
    totalTokens > 0
      ? Math.round(totalTokens)
      : Math.round(fallback);
  const capped = Math.min(Math.max(0, raw), 200_000);
  const recent = [...st.recentCallTotalTokens, capped].slice(-RECENT_CALLS_MAX);
  const next: GroqTpmMinuteState = {
    ...st,
    tokensUsedThisMinute: st.tokensUsedThisMinute + capped,
    recentCallTotalTokens: recent,
  };
  saveState(next);
}

export function estimateWaitSecondsForNextClick(nowMs: number): number {
  const st = ensureStateForNow(nowMs);
  if (st.cooldownUntilMs !== null && st.cooldownUntilMs > nowMs) {
    return getSecondsUntil(nowMs, st.cooldownUntilMs);
  }

  // No measured usage this minute: allow click (cold start / new window).
  if (st.tokensUsedThisMinute === 0) return 0;

  const tokensRemaining =
    TPM_LIMIT_TOKENS_PER_MINUTE - BUFFER_TOKENS - st.tokensUsedThisMinute;
  const costNextClick = estimateTokensCostNextClick(st);

  if (tokensRemaining >= costNextClick) return 0;

  const nextMinuteMs = (st.minuteIndex + 1) * 60_000;
  return getSecondsUntil(nowMs, nextMinuteMs);
}

export function recordRateLimitCooldown(nowMs: number, errorMessage?: string): void {
  const st = ensureStateForNow(nowMs);
  let durationMs = COOLDOWN_MS_ON_RATE_LIMIT;
  if (errorMessage) {
    const parsed = parseGroqRetryAfterMsFromMessage(errorMessage);
    if (parsed !== null) {
      durationMs = Math.max(parsed, MIN_COOLDOWN_WHEN_PARSED_MS);
    }
  }
  const next: GroqTpmMinuteState = {
    ...st,
    cooldownUntilMs: nowMs + durationMs,
  };
  saveState(next);
}
