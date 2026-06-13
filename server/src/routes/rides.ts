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
  car_model: string;
  total_seats: number;
  available_seats: number;
  price_per_person: number;
  description: string;
  status: string;
  created_at: string;
  driver_nickname?: string;
  driver_avatar?: string;
  driver_rating?: number;
}

// Create a ride
router.post('/', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { origin, destination, departure_time, car_model, total_seats, price_per_person, description } = req.body;

    if (!origin || !destination || !departure_time || !car_model || !total_seats || price_per_person === undefined) {
      res.status(400).json({ error: '请填写完整的行程信息' });
      return;
    }

    if (total_seats < 1 || total_seats > 8) {
      res.status(400).json({ error: '可载人数范围1-8' });
      return;
    }

    if (price_per_person < 0) {
      res.status(400).json({ error: '费用不能为负数' });
      return;
    }

    const result = db.prepare(
      'INSERT INTO rides (driver_id, origin, destination, departure_time, car_model, total_seats, available_seats, price_per_person, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(req.userId, origin, destination, departure_time, car_model, total_seats, total_seats, price_per_person, description || '');

    res.status(201).json({
      message: '行程发布成功',
      ride: { id: Number(result.lastInsertRowid) },
    });
  } catch (err) {
    console.error('Create ride error:', err);
    res.status(500).json({ error: '发布失败' });
  }
});

// List rides with search/filter
router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const { origin, destination, date, status, driver_id, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    let sql = `
      SELECT r.*, u.nickname as driver_nickname, u.avatar as driver_avatar, u.rating as driver_rating
      FROM rides r
      JOIN users u ON r.driver_id = u.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (origin) {
      sql += ' AND r.origin LIKE ?';
      params.push(`%${origin}%`);
    }

    if (destination) {
      sql += ' AND r.destination LIKE ?';
      params.push(`%${destination}%`);
    }

    if (date) {
      sql += ' AND r.departure_time LIKE ?';
      params.push(`${date}%`);
    }

    if (status) {
      sql += ' AND r.status = ?';
      params.push(status as string);
    }

    if (driver_id) {
      sql += ' AND r.driver_id = ?';
      params.push(parseInt(driver_id as string, 10));
    }

    // Count total
    const countSql = sql.replace(
      'SELECT r.*, u.nickname as driver_nickname, u.avatar as driver_avatar, u.rating as driver_rating',
      'SELECT COUNT(*) as total'
    );
    const countResult = db.prepare(countSql).get(...params) as { total: number };

    sql += ' ORDER BY r.departure_time ASC';
    sql += ' LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const rides = db.prepare(sql).all(...params) as RideRow[];

    res.json({
      rides,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limitNum),
      },
    });
  } catch (err) {
    console.error('List rides error:', err);
    res.status(500).json({ error: '获取行程列表失败' });
  }
});

// Get ride detail
router.get('/:id', (req: AuthRequest, res: Response) => {
  try {
    const rideId = parseInt(paramValue(req.params.id), 10);

    const ride = db.prepare(`
      SELECT r.*, u.nickname as driver_nickname, u.avatar as driver_avatar,
             u.rating as driver_rating, u.rating_count as driver_rating_count, u.phone as driver_phone
      FROM rides r
      JOIN users u ON r.driver_id = u.id
      WHERE r.id = ?
    `).get(rideId) as (RideRow & { driver_rating_count: number; driver_phone: string }) | undefined;

    if (!ride) {
      res.status(404).json({ error: '行程不存在' });
      return;
    }

    // Get approved passengers
    const passengers = db.prepare(`
      SELECT rr.id, rr.rider_id, rr.pickup_point, rr.seats_needed, rr.status,
             u.nickname, u.avatar, u.rating
      FROM ride_requests rr
      JOIN users u ON rr.rider_id = u.id
      WHERE rr.ride_id = ? AND rr.status = 'approved'
    `).all(rideId);

    // Get pending requests count
    const pendingCount = db.prepare(`
      SELECT COUNT(*) as count FROM ride_requests WHERE ride_id = ? AND status = 'pending'
    `).get(rideId) as { count: number };

    // Check if current user has a request for this ride
    let myRequest = null;
    if (req.userId) {
      myRequest = db.prepare(
        'SELECT * FROM ride_requests WHERE ride_id = ? AND rider_id = ?'
      ).get(rideId, req.userId);
    }

    // Check reviews for this ride
    const reviews = db.prepare(`
      SELECT rv.*, u.nickname as reviewer_nickname, u.avatar as reviewer_avatar
      FROM reviews rv
      JOIN users u ON rv.reviewer_id = u.id
      WHERE rv.ride_id = ?
      ORDER BY rv.created_at DESC
    `).all(rideId);

    res.json({
      ride,
      passengers,
      pendingCount: pendingCount.count,
      myRequest,
      reviews,
    });
  } catch (err) {
    console.error('Get ride detail error:', err);
    res.status(500).json({ error: '获取行程详情失败' });
  }
});

// Cancel a ride (driver only)
router.put('/:id/cancel', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const rideId = parseInt(paramValue(req.params.id), 10);

    const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(rideId) as RideRow | undefined;
    if (!ride) {
      res.status(404).json({ error: '行程不存在' });
      return;
    }

    if (ride.driver_id !== req.userId) {
      res.status(403).json({ error: '只有行程发布者才能取消' });
      return;
    }

    if (ride.status === 'completed') {
      res.status(400).json({ error: '已完成的行程不能取消' });
      return;
    }

    db.prepare('UPDATE rides SET status = ? WHERE id = ?').run('cancelled', rideId);

    // Notify all approved riders
    const approvedRiders = db.prepare(
      "SELECT rider_id FROM ride_requests WHERE ride_id = ? AND status = 'approved'"
    ).all(rideId) as { rider_id: number }[];

    const insertNotif = db.prepare(
      'INSERT INTO notifications (user_id, title, content) VALUES (?, ?, ?)'
    );

    for (const r of approvedRiders) {
      insertNotif.run(
        r.rider_id,
        '行程已取消',
        `您加入的行程「${ride.origin} → ${ride.destination}」已被司机取消`
      );
    }

    res.json({ message: '行程已取消' });
  } catch (err) {
    console.error('Cancel ride error:', err);
    res.status(500).json({ error: '取消失败' });
  }
});

// Complete a ride (driver only)
router.put('/:id/complete', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const rideId = parseInt(paramValue(req.params.id), 10);

    const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(rideId) as RideRow | undefined;
    if (!ride) {
      res.status(404).json({ error: '行程不存在' });
      return;
    }

    if (ride.driver_id !== req.userId) {
      res.status(403).json({ error: '只有行程发布者才能完成' });
      return;
    }

    if (ride.status !== 'open') {
      res.status(400).json({ error: '只有进行中的行程才能完成' });
      return;
    }

    db.prepare('UPDATE rides SET status = ? WHERE id = ?').run('completed', rideId);

    // Notify riders
    const approvedRiders = db.prepare(
      "SELECT rider_id FROM ride_requests WHERE ride_id = ? AND status = 'approved'"
    ).all(rideId) as { rider_id: number }[];

    const insertNotif = db.prepare(
      'INSERT INTO notifications (user_id, title, content) VALUES (?, ?, ?)'
    );

    for (const r of approvedRiders) {
      insertNotif.run(
        r.rider_id,
        '行程已完成',
        `行程「${ride.origin} → ${ride.destination}」已完成，快来给司机评分吧`
      );
    }

    res.json({ message: '行程已完成' });
  } catch (err) {
    console.error('Complete ride error:', err);
    res.status(500).json({ error: '操作失败' });
  }
});

export default router;
