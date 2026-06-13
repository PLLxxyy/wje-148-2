import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { api } from '../api';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('rider');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await api.login({ username, password });
        login(res.token, res.user);
        showToast('登录成功', 'success');
        navigate('/');
      } else {
        const res = await api.register({ username, password, nickname, phone, role });
        login(res.token, res.user);
        showToast('注册成功', 'success');
        navigate('/');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : '操作失败', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>🚗 拼车出行</h2>
        <p className="subtitle">让出行更便捷、更经济</p>

        <div className="auth-tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
            登录
          </button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>
            注册
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>用户名</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="请输入用户名"
              required
            />
          </div>

          <div className="form-group">
            <label>密码</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="请输入密码"
              required
            />
          </div>

          {mode === 'register' && (
            <>
              <div className="form-group">
                <label>昵称</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  placeholder="请输入昵称"
                  required
                />
              </div>

              <div className="form-group">
                <label>手机号（选填）</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="请输入手机号"
                />
              </div>

              <div className="form-group">
                <label>身份</label>
                <select value={role} onChange={e => setRole(e.target.value)}>
                  <option value="rider">乘客</option>
                  <option value="driver">司机</option>
                </select>
              </div>
            </>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? '处理中...' : mode === 'login' ? '登录' : '注册'}
          </button>
        </form>
      </div>
    </div>
  );
}
