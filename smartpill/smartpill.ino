#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <string.h>

#if __has_include("arduino_secrets.h")
#include "arduino_secrets.h"
#else
#define SECRET_WIFI_SSID "YOUR_WIFI_SSID"
#define SECRET_WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#define SECRET_SMARTPILL_TEST_URL "http://192.168.45.207:8081/api/smartpill/test/intake-events"
#define SECRET_SMARTPILL_DEVICE_ID "smartpill-prototype-1"
#endif

#include <SparkFun_I2C_Mux_Arduino_Library.h>
#include <SparkFun_VL53L1X.h>
#include <SparkFun_Qwiic_Button.h>
#include <SparkFun_Qwiic_OLED.h>

// =====================
// ESP32-S3 Thing Plus 설정
// =====================
constexpr uint8_t SDA_PIN = 8;
constexpr uint8_t SCL_PIN = 9;
constexpr uint8_t QWIIC_POWER_PIN = 45;

// =====================
// I2C 주소
// =====================
constexpr uint8_t OLED_ADDRESS = 0x3D;
constexpr uint8_t BUTTON_ADDRESS = 0x6A;
constexpr uint8_t MUX_ADDRESS = 0x70;

// =====================
// 버튼 LED 밝기
// 0 = 꺼짐, 255 = 최대 밝기
// 너무 밝으면 여기 숫자만 더 낮추면 됨
// =====================
constexpr uint8_t BUTTON_LED_IDLE = 2;
constexpr uint8_t BUTTON_LED_PRESSED = 12;

// =====================
// Mux에 연결된 거리센서 포트
// =====================
constexpr uint8_t SENSOR_COUNT = 4;
constexpr uint8_t MUX_PORTS[SENSOR_COUNT] = {3, 4, 6, 7};

// Pill detection test target.
// The current prototype has about 40mm of height above the sensor.
// If mux port 3 reads inside this range, OLED shows O. Otherwise it shows X.
constexpr uint8_t TARGET_MUX_PORT = 3;
constexpr int PILL_PRESENT_MIN_MM = 8;
constexpr int PILL_PRESENT_MAX_MM = 35;

// =====================
// Wi-Fi + Spring test API
// =====================
constexpr char WIFI_SSID[] = SECRET_WIFI_SSID;
constexpr char WIFI_PASSWORD[] = SECRET_WIFI_PASSWORD;
constexpr char SMARTPILL_TEST_URL[] = SECRET_SMARTPILL_TEST_URL;
constexpr char SMARTPILL_DEVICE_ID[] = SECRET_SMARTPILL_DEVICE_ID;

constexpr unsigned long WIFI_RETRY_INTERVAL_MS = 10000;
constexpr unsigned long INTAKE_EVENT_COOLDOWN_MS = 5000;
constexpr unsigned long STATUS_POST_INTERVAL_MS = 3000;

// =====================
// 객체 생성
// =====================
QWIICMUX mux;
QwiicButton button;
QwiicMicroOLED oled;
SFEVL53L1X distanceSensors[SENSOR_COUNT];

// =====================
// 상태 변수
// =====================
bool muxReady = false;
bool buttonReady = false;
bool oledReady = false;
bool sensorReady[SENSOR_COUNT] = {false, false, false, false};

int latestDistances[SENSOR_COUNT] = {-1, -1, -1, -1};

uint32_t buttonClickCount = 0;
bool buttonPressedNow = false;

unsigned long lastSensorReadMs = 0;
unsigned long lastOledRefreshMs = 0;
unsigned long lastSerialPrintMs = 0;
unsigned long lastWifiAttemptMs = 0;
unsigned long lastIntakeEventPostMs = 0;
unsigned long lastStatusEventPostMs = 0;

constexpr unsigned long SENSOR_INTERVAL_MS = 100;
constexpr unsigned long OLED_INTERVAL_MS = 200;
constexpr unsigned long SERIAL_INTERVAL_MS = 500;

bool pillStateInitialized = false;
bool lastPillPresent = false;
uint32_t smartpillEventSequence = 0;

// =====================
// 로그 출력
// =====================
void logLine(const String& message) {
  Serial.println(message);
}

int sensorIndexForPort(uint8_t muxPort) {
  for (uint8_t i = 0; i < SENSOR_COUNT; i++) {
    if (MUX_PORTS[i] == muxPort) {
      return i;
    }
  }

  return -1;
}

