import { authInstance } from '../../../api/axiosInstance';
import type {
  UpdateMyPharmacistProfileRequest,
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

export const updateMyPharmacistProfile = async (
  body: UpdateMyPharmacistProfileRequest,
) => {
  const formData = new FormData();

  const request = {
    docNumber: body.docNumber,
    licenseNumber: body.licenseNumber,
  };

  formData.append(
    'data',
    new Blob([JSON.stringify(request)], {
      type: 'application/json',
    }),
  );

  if (body.licenseImage) {
    formData.append('licenseImage', body.licenseImage);
  }

  const response = await authInstance.patch(
    '/api/auth/pharmacists/profile',
    formData,
  );

  return response.data;
};