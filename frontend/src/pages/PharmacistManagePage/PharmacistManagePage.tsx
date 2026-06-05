import toast from 'react-hot-toast';
import { Badge, Button, Card } from '../../components/ui';
import {
  useApprovePharmacist,
  usePendingPharmacists,
  useRejectPharmacist,
} from '../../features/admin/hooks';

function PharmacistManagePage() {
  const {
    data: pendingPharmacists = [],
    isLoading,
    isError,
  } = usePendingPharmacists();

  const approvePharmacistMutation = useApprovePharmacist();
  const rejectPharmacistMutation = useRejectPharmacist();

  const isProcessing =
    approvePharmacistMutation.isPending || rejectPharmacistMutation.isPending;

  const handleApprovePharmacist = (userId: number) => {
    const isConfirmed = window.confirm('이 약사 인증 요청을 승인하시겠습니까?');

    if (!isConfirmed) {
      return;
    }

    approvePharmacistMutation.mutate(userId, {
      onSuccess: () => {
        toast.success('약사 인증 요청을 승인했습니다.');
      },
      onError: (error) => {
        console.error('약사 승인 실패:', error);
        toast.error('약사 승인에 실패했습니다.');
      },
    });
  };

  const handleRejectPharmacist = (userId: number) => {
    const isConfirmed = window.confirm('이 약사 인증 요청을 거절하시겠습니까?');

    if (!isConfirmed) {
      return;
    }

    rejectPharmacistMutation.mutate(userId, {
      onSuccess: () => {
        toast.success('약사 인증 요청을 거절했습니다.');
      },
      onError: (error) => {
        console.error('약사 거절 실패:', error);
        toast.error('약사 거절에 실패했습니다.');
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-blue-600">
          Pharmacist Management
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900">약사 관리</h1>

        <p className="mt-2 text-slate-500">
          약사 회원가입 후 제출된 인증 정보를 확인하고 승인 또는 거절합니다.
        </p>
      </div>

      <Card>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              승인 대기 약사
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              관리자 검토가 필요한 약사 인증 요청 목록입니다.
            </p>
          </div>

          <Badge variant="yellow">{pendingPharmacists.length}건 대기</Badge>
        </div>
      </Card>

      {isLoading && (
        <div className="rounded-2xl bg-blue-50 p-5 text-sm text-blue-700">
          승인 대기 약사 목록을 불러오는 중입니다.
        </div>
      )}

      {isError && (
        <div className="rounded-2xl bg-red-50 p-5 text-sm text-red-700">
          승인 대기 약사 목록을 불러오지 못했습니다. 관리자 권한과 로그인
          상태를 확인해주세요.
        </div>
      )}

      {!isLoading && !isError && pendingPharmacists.length === 0 && (
        <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">
          승인 대기 중인 약사 인증 요청이 없습니다.
        </div>
      )}

      {!isLoading && !isError && pendingPharmacists.length > 0 && (
        <div className="space-y-4">
          {pendingPharmacists.map((pharmacist) => (
            <Card key={pharmacist.userId}>
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">
                      {pharmacist.username || '이름 정보 없음'}
                    </h2>

                    <Badge variant="yellow">승인 대기</Badge>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">이메일</p>
                      <p className="mt-2 font-semibold text-slate-900">
                        {pharmacist.email || '-'}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">소속 약국명</p>
                      <p className="mt-2 font-semibold text-slate-900">
                        {pharmacist.docNumber || '-'}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">면허 번호</p>
                      <p className="mt-2 font-semibold text-slate-900">
                        {pharmacist.licenseNumber || '-'}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">면허증 이미지</p>

                      {pharmacist.licenseImage ? (
                        <a
                          href={pharmacist.licenseImage}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-block font-semibold text-blue-600 hover:text-blue-700"
                        >
                          면허증 이미지 열기
                        </a>
                      ) : (
                        <p className="mt-2 font-semibold text-slate-900">
                          등록된 이미지 없음
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="border border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => handleRejectPharmacist(pharmacist.userId)}
                    disabled={isProcessing}
                  >
                    거절
                  </Button>

                  <Button
                    type="button"
                    onClick={() => handleApprovePharmacist(pharmacist.userId)}
                    disabled={isProcessing}
                  >
                    승인
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-700">
        약사 인증 승인 시 해당 회원의 약사 권한이 활성화됩니다. 거절 시에는
        회원 상태가 거절 상태로 변경되므로 제출 정보를 확인한 뒤 처리해주세요.
      </div>
    </div>
  );
}

export default PharmacistManagePage;