bool isTargetPillPresent() {
  int targetIndex = sensorIndexForPort(TARGET_MUX_PORT);
  if (targetIndex < 0) return false;
  if (!sensorReady[targetIndex]) return false;

  int distance = latestDistances[targetIndex];
  return distance >= PILL_PRESENT_MIN_MM && distance <= PILL_PRESENT_MAX_MM;
}

bool isPillPresentAtIndex(uint8_t sensorIndex) {
  if (sensorIndex >= SENSOR_COUNT) return false;
  if (!sensorReady[sensorIndex]) return false;

  int distance = latestDistances[sensorIndex];
  return distance >= PILL_PRESENT_MIN_MM && distance <= PILL_PRESENT_MAX_MM;
}

bool isTargetSensorReady() {
  int targetIndex = sensorIndexForPort(TARGET_MUX_PORT);
  return targetIndex >= 0 && sensorReady[targetIndex] && latestDistances[targetIndex] >= 0;
}

int targetDistanceMm() {
  int targetIndex = sensorIndexForPort(TARGET_MUX_PORT);
  if (targetIndex < 0) return -1;
  return latestDistances[targetIndex];
}

bool wifiConfigured() {
  return strcmp(WIFI_SSID, "YOUR_WIFI_SSID") != 0;
}

bool connectWifiIfNeeded() {
  if (!wifiConfigured()) {
    logLine("WiFi is not configured. Set WIFI_SSID, WIFI_PASSWORD, and SMARTPILL_TEST_URL.");
    return false;
  }

  if (WiFi.status() == WL_CONNECTED) {
    return true;
  }

  if (lastWifiAttemptMs != 0 && millis() - lastWifiAttemptMs < WIFI_RETRY_INTERVAL_MS) {
    return false;
  }

  lastWifiAttemptMs = millis();

  Serial.print("Connecting WiFi: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startedAt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startedAt < 5000) {
    delay(250);
    Serial.print(".");
  }
  Serial.println("");

  if (WiFi.status() != WL_CONNECTED) {
    logLine("WiFi connect failed.");
    return false;
  }

  Serial.print("WiFi connected. IP=");
  Serial.println(WiFi.localIP());
  return true;
}

String buildSmartpillPayload(const char* eventType, bool pillPresent) {
  smartpillEventSequence++;

  String payload = "{";
  payload += "\"deviceId\":\"";
  payload += SMARTPILL_DEVICE_ID;
  payload += "\",\"eventType\":\"";
  payload += eventType;
  payload += "\",\"muxPort\":";
  payload += String(TARGET_MUX_PORT);
  payload += ",\"distanceMm\":";
  payload += String(targetDistanceMm());
  payload += ",\"pillPresent\":";
  payload += pillPresent ? "true" : "false";
  payload += ",\"buttonClickCount\":";
  payload += String(buttonClickCount);
  payload += ",\"slots\":[";
  for (uint8_t i = 0; i < SENSOR_COUNT; i++) {
    payload += "{";
    payload += "\"slotNumber\":";
    payload += String(i + 1);
    payload += ",\"muxPort\":";
    payload += String(MUX_PORTS[i]);
    payload += ",\"sensorReady\":";
    payload += sensorReady[i] ? "true" : "false";
    payload += ",\"distanceMm\":";
    payload += String(sensorReady[i] ? latestDistances[i] : -1);
    payload += ",\"pillPresent\":";
    payload += isPillPresentAtIndex(i) ? "true" : "false";
    payload += "}";

    if (i < SENSOR_COUNT - 1) {
      payload += ",";
    }
  }
  payload += "]";
  payload += ",\"uptimeMs\":";
  payload += String(millis());
  payload += ",\"sequence\":";
  payload += String(smartpillEventSequence);
  payload += "}";

  return payload;
}

bool postSmartpillEvent(const char* eventType, bool pillPresent) {
  if (!connectWifiIfNeeded()) {
    return false;
  }

  String payload = buildSmartpillPayload(eventType, pillPresent);
  HTTPClient http;

  logLine("POST " + String(SMARTPILL_TEST_URL));
  logLine(payload);

  if (!http.begin(SMARTPILL_TEST_URL)) {
    logLine("HTTP begin failed.");
    return false;
  }

  http.addHeader("Content-Type", "application/json");
  int responseCode = http.POST(payload);
  String responseBody = http.getString();
  http.end();

  Serial.print("Spring response code: ");
  Serial.println(responseCode);
  Serial.println(responseBody);

  return responseCode >= 200 && responseCode < 300;
}

