import React, { useState } from 'react';
import axios from 'axios';

const YunjuTest = () => {
  // 공통 폼 상태
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [birthDate, setBirthDate] = useState('1990-01-01');
  const [gender, setGender] = useState('MALE');
  const [role, setRole] = useState('USER');

  // 건강 정보 상태
  const [isPregnant, setIsPregnant] = useState(false);
  const [isBreastfeeding, setIsBreastfeeding] = useState(false);
  const [isSmoking, setIsSmoking] = useState(false);
  const [isDrinking, setIsDrinking] = useState(false);
  const [diseaseName, setDiseaseName] = useState('');

  // 약사 상태
  const [docNumber, setDocNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseImage, setLicenseImage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    
    // JSON 데이터 조립
    const requestData = {
      email,
      password,
      username,
      birthDate,
      gender,
      role,
      isPregnant,
      isBreastfeeding,
      isSmoking,
      isDrinking,
      diseaseName,
      docNumber,
      licenseNumber
    };

    // 'data'라는 이름으로 JSON 데이터 추가
    formData.append('data', new Blob([JSON.stringify(requestData)], { type: 'application/json' }));

    // 파일이 있으면 'licenseImage'라는 이름으로 추가
    if (role === 'PHARMACIST' && licenseImage) {
      formData.append('licenseImage', licenseImage);
    }

    try {
      const res = await axios.post('/api/auth/signup', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      alert('가입 성공: ' + res.data);
    } catch (error) {
      console.error('가입 에러:', error);
      alert('가입 실패! 콘솔을 확인하세요.');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: 'auto' }}>
      <h2>윤주님 통합 API 테스트 페이지</h2>
      <form onSubmit={handleSubmit}>
        <h3>1. 기본 정보</h3>
        <input type="email" placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)} required style={{display:'block', marginBottom:'10px', width:'100%'}}/>
        <input type="password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} required style={{display:'block', marginBottom:'10px', width:'100%'}}/>
        <input type="text" placeholder="닉네임" value={username} onChange={(e) => setUsername(e.target.value)} required style={{display:'block', marginBottom:'10px', width:'100%'}}/>
        <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required style={{display:'block', marginBottom:'10px', width:'100%'}}/>
        
        <div style={{ marginBottom: '10px' }}>
          <label>성별: </label>
          <select value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="MALE">남성</option>
            <option value="FEMALE">여성</option>
          </select>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label>역할: </label>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="USER">일반 유저</option>
            <option value="PHARMACIST">약사</option>
          </select>
        </div>

        <hr />
        <h3>2. 추가 정보 (선택)</h3>

        <div style={{ marginBottom: '10px' }}>
            <label><input type="checkbox" checked={isPregnant} onChange={(e) => setIsPregnant(e.target.checked)}/> 임신 여부</label><br/>
            <label><input type="checkbox" checked={isBreastfeeding} onChange={(e) => setIsBreastfeeding(e.target.checked)}/> 수유 여부</label><br/>
            <label><input type="checkbox" checked={isSmoking} onChange={(e) => setIsSmoking(e.target.checked)}/> 흡연 여부</label><br/>
            <label><input type="checkbox" checked={isDrinking} onChange={(e) => setIsDrinking(e.target.checked)}/> 음주 여부</label>
        </div>
        
        <input type="text" placeholder="기저질환명 (예: 고혈압)" value={diseaseName} onChange={(e) => setDiseaseName(e.target.value)} style={{display:'block', marginBottom:'20px', width:'100%'}}/>

        {role === 'PHARMACIST' && (
          <div style={{ border: '1px solid red', padding: '10px', marginBottom: '20px' }}>
            <h4>약사 전용 입력란</h4>
            <input type="text" placeholder="문서 번호" value={docNumber} onChange={(e) => setDocNumber(e.target.value)} style={{display:'block', marginBottom:'10px', width:'100%'}}/>
            <input type="text" placeholder="면허 번호" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} style={{display:'block', marginBottom:'10px', width:'100%'}}/>
            <input type="file" accept="image/*" onChange={(e) => setLicenseImage(e.target.files[0])} style={{display:'block', marginBottom:'10px', width:'100%'}}/>
          </div>
        )}

        <button type="submit" style={{ width: '100%', padding: '15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', fontSize: '16px' }}>
          단일 API로 가입하기 전송!
        </button>
      </form>
    </div>
  );
};

export default YunjuTest;
