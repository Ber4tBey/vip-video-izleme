const bcrypt = require('bcrypt');
const db = require('./database');

async function createAdmin() {
  try {
    const existing = await db.query('SELECT * FROM users WHERE username = $1', ['admin']);
    const hash = await bcrypt.hash('admin123', 10);
    
    if (existing.rows.length > 0) {
      await db.query(
        'UPDATE users SET password = $1, is_admin = 1, is_vip = 1 WHERE username = $2',
        [hash, 'admin']
      );
      console.log('Var olan admin hesabi guncellendi (admin / admin123)');
    } else {
      await db.query(
        'INSERT INTO users (username, password, is_admin, is_vip, is_active) VALUES ($1, $2, 1, 1, 1)',
        ['admin', hash]
      );
      console.log('Yeni admin hesabi olusturuldu (admin / admin123)');
    }
  } catch(error) {
    console.error('Hata:', error);
  } finally {
    process.exit(0);
  }
}

createAdmin();
