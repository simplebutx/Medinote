import React, { useState } from 'react';
import axios from 'axios';

const API_BASE_URL = "http://localhost:8080/api/auth";

const Login = () => {
    const [loginData, setLoginData] = useState({ email: '', password: '' });

    const handleChange = (e) => {
        setLoginData({ ...loginData, [e.target.name]: e.target.value });
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(`${API_BASE_URL}/login`, loginData);
            localStorage.setItem('accessToken', res.data.accessToken);
            alert("✅ 로그인 성공! 토큰이 저장되었습니다.");
        } catch (err) {
            alert(`❌ 실패: ${err.response?.data?.message || err.message}`);
        }
    };

    return (
        <div style={containerStyle}>
            <h2>🔑 하윤주 전용 로그인</h2>
            <form onSubmit={handleLogin} style={formStyle}>
                <input name="email" placeholder="이메일" onChange={handleChange} style={inputStyle} />
                <input name="password" type="password" placeholder="비밀번호" onChange={handleChange} style={inputStyle} />
                <button type="submit" style={btnStyle("#2196F3")}>로그인</button>
            </form>
        </div>
    );
};

export default Login;

// 공통 스타일
const containerStyle = { padding: '50px', display: 'flex', flexDirection: 'column', alignItems: 'center' };
const formStyle = { display: 'flex', flexDirection: 'column', width: '300px' };
const inputStyle = { margin: '10px 0', padding: '12px', borderRadius: '5px', border: '1px solid #ddd' };
const btnStyle = (color) => ({ padding: '12px', backgroundColor: color, color: 'white', border: 'none', cursor: 'pointer', borderRadius: '5px' });