void postSmartpillStatusIfDue() {
  if (!isTargetSensorReady()) {
    return;
  }

  if (millis() - lastStatusEventPostMs < STATUS_POST_INTERVAL_MS) {
    return;
  }

  lastStatusEventPostMs = millis();
  postSmartpillEvent("SENSOR_STATUS", isTargetPillPresent());
}

void detectAndPostIntakeEvent() {
  if (!isTargetSensorReady()) {
    return;
  }

  bool pillPresent = isTargetPillPresent();

  if (!pillStateInitialized) {
    pillStateInitialized = true;
    lastPillPresent = pillPresent;
    return;
  }

  if (lastPillPresent && !pillPresent) {
    if (millis() - lastIntakeEventPostMs >= INTAKE_EVENT_COOLDOWN_MS) {
      lastIntakeEventPostMs = millis();
      postSmartpillEvent("PILL_TAKEN", pillPresent);
    }
  }

  lastPillPresent = pillPresent;
}

// =====================
// 메인 I2C 버스 스캔
// =====================
void scanMainI2CBus() {
  logLine("");
  logLine("Scanning main I2C bus...");

  for (uint8_t address = 1; address < 127; address++) {
    Wire.beginTransmission(address);

    if (Wire.endTransmission() == 0) {
      Serial.print("Found I2C device at 0x");
      if (address < 16) Serial.print("0");
      Serial.println(address, HEX);
    }
  }

  logLine("Main I2C scan done.");
}

// =====================
// 센서값 시리얼 출력
// =====================
void printSensorValues() {
  String line = "";

  for (uint8_t i = 0; i < SENSOR_COUNT; i++) {
    line += "P";
    line += String(MUX_PORTS[i]);
    line += ":";

    if (!sensorReady[i]) {
      line += "NA";
    } else {
      line += String(latestDistances[i]);
      line += "mm";
    }

    if (i < SENSOR_COUNT - 1) {
      line += "  ";
    }
  }

  int targetIndex = sensorIndexForPort(TARGET_MUX_PORT);
  if (targetIndex >= 0 && sensorReady[targetIndex]) {
    line += "  P";
    line += String(TARGET_MUX_PORT);
    line += "_PILL:";
    line += isTargetPillPresent() ? "O" : "X";
  }

  Serial.println(line);
}

// =====================
// OLED 화면 갱신
// =====================
// void refreshOled() {
//   if (!oledReady) return;
//   if (millis() - lastOledRefreshMs < OLED_INTERVAL_MS) return;

//   lastOledRefreshMs = millis();

//   char line[24];
//   int targetIndex = sensorIndexForPort(TARGET_MUX_PORT);
//   int targetDistance = targetIndex >= 0 ? latestDistances[targetIndex] : -1;
//   bool targetReady = targetIndex >= 0 && sensorReady[targetIndex];
//   bool pillPresent = isTargetPillPresent();

//   oled.erase();

//   snprintf(line, sizeof(line), "PORT %d", TARGET_MUX_PORT);
//   oled.text(0, 0, line, 1);

//   if (!targetReady) {
//     oled.text(0, 16, "NO SENSOR", 1);
//     oled.text(0, 32, "X", 2);
//     oled.display();
//     return;
//   }

//   snprintf(line, sizeof(line), "%d mm", targetDistance);
//   oled.text(0, 16, line, 1);

//   oled.text(0, 32, pillPresent ? "O" : "X", 2);

//   oled.display();
// }

void refreshOled() {
  if (!oledReady) return;
  if (millis() - lastOledRefreshMs < OLED_INTERVAL_MS) return;

  lastOledRefreshMs = millis();

  oled.erase();
  oled.text(0, 0, "MEDINOTE", 2);
  oled.text(0, 24, "SMARTPILLCASE", 1);
  oled.text(0, 38, "TEST", 1);
  oled.display();
}

// =====================
// 버튼 초기화
// =====================
void initButton() {
  logLine("");
  logLine("Initializing Qwiic Button...");

  if (button.begin(BUTTON_ADDRESS, Wire)) {
    buttonReady = true;

    // 이전에 남아있던 클릭/눌림 이벤트 제거
    button.clearEventBits();

    button.LEDon(BUTTON_LED_IDLE);
    logLine("Qwiic Button ready.");
  } else {
    buttonReady = false;
    logLine("Qwiic Button not detected.");
  }
}

