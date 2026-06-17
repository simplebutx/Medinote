import http from 'node:http';

function request(method, url, body, token) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const payload = body == null ? null : Buffer.from(JSON.stringify(body), 'utf8');
    const req = http.request({
      method,
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(payload ? { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': payload.length } : {}),
      },
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode >= 400) {
          reject(new Error(`${method} ${url} -> ${res.statusCode}: ${text}`));
          return;
        }
        resolve(text ? JSON.parse(text) : null);
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

const login = await request('POST', 'http://localhost:8080/api/auth/login', {
  email: 'hong.gildong@naver-care.com',
  password: 'aa',
});
const token = login.accessToken;
const schedules = await request('GET', 'http://localhost:8081/api/medication-schedules?page=0&size=100', null, token);
const current = (schedules.content ?? schedules).find((schedule) => {
  const medicines = schedule.medicines ?? schedule.medicationScheduleMedicines ?? [];
  return medicines.some((medicine) => medicine.startDate === '2026-06-17');
});
if (!current) throw new Error('Current demo schedule not found');
const times = await request('GET', `http://localhost:8081/api/medication-schedule-times?medicationScheduleId=${current.id}`, null, token);
const sortedTimes = times.slice().sort((a, b) => `${a.takeTime}-${a.id}`.localeCompare(`${b.takeTime}-${b.id}`));

async function addIntakes(date, rows) {
  for (const row of rows) {
    await request('POST', 'http://localhost:8081/api/medication-intake-logs', {
      medicationScheduleId: current.id,
      medicationScheduleTimeId: row.id,
      status: 'TAKEN',
      scheduledAt: `${date}T${row.takeTime}`,
      takenAt: `${date}T${row.takeTime}`,
    }, token);
  }
}

await addIntakes('2026-06-19', sortedTimes.slice(0, 4));
await addIntakes('2026-06-20', sortedTimes.slice(0, 6));
await addIntakes('2026-06-21', sortedTimes);

console.log(JSON.stringify({ scheduleId: current.id, timeCount: sortedTimes.length, restoredLogs: 4 + 6 + sortedTimes.length }, null, 2));
