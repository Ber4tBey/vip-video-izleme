CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    is_admin INT DEFAULT 0,
    is_vip INT DEFAULT 0,
    is_active INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) UNIQUE NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    order_index INT DEFAULT 0,
    is_active INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS models (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) UNIQUE NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    params JSONB,
    stats JSONB,
    order_index INT DEFAULT 0,
    is_active INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS videos (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category_id INT REFERENCES categories(id) ON DELETE SET NULL,
    model_id INT REFERENCES models(id) ON DELETE SET NULL,
    url VARCHAR(500),
    thumbnail_url VARCHAR(500),
    view_count INT DEFAULT 0,
    is_vip INT DEFAULT 0,
    is_active INT DEFAULT 1,
    job_id VARCHAR(100),
    job_status VARCHAR(50),
    job_progress NUMERIC DEFAULT 0,
    preview_urls TEXT DEFAULT NULL,
    preview_url TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ads (
    id SERIAL PRIMARY KEY,
    slot_id VARCHAR(100) UNIQUE NOT NULL,
    custom_code TEXT,
    image_url VARCHAR(500),
    link VARCHAR(500),
    alt_text VARCHAR(255) DEFAULT 'Reklam',
    is_active INT DEFAULT 1,
    priority INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
