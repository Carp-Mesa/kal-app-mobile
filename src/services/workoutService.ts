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
  notes?: string;
  duration_mins?: number;
  exercises: ExercisePayload[];
}

export interface WorkoutResponse {
  workout_id: string;
  message: string;
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
