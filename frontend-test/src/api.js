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

export default api
