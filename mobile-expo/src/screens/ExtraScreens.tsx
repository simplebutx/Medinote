import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { useRef, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../api/client";
import { useAppContext } from "../context/AppContext";
import type { OcrMedicineDraft, OcrScheduleDraft } from "../types";
import { Button, InfoBanner, Screen, SectionCard } from "../ui";

type UploadStatus = "idle" | "requesting-permission" | "uploading" | "uploaded";

type CapturedPhoto = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
  width?: number;
  height?: number;
};

type PreviewLayout = {
  width: number;
  height: number;
};

const GUIDE_FRAME_WIDTH_RATIO = 0.84;
const GUIDE_FRAME_ASPECT_RATIO = 0.62;
const GUIDE_TOP_SHADE_FLEX = 0.68;
const GUIDE_BOTTOM_SHADE_FLEX = 0.76;
const CROP_MARGIN_X_RATIO = 0.08;
const CROP_MARGIN_TOP_RATIO = 0.08;
const CROP_MARGIN_BOTTOM_RATIO = 0.12;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

async function cropPhotoToGuideFrame(photo: CapturedPhoto, previewLayout?: PreviewLayout | null) {
  if (!photo.width || !photo.height || !previewLayout?.width || !previewLayout?.height) {
    const normalized = await manipulateAsync(photo.uri, [], {
      compress: 0.92,
      format: SaveFormat.JPEG,
    });

    return {
      uri: normalized.uri,
      mimeType: "image/jpeg",
      fileName: photo.fileName,
      width: normalized.width,
      height: normalized.height,
    };
  }

  const guideWidth = previewLayout.width * GUIDE_FRAME_WIDTH_RATIO;
  const guideHeight = guideWidth / GUIDE_FRAME_ASPECT_RATIO;
  const totalShadeFlex = GUIDE_TOP_SHADE_FLEX + GUIDE_BOTTOM_SHADE_FLEX;
  const frameX = (previewLayout.width - guideWidth) / 2;
  const frameY = Math.max(previewLayout.height - guideHeight, 0) * (GUIDE_TOP_SHADE_FLEX / totalShadeFlex);

  const scale = Math.max(previewLayout.width / photo.width, previewLayout.height / photo.height);
  const visibleImageWidth = photo.width * scale;
  const visibleImageHeight = photo.height * scale;
  const horizontalOverflow = Math.max((visibleImageWidth - previewLayout.width) / 2, 0);
  const verticalOverflow = Math.max((visibleImageHeight - previewLayout.height) / 2, 0);

  const originX = clamp((frameX + horizontalOverflow) / scale, 0, Math.max(photo.width - 1, 0));
  const originY = clamp((frameY + verticalOverflow) / scale, 0, Math.max(photo.height - 1, 0));
  const marginX = (guideWidth * CROP_MARGIN_X_RATIO) / scale;
  const marginTop = (guideHeight * CROP_MARGIN_TOP_RATIO) / scale;
  const marginBottom = (guideHeight * CROP_MARGIN_BOTTOM_RATIO) / scale;
  const expandedOriginX = clamp(originX - marginX, 0, Math.max(photo.width - 1, 0));
  const expandedOriginY = clamp(originY - marginTop, 0, Math.max(photo.height - 1, 0));
  const cropWidth = clamp((guideWidth / scale) + marginX * 2, 1, photo.width - expandedOriginX);
  const cropHeight = clamp((guideHeight / scale) + marginTop + marginBottom, 1, photo.height - expandedOriginY);

  const normalized = await manipulateAsync(photo.uri, [
    {
      crop: {
        originX: Math.round(expandedOriginX),
        originY: Math.round(expandedOriginY),
        width: Math.round(cropWidth),
        height: Math.round(cropHeight),
      },
    },
  ], {
    compress: 0.92,
    format: SaveFormat.JPEG,
  });

  return {
    uri: normalized.uri,
    mimeType: "image/jpeg",
    fileName: photo.fileName,
    width: normalized.width,
    height: normalized.height,
  };
}

function buildPrescriptionFileName() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");

  return `prescription-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(
    now.getHours()
  )}${pad(now.getMinutes())}${pad(now.getSeconds())}.jpg`;
}

