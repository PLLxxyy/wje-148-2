import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import type { Ride, RideRequest } from '../types';

function formatTime(time: string) {
  const d = new Date(time);
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusTag({ status }: { status: string }) {
  const labels: Record<string, string> = {
    open: '可预订',
    full: '已满员',
    completed: '已完成',
    cancelled: '已取消',
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝',
  };
  return <span className={`status-tag status-${status}`}>{labels[status] || status}</span>;
}

export default function MyRidesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');
  const [myRides, setMyRides] = useState<Ride[]>([]);
  const [myRequests, setMyRequests] = useState<RideRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      if (user?.role === 'driver') {
        const res = await api.getRides({ driver_id: String(user.id) });
        setMyRides(res.rides);
      }
      const reqRes = await api.getMyRequests();
      setMyRequests(reqRes.requests);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  const now = new Date();
  const upcomingRides = myRides.filter(r => new Date(r.departure_time) > now && r.status !== 'cancelled');
  const historyRides = myRides.filter(r => new Date(r.departure_time) <= now || r.status === 'cancelled');

  const upcomingRequests = myRequests.filter(r => r.ride_status !== 'cancelled' && r.ride_status !== 'completed');
  const historyRequests = myRequests.filter(r => r.ride_status === 'cancelled' || r.ride_status === 'completed');

  if (loading) return <div className="main-content"><div className="loading">加载中...</div></div>;

  return (
    <div className="main-content">
      <h2 className="page-title">我的行程</h2>

      <div className="tabs">
        <button
          className={activeTab === 'upcoming' ? 'active' : ''}
          onClick={() => setActiveTab('upcoming')}
        >
          即将出发
        </button>
        <button
          className={activeTab === 'history' ? 'active' : ''}
          onClick={() => setActiveTab('history')}
        >
          历史记录
        </button>
      </div>

      {activeTab === 'upcoming' && (
        <>
          {/* Driver's upcoming rides */}
          {user?.role === 'driver' && upcomingRides.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#555' }}>
                我发布的行程
              </h3>
              {upcomingRides.map(ride => (
                <div
                  key={ride.id}
                  className="ride-card"
                  style={{ marginBottom: 10, cursor: 'pointer' }}
                  onClick={() => navigate(`/ride/${ride.id}`)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>
                        {ride.origin} → {ride.destination}
                      </div>
                      <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
                        {formatTime(ride.departure_time)} · {ride.car_model} · 余{ride.available_seats}座
                      </div>
                    </div>
                    <StatusTag status={ride.status} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Rider's upcoming requests */}
          {upcomingRequests.length > 0 ? (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#555' }}>
                我参与的行程
              </h3>
              {upcomingRequests.map(req => (
                <div
                  key={req.id}
                  className="ride-card"
                  style={{ marginBottom: 10, cursor: 'pointer' }}
                  onClick={() => navigate(`/ride/${req.ride_id}`)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>
                        {req.origin} → {req.destination}
                      </div>
                      <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
                        {formatTime(req.departure_time || '')} · 司机: {req.driver_nickname} · 上车点: {req.pickup_point}
                      </div>
                    </div>
                    <StatusTag status={req.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            user?.role !== 'driver' && (
              <div className="empty-state">
                <div className="icon">📋</div>
                <p>暂无即将出发的行程</p>
                <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/')}>
                  去找行程
                </button>
              </div>
            )
          )}

          {user?.role === 'driver' && upcomingRides.length === 0 && upcomingRequests.length === 0 && (
            <div className="empty-state">
              <div className="icon">📋</div>
              <p>暂无即将出发的行程</p>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/create-ride')}>
                发布行程
              </button>
            </div>
          )}
        </>
      )}

      {activeTab === 'history' && (
        <>
          {user?.role === 'driver' && historyRides.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#555' }}>
                我发布的行程
              </h3>
              {historyRides.map(ride => (
                <div
                  key={ride.id}
                  className="ride-card"
                  style={{ marginBottom: 10, cursor: 'pointer' }}
                  onClick={() => navigate(`/ride/${ride.id}`)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>
                        {ride.origin} → {ride.destination}
                      </div>
                      <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
                        {formatTime(ride.departure_time)} · {ride.car_model}
                      </div>
                    </div>
                    <StatusTag status={ride.status} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {historyRequests.length > 0 ? (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#555' }}>
                我参与的行程
              </h3>
              {historyRequests.map(req => (
                <div
                  key={req.id}
                  className="ride-card"
                  style={{ marginBottom: 10, cursor: 'pointer' }}
                  onClick={() => navigate(`/ride/${req.ride_id}`)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>
                        {req.origin} → {req.destination}
                      </div>
                      <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
                        {formatTime(req.departure_time || '')} · 司机: {req.driver_nickname}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <StatusTag status={req.ride_status || ''} />
                      <StatusTag status={req.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            user?.role !== 'driver' && historyRides.length === 0 && (
              <div className="empty-state">
                <div className="icon">📖</div>
                <p>暂无历史行程</p>
              </div>
            )
          )}

          {user?.role === 'driver' && historyRides.length === 0 && historyRequests.length === 0 && (
            <div className="empty-state">
              <div className="icon">📖</div>
              <p>暂无历史行程</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
