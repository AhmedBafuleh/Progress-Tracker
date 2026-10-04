SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS=0;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(32) PRIMARY KEY,
  login_id VARCHAR(191) NOT NULL UNIQUE,
  full_name VARCHAR(191) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  credential_ciphertext TEXT NULL,
  role ENUM('ADMIN','MANAGER','TEACHER','STUDENT','PARENT') NOT NULL,
  email VARCHAR(191) NULL UNIQUE,
  mobile VARCHAR(64) NULL,
  address VARCHAR(500) NULL,
  age INT NULL,
  joined_at DATE NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS halaqahs (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(191) NOT NULL UNIQUE,
  teacher_id VARCHAR(32) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_halaqah_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_halaqah_teacher (teacher_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS students (
  id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL UNIQUE,
  halaqah_id VARCHAR(32) NOT NULL,
  memorized_amount VARCHAR(191) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_student_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_student_halaqah FOREIGN KEY (halaqah_id) REFERENCES halaqahs(id),
  INDEX idx_student_halaqah (halaqah_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dormitory_assignments (
  id VARCHAR(32) PRIMARY KEY,
  student_id VARCHAR(32) NOT NULL UNIQUE,
  building VARCHAR(191) NOT NULL,
  room VARCHAR(191) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_dorm_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS parent_students (
  id VARCHAR(32) PRIMARY KEY,
  parent_id VARCHAR(32) NOT NULL,
  student_id VARCHAR(32) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_parent_link_parent FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_parent_link_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  UNIQUE KEY uq_parent_student (parent_id, student_id),
  INDEX idx_parent_student_student (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS schedule_periods (
  id VARCHAR(32) PRIMARY KEY,
  number INT NOT NULL UNIQUE,
  name VARCHAR(191) NOT NULL,
  start_time VARCHAR(16) NOT NULL,
  end_time VARCHAR(16) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS progress_entries (
  id VARCHAR(32) PRIMARY KEY,
  student_id VARCHAR(32) NOT NULL,
  teacher_id VARCHAR(32) NOT NULL,
  period_id VARCHAR(32) NOT NULL,
  attended TINYINT(1) NOT NULL DEFAULT 1,
  record_type VARCHAR(32) NULL,
  surah VARCHAR(191) NULL,
  verse_from INT NULL,
  end_surah VARCHAR(191) NULL,
  verse_to INT NULL,
  matn_name VARCHAR(191) NULL,
  matn_from VARCHAR(191) NULL,
  matn_to VARCHAR(191) NULL,
  pages DECIMAL(5,2) NOT NULL DEFAULT 0,
  rating INT NULL,
  record_date DATE NOT NULL,
  note TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_progress_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_progress_teacher FOREIGN KEY (teacher_id) REFERENCES users(id),
  CONSTRAINT fk_progress_period FOREIGN KEY (period_id) REFERENCES schedule_periods(id),
  INDEX idx_progress_student_date (student_id, record_date),
  INDEX idx_progress_teacher_date (teacher_id, record_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS activities (
  id VARCHAR(32) PRIMARY KEY,
  title VARCHAR(191) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(191) NOT NULL DEFAULT 'نشاط',
  image_url TEXT NULL,
  author_id VARCHAR(32) NOT NULL,
  published TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_activity_author FOREIGN KEY (author_id) REFERENCES users(id),
  INDEX idx_activity_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS activity_assets (
  id VARCHAR(32) PRIMARY KEY,
  activity_id VARCHAR(32) NOT NULL,
  kind VARCHAR(32) NOT NULL,
  mime_type VARCHAR(191) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_activity_asset_activity FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  INDEX idx_asset_activity_sort (activity_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS home_page_content (
  id VARCHAR(32) PRIMARY KEY,
  eyebrow VARCHAR(255) NOT NULL,
  hero_title VARCHAR(255) NOT NULL,
  hero_body TEXT NOT NULL,
  about_title VARCHAR(255) NOT NULL,
  about_body TEXT NOT NULL,
  feature1_title VARCHAR(255) NOT NULL,
  feature1_body TEXT NOT NULL,
  feature2_title VARCHAR(255) NOT NULL,
  feature2_body TEXT NOT NULL,
  feature3_title VARCHAR(255) NOT NULL,
  feature3_body TEXT NOT NULL,
  callout_title VARCHAR(255) NOT NULL,
  callout_body TEXT NOT NULL,
  footer_phone VARCHAR(100) NULL,
  footer_email VARCHAR(191) NULL,
  footer_instagram VARCHAR(255) NULL,
  footer_facebook VARCHAR(255) NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS library_items (
  id VARCHAR(32) PRIMARY KEY,
  title VARCHAR(191) NOT NULL,
  description TEXT NULL,
  type VARCHAR(64) NOT NULL DEFAULT 'PDF',
  url TEXT NOT NULL,
  cover_url TEXT NULL,
  published TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_library_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS leave_requests (
  id VARCHAR(32) PRIMARY KEY,
  requester_id VARCHAR(32) NOT NULL,
  type VARCHAR(32) NOT NULL,
  from_date DATE NOT NULL,
  to_date DATE NULL,
  reason TEXT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  reviewed_by_id VARCHAR(32) NULL,
  review_note TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_leave_requester FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_leave_reviewer FOREIGN KEY (reviewed_by_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_leave_requester_created (requester_id, created_at),
  INDEX idx_leave_status_created (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notes_violations (
  id VARCHAR(32) PRIMARY KEY,
  subject_user_id VARCHAR(32) NOT NULL,
  author_id VARCHAR(32) NOT NULL,
  kind VARCHAR(32) NOT NULL,
  context VARCHAR(191) NOT NULL,
  halaqah_id VARCHAR(32) NULL,
  content TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_note_subject FOREIGN KEY (subject_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_note_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_note_halaqah FOREIGN KEY (halaqah_id) REFERENCES halaqahs(id) ON DELETE SET NULL,
  INDEX idx_note_subject_created (subject_user_id, created_at),
  INDEX idx_note_author_created (author_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS monthly_tests (
  id VARCHAR(32) PRIMARY KEY,
  student_id VARCHAR(32) NOT NULL,
  examiner_id VARCHAR(32) NOT NULL,
  halaqah_id VARCHAR(32) NOT NULL,
  type VARCHAR(32) NOT NULL,
  matn_name VARCHAR(191) NULL,
  score INT NOT NULL,
  note TEXT NULL,
  test_date DATE NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_test_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_test_examiner FOREIGN KEY (examiner_id) REFERENCES users(id),
  CONSTRAINT fk_test_halaqah FOREIGN KEY (halaqah_id) REFERENCES halaqahs(id),
  INDEX idx_test_student_date (student_id, test_date),
  INDEX idx_test_halaqah_date (halaqah_id, test_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS monthly_test_questions (
  id VARCHAR(32) PRIMARY KEY,
  monthly_test_id VARCHAR(32) NOT NULL,
  question_number INT NOT NULL,
  correct TINYINT(1) NOT NULL,
  surah VARCHAR(191) NULL,
  ayah INT NULL,
  ayah_to INT NULL,
  reference_text TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_question_test FOREIGN KEY (monthly_test_id) REFERENCES monthly_tests(id) ON DELETE CASCADE,
  UNIQUE KEY uq_test_question (monthly_test_id, question_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(32) PRIMARY KEY,
  recipient_id VARCHAR(32) NOT NULL,
  sender_id VARCHAR(32) NOT NULL,
  title VARCHAR(191) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(32) NOT NULL DEFAULT 'TASK',
  event_at DATETIME NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notification_recipient FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notification_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notification_recipient (recipient_id, is_read, created_at),
  INDEX idx_notification_sender (sender_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS=1;
