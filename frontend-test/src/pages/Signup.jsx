import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Signup = () => {
  const navigate = useNavigate();

  // 단계 관리 (1: 기본정보, 2: 추가정보)
  const [step, setStep] = useState(1);

  // 1단계 공통 회원가입 상태
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('MALE');
  const [role, setRole] = useState('USER');

  // 이메일 인증 관련 상태 관리
  const [verificationCode, setVerificationCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  // 2단계 일반유저 상태
  const [allergies, setAllergies] = useState('');
  const [diseases, setDiseases] = useState('');

  // 2단계 약사 상태
  const [docNumber, setDocNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseImage, setLicenseImage] = useState(null);

  // 타이머 효과
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // 초 단위를 '03:00' 형태로 변경해주는 텍스트 함수
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // 이메일 인증번호 발송 요청
  const handleSendVerificationCode = async () => {
    if (!email) {
      alert('이메일을 입력해주세요.');
      return;
    }
    try {
      const res = await axios.post('http://localhost:8080/api/auth/email/verification-code', {
        email: email,
        code: ""
      });

      setIsCodeSent(true);
      setTimeLeft(180);
      alert(res.data);
    } catch (error) {
      console.error('인증번호 발송 실패:', error);
      alert('인증번호 발송에 실패했습니다. 이메일 주소를 다시 확인해주세요.');
    }
  };

  // 이메일 인증번호 확인 검증 요청
  const handleVerifyCode = async () => {
    if (!verificationCode) {
      alert('인증번호를 입력해주세요.');
      return;
    }
    try {
      const res = await axios.post('http://localhost:8080/api/auth/email/verify', {
        email: email,
        code: verificationCode
      });

      if (res.data.verified === true) {
        setIsEmailVerified(true);
        setTimeLeft(0);
        alert(res.data.message);
      } else {
        alert('인증 실패: 인증번호를 다시 확인해주세요.');
      }
    } catch (error) {
      console.error('인증번호 검증 에러 상세:', error);

      if (error.response && error.response.data) {
        const errorMsg = typeof error.response.data === 'object'
          ? (error.response.data.message || '인증번호가 일치하지 않습니다.')
          : error.response.data;
        alert(errorMsg);
      } else {
        alert('서버와 통신 중 오류가 발생했습니다.');
      }
    }
  };

  // 1단계 완료
  const handleStep1Submit = async (e) => {
    e.preventDefault();

    if (!isEmailVerified) {
      alert('이메일 인증을 완료하셔야 다음 단계로 진행할 수 있습니다.');
      return;
    }

    try {
      await axios.post('http://localhost:8080/api/auth/signup', {
        email,
        password,
        username,
        birthDate,
        gender,
        role
      });

      localStorage.setItem('tempEmail', email);
      setStep(2);
    } catch (error) {
      console.error('1단계 가입 실패:', error);
      alert('기본 정보 입력 중 오류가 발생했습니다. 백엔드 유효성 검사를 확인해주세요.');
    }
  };

  // 2단계 완료 - 일반유저
  const handleUserStep2Submit = async (e) => {
    e.preventDefault();
    const tempEmail = localStorage.getItem('tempEmail');

    try {
      await axios.post('http://localhost:8080/api/auth/user/profile', {
        allergies,
        diseases,
        email: tempEmail
      });

      alert('회원가입이 최종 완료되었습니다. 로그인을 해주세요.');
      localStorage.removeItem('tempEmail');
      navigate('/login');
    } catch (error) {
      console.error('2단계 등록 실패:', error);
      alert('추가 정보 입력 중 오류가 발생했습니다.');
    }
  };

  // 2단계 완료 - 약사유저
  const handlePharmacistStep2Submit = async (e) => {
    e.preventDefault();
    const tempEmail = localStorage.getItem('tempEmail');

    const formData = new FormData();
    const requestData = { docNumber, licenseNumber, email: tempEmail };

    formData.append('data', new Blob([JSON.stringify(requestData)], { type: 'application/json' }));
    formData.append('licenseImage', licenseImage);

    try {
      await axios.post('http://localhost:8080/api/auth/pharmacists/verification', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert('약사 면허 인증 및 회원가입이 최종 완료되었습니다.');
      localStorage.removeItem('tempEmail');
      navigate('/login');
    } catch (error) {
      console.error('약사 인증 실패:', error);
      alert('면허 인증 요청 중 오류가 발생했습니다.');
    }
  };

  if (step === 1) {
    return (
      <div style={{ padding: '20px', maxWidth: '400px' }}>
        <h2>회원가입 1단계: 기본 정보 입력</h2>
        <form onSubmit={handleStep1Submit}>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <input
              type="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              readOnly={isEmailVerified}
              required
            />
            <button
              type="button"
              onClick={handleSendVerificationCode}
              disabled={isEmailVerified}
            >
              {isCodeSent ? '인증번호 재발송' : '인증번호 발송'}
            </button>
          </div>

          {isCodeSent && (
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <input
                type="text"
                placeholder="인증번호 6자리"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                disabled={isEmailVerified}
                required
              />
              <button
                type="button"
                onClick={handleVerifyCode}
                disabled={isEmailVerified}
              >
                {isEmailVerified ? '인증 완료' : '인증 확인'}
              </button>
              {timeLeft > 0 && (
                <span style={{ color: 'red', alignSelf: 'center', fontWeight: 'bold' }}>
                  {formatTime(timeLeft)}
                </span>
              )}
              {timeLeft === 0 && !isEmailVerified && (
                <span style={{ color: 'red', alignSelf: 'center' }}>시간 만료</span>
              )}
            </div>
          )}

          <input type="password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', marginBottom: '15px' }} required /><br />
          <input type="text" placeholder="이름" value={username} onChange={(e) => setUsername(e.target.value)} style={{ width: '100%', marginBottom: '15px' }} required /><br />

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>생년월일</label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              style={{ width: '100%', padding: '5px' }}
              required
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>성별</label>
            <button type="button" onClick={() => setGender('MALE')} style={{ marginRight: '10px', padding: '5px 15px', fontWeight: gender === 'MALE' ? 'bold' : 'normal', border: gender === 'MALE' ? '2px solid black' : '1px solid #ccc' }}>남성</button>
            <button type="button" onClick={() => setGender('FEMALE')} style={{ padding: '5px 15px', fontWeight: gender === 'FEMALE' ? 'bold' : 'normal', border: gender === 'FEMALE' ? '2px solid black' : '1px solid #ccc' }}>여성</button>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontWeight: 'bold', fontSize: '14px' }}>역할 선택: </label>
            <button type="button" onClick={() => setRole('USER')} style={{ marginRight: '10px', padding: '5px 10px', fontWeight: role === 'USER' ? 'bold' : 'normal' }}>일반 유저</button>
            <button type="button" onClick={() => setRole('PHARMACIST')} style={{ padding: '5px 10px', fontWeight: role === 'PHARMACIST' ? 'bold' : 'normal' }}>약사 유저</button>
          </div>

          <button
            type="submit"
            style={{
              backgroundColor: isEmailVerified ? '#4CAF50' : '#ccc',
              color: 'white',
              cursor: isEmailVerified ? 'pointer' : 'not-allowed',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '4px',
              width: '100%'
            }}
          >
            {isEmailVerified ? '다음 단계로 (추가 정보 입력)' : '이메일 인증을 완료해주세요'}
          </button>
        </form>
      </div>
    );
  }

  if (step === 2 && role === 'USER') {
    return (
      <div style={{ padding: '20px' }}>
        <h2>회원가입 2단계: 일반 유저 추가 정보</h2>
        <form onSubmit={handleUserStep2Submit}>
          <input type="text" placeholder="알러지" value={allergies} onChange={(e) => setAllergies(e.target.value)} /><br /><br />
          <input type="text" placeholder="기저질환" value={diseases} onChange={(e) => setDiseases(e.target.value)} /><br /><br />
          <button type="submit">회원가입 최종 완료</button>
        </form>
      </div>
    );
  }

  if (step === 2 && role === 'PHARMACIST') {
    return (
      <div style={{ padding: '20px' }}>
        <h2>회원가입 2단계: 약사 면허 인증</h2>
        <form onSubmit={handlePharmacistStep2Submit}>
          <input type="text" placeholder="문서 번호" value={docNumber} onChange={(e) => setDocNumber(e.target.value)} required /><br /><br />
          <input type="text" placeholder="면허 번호" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} required /><br /><br />
          <input type="file" accept="image/*" onChange={(e) => setLicenseImage(e.target.files[0])} required /><br /><br />
          <button type="submit">면허 인증 및 가입 완료</button>
        </form>
      </div>
    );
  }
};

export default Signup;
