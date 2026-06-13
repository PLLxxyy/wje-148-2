import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CreateRidePage from '../pages/CreateRidePage';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../components/Toast';
import type { User, RideDetailResponse } from '../types';

vi.mock('../api', () => ({
  api: {
    getRideDetail: vi.fn(),
    updateRide: vi.fn(),
    createRide: vi.fn(),
  },
}));

import { api } from '../api';

const mockDriver: User = {
  id: 1,
  username: 'driver',
  nickname: '司机老王',
  phone: '13800000001',
  avatar: '',
  role: 'driver',
  rating: 5.0,
  rating_count: 0,
};

const mockOtherDriver: User = {
  id: 2,
  username: 'other',
  nickname: '其他司机',
  phone: '13800000002',
  avatar: '',
  role: 'driver',
  rating: 5.0,
  rating_count: 0,
};

function makeRideDetail(overrides: Partial<RideDetailResponse['ride']> = {}): RideDetailResponse {
  return {
    ride: {
      id: 10,
      driver_id: 1,
      origin: '北京西站',
      destination: '天津站',
      departure_time: '2026-06-15 08:00',
      car_model: '大众帕萨特',
      total_seats: 3,
      available_seats: 3,
      price_per_person: 50,
      description: '',
      status: 'open',
      created_at: '2026-06-14 10:00',
      driver_nickname: '司机老王',
      ...overrides,
    },
    passengers: [],
    pendingCount: 0,
    myRequest: null,
    reviews: [],
  };
}

const showToast = vi.fn();

function renderEditPage(user: User, rideId: string) {
  return render(
    <AuthContext.Provider value={{ user, token: 'test-token', loading: false, login: vi.fn(), logout: vi.fn(), refreshUser: vi.fn() }}>
      <ToastContext.Provider value={{ showToast }}>
        <MemoryRouter initialEntries={[`/edit-ride/${rideId}`]}>
          <Routes>
            <Route path="/edit-ride/:rideId" element={<CreateRidePage />} />
            <Route path="/ride/:id" element={<div data-testid="ride-detail">Ride Detail Page</div>} />
          </Routes>
        </MemoryRouter>
      </ToastContext.Provider>
    </AuthContext.Provider>
  );
}

describe('CreateRidePage edit mode validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects when ride does not belong to current user', async () => {
    vi.mocked(api.getRideDetail).mockResolvedValue(makeRideDetail({ driver_id: 99 }));
    renderEditPage(mockOtherDriver, '10');

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('只能修改自己发布的行程', 'error');
    });
  });

  it('redirects when ride status is not open', async () => {
    vi.mocked(api.getRideDetail).mockResolvedValue(makeRideDetail({ status: 'completed' }));
    renderEditPage(mockDriver, '10');

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('只能修改可预订状态的行程', 'error');
    });
  });

  it('redirects when ride already has passengers', async () => {
    const res = makeRideDetail();
    res.passengers = [
      { id: 1, rider_id: 2, pickup_point: '某地', seats_needed: 1, status: 'approved', nickname: '乘客', avatar: '', rating: 5.0 },
    ];
    vi.mocked(api.getRideDetail).mockResolvedValue(res);
    renderEditPage(mockDriver, '10');

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('已有乘客加入，无法修改行程信息', 'error');
    });
  });

  it('renders edit form when all conditions are met', async () => {
    vi.mocked(api.getRideDetail).mockResolvedValue(makeRideDetail());
    const result = renderEditPage(mockDriver, '10');

    await waitFor(() => {
      expect(result.container.querySelector('.page-title')?.textContent).toBe('修改行程');
    });
  });

  it('navigates to ride detail page when validation fails', async () => {
    vi.mocked(api.getRideDetail).mockResolvedValue(makeRideDetail({ status: 'cancelled' }));
    const result = renderEditPage(mockDriver, '10');

    await waitFor(() => {
      expect(result.getByTestId('ride-detail')).toBeInTheDocument();
    });
  });
});