function buildOcrScheduleDraft(resultJson: string | null | undefined): OcrScheduleDraft | null {
  if (!resultJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(resultJson) as Partial<OcrScheduleDraft> & {
      medicines?: Partial<OcrMedicineDraft>[];
    };

    const medicines = Array.isArray(parsed.medicines)
      ? parsed.medicines
          .map((medicine) => ({
            name: String(medicine?.name || "").trim(),
            dosage: String(medicine?.dosage || "").trim(),
            frequency: String(medicine?.frequency || "").trim(),
            days: String(medicine?.days || "").trim(),
          }))
          .filter((medicine) => medicine.name)
      : [];

    if (!medicines.length) {
      return null;
    }

    return {
      hospitalName: String(parsed.hospitalName || "").trim(),
      pharmacyName: String(parsed.pharmacyName || "").trim(),
      dispensedDate: String(parsed.dispensedDate || "").trim(),
      medicines,
    };
  } catch {
    return null;
  }
}

async function uploadImageToPresignedUrl(
  uploadUrl: string,
  photo: CapturedPhoto,
  headers?: Record<string, string> | null
) {
  const response = await fetch(photo.uri);

  if (!response.ok) {
    throw new Error("촬영한 이미지를 읽어오지 못했습니다.");
  }

  const blob = await response.blob();
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": photo.mimeType || "image/jpeg",
      ...(headers || {}),
    },
    body: blob,
  });

  if (!uploadResponse.ok) {
    throw new Error(`S3 업로드에 실패했습니다. (${uploadResponse.status})`);
  }
}

function CameraGuideScreen({
  onClose,
  onCapture,
  isCapturing,
}: {
  onClose: () => void;
  onCapture: (photo: CapturedPhoto) => Promise<void>;
  isCapturing: boolean;
}) {
  const cameraRef = useRef<CameraView | null>(null);
  const [previewLayout, setPreviewLayout] = useState<PreviewLayout | null>(null);
  const guideWidth = (previewLayout?.width ?? 0) * GUIDE_FRAME_WIDTH_RATIO;
  const guideHeight = guideWidth > 0 ? guideWidth / GUIDE_FRAME_ASPECT_RATIO : 0;

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) {
      return;
    }

    const photo = await cameraRef.current.takePictureAsync({
      quality: 0.9,
      shutterSound: false,
    });

    if (!photo?.uri) {
      throw new Error("사진 촬영에 실패했습니다.");
    }

    const croppedPhoto = await cropPhotoToGuideFrame({
      uri: photo.uri,
      mimeType: "image/jpeg",
      fileName: buildPrescriptionFileName(),
      width: photo.width,
      height: photo.height,
    }, previewLayout);

    await onCapture(croppedPhoto);
  };

  const handlePreviewLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setPreviewLayout({ width, height });
  };

  return (
    <SafeAreaView style={cameraStyles.safeArea} edges={["top", "right", "bottom", "left"]}>
      <View style={cameraStyles.container} onLayout={handlePreviewLayout}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" mode="picture" />

        <View style={cameraStyles.overlay}>
          <View style={cameraStyles.topShade} />

          <View style={cameraStyles.middleRow}>
            <View style={cameraStyles.sideShade} />
            <View
              style={[
                cameraStyles.frameWrap,
                guideWidth > 0 && guideHeight > 0
                  ? {
                      width: guideWidth,
                      height: guideHeight,
                    }
                  : null,
              ]}
            >
              <View style={cameraStyles.frame}>
                <View style={[cameraStyles.corner, cameraStyles.cornerTopLeft]} />
                <View style={[cameraStyles.corner, cameraStyles.cornerTopRight]} />
                <View style={[cameraStyles.corner, cameraStyles.cornerBottomLeft]} />
                <View style={[cameraStyles.corner, cameraStyles.cornerBottomRight]} />
              </View>
            </View>
            <View style={cameraStyles.sideShade} />
          </View>

          <View style={cameraStyles.bottomShade} />
        </View>

        <View style={cameraStyles.header}>
          <Pressable onPress={onClose} style={cameraStyles.iconButton}>
            <Ionicons name="close" size={26} color="#ffffff" />
          </Pressable>
        </View>

        <View style={cameraStyles.instructions}>
          <Text style={cameraStyles.instructionsTitle}>약봉투 전체를 프레임 안에 맞춰 주세요</Text>
          <Text style={cameraStyles.instructionsBody}>
            영수증, 복약안내, 하단 복용 정보가 모두 보이도록 맞추면 인식이 더 안정적입니다.
          </Text>
        </View>

        <View style={cameraStyles.footer}>
          <Pressable onPress={onClose} style={cameraStyles.cancelButton} disabled={isCapturing}>
            <Text style={cameraStyles.cancelButtonText}>취소</Text>
          </Pressable>

          <Pressable onPress={handleCapture} style={cameraStyles.captureOuter} disabled={isCapturing}>
            <View style={cameraStyles.captureInner}>
              {isCapturing ? <View style={cameraStyles.captureBusy} /> : null}
            </View>
          </Pressable>

          <View style={cameraStyles.footerSpacer} />
        </View>
      </View>
    </SafeAreaView>
  );
}

