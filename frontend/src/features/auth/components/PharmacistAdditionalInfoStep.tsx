import { useState } from "react";
import { Button, Input } from "../../../components/ui";

interface PharmacistAdditionalInfoStepProps {
  onBack: () => void;
  onComplete: () => void;
}

function PharmacistAdditionalInfoStep({
  onBack,
  onComplete,
}: PharmacistAdditionalInfoStepProps) {
  const [docNumber, setDocNumber] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseImage, setLicenseImage] = useState<File | null>(null);

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900">
        Step 2. 약사 추가 정보
      </h2>

      <p className="mt-2 text-sm text-slate-500">
        약사 계정 승인을 위해 면허 정보를 입력합니다.
      </p>

      <div className="mt-6 space-y-6">
        <Input
          label="문서번호"
          placeholder="문서번호를 입력하세요"
          value={docNumber}
          onChange={(event) => setDocNumber(event.target.value)}
        />

        <Input
          label="약사 면허번호"
          placeholder="면허번호를 입력하세요"
          value={licenseNumber}
          onChange={(event) => setLicenseNumber(event.target.value)}
        />

        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">
            면허증 이미지 업로드
          </p>

          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center hover:bg-slate-100">
            <span className="text-sm font-semibold text-slate-700">
              파일 선택
            </span>

            <span className="mt-1 text-xs text-slate-500">
              JPG, PNG 파일을 업로드하세요.
            </span>

            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setLicenseImage(file);
              }}
            />
          </label>

          {licenseImage && (
            <p className="mt-2 text-sm text-blue-600">
              선택된 파일: {licenseImage.name}
            </p>
          )}
        </div>

        <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700">
          약사 계정은 인증 정보 확인 후 상담 관리, 환자 조회, 약사 약 검색
          기능을 사용할 수 있습니다.
        </div>

        <div className="flex gap-3">
          <Button type="button" variant="ghost" onClick={onBack}>
            이전
          </Button>

          <Button type="button" onClick={onComplete}>
            가입 완료
          </Button>
        </div>
      </div>
    </div>
  );
}

export default PharmacistAdditionalInfoStep;