import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import type { Notification } from '../types';

export default function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotif, setShowNotif] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowNotif(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function loadNotifications() {
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch {
      // ignore
    }
  }

  async function handleMarkRead(id: number) {
    try {
      await api.markNotifRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  }

  async function handleMarkAllRead() {
    try {
      await api.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  }

  function handleLogout() {
    logout();
    navigate('/auth');
  }

  if (!user) return null;

  const isActive = (path: string) => location.pathname === path ? 'nav-link active' : 'nav-link';

  return (
    <header className="header">
      <Link to="/" className="header-logo">
        <span>🚗</span> 拼车出行
      </Link>
      <nav className="header-nav">
        <Link to="/" className={isActive('/')}>首页</Link>
        {user.role === 'driver' && (
          <Link to="/create-ride" className={isActive('/create-ride')}>发布行程</Link>
        )}
        <Link to="/my-rides" className={isActive('/my-rides')}>我的行程</Link>
        {user.role === 'driver' && (
          <Link to="/ride-manage" className={isActive('/ride-manage')}>行程管理</Link>
        )}
        <div style={{ position: 'relative' }} ref={panelRef}>
          <button
            className="nav-link"
            onClick={() => setShowNotif(!showNotif)}
            style={{ position: 'relative' }}
          >
            通知
            {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
          </button>
          {showNotif && (
            <div className="notif-panel">
              <div className="notif-panel-header">
                <h3>通知 ({unreadCount})</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    style={{ background: 'none', border: 'none', color: '#667eea', cursor: 'pointer', fontSize: 13 }}
                  >
                    全部已读
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <div style={{ padding: 30, textAlign: 'center', color: '#999', fontSize: 14 }}>
                  暂无通知
                </div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    className={`notif-item ${n.is_read === 0 ? 'unread' : ''}`}
                    onClick={() => !n.is_read && handleMarkRead(n.id)}
                  >
                    <div className="notif-title">{n.title}</div>
                    <div className="notif-content">{n.content}</div>
                    <div className="notif-time">{n.created_at}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        <Link to="/profile" className={isActive('/profile')}>
          <span className="header-user">
            <span className="avatar">{user.nickname[0]}</span>
            {user.nickname}
          </span>
        </Link>
        <button className="btn-logout" onClick={handleLogout}>退出</button>
      </nav>
    </header>
  );
}
