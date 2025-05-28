-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: May 28, 2025 at 10:26 AM
-- Server version: 9.1.0
-- PHP Version: 8.3.14

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `zeroops`
--

-- --------------------------------------------------------

--
-- Table structure for table `applications`
--

DROP TABLE IF EXISTS `applications`;
CREATE TABLE IF NOT EXISTS `applications` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `name` varchar(255) NOT NULL,
  `repository_url` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `git_url` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_applications_user_repo` (`user_id`,`repository_url`),
  UNIQUE KEY `UKkxtws5m49xyx2moxpw2d9ge5s` (`git_url`),
  KEY `idx_applications_user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `applications`
--

INSERT INTO `applications` (`id`, `user_id`, `name`, `repository_url`, `created_at`, `updated_at`, `git_url`) VALUES
(1, 4, 'Maquettes', 'https://github.com/elnassim/Maquettes.git', '2025-05-25 22:00:16', '2025-05-25 22:00:16', ''),
(6, 4, 'Maquettes-cbe665', 'https://github.com/elnassim/Maquettes.git#cbe66564-913e-4c7e-bb55-c564c2c350f5', '2025-05-28 04:44:42', '2025-05-28 04:44:42', 'https://github.com/elnassim/Maquettes.git#cbe66564-913e-4c7e-bb55-c564c2c350f5'),
(7, 4, 'Maquettes-486068', 'https://github.com/elnassim/Maquettes.git#48606889-ca24-4c5a-b752-b76e01f4ae56', '2025-05-28 05:01:46', '2025-05-28 05:01:46', 'https://github.com/elnassim/Maquettes.git#48606889-ca24-4c5a-b752-b76e01f4ae56'),
(8, 4, 'Maquettes-a5858c', 'https://github.com/elnassim/Maquettes.git#a5858cf2-339e-4c45-9f84-793cd728b0cd', '2025-05-28 06:11:11', '2025-05-28 06:11:11', 'https://github.com/elnassim/Maquettes.git#a5858cf2-339e-4c45-9f84-793cd728b0cd'),
(9, 4, 'Maquettes-851a2a', 'https://github.com/elnassim/Maquettes.git#851a2a61-1cc6-4e76-8964-43bc74c2eaa8', '2025-05-28 06:11:52', '2025-05-28 06:11:52', 'https://github.com/elnassim/Maquettes.git#851a2a61-1cc6-4e76-8964-43bc74c2eaa8'),
(10, 4, 'Maquettes-74fb50', 'https://github.com/elnassim/Maquettes.git#74fb50e7-5cc1-42ee-a2e0-9d95b39af565', '2025-05-28 06:18:11', '2025-05-28 06:18:11', 'https://github.com/elnassim/Maquettes.git#74fb50e7-5cc1-42ee-a2e0-9d95b39af565'),
(11, 4, 'Maquettes-dd100f', 'https://github.com/elnassim/Maquettes.git#dd100f7e-535f-4e7d-990e-f3b59313cd60', '2025-05-28 06:27:59', '2025-05-28 06:27:59', 'https://github.com/elnassim/Maquettes.git#dd100f7e-535f-4e7d-990e-f3b59313cd60'),
(12, 4, 'Maquettes-74b8d2', 'https://github.com/elnassim/Maquettes.git#74b8d2f4-a421-4df6-8b6d-963e69670b85', '2025-05-28 06:32:56', '2025-05-28 06:32:56', 'https://github.com/elnassim/Maquettes.git#74b8d2f4-a421-4df6-8b6d-963e69670b85'),
(13, 4, 'Maquettes-f985e2', 'https://github.com/elnassim/Maquettes.git#f985e248-df05-4d12-8623-0af684448e3e', '2025-05-28 06:34:01', '2025-05-28 06:34:01', 'https://github.com/elnassim/Maquettes.git#f985e248-df05-4d12-8623-0af684448e3e'),
(14, 4, 'Maquettes-7b711d', 'https://github.com/elnassim/Maquettes.git#7b711dec-288c-49cb-a9c4-b8924d21d023', '2025-05-28 06:51:39', '2025-05-28 06:51:39', 'https://github.com/elnassim/Maquettes.git#7b711dec-288c-49cb-a9c4-b8924d21d023'),
(16, 4, 'Maquettes', 'https://github.com/elnassim/Maquettes.git#798eceb9-5ed7-40de-bfa5-09e4c6ff92e9', '2025-05-28 07:01:38', '2025-05-28 07:01:38', 'https://github.com/elnassim/Maquettes.git#798eceb9-5ed7-40de-bfa5-09e4c6ff92e9'),
(17, 4, 'Maquettes', 'https://github.com/elnassim/Maquettes.git#0815eb21-ef0b-42ab-b9f2-029f5fd1c4e0', '2025-05-28 07:06:05', '2025-05-28 07:06:05', 'https://github.com/elnassim/Maquettes.git#0815eb21-ef0b-42ab-b9f2-029f5fd1c4e0'),
(18, 4, 'Maquettes', 'https://github.com/elnassim/Maquettes.git#8df2347e-d4ca-416b-b8d1-c8ed0f52b0d7', '2025-05-28 07:07:23', '2025-05-28 07:07:23', 'https://github.com/elnassim/Maquettes.git#8df2347e-d4ca-416b-b8d1-c8ed0f52b0d7');

