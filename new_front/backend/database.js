const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  host: process.env.PG_HOST || 'postgres',
  port: process.env.PG_PORT || 5432,
  user: process.env.PG_USER || 'video_user',
  password: process.env.PG_PASSWORD || 'video_pass',
  database: process.env.PG_DB || 'video_db',
});

// Helper for generic logging or parsing if needed
const query = async (text, params) => {
  return pool.query(text, params);
};

// Seed essential data if missing
const seedDatabase = async () => {
  try {
    console.log('[DB] Ensuring Admin and Settings exist...');

    // Seed Admin User
    const adminCheck = await query('SELECT id FROM users WHERE is_admin = 1');
    if (adminCheck.rows.length === 0) {
      const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
      await query(
        `INSERT INTO users (username, password, is_admin, is_vip) VALUES ($1, $2, 1, 1) ON CONFLICT (username) DO NOTHING`,
        [process.env.ADMIN_USERNAME || 'admin', hash]
      );
      console.log('✅ Admin user seeded (admin / admin123)');
    }

    // Seed Settings
    const settingsCheck = await query('SELECT key FROM settings');
    if (settingsCheck.rows.length === 0) {
      await query(`INSERT INTO settings (key, value) VALUES ('telegramLink', 'https://t.me/yourusername') ON CONFLICT DO NOTHING`);
      await query(`INSERT INTO settings (key, value) VALUES ('siteName', 'ONLYMIXMEDIA') ON CONFLICT DO NOTHING`);
      console.log('✅ Default settings seeded');
    }

    // Seed Ad Slots
    const adsCheck = await query('SELECT slot_id FROM ads');
    if (adsCheck.rows.length === 0) {
      const slots = [
        'home-leaderboard', 'home-rectangle', 'home-banner',
        'videos-leaderboard', 'footer-leaderboard',
      ];
      for (const slot of slots) {
         await query(`INSERT INTO ads (slot_id) VALUES ($1) ON CONFLICT DO NOTHING`, [slot]);
      }
      console.log('✅ Default ad slots seeded');
    }
  } catch (err) {
    console.error('[DB Seed] Failed to seed properties:', err.message);
  }
};

seedDatabase();

module.exports = {
  pool,
  query,
  seedDatabase,
};
