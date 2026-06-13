import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { api } from '../api';
import type { Ride } from '../types';

export default function CreateRidePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { rideId } = useParams<{ rideId?: string }>();
  const isEdit = !!rideId;

  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [carModel, setCarModel] = useState('');
  const [totalSeats, setTotalSeats] = useState(3);
  const [pricePerPerson, setPricePerPerson] = useState(50);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);

  useEffect(() => {
    if (isEdit && rideId) {
      loadRideData();
    }
  }, [isEdit, rideId]);

  async function loadRideData() {
    try {
      const res = await api.getRideDetail(parseInt(rideId!, 10));
      const ride: Ride = res.ride;
      setOrigin(ride.origin);
      setDestination(ride.destination);
      setDepartureTime(ride.departure_time.replace(' ', 'T').slice(0, 16));
      setCarModel(ride.car_model);
      setTotalSeats(ride.total_seats);
      setPricePerPerson(ride.price_per_person);
      setDescription(ride.description || '');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '加载行程信息失败', 'error');
      navigate(-1);
    } finally {
      setInitialLoading(false);
    }
  }

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

  if (initialLoading) return <div className="main-content"><div className="loading">加载中...</div></div>;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!origin || !destination || !departureTime || !carModel) {
      showToast('请填写完整的行程信息', 'error');
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        await api.updateRide(parseInt(rideId!, 10), {
          origin,
          destination,
          departure_time: departureTime.replace('T', ' '),
          car_model: carModel,
          total_seats: totalSeats,
          price_per_person: pricePerPerson,
          description,
        });
        showToast('行程更新成功', 'success');
        navigate(`/ride/${rideId}`);
      } else {
        const res = await api.createRide({
          origin,
          destination,
          departure_time: departureTime.replace('T', ' '),
          car_model: carModel,
          total_seats: totalSeats,
          price_per_person: pricePerPerson,
          description,
        });
        showToast('行程发布成功', 'success');
        navigate(`/ride/${res.ride.id}`);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : (isEdit ? '更新失败' : '发布失败'), 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="main-content">
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <h2 className="page-title">{isEdit ? '修改行程' : '发布新行程'}</h2>
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
                {loading ? (isEdit ? '更新中...' : '发布中...') : (isEdit ? '保存修改' : '发布行程')}
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
