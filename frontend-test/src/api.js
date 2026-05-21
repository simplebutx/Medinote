import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 300000,
})

export const getMedicineSyncStatus = async () => {
  const response = await api.get('/medicines/sync-status')
  return response.data
}

export const syncMedicines = async () => {
  const response = await api.post('/medicines/sync')
  return response.data
}

export const sendChatbotMessage = async (message) => {
  const response = await api.post('/chatbot/message', { message }, {
    timeout: 300000,
  })
  return response.data
}

export const suggestMedicines = async (keyword) => {
  const response = await api.post('/medicines/suggest', null, {
    params: { keyword },
    timeout: 300000,
  })
  return response.data
}

export const createMedicationSchedule = async (payload) => {
  const response = await api.post('/medication-schedules', payload)
  return response.data
}

export const getMedicationSchedules = async (userId) => {
  const response = await api.get('/medication-schedules', {
    params: { userId },
  })
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

export const initializeMedicationScheduleWindow = async (id) => {
  const response = await api.post(`/medication-schedules/${id}/initialize-window`)
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

export const getMedicationIntakeLogs = async (medicationScheduleId) => {
  const response = await api.get('/medication-intake-logs', {
    params: { medicationScheduleId },
  })
  return response.data
}

export const deleteMedicationIntakeLog = async (id) => {
  await api.delete(`/medication-intake-logs/${id}`)
}

export default api
