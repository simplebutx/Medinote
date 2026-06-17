import http from 'node:http';
async function main() {

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

const names = {
  hospital: '\uba54\ub514\ub178\ud2b8\ub0b4\uacfc\uc758\uc6d0',
  pharmacy: '\ud589\ubcf5\uc628\ub204\ub9ac\uc57d\uad6d',
  brufen: '\ubd80\ub8e8\ud39c\uc815200\ubc00\ub9ac\uadf8\ub7a8(\uc774\ubd80\ud504\ub85c\ud39c)',
  beaje: '\ubca0\uc544\uc81c\uc815',
  panpyrin: '\ud310\ud53c\ub9b0\ud2f0\uc815',
  festal: '\ud6fc\uc2a4\ud0c8\ud50c\ub7ec\uc2a4\uc815',
};

const login = await request('POST', 'http://localhost:8080/api/auth/login', {
  email: 'hong.gildong@naver-care.com',
  password: 'aa',
});
const token = login.accessToken;

const existing = await request('GET', 'http://localhost:8081/api/medication-schedules?page=0&size=100', null, token);
for (const schedule of existing.content ?? existing ?? []) {
  await request('DELETE', `http://localhost:8081/api/medication-schedules/${schedule.id}`, null, token);
}

const schedule = await request('POST', 'http://localhost:8081/api/medication-schedules', {
  hospitalName: names.hospital,
  pharmacyName: names.pharmacy,
  startDate: '2026-06-17',
  durationDays: 7,
  dispensedDate: '2026-06-17',
  medicines: [
    { id: null, medicineId: 197700120, customMedicineName: names.brufen, dosageAmount: 1, dosageUnit: 'TABLET', timesPerDay: 3, durationDays: 7 },
    { id: null, medicineId: 198700405, customMedicineName: names.beaje, dosageAmount: 1, dosageUnit: 'TABLET', timesPerDay: 3, durationDays: 7 },
    { id: null, medicineId: 199400202, customMedicineName: names.panpyrin, dosageAmount: 1, dosageUnit: 'TABLET', timesPerDay: 3, durationDays: 7 },
    { id: null, medicineId: 199801026, customMedicineName: names.festal, dosageAmount: 1, dosageUnit: 'TABLET', timesPerDay: 2, durationDays: 7 },
  ],
}, token);

const timePlan = [
  { timing: 'AFTER_MEAL', takeTime: '08:00:00', sortOrder: 1 },
  { timing: 'AFTER_MEAL', takeTime: '13:00:00', sortOrder: 2 },
  { timing: 'AFTER_MEAL', takeTime: '20:00:00', sortOrder: 3 },
];
const times = [];
for (const medicine of schedule.medicines) {
  const limit = medicine.customMedicineName === names.festal ? 2 : 3;
  for (let i = 0; i < limit; i += 1) {
    times.push(await request('POST', 'http://localhost:8081/api/medication-schedule-times', {
      medicationScheduleMedicineId: medicine.id,
      timing: timePlan[i].timing,
      takeTime: timePlan[i].takeTime,
      sortOrder: timePlan[i].sortOrder,
    }, token));
  }
}

async function addIntakes(date, rows) {
  for (const row of rows) {
    await request('POST', 'http://localhost:8081/api/medication-intake-logs', {
      medicationScheduleId: schedule.id,
      medicationScheduleTimeId: row.id,
      status: 'TAKEN',
      scheduledAt: `${date}T${row.takeTime}`,
      takenAt: `${date}T${row.takeTime}`,
    }, token);
  }
}

await addIntakes('2026-06-19', times.slice(0, 4));
await addIntakes('2026-06-20', times.slice(0, 6));
await addIntakes('2026-06-21', times);

console.log(JSON.stringify({ userId: login.userId, scheduleId: schedule.id, medicineNames: schedule.medicines.map(m => m.customMedicineName), timeCount: times.length }, null, 2));

}
main().catch((error) => { console.error(error); process.exit(1); });