// =====================
// OLED 초기화
// =====================
void initOled() {
  logLine("");
  logLine("Initializing Qwiic OLED...");

  if (oled.begin(Wire, OLED_ADDRESS)) {
    oledReady = true;

    oled.erase();
    oled.text(0, 0, "OLED READY", 1);
    oled.text(0, 12, "Smart Pill", 1);
    oled.text(0, 24, "Box Test", 1);
    oled.display();

    logLine("Qwiic OLED ready.");
  } else {
    oledReady = false;
    logLine("Qwiic OLED begin failed.");
  }
}

// =====================
// Mux + 거리센서 초기화
// =====================
void initMuxAndSensors() {
  logLine("");
  logLine("Initializing Qwiic Mux...");

  if (!mux.begin(MUX_ADDRESS, Wire)) {
    muxReady = false;
    logLine("Mux not detected.");
    return;
  }

  muxReady = true;
  logLine("Mux ready.");

  for (uint8_t i = 0; i < SENSOR_COUNT; i++) {
    uint8_t port = MUX_PORTS[i];

    mux.setPort(port);
    delay(50);

    logLine("Initializing VL53L1X on mux port " + String(port) + "...");

    if (distanceSensors[i].begin() != 0) {
      sensorReady[i] = false;
      logLine("Sensor NOT detected on port " + String(port));
      continue;
    }

    distanceSensors[i].setDistanceModeShort();
    distanceSensors[i].setTimingBudgetInMs(50);
    distanceSensors[i].setROI(5, 5, 199);
    distanceSensors[i].startRanging();

    sensorReady[i] = true;
    logLine("Sensor ready on port " + String(port));
  }

  logLine("Sensor initialization finished.");
}

// =====================
// 버튼 읽기
// =====================
void readButton() {
  if (!buttonReady) return;

  buttonPressedNow = button.isPressed();

  if (buttonPressedNow) {
    button.LEDon(BUTTON_LED_PRESSED);
  } else {
    button.LEDon(BUTTON_LED_IDLE);
  }

  if (button.hasBeenClicked()) {
    buttonClickCount++;
    logLine("Button clicked.");
    postSmartpillEvent("BUTTON_TEST", isTargetPillPresent());
    button.clearEventBits();

    // 중요: 클릭 이벤트 처리했으면 반드시 지워줘야 무한 출력 안 됨
    button.clearEventBits();
  }
}

// =====================
// 센서 읽기
// =====================
void readSensors() {
  if (!muxReady) return;
  if (millis() - lastSensorReadMs < SENSOR_INTERVAL_MS) return;

  lastSensorReadMs = millis();

  for (uint8_t i = 0; i < SENSOR_COUNT; i++) {
    if (!sensorReady[i]) continue;

    uint8_t port = MUX_PORTS[i];

    mux.setPort(port);
    delay(3);

    if (distanceSensors[i].checkForDataReady()) {
      latestDistances[i] = distanceSensors[i].getDistance();
      distanceSensors[i].clearInterrupt();
    }
  }
}

// =====================
// setup
// =====================
void setup() {
  Serial.begin(115200);
  delay(2000);

  logLine("");
  logLine("Boot OK");
  logLine("Smart Pill Box Full Test");

  pinMode(QWIIC_POWER_PIN, OUTPUT);
  digitalWrite(QWIIC_POWER_PIN, HIGH);
  delay(500);

  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(100000);

  scanMainI2CBus();

  initButton();
  initOled();
  initMuxAndSensors();
  connectWifiIfNeeded();

  logLine("");
  logLine("Test ready.");
  logLine("Button press = LED slightly brighter.");
  logLine("Button click = click count up.");
  logLine("Button click = send BUTTON_TEST to Spring if WiFi is configured.");
  logLine("Every 3 seconds = send 4-slot SENSOR_STATUS to Spring.");
  logLine("Pill present -> absent = send PILL_TAKEN to Spring.");
  logLine("");
}

// =====================
// loop
// =====================
void loop() {
  readButton();
  readSensors();
  detectAndPostIntakeEvent();
  postSmartpillStatusIfDue();
  refreshOled();

  if (millis() - lastSerialPrintMs >= SERIAL_INTERVAL_MS) {
    lastSerialPrintMs = millis();
    printSensorValues();
  }
}
