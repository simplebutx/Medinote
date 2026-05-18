import { useState } from "react";
import { Button, Input } from "../../../components/ui";

interface UserAdditionalInfoStepProps {
  onBack: () => void;
  onComplete: () => void;
}

function UserAdditionalInfoStep({
  onBack,
  onComplete,
}: UserAdditionalInfoStepProps) {
  const [allergies, setAllergies] = useState("");
  const [diseases, setDiseases] = useState("");

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900">
        Step 2. 일반 사용자 추가 정보
      </h2>

      <p className="mt-2 text-sm text-slate-500">
        복약 관리와 주의 성분 안내를 위해 필요한 정보를 입력합니다.
      </p>

      <div className="mt-6 space-y-6">

        <Input
          label="알레르기/주의 성분"
          placeholder="예: 페니실린, 아스피린, NSAIDs"
          value={allergies}
          onChange={(event) => setAllergies(event.target.value)}
        />

        <Input
          label="질환 정보"
          placeholder="예: 고혈압, 당뇨, 위염"
          value={diseases}
          onChange={(event) => setDiseases(event.target.value)}
        />

        <div className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-700">
          입력한 알레르기/주의 성분은 이후 OCR 결과, 약 검색, 약사 상담에서
          참고 정보로 활용됩니다.
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

export default UserAdditionalInfoStep;