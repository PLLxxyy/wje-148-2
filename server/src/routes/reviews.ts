import { Router, Response } from 'express';
import db from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

const paramValue = (value: string | string[] | undefined): string => Array.isArray(value) ? value[0] : value || '';

// Create a review
router.post('/', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { ride_id, reviewee_id, rating, comment } = req.body;

    if (!ride_id || !reviewee_id || !rating) {
      res.status(400).json({ error: '请填写完整的评价信息' });
      return;
    }

    if (rating < 1 || rating > 5) {
      res.status(400).json({ error: '评分范围1-5' });
      return;
    }

    // Check ride exists and is completed
    const ride = db.prepare("SELECT * FROM rides WHERE id = ? AND status = 'completed'").get(ride_id) as { id: number; driver_id: number } | undefined;
    if (!ride) {
      res.status(400).json({ error: '只能评价已完成的行程' });
      return;
    }

    // Check user is either the driver or an approved rider
    const isDriver = ride.driver_id === req.userId;
    let isApprovedRider = false;

    if (!isDriver) {
      const request = db.prepare(
        "SELECT * FROM ride_requests WHERE ride_id = ? AND rider_id = ? AND status = 'approved'"
      ).get(ride_id, req.userId);
      isApprovedRider = !!request;
    }

    if (!isDriver && !isApprovedRider) {
      res.status(403).json({ error: '只有行程参与者才能评价' });
      return;
    }

    // Check if already reviewed
    const existing = db.prepare(
      'SELECT id FROM reviews WHERE ride_id = ? AND reviewer_id = ? AND reviewee_id = ?'
    ).get(ride_id, req.userId, reviewee_id);

    if (existing) {
      res.status(400).json({ error: '您已评价过该用户' });
      return;
    }

    db.prepare(
      'INSERT INTO reviews (ride_id, reviewer_id, reviewee_id, rating, comment) VALUES (?, ?, ?, ?, ?)'
    ).run(ride_id, req.userId, reviewee_id, rating, comment || '');

    // Update user rating
    const userReviews = db.prepare(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM reviews WHERE reviewee_id = ?'
    ).get(reviewee_id) as { avg_rating: number; count: number };

    db.prepare('UPDATE users SET rating = ?, rating_count = ? WHERE id = ?').run(
      Math.round(userReviews.avg_rating * 10) / 10,
      userReviews.count,
      reviewee_id
    );

    res.status(201).json({ message: '评价成功' });
  } catch (err) {
    console.error('Create review error:', err);
    res.status(500).json({ error: '评价失败' });
  }
});

// Get reviews for a user
router.get('/user/:userId', (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(paramValue(req.params.userId), 10);

    const reviews = db.prepare(`
      SELECT rv.*, u.nickname as reviewer_nickname, u.avatar as reviewer_avatar,
             r.origin, r.destination, r.departure_time
      FROM reviews rv
      JOIN users u ON rv.reviewer_id = u.id
      JOIN rides r ON rv.ride_id = r.id
      WHERE rv.reviewee_id = ?
      ORDER BY rv.created_at DESC
    `).all(userId);

    res.json({ reviews });
  } catch (err) {
    console.error('Get reviews error:', err);
    res.status(500).json({ error: '获取评价失败' });
  }
});

// Get reviews for a ride
router.get('/ride/:rideId', (req: AuthRequest, res: Response) => {
  try {
    const rideId = parseInt(paramValue(req.params.rideId), 10);

    const reviews = db.prepare(`
      SELECT rv.*, u.nickname as reviewer_nickname, u.avatar as reviewer_avatar
      FROM reviews rv
      JOIN users u ON rv.reviewer_id = u.id
      WHERE rv.ride_id = ?
      ORDER BY rv.created_at DESC
    `).all(rideId);

    res.json({ reviews });
  } catch (err) {
    console.error('Get ride reviews error:', err);
    res.status(500).json({ error: '获取评价失败' });
  }
});

export default router;
