import { useNavigate } from 'react-router-dom';
import { Badge, Button, Card } from '../../components/ui';
import { useUserStore } from '../../store/useUserStore';

function getPendingStatusLabel(status?: string | null) {
  if (status === 'PENDING' || status === 'WAITING_APPROVAL') {
    return '승인 대기';
  }

  if (status === 'REJECTED') {
    return '승인 반려';
  }

  return '승인 필요';
}

function getPendingMessage(status?: string | null) {
  if (status === 'REJECTED') {
    return '약사 인증 정보가 반려되었습니다. 내 정보에서 인증 정보를 확인하고 다시 제출해주세요.';
  }

  if (status === 'PENDING' || status === 'WAITING_APPROVAL') {
    return '관리자 승인 후 약사 전용 기능을 이용할 수 있습니다.';
  }

  return '약사 승인 상태를 확인할 수 없습니다. 관리자 승인 상태를 확인해주세요.';
}

function PharmPendingPage() {
  const navigate = useNavigate();
  const status = useUserStore((state) => state.status);
  const logout = useUserStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-blue-600">
          Pharmacist Approval
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          약사 승인 상태
        </h1>
        <p className="mt-2 text-slate-500">
          승인 완료 전에는 약사 전용 페이지에 접근할 수 없습니다.
        </p>
      </div>

      <Card>
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <Badge variant={status === 'REJECTED' ? 'red' : 'yellow'}>
              {getPendingStatusLabel(status)}
            </Badge>
            <h2 className="mt-4 text-xl font-bold text-slate-900">
              {getPendingMessage(status)}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              현재 상태: {status ?? '상태 없음'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              className="border border-slate-200"
              onClick={() => navigate('/')}
            >
              홈으로
            </Button>
            <Button type="button" variant="secondary" onClick={handleLogout}>
              로그아웃
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default PharmPendingPage;
