import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
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

interface RideWithRequests extends Ride {
  requests?: RideRequest[];
  showRequests?: boolean;
}

export default function RideManagePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [rides, setRides] = useState<RideWithRequests[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRides = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.getRides({ driver_id: String(user.id) });
      setRides(res.rides);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadRides();
  }, [loadRides]);

  async function loadRequests(rideId: number) {
    try {
      const res = await api.getRideRequests(rideId);
      setRides(prev => prev.map(r =>
        r.id === rideId ? { ...r, requests: res.requests, showRequests: true } : r
      ));
    } catch {
      showToast('获取申请列表失败', 'error');
    }
  }

  async function handleRequestStatus(requestId: number, status: 'approved' | 'rejected', rideId: number) {
    try {
      await api.updateRequestStatus(requestId, status);
      showToast(status === 'approved' ? '已通过' : '已拒绝', 'success');
      // Reload requests and ride data
      const reqRes = await api.getRideRequests(rideId);
      setRides(prev => prev.map(r =>
        r.id === rideId ? { ...r, requests: reqRes.requests } : r
      ));
      loadRides();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '操作失败', 'error');
    }
  }

  async function handleCancelRide(rideId: number) {
    if (!confirm('确定要取消该行程吗？已加入的乘客将收到通知。')) return;
    try {
      await api.cancelRide(rideId);
      showToast('行程已取消', 'success');
      loadRides();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '取消失败', 'error');
    }
  }

  async function handleCompleteRide(rideId: number) {
    try {
      await api.completeRide(rideId);
      showToast('行程已完成', 'success');
      loadRides();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '操作失败', 'error');
    }
  }

  if (user?.role !== 'driver') {
    return (
      <div className="main-content">
        <div className="empty-state">
          <div className="icon">🚫</div>
          <p>只有司机才能管理行程</p>
        </div>
      </div>
    );
  }

  if (loading) return <div className="main-content"><div className="loading">加载中...</div></div>;

  return (
    <div className="main-content">
      <h2 className="page-title">行程管理</h2>

      {rides.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📋</div>
          <p>暂无发布的行程</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/create-ride')}>
            发布行程
          </button>
        </div>
      ) : (
        rides.map(ride => (
          <div key={ride.id} className="detail-card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <h3 style={{ fontSize: 17, fontWeight: 600 }}>
                    {ride.origin} → {ride.destination}
                  </h3>
                  <StatusTag status={ride.status} />
                </div>
                <div style={{ fontSize: 13, color: '#888' }}>
                  {formatTime(ride.departure_time)} · {ride.car_model} · 余{ride.available_seats}/{ride.total_seats}座 · ¥{ride.price_per_person}/人
                </div>
              </div>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => navigate(`/ride/${ride.id}`)}
              >
                查看详情
              </button>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {ride.status === 'open' && (
                <>
                  {ride.available_seats === ride.total_seats && (
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => navigate(`/edit-ride/${ride.id}`)}
                    >
                      修改行程
                    </button>
                  )}
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => loadRequests(ride.id)}
                  >
                    查看申请
                  </button>
                  <button
                    className="btn btn-sm btn-success"
                    onClick={() => handleCompleteRide(ride.id)}
                  >
                    完成行程
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleCancelRide(ride.id)}
                  >
                    取消行程
                  </button>
                </>
              )}
            </div>

            {/* Requests list */}
            {ride.showRequests && ride.requests && (
              <div style={{ marginTop: 8 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, color: '#555' }}>
                  申请列表 ({ride.requests.length})
                </h4>
                {ride.requests.length === 0 ? (
                  <p style={{ color: '#999', fontSize: 14, padding: 10 }}>暂无申请</p>
                ) : (
                  ride.requests.map(req => (
                    <div key={req.id} className="request-item">
                      <div className="request-info">
                        <div className="r-avatar">{(req.nickname || '?')[0]}</div>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 14 }}>{req.nickname}</div>
                          <div style={{ fontSize: 12, color: '#888' }}>
                            ★ {req.rating?.toFixed(1)} · 上车点: {req.pickup_point} · {req.seats_needed}人
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <StatusTag status={req.status} />
                        {req.status === 'pending' && (
                          <div className="request-actions">
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => handleRequestStatus(req.id, 'approved', ride.id)}
                            >
                              通过
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleRequestStatus(req.id, 'rejected', ride.id)}
                            >
                              拒绝
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
