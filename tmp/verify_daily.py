import json
import os
import urllib.request

token = os.environ['TOKEN']
headers = {'Authorization': 'Bearer ' + token}
for date in ['2026-06-17','2026-06-18','2026-06-19','2026-06-20','2026-06-21','2026-06-22','2026-06-23']:
    req = urllib.request.Request(f'http://localhost:8081/api/medication-schedules/daily?date={date}', headers=headers)
    with urllib.request.urlopen(req) as res:
        data = json.loads(res.read().decode('utf-8'))
    items = [item for group in data['groups'] for item in group['medications']]
    taken = sum(1 for item in items if item.get('intakeStatus') == 'TAKEN')
    rate = 0 if not items else round(taken / len(items) * 100)
    names = sorted({item.get('customMedicineName') for item in items})
    print(f'{date}: {taken}/{len(items)} = {rate}% | ' + ', '.join(names))