export function PrescriptionUploadScreen({ navigation }: any) {
  const { session, settings } = useAppContext();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [message, setMessage] = useState("");
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [uploadedImageUri, setUploadedImageUri] = useState<string | null>(null);
  const [uploadedKey, setUploadedKey] = useState<string | null>(null);
  const [uploadedOcrResultId, setUploadedOcrResultId] = useState<number | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [resultJson, setResultJson] = useState<string | null>(null);
  const [preprocessedImageUri, setPreprocessedImageUri] = useState<string | null>(null);

  const isBusy = status === "requesting-permission" || status === "uploading";

  const openCamera = async () => {
    if (!session) {
      setMessage("로그인 후에만 처방전 업로드를 사용할 수 있습니다.");
      return;
    }

    setMessage("");
    setStatus("requesting-permission");

    let granted = cameraPermission?.granted ?? false;
    if (!granted) {
      const permission = await requestCameraPermission();
      granted = permission.granted;
    }

    if (!granted) {
      setStatus("idle");
      setMessage("카메라 권한이 없어 촬영을 진행할 수 없습니다.");
      return;
    }

    setStatus("idle");
    setIsCameraOpen(true);
  };

  const handleCapturedPhoto = async (photo: CapturedPhoto) => {
    if (!session) {
      setMessage("로그인 정보가 만료되었습니다. 다시 로그인해 주세요.");
      setIsCameraOpen(false);
      return;
    }

    try {
      setMessage("");
      setResultJson(null);
      setPreprocessedImageUri(null);
      setStatus("uploading");
      setIsCameraOpen(false);

      const presigned = await api.createPrescriptionUploadUrl(settings, session, {
        fileName: photo.fileName || buildPrescriptionFileName(),
        contentType: photo.mimeType || "image/jpeg",
        category: "PRESCRIPTION",
      });

      await uploadImageToPresignedUrl(presigned.uploadUrl, photo, presigned.headers);
      const ocrResponse = await api.runPrescriptionOcr(settings, session, presigned.ocrResultId);
      const ocrDraft = buildOcrScheduleDraft(ocrResponse.resultJson);

      setUploadedImageUri(photo.uri);
      setUploadedKey(presigned.key);
      setUploadedOcrResultId(presigned.ocrResultId);
      setUploadedFileUrl(presigned.fileUrl || null);
      setResultJson(ocrResponse.resultJson || "");
      setPreprocessedImageUri(ocrResponse.preprocessedImageDataUrl || null);
      setStatus("uploaded");
      if (ocrDraft) {
        navigation.navigate("ScheduleTab", {
          screen: "ScheduleForm",
          params: {
            ocrDraft,
            ocrResultId: ocrResponse.ocrResultId,
          },
        });
      }
      setMessage("사진을 업로드하고 OCR 분석까지 완료했습니다.");
    } catch (error) {
      setStatus("idle");
      setMessage(error instanceof Error ? error.message : "처방전 업로드 중 오류가 발생했습니다.");
    }
  };

  if (isCameraOpen) {
    return (
      <CameraGuideScreen
        onClose={() => {
          if (!isBusy) {
            setIsCameraOpen(false);
          }
        }}
        onCapture={handleCapturedPhoto}
        isCapturing={status === "uploading"}
      />
    );
  }

  return (
    <Screen>
      <SectionCard
        title="처방전 업로드"
        subtitle="카메라 가이드에 문서를 맞춰 촬영하면 presigned URL을 받아 S3에 바로 업로드합니다."
      >
        <View
          style={{
            borderWidth: 1,
            borderColor: "#d9e7e2",
            borderRadius: 22,
            padding: 18,
            backgroundColor: "#fbfdfc",
            gap: 14,
          }}
        >
          <Text style={{ color: "#10332b", fontSize: 18, fontWeight: "800" }}>가이드 프레임으로 촬영</Text>
          <Text style={{ color: "#547066", lineHeight: 22 }}>
            카메라가 열리면 문서 전체를 프레임 안에 맞춰 주세요. 영수증, 복약안내, 하단 복용 정보가 함께
            보이면 OCR이 더 안정적입니다.
          </Text>

          <Pressable
            onPress={openCamera}
            disabled={isBusy}
            style={{
              alignSelf: "center",
              width: 116,
              height: 116,
              borderRadius: 32,
              borderWidth: 2,
              borderColor: "#0f766e",
              borderStyle: "dashed",
              backgroundColor: isBusy ? "#eef4f2" : "#edf7f5",
              alignItems: "center",
              justifyContent: "center",
              opacity: isBusy ? 0.7 : 1,
            }}
          >
            <Ionicons name="scan-outline" size={42} color="#0f766e" />
          </Pressable>

          <Button
            title={status === "uploading" ? "업로드 중..." : "가이드 프레임으로 촬영"}
            onPress={openCamera}
            disabled={isBusy}
            loading={status === "uploading"}
          />

          {message ? (
            <InfoBanner text={message} tone={status === "uploaded" ? "success" : "default"} />
          ) : null}

          <InfoBanner text="촬영 후 업로드, OCR, 전처리 미리보기까지 한 번에 연결됩니다." />

          {uploadedImageUri ? (
            <View
              style={{
                gap: 10,
                borderWidth: 1,
                borderColor: "#d9e7e2",
                borderRadius: 20,
                padding: 14,
                backgroundColor: "#ffffff",
              }}
            >
              <Image
                source={{ uri: uploadedImageUri }}
                style={{ width: "100%", height: 320, borderRadius: 16, backgroundColor: "#dde9e5" }}
                resizeMode="contain"
              />
              <Text style={{ color: "#10332b", fontWeight: "700" }}>업로드 완료</Text>
              {uploadedOcrResultId ? (
                <Text style={{ color: "#547066" }}>OCR Result ID: {uploadedOcrResultId}</Text>
              ) : null}
              {uploadedKey ? <Text style={{ color: "#547066" }}>S3 Key: {uploadedKey}</Text> : null}
              {uploadedFileUrl ? <Text style={{ color: "#547066" }}>File URL: {uploadedFileUrl}</Text> : null}
              {preprocessedImageUri ? (
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: "#d9e7e2",
                    borderRadius: 14,
                    padding: 12,
                    backgroundColor: "#fbfdfc",
                    gap: 10,
                  }}
                >
                  <Text style={{ color: "#10332b", fontWeight: "700" }}>Preprocessed Image</Text>
                  <Image
                    source={{ uri: preprocessedImageUri }}
                    style={{ width: "100%", height: 320, borderRadius: 12, backgroundColor: "#dde9e5" }}
                    resizeMode="contain"
                  />
                </View>
              ) : null}
              {resultJson !== null ? (
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: "#d9e7e2",
                    borderRadius: 14,
                    padding: 12,
                    backgroundColor: "#fbfdfc",
                    gap: 6,
                  }}
                >
                  <Text style={{ color: "#10332b", fontWeight: "700" }}>OCR Result JSON</Text>
                  <Text style={{ color: "#547066", lineHeight: 22 }}>
                    {resultJson || "(구조화 결과가 없습니다.)"}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </SectionCard>
    </Screen>
  );
}

