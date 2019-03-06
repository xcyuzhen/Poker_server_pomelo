-- MySQL dump 10.13  Distrib 8.0.12, for Win64 (x86_64)
--
-- Host: localhost    Database: dbuser
-- ------------------------------------------------------
-- Server version	8.0.12

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
 SET NAMES utf8mb4 ;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `robot_info`
--

DROP TABLE IF EXISTS `robot_info`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `robot_info` (
  `id` int(10) unsigned NOT NULL,
  `mid` int(10) unsigned NOT NULL,
  `nick` varchar(45) COLLATE utf8_bin DEFAULT '',
  `sex` tinyint(1) unsigned NOT NULL DEFAULT '0',
  `gold` bigint(20) unsigned NOT NULL DEFAULT '0',
  `diamond` bigint(20) unsigned NOT NULL DEFAULT '0',
  `head_url` varchar(100) COLLATE utf8_bin NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  UNIQUE KEY `index_UNIQUE` (`id`),
  UNIQUE KEY `mid_UNIQUE` (`mid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `robot_info`
--

LOCK TABLES `robot_info` WRITE;
/*!40000 ALTER TABLE `robot_info` DISABLE KEYS */;
INSERT INTO `robot_info` VALUES (1,1001,'独守、阴晴圆缺',0,66258,0,'http://127.0.0.1:3001/head/3.png'),(2,1002,'1克拉的悲傷',1,39803,0,'http://127.0.0.1:3001/head/1.png'),(3,1003,'与君绝',0,36026,0,'http://127.0.0.1:3001/head/4.png'),(4,1004,'指舞花',1,30155,0,'http://127.0.0.1:3001/head/2.png'),(5,1005,'清风拂面',0,56596,0,'http://127.0.0.1:3001/head/5.png'),(6,1006,'匀散一缕过往',1,180195,0,'http://127.0.0.1:3001/head/8.png'),(7,1007,'静看°季花开花落',0,112006,0,'http://127.0.0.1:3001/head/7.png'),(8,1008,'风月不等闲',1,150188,0,'http://127.0.0.1:3001/head/9.png'),(9,1009,'年少不知青衫薄',0,174744,0,'http://127.0.0.1:3001/head/12.png'),(10,1010,'浅安时光',1,108494,0,'http://127.0.0.1:3001/head/14.png'),(11,1011,'笙歌醉梦',0,260542,0,'http://127.0.0.1:3001/head/17.png'),(12,1012,'浣歌',1,460269,0,'http://127.0.0.1:3001/head/15.png'),(13,1013,'天国佳人',0,266813,0,'http://127.0.0.1:3001/head/24.png'),(14,1014,'恰似旧人归',1,311676,0,'http://127.0.0.1:3001/head/16.png'),(15,1015,'风晴雪流成河',0,247636,0,'http://127.0.0.1:3001/head/26.png'),(16,1016,'闲人不梦君',1,9871,0,'http://127.0.0.1:3001/head/19.png'),(17,1017,'醉袭湘酒',0,5984,0,'http://127.0.0.1:3001/head/42.png'),(18,1018,'裙下三千臣',1,6985,0,'http://127.0.0.1:3001/head/21.png'),(19,1019,'寄予清风',0,9628,0,'http://127.0.0.1:3001/head/37.png'),(20,1020,'西子病如娇',1,6388,0,'http://127.0.0.1:3001/head/33.png');
/*!40000 ALTER TABLE `robot_info` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_info`
--

DROP TABLE IF EXISTS `user_info`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `user_info` (
  `mid` int(10) NOT NULL AUTO_INCREMENT,
  `udid` varchar(50) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `nick` varchar(45) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT '',
  `sex` tinyint(1) unsigned NOT NULL DEFAULT '0',
  `gold` bigint(20) unsigned NOT NULL DEFAULT '0',
  `diamond` bigint(20) unsigned NOT NULL DEFAULT '0',
  `head_url` varchar(100) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT '',
  `appid` varchar(50) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  PRIMARY KEY (`mid`),
  UNIQUE KEY `mid_UNIQUE` (`mid`),
  UNIQUE KEY `udid_UNIQUE` (`udid`),
  UNIQUE KEY `appid_UNIQUE` (`appid`)
) ENGINE=InnoDB AUTO_INCREMENT=10010 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_info`
--

LOCK TABLES `user_info` WRITE;
/*!40000 ALTER TABLE `user_info` DISABLE KEYS */;
INSERT INTO `user_info` VALUES (10000,'yuzhenudidguest1','游客10000',0,0,0,'','yuzhenudidguest1'),(10008,'yuzhenudidguest2','游客10008',0,5000,0,'','yuzhenudidguest2'),(10009,'yuzhenudidguest3','游客10009',0,0,0,'','yuzhenudidguest3');
/*!40000 ALTER TABLE `user_info` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2019-03-06 10:40:20
