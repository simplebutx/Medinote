import { authInstance } from '../../../api/axiosInstance';
import type {
  UpdateMyProfileRequest,
  UserProfile,
} from '../types/profile.types';

export const getMyProfile = async () => {
  const response = await authInstance.get<UserProfile>('/api/auth/me');

  return response.data;
};

export const updateMyProfile = async (body: UpdateMyProfileRequest) => {
  const response = await authInstance.patch('/api/auth/me', body);

  return response.data;
};

export const suggestDiseases = async (keyword: string) => {
  const response = await authInstance.get<string[]>(
    '/api/auth/diseases/suggest',
    {
      params: {
        keyword,
      },
    },
  );

  return response.data;
};