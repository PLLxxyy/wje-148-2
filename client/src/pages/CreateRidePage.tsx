import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { api } from '../api';

export default function CreateRidePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [carModel, setCarModel] = useState('');
  const [totalSeats, setTotalSeats] = useState(3);
  const [pricePerPerson, setPricePerPerson] = useState(50);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  if (user?.role !== 'driver') {
    return (
      <div className="main-content">
        <div className="empty-state">
          <div className="icon">🚫</div>
          <p>只有司机才能发布行程</p>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!origin || !destination || !departureTime || !carModel) {
      showToast('请填写完整的行程信息', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await api.createRide({
        origin,
        destination,
        departure_time: departureTime,
        car_model: carModel,
        total_seats: totalSeats,
        price_per_person: pricePerPerson,
        description,
      });
      showToast('行程发布成功', 'success');
      navigate(`/ride/${res.ride.id}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '发布失败', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="main-content">
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <h2 className="page-title">发布新行程</h2>
        <div className="detail-card">
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>出发地</label>
                <input
                  type="text"
                  value={origin}
                  onChange={e => setOrigin(e.target.value)}
                  placeholder="如：北京西站"
                  required
                />
              </div>
              <div className="form-group">
                <label>目的地</label>
                <input
                  type="text"
                  value={destination}
                  onChange={e => setDestination(e.target.value)}
                  placeholder="如：天津站"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>出发时间</label>
              <input
                type="datetime-local"
                value={departureTime}
                onChange={e => setDepartureTime(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>车型</label>
              <input
                type="text"
                value={carModel}
                onChange={e => setCarModel(e.target.value)}
                placeholder="如：大众帕萨特"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>可载人数</label>
                <input
                  type="number"
                  value={totalSeats}
                  onChange={e => setTotalSeats(parseInt(e.target.value, 10))}
                  min={1}
                  max={8}
                  required
                />
              </div>
              <div className="form-group">
                <label>每人费用（元）</label>
                <input
                  type="number"
                  value={pricePerPerson}
                  onChange={e => setPricePerPerson(parseFloat(e.target.value))}
                  min={0}
                  step={1}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>行程描述（选填）</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="补充说明，如路线偏好、是否走高速、行李要求等"
                rows={3}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? '发布中...' : '发布行程'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
                取消
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
