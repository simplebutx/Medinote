import json, os, urllib.request
req = urllib.request.Request('http://localhost:8080/api/auth/me', headers={'Authorization': 'Bearer ' + os.environ['TOKEN']})
with urllib.request.urlopen(req) as res:
    data = json.loads(res.read().decode('utf-8'))
print(json.dumps({k: data[k] for k in ['email', 'username', 'birthDate', 'gender', 'role', 'status']}, ensure_ascii=False, indent=2))
