import json, os, urllib.request
req = urllib.request.Request('http://localhost:8080/api/auth/me', headers={'Authorization': 'Bearer ' + os.environ['TOKEN']})
with urllib.request.urlopen(req) as res:
    raw = res.read()
print(raw.decode('utf-8'))
data = json.loads(raw.decode('utf-8'))
print('username=', data['username'])
print('ok=', data['username'] == '홍길동')
