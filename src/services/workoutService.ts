import apiClient from './apiClient';

// --- Interfaces ---

export interface SetEntry {
  reps: number;
  weight_kg: number;
}

export interface ExercisePayload {
  name: string;
  sets: SetEntry[];
  rpe?: number;
}

export interface CreateWorkoutPayload {
  name: string;
  date: string;
  notes?: string;
  duration_mins?: number;
  exercises: ExercisePayload[];
}

export interface WorkoutResponse {
  workout_id: string;
  message: string;
}

// --- Interfaces: History ---

export interface WorkoutExercise {
  id: string;
  name: string;
  sets?: SetEntry[];
  exercise_sets?: SetEntry[];
  rpe?: number;
}

export interface WorkoutHistoryItem {
  id: string;
  name: string;
  notes?: string;
  duration_mins?: number;
  date: string;
  exercises: WorkoutExercise[];
}

export interface WorkoutHistoryResponse {
  data: WorkoutHistoryItem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

// --- Service ---

export const createWorkout = async (
  payload: CreateWorkoutPayload
): Promise<WorkoutResponse> => {
  const response = await apiClient.post<WorkoutResponse>('/workout', payload);
  return response.data;
};

export const getWorkoutHistory = async (
  limit = 10,
  offset = 0
): Promise<WorkoutHistoryResponse> => {
  const response = await apiClient.get<WorkoutHistoryResponse>(
    `/workout/history?limit=${limit}&offset=${offset}`
  );
  return response.data;
};

export const getWorkoutDetail = async (
  id: string
): Promise<WorkoutHistoryItem> => {
  const response = await apiClient.get<WorkoutHistoryItem>(`/workout/${id}`);
  return response.data;
};

export const getExerciseSuggestions = async (): Promise<string[]> => {
  const response = await apiClient.get<string[]>('/workout/exercises/suggestions');
  return response.data;
};

// --- Helpers ---

/**
 * Normaliza el campo de series: el backend puede devolverlo como `.sets` o `.exercise_sets`.
 */
export const resolveSets = (exercise: WorkoutExercise): SetEntry[] => {
  return exercise.sets || exercise.exercise_sets || [];
};