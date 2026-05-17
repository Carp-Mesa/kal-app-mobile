import apiClient from './apiClient';

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

export interface GoalsPayload {
  calorie_goal?: number;
  protein_goal?: number;
  carbs_goal?: number;
  fats_goal?: number;
  water_goal?: number;
  weight_goal?: number;
  full_name?: string;
}

export const getProfile = async (): Promise<ProfileData> => {
  const response = await apiClient.get<ProfileData>('/profile');
  return response.data;
};

export const updateProfile = async (data: Partial<ProfileData>): Promise<ProfileData> => {
  const response = await apiClient.patch<ProfileData>('/profile', data);
  return response.data;
};

export const updateGoals = async (data: GoalsPayload): Promise<ProfileData> => {
  const response = await apiClient.put<ProfileData>('/profile/goals', data);
  return response.data;
};