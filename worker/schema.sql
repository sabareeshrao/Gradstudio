-- GradStudio canonical schema for a fresh isolated database.
-- This file contains no educational or customer data.
PRAGMA foreign_keys = ON;

CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_deleted INTEGER NOT NULL DEFAULT 0 CHECK (is_deleted IN (0, 1)),
  deleted_at INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  icon_class TEXT,
  color_theme TEXT,
  category TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  is_deleted INTEGER NOT NULL DEFAULT 0 CHECK (is_deleted IN (0, 1)),
  deleted_at TEXT,
  is_locked INTEGER NOT NULL DEFAULT 1 CHECK (is_locked IN (0, 1)),
  parent_course_id TEXT,
  type TEXT NOT NULL DEFAULT 'course',
  level TEXT,
  labs_count INTEGER NOT NULL DEFAULT 0,
  tags TEXT,
  thumbnail_type TEXT,
  thumbnail_image_url TEXT,
  thumbnail_html TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (parent_course_id) REFERENCES courses(id) ON DELETE SET NULL
);

CREATE TABLE sections (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  title TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_locked INTEGER NOT NULL DEFAULT 1 CHECK (is_locked IN (0, 1)),
  is_deleted INTEGER NOT NULL DEFAULT 0 CHECK (is_deleted IN (0, 1)),
  deleted_at INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE simulations (
  id TEXT PRIMARY KEY,
  section_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT,
  link TEXT,
  has_simulation INTEGER NOT NULL DEFAULT 0 CHECK (has_simulation IN (0, 1)),
  display_order INTEGER NOT NULL DEFAULT 0,
  search_text TEXT,
  upload_date TEXT NOT NULL DEFAULT (date('now')),
  is_locked INTEGER NOT NULL DEFAULT 1 CHECK (is_locked IN (0, 1)),
  is_deleted INTEGER NOT NULL DEFAULT 0 CHECK (is_deleted IN (0, 1)),
  deleted_at INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE user_access (
  user_id TEXT PRIMARY KEY,
  has_full_access INTEGER NOT NULL DEFAULT 0 CHECK (has_full_access IN (0, 1)),
  unlocked_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  provider TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE statistics (
  simulation_id TEXT PRIMARY KEY,
  views INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  dislikes INTEGER NOT NULL DEFAULT 0,
  reports INTEGER NOT NULL DEFAULT 0,
  last_synced_at TEXT,
  FOREIGN KEY (simulation_id) REFERENCES simulations(id) ON DELETE CASCADE
);

CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  simulation_id TEXT NOT NULL,
  user_id TEXT,
  author_name TEXT NOT NULL,
  text TEXT NOT NULL,
  upvotes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (simulation_id) REFERENCES simulations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE simulation_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  simulation_id TEXT NOT NULL,
  user_id TEXT,
  viewed_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (simulation_id, user_id),
  FOREIGN KEY (simulation_id) REFERENCES simulations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE simulation_likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  simulation_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (simulation_id, user_id),
  FOREIGN KEY (simulation_id) REFERENCES simulations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE simulation_dislikes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  simulation_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (simulation_id, user_id),
  FOREIGN KEY (simulation_id) REFERENCES simulations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE simulation_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  simulation_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (simulation_id, user_id),
  FOREIGN KEY (simulation_id) REFERENCES simulations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE simulation_bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  simulation_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (simulation_id, user_id),
  FOREIGN KEY (simulation_id) REFERENCES simulations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE comment_likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (comment_id, user_id),
  FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE user_pins (
  user_id TEXT NOT NULL,
  item_key TEXT NOT NULL,
  type TEXT NOT NULL,
  course_id TEXT NOT NULL,
  lesson_index INTEGER NOT NULL DEFAULT 0,
  title TEXT,
  meta TEXT,
  saved_at INTEGER,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, item_key),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT,
  display_name TEXT,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  simulation_id TEXT NOT NULL,
  tag_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (simulation_id) REFERENCES simulations(id) ON DELETE CASCADE
);

CREATE TABLE metadata (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE carousels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  header TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  display_order INTEGER NOT NULL DEFAULT 0,
  layout_style TEXT NOT NULL DEFAULT 'horizontal_scroll',
  grid_columns INTEGER NOT NULL DEFAULT 2,
  infinite_scroll INTEGER NOT NULL DEFAULT 0 CHECK (infinite_scroll IN (0, 1)),
  snap_scroll INTEGER NOT NULL DEFAULT 0 CHECK (snap_scroll IN (0, 1)),
  text_align TEXT NOT NULL DEFAULT 'left',
  border_radius INTEGER NOT NULL DEFAULT 14,
  rounded_enabled INTEGER NOT NULL DEFAULT 1 CHECK (rounded_enabled IN (0, 1)),
  header_font TEXT NOT NULL DEFAULT 'Inter',
  header_font_size INTEGER NOT NULL DEFAULT 32,
  header_color TEXT NOT NULL DEFAULT '#ffffff',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE carousel_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  carousel_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon_class TEXT,
  color_hex TEXT NOT NULL DEFAULT '#3b82f6',
  target_type TEXT,
  target_id TEXT,
  section_id TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  content_type TEXT NOT NULL DEFAULT 'standard',
  image_url TEXT,
  iframe_url TEXT,
  content_html TEXT,
  width TEXT NOT NULL DEFAULT '300px',
  height_px TEXT NOT NULL DEFAULT 'auto',
  full_bleed INTEGER NOT NULL DEFAULT 0 CHECK (full_bleed IN (0, 1)),
  course_links TEXT,
  bg_color TEXT,
  chip_text TEXT,
  chip_color TEXT,
  chip_enabled INTEGER NOT NULL DEFAULT 1 CHECK (chip_enabled IN (0, 1)),
  heading_font TEXT,
  heading_size INTEGER,
  heading_color TEXT,
  sub_font TEXT,
  sub_size INTEGER,
  sub_color TEXT,
  text_position TEXT NOT NULL DEFAULT 'bottom',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (carousel_id) REFERENCES carousels(id) ON DELETE CASCADE
);

CREATE TABLE content_views (
  id TEXT PRIMARY KEY,
  sim_id TEXT NOT NULL,
  user_id TEXT,
  ip TEXT,
  device_type TEXT,
  browser TEXT,
  referrer TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (sim_id) REFERENCES simulations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE content_shares (
  id TEXT PRIMARY KEY,
  sim_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  platform TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (sim_id) REFERENCES simulations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE content_reports (
  id TEXT PRIMARY KEY,
  sim_id TEXT NOT NULL,
  reported_by TEXT NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  resolved_by TEXT,
  resolution_action TEXT,
  resolution_note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT,
  FOREIGN KEY (sim_id) REFERENCES simulations(id) ON DELETE CASCADE,
  FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE security_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  ip TEXT,
  user_id TEXT,
  email TEXT,
  endpoint TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE file_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  file_key TEXT,
  file_name TEXT,
  user_id TEXT,
  user_email TEXT,
  metadata TEXT,
  details TEXT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_categories_order ON categories(display_order);
CREATE INDEX idx_courses_order ON courses(display_order);
CREATE INDEX idx_courses_category ON courses(category);
CREATE INDEX idx_courses_parent ON courses(parent_course_id);
CREATE INDEX idx_sections_course ON sections(course_id, display_order);
CREATE INDEX idx_simulations_course ON simulations(course_id);
CREATE INDEX idx_simulations_section ON simulations(section_id, display_order);
CREATE INDEX idx_simulations_upload_date ON simulations(upload_date DESC);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_comments_simulation ON comments(simulation_id);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_simulation_views_sim ON simulation_views(simulation_id);
CREATE INDEX idx_simulation_views_user ON simulation_views(user_id);
CREATE INDEX idx_simulation_likes_sim ON simulation_likes(simulation_id);
CREATE INDEX idx_simulation_dislikes_sim ON simulation_dislikes(simulation_id);
CREATE INDEX idx_simulation_reports_sim ON simulation_reports(simulation_id);
CREATE INDEX idx_simulation_bookmarks_user ON simulation_bookmarks(user_id);
CREATE INDEX idx_comment_likes_comment ON comment_likes(comment_id);
CREATE INDEX idx_user_pins_user ON user_pins(user_id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_tags_simulation ON tags(simulation_id);
CREATE INDEX idx_tags_name ON tags(tag_name);
CREATE INDEX idx_carousels_active ON carousels(is_active, display_order);
CREATE INDEX idx_carousel_cards_carousel ON carousel_cards(carousel_id, display_order);
CREATE INDEX idx_content_views_sim ON content_views(sim_id);
CREATE INDEX idx_content_views_date ON content_views(created_at);
CREATE INDEX idx_content_reports_status ON content_reports(status);
CREATE INDEX idx_security_events_type ON security_events(event_type);
CREATE INDEX idx_security_events_date ON security_events(created_at);

CREATE VIRTUAL TABLE simulations_fts USING fts5(
  id UNINDEXED,
  title,
  description,
  search_text,
  content='simulations',
  content_rowid='rowid'
);

CREATE TRIGGER simulations_fts_insert AFTER INSERT ON simulations BEGIN
  INSERT INTO simulations_fts(rowid, id, title, description, search_text)
  VALUES (new.rowid, new.id, new.title, new.description, new.search_text);
END;

CREATE TRIGGER simulations_fts_delete AFTER DELETE ON simulations BEGIN
  INSERT INTO simulations_fts(simulations_fts, rowid, id, title, description, search_text)
  VALUES ('delete', old.rowid, old.id, old.title, old.description, old.search_text);
END;

CREATE TRIGGER simulations_fts_update AFTER UPDATE ON simulations BEGIN
  INSERT INTO simulations_fts(simulations_fts, rowid, id, title, description, search_text)
  VALUES ('delete', old.rowid, old.id, old.title, old.description, old.search_text);
  INSERT INTO simulations_fts(rowid, id, title, description, search_text)
  VALUES (new.rowid, new.id, new.title, new.description, new.search_text);
END;

INSERT INTO metadata (key, value) VALUES ('schema_version', '2026-11-24');
