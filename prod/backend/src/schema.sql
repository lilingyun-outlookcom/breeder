-- =============================================
-- 动物园饲养管理平台 数据库结构
-- 说明：数据库与账号由 scripts/db-setup.sh 创建，
--       应用启动时自动执行本文件建表（IF NOT EXISTS）。
-- =============================================

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(50) NOT NULL,
  role ENUM('admin','vet','keeper') NOT NULL DEFAULT 'keeper',
  phone VARCHAR(20) DEFAULT '',
  status TINYINT NOT NULL DEFAULT 1,
  created_at DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS settings (
  k VARCHAR(50) PRIMARY KEY,
  v VARCHAR(255) DEFAULT '',
  remark VARCHAR(255) DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  location VARCHAR(255) DEFAULT '',
  remark VARCHAR(255) DEFAULT '',
  created_at DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS feeds (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  unit VARCHAR(20) DEFAULT '克',
  stock DECIMAL(12,2) NOT NULL DEFAULT 0,
  remark VARCHAR(255) DEFAULT '',
  created_at DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS medicines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category ENUM('用药','消毒') NOT NULL DEFAULT '用药',
  spec VARCHAR(100) DEFAULT '',
  unit VARCHAR(20) DEFAULT '',
  stock DECIMAL(12,2) NOT NULL DEFAULT 0,
  remark VARCHAR(255) DEFAULT '',
  created_at DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS animals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cage_id INT NULL,
  name VARCHAR(100) NOT NULL,
  species VARCHAR(100) DEFAULT '',
  sex ENUM('公','母','未知') DEFAULT '未知',
  age VARCHAR(50) DEFAULT '',
  health ENUM('正常','异常') DEFAULT '正常',
  total INT NOT NULL DEFAULT 1,
  keeper_id INT NULL,
  photo VARCHAR(255) DEFAULT '',
  remark VARCHAR(255) DEFAULT '',
  status TINYINT NOT NULL DEFAULT 1,
  created_at DATETIME,
  KEY idx_cage (cage_id),
  KEY idx_keeper (keeper_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS task_groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_type VARCHAR(20) NOT NULL,
  title VARCHAR(200) DEFAULT '',
  remark VARCHAR(500) DEFAULT '',
  assignee_id INT NULL,
  total INT DEFAULT 0,
  done_count INT DEFAULT 0,
  created_by INT NULL,
  created_at DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NULL,
  task_type ENUM('feeding','water','environment','disinfection','medication','breeding') NOT NULL,
  title VARCHAR(200) DEFAULT '',
  cage_id INT NULL,
  animal_id INT NULL,
  feed_id INT NULL,
  medicine_id INT NULL,
  quantity DECIMAL(10,2) NULL,
  quantity_unit VARCHAR(20) DEFAULT '',
  task_date DATE NOT NULL,
  due_time VARCHAR(5) DEFAULT '17:00',
  due_at DATETIME NULL,
  assignee_id INT NOT NULL,
  status ENUM('pending','processing','done') DEFAULT 'pending',
  remark VARCHAR(500) DEFAULT '',
  plan_id INT NULL,
  created_by INT NULL,
  created_at DATETIME,
  done_at DATETIME NULL,
  done_by INT NULL,
  KEY idx_date (task_date),
  KEY idx_assignee (assignee_id),
  KEY idx_type (task_type),
  KEY idx_group (group_id),
  KEY idx_due (due_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS feeding_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NULL,
  cage_id INT NULL,
  animal_id INT NULL,
  feed_id INT NULL,
  quantity DECIMAL(10,2) DEFAULT 0,
  intake ENUM('正常','少吃','拒食') DEFAULT '正常',
  photos TEXT,
  note VARCHAR(500) DEFAULT '',
  created_by INT NULL,
  created_at DATETIME,
  KEY idx_task (task_id),
  KEY idx_creator (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS water_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NULL,
  cage_id INT NULL,
  amount DECIMAL(10,2) DEFAULT 0,
  quality ENUM('正常','异常') DEFAULT '正常',
  photos TEXT,
  note VARCHAR(500) DEFAULT '',
  created_by INT NULL,
  created_at DATETIME,
  KEY idx_task (task_id),
  KEY idx_creator (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS environment_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NULL,
  cage_id INT NULL,
  temperature DECIMAL(5,1) NULL,
  humidity DECIMAL(5,1) NULL,
  ventilation ENUM('良好','一般','差') DEFAULT '良好',
  cleanliness ENUM('良好','一般','差') DEFAULT '良好',
  abnormal TINYINT DEFAULT 0,
  photos TEXT,
  note VARCHAR(500) DEFAULT '',
  created_by INT NULL,
  created_at DATETIME,
  KEY idx_task (task_id),
  KEY idx_creator (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS disinfection_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NULL,
  cage_id INT NULL,
  medicine_id INT NULL,
  photos TEXT,
  note VARCHAR(500) DEFAULT '',
  created_by INT NULL,
  created_at DATETIME,
  KEY idx_task (task_id),
  KEY idx_creator (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS medication_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NULL,
  animal_id INT NULL,
  medicine_id INT NULL,
  quantity DECIMAL(10,2) NULL,
  dosage VARCHAR(100) DEFAULT '',
  photos TEXT,
  note VARCHAR(500) DEFAULT '',
  created_by INT NULL,
  created_at DATETIME,
  KEY idx_task (task_id),
  KEY idx_creator (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS abnormal_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  animal_id INT NOT NULL,
  reporter_id INT NOT NULL,
  symptoms TEXT,
  photos TEXT,
  status ENUM('pending','processing','done') DEFAULT 'pending',
  priority ENUM('低','中','高') DEFAULT '中',
  created_at DATETIME,
  handler_id INT NULL,
  handled_at DATETIME NULL,
  resolution TEXT,
  KEY idx_status (status),
  KEY idx_animal (animal_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS treatment_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  animal_id INT NOT NULL,
  report_id INT NULL,
  medicine_id INT NULL,
  quantity INT NOT NULL DEFAULT 1,
  dosage VARCHAR(100) DEFAULT '',
  frequency VARCHAR(50) DEFAULT '',
  times VARCHAR(255) DEFAULT '[]',
  duration_days INT DEFAULT 1,
  start_date DATE NOT NULL,
  end_date DATE NULL,
  vet_id INT NULL,
  status ENUM('active','done') DEFAULT 'active',
  remark VARCHAR(500) DEFAULT '',
  created_at DATETIME,
  KEY idx_animal (animal_id),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS breeding_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  male_animal_id INT NULL,
  female_animal_id INT NOT NULL,
  plan_type ENUM('配对','妊娠') DEFAULT '配对',
  start_date DATE NOT NULL,
  due_date DATE NULL,
  status ENUM('active','done') DEFAULT 'active',
  creator_id INT NULL,
  remark VARCHAR(500) DEFAULT '',
  created_at DATETIME,
  KEY idx_female (female_animal_id),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS breeding_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NULL,
  plan_id INT NULL,
  animal_id INT NULL,
  record_type ENUM('跟进','分娩登记') DEFAULT '跟进',
  mother_intake ENUM('正常','少吃','拒食') NULL,
  body_abnormal VARCHAR(255) DEFAULT '',
  total_born INT NULL,
  alive_count INT NULL,
  photos TEXT,
  note VARCHAR(500) DEFAULT '',
  created_by INT NULL,
  created_at DATETIME,
  KEY idx_task (task_id),
  KEY idx_plan (plan_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cub_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plan_id INT NULL,
  animal_id INT NULL,
  cub_no INT DEFAULT 1,
  weight DECIMAL(6,2) NULL,
  health ENUM('健康','异常') DEFAULT '健康',
  abnormal_note VARCHAR(255) DEFAULT '',
  photo VARCHAR(255) DEFAULT '',
  created_by INT NULL,
  created_at DATETIME,
  KEY idx_plan (plan_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  date DATE NOT NULL,
  check_in_at DATETIME NULL,
  check_in_status ENUM('正常','迟到') NULL,
  check_in_lat DECIMAL(10,6) NULL,
  check_in_lng DECIMAL(10,6) NULL,
  check_out_at DATETIME NULL,
  check_out_lat DECIMAL(10,6) NULL,
  check_out_lng DECIMAL(10,6) NULL,
  created_at DATETIME,
  UNIQUE KEY uk_user_date (user_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(30) DEFAULT 'system',
  title VARCHAR(200) DEFAULT '',
  content VARCHAR(1000) DEFAULT '',
  related_type VARCHAR(30) DEFAULT '',
  related_id INT NULL,
  is_read TINYINT DEFAULT 0,
  created_at DATETIME,
  KEY idx_user (user_id, is_read),
  KEY idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS uploads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  path VARCHAR(500) NOT NULL,
  size INT DEFAULT 0,
  mime VARCHAR(100) DEFAULT '',
  uploader_id INT NULL,
  created_at DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 饲料/药品出入库流水（买入/灭失）
CREATE TABLE IF NOT EXISTS inventory_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_type ENUM('feed','medicine') NOT NULL,
  item_id INT NOT NULL,
  change_type ENUM('buy','loss') NOT NULL,
  quantity DECIMAL(12,2) NOT NULL,
  remark VARCHAR(255) DEFAULT '',
  attachments VARCHAR(1000) DEFAULT '',
  created_by INT NULL,
  created_at DATETIME,
  KEY idx_item (item_type, item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
