import Database, { type Database as SqliteDatabase } from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';

const dbPath = path.join(__dirname, '..', 'data', 'carpooling.db');

// Ensure data directory exists
import fs from 'fs';
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db: SqliteDatabase = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nickname TEXT NOT NULL,
      phone TEXT DEFAULT '',
      avatar TEXT DEFAULT '',
      role TEXT DEFAULT 'rider',
      rating REAL DEFAULT 5.0,
      rating_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS rides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      driver_id INTEGER NOT NULL,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      departure_time TEXT NOT NULL,
      car_model TEXT NOT NULL,
      total_seats INTEGER NOT NULL,
      available_seats INTEGER NOT NULL,
      price_per_person REAL NOT NULL,
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'open',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (driver_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS ride_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ride_id INTEGER NOT NULL,
      rider_id INTEGER NOT NULL,
      pickup_point TEXT NOT NULL,
      seats_needed INTEGER NOT NULL DEFAULT 1,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (ride_id) REFERENCES rides(id),
      FOREIGN KEY (rider_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ride_id INTEGER NOT NULL,
      reviewer_id INTEGER NOT NULL,
      reviewee_id INTEGER NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (ride_id) REFERENCES rides(id),
      FOREIGN KEY (reviewer_id) REFERENCES users(id),
      FOREIGN KEY (reviewee_id) REFERENCES users(id),
      UNIQUE(ride_id, reviewer_id, reviewee_id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Seed test accounts if they don't exist
  const existingDriver = db.prepare('SELECT id FROM users WHERE username = ?').get('driver');
  const existingRider = db.prepare('SELECT id FROM users WHERE username = ?').get('rider');

  if (!existingDriver) {
    const hash = bcrypt.hashSync('123456', 10);
    db.prepare(
      'INSERT INTO users (username, password, nickname, phone, role) VALUES (?, ?, ?, ?, ?)'
    ).run('driver', hash, '司机老王', '13800000001', 'driver');
  }

  if (!existingRider) {
    const hash = bcrypt.hashSync('123456', 10);
    db.prepare(
      'INSERT INTO users (username, password, nickname, phone, role) VALUES (?, ?, ?, ?, ?)'
    ).run('rider', hash, '乘客小李', '13800000002', 'rider');
  }

  // Seed some sample rides
  const rideCount = db.prepare('SELECT COUNT(*) as count FROM rides').get() as { count: number };
  if (rideCount.count === 0) {
    const driverUser = db.prepare('SELECT id FROM users WHERE username = ?').get('driver') as { id: number };
    const riderUser = db.prepare('SELECT id FROM users WHERE username = ?').get('rider') as { id: number };

    const sampleRides = [
      {
        origin: '北京西站',
        destination: '天津站',
        time: '2026-06-15 08:00',
        car: '大众帕萨特',
        seats: 3,
        price: 50,
        desc: '早班顺风车，准时出发，走高速',
      },
      {
        origin: '上海虹桥',
        destination: '苏州园区',
        time: '2026-06-15 14:00',
        car: '丰田凯美瑞',
        seats: 2,
        price: 40,
        desc: '下午出发，可顺路带行李',
      },
      {
        origin: '广州天河',
        destination: '深圳南山',
        time: '2026-06-16 09:30',
        car: '比亚迪汉',
        seats: 4,
        price: 60,
        desc: '新能源车，舒适安静，空调开放',
      },
      {
        origin: '杭州西湖区',
        destination: '宁波市中心',
        time: '2026-06-16 10:00',
        car: '本田雅阁',
        seats: 3,
        price: 45,
        desc: '周末出游拼车，路上轻松聊天',
      },
      {
        origin: '成都天府广场',
        destination: '重庆解放碑',
        time: '2026-06-17 07:00',
        car: '特斯拉 Model 3',
        seats: 2,
        price: 80,
        desc: '电动车自驾，充电途中可能停靠一次',
      },
    ];

    const insertRide = db.prepare(
      'INSERT INTO rides (driver_id, origin, destination, departure_time, car_model, total_seats, available_seats, price_per_person, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );

    for (const r of sampleRides) {
      insertRide.run(driverUser.id, r.origin, r.destination, r.time, r.car, r.seats, r.seats, r.price, r.desc);
    }
  }

  console.log('Database initialized successfully');
}

export default db;
