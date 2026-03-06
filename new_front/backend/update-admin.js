const { pool } = require('./database');
const bcrypt = require('bcrypt');

async function updateAdmin() {
  try {
    // Tüm mevcut admin hesaplarını sil
    await pool.query('DELETE FROM users WHERE is_admin = 1');
    console.log('Varolan tüm admin hesapları silindi.');
    
    // Yeni admin hesabı oluştur
    const username = 'onlymixgirls';
    const password = 'onlymix2026!wdkfwe355kdd*';
    const hash = await bcrypt.hash(password, 10);
    
    await pool.query(
      `INSERT INTO users (username, password, is_admin, is_vip) VALUES ($1, $2, 1, 1)`,
      [username, hash]
    );
    console.log(`Yeni admin hesabı oluşturuldu:\nKullanıcı Adı: ${username}\nŞifre: ${password}`);
  } catch (err) {
    console.error('Hata:', err);
  } finally {
    pool.end();
  }
}

updateAdmin();
