import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { api } from '../api';
import type { RideDetailResponse, Review } from '../types';

function formatTime(time: string) {
  const d = new Date(time);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
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
  };
  return <span className={`status-tag status-${status}`}>{labels[status] || status}</span>;
}

export default function RideDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [data, setData] = useState<RideDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [pickupPoint, setPickupPoint] = useState('');
  const [seatsNeeded, setSeatsNeeded] = useState(1);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewTarget, setReviewTarget] = useState<{ id: number; name: string } | null>(null);

  const loadDetail = useCallback(async () => {
    try {
      const res = await api.getRideDetail(parseInt(id!, 10));
      setData(res);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '加载失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  async function handleApply() {
    if (!pickupPoint.trim()) {
      showToast('请填写上车点', 'error');
      return;
    }
    try {
      await api.applyRide({
        ride_id: parseInt(id!, 10),
        pickup_point: pickupPoint,
        seats_needed: seatsNeeded,
      });
      showToast('申请已提交', 'success');
      setShowApplyModal(false);
      setPickupPoint('');
      setSeatsNeeded(1);
      loadDetail();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '申请失败', 'error');
    }
  }

  async function handleReview() {
    if (!reviewTarget) return;
    try {
      await api.createReview({
        ride_id: parseInt(id!, 10),
        reviewee_id: reviewTarget.id,
        rating: reviewRating,
        comment: reviewComment,
      });
      showToast('评价成功', 'success');
      setShowReviewModal(false);
      setReviewComment('');
      setReviewRating(5);
      setReviewTarget(null);
      loadDetail();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '评价失败', 'error');
    }
  }

  function openReviewModal(userId: number, name: string) {
    setReviewTarget({ id: userId, name });
    setShowReviewModal(true);
  }

  if (loading) return <div className="main-content"><div className="loading">加载中...</div></div>;
  if (!data) return <div className="main-content"><div className="empty-state"><p>行程不存在</p></div></div>;

  const { ride, passengers, pendingCount, myRequest, reviews } = data;
  const isDriver = user?.id === ride.driver_id;
  const isCompleted = ride.status === 'completed';
  const canApply = user?.role === 'rider' && !isDriver && ride.status === 'open' && !myRequest;
  const canEdit = isDriver && ride.status === 'open' && passengers.length === 0;
  const hasReviewed = (revieweeId: number) =>
    reviews.some(r => r.reviewer_id === user?.id && r.reviewee_id === revieweeId);

  return (
    <div className="main-content">
      <div className="detail-container">
        {/* Route */}
        <div className="detail-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>行程详情</h2>
            <StatusTag status={ride.status} />
          </div>

          <div className="detail-route">
            <div className="route-point">
              <div className="label">出发地</div>
              <div className="place">{ride.origin}</div>
            </div>
            <div className="route-arrow">→</div>
            <div className="route-point">
              <div className="label">目的地</div>
              <div className="place">{ride.destination}</div>
            </div>
          </div>

          <div className="detail-meta">
            <div className="meta-item">
              <div className="label">出发时间</div>
              <div className="value">{formatTime(ride.departure_time)}</div>
            </div>
            <div className="meta-item">
              <div className="label">车型</div>
              <div className="value">{ride.car_model}</div>
            </div>
            <div className="meta-item">
              <div className="label">座位</div>
              <div className="value">{ride.available_seats}/{ride.total_seats} 座</div>
            </div>
            <div className="meta-item">
              <div className="label">每人费用</div>
              <div className="value" style={{ color: '#e74c3c', fontWeight: 700 }}>¥{ride.price_per_person}</div>
            </div>
          </div>

          {ride.description && (
            <div style={{ padding: '12px 14px', background: '#f8f9fc', borderRadius: 8, fontSize: 14, color: '#555', marginBottom: 20 }}>
              {ride.description}
            </div>
          )}

          {/* Driver info */}
          <div className="driver-info-card">
            <div className="driver-avatar-lg">
              {ride.driver_nickname?.[0] || '司'}
            </div>
            <div className="driver-detail">
              <div className="name">{ride.driver_nickname}</div>
              <div className="rating">★ {ride.driver_rating?.toFixed(1) || '5.0'} ({ride.driver_rating_count || 0}条评价)</div>
              {isDriver && <div className="phone">📱 {ride.driver_phone}</div>}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {canApply && (
              <button className="btn btn-primary" onClick={() => setShowApplyModal(true)}>
                加入拼车
              </button>
            )}
            {myRequest && (
              <div style={{ padding: '8px 14px', background: '#f0f2ff', borderRadius: 8, fontSize: 14, color: '#667eea' }}>
                您的申请状态：<span className={`status-tag status-${myRequest.status}`}>{
                  myRequest.status === 'pending' ? '待审核' : myRequest.status === 'approved' ? '已通过' : '已拒绝'
                }</span>
              </div>
            )}
            {canEdit && (
              <button className="btn btn-primary" onClick={() => navigate(`/edit-ride/${ride.id}`)}>
                修改行程
              </button>
            )}
            {isDriver && ride.status === 'open' && pendingCount > 0 && (
              <button className="btn btn-warning" onClick={() => navigate('/ride-manage')}>
                查看申请 ({pendingCount})
              </button>
            )}
            {isDriver && ride.status === 'open' && (
              <button className="btn btn-success" onClick={async () => {
                try {
                  await api.completeRide(ride.id);
                  showToast('行程已完成', 'success');
                  loadDetail();
                } catch (err) {
                  showToast(err instanceof Error ? err.message : '操作失败', 'error');
                }
              }}>
                完成行程
              </button>
            )}
          </div>
        </div>

        {/* Passengers */}
        {passengers.length > 0 && (
          <div className="detail-card">
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
              已加入的乘客 ({passengers.length})
            </h3>
            <div className="passenger-list">
              {passengers.map(p => (
                <div key={p.id} className="passenger-item">
                  <div className="p-avatar">{p.nickname[0]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{p.nickname}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>
                      ★ {p.rating.toFixed(1)} · 上车点: {p.pickup_point} · {p.seats_needed}人
                    </div>
                  </div>
                  {isCompleted && isDriver && !hasReviewed(p.rider_id) && (
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => openReviewModal(p.rider_id, p.nickname)}
                    >
                      评价
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Review prompt for riders */}
        {isCompleted && !isDriver && myRequest?.status === 'approved' && !hasReviewed(ride.driver_id) && (
          <div className="detail-card" style={{ textAlign: 'center' }}>
            <p style={{ marginBottom: 12, fontSize: 15 }}>行程已完成，来给司机打个分吧</p>
            <button
              className="btn btn-primary"
              onClick={() => openReviewModal(ride.driver_id, ride.driver_nickname || '司机')}
            >
              评价司机
            </button>
          </div>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <div className="detail-card">
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>评价记录</h3>
            {reviews.map((rv: Review) => (
              <div key={rv.id} className="review-item">
                <div className="review-header">
                  <span className="reviewer">{rv.reviewer_nickname}</span>
                  <span className="stars">{'★'.repeat(rv.rating)}{'☆'.repeat(5 - rv.rating)}</span>
                </div>
                {rv.comment && <div className="review-comment">{rv.comment}</div>}
                <div className="review-meta">{rv.created_at}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="modal-overlay" onClick={() => setShowApplyModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>申请加入拼车</h3>
            <div className="form-group">
              <label>上车点</label>
              <input
                type="text"
                value={pickupPoint}
                onChange={e => setPickupPoint(e.target.value)}
                placeholder="请输入您的上车点"
              />
            </div>
            <div className="form-group">
              <label>乘车人数</label>
              <select value={seatsNeeded} onChange={e => setSeatsNeeded(parseInt(e.target.value, 10))}>
                {Array.from({ length: ride.available_seats }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1} 人</option>
                ))}
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowApplyModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleApply}>确认申请</button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && reviewTarget && (
        <div className="modal-overlay" onClick={() => setShowReviewModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>评价 {reviewTarget.name}</h3>
            <div className="form-group">
              <label>评分</label>
              <div className="star-rating">
                {[1, 2, 3, 4, 5].map(n => (
                  <span
                    key={n}
                    className={`star ${n <= reviewRating ? 'filled' : ''}`}
                    onClick={() => setReviewRating(n)}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>评价内容（选填）</label>
              <textarea
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
                placeholder="分享您的乘车体验..."
                rows={3}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowReviewModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleReview}>提交评价</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
