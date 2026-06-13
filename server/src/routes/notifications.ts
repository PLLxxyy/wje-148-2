import { Router, Response } from 'express';
import db from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

const paramValue = (value: string | string[] | undefined): string => Array.isArray(value) ? value[0] : value || '';

interface NotifRow {
  id: number;
  user_id: number;
  title: string;
  content: string;
  is_read: number;
  created_at: string;
}

// Get notifications
router.get('/', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const notifications = db.prepare(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
    ).all(req.userId) as NotifRow[];

    const unreadCount = db.prepare(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0'
    ).get(req.userId) as { count: number };

    res.json({ notifications, unreadCount: unreadCount.count });
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ error: '获取通知失败' });
  }
});

// Mark as read
router.put('/:id/read', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(
      parseInt(paramValue(req.params.id), 10),
      req.userId
    );
    res.json({ message: '已标记为已读' });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ error: '操作失败' });
  }
});

// Mark all as read
router.put('/read-all', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.userId);
    res.json({ message: '全部已读' });
  } catch (err) {
    console.error('Mark all read error:', err);
    res.status(500).json({ error: '操作失败' });
  }
});

export default router;
