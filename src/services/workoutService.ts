import apiClient from './apiClient';

// --- Interfaces ---

export interface ExercisePayload {
  name: string;
  sets: number;
  reps: number;
  weight_kg: number;
  rpe: number;
}

export interface CreateWorkoutPayload {
  name: string;
  date: string; // 'YYYY-MM-DD' — siempre en zona horaria local, nunca .toISOString()
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
  sets: number;
  reps: number;
  weight_kg: number;
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

/**
 * Crea un nuevo entrenamiento con sus ejercicios.
 * Llama al endpoint que internamente ejecuta el RPC de Supabase
 * con rollback lógico para garantizar la integridad de los datos.
 */
export const createWorkout = async (
  payload: CreateWorkoutPayload
): Promise<WorkoutResponse> => {
  const response = await apiClient.post<WorkoutResponse>('/workout', payload);
  return response.data;
};

/**
 * Obtiene el historial de entrenamientos del usuario con paginación.
 */
export const getWorkoutHistory = async (
  limit = 10,
  offset = 0
): Promise<WorkoutHistoryResponse> => {
  const response = await apiClient.get<WorkoutHistoryResponse>(
    `/workout/history?limit=${limit}&offset=${offset}`
  );
  return response.data;
};
