import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const mode = process.argv[2];
const extraArgs = process.argv.slice(3);
const appDir = process.cwd();
const envLocalPath = path.join(appDir, ".env.local");

function parseArgs(args) {
  const parsed = {};

  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];
    if (!current.startsWith("--")) {
      continue;
    }

    const key = current.slice(2);
    const next = args[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = "true";
      continue;
    }

    parsed[key] = next;
    index += 1;
  }

  return parsed;
}

function findLocalIp() {
  const interfaces = os.networkInterfaces();
  const preferredPrefixes = ["192.168.", "10.", "172."];

  const addresses = Object.values(interfaces)
    .flat()
    .filter(Boolean)
    .filter((detail) => detail.family === "IPv4" && !detail.internal)
    .map((detail) => detail.address);

  for (const prefix of preferredPrefixes) {
    const matched = addresses.find((address) => address.startsWith(prefix));
    if (matched) {
      return matched;
    }
  }

  return addresses[0] ?? null;
}

function writeEnvFile(content) {
  fs.writeFileSync(envLocalPath, `${content.trim()}\n`, "utf8");
}

function printUsageAndExit() {
  console.error("Usage:");
  console.error("  npm run env:local");
  console.error("  npm run env:remote -- --base-url https://example.com");
  process.exit(1);
}

if (mode === "local") {
  const localIp = findLocalIp();

  if (!localIp) {
    console.error("Could not detect a local IPv4 address automatically.");
    process.exit(1);
  }

  writeEnvFile(`
MOBILE_EXPO_HOST=${localIp}
MOBILE_API_HOST=${localIp}
REACT_NATIVE_PACKAGER_HOSTNAME=${localIp}
EXPO_PUBLIC_DEFAULT_API_HOST=${localIp}
EXPO_PUBLIC_PRESIGNED_UPLOAD_URL_ENDPOINT=http://${localIp}:8081/api/prescriptions/upload-url
EXPO_PUBLIC_API_BASE_URL=
  `);

  console.log(`Wrote .env.local for local mode using ${localIp}`);
  process.exit(0);
}

if (mode === "remote") {
  const args = parseArgs(extraArgs);
  const baseUrl = args["base-url"]?.trim();
  const normalizedBaseUrl = baseUrl ? baseUrl.replace(/\/$/, "") : "";
  const presignedUrl =
    args["presigned-url"]?.trim() || (normalizedBaseUrl ? `${normalizedBaseUrl}/api/prescriptions/upload-url` : "");

  if (!normalizedBaseUrl) {
    console.error("Missing required --base-url for remote mode.");
    printUsageAndExit();
  }

  writeEnvFile(`
MOBILE_EXPO_HOST=
MOBILE_API_HOST=
REACT_NATIVE_PACKAGER_HOSTNAME=
EXPO_PUBLIC_DEFAULT_API_HOST=
EXPO_PUBLIC_PRESIGNED_UPLOAD_URL_ENDPOINT=${presignedUrl}
EXPO_PUBLIC_API_BASE_URL=${normalizedBaseUrl}
  `);

  console.log(`Wrote .env.local for remote mode using ${normalizedBaseUrl}`);
  process.exit(0);
}

printUsageAndExit();
