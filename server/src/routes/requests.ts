import { Router, Response } from 'express';
import db from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

const paramValue = (value: string | string[] | undefined): string => Array.isArray(value) ? value[0] : value || '';

interface RideRow {
  id: number;
  driver_id: number;
  origin: string;
  destination: string;
  departure_time: string;
  available_seats: number;
  status: string;
}

// Apply for a ride
router.post('/', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { ride_id, pickup_point, seats_needed } = req.body;

    if (!ride_id || !pickup_point) {
      res.status(400).json({ error: '请选择上车点' });
      return;
    }

    const seats = seats_needed || 1;

    const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(ride_id) as RideRow | undefined;
    if (!ride) {
      res.status(404).json({ error: '行程不存在' });
      return;
    }

    if (ride.status !== 'open') {
      res.status(400).json({ error: '该行程不接受新申请' });
      return;
    }

    if (ride.driver_id === req.userId) {
      res.status(400).json({ error: '不能加入自己发布的行程' });
      return;
    }

    if (seats > ride.available_seats) {
      res.status(400).json({ error: '剩余座位不足' });
      return;
    }

    // Check if already applied
    const existing = db.prepare(
      'SELECT * FROM ride_requests WHERE ride_id = ? AND rider_id = ?'
    ).get(ride_id, req.userId);

    if (existing) {
      res.status(400).json({ error: '您已申请过该行程' });
      return;
    }

    const result = db.prepare(
      'INSERT INTO ride_requests (ride_id, rider_id, pickup_point, seats_needed) VALUES (?, ?, ?, ?)'
    ).run(ride_id, req.userId, pickup_point, seats);

    // Notify driver
    db.prepare(
      'INSERT INTO notifications (user_id, title, content) VALUES (?, ?, ?)'
    ).run(ride.driver_id, '新的拼车申请', `有人申请加入您的行程「${ride.origin} → ${ride.destination}」`);

    res.status(201).json({
      message: '申请已提交，等待司机确认',
      request: { id: Number(result.lastInsertRowid) },
    });
  } catch (err) {
    console.error('Apply ride error:', err);
    res.status(500).json({ error: '申请失败' });
  }
});

// Approve/reject a request (driver only)
router.put('/:id/status', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const requestId = parseInt(paramValue(req.params.id), 10);
    const { status } = req.body; // 'approved' or 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
      res.status(400).json({ error: '无效的状态' });
      return;
    }

    const request = db.prepare(`
      SELECT rr.*, r.driver_id, r.origin, r.destination, r.available_seats, r.total_seats
      FROM ride_requests rr
      JOIN rides r ON rr.ride_id = r.id
      WHERE rr.id = ?
    `).get(requestId) as {
      id: number;
      ride_id: number;
      rider_id: number;
      seats_needed: number;
      status: string;
      driver_id: number;
      origin: string;
      destination: string;
      available_seats: number;
      total_seats: number;
    } | undefined;

    if (!request) {
      res.status(404).json({ error: '申请不存在' });
      return;
    }

    if (request.driver_id !== req.userId) {
      res.status(403).json({ error: '无权操作' });
      return;
    }

    if (request.status !== 'pending') {
      res.status(400).json({ error: '该申请已处理' });
      return;
    }

    if (status === 'approved') {
      if (request.seats_needed > request.available_seats) {
        res.status(400).json({ error: '剩余座位不足' });
        return;
      }

      // Update request status and decrease available seats
      db.prepare("UPDATE ride_requests SET status = 'approved' WHERE id = ?").run(requestId);
      db.prepare('UPDATE rides SET available_seats = available_seats - ? WHERE id = ?').run(
        request.seats_needed,
        request.ride_id
      );

      // Check if ride is now full
      const updatedRide = db.prepare('SELECT available_seats FROM rides WHERE id = ?').get(request.ride_id) as { available_seats: number };
      if (updatedRide.available_seats <= 0) {
        db.prepare("UPDATE rides SET status = 'full' WHERE id = ?").run(request.ride_id);
        // Reject remaining pending requests
        const pendingRequests = db.prepare(
          "SELECT id, rider_id FROM ride_requests WHERE ride_id = ? AND status = 'pending' AND id != ?"
        ).all(request.ride_id, requestId) as { id: number; rider_id: number }[];

        db.prepare("UPDATE ride_requests SET status = 'rejected' WHERE ride_id = ? AND status = 'pending'").run(request.ride_id);

        for (const pr of pendingRequests) {
          db.prepare('INSERT INTO notifications (user_id, title, content) VALUES (?, ?, ?)').run(
            pr.rider_id,
            '申请被拒绝',
            `行程「${request.origin} → ${request.destination}」已满员，您的申请未通过`
          );
        }
      }

      // Notify rider
      db.prepare('INSERT INTO notifications (user_id, title, content) VALUES (?, ?, ?)').run(
        request.rider_id,
        '申请已通过',
        `您的拼车申请「${request.origin} → ${request.destination}」已通过`
      );
    } else {
      db.prepare("UPDATE ride_requests SET status = 'rejected' WHERE id = ?").run(requestId);

      // Notify rider
      db.prepare('INSERT INTO notifications (user_id, title, content) VALUES (?, ?, ?)').run(
        request.rider_id,
        '申请被拒绝',
        `您的拼车申请「${request.origin} → ${request.destination}」未通过`
      );
    }

    res.json({ message: status === 'approved' ? '已通过' : '已拒绝' });
  } catch (err) {
    console.error('Update request status error:', err);
    res.status(500).json({ error: '操作失败' });
  }
});

// Get requests for a ride (driver only)
router.get('/ride/:rideId', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const rideId = parseInt(paramValue(req.params.rideId), 10);

    const ride = db.prepare('SELECT driver_id FROM rides WHERE id = ?').get(rideId) as { driver_id: number } | undefined;
    if (!ride || ride.driver_id !== req.userId) {
      res.status(403).json({ error: '无权查看' });
      return;
    }

    const requests = db.prepare(`
      SELECT rr.*, u.nickname, u.avatar, u.rating, u.phone
      FROM ride_requests rr
      JOIN users u ON rr.rider_id = u.id
      WHERE rr.ride_id = ?
      ORDER BY rr.created_at DESC
    `).all(rideId);

    res.json({ requests });
  } catch (err) {
    console.error('Get requests error:', err);
    res.status(500).json({ error: '获取申请列表失败' });
  }
});

// Get my requests (as rider)
router.get('/my', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const requests = db.prepare(`
      SELECT rr.*, r.origin, r.destination, r.departure_time, r.status as ride_status,
             u.nickname as driver_nickname, u.avatar as driver_avatar, r.driver_id
      FROM ride_requests rr
      JOIN rides r ON rr.ride_id = r.id
      JOIN users u ON r.driver_id = u.id
      WHERE rr.rider_id = ?
      ORDER BY r.departure_time DESC
    `).all(req.userId);

    res.json({ requests });
  } catch (err) {
    console.error('Get my requests error:', err);
    res.status(500).json({ error: '获取我的行程失败' });
  }
});

export default router;
