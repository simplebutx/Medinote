import crypto from 'node:crypto';
const keySource = process.env.APP_ENCRYPTION_KEY || 'this-is-a-very-secret-key-32-chars!';
const key = Buffer.alloc(32);
Buffer.from(keySource, 'utf8').copy(key, 0, 0, Math.min(Buffer.byteLength(keySource), 32));
function enc(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, encrypted, cipher.getAuthTag()]).toString('base64');
}
function hash(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('base64');
}
function q(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}
console.log(`UPDATE users SET birth_date=${q(enc('1990-03-15'))}, gender='MALE', updated_at=NOW(6) WHERE email_hash=${q(hash('hong.gildong@naver-care.com'))};`);