const faqItems = [
  {
    question: "약 검색에서는 어떤 정보를 볼 수 있나요?",
    answer: "약 이름, 회사명, 효능, 복용법, 주의사항, 부작용 정보를 확인할 수 있습니다.",
  },
  {
    question: "주의 성분은 어디서 관리하나요?",
    answer: "마이페이지의 주의 성분 관리 화면에서 등록, 수정, 삭제할 수 있습니다.",
  },
  {
    question: "복약 일정은 어떻게 등록하나요?",
    answer: "복약 일정 탭에서 약 정보를 확인한 뒤 상단 + 버튼으로 직접 등록할 수 있습니다.",
  },
  {
    question: "챗봇에는 어떤 질문을 할 수 있나요?",
    answer: "복약 관련 궁금증이나 약 이름이 포함된 질문을 입력하면 상담 답변을 받을 수 있습니다.",
  },
];

export function FaqScreen() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <Screen>
      <SectionCard title="FAQ" subtitle="사용 중 자주 묻는 질문을 모아둔 화면입니다.">
        {faqItems.map((item, index) => {
          const opened = openIndex === index;

          return (
            <Pressable
              key={item.question}
              onPress={() => setOpenIndex(opened ? null : index)}
              style={{
                borderWidth: 1,
                borderColor: opened ? "#0f766e" : "#d9e7e2",
                borderRadius: 18,
                padding: 16,
                backgroundColor: opened ? "#edf7f5" : "#ffffff",
                gap: 8,
              }}
            >
              <Text style={{ color: "#10332b", fontSize: 16, fontWeight: "800" }}>{item.question}</Text>
              {opened ? <Text style={{ color: "#547066", lineHeight: 22 }}>{item.answer}</Text> : null}
            </Pressable>
          );
        })}
      </SectionCard>
    </Screen>
  );
}

