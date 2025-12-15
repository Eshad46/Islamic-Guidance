-- Islamic Guidance Database Export
-- Generated: 2025-12-14T20:29:33.312Z
-- Compatible with MariaDB/MySQL

SET FOREIGN_KEY_CHECKS = 0;


-- Table: duas
DROP TABLE IF EXISTS `duas`;
CREATE TABLE `duas` (
  `id` INT AUTO_INCREMENT,
  `title` TEXT NOT NULL,
  `category` TEXT,
  `arabic` TEXT,
  `transliteration` TEXT,
  `translation` TEXT,
  `meaning` TEXT,
  `keywords` TEXT,
  `source` TEXT DEFAULT 'user',
  `created_at` TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Table: dua_requests
DROP TABLE IF EXISTS `dua_requests`;
CREATE TABLE `dua_requests` (
  `id` INT AUTO_INCREMENT,
  `query` TEXT NOT NULL,
  `response_title` TEXT,
  `response_category` TEXT,
  `is_ai_generated` INT DEFAULT '0',
  `created_at` TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Table: prayer_times
DROP TABLE IF EXISTS `prayer_times`;
CREATE TABLE `prayer_times` (
  `id` INT AUTO_INCREMENT,
  `latitude` DOUBLE NOT NULL,
  `longitude` DOUBLE NOT NULL,
  `date` TEXT NOT NULL,
  `fajr` TEXT,
  `dhuhr` TEXT,
  `asr` TEXT,
  `maghrib` TEXT,
  `isha` TEXT,
  `created_at` TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Table: user_locations
DROP TABLE IF EXISTS `user_locations`;
CREATE TABLE `user_locations` (
  `id` INT AUTO_INCREMENT,
  `latitude` DOUBLE NOT NULL,
  `longitude` DOUBLE NOT NULL,
  `country_name` TEXT,
  `last_used` TEXT DEFAULT CURRENT_TIMESTAMP,
  `usage_count` INT DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Table: favorite_duas
DROP TABLE IF EXISTS `favorite_duas`;
CREATE TABLE `favorite_duas` (
  `id` INT AUTO_INCREMENT,
  `dua_id` INT,
  `user_identifier` TEXT,
  `created_at` TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
