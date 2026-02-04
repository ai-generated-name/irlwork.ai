// ============================================
// HUMANWORK.AI - Complete API Server v2
// All features: Payments, WebSocket, MCP, Video, etc.
// ============================================

const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const initSqlJs = require('sql.js');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// WebSocket clients
const wsClients = new Map();
wss.on('connection', (ws) => {
  const clientId = uuidv4();
  ws.clientId = clientId;
  wsClients.set(clientId, ws);
  
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      if (msg.type === 'auth') {
        ws.userId = msg.token;
      }
    } catch (e) {}
  });
  
  ws.on('close', () => {
    wsClients.delete(clientId);
  });
});

function broadcast(conversationId, message) {
  wsClients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'message', conversationId, ...message }));
    }
  });
}

// Database
let db;
const dbPath = path.join(__dirname, '../db/humanwork.db');

async function initDB() {
  const SQL = await initSqlJs();
  
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }
  
  // Create all tables
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, email TEXT UNIQUE, password_hash TEXT, name TEXT, type TEXT,
    api_key TEXT UNIQUE, avatar_url TEXT, bio TEXT, hourly_rate REAL,
    location_lat REAL, location_lng REAL, location_city TEXT, timezone TEXT,
    availability TEXT DEFAULT 'available', rating REAL DEFAULT 0,
    review_count INTEGER DEFAULT 0, jobs_completed INTEGER DEFAULT 0,
    verified INTEGER DEFAULT 0, stripe_account_id TEXT, stripe_customer_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS human_skills (
    id TEXT PRIMARY KEY, user_id TEXT, skill TEXT, category TEXT
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY, name TEXT UNIQUE, icon TEXT, description TEXT
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS task_templates (
    id TEXT PRIMARY KEY, category_id TEXT, name TEXT, description TEXT,
    estimated_hours REAL, base_price_range_min REAL, base_price_range_max REAL
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS ad_hoc_tasks (
    id TEXT PRIMARY KEY, user_id TEXT, category TEXT, title TEXT, description TEXT,
    location TEXT, urgency TEXT, budget_min REAL, budget_max REAL,
    status TEXT DEFAULT 'open', created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY, agent_id TEXT, human_id TEXT, subject TEXT,
    last_message TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY, conversation_id TEXT, sender_id TEXT, content TEXT,
    type TEXT DEFAULT 'text', metadata TEXT, read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY, conversation_id TEXT, agent_id TEXT, human_id TEXT, title TEXT,
    description TEXT, location TEXT, scheduled_at TEXT, duration_hours REAL,
    hourly_rate REAL, total_amount REAL, status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY, booking_id TEXT, agent_id TEXT, human_id TEXT, amount REAL,
    status TEXT DEFAULT 'pending', stripe_payment_id TEXT, stripe_transfer_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY, booking_id TEXT, reviewer_id TEXT, reviewee_id TEXT,
    rating INTEGER, comment TEXT, type TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS verifications (
    id TEXT PRIMARY KEY, booking_id TEXT, human_id TEXT, type TEXT, status TEXT DEFAULT 'pending',
    proof_data TEXT, verified_at TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY, user_id TEXT, type TEXT, title TEXT, message TEXT,
    read INTEGER DEFAULT 0, link TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS availability_slots (
    id TEXT PRIMARY KEY, user_id TEXT, day_of_week INTEGER,
    start_time TEXT, end_time TEXT, recurring INTEGER DEFAULT 1
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS human_portfolio (
    id TEXT PRIMARY KEY, user_id TEXT, title TEXT, description TEXT, image_url TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS human_certifications (
    id TEXT PRIMARY KEY, user_id TEXT, name TEXT, issuer TEXT, expires_at TEXT, verified INTEGER DEFAULT 0
  )`);
  
  // Seed categories
  const categories = [
    { id: 'plumbing', name: 'Plumbing', icon: '🔧' },
    { id: 'electrical', name: 'Electrical', icon: '⚡' },
    { id: 'cleaning', name: 'Cleaning', icon: '🧹' },
    { id: 'moving', name: 'Moving', icon: '📦' },
    { id: 'delivery', name: 'Delivery', icon: '📨' },
    { id: 'pickup', name: 'Pickup', icon: '🚗' },
    { id: 'errands', name: 'Errands', icon: '🏃' },
    { id: 'assembly', name: 'Assembly', icon: '🪑' },
    { id: 'photography', name: 'Photography', icon: '📸' },
    { id: 'handyman', name: 'Handyman', icon: '🔨' },
    { id: 'hvac', name: 'HVAC', icon: '❄️' },
    { id: 'pet', name: 'Pet Care', icon: '🐕' },
    { id: 'other', name: 'Other', icon: '✨' }
  ];
  
  categories.forEach(c => {
    try {
      db.run('INSERT OR IGNORE INTO categories VALUES (?, ?, ?, ?)', [c.id, c.name, c.icon, '']);
    } catch (e) {}
  });
  
  saveDB();
  console.log('✅ Database v2 initialized');
}

function saveDB() {
  try {
    fs.writeFileSync(dbPath, Buffer.from(db.export()));
  } catch (e) {}
}

function queryOne(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function run(sql, params = []) {
  db.run(sql, params);
  saveDB();
}

function getUserByToken(token) {
  if (!token) return null;
  return queryOne('SELECT * FROM users WHERE id = ?', [token]) || 
         queryOne('SELECT * FROM users WHERE api_key = ?', [token]);
}

// ============ AD HOC TASKS ============
app.get('/api/ad-hoc', (req, res) => {
  const { category, status, my_tasks } = req.query;
  const auth = req.headers.authorization;
  const user = getUserByToken(auth);
  
  let sql = 'SELECT * FROM ad_hoc_tasks WHERE 1=1';
  const params = [];
  
  if (category) { sql += ' AND category = ?'; params.push(category); }
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (my_tasks && user) { sql += ' AND user_id = ?'; params.push(user.id); }
  
  sql += ' ORDER BY created_at DESC LIMIT 50';
  
  res.json(queryAll(sql, params));
});

app.post('/api/ad-hoc', (req, res) => {
  const auth = req.headers.authorization;
  const user = getUserByToken(auth);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { category, title, description, location, urgency, budget_min, budget_max } = req.body;
  const id = uuidv4();
  
  run(
    'INSERT INTO ad_hoc_tasks VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, user.id, category, title, description, location, urgency || 'normal', budget_min, budget_max, 'open']
  );
  
  res.json({ id, status: 'open' });
});

// ============ TASK TEMPLATES ============
app.get('/api/task-templates', (req, res) => {
  const { category } = req.query;
  let sql = 'SELECT * FROM task_templates';
  const params = [];
  if (category) { sql += ' WHERE category_id = ?'; params.push(category); }
  res.json(queryAll(sql, params));
});

// ============ NOTIFICATIONS ============
app.get('/api/notifications', (req, res) => {
  const auth = req.headers.authorization;
  const user = getUserByToken(auth);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  res.json(queryAll('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', [user.id]));
});

app.patch('/api/notifications/:id/read', (req, res) => {
  const auth = req.headers.authorization;
  const user = getUserByToken(auth);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  run('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?', [req.params.id, user.id]);
  res.json({ success: true });
});

// ============ VIDEO VERIFICATION ============
app.post('/api/verification/video', (req, res) => {
  const auth = req.headers.authorization;
  const user = getUserByToken(auth);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { booking_id, type } = req.body;
  const id = uuidv4();
  run('INSERT INTO verifications VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, booking_id, user.id, type, 'pending', null, null]);
  res.json({ id, status: 'pending' });
});

app.patch('/api/verification/:id', (req, res) => {
  const { status, proof_data } = req.body;
  run('UPDATE verifications SET status = ?, proof_data = ?, verified_at = CURRENT_TIMESTAMP WHERE id = ?',
    [status, JSON.stringify(proof_data), req.params.id]);
  res.json({ success: true });
});

app.get('/api/verifications/:booking_id', (req, res) => {
  res.json(queryAll('SELECT * FROM verifications WHERE booking_id = ? ORDER BY created_at DESC', [req.params.booking_id]));
});

// ============ ENHANCED PROFILES ============
app.patch('/api/humans/:id/portfolio', (req, res) => {
  const auth = req.headers.authorization;
  const user = getUserByToken(auth);
  if (!user || user.id !== req.params.id) return res.status(401).json({ error: 'Unauthorized' });
  
  const { title, description, image_url } = req.body;
  const id = uuidv4();
  run('INSERT INTO human_portfolio VALUES (?, ?, ?, ?, ?, ?)', [id, req.params.id, title, description, image_url, null]);
  res.json({ id });
});

app.get('/api/humans/:id/portfolio', (req, res) => {
  res.json(queryAll('SELECT * FROM human_portfolio WHERE user_id = ? ORDER BY created_at DESC', [req.params.id]));
});

app.patch('/api/humans/:id/certifications', (req, res) => {
  const auth = req.headers.authorization;
  const user = getUserByToken(auth);
  if (!user || user.id !== req.params.id) return res.status(401).json({ error: 'Unauthorized' });
  
  const { name, issuer, expires_at } = req.body;
  const id = uuidv4();
  run('INSERT INTO human_certifications VALUES (?, ?, ?, ?, ?, 0)', [id, req.params.id, name, issuer, expires_at]);
  res.json({ id });
});

app.get('/api/humans/:id/certifications', (req, res) => {
  res.json(queryAll('SELECT * FROM human_certifications WHERE user_id = ?', [req.params.id]));
});

app.patch('/api/humans/:id/availability', (req, res) => {
  const auth = req.headers.authorization;
  const user = getUserByToken(auth);
  if (!user || user.id !== req.params.id) return res.status(401).json({ error: 'Unauthorized' });
  
  const { day_of_week, start_time, end_time } = req.body;
  const id = uuidv4();
  run('INSERT INTO availability_slots VALUES (?, ?, ?, ?, ?, 1)', [id, req.params.id, day_of_week, start_time, end_time]);
  res.json({ id });
});

app.get('/api/humans/:id/availability', (req, res) => {
  res.json(queryAll('SELECT * FROM availability_slots WHERE user_id = ? ORDER BY day_of_week, start_time', [req.params.id]));
});

// ============ ENHANCED SEARCH ============
app.get('/api/humans', (req, res) => {
  const { category, city, min_rate, max_rate, min_rating, skills, sort, page, limit } = req.query;
  
  let sql = `SELECT DISTINCT u.*, GROUP_CONCAT(hs.skill) as skills FROM users u LEFT JOIN human_skills hs ON u.id = hs.user_id WHERE u.type = 'human' AND u.verified = 1`;
  const params = [];
  
  if (city) { sql += ' AND u.location_city LIKE ?'; params.push('%' + city + '%'); }
  if (min_rate) { sql += ' AND u.hourly_rate >= ?'; params.push(parseFloat(min_rate)); }
  if (max_rate) { sql += ' AND u.hourly_rate <= ?'; params.push(parseFloat(max_rate)); }
  if (min_rating) { sql += ' AND u.rating >= ?'; params.push(parseFloat(min_rating)); }
  
  sql += ' GROUP BY u.id';
  
  if (sort === 'rating') sql += ' ORDER BY u.rating DESC';
  else if (sort === 'rate_low') sql += ' ORDER BY u.hourly_rate ASC';
  else sql += ' ORDER BY u.jobs_completed DESC';
  
  const offset = ((parseInt(page) || 0) * (parseInt(limit) || 20));
  sql += ' LIMIT ' + (parseInt(limit) || 20) + ' OFFSET ' + offset;
  
  res.json(queryAll(sql, params).map(h => ({ ...h, skills: h.skills ? h.skills.split(',') : [] })));
});

// ============ BOOKING FLOW ============
app.post('/api/bookings', (req, res) => {
  const auth = req.headers.authorization;
  const user = getUserByToken(auth);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { conversation_id, title, description, location, scheduled_at, duration_hours, hourly_rate } = req.body;
  const conv = queryOne('SELECT human_id FROM conversations WHERE id = ?', [conversation_id]);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });
  
  const id = uuidv4();
  const total_amount = duration_hours * hourly_rate;
  
  run(`INSERT INTO bookings VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [id, conversation_id, user.id, conv.human_id, title, description, location, scheduled_at, duration_hours, hourly_rate, total_amount]);
  
  const msgId = uuidv4();
  run('INSERT INTO messages VALUES (?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)',
    [msgId, conversation_id, user.id, 'Booking: ' + title + ' - $' + total_amount, 'booking_request', JSON.stringify({ booking_id: id, total_amount, scheduled_at })]);
  
  res.json({ id, total_amount, status: 'pending' });
});

app.patch('/api/bookings/:id', (req, res) => {
  const auth = req.headers.authorization;
  const user = getUserByToken(auth);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { status } = req.body;
  if (!['accepted', 'rejected', 'cancelled', 'completed', 'disputed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  const booking = queryOne('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
  if (!booking) return res.status(404).json({ error: 'Not found' });
  
  run('UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, req.params.id]);
  
  if (status === 'accepted') {
    run(`INSERT INTO transactions VALUES (?, ?, ?, ?, ?, 'held', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [uuidv4(), req.params.id, booking.agent_id, booking.human_id, booking.total_amount]);
  }
  
  res.json({ success: true });
});

app.post('/api/bookings/:id/complete', (req, res) => {
  const auth = req.headers.authorization;
  const user = getUserByToken(auth);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const booking = queryOne('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
  if (!booking) return res.status(404).json({ error: 'Not found' });
  
  run('UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['completed', req.params.id]);
  
  const verId = uuidv4();
  run('INSERT INTO verifications VALUES (?, ?, ?, ?, ?, ?, ?)',
    [verId, req.params.id, booking.human_id, 'completion_review', 'pending', null, null]);
  
  res.json({ success: true, verification_id: verId });
});

app.post('/api/bookings/:id/release-escrow', (req, res) => {
  const auth = req.headers.authorization;
  const user = getUserByToken(auth);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const booking = queryOne('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
  if (!booking) return res.status(404).json({ error: 'Not found' });
  
  const trans = queryOne('SELECT * FROM transactions WHERE booking_id = ?', [req.params.id]);
  if (!trans) return res.status(404).json({ error: 'No transaction' });
  
  run('UPDATE transactions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['released', trans.id]);
  run('UPDATE users SET jobs_completed = jobs_completed + 1 WHERE id = ?', [booking.human_id]);
  
  res.json({ success: true, amount: booking.total_amount });
});

// ============ REVIEWS ============
app.post('/api/reviews', (req, res) => {
  const auth = req.headers.authorization;
  const user = getUserByToken(auth);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { booking_id, rating, comment, type } = req.body;
  const booking = queryOne('SELECT * FROM bookings WHERE id = ? AND status = "completed"', [booking_id]);
  if (!booking) return res.status(400).json({ error: 'Booking not completed' });
  
  const reviewee_id = type === 'agent_to_human' ? booking.human_id : booking.agent_id;
  const id = uuidv4();
  
  run('INSERT INTO reviews VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, booking_id, user.id, reviewee_id, rating, comment, type]);
  
  const r = queryOne('SELECT AVG(rating) as avg, COUNT(*) as count FROM reviews WHERE reviewee_id = ?', [reviewee_id]);
  run('UPDATE users SET rating = ?, review_count = ? WHERE id = ?', [r.avg, r.count, reviewee_id]);
  
  res.json({ success: true });
});

// ============ AUTH ============
app.post('/api/auth/register/human', (req, res) => {
  try {
    const { email, password, name, hourly_rate, location_city, skills } = req.body;
    const id = uuidv4();
    const password_hash = crypto.createHash('sha256').update(password).digest('hex');
    
    run('INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?, NULL, NULL, ?, NULL, ?, 0, 0, 0, 0, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
      [id, email, password_hash, name, 'human', null, hourly_rate, location_city, 'available']);
    
    skills?.forEach(s => run('INSERT INTO human_skills VALUES (?, ?, ?, ?)', [uuidv4(), id, s, null]));
    
    res.json({ user: { id, email, name, type: 'human', hourly_rate, location_city }, token: crypto.randomBytes(32).toString('hex') });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Email exists' });
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/auth/register/agent', (req, res) => {
  try {
    const { email, name, organization } = req.body;
    const id = uuidv4();
    const api_key = 'hw_' + crypto.randomBytes(24).toString('hex');
    
    run('INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, ?, NULL, ?, 0, 0, 0, 0, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
      [id, email, null, name, 'agent', api_key, organization || null]);
    
    res.json({ user: { id, email, name, type: 'agent' }, api_key });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Email exists' });
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const password_hash = crypto.createHash('sha256').update(password).digest('hex');
  const user = queryOne('SELECT * FROM users WHERE email = ? AND password_hash = ?', [email, password_hash]);
  
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ user: { id: user.id, email: user.email, name: user.name, type: user.type }, token: crypto.randomBytes(32).toString('hex') });
});

app.get('/api/auth/verify', (req, res) => {
  const user = getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Invalid token' });
  res.json({ user: { id: user.id, email: user.email, name: user.name, type: user.type } });
});

// ============ PROFILES ============
app.get('/api/humans/:id', (req, res) => {
  const user = queryOne('SELECT * FROM users WHERE id = ? AND type = "human"', [req.params.id]);
  if (!user) return res.status(404).json({ error: 'Not found' });
  const skills = queryAll('SELECT skill FROM human_skills WHERE user_id = ?', [req.params.id]);
  res.json({ ...user, skills: skills.map(s => s.skill) });
});

app.patch('/api/humans/:id', (req, res) => {
  const { name, hourly_rate, location_city, bio, skills, availability } = req.body;
  run('UPDATE users SET name = ?, hourly_rate = ?, location_city = ?, bio = ?, availability = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND type = "human"',
    [name, hourly_rate, location_city, bio, availability, req.params.id]);
  
  if (skills?.length) {
    run('DELETE FROM human_skills WHERE user_id = ?', [req.params.id]);
    skills.forEach(s => run('INSERT INTO human_skills VALUES (?, ?, ?, ?)', [uuidv4(), req.params.id, s, null]));
  }
  res.json({ success: true });
});

// ============ CATEGORIES ============
app.get('/api/categories', (req, res) => {
  res.json(queryAll('SELECT * FROM categories'));
});

// ============ CONVERSATIONS ============
app.get('/api/conversations', (req, res) => {
  const user = getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  res.json(queryAll(`SELECT c.*, u.name as other_name, u.type as other_type FROM conversations c JOIN users u ON CASE WHEN c.agent_id = ? THEN c.human_id = u.id ELSE c.agent_id = u.id END WHERE c.agent_id = ? OR c.human_id = ? ORDER BY c.updated_at DESC`, [user.id, user.id, user.id]));
});

app.post('/api/conversations', (req, res) => {
  const user = getUserByToken(req.headers.authorization);
  if (!user || user.type !== 'agent') return res.status(401).json({ error: 'Agents only' });
  
  const { human_id, message } = req.body;
  let conv = queryOne('SELECT * FROM conversations WHERE agent_id = ? AND human_id = ?', [user.id, human_id]);
  
  if (!conv) {
    const id = uuidv4();
    run('INSERT INTO conversations VALUES (?, ?, ?, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)', [id, user.id, human_id]);
    conv = { id };
  }
  
  const msgId = uuidv4();
  run('INSERT INTO messages VALUES (?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)',
    [msgId, conv.id, user.id, message || 'Hi! I\'d like to discuss a potential task.']);
  
  res.json({ conversation_id: conv.id });
});

app.post('/api/messages', (req, res) => {
  const user = getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { conversation_id, content, type, metadata } = req.body;
  const id = uuidv4();
  
  run('INSERT INTO messages VALUES (?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)',
    [id, conversation_id, user.id, content, type || 'text', metadata || null]);
  
  run('UPDATE conversations SET last_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [content.substring(0, 100), conversation_id]);
  
  broadcast(conversation_id, { id, sender_id: user.id, content, type, created_at: new Date().toISOString() });
  
  res.json({ id, created_at: new Date().toISOString() });
});

app.get('/api/conversations/:id/messages', (req, res) => {
  const user = getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  res.json(queryAll(`SELECT m.*, u.name as sender_name FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.conversation_id = ? ORDER BY m.created_at ASC`, [req.params.id]));
});

// ============ BOOKINGS ============
app.get('/api/bookings', (req, res) => {
  const user = getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const where = user.type === 'agent' ? 'agent_id = ?' : 'human_id = ?';
  res.json(queryAll(`SELECT b.*, u.name as other_name FROM bookings b JOIN users u ON CASE WHEN b.agent_id = ? THEN b.human_id = u.id ELSE b.agent_id = u.id END WHERE ${where} ORDER BY b.created_at DESC`, [user.id, user.id]));
});

// ============ HEALTH ============
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============ STRIPE (Mock) ============
app.post('/api/stripe/connect', (req, res) => {
  const user = getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  res.json({ mock: true, account_id: user.id + '_mock', message: 'Stripe in mock mode' });
});

app.post('/api/stripe/payment-intent', (req, res) => {
  res.json({ mock: true, client_secret: 'mock_' + uuidv4(), message: 'Stripe in mock mode' });
});

// Start
initDB().then(() => {
  server.listen(PORT, () => {
    console.log('🚀 Humanwork.ai v2 API running on port ' + PORT);
  });
});
