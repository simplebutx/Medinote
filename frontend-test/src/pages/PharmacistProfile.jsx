import { useEffect, useState } from 'react'
import axios from 'axios'
import { getAuthSession, getMyProfile, updateMyProfile } from '../api'
import { useNavigate } from 'react-router-dom'

const DAYS = [
  { key: 'monday', label: '월요일' },
  { key: 'tuesday', label: '화요일' },
  { key: 'wednesday', label: '수요일' },
  { key: 'thursday', label: '목요일' },
  { key: 'friday', label: '금요일' },
  { key: 'saturday', label: '토요일' },
  { key: 'sunday', label: '일요일' },
  { key: 'holiday', label: '공휴일' },
]

const formatTimeForApi = (timeStr) => timeStr.replace(':', '')
const formatTimeForInput = (timeStr) => {
  if (!timeStr || timeStr.length !== 4) return ''
  return `${timeStr.slice(0, 2)}:${timeStr.slice(2)}`
}

const PharmacistProfile = () => {
  const session = getAuthSession()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('basic')
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const [isEditingBasic, setIsEditingBasic] = useState(false)
  const [isEditingLicense, setIsEditingLicense] = useState(false)
  const [isEditingPharmacy, setIsEditingPharmacy] = useState(false)

  const [basicForm, setBasicForm] = useState({
    username: '',
    birthDate: '',
    gender: '',
  })

  const [licenseForm, setLicenseForm] = useState({
    docNumber: '',
    licenseNumber: '',
  })
  const [licenseFile, setLicenseFile] = useState(null)

  const [pharmacyForm, setPharmacyForm] = useState({
    pharmacyName: '',
    address: '',
    phone: '',
    latitude: 37.5665,
    longitude: 126.978,
    mondayOpen: '0900', mondayClose: '1800',
    tuesdayOpen: '0900', tuesdayClose: '1800',
    wednesdayOpen: '0900', wednesdayClose: '1800',
    thursdayOpen: '0900', thursdayClose: '1800',
    fridayOpen: '0900', fridayClose: '1800',
    saturdayOpen: '0900', saturdayClose: '1300',
    sundayOpen: '', sundayClose: '',
    holidayOpen: '', holidayClose: '',
  })

  const [hasRegisteredPharmacy, setHasRegisteredPharmacy] = useState(false)
  const [registeredHpid, setRegisteredHpid] = useState(null)

  const loadProfile = async () => {
    try {
      const data = await getMyProfile()
      setProfile(data)
      setBasicForm({
        username: data.username || '',
        birthDate: data.birthDate || '',
        gender: data.gender || '',
      })
      setLicenseForm({
        docNumber: data.docNumber || '',
        licenseNumber: data.licenseNumber || '',
      })

      const hpid = `MOCK_${session.userId}`

      try {
        const pharmRes = await axios.get(`/api/pharmacies/${hpid}`)
        if (pharmRes.data) {
          setPharmacyForm({
            pharmacyName: pharmRes.data.name || data.docNumber || '',
            address: pharmRes.data.address || '',
            phone: pharmRes.data.phone || '',
            latitude: pharmRes.data.latitude || 37.5665,
            longitude: pharmRes.data.longitude || 126.978,
            mondayOpen: pharmRes.data.mondayOpen || '0900',
            mondayClose: pharmRes.data.mondayClose || '1800',
            tuesdayOpen: pharmRes.data.tuesdayOpen || '0900',
            tuesdayClose: pharmRes.data.tuesdayClose || '1800',
            wednesdayOpen: pharmRes.data.wednesdayOpen || '0900',
            wednesdayClose: pharmRes.data.wednesdayClose || '1800',
            thursdayOpen: pharmRes.data.thursdayOpen || '0900',
            thursdayClose: pharmRes.data.thursdayClose || '1800',
            fridayOpen: pharmRes.data.fridayOpen || '0900',
            fridayClose: pharmRes.data.fridayClose || '1800',
            saturdayOpen: pharmRes.data.saturdayOpen || '0900',
            saturdayClose: pharmRes.data.saturdayClose || '1300',
            sundayOpen: pharmRes.data.sundayOpen || '',
            sundayClose: pharmRes.data.sundayClose || '',
            holidayOpen: pharmRes.data.holidayOpen || '',
            holidayClose: pharmRes.data.holidayClose || '',
          })
          setHasRegisteredPharmacy(true)
          setRegisteredHpid(hpid)
        }
      } catch {
        setPharmacyForm((prev) => ({
          ...prev,
          pharmacyName: data.docNumber || '',
        }))
        setHasRegisteredPharmacy(false)
        setRegisteredHpid(null)
      }
    } catch (error) {
      console.error('프로필 로드 실패', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!session) {
      navigate('/login')
      return
    }
    loadProfile()
  }, [])

  const handleSaveBasic = async () => {
    try {
      await updateMyProfile(basicForm)
      alert('기본 정보가 수정되었습니다.')
      setIsEditingBasic(false)
      loadProfile()
    } catch {
      alert('기본 정보 수정에 실패했습니다.')
    }
  }

  const handleSaveLicense = async () => {
    try {
      const formData = new FormData()
      const jsonData = JSON.stringify({
        docNumber: licenseForm.docNumber,
        licenseNumber: licenseForm.licenseNumber,
      })

      formData.append('data', new Blob([jsonData], { type: 'application/json' }))
      if (licenseFile) {
        formData.append('licenseImage', licenseFile)
      }

      await axios.patch('/api/auth/pharmacists/profile', formData, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'multipart/form-data',
        },
      })

      alert('면허 정보가 수정되었고, 재승인이 필요합니다.')
      setIsEditingLicense(false)
      setLicenseFile(null)
      loadProfile()
    } catch {
      alert('면허 정보 수정에 실패했습니다.')
    }
  }

  const handleSavePharmacy = async () => {
    try {
      const payload = {
        ...pharmacyForm,
        pharmacyName: pharmacyForm.pharmacyName,
        latitude: parseFloat(pharmacyForm.latitude),
        longitude: parseFloat(pharmacyForm.longitude),
      }

      if (hasRegisteredPharmacy) {
        await axios.patch(`/api/pharmacies/${registeredHpid}`, payload, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        })
        alert('약국 정보가 수정되었습니다.')
      } else {
        await axios.post('/api/pharmacies', payload, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        })
        alert('약국 정보가 등록되었습니다.')
      }

      setIsEditingPharmacy(false)
      loadProfile()
    } catch (error) {
      alert(error.response?.data || '약국 정보 저장에 실패했습니다.')
    }
  }

  const handleWithdraw = async () => {
    if (!window.confirm('정말로 탈퇴하시겠습니까? 약국 및 재고 정보가 삭제되며 복구할 수 없습니다.')) {
      return
    }

    try {
      await withdrawAccount()
      alert('탈퇴 처리가 완료되었습니다.')
      clearAuthSession()
      navigate('/login')
    } catch (error) {
      if (error.name === 'CanceledError' || error.message?.includes('canceled')) return;
      alert(error.response?.data?.message || error.response?.data || '탈퇴 처리 중 오류가 발생했습니다.')
    }
  }

  if (loading) {
    return <div style={{ padding: '20px' }}>로딩 중...</div>
  }

  if (!profile) {
    return <div style={{ padding: '20px' }}>프로필을 불러올 수 없습니다.</div>
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '30px' }}>내 정보 관리</h1>

      <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '30px' }}>
        {['basic', 'verification', 'pharmacy'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={activeTab === tab ? activeTabStyle : tabStyle}>
            {tab === 'basic' ? '기본 정보' : tab === 'verification' ? '인증 상태' : '약국 정보'}
          </button>
        ))}
      </div>

      {activeTab === 'basic' && (
        <div style={sectionCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700' }}>계정 및 개인정보</h2>
            <button onClick={() => setIsEditingBasic(!isEditingBasic)} style={editToggleButtonStyle(isEditingBasic)}>
              {isEditingBasic ? '취소' : '수정하기'}
            </button>
          </div>

          {isEditingBasic ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>이름</label>
                <input style={inputStyle} value={basicForm.username} onChange={(e) => setBasicForm({ ...basicForm, username: e.target.value })} />
              </div>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>생년월일</label>
                <input type="date" style={inputStyle} value={basicForm.birthDate} onChange={(e) => setBasicForm({ ...basicForm, birthDate: e.target.value })} />
              </div>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>성별</label>
                <select style={inputStyle} value={basicForm.gender} onChange={(e) => setBasicForm({ ...basicForm, gender: e.target.value })}>
                  <option value="MALE">남성</option>
                  <option value="FEMALE">여성</option>
                </select>
              </div>
              <button onClick={handleSaveBasic} style={saveButtonStyle}>변경사항 저장</button>
            </div>
          ) : (
            <div style={gridInfoStyle}>
              <div style={infoItemStyle}><span>이름</span><strong>{profile.username}</strong></div>
              <div style={infoItemStyle}><span>이메일</span><strong>{profile.email}</strong></div>
              <div style={infoItemStyle}><span>생년월일</span><strong>{profile.birthDate || '-'}</strong></div>
              <div style={infoItemStyle}><span>성별</span><strong>{profile.gender === 'MALE' ? '남성' : '여성'}</strong></div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'verification' && (
        <div style={sectionCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700' }}>전문 자격 인증 정보</h2>
            <button onClick={() => setIsEditingLicense(!isEditingLicense)} style={editToggleButtonStyle(isEditingLicense)}>
              {isEditingLicense ? '취소' : '수정하기'}
            </button>
          </div>

          {isEditingLicense ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>소속 약국명</label>
                <input style={inputStyle} value={licenseForm.docNumber} onChange={(e) => setLicenseForm({ ...licenseForm, docNumber: e.target.value })} />
              </div>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>약사 면허번호</label>
                <input style={inputStyle} value={licenseForm.licenseNumber} onChange={(e) => setLicenseForm({ ...licenseForm, licenseNumber: e.target.value })} />
              </div>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>면허증 이미지 첨부</label>
                <input type="file" accept="image/*" onChange={(e) => setLicenseFile(e.target.files?.[0] || null)} />
              </div>
              <button onClick={handleSaveLicense} style={saveButtonStyle}>변경사항 저장</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={infoItemVerticalStyle}><span style={labelStyle}>소속 약국명</span><strong>{profile.docNumber || '미등록'}</strong></div>
              <div style={infoItemVerticalStyle}><span style={labelStyle}>약사 면허번호</span><strong>{profile.licenseNumber || '미등록'}</strong></div>
              <div style={imageContainerStyle}>
                {profile.licenseImage ? <img src={profile.licenseImage} alt="License" style={{ maxWidth: '100%', borderRadius: '8px' }} /> : '등록된 이미지 없음'}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'pharmacy' && (
        <div style={sectionCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700' }}>소속 약국 정보 관리</h2>
            <button onClick={() => setIsEditingPharmacy(!isEditingPharmacy)} style={editToggleButtonStyle(isEditingPharmacy)}>
              {isEditingPharmacy ? '취소' : hasRegisteredPharmacy ? '정보 수정' : '약국 등록'}
            </button>
          </div>

          {isEditingPharmacy ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>약국명</label>
                <input style={inputStyle} value={pharmacyForm.pharmacyName} onChange={(e) => setPharmacyForm({ ...pharmacyForm, pharmacyName: e.target.value })} />
              </div>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>상세 주소</label>
                <input style={inputStyle} value={pharmacyForm.address} onChange={(e) => setPharmacyForm({ ...pharmacyForm, address: e.target.value })} />
              </div>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>전화번호</label>
                <input style={inputStyle} value={pharmacyForm.phone} onChange={(e) => setPharmacyForm({ ...pharmacyForm, phone: e.target.value })} />
              </div>
              <div style={gridInfoStyle}>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>위도</label>
                  <input type="number" step="any" style={inputStyle} value={pharmacyForm.latitude} onChange={(e) => setPharmacyForm({ ...pharmacyForm, latitude: e.target.value })} />
                </div>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>경도</label>
                  <input type="number" step="any" style={inputStyle} value={pharmacyForm.longitude} onChange={(e) => setPharmacyForm({ ...pharmacyForm, longitude: e.target.value })} />
                </div>
              </div>

              <div style={{ marginTop: '10px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '15px' }}>영업시간 설정</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  {DAYS.map((day) => (
                    <div key={day.key} style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                      <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}>{day.label}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <input
                          type="time"
                          style={timeInputStyle}
                          value={formatTimeForInput(pharmacyForm[`${day.key}Open`])}
                          onChange={(e) => setPharmacyForm({ ...pharmacyForm, [`${day.key}Open`]: formatTimeForApi(e.target.value) })}
                        />
                        <span>~</span>
                        <input
                          type="time"
                          style={timeInputStyle}
                          value={formatTimeForInput(pharmacyForm[`${day.key}Close`])}
                          onChange={(e) => setPharmacyForm({ ...pharmacyForm, [`${day.key}Close`]: formatTimeForApi(e.target.value) })}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={handleSavePharmacy} style={saveButtonStyle}>{hasRegisteredPharmacy ? '수정 완료' : '등록 완료'}</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={infoItemVerticalStyle}><span>약국명</span><strong>{pharmacyForm.pharmacyName || profile.docNumber || '-'}</strong></div>
              <div style={infoItemVerticalStyle}><span>주소</span><strong>{pharmacyForm.address || '-'}</strong></div>
              <div style={infoItemVerticalStyle}><span>전화번호</span><strong>{pharmacyForm.phone || '-'}</strong></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {DAYS.map((day) => (
                  <div key={day.key} style={{ fontSize: '13px' }}>
                    <span style={{ color: '#64748b', marginRight: '8px' }}>{day.label}</span>
                    <strong>{pharmacyForm[`${day.key}Open`] ? `${formatTimeForInput(pharmacyForm[`${day.key}Open`])} ~ ${formatTimeForInput(pharmacyForm[`${day.key}Close`])}` : '휴무'}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const tabStyle = { padding: '12px 24px', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: '3px solid transparent', background: 'none', cursor: 'pointer', fontSize: '16px', color: '#64748b' }
const activeTabStyle = { ...tabStyle, color: '#065f46', borderBottom: '3px solid #065f46', fontWeight: '700' }
const sectionCardStyle = { background: '#fff', padding: '30px', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
const gridInfoStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }
const infoItemStyle = { display: 'flex', flexDirection: 'column', gap: '6px', borderBottom: '1px solid #f1f5f9', paddingBottom: '15px' }
const infoItemVerticalStyle = { display: 'flex', flexDirection: 'column', gap: '8px' }
const labelStyle = { fontSize: '14px', fontWeight: '600', color: '#64748b' }
const inputGroupStyle = { display: 'flex', flexDirection: 'column', gap: '8px' }
const inputStyle = { padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }
const timeInputStyle = { padding: '5px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }
const saveButtonStyle = { padding: '14px', borderRadius: '8px', border: 'none', backgroundColor: '#065f46', color: '#fff', fontWeight: '700', cursor: 'pointer', marginTop: '10px' }
const editToggleButtonStyle = (isEditing) => ({ padding: '8px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', cursor: 'pointer', backgroundColor: isEditing ? '#f1f5f9' : '#fff' })
const imageContainerStyle = { marginTop: '10px', background: '#f8fafc', padding: '20px', borderRadius: '12px', textAlign: 'center' }

export default PharmacistProfile
