-- Robotaxi Feedback Platform Database Initialization
-- This script creates the necessary database and tables

CREATE DATABASE IF NOT EXISTS robotaxi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE robotaxi;

-- Feedback main table
CREATE TABLE IF NOT EXISTS `feedback` (
  `id` VARCHAR(20) NOT NULL COMMENT 'Feedback ID, primary key, format: FB+date+sequence',
  `trip_id` VARCHAR(32) NOT NULL COMMENT 'Trip ID',
  `passenger_id` VARCHAR(32) NOT NULL COMMENT 'Passenger ID (masked)',
  `vehicle_id` VARCHAR(32) NOT NULL COMMENT 'Vehicle ID, format: Robotaxi-{city}-{sequence}',
  `city` VARCHAR(32) NOT NULL COMMENT 'City',
  `route` VARCHAR(128) NOT NULL COMMENT 'Route name',
  `route_start` VARCHAR(64) NOT NULL COMMENT 'Route start point',
  `route_end` VARCHAR(64) NOT NULL COMMENT 'Route end point',
  `trip_time` DATETIME NOT NULL COMMENT 'Trip start time',
  `trip_duration` INT NOT NULL COMMENT 'Trip duration (minutes)',
  `rating` TINYINT NOT NULL COMMENT 'Rating 1-5',
  `feedback_text` TEXT NOT NULL COMMENT 'Passenger original feedback',
  `feedback_pictures` JSON DEFAULT NULL COMMENT 'Feedback pictures URLs',
  `feedback_videos` JSON DEFAULT NULL COMMENT 'Feedback video URLs',
  `feedback_type` JSON DEFAULT NULL COMMENT 'AI classification results, array format',
  `sentiment` VARCHAR(10) DEFAULT NULL COMMENT 'Sentiment: positive/neutral/negative',
  `keywords` JSON DEFAULT NULL COMMENT 'AI extracted keywords',
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'Processing status',
  `handler` VARCHAR(64) DEFAULT NULL COMMENT 'Handler',
  `handler_notes` TEXT DEFAULT NULL COMMENT 'Handling notes',
  `handled_at` DATETIME DEFAULT NULL COMMENT 'Last handling time',
  `ai_summary` TEXT DEFAULT NULL COMMENT 'AI generated summary',
  `feedback_channel` VARCHAR(16) DEFAULT 'App' COMMENT 'Feedback channel: App/小程序/电话/Web',
  `reply_text` TEXT DEFAULT NULL COMMENT 'Customer service reply',
  `reply_time` DATETIME DEFAULT NULL COMMENT 'Reply time',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation time',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update time',
  PRIMARY KEY (`id`),
  INDEX `idx_trip_time` (`trip_time`),
  INDEX `idx_rating` (`rating`),
  INDEX `idx_city` (`city`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Feedback main table';

-- Route preset table (optional, for dropdown options)
CREATE TABLE IF NOT EXISTS `route_preset` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
  `city` VARCHAR(32) NOT NULL COMMENT 'City',
  `route_name` VARCHAR(128) NOT NULL COMMENT 'Route name',
  `route_start` VARCHAR(64) NOT NULL COMMENT 'Route start point',
  `route_end` VARCHAR(64) NOT NULL COMMENT 'Route end point',
  `active` TINYINT NOT NULL DEFAULT 1 COMMENT 'Is active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_route` (`city`, `route_start`, `route_end`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Route preset table';

-- Insert sample route presets
INSERT INTO `route_preset` (`city`, `route_name`, `route_start`, `route_end`) VALUES
('北京', '北京首都机场 → 国贸CBD', '北京首都机场', '国贸CBD'),
('北京', '望京SOHO → 798艺术区', '望京SOHO', '798艺术区'),
('北京', '中关村 → 北京西站', '中关村', '北京西站'),
('上海', '浦东机场 → 外滩', '浦东机场', '外滩'),
('上海', '虹桥枢纽 → 陆家嘴', '虹桥枢纽', '陆家嘴'),
('广州', '白云机场 → 天河城', '白云机场', '天河城'),
('广州', '广州南站 → 珠江新城', '广州南站', '珠江新城'),
('深圳', '宝安机场 → 华强北', '宝安机场', '华强北'),
('深圳', '深圳北站 → 南山科技园', '深圳北站', '南山科技园'),
('武汉', '天河机场 → 光谷广场', '武汉天河机场', '光谷广场'),
('武汉', '汉口站 → 武汉大学', '汉口站', '武汉大学')
ON DUPLICATE KEY UPDATE route_name = VALUES(route_name);
