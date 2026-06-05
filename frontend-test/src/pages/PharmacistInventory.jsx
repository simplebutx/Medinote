import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getAuthSession } from '../api';

const PharmacistInventory = () => {
    const navigate = useNavigate();
    const session = getAuthSession();
    
    const [searchTerm, setSearchText] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [myInventory, setMyInventory] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!session || session.role !== 'PHARMACIST') {
            alert('약사 전용 페이지입니다.');
            navigate('/');
            return;
        }
        fetchInventory();
    }, [navigate]);

    // 내 약국 재고 목록 가져오기 (API 구현 필요)
    const fetchInventory = async () => {
        try {
            // TODO: 실제 백엔드 API 주소로 변경 필요
            // const res = await axios.get('http://localhost:8081/api/pharmacist/inventory', {
            //     headers: { Authorization: `Bearer ${session.accessToken}` }
            // });
            // setMyInventory(res.data);
            
            // 테스트용 가상 데이터
            setMyInventory([
                { id: 1, name: '타이레놀정 500mg', company: '한국얀센', stock: 100 },
                { id: 2, name: '게보린정', company: '삼진제약', stock: 50 }
            ]);
        } catch (error) {
            console.error('재고 목록 조회 실패', error);
        }
    };

    // 약품 검색 로직 (기존 검색 API 활용 가능)
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchTerm.trim()) return;
        
        setLoading(true);
        try {
            const res = await axios.get(`http://localhost:8081/api/medication/search?item_name=${searchTerm}`);
            setSearchResults(res.data || []);
        } catch (error) {
            console.error('약품 검색 실패', error);
        } finally {
            setLoading(false);
        }
    };

    // 재고 등록 함수
    const addToInventory = async (medicine) => {
        const stockAmount = prompt(`${medicine.itemName}의 현재 재고량을 입력하세요:`, '100');
        if (stockAmount === null) return;

        try {
            // TODO: 실제 백엔드 등록 API 호출
            // await axios.post('http://localhost:8081/api/pharmacist/inventory', {
            //     itemSeq: medicine.itemSeq,
            //     stock: parseInt(stockAmount)
            // }, { headers: { Authorization: `Bearer ${session.accessToken}` } });
            
            alert('재고가 등록되었습니다.');
            fetchInventory();
        } catch (error) {
            alert('등록 실패: ' + error.message);
        }
    };

    return (
        <div style={containerStyle}>
            <header style={headerStyle}>
                <h2>📦 약국 재고 관리</h2>
                <p style={{ color: '#64748b' }}>우리 약국에 보유 중인 약품을 등록하고 관리하세요.</p>
            </header>

            <div style={layoutStyle}>
                {/* 왼쪽: 재고 등록 (검색) */}
                <div style={sectionStyle}>
                    <h3 style={sectionTitleStyle}>새 약품 등록</h3>
                    <form onSubmit={handleSearch} style={searchFormStyle}>
                        <input 
                            type="text" 
                            placeholder="약품명 검색..." 
                            value={searchTerm}
                            onChange={(e) => setSearchText(e.target.value)}
                            style={inputStyle}
                        />
                        <button type="submit" style={buttonStyle}>검색</button>
                    </form>

                    <div style={resultListStyle}>
                        {loading ? <p>검색 중...</p> : searchResults.map((med) => (
                            <div key={med.itemSeq} style={medItemStyle}>
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>{med.itemName}</div>
                                    <div style={{ fontSize: '12px', color: '#64748b' }}>{med.entpName}</div>
                                </div>
                                <button onClick={() => addToInventory(med)} style={addButtonStyle}>추가</button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 오른쪽: 보유 재고 목록 */}
                <div style={{ ...sectionStyle, flex: 1.5 }}>
                    <h3 style={sectionTitleStyle}>현재 보유 목록</h3>
                    <table style={tableStyle}>
                        <thead>
                            <tr style={tableHeaderStyle}>
                                <th style={thStyle}>약품명</th>
                                <th style={thStyle}>제조사</th>
                                <th style={thStyle}>현재 재고</th>
                                <th style={thStyle}>관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {myInventory.map((item) => (
                                <tr key={item.id} style={trStyle}>
                                    <td style={tdStyle}>{item.name}</td>
                                    <td style={tdStyle}>{item.company}</td>
                                    <td style={tdStyle}>{item.stock}개</td>
                                    <td style={tdStyle}>
                                        <button style={editButtonStyle}>수정</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- Styles ---
const containerStyle = { padding: '40px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' };
const headerStyle = { marginBottom: '30px' };
const layoutStyle = { display: 'flex', gap: '30px', alignItems: 'flex-start' };
const sectionStyle = { backgroundColor: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', flex: 1 };
const sectionTitleStyle = { fontSize: '18px', fontWeight: 'bold', marginBottom: '20px', color: '#1e293b' };
const searchFormStyle = { display: 'flex', gap: '8px', marginBottom: '20px' };
const inputStyle = { flex: 1, padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' };
const buttonStyle = { padding: '10px 20px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' };
const resultListStyle = { display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto' };
const medItemStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid #f1f5f9', borderRadius: '8px' };
const addButtonStyle = { padding: '6px 12px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' };
const tableStyle = { width: '100%', borderCollapse: 'collapse' };
const tableHeaderStyle = { borderBottom: '2px solid #f1f5f9', textAlign: 'left' };
const thStyle = { padding: '12px', color: '#64748b', fontSize: '14px' };
const trStyle = { borderBottom: '1px solid #f1f5f9' };
const tdStyle = { padding: '12px', fontSize: '14px' };
const editButtonStyle = { padding: '4px 8px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' };

export default PharmacistInventory;
