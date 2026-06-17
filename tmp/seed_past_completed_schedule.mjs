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

function addDays(dateText, offset) {
  const date = new Date(`${dateText}T00:00:00+09:00`);
  date.setDate(date.getDate() + offset);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const names = {
  hospital: '\uc11c\uc6b8\uc911\uc559\uc774\ube44\uc778\ud6c4\uacfc',
  pharmacy: '\uc0c8\ubd04\uc57d\uad6d',
  aspirin: '\ubcf4\ub839\uc544\uc2a4\ud2b8\ub9ad\uc2a4\ucea1\uc290100\ubc00\ub9ac\uadf8\ub78c(\uc544\uc2a4\ud53c\ub9b0)',
  eazy: '\uc774\uc9c0\uc5d46\uc560\ub2c8\uc5f0\uc9c8\ucea1\uc290(\uc774\ubd80\ud504\ub85c\ud39c)',
  doctor: '\ub2e5\ud130\ubca0\uc544\uc81c\uc815',
};

const login = await request('POST', 'http://localhost:8080/api/auth/login', {
  email: 'hong.gildong@naver-care.com',
  password: 'aa',
});
const token = login.accessToken;

// Remove only a previous copy of this past-demo schedule if it exists, leaving the current recording schedule intact.
const existing = await request('GET', 'http://localhost:8081/api/medication-schedules?page=0&size=100', null, token);
for (const schedule of existing.content ?? existing ?? []) {
  const medicines = schedule.medicines ?? schedule.medicationScheduleMedicines ?? [];
  const hasPastDemoWindow = medicines.some((medicine) => medicine.startDate === '2026-06-08' && medicine.endDate === '2026-06-11');
  if (hasPastDemoWindow) {
    await request('DELETE', `http://localhost:8081/api/medication-schedules/${schedule.id}`, null, token);
  }
}

const schedule = await request('POST', 'http://localhost:8081/api/medication-schedules', {
  hospitalName: names.hospital,
  pharmacyName: names.pharmacy,
  startDate: '2026-06-08',
  durationDays: 4,
  dispensedDate: '2026-06-08',
  medicines: [
    { id: null, medicineId: 199001012, customMedicineName: names.aspirin, dosageAmount: 1, dosageUnit: 'CAPSULE', timesPerDay: 2, durationDays: 4 },
    { id: null, medicineId: 200400463, customMedicineName: names.eazy, dosageAmount: 1, dosageUnit: 'CAPSULE', timesPerDay: 2, durationDays: 4 },
    { id: null, medicineId: 200300406, customMedicineName: names.doctor, dosageAmount: 1, dosageUnit: 'TABLET', timesPerDay: 3, durationDays: 4 },
  ],
}, token);

const timePlan = [
  { timing: 'AFTER_MEAL', takeTime: '08:30:00', sortOrder: 1 },
  { timing: 'AFTER_MEAL', takeTime: '13:30:00', sortOrder: 2 },
  { timing: 'AFTER_MEAL', takeTime: '20:30:00', sortOrder: 3 },
];
const times = [];
for (const medicine of schedule.medicines) {
  const limit = medicine.customMedicineName === names.doctor ? 3 : 2;
  for (let i = 0; i < limit; i += 1) {
    times.push(await request('POST', 'http://localhost:8081/api/medication-schedule-times', {
      medicationScheduleMedicineId: medicine.id,
      timing: timePlan[i].timing,
      takeTime: timePlan[i].takeTime,
      sortOrder: timePlan[i].sortOrder,
    }, token));
  }
}

for (let day = 0; day < 4; day += 1) {
  const date = addDays('2026-06-08', day);
  for (const row of times) {
    await request('POST', 'http://localhost:8081/api/medication-intake-logs', {
      medicationScheduleId: schedule.id,
      medicationScheduleTimeId: row.id,
      status: 'TAKEN',
      scheduledAt: `${date}T${row.takeTime}`,
      takenAt: `${date}T${row.takeTime}`,
    }, token);
  }
}

console.log(JSON.stringify({
  userId: login.userId,
  scheduleId: schedule.id,
  range: '2026-06-08 ~ 2026-06-11',
  medicineNames: schedule.medicines.map((m) => m.customMedicineName),
  dailyItemCount: times.length,
  completedLogCount: times.length * 4,
}, null, 2));
