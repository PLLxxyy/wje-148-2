import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { Ride } from '../types';

export default function HomePage() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const navigate = useNavigate();

  const loadRides = useCallback(async (filters?: Record<string, string>) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { status: 'open', ...filters };
      // Remove empty params
      Object.keys(params).forEach(k => { if (!params[k]) delete params[k]; });
      const res = await api.getRides(params);
      setRides(res.rides);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRides();
  }, [loadRides]);

  function handleSearch() {
    loadRides({ origin, destination, date });
  }

  function handleReset() {
    setOrigin('');
    setDestination('');
    setDate('');
    loadRides();
  }

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSearch();
  }

  function formatTime(time: string) {
    const d = new Date(time);
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${month}-${day} ${hours}:${minutes}`;
  }

  return (
    <div className="main-content">
      {/* Search bar */}
      <div className="search-bar">
        <div className="search-row">
          <div className="form-group">
            <label>出发地</label>
            <input
              type="text"
              value={origin}
              onChange={e => setOrigin(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入出发地"
            />
          </div>
          <div className="form-group">
            <label>目的地</label>
            <input
              type="text"
              value={destination}
              onChange={e => setDestination(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入目的地"
            />
          </div>
          <div className="form-group">
            <label>出发日期</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
          <div className="search-actions">
            <button className="btn btn-primary" onClick={handleSearch}>搜索</button>
            <button className="btn btn-secondary" onClick={handleReset}>重置</button>
          </div>
        </div>
      </div>

      {/* Ride list */}
      <h2 className="page-title">可用行程</h2>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : rides.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🚗</div>
          <p>暂无可用行程</p>
          <p style={{ marginTop: 8, fontSize: 13 }}>试试调整搜索条件，或稍后再来看看</p>
        </div>
      ) : (
        <div className="ride-grid">
          {rides.map(ride => (
            <div
              key={ride.id}
              className="ride-card"
              onClick={() => navigate(`/ride/${ride.id}`)}
            >
              <div className="ride-card-header">
                <div className="ride-card-avatar">
                  {ride.driver_nickname?.[0] || '司'}
                </div>
                <div className="ride-card-driver">
                  <div className="name">{ride.driver_nickname}</div>
                  <div className="rating">★ {ride.driver_rating?.toFixed(1) || '5.0'}</div>
                </div>
                <div className="ride-card-price">
                  ¥{ride.price_per_person}
                  <small>/人</small>
                </div>
              </div>

              <div className="ride-card-route">
                <div className="route-dots">
                  <div className="dot start"></div>
                  <div className="line"></div>
                  <div className="dot end"></div>
                </div>
                <div className="route-text">
                  <div className="place">{ride.origin}</div>
                  <div className="place">{ride.destination}</div>
                </div>
              </div>

              <div className="ride-card-info">
                <div className="info-item">
                  🕐 {formatTime(ride.departure_time)}
                </div>
                <div className="info-item">
                  🚙 {ride.car_model}
                </div>
                <div className="info-item seats">
                  余 {ride.available_seats} 座
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
