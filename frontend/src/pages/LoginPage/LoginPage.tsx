import { Link } from 'react-router-dom';

import LoginForm from '../../features/auth/components/LoginForm';

function LoginPage() {
  return (
    <>
      <Link
        to="/"
        className={[
          'fixed left-4 top-4 z-10 inline-flex h-10 items-center gap-2 rounded-xl',
          'border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700',
          'shadow-sm transition hover:border-slate-300 hover:bg-slate-50',
          'sm:left-6 sm:top-6',
        ].join(' ')}
      >
        <span aria-hidden="true" className="text-lg leading-none">
          ←
        </span>
        홈으로
      </Link>
      <LoginForm />
    </>
  );
}

export default LoginPage;
