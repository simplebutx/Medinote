import { useEffect, useState } from 'react'
import axios from 'axios'
import { getAuthSession, updateMyProfile } from '../api'

const PharmacistProfile = () => {
    const session = getAuthSession()
    const [activeTab, setActiveTab] = useState('basic') // basic, verification
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)
    const [isEditing, setIsEditing] = useState(false)
    
    // 수정 폼 상태
    const [form, setProfileForm] = useState({
        username: '',
        birthDate: '',
        gender: '',
        docNumber: ''
    })

    const loadProfile = async () => {
        try {
            const res = await axios.get('/api/auth/me', {
                headers: { Authorization: `Bearer ${session.accessToken}` }
            })
            setProfile(res.data)
            setProfileForm({
                username: res.data.username || '',
                birthDate: res.data.birthDate || '',
                gender: res.data.gender || '',
                docNumber: res.data.docNumber || ''
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

    const handleSave = async () => {
        try {
            await updateMyProfile({
                username: form.username,
                birthDate: form.birthDate,
                gender: form.gender,
                docNumber: form.docNumber
                // 약사 인증 정보(면허번호 등)는 보통 수정이 불가능하므로 제외
            })
            alert('정보가 수정되었습니다.')
            setIsEditing(false)
            loadProfile()
        } catch (error) {
            alert('수정에 실패했습니다.')
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
                            onClick={() => setIsEditing(!isEditing)}
                            style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', cursor: 'pointer', background: isEditing ? '#f1f5f9' : '#fff' }}
                        >
                            {isEditing ? '취소' : '수정하기'}
                        </button>
                    </div>

                    {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={inputGroupStyle}>
                                <label style={labelStyle}>이름</label>
                                <input style={inputStyle} value={form.username} onChange={e => setProfileForm({...form, username: e.target.value})} />
                            </div>
                            <div style={inputGroupStyle}>
                                <label style={labelStyle}>생년월일</label>
                                <input type="date" style={inputStyle} value={form.birthDate} onChange={e => setProfileForm({...form, birthDate: e.target.value})} />
                            </div>
                            <div style={inputGroupStyle}>
                                <label style={labelStyle}>성별</label>
                                <select style={inputStyle} value={form.gender} onChange={e => setProfileForm({...form, gender: e.target.value})}>
                                    <option value="MALE">남성</option>
                                    <option value="FEMALE">여성</option>
                                </select>
                            </div>
                            <button onClick={handleSave} style={saveButtonStyle}>변경사항 저장</button>
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
                    <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '25px' }}>전문 자격 인증 정보</h2>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                        <div style={infoItemVerticalStyle}>
                            <span style={labelStyle}>소속 약국명</span>
                            {isEditing ? (
                                <input style={inputStyle} value={form.docNumber} onChange={e => setProfileForm({...form, docNumber: e.target.value})} placeholder="약국명을 입력하세요" />
                            ) : (
                                <strong style={{ fontSize: '18px' }}>{profile.docNumber || '미등록'}</strong>
                            )}
                        </div>

                        <div style={infoItemVerticalStyle}>
                            <span style={labelStyle}>약사 면허번호</span>
                            <strong style={{ fontSize: '18px', color: '#64748b' }}>{profile.licenseNumber}</strong>
                            <p style={{ fontSize: '12px', color: '#10b981', marginTop: '5px' }}>✓ 인증된 면허번호는 수정할 수 없습니다.</p>
                        </div>

                        <div style={infoItemVerticalStyle}>
                            <span style={labelStyle}>등록된 면허증 이미지</span>
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

                    {isEditing && (
                        <button onClick={handleSave} style={{ ...saveButtonStyle, marginTop: '30px' }}>약국명 수정 저장</button>
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

export default PharmacistProfile
