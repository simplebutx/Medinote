import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getAuthSession, searchMedicines, suggestMedicines } from '../api';

const PharmacistInventory = () => {
    const navigate = useNavigate();
    const session = getAuthSession();
    
    const [keyword, setKeyword] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [myInventory, setMyInventory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [myPharmacy, setMyPharmacy] = useState(null);

    const debounceTimeoutRef = useRef(null);
    const latestKeywordRef = useRef('');

    useEffect(() => {
        if (!session || (session.role !== 'PHARMACIST' && session.role !== 'ROLE_PHARMACIST')) {
            alert('약사 전용 페이지입니다.');
            navigate('/');
            return;
        }
        fetchMyPharmacy();
        fetchInventory();
    }, [navigate]);

    const fetchMyPharmacy = async () => {
        try {
            const hpid = `MOCK_${session.userId}`;
            const res = await axios.get(`/api/pharmacies/${hpid}`);
            setMyPharmacy(res.data);
        } catch (error) {
            console.error('내 약국 정보 조회 실패', error);
        }
    };

    const fetchInventory = async () => {
        try {
            const res = await axios.get('/api/pharmacist/inventory', {
                headers: { Authorization: `Bearer ${session.accessToken}` }
            });
            setMyInventory(res.data || []);
        } catch (error) {
            console.error('재고 목록 조회 실패', error);
        }
    };

    const handleSearch = async (targetKeyword) => {
        const trimmed = targetKeyword.trim();
        if (!trimmed) return;
        
        setLoading(true);
        try {
            const item = await searchMedicines(trimmed);
            setSearchResults(item ? [item] : []);
            setSuggestions([]);
        } catch (error) {
            console.error('약품 검색 실패', error);
            setSearchResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeywordChange = (e) => {
        const value = e.target.value;
        setKeyword(value);

        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);

        const trimmed = value.trim();
        latestKeywordRef.current = trimmed

        if (!trimmed) { setSuggestions([]); return; }

        debounceTimeoutRef.current = setTimeout(async () => {
            try {
                const items = await suggestMedicines(trimmed);
                if (latestKeywordRef.current === trimmed) setSuggestions(items);
            } catch { setSuggestions([]); }
        }, 200);
    };

    const handleSuggestionClick = (s) => {
        setKeyword(s);
        handleSearch(s);
    };

    const addToInventory = async (medicine) => {
        if (!myPharmacy) {
            alert('먼저 마이페이지에서 약국 정보를 등록해 주세요.');
            return;
        }
        const stockAmount = prompt(`${medicine.itemName}의 현재 재고량을 입력하세요:`, '100');
        if (stockAmount === null) return;

        try {
            await axios.post('/api/pharmacist/inventory', {
                pharmacyHpid: myPharmacy.hpid,
                itemSeq: medicine.itemSeq.toString(),
                itemName: medicine.itemName,
                companyName: medicine.companyName,
                stockQuantity: parseInt(stockAmount)
            }, { headers: { Authorization: `Bearer ${session.accessToken}` } });
            
            alert('재고가 등록되었습니다.');
            fetchInventory();
        } catch (error) {
            alert('등록 실패: ' + (error.response?.data || error.message));
        }
    };

    const updateStock = async (item) => {
        const newAmount = prompt(`${item.itemName}의 수정할 재고량을 입력하세요:`, item.stockQuantity.toString());
        if (newAmount === null) return;

        try {
            await axios.post('/api/pharmacist/inventory', {
                pharmacyHpid: item.pharmacyHpid,
                itemSeq: item.itemSeq,
                itemName: item.itemName,
                companyName: item.companyName,
                stockQuantity: parseInt(newAmount)
            }, { headers: { Authorization: `Bearer ${session.accessToken}` } });
            
            alert('재고가 수정되었습니다.');
            fetchInventory();
        } catch (error) {
            alert('수정 실패: ' + (error.response?.data || error.message));
        }
    };

    const deleteInventory = async (item) => {
        if (!item || !item.id) return;
        if (!window.confirm(`[${item.itemName}] 재고 정보를 정말로 삭제하시겠습니까?`)) return;

        try {
            await axios.delete(`/api/pharmacist/inventory/${item.id}`, {
                headers: { Authorization: `Bearer ${session.accessToken}` }
            });
            alert('삭제되었습니다.');
            fetchInventory();
        } catch (error) {
            alert('삭제 실패: ' + (error.response?.data?.message || error.message));
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        
        const pad = (n) => n.toString().padStart(2, '0');
        const year = d.getFullYear();
        const month = pad(d.getMonth() + 1);
        const day = pad(d.getDate());
        const hours = pad(d.getHours());
        const minutes = pad(d.getMinutes());

        return `${year}-${month}-${day} ${hours}:${minutes}`;
    };

    return (
        <div style={containerStyle}>
            <header style={headerStyle}>
                <h2>📦 약국 재고 관리</h2>
                {myPharmacy ? (
                    <p style={{ color: '#065f46', fontWeight: '600' }}>📍 {myPharmacy.name} 재고 관리 중</p>
                ) : (
                    <p style={{ color: '#ef4444' }}>⚠️ 등록된 약국 정보가 없습니다. 마이페이지에서 먼저 등록해 주세요.</p>
                )}
            </header>

            <div style={verticalLayoutStyle}>
                {/* 상단: 새 약품 검색 및 등록 */}
                <div style={sectionStyle}>
                    <h3 style={sectionTitleStyle}>새 약품 검색 및 등록</h3>
                    <div style={{ position: 'relative', maxWidth: '600px' }}>
                        <div style={searchFormStyle}>
                            <input 
                                type="text" 
                                placeholder="약품명 또는 성분명 검색..." 
                                value={keyword}
                                onChange={handleKeywordChange}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch(keyword)}
                                style={inputStyle}
                            />
                            <button onClick={() => handleSearch(keyword)} style={buttonStyle}>검색</button>
                        </div>
                        {suggestions.length > 0 && (
                            <ul style={suggestionListStyle}>
                                {suggestions.map((s) => <li key={s} style={suggestionItemStyle} onClick={() => handleSuggestionClick(s)}>{s}</li>)}
                            </ul>
                        )}
                    </div>

                    <div style={resultRowStyle}>
                        {loading ? <p>검색 중...</p> : searchResults.map((med) => (
                            <div key={med.itemSeq} style={medItemStyle}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 'bold' }}>{med.itemName}</div>
                                    <div style={{ fontSize: '12px', color: '#64748b' }}>{med.companyName} | #{med.itemSeq}</div>
                                </div>
                                <button onClick={() => addToInventory(med)} style={addButtonStyle}>재고 등록</button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 하단: 우리 약국 보유 재고 목록 */}
                <div style={sectionStyle}>
                    <h3 style={sectionTitleStyle}>우리 약국 보유 재고 ({myInventory.length})</h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={tableStyle}>
                            <thead>
                                <tr style={tableHeaderStyle}>
                                    <th style={thStyle}>약품명</th>
                                    <th style={thStyle}>제조사</th>
                                    <th style={thStyle}>현재 재고</th>
                                    <th style={thStyle}>최초 등록일</th>
                                    <th style={thStyle}>마지막 수정일</th>
                                    <th style={thStyle}>관리</th>
                                </tr>
                            </thead>
                            <tbody>
                                {myInventory.length === 0 ? (
                                    <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>등록된 재고가 없습니다.</td></tr>
                                ) : myInventory.map((item) => (
                                    <tr key={item.id} style={trStyle}>
                                        <td style={tdStyle}>
                                            <div style={{ fontWeight: '600' }}>{item.itemName}</div>
                                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>#{item.itemSeq}</div>
                                        </td>
                                        <td style={tdStyle}>{item.companyName}</td>
                                        <td style={tdStyle}>
                                            <span style={{ color: item.stockQuantity < 10 ? '#ef4444' : '#1e293b', fontWeight: 'bold' }}>
                                                {item.stockQuantity}개
                                            </span>
                                        </td>
                                        <td style={tdStyle}>{formatDate(item.createdAt)}</td>
                                        <td style={tdStyle}>{formatDate(item.updatedAt)}</td>
                                        <td style={tdStyle}>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button onClick={() => updateStock(item)} style={editButtonStyle}>수정</button>
                                                <button onClick={() => deleteInventory(item)} style={deleteButtonStyle}>삭제</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Styles ---
const containerStyle = { padding: '40px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' };
const headerStyle = { marginBottom: '30px', borderBottom: '1px solid #e2e8f0', paddingBottom: '20px' };
const verticalLayoutStyle = { display: 'flex', flexDirection: 'column', gap: '30px' };
const sectionStyle = { backgroundColor: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' };
const sectionTitleStyle = { fontSize: '18px', fontWeight: 'bold', marginBottom: '20px', color: '#1e293b' };
const searchFormStyle = { display: 'flex', gap: '8px', marginBottom: '10px' };
const inputStyle = { flex: 1, padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px' };
const buttonStyle = { padding: '10px 20px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' };
const suggestionListStyle = { position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 10, listStyle: 'none', padding: 0, margin: 0, maxHeight: '200px', overflowY: 'auto' };
const suggestionItemStyle = { padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '14px' };
const resultRowStyle = { display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' };
const medItemStyle = { display: 'flex', gap: '15px', alignItems: 'center', padding: '12px 20px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9', minWidth: '300px' };
const addButtonStyle = { padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' };
const tableStyle = { width: '100%', borderCollapse: 'collapse' };
const tableHeaderStyle = { borderBottom: '2px solid #f1f5f9', textAlign: 'left' };
const thStyle = { padding: '15px 12px', color: '#64748b', fontSize: '13px', fontWeight: '600' };
const trStyle = { borderBottom: '1px solid #f1f5f9' };
const tdStyle = { padding: '15px 12px', fontSize: '13px' };
const editButtonStyle = { padding: '6px 12px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' };
const deleteButtonStyle = { padding: '6px 12px', backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' };

export default PharmacistInventory;
