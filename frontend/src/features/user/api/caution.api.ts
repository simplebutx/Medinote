import { medicationInstance } from "../../../api/axiosInstance";
import type {
  CautionItem,
  CautionRequest,
  CautionSuggestItem,
  CautionTargetType,
} from "../types/caution.types";

export const getMyCautions = async () => {
  const response = await medicationInstance.get<CautionItem[]>(
    "/api/me/cautions"
  );

  return response.data;
};

export const createMyCaution = async (body: CautionRequest) => {
  const response = await medicationInstance.post<CautionItem>(
    "/api/me/cautions",
    body
  );

  return response.data;
};

export const updateMyCaution = async (id: number, body: CautionRequest) => {
  const response = await medicationInstance.patch<CautionItem>(
    `/api/me/cautions/${id}`,
    body
  );

  return response.data;
};

export const deleteMyCaution = async (id: number) => {
  await medicationInstance.delete(`/api/me/cautions/${id}`);
};

export const suggestMyCautions = async (
  keyword: string,
  type: CautionTargetType
) => {
  const response = await medicationInstance.post<CautionSuggestItem[]>(
    "/api/me/cautions/suggest",
    null,
    {
      params: {
        keyword,
        type,
      },
    }
  );

  return response.data;
};