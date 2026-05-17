// ═══════════════════════════════════════════════════════════════════════════════
// Gains Station — Local-First Sync Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Base metadata for every locally-persisted record.
 *
 * - `id`         — UUID v4 generated on the client via crypto.randomUUID()
 * - `synced`     — `false` until the server confirms receipt
 * - `updated_at` — ISO-8601 timestamp of the last local mutation
 */
export interface SyncMeta {
  id: string;
  synced: boolean;
  updated_at: string; // ISO-8601
}

// ─── Domain Entities ─────────────────────────────────────────────────────────

export interface WaterLog extends SyncMeta {
  amount_ml: number;
  created_at: string; // ISO-8601
}

export interface NutritionLog extends SyncMeta {
  meal_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  is_cheat_meal: boolean;
  created_at: string; // ISO-8601
}

export interface SleepLog extends SyncMeta {
  start_time: string; // ISO-8601
  end_time: string;   // ISO-8601
  date: string;       // YYYY-MM-DD
  quality_score: number;
}

export interface ExerciseLog {
  id: string;
  name: string;
  sets: { reps: number; weight_kg: number }[];
  rpe?: number;
}

export interface WorkoutLog extends SyncMeta {
  name: string;
  date: string;       // YYYY-MM-DD
  duration_mins: number;
  notes?: string;
  exercises: ExerciseLog[];
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export interface ProfileData {
  id?: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  age?: number;
  height?: number;
  current_weight?: number;
  body_fat_percentage?: number;
  weight_goal?: number;
  calorie_goal?: number;
  protein_goal?: number;
  carbs_goal?: number;
  fats_goal?: number;
  water_goal?: number;
  sleep_goal?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns the local date string in YYYY-MM-DD (device timezone). */
export function getLocalDateString(date?: Date): string {
  const d = date ?? new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Generates a UUID v4 using the native crypto API. */
export function generateId(): string {
  // crypto.randomUUID is available in React Native Hermes ≥ 0.72 and modern V8
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback — RFC-4122 compliant
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
