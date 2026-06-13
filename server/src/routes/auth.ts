import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db';
import { generateToken } from '../middleware/auth';

const router = Router();

interface UserRow {
  id: number;
  username: string;
  password: string;
  nickname: string;
  phone: string;
  avatar: string;
  role: string;
  rating: number;
  rating_count: number;
  created_at: string;
}

// Register
router.post('/register', (req: Request, res: Response) => {
  try {
    const { username, password, nickname, phone, role } = req.body;

    if (!username || !password || !nickname) {
      res.status(400).json({ error: '用户名、密码和昵称不能为空' });
      return;
    }

    if (username.length < 3 || username.length > 20) {
      res.status(400).json({ error: '用户名长度需在3-20个字符之间' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: '密码长度不能少于6位' });
      return;
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      res.status(400).json({ error: '用户名已存在' });
      return;
    }

    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare(
      'INSERT INTO users (username, password, nickname, phone, role) VALUES (?, ?, ?, ?, ?)'
    ).run(username, hash, nickname, phone || '', role || 'rider');

    const token = generateToken(Number(result.lastInsertRowid), role || 'rider');

    res.status(201).json({
      message: '注册成功',
      token,
      user: {
        id: Number(result.lastInsertRowid),
        username,
        nickname,
        phone: phone || '',
        role: role || 'rider',
        rating: 5.0,
        rating_count: 0,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// Login
router.post('/login', (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: '用户名和密码不能为空' });
      return;
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as UserRow | undefined;
    if (!user) {
      res.status(401).json({ error: '用户名或密码错误' });
      return;
    }

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      res.status(401).json({ error: '用户名或密码错误' });
      return;
    }

    const token = generateToken(user.id, user.role);

    res.json({
      message: '登录成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        phone: user.phone,
        role: user.role,
        rating: user.rating,
        rating_count: user.rating_count,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// Get current user info
router.get('/me', (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: '未登录' });
      return;
    }

    const jwt = require('jsonwebtoken');
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, 'carpooling-platform-secret-key-2026') as { userId: number };

    const user = db.prepare('SELECT id, username, nickname, phone, role, rating, rating_count, avatar, created_at FROM users WHERE id = ?').get(decoded.userId) as Omit<UserRow, 'password'> | undefined;

    if (!user) {
      res.status(404).json({ error: '用户不存在' });
      return;
    }

    res.json({ user });
  } catch {
    res.status(401).json({ error: '登录已过期' });
  }
});

// Update profile
router.put('/profile', (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) { res.status(401).json({ error: '未登录' }); return; }

    const jwt = require('jsonwebtoken');
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, 'carpooling-platform-secret-key-2026') as { userId: number };

    const { nickname, phone } = req.body;
    db.prepare('UPDATE users SET nickname = ?, phone = ? WHERE id = ?').run(
      nickname, phone, decoded.userId
    );

    const user = db.prepare('SELECT id, username, nickname, phone, role, rating, rating_count, avatar FROM users WHERE id = ?').get(decoded.userId);
    res.json({ message: '更新成功', user });
  } catch {
    res.status(500).json({ error: '更新失败' });
  }
});

export default router;
