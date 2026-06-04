import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 300000,
})

const AUTH_STORAGE_KEY = 'authSession'

export const login = async (payload) => {
  const response = await api.post('/auth/login', payload)
  return response.data
}

export const logout = async (accessToken) => {
  const response = await api.post('/auth/logout', null, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
  return response.data
}

export const saveAuthSession = (session) => {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
}

export const getAuthSession = () => {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    return null
  }
}

export const clearAuthSession = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}

api.interceptors.request.use((config) => {
  const session = getAuthSession()

  if (session?.accessToken) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${session.accessToken}`
  }

  return config
})

export const getMedicineSyncStatus = async () => {
  const response = await api.get('/medicines/sync-status')
  return response.data
}

export const syncMedicines = async () => {
  const response = await api.post('/medicines/sync')
  return response.data
}

export const createChatbotRoom = async (payload = {}) => {
  const response = await api.post('/chatbot/rooms', payload)
  return response.data
}

export const getChatbotRooms = async () => {
  const response = await api.get('/chatbot/rooms')
  return response.data
}

export const updateChatbotRoom = async (roomId, payload) => {
  const response = await api.patch(`/chatbot/rooms/${roomId}`, payload)
  return response.data
}

export const deleteChatbotRoom = async (roomId) => {
  await api.delete(`/chatbot/rooms/${roomId}`)
}

export const getChatbotMessages = async (roomId) => {
  const response = await api.get(`/chatbot/rooms/${roomId}/messages`)
  return response.data
}

export const sendChatbotMessage = async (roomId, message) => {
  const response = await api.post('/chatbot/message', { roomId, message }, {
    timeout: 300000,
  })
  return response.data
}

export const deleteChatbotMessage = async (messageId) => {
  await api.delete(`/chatbot/messages/${messageId}`)
}

export const suggestMedicines = async (keyword) => {
  const response = await api.post('/medicines/suggest', null, {
    params: { keyword },
    timeout: 300000,
  })
  return response.data
}

export const suggestCautions = async (keyword, type) => {
  const response = await api.post('/me/cautions/suggest', null, {
    params: { keyword, type },
    timeout: 300000,
  })
  return response.data
}

export const createCaution = async (payload) => {
  const response = await api.post('/me/cautions', payload)
  return response.data
}

export const getCautions = async () => {
  const response = await api.get('/me/cautions')
  return response.data
}

export const updateCaution = async (id, payload) => {
  const response = await api.patch(`/me/cautions/${id}`, payload)
  return response.data
}

export const deleteCaution = async (id) => {
  await api.delete(`/me/cautions/${id}`)
}

export const searchMedicines = async (keyword) => {
  const response = await api.get('/medicines/search', {
    params: { keyword },
    timeout: 300000,
  })
  return response.data
}

export const getPharmaciesInBounds = async (params) => {
  const response = await api.get('/pharmacies', {
    params,
    timeout: 30000,
  })
  return response.data
}

export const getPharmacyDetail = async (hpid) => {
  const response = await api.get(`/pharmacies/${hpid}`, {
    timeout: 30000,
  })
  return response.data
}

export const createMedicationSchedule = async (payload) => {
  const response = await api.post('/medication-schedules', payload)
  return response.data
}

export const getMedicationSchedules = async () => {
  const response = await api.get('/medication-schedules')
  return response.data
}

export const getMedicationSchedule = async (id) => {
  const response = await api.get(`/medication-schedules/${id}`)
  return response.data
}

export const updateMedicationSchedule = async (id, payload) => {
  const response = await api.put(`/medication-schedules/${id}`, payload)
  return response.data
}

export const deleteMedicationSchedule = async (id) => {
  await api.delete(`/medication-schedules/${id}`)
}

export const createMedicationScheduleTime = async (payload) => {
  const response = await api.post('/medication-schedule-times', payload)
  return response.data
}

export const getMedicationScheduleTimes = async (medicationScheduleId) => {
  const response = await api.get('/medication-schedule-times', {
    params: { medicationScheduleId },
  })
  return response.data
}

export const updateMedicationScheduleTime = async (id, payload) => {
  const response = await api.put(`/medication-schedule-times/${id}`, payload)
  return response.data
}

export const deleteMedicationScheduleTime = async (id) => {
  await api.delete(`/medication-schedule-times/${id}`)
}

export const createMedicationIntakeLog = async (payload) => {
  const response = await api.post('/medication-intake-logs', payload)
  return response.data
}

export const createPrescriptionUploadUrl = async (payload) => {
  const response = await api.post('/prescriptions/upload-url', payload)
  return response.data
}

export const runPrescriptionOcr = async (ocrResultId) => {
  const response = await api.post(`/prescriptions/${ocrResultId}/ocr`)
  return response.data
}

export const getMedicationIntakeLogs = async (medicationScheduleId) => {
  const response = await api.get('/medication-intake-logs', {
    params: { medicationScheduleId },
  })
  return response.data
}

export const deleteMedicationIntakeLog = async (id) => {
  await api.delete(`/medication-intake-logs/${id}`)
}

export const getMedicationTimePresets = async () => {
  const response = await api.get('/me/medication-time-presets')
  return response.data
}

export const updateMedicationTimePresets = async (payload) => {
  const response = await api.put('/me/medication-time-presets', payload)
  return response.data
}

export default api