const notificationItems = [
  "복약 시간이 가까워졌을 때 알림",
  "등록한 일정이 변경되었을 때 알림",
  "추후 처방전 OCR 결과 확인 알림",
];

export function NotificationsScreen() {
  return (
    <Screen>
      <SectionCard title="알림" subtitle="앱에서 어떤 알림을 준비하고 있는지 미리 확인하는 화면입니다.">
        {notificationItems.map((item) => (
          <View
            key={item}
            style={{
              borderWidth: 1,
              borderColor: "#d9e7e2",
              borderRadius: 18,
              padding: 16,
              backgroundColor: "#fbfdfc",
            }}
          >
            <Text style={{ color: "#10332b", fontWeight: "700" }}>{item}</Text>
          </View>
        ))}
        <InfoBanner text="실제 푸시 알림 연동은 아직 연결 전입니다." />
      </SectionCard>
    </Screen>
  );
}

export function AccountDeleteScreen() {
  const [message, setMessage] = useState("");

  return (
    <Screen>
      <SectionCard
        title="회원 탈퇴"
        subtitle="계정 삭제 전에 확인해야 할 내용을 먼저 보여주는 화면입니다."
      >
        <View
          style={{
            borderWidth: 1,
            borderColor: "#f3c9c2",
            borderRadius: 18,
            padding: 16,
            backgroundColor: "#fff6f4",
            gap: 8,
          }}
        >
          <Text style={{ color: "#8a271a", fontWeight: "800", fontSize: 16 }}>탈퇴 전에 확인해 주세요</Text>
          <Text style={{ color: "#7a4a43", lineHeight: 22 }}>
            복약 일정, 주의 성분, 프로필 정보가 함께 정리되므로 실제 연결 전에는 안내 화면으로만 두고
            있습니다.
          </Text>
        </View>

        {message ? <InfoBanner text={message} tone="danger" /> : null}

        <Button
          title="회원 탈퇴 요청"
          onPress={() => setMessage("실제 회원 탈퇴 API는 아직 연결되지 않았습니다.")}
        />
      </SectionCard>
    </Screen>
  );
}

const cameraStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0b1110",
  },
  container: {
    flex: 1,
    backgroundColor: "#0b1110",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topShade: {
    flex: 1.1,
    backgroundColor: "rgba(6, 12, 10, 0.58)",
  },
  middleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  sideShade: {
    flex: 1,
    backgroundColor: "rgba(6, 12, 10, 0.58)",
    height: "100%",
  },
  frameWrap: {
    width: "90%",
    aspectRatio: GUIDE_FRAME_ASPECT_RATIO,
    maxWidth: "90%",
  },
  frame: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "rgba(214, 242, 233, 0.9)",
    borderRadius: 28,
    backgroundColor: "transparent",
  },
  corner: {
    position: "absolute",
    width: 34,
    height: 34,
    borderColor: "#ffffff",
  },
  cornerTopLeft: {
    top: -1.5,
    left: -1.5,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 24,
  },
  cornerTopRight: {
    top: -1.5,
    right: -1.5,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 24,
  },
  cornerBottomLeft: {
    bottom: -1.5,
    left: -1.5,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 24,
  },
  cornerBottomRight: {
    bottom: -1.5,
    right: -1.5,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 24,
  },
  bottomShade: {
    flex: 1.35,
    backgroundColor: "rgba(6, 12, 10, 0.58)",
  },
  header: {
    position: "absolute",
    top: 12,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(6, 12, 10, 0.4)",
  },
  instructions: {
    position: "absolute",
    top: 74,
    left: 24,
    right: 24,
    gap: 8,
  },
  instructionsTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  instructionsBody: {
    color: "#e3f0eb",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 34,
    left: 24,
    right: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cancelButton: {
    minWidth: 74,
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.24)",
  },
  cancelButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
  },
  captureOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 4,
    borderColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.16)",
  },
  captureInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  captureBusy: {
    width: 22,
    height: 22,
    borderRadius: 8,
    backgroundColor: "#0f766e",
  },
  footerSpacer: {
    width: 74,
  },
});
