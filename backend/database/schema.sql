SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(32) PRIMARY KEY,
  login_id VARCHAR(100) NOT NULL UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  credential_ciphertext TEXT NULL,
  role ENUM('ADMIN','MANAGER','TEACHER','STUDENT','PARENT') NOT NULL,
  email VARCHAR(180) NULL UNIQUE,
  mobile VARCHAR(30) NULL,
  address VARCHAR(300) NULL,
  age INT NULL,
  joined_at DATE NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_users_role (role),
  INDEX idx_users_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS halaqahs (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  teacher_id VARCHAR(32) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_halaqahs_teacher (teacher_id),
  CONSTRAINT fk_halaqah_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS students (
  id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL UNIQUE,
  halaqah_id VARCHAR(32) NOT NULL,
  memorized_amount VARCHAR(200) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_students_halaqah (halaqah_id),
  CONSTRAINT fk_student_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_student_halaqah FOREIGN KEY (halaqah_id) REFERENCES halaqahs(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dormitory_assignments (
  id VARCHAR(32) PRIMARY KEY,
  student_id VARCHAR(32) NOT NULL UNIQUE,
  building VARCHAR(100) NOT NULL,
  room VARCHAR(100) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_dorm_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS parent_students (
  id VARCHAR(32) PRIMARY KEY,
  parent_id VARCHAR(32) NOT NULL,
  student_id VARCHAR(32) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_parent_student (parent_id, student_id),
  INDEX idx_parent_students_student (student_id),
  CONSTRAINT fk_parent_link_parent FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_parent_link_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS schedule_periods (
  id VARCHAR(32) PRIMARY KEY,
  number INT NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  start_time VARCHAR(5) NOT NULL,
  end_time VARCHAR(5) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS progress_entries (
  id VARCHAR(32) PRIMARY KEY,
  student_id VARCHAR(32) NOT NULL,
  teacher_id VARCHAR(32) NOT NULL,
  period_id VARCHAR(32) NOT NULL,
  attended TINYINT(1) NOT NULL DEFAULT 1,
  record_type VARCHAR(30) NULL,
  surah VARCHAR(120) NULL,
  verse_from INT NULL,
  end_surah VARCHAR(120) NULL,
  verse_to INT NULL,
  matn_name VARCHAR(180) NULL,
  matn_from VARCHAR(180) NULL,
  matn_to VARCHAR(180) NULL,
  pages DECIMAL(5,2) NOT NULL DEFAULT 0,
  rating INT NULL,
  record_date DATE NOT NULL,
  note VARCHAR(1000) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_progress_student_date (student_id, record_date),
  INDEX idx_progress_teacher_date (teacher_id, record_date),
  INDEX idx_progress_period (period_id),
  CONSTRAINT fk_progress_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_progress_teacher FOREIGN KEY (teacher_id) REFERENCES users(id),
  CONSTRAINT fk_progress_period FOREIGN KEY (period_id) REFERENCES schedule_periods(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS activities (
  id VARCHAR(32) PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(80) NOT NULL DEFAULT 'نشاط',
  image_url VARCHAR(1200) NULL,
  author_id VARCHAR(32) NOT NULL,
  published TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_activities_created (created_at),
  INDEX idx_activities_author (author_id),
  CONSTRAINT fk_activity_author FOREIGN KEY (author_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS activity_assets (
  id VARCHAR(32) PRIMARY KEY,
  activity_id VARCHAR(32) NOT NULL,
  kind VARCHAR(20) NOT NULL,
  mime_type VARCHAR(150) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  url VARCHAR(1200) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_activity_assets_order (activity_id, sort_order),
  CONSTRAINT fk_activity_asset_activity FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS home_page_content (
  id VARCHAR(32) PRIMARY KEY,
  eyebrow VARCHAR(160) NOT NULL,
  hero_title VARCHAR(240) NOT NULL,
  hero_body TEXT NOT NULL,
  about_title VARCHAR(240) NOT NULL,
  about_body TEXT NOT NULL,
  feature1_title VARCHAR(120) NOT NULL,
  feature1_body VARCHAR(500) NOT NULL,
  feature2_title VARCHAR(120) NOT NULL,
  feature2_body VARCHAR(500) NOT NULL,
  feature3_title VARCHAR(120) NOT NULL,
  feature3_body VARCHAR(500) NOT NULL,
  callout_title VARCHAR(180) NOT NULL,
  callout_body VARCHAR(700) NOT NULL,
  footer_phone VARCHAR(60) NULL,
  footer_email VARCHAR(180) NULL,
  footer_instagram VARCHAR(300) NULL,
  footer_facebook VARCHAR(300) NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS library_items (
  id VARCHAR(32) PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  description VARCHAR(700) NULL,
  type VARCHAR(30) NOT NULL DEFAULT 'PDF',
  url VARCHAR(1200) NOT NULL,
  cover_url VARCHAR(1200) NULL,
  published TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_library_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS leave_requests (
  id VARCHAR(32) PRIMARY KEY,
  requester_id VARCHAR(32) NOT NULL,
  type VARCHAR(30) NOT NULL,
  from_date DATE NOT NULL,
  to_date DATE NULL,
  reason VARCHAR(1000) NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  reviewed_by_id VARCHAR(32) NULL,
  review_note VARCHAR(1000) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_leave_requester_created (requester_id, created_at),
  INDEX idx_leave_status_created (status, created_at),
  INDEX idx_leave_reviewer (reviewed_by_id),
  CONSTRAINT fk_leave_requester FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_leave_reviewer FOREIGN KEY (reviewed_by_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notes_violations (
  id VARCHAR(32) PRIMARY KEY,
  subject_user_id VARCHAR(32) NOT NULL,
  author_id VARCHAR(32) NOT NULL,
  kind VARCHAR(30) NOT NULL,
  context VARCHAR(50) NOT NULL,
  halaqah_id VARCHAR(32) NULL,
  content TEXT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_notes_subject_created (subject_user_id, created_at),
  INDEX idx_notes_author_created (author_id, created_at),
  INDEX idx_notes_halaqah (halaqah_id),
  CONSTRAINT fk_note_subject FOREIGN KEY (subject_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_note_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_note_halaqah FOREIGN KEY (halaqah_id) REFERENCES halaqahs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS monthly_tests (
  id VARCHAR(32) PRIMARY KEY,
  student_id VARCHAR(32) NOT NULL,
  examiner_id VARCHAR(32) NOT NULL,
  halaqah_id VARCHAR(32) NOT NULL,
  type VARCHAR(30) NOT NULL,
  matn_name VARCHAR(180) NULL,
  score INT NOT NULL,
  note VARCHAR(2000) NULL,
  test_date DATE NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_tests_student_date (student_id, test_date),
  INDEX idx_tests_halaqah_date (halaqah_id, test_date),
  INDEX idx_tests_examiner (examiner_id),
  CONSTRAINT fk_test_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_test_examiner FOREIGN KEY (examiner_id) REFERENCES users(id),
  CONSTRAINT fk_test_halaqah FOREIGN KEY (halaqah_id) REFERENCES halaqahs(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS monthly_test_questions (
  id VARCHAR(32) PRIMARY KEY,
  monthly_test_id VARCHAR(32) NOT NULL,
  question_number INT NOT NULL,
  correct TINYINT(1) NOT NULL,
  surah VARCHAR(120) NULL,
  ayah INT NULL,
  ayah_to INT NULL,
  reference_text VARCHAR(300) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_test_question_number (monthly_test_id, question_number),
  CONSTRAINT fk_question_test FOREIGN KEY (monthly_test_id) REFERENCES monthly_tests(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(32) PRIMARY KEY,
  recipient_id VARCHAR(32) NOT NULL,
  sender_id VARCHAR(32) NOT NULL,
  title VARCHAR(180) NOT NULL,
  message VARCHAR(2000) NOT NULL,
  type VARCHAR(30) NOT NULL DEFAULT 'TASK',
  event_at DATETIME(3) NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_notifications_recipient (recipient_id, is_read, created_at),
  INDEX idx_notifications_sender (sender_id, created_at),
  CONSTRAINT fk_notification_recipient FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notification_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
