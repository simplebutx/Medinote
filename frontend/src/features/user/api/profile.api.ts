import { authInstance } from '../../../api/axiosInstance';
import type { UserProfile } from '../types/profile.types';

export const getMyProfile = async () => {
  const response = await authInstance.get<UserProfile>('/api/auth/me');

  return response.data;
};