import {
  medicationInstance,
  publicMedicationInstance,
} from "../../../api/axiosInstance";
import type {
  MedicineSearchItem,
  MedicineSuggestResponse,
} from "../types/drug.types";

export const suggestMedicines = async (keyword: string) => {
  const response =
    await publicMedicationInstance.post<MedicineSuggestResponse>(
      "/api/medicines/suggest",
      undefined,
      {
        params: {
          keyword,
        },
      }
    );

  return response.data;
};

export const searchMedicines = async (keyword: string) => {
  const response = await medicationInstance.get<MedicineSearchItem>(
    '/api/medicines/search',
    {
      params: {
        keyword,
      },
    },
  );

  return response.data ? [response.data] : [];
};
