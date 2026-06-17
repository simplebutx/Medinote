const crypto = require("crypto");
const { spawnSync } = require("child_process");

const DB_CONTAINER = "mymedi-mysql";
const DB_HOST = "host.docker.internal";
const DB_NAME = "medic";
const DB_USER = "root";
const DB_PASSWORD = "giants49";
const USER_ID = 31;

const SECRET = "this-is-a-very-secret-key-32-chars!";
const KEY = Buffer.alloc(32);
Buffer.from(SECRET, "utf8").copy(KEY, 0, 0, Math.min(Buffer.byteLength(SECRET), 32));

function encrypt(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, ciphertext, tag]).toString("base64");
}

function sqlString(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
}

const diseases = [
  "만성 신장질환",
  "간질환",
  "위염",
  "고혈압",
  "당뇨병",
];

const cautions = [
  {
    itemSeq: 197900277,
    itemName: "게보린정(수출명:돌로린정)",
    ingredientCode: null,
    ingredientName: null,
    reason: "SIDE_EFFECT",
    cautionType: "MEDICINE",
    memo: "복용 후 두근거림과 속쓰림 경험",
  },
  {
    itemSeq: null,
    itemName: null,
    ingredientCode: "M040353",
    ingredientName: "아세트아미노펜",
    reason: "DOCTOR_ADVICE",
    cautionType: "INGREDIENT",
    memo: "간기능 수치 관리 중",
  },
  {
    itemSeq: null,
    itemName: null,
    ingredientCode: "M051259",
    ingredientName: "이부프로펜",
    reason: "PERSONAL_AVOID",
    cautionType: "INGREDIENT",
    memo: "위장장애가 있어 가능하면 피함",
  },
  {
    itemSeq: null,
    itemName: null,
    ingredientCode: "M222857",
    ingredientName: "세티리진염산염",
    reason: "PHARMACIST_ADVICE",
    cautionType: "INGREDIENT",
    memo: "졸음이 심하게 오는 편",
  },
];

const diseaseRows = diseases
  .map((name) => {
    return `(${USER_ID}, NULL, ${sqlString(encrypt(name))}, NOW(6), NOW(6))`;
  })
  .join(",\n");

const cautionRows = cautions
  .map((item) => {
    return `(${USER_ID}, ${item.itemSeq ?? "NULL"}, ${sqlString(item.itemName)}, ${sqlString(item.ingredientCode)}, ${sqlString(item.ingredientName)}, ${sqlString(item.reason)}, ${sqlString(item.cautionType)}, ${sqlString(item.memo)}, NOW(6), NOW(6))`;
  })
  .join(",\n");

const sql = `
START TRANSACTION;

INSERT INTO user_profile_health
  (user_id, is_pregnant, is_breastfeeding, is_smoking, is_drinking, is_child, is_elderly, created_at, updated_at)
VALUES
  (${USER_ID}, 0, 0, 1, 1, 0, 0, NOW(6), NOW(6))
ON DUPLICATE KEY UPDATE
  is_pregnant = VALUES(is_pregnant),
  is_breastfeeding = VALUES(is_breastfeeding),
  is_smoking = VALUES(is_smoking),
  is_drinking = VALUES(is_drinking),
  is_child = VALUES(is_child),
  is_elderly = VALUES(is_elderly),
  updated_at = NOW(6);

DELETE FROM user_chronic_disease WHERE user_id = ${USER_ID};
INSERT INTO user_chronic_disease
  (user_id, disease_code, disease_name, created_at, updated_at)
VALUES
${diseaseRows};

DELETE FROM user_medication_caution WHERE user_id = ${USER_ID};
INSERT INTO user_medication_caution
  (user_id, item_seq, item_name, ingredient_code, ingredient_name, reason, caution_type, memo, created_at, updated_at)
VALUES
${cautionRows};

COMMIT;
`;

const result = spawnSync(
  "docker",
  [
    "exec",
    "-i",
    DB_CONTAINER,
    "mysql",
    "--default-character-set=utf8mb4",
    "-h",
    DB_HOST,
    "-P",
    "3306",
    "-u" + DB_USER,
    "-p" + DB_PASSWORD,
    DB_NAME,
  ],
  {
    input: Buffer.from(sql, "utf8"),
    encoding: "utf8",
  },
);

if (result.status !== 0) {
  process.stderr.write(result.stderr || "");
  process.stderr.write(result.stdout || "");
  process.exit(result.status ?? 1);
}

process.stdout.write("Seeded demo health profile, chronic diseases, and medication cautions for user 31.\n");
