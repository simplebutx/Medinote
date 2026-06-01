import { useEffect, useState } from 'react'
import axios from 'axios'
import { getAuthSession, updateMyProfile } from '../api'
import { useNavigate } from 'react-router-dom'

const PharmacistProfile = () => {
    const session = getAuthSession()
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState('basic') // basic, verification
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)
    
    // 수정 모드 상태 분리
    const [isEditingBasic, setIsEditingBasic] = useState(false)
    const [isEditingLicense, setIsEditingLicense] = useState(false)
    
    // 기본 정보 폼 상태
    const [basicForm, setBasicForm] = useState({
        username: '',
        birthDate: '',
        gender: ''
    })

    // 면허 정보 폼 상태
    const [licenseForm, setLicenseForm] = useState({
        docNumber: '',
        licenseNumber: ''
    })
    const [licenseFile, setLicenseFile] = useState(null)

    const loadProfile = async () => {
        try {
            const res = await axios.get('/api/auth/me', {
                headers: { Authorization: `Bearer ${session.accessToken}` }
            })
            setProfile(res.data)
            setBasicForm({
                username: res.data.username || '',
                birthDate: res.data.birthDate || '',
                gender: res.data.gender || ''
            })
            setLicenseForm({
                docNumber: res.data.docNumber || '',
                licenseNumber: res.data.licenseNumber || ''
            })
        } catch (error) {
            console.error("프로필 로드 실패", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (session) loadProfile()
    }, [])

    // 기본 정보 저장
    const handleSaveBasic = async () => {
        try {
            await updateMyProfile({
                username: basicForm.username,
                birthDate: basicForm.birthDate,
                gender: basicForm.gender
            })
            alert('기본 정보가 수정되었습니다.')
            setIsEditingBasic(false)
            loadProfile()
        } catch (error) {
            alert('수정에 실패했습니다.')
        }
    }

    // 면허 정보 수정 (재승인 필요)
    const handleSaveLicense = async () => {
        if (!window.confirm("면허 정보를 수정하면 관리자의 재승인이 완료될 때까지 약사 기능을 이용할 수 없습니다. 계속하시겠습니까?")) {
            return;
        }

        try {
            const formData = new FormData();
            formData.append('data', new Blob([JSON.stringify({
                docNumber: licenseForm.docNumber,
                licenseNumber: licenseForm.licenseNumber
            })], { type: 'application/json' }));
            
            if (licenseFile) {
                formData.append('licenseImage', licenseFile);
            }

            await axios.patch('/api/auth/pharmacists/profile', formData, {
                headers: { 
                    Authorization: `Bearer ${session.accessToken}`,
                    'Content-Type': 'multipart/form-data' 
                }
            });

            alert('정보 수정 및 재승인 요청이 완료되었습니다. 관리자 승인 후 다시 이용 가능합니다.');
            setIsEditingLicense(false);
            
            // 재승인 대기 상태이므로 로그아웃 처리하거나 대시보드로 이동
            localStorage.removeItem('authSession');
            navigate('/login');
        } catch (error) {
            alert('수정 요청에 실패했습니다: ' + (error.response?.data || error.message));
        }
    }

    if (loading) return <div style={{ padding: '20px' }}>로딩 중...</div>
    if (!profile) return <div style={{ padding: '20px' }}>프로필을 불러올 수 없습니다.</div>

    return (
        <div style={{ maxWidth: '800px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '30px' }}>내 정보 관리</h1>

            {/* 탭 메뉴 */}
            <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '30px' }}>
                <button 
                    onClick={() => setActiveTab('basic')}
                    style={activeTab === 'basic' ? activeTabStyle : tabStyle}
                >
                    기본 정보
                </button>
                <button 
                    onClick={() => setActiveTab('verification')}
                    style={activeTab === 'verification' ? activeTabStyle : tabStyle}
                >
                    약사 인증 상태
                </button>
            </div>

            {/* 기본 정보 탭 */}
            {activeTab === 'basic' && (
                <div style={sectionCardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: '700' }}>계정 및 개인정보</h2>
                        <button 
                            onClick={() => setIsEditingBasic(!isEditingBasic)}
                            style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', cursor: 'pointer', background: isEditingBasic ? '#f1f5f9' : '#fff' }}
                        >
                            {isEditingBasic ? '취소' : '수정하기'}
                        </button>
                    </div>

                    {isEditingBasic ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={inputGroupStyle}>
                                <label style={labelStyle}>이름</label>
                                <input style={inputStyle} value={basicForm.username} onChange={e => setBasicForm({...basicForm, username: e.target.value})} />
                            </div>
                            <div style={inputGroupStyle}>
                                <label style={labelStyle}>생년월일</label>
                                <input type="date" style={inputStyle} value={basicForm.birthDate} onChange={e => setBasicForm({...basicForm, birthDate: e.target.value})} />
                            </div>
                            <div style={inputGroupStyle}>
                                <label style={labelStyle}>성별</label>
                                <select style={inputStyle} value={basicForm.gender} onChange={e => setBasicForm({...basicForm, gender: e.target.value})}>
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
                            <div style={infoItemStyle}><span>생년월일</span><strong>{profile.birthDate}</strong></div>
                            <div style={infoItemStyle}><span>성별</span><strong>{profile.gender === 'MALE' ? '남성' : '여성'}</strong></div>
                        </div>
                    )}
                </div>
            )}

            {/* 약사 인증 상태 탭 */}
            {activeTab === 'verification' && (
                <div style={sectionCardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: '700' }}>전문 자격 인증 정보</h2>
                        <button 
                            onClick={() => setIsEditingLicense(!isEditingLicense)}
                            style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', cursor: 'pointer', background: isEditingLicense ? '#f1f5f9' : '#fff' }}
                        >
                            {isEditingLicense ? '취소' : '인증 정보 수정'}
                        </button>
                    </div>
                    
                    {isEditingLicense && (
                        <div style={warningBoxStyle}>
                            ⚠️ 주의: 면허 정보를 수정하면 관리자의 재승인이 필요하며, 승인 전까지 약사 기능 사용이 제한됩니다.
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                        <div style={infoItemVerticalStyle}>
                            <span style={labelStyle}>소속 약국명</span>
                            {isEditingLicense ? (
                                <input style={inputStyle} value={licenseForm.docNumber} onChange={e => setLicenseForm({...licenseForm, docNumber: e.target.value})} placeholder="약국명을 입력하세요" />
                            ) : (
                                <strong style={{ fontSize: '18px' }}>{profile.docNumber || '미등록'}</strong>
                            )}
                        </div>

                        <div style={infoItemVerticalStyle}>
                            <span style={labelStyle}>약사 면허번호</span>
                            {isEditingLicense ? (
                                <input style={inputStyle} value={licenseForm.licenseNumber} onChange={e => setLicenseForm({...licenseForm, licenseNumber: e.target.value})} placeholder="면허번호를 입력하세요" />
                            ) : (
                                <strong style={{ fontSize: '18px', color: '#1e293b' }}>{profile.licenseNumber}</strong>
                            )}
                        </div>

                        <div style={infoItemVerticalStyle}>
                            <span style={labelStyle}>면허증 이미지</span>
                            {isEditingLicense && (
                                <div style={{marginBottom:'10px'}}>
                                    <input type="file" onChange={e => setLicenseFile(e.target.files[0])} accept="image/*" />
                                    <p style={{fontSize:'12px', color:'#64748b', marginTop:'5px'}}>* 이미지를 변경할 경우에만 선택하세요.</p>
                                </div>
                            )}
                            <div style={imageContainerStyle}>
                                {profile.licenseImage ? (
                                    <img 
                                        src={profile.licenseImage} 
                                        alt="License" 
                                        style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                                        onError={(e) => { e.target.src = 'https://via.placeholder.com/400x250?text=이미지를+불러올+수+없음'; }}
                                    />
                                ) : (
                                    <div style={noImageStyle}>등록된 이미지가 없습니다.</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {isEditingLicense && (
                        <button onClick={handleSaveLicense} style={{ ...saveButtonStyle, marginTop: '30px', background: '#ef4444' }}>정보 수정 및 재승인 요청</button>
                    )}
                </div>
            )}
        </div>
    )
}

// --- Styles ---
const tabStyle = { padding: '12px 24px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '16px', color: '#64748b', fontWeight: '500' };
const activeTabStyle = { ...tabStyle, color: '#065f46', borderBottom: '3px solid #065f46', fontWeight: '700' };
const sectionCardStyle = { background: '#fff', padding: '30px', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' };
const gridInfoStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' };
const infoItemStyle = { display: 'flex', flexDirection: 'column', gap: '6px', borderBottom: '1px solid #f1f5f9', paddingBottom: '15px' };
const infoItemVerticalStyle = { display: 'flex', flexDirection: 'column', gap: '8px' };
const labelStyle = { fontSize: '14px', fontWeight: '600', color: '#64748b' };
const inputGroupStyle = { display: 'flex', flexDirection: 'column', gap: '8px' };
const inputStyle = { padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '15px' };
const saveButtonStyle = { padding: '14px', borderRadius: '8px', border: 'none', background: '#065f46', color: '#fff', fontWeight: '700', cursor: 'pointer' };
const imageContainerStyle = { marginTop: '10px', background: '#f8fafc', padding: '20px', borderRadius: '12px', textAlign: 'center' };
const noImageStyle = { padding: '40px', color: '#94a3b8', fontSize: '14px', border: '2px dashed #e2e8f0', borderRadius: '8px' };
const warningBoxStyle = { backgroundColor: '#fff7ed', border: '1px solid #ffedd5', color: '#9a3412', padding: '15px', borderRadius: '10px', fontSize: '14px', marginBottom: '25px', fontWeight: '500' };

export default PharmacistProfile
