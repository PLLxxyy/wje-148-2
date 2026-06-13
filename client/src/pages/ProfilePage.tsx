import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { api } from '../api';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [nickname, setNickname] = useState(user?.nickname || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!nickname.trim()) {
      showToast('昵称不能为空', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.updateProfile({ nickname, phone });
      showToast('更新成功', 'success');
      await refreshUser();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '更新失败', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="main-content">
      <div className="profile-card">
        <div className="profile-header">
          <div className="big-avatar">{user.nickname[0]}</div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>{user.nickname}</h2>
          <div className="user-rating">
            {'★'.repeat(Math.round(user.rating))}{'☆'.repeat(5 - Math.round(user.rating))}
            {' '}({user.rating.toFixed(1)}) · {user.rating_count}条评价
          </div>
          <div style={{ marginTop: 6, fontSize: 13, color: '#888' }}>
            身份: {user.role === 'driver' ? '司机' : '乘客'} · 用户名: {user.username}
          </div>
        </div>

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label>昵称</label>
            <input
              type="text"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              placeholder="请输入昵称"
            />
          </div>

          <div className="form-group">
            <label>手机号</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="请输入手机号"
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? '保存中...' : '保存修改'}
          </button>
        </form>
      </div>
    </div>
  );
}