-- --------------------------------------------------------

--
-- Table structure for table `auto_scaling_configs`
--

DROP TABLE IF EXISTS `auto_scaling_configs`;
CREATE TABLE IF NOT EXISTS `auto_scaling_configs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `application_id` bigint NOT NULL,
  `min_instances` int DEFAULT '1',
  `max_instances` int DEFAULT '3',
  `cpu_threshold` int DEFAULT '80',
  PRIMARY KEY (`id`),
  UNIQUE KEY `application_id` (`application_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `deployments`
--

DROP TABLE IF EXISTS `deployments`;
CREATE TABLE IF NOT EXISTS `deployments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `application_id` bigint NOT NULL,
  `app_name` varchar(255) NOT NULL,
  `version` varchar(50) NOT NULL,
  `status` enum('BUILDING','CANCELLED','CLONING_COMPLETE','DEPLOYED','FAILED','IN_PROGRESS','PENDING','QUEUED','SUCCESS','UNKNOWN','UPLOADING','UPLOAD_COMPLETE') NOT NULL,
  `deployment_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ended_at` datetime DEFAULT NULL,
  `duration_seconds` bigint DEFAULT NULL,
  `deployment_url` varchar(255) DEFAULT NULL,
  `deployment_uuid` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `git_branch` varchar(255) NOT NULL,
  `git_repo_url` varchar(255) NOT NULL,
  `error_message` text,
  `log_file_path` varchar(255) DEFAULT NULL,
  `git_url` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `deployment_uuid` (`deployment_uuid`),
  KEY `user_id` (`user_id`),
  KEY `application_id` (`application_id`)
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `deployments`
--

INSERT INTO `deployments` (`id`, `user_id`, `application_id`, `app_name`, `version`, `status`, `deployment_date`, `ended_at`, `duration_seconds`, `deployment_url`, `deployment_uuid`, `created_at`, `updated_at`, `git_branch`, `git_repo_url`, `error_message`, `log_file_path`, `git_url`) VALUES
(1, 4, 1, 'Maquettes', '1.0', 'SUCCESS', '2025-05-22 04:15:04', NULL, NULL, 'https://s3.null.amazonaws.com/null/cec2d946-15da-40ac-a1e2-4794bd805b80/', 'cec2d946-15da-40ac-a1e2-4794bd805b80', '2025-05-22 04:15:04', '2025-05-22 04:15:09', '', '', NULL, NULL, NULL),
(2, 4, 1, 'ImageAnalysisProject', '1.0', 'SUCCESS', '2025-05-22 05:37:46', NULL, NULL, 'https://s3.us-east-1.amazonaws.com/zeroops-deployments-1/71e80792-2999-494b-9312-c14d138589c6/', '71e80792-2999-494b-9312-c14d138589c6', '2025-05-22 05:37:46', '2025-05-22 05:38:01', '', '', NULL, NULL, NULL),
(3, 4, 1, 'ImageAnalysisProject', '1.0', 'SUCCESS', '2025-05-22 05:52:02', NULL, NULL, 'https://s3.us-east-1.amazonaws.com/zeroops-deployments-1/4a00ada6-cbd5-4010-aff4-f20f197698f1/', '4a00ada6-cbd5-4010-aff4-f20f197698f1', '2025-05-22 05:52:02', '2025-05-22 05:52:20', '', '', NULL, NULL, NULL),
(4, 4, 1, 'Maquettes', 'main', 'UPLOAD_COMPLETE', '2025-05-25 22:00:17', NULL, NULL, 'https://s3.us-east-1.amazonaws.com/zeroops-deployments-1/16005b86-ea88-48a1-a9d1-cf904e11c80d/', '16005b86-ea88-48a1-a9d1-cf904e11c80d', '2025-05-25 22:00:16', '2025-05-25 22:00:23', 'main', 'https://github.com/elnassim/Maquettes.git', NULL, NULL, NULL),
(5, 4, 1, 'Maquettes', 'main', 'UPLOAD_COMPLETE', '2025-05-25 22:59:30', NULL, NULL, 'https://s3.us-east-1.amazonaws.com/zeroops-deployments-1/0e78c090-7fe3-4e90-92e5-9778e72b8cc2/', '0e78c090-7fe3-4e90-92e5-9778e72b8cc2', '2025-05-25 22:59:30', '2025-05-25 22:59:39', 'main', 'https://github.com/elnassim/Maquettes.git', NULL, NULL, NULL),
(6, 4, 1, 'Maquettes', 'main', 'UPLOAD_COMPLETE', '2025-05-25 23:23:46', NULL, NULL, 'https://s3.us-east-1.amazonaws.com/zeroops-deployments-1/37b758ac-a15e-433c-ae9f-6cbbd4f5e110/', '37b758ac-a15e-433c-ae9f-6cbbd4f5e110', '2025-05-25 23:23:45', '2025-05-25 23:23:54', 'main', 'https://github.com/elnassim/Maquettes.git', NULL, NULL, NULL),
(7, 4, 1, 'Maquettes', 'main', 'UPLOAD_COMPLETE', '2025-05-27 03:18:55', NULL, NULL, 'https://s3.us-east-1.amazonaws.com/zeroops-deployments-1/ba834b76-d17c-41af-992c-9059f92f10ba/', 'ba834b76-d17c-41af-992c-9059f92f10ba', '2025-05-27 03:18:55', '2025-05-27 03:19:01', 'main', 'https://github.com/elnassim/Maquettes.git', NULL, NULL, NULL),
(8, 4, 1, 'Maquettes', 'main', 'UPLOAD_COMPLETE', '2025-05-27 03:26:53', NULL, NULL, 'https://s3.us-east-1.amazonaws.com/zeroops-deployments-1/d43a55e3-8537-4bda-937a-fc1560d378c8/', 'd43a55e3-8537-4bda-937a-fc1560d378c8', '2025-05-27 03:26:52', '2025-05-27 03:26:58', 'main', 'https://github.com/elnassim/Maquettes.git', NULL, NULL, NULL),
(9, 4, 1, 'Maquettes', 'main', 'UPLOAD_COMPLETE', '2025-05-27 03:52:49', NULL, NULL, 'https://s3.us-east-1.amazonaws.com/zeroops-deployments-1/c0e0f118-7d5b-40c7-bd5c-d8f35bc03ace/', 'c0e0f118-7d5b-40c7-bd5c-d8f35bc03ace', '2025-05-27 03:52:49', '2025-05-27 03:52:55', 'main', 'https://github.com/elnassim/Maquettes.git', NULL, NULL, NULL),
(10, 4, 1, 'Maquettes', 'main', 'UPLOAD_COMPLETE', '2025-05-27 03:57:49', NULL, NULL, 'https://s3.us-east-1.amazonaws.com/zeroops-deployments-1/05291a4f-0441-4322-a0a4-3adfbca55c0b/', '05291a4f-0441-4322-a0a4-3adfbca55c0b', '2025-05-27 03:57:49', '2025-05-27 03:57:54', 'main', 'https://github.com/elnassim/Maquettes.git', NULL, NULL, NULL),
(11, 4, 1, 'Maquettes', 'main', 'UPLOAD_COMPLETE', '2025-05-27 04:02:44', NULL, NULL, 'https://s3.us-east-1.amazonaws.com/zeroops-deployments-1/d2b1fd40-ede6-4db3-b214-189903a71afb/', 'd2b1fd40-ede6-4db3-b214-189903a71afb', '2025-05-27 04:02:43', '2025-05-27 04:02:48', 'main', 'https://github.com/elnassim/Maquettes.git', NULL, NULL, NULL),
(12, 4, 1, 'Maquettes', 'main', 'UPLOAD_COMPLETE', '2025-05-27 17:04:45', NULL, NULL, 'https://s3.us-east-1.amazonaws.com/zeroops-deployments-1/af9a9812-5382-44b7-b5bf-8daa670305ce/', 'af9a9812-5382-44b7-b5bf-8daa670305ce', '2025-05-27 17:04:45', '2025-05-27 17:04:54', 'main', 'https://github.com/elnassim/Maquettes.git', NULL, NULL, NULL),
(13, 4, 1, 'Maquettes', 'main', 'UPLOAD_COMPLETE', '2025-05-28 01:05:03', NULL, NULL, 'https://s3.us-east-1.amazonaws.com/zeroops-deployments-1/081cffd6-3bb2-469a-befb-b537b58838ac/', '081cffd6-3bb2-469a-befb-b537b58838ac', '2025-05-28 01:05:02', '2025-05-28 01:05:10', 'main', 'https://github.com/elnassim/Maquettes.git', NULL, NULL, NULL),
(14, 4, 1, 'Maquettes', 'main', 'UPLOAD_COMPLETE', '2025-05-28 01:27:04', NULL, NULL, 'https://s3.us-east-1.amazonaws.com/zeroops-deployments-1/e02427e7-048a-420d-b141-5f30d4fd14f1/', 'e02427e7-048a-420d-b141-5f30d4fd14f1', '2025-05-28 01:27:04', '2025-05-28 01:27:10', 'main', 'https://github.com/elnassim/Maquettes.git', NULL, NULL, NULL),
(15, 4, 1, 'Maquettes', 'main', 'UPLOAD_COMPLETE', '2025-05-28 01:44:19', NULL, NULL, 'https://s3.us-east-1.amazonaws.com/zeroops-deployments-1/136c8903-5b63-4c8f-8a1c-73b3ec19a511/', '136c8903-5b63-4c8f-8a1c-73b3ec19a511', '2025-05-28 01:44:19', '2025-05-28 01:44:24', 'main', 'https://github.com/elnassim/Maquettes.git', NULL, NULL, NULL),
(16, 4, 1, 'Maquettes', 'main', 'UPLOAD_COMPLETE', '2025-05-28 01:45:14', NULL, NULL, 'https://s3.us-east-1.amazonaws.com/zeroops-deployments-1/2366760d-ae23-493a-ab21-d11b158db7bf/', '2366760d-ae23-493a-ab21-d11b158db7bf', '2025-05-28 01:45:13', '2025-05-28 01:45:21', 'main', 'https://github.com/elnassim/Maquettes.git', NULL, NULL, NULL),
(17, 4, 1, 'Maquettes', 'main', 'UPLOAD_COMPLETE', '2025-05-28 01:53:45', NULL, NULL, 'https://s3.us-east-1.amazonaws.com/zeroops-deployments-1/30ed1afc-dfb1-4fce-b096-6cc7c16499db/', '30ed1afc-dfb1-4fce-b096-6cc7c16499db', '2025-05-28 01:53:44', '2025-05-28 01:53:50', 'main', 'https://github.com/elnassim/Maquettes.git', NULL, NULL, NULL),
(18, 4, 1, 'Maquettes', 'main', 'UPLOAD_COMPLETE', '2025-05-28 02:22:59', NULL, NULL, 'https://s3.us-east-1.amazonaws.com/zeroops-deployments-1/54291f02-99e5-4730-91b3-953e428f9bd8/', '54291f02-99e5-4730-91b3-953e428f9bd8', '2025-05-28 02:22:59', '2025-05-28 02:23:06', 'main', 'https://github.com/elnassim/Maquettes.git', NULL, NULL, NULL),
(19, 4, 1, 'Maquettes', 'main', 'UPLOAD_COMPLETE', '2025-05-28 02:57:59', NULL, NULL, 'https://s3.us-east-1.amazonaws.com/zeroops-deployments-1/12e5b7fd-7649-4b92-aa42-e725de9ea23a/', '12e5b7fd-7649-4b92-aa42-e725de9ea23a', '2025-05-28 02:57:58', '2025-05-28 02:58:06', 'main', 'https://github.com/elnassim/Maquettes.git', NULL, NULL, NULL),
(20, 4, 1, 'Maquettes', 'main', 'UPLOAD_COMPLETE', '2025-05-28 03:19:51', NULL, NULL, 'https://s3.us-east-1.amazonaws.com/zeroops-deployments-1/d4e4e80e-00cd-41d5-bafc-4c1e28f2e2f5/', 'd4e4e80e-00cd-41d5-bafc-4c1e28f2e2f5', '2025-05-28 03:19:51', '2025-05-28 03:19:56', 'main', 'https://github.com/elnassim/Maquettes.git', NULL, NULL, NULL),
(21, 4, 1, 'Maquettes', 'main', 'UPLOAD_COMPLETE', '2025-05-28 03:30:06', NULL, NULL, 'https://s3.us-east-1.amazonaws.com/zeroops-deployments-1/2f755d9d-cf2d-4e9e-bb13-0b63f51e4def/', '2f755d9d-cf2d-4e9e-bb13-0b63f51e4def', '2025-05-28 03:30:05', '2025-05-28 03:30:11', 'main', 'https://github.com/elnassim/Maquettes.git', NULL, NULL, NULL),
(22, 4, 6, 'Maquettes', 'main', 'PENDING', '2025-05-28 04:44:42', NULL, NULL, NULL, 'cbe66564-913e-4c7e-bb55-c564c2c350f5', '2025-05-28 04:44:42', '2025-05-28 04:44:42', 'main', 'https://github.com/elnassim/Maquettes.git', NULL, NULL, 'https://github.com/elnassim/Maquettes.git'),
(23, 4, 7, 'Maquettes', 'main', 'PENDING', '2025-05-28 05:01:46', NULL, NULL, NULL, '48606889-ca24-4c5a-b752-b76e01f4ae56', '2025-05-28 05:01:45', '2025-05-28 05:01:45', 'main', 'https://github.com/elnassim/Maquettes.git', NULL, NULL, 'https://github.com/elnassim/Maquettes.git'),
(24, 4, 8, 'Maquettes', 'main', 'PENDING', '2025-05-28 06:11:11', NULL, NULL, NULL, 'a5858cf2-339e-4c45-9f84-793cd728b0cd', '2025-05-28 06:11:11', '2025-05-28 06:11:11', 'main', 'https://github.com/elnassim/Maquettes.git', NULL, NULL, 'https://github.com/elnassim/Maquettes.git'),
(25, 4, 9, 'Maquettes', 'main', 'PENDING', '2025-05-28 06:11:52', NULL, NULL, NULL, '851a2a61-1cc6-4e76-8964-43bc74c2eaa8', '2025-05-28 06:11:51', '2025-05-28 06:11:51', 'main', 'https://github.com/elnassim/Maquettes.git', NULL, NULL, 'https://github.com/elnassim/Maquettes.git'),
(26, 4, 10, 'Maquettes', 'main', 'PENDING', '2025-05-28 06:18:11', NULL, NULL, NULL, '74fb50e7-5cc1-42ee-a2e0-9d95b39af565', '2025-05-28 06:18:10', '2025-05-28 06:18:10', 'main', 'https://github.com/elnassim/Maquettes.git', NULL, NULL, 'https://github.com/elnassim/Maquettes.git'),
(27, 4, 11, 'Maquettes', 'main', 'PENDING', '2025-05-28 06:27:59', NULL, NULL, NULL, 'dd100f7e-535f-4e7d-990e-f3b59313cd60', '2025-05-28 06:27:58', '2025-05-28 06:27:58', 'main', 'https://github.com/elnassim/Maquettes.git', NULL, NULL, 'https://github.com/elnassim/Maquettes.git'),
(28, 4, 12, 'Maquettes', 'main', 'PENDING', '2025-05-28 06:32:56', NULL, NULL, NULL, '74b8d2f4-a421-4df6-8b6d-963e69670b85', '2025-05-28 06:32:56', '2025-05-28 06:32:56', 'main', 'https://github.com/elnassim/Maquettes.git', NULL, NULL, 'https://github.com/elnassim/Maquettes.git'),
(29, 4, 13, 'Maquettes', 'main', 'PENDING', '2025-05-28 06:34:01', NULL, NULL, NULL, 'f985e248-df05-4d12-8623-0af684448e3e', '2025-05-28 06:34:01', '2025-05-28 06:34:01', 'main', 'https://github.com/elnassim/Maquettes.git', NULL, NULL, 'https://github.com/elnassim/Maquettes.git'),
(30, 4, 14, 'Maquettes', 'main', 'PENDING', '2025-05-28 06:51:39', NULL, NULL, NULL, '7b711dec-288c-49cb-a9c4-b8924d21d023', '2025-05-28 06:51:38', '2025-05-28 06:51:38', 'main', 'https://github.com/elnassim/Maquettes.git', NULL, NULL, 'https://github.com/elnassim/Maquettes.git'),
(31, 4, 16, 'Maquettes', 'main', 'PENDING', '2025-05-28 07:01:38', NULL, NULL, NULL, '798eceb9-5ed7-40de-bfa5-09e4c6ff92e9', '2025-05-28 07:01:37', '2025-05-28 07:01:37', 'main', 'https://github.com/elnassim/Maquettes.git', NULL, NULL, 'https://github.com/elnassim/Maquettes.git'),
(32, 4, 17, 'Maquettes', 'main', 'PENDING', '2025-05-28 07:06:05', NULL, NULL, NULL, '0815eb21-ef0b-42ab-b9f2-029f5fd1c4e0', '2025-05-28 07:06:04', '2025-05-28 07:06:04', 'main', 'https://github.com/elnassim/Maquettes.git', NULL, NULL, 'https://github.com/elnassim/Maquettes.git'),
(33, 4, 18, 'Maquettes', 'main', 'PENDING', '2025-05-28 07:07:23', NULL, NULL, NULL, '8df2347e-d4ca-416b-b8d1-c8ed0f52b0d7', '2025-05-28 07:07:23', '2025-05-28 07:07:23', 'main', 'https://github.com/elnassim/Maquettes.git', NULL, NULL, 'https://github.com/elnassim/Maquettes.git');

-- --------------------------------------------------------

--
-- Table structure for table `environment_variables`
--

DROP TABLE IF EXISTS `environment_variables`;
CREATE TABLE IF NOT EXISTS `environment_variables` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `application_id` bigint NOT NULL,
  `var_key` varchar(255) NOT NULL,
  `var_value` text NOT NULL,
  `is_secret` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_env_vars_app` (`application_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `logs`
--

DROP TABLE IF EXISTS `logs`;
CREATE TABLE IF NOT EXISTS `logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `deployment_id` bigint NOT NULL,
  `timestamp` datetime NOT NULL,
  `message` text NOT NULL,
  `level` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKouuqc741pt95hkr7hx4tj3od6` (`deployment_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
CREATE TABLE IF NOT EXISTS `users` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `first_name` varchar(255) NOT NULL,
  `last_name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `first_name`, `last_name`, `email`, `password`, `created_at`) VALUES
(1, 'John', 'Doe', 'john.doe@example.com', 'yourSecurePassword123', '2025-05-06 16:25:26'),
(2, 'Nassim', 'El kaddaoui', 'nassimelkaddaoui18@gmail.com', 'Nassim@123', '2025-05-06 16:26:44'),
(3, 'Nassim', 'El kaddaoui', 'nassimelkaddaoui181@gmail.com', 'Wassim123@', '2025-05-09 02:08:46'),
(4, 'Nassima', 'El kaddaouia', 'nassimelkaddaouia18@gmail.com', 'Nassima123@', '2025-05-19 14:08:33');

--
-- Constraints for dumped tables
--

--
-- Constraints for table `applications`
--
ALTER TABLE `applications`
  ADD CONSTRAINT `fk_applications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `auto_scaling_configs`
--
ALTER TABLE `auto_scaling_configs`
  ADD CONSTRAINT `auto_scaling_configs_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `deployments`
--
ALTER TABLE `deployments`
  ADD CONSTRAINT `deployments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `deployments_ibfk_2` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `environment_variables`
--
ALTER TABLE `environment_variables`
  ADD CONSTRAINT `environment_variables_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
