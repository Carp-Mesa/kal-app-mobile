import api from '@/src/services/apiClient';
import { useQuery } from '@tanstack/react-query';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DailyCalorieStat {
  date: string;        // 'YYYY-MM-DD'
  total_calories: number;
}

export interface WeeklyStatsResponse {
  calorie_goal: number;
  daily_stats: DailyCalorieStat[];
}

// ─── Fetcher ─────────────────────────────────────────────────────────────────

const fetchWeeklyStats = async (): Promise<WeeklyStatsResponse> => {
  const response = await api.get<WeeklyStatsResponse>('/nutrition/progress/weekly');
  return response.data;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useWeeklyStats = () => {
  return useQuery({
    queryKey: ['weeklyStats'],
    queryFn: fetchWeeklyStats,
    // Revalidar cada 5 minutos, no en cada focus de pantalla
    staleTime: 5 * 60 * 1000,
    // Toleramos datos desactualizados hasta 10 minutos
    gcTime: 10 * 60 * 1000,
    // No falla la UI completa si el endpoint aún no existe
    retry: 1,
  });
};
