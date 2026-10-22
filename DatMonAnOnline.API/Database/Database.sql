-- FOODIE - SINGLE DATABASE INSTALLER
-- WARNING: Running this file deletes the existing DatMonAnOnline database.
-- This is the only SQL file required to initialize the project.

DROP DATABASE IF EXISTS `DatMonAnOnline`;
CREATE DATABASE `DatMonAnOnline`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE `DatMonAnOnline`;

-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: datmonanonline
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `chitietdoisoat`
--

DROP TABLE IF EXISTS `chitietdoisoat`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chitietdoisoat` (
  `MaChiTietDoiSoat` int NOT NULL AUTO_INCREMENT,
  `MaDoiSoat` int NOT NULL,
  `MaDonHang` int NOT NULL,
  `MaNhaHang` int NOT NULL,
  `TongTienHang` decimal(18,0) NOT NULL,
  `GiamGiaNhaHang` decimal(18,0) NOT NULL DEFAULT '0',
  `GiamGiaHeThong` decimal(18,0) NOT NULL DEFAULT '0',
  `PhiShip` decimal(18,0) NOT NULL DEFAULT '0',
  `TyLePhiNenTang` decimal(5,2) NOT NULL DEFAULT '0.00',
  `PhiNenTang` decimal(18,0) NOT NULL DEFAULT '0',
  `SoTienHoan` decimal(18,0) NOT NULL DEFAULT '0',
  `SoTienNhaHangNhan` decimal(18,0) NOT NULL DEFAULT '0',
  `TienNhaHangDaThu` decimal(18,0) NOT NULL DEFAULT '0',
  `SoTienCanDoiSoat` decimal(18,0) GENERATED ALWAYS AS ((`SoTienNhaHangNhan` - `TienNhaHangDaThu`)) STORED,
  `NgayThem` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`MaChiTietDoiSoat`),
  UNIQUE KEY `UQ_ChiTietDoiSoat_DonHang` (`MaDonHang`),
  KEY `IX_ChiTietDoiSoat_Ky_NhaHang` (`MaDoiSoat`,`MaNhaHang`),
  KEY `IX_ChiTietDoiSoat_DonHang_NhaHang` (`MaDonHang`,`MaNhaHang`),
  CONSTRAINT `FK_ChiTietDoiSoat_DonHang_NhaHang` FOREIGN KEY (`MaDonHang`, `MaNhaHang`) REFERENCES `donhang` (`MaDonHang`, `MaNhaHang`),
  CONSTRAINT `FK_ChiTietDoiSoat_Ky_NhaHang` FOREIGN KEY (`MaDoiSoat`, `MaNhaHang`) REFERENCES `doisoatnhahang` (`MaDoiSoat`, `MaNhaHang`),
  CONSTRAINT `CK_ChiTietDoiSoat_SoTien` CHECK (((`TongTienHang` >= 0) and (`GiamGiaNhaHang` >= 0) and (`GiamGiaHeThong` >= 0) and (`PhiShip` >= 0) and (`PhiNenTang` >= 0) and (`SoTienHoan` >= 0) and (`SoTienNhaHangNhan` >= 0) and (`TienNhaHangDaThu` >= 0))),
  CONSTRAINT `CK_ChiTietDoiSoat_TyLePhi` CHECK ((`TyLePhiNenTang` between 0 and 100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chitietdoisoat`
--

LOCK TABLES `chitietdoisoat` WRITE;
/*!40000 ALTER TABLE `chitietdoisoat` DISABLE KEYS */;
/*!40000 ALTER TABLE `chitietdoisoat` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chitietdonhang`
--

DROP TABLE IF EXISTS `chitietdonhang`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chitietdonhang` (
  `MaChiTietDonHang` int NOT NULL AUTO_INCREMENT,
  `MaDonHang` int NOT NULL,
  `MaMonAn` int NOT NULL,
  `TenMonAnLucDat` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `SoLuong` int NOT NULL,
  `DonGia` decimal(18,0) NOT NULL,
  `ThanhTien` decimal(18,0) NOT NULL,
  `GhiChu` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`MaChiTietDonHang`),
  KEY `FK_ChiTietDonHang_DonHang` (`MaDonHang`),
  KEY `FK_ChiTietDonHang_MonAn` (`MaMonAn`),
  CONSTRAINT `FK_ChiTietDonHang_DonHang` FOREIGN KEY (`MaDonHang`) REFERENCES `donhang` (`MaDonHang`),
  CONSTRAINT `FK_ChiTietDonHang_MonAn` FOREIGN KEY (`MaMonAn`) REFERENCES `monan` (`MaMonAn`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chitietdonhang`
--

LOCK TABLES `chitietdonhang` WRITE;
/*!40000 ALTER TABLE `chitietdonhang` DISABLE KEYS */;
INSERT INTO `chitietdonhang` VALUES (1,1,1,'Trà Sữa Phúc Long',1,45000,45000,NULL),(2,2,1,'Trà Sữa Phúc Long',1,45000,45000,NULL),(3,2,2,'Trà Đào Cam Sả',1,50000,50000,NULL),(4,3,1,'Trà Sữa Phúc Long',1,45000,55000,NULL),(5,4,4,'Sữa tươi',1,20000,20000,NULL),(6,5,1,'Trà Sữa Phúc Long',1,45000,73000,NULL),(7,6,4,'Sữa tươi',1,20000,20000,NULL),(8,7,1,'Trà Sữa Phúc Long',1,45000,45000,NULL),(9,7,3,'Cà Phê Sữa Đá',1,35000,35000,NULL),(10,8,4,'Sữa tươi',1,20000,20000,NULL),(11,9,4,'Sữa tươi',1,20000,20000,NULL),(12,10,2,'Trà Đào Cam Sả',1,50000,50000,NULL),(13,10,1,'Trà Sữa Phúc Long',1,45000,53000,NULL),(14,11,4,'Sữa tươi',1,20000,20000,NULL),(15,12,4,'Sữa tươi',1,20000,28000,NULL),(16,13,4,'Sữa tươi',1,20000,20000,NULL),(17,14,4,'Sữa tươi',1,20000,20000,NULL),(18,15,4,'Sữa tươi',1,20000,20000,NULL),(19,16,4,'Sữa tươi',1,20000,20000,NULL),(20,17,4,'Sữa tươi',1,20000,28000,NULL),(21,18,4,'Sữa tươi',2,20000,56000,NULL),(22,18,4,'Sữa tươi',1,20000,20000,NULL),(23,18,4,'Sữa tươi',1,20000,20000,NULL),(24,18,4,'Sữa tươi',1,20000,20000,NULL),(25,19,4,'Sữa tươi',1,20000,20000,NULL),(26,20,4,'Sữa tươi',1,20000,20000,NULL),(27,21,4,'Sữa tươi',2,20000,40000,NULL);
/*!40000 ALTER TABLE `chitietdonhang` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chitietdonhang_topping`
--

DROP TABLE IF EXISTS `chitietdonhang_topping`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chitietdonhang_topping` (
  `MaChiTietDonHang` int NOT NULL,
  `MaTopping` int NOT NULL,
  `TenToppingLucDat` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `SoLuong` int NOT NULL DEFAULT '1',
  `GiaThemLucDat` decimal(18,0) NOT NULL,
  PRIMARY KEY (`MaChiTietDonHang`,`MaTopping`),
  KEY `FK_CTDHTopping_Topping` (`MaTopping`),
  CONSTRAINT `FK_CTDHTopping_ChiTietDonHang` FOREIGN KEY (`MaChiTietDonHang`) REFERENCES `chitietdonhang` (`MaChiTietDonHang`),
  CONSTRAINT `FK_CTDHTopping_Topping` FOREIGN KEY (`MaTopping`) REFERENCES `topping` (`MaTopping`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chitietdonhang_topping`
--

LOCK TABLES `chitietdonhang_topping` WRITE;
/*!40000 ALTER TABLE `chitietdonhang_topping` DISABLE KEYS */;
INSERT INTO `chitietdonhang_topping` VALUES (1,2,'Size L (Lớn)',1,10000),(1,3,'Trân châu đen',1,10000),(2,1,'Size M (Vừa)',1,0),(4,2,'Size L (Lớn)',1,10000),(6,2,'Size L (Lớn)',1,10000),(6,3,'Trân châu đen',1,10000),(6,4,'Thạch lô hội',1,8000),(8,1,'Size M (Vừa)',1,0),(11,7,'vừa',1,0),(11,8,'L',1,0),(13,1,'Size M (Vừa)',1,0),(13,4,'Thạch lô hội',1,8000),(15,5,'Trân châu',1,8000),(20,5,'Trân châu',1,8000),(20,9,'M',1,0),(21,5,'Trân châu',1,8000),(21,8,'L',1,0);
/*!40000 ALTER TABLE `chitietdonhang_topping` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chitietgiohang`
--

DROP TABLE IF EXISTS `chitietgiohang`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chitietgiohang` (
  `MaChiTietGioHang` int NOT NULL AUTO_INCREMENT,
  `MaGioHang` int NOT NULL,
  `MaMonAn` int NOT NULL,
  `SoLuong` int NOT NULL DEFAULT '1',
  `GhiChu` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`MaChiTietGioHang`),
  KEY `FK_ChiTietGioHang_GioHang` (`MaGioHang`),
  KEY `FK_ChiTietGioHang_MonAn` (`MaMonAn`),
  CONSTRAINT `FK_ChiTietGioHang_GioHang` FOREIGN KEY (`MaGioHang`) REFERENCES `giohang` (`MaGioHang`),
  CONSTRAINT `FK_ChiTietGioHang_MonAn` FOREIGN KEY (`MaMonAn`) REFERENCES `monan` (`MaMonAn`)
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chitietgiohang`
--

LOCK TABLES `chitietgiohang` WRITE;
/*!40000 ALTER TABLE `chitietgiohang` DISABLE KEYS */;
/*!40000 ALTER TABLE `chitietgiohang` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chitietgiohang_topping`
--

DROP TABLE IF EXISTS `chitietgiohang_topping`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chitietgiohang_topping` (
  `MaChiTietGioHang` int NOT NULL,
  `MaTopping` int NOT NULL,
  `SoLuong` int NOT NULL DEFAULT '1',
  `GiaThem` decimal(18,0) NOT NULL,
  PRIMARY KEY (`MaChiTietGioHang`,`MaTopping`),
  KEY `FK_CTGHTopping_Topping` (`MaTopping`),
  CONSTRAINT `FK_CTGHTopping_ChiTietGioHang` FOREIGN KEY (`MaChiTietGioHang`) REFERENCES `chitietgiohang` (`MaChiTietGioHang`),
  CONSTRAINT `FK_CTGHTopping_Topping` FOREIGN KEY (`MaTopping`) REFERENCES `topping` (`MaTopping`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chitietgiohang_topping`
--

LOCK TABLES `chitietgiohang_topping` WRITE;
/*!40000 ALTER TABLE `chitietgiohang_topping` DISABLE KEYS */;
/*!40000 ALTER TABLE `chitietgiohang_topping` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `danhgiamonan`
--

DROP TABLE IF EXISTS `danhgiamonan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `danhgiamonan` (
  `MaDanhGia` int NOT NULL AUTO_INCREMENT,
  `MaKhachHang` int NOT NULL,
  `MaMonAn` int NOT NULL,
  `MaDonHang` int NOT NULL,
  `SoSao` tinyint NOT NULL,
  `NoiDung` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `HinhAnh` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `NgayDanhGia` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`MaDanhGia`),
  UNIQUE KEY `UQ_DanhGiaMonAn` (`MaKhachHang`,`MaMonAn`,`MaDonHang`),
  KEY `FK_DanhGiaMonAn_MonAn` (`MaMonAn`),
  KEY `FK_DanhGiaMonAn_DonHang` (`MaDonHang`),
  CONSTRAINT `FK_DanhGiaMonAn_DonHang` FOREIGN KEY (`MaDonHang`) REFERENCES `donhang` (`MaDonHang`),
  CONSTRAINT `FK_DanhGiaMonAn_KhachHang` FOREIGN KEY (`MaKhachHang`) REFERENCES `khachhang` (`MaKhachHang`),
  CONSTRAINT `FK_DanhGiaMonAn_MonAn` FOREIGN KEY (`MaMonAn`) REFERENCES `monan` (`MaMonAn`),
  CONSTRAINT `CK_DanhGiaMonAn_SoSao` CHECK ((`SoSao` between 1 and 5))
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `danhgiamonan`
--

LOCK TABLES `danhgiamonan` WRITE;
/*!40000 ALTER TABLE `danhgiamonan` DISABLE KEYS */;
INSERT INTO `danhgiamonan` VALUES (1,1,1,1,5,'Trà sữa ngon, giao hàng nhanh!',NULL,'2026-09-25 13:47:22'),(2,4,4,6,5,NULL,NULL,'2026-10-06 00:40:20'),(3,4,4,8,5,NULL,NULL,'2026-10-06 00:56:50'),(4,4,4,9,1,'that is so bad',NULL,'2026-10-06 18:43:31'),(5,4,4,12,1,NULL,NULL,'2026-10-06 18:51:41'),(6,4,4,16,5,NULL,NULL,'2026-10-07 01:31:44'),(7,4,4,17,2,NULL,NULL,'2026-10-08 01:57:02');
/*!40000 ALTER TABLE `danhgiamonan` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `danhgianhahang`
--

DROP TABLE IF EXISTS `danhgianhahang`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `danhgianhahang` (
  `MaDanhGia` int NOT NULL AUTO_INCREMENT,
  `MaKhachHang` int NOT NULL,
  `MaNhaHang` int NOT NULL,
  `MaDonHang` int NOT NULL,
  `SoSao` tinyint NOT NULL,
  `NoiDung` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `NgayDanhGia` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`MaDanhGia`),
  UNIQUE KEY `UQ_DanhGiaNhaHang` (`MaKhachHang`,`MaNhaHang`,`MaDonHang`),
  KEY `FK_DanhGiaNhaHang_NhaHang` (`MaNhaHang`),
  KEY `FK_DanhGiaNhaHang_DonHang` (`MaDonHang`),
  CONSTRAINT `FK_DanhGiaNhaHang_DonHang` FOREIGN KEY (`MaDonHang`) REFERENCES `donhang` (`MaDonHang`),
  CONSTRAINT `FK_DanhGiaNhaHang_KhachHang` FOREIGN KEY (`MaKhachHang`) REFERENCES `khachhang` (`MaKhachHang`),
  CONSTRAINT `FK_DanhGiaNhaHang_NhaHang` FOREIGN KEY (`MaNhaHang`) REFERENCES `nhahang` (`MaNhaHang`),
  CONSTRAINT `CK_DanhGiaNhaHang_SoSao` CHECK ((`SoSao` between 1 and 5))
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `danhgianhahang`
--

LOCK TABLES `danhgianhahang` WRITE;
/*!40000 ALTER TABLE `danhgianhahang` DISABLE KEYS */;
INSERT INTO `danhgianhahang` VALUES (1,4,3,6,5,NULL,'2026-10-06 00:40:17'),(2,4,3,8,5,NULL,'2026-10-06 00:56:48'),(3,4,3,9,4,NULL,'2026-10-06 18:43:20'),(4,4,3,12,5,NULL,'2026-10-06 18:51:35'),(5,4,3,16,5,NULL,'2026-10-07 01:31:39'),(6,4,3,17,5,NULL,'2026-10-08 01:56:59');
/*!40000 ALTER TABLE `danhgianhahang` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `danhmuc`
--

DROP TABLE IF EXISTS `danhmuc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `danhmuc` (
  `MaDanhMuc` int NOT NULL AUTO_INCREMENT,
  `MaNhaHang` int NOT NULL,
  `TenDanhMuc` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `ThuTuHienThi` int DEFAULT NULL,
  PRIMARY KEY (`MaDanhMuc`),
  KEY `FK_DanhMuc_NhaHang` (`MaNhaHang`),
  CONSTRAINT `FK_DanhMuc_NhaHang` FOREIGN KEY (`MaNhaHang`) REFERENCES `nhahang` (`MaNhaHang`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `danhmuc`
--

LOCK TABLES `danhmuc` WRITE;
/*!40000 ALTER TABLE `danhmuc` DISABLE KEYS */;
INSERT INTO `danhmuc` VALUES (1,1,'Trà Sữa',1),(2,1,'Cà Phê',2),(3,3,'Trà sữa',1),(4,3,'Cà phê',1);
/*!40000 ALTER TABLE `danhmuc` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `diachi`
--

DROP TABLE IF EXISTS `diachi`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `diachi` (
  `MaDiaChi` int NOT NULL AUTO_INCREMENT,
  `MaKhachHang` int NOT NULL,
  `TenNguoiNhan` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `SoDienThoaiNhan` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `DiaChiCuThe` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `GhiChu` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `MacDinh` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`MaDiaChi`),
  KEY `FK_DiaChi_KhachHang` (`MaKhachHang`),
  CONSTRAINT `FK_DiaChi_KhachHang` FOREIGN KEY (`MaKhachHang`) REFERENCES `khachhang` (`MaKhachHang`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `diachi`
--

LOCK TABLES `diachi` WRITE;
/*!40000 ALTER TABLE `diachi` DISABLE KEYS */;
INSERT INTO `diachi` VALUES (1,1,'Nguyễn Văn Khách (Công ty)','0903333333','Tòa nhà Bitexco, Q1, TP.HCM',NULL,1),(2,1,'Nguyễn Văn Khách (Nhà)','0903333333','Hẻm 12 CMT8, Q10, TP.HCM',NULL,0),(3,4,'Tran Ba C','0907113821','1211, Tran Hung Dao',NULL,1);
/*!40000 ALTER TABLE `diachi` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `doisoatnhahang`
--

DROP TABLE IF EXISTS `doisoatnhahang`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `doisoatnhahang` (
  `MaDoiSoat` int NOT NULL AUTO_INCREMENT,
  `MaNhaHang` int NOT NULL,
  `MaTaiKhoanDuyet` int DEFAULT NULL,
  `TuNgay` date NOT NULL,
  `DenNgay` date NOT NULL,
  `TongSoDon` int NOT NULL DEFAULT '0',
  `TongTienHang` decimal(18,0) NOT NULL DEFAULT '0',
  `TongGiamGiaNhaHang` decimal(18,0) NOT NULL DEFAULT '0',
  `TongGiamGiaHeThong` decimal(18,0) NOT NULL DEFAULT '0',
  `TongPhiShip` decimal(18,0) NOT NULL DEFAULT '0',
  `TongPhiNenTang` decimal(18,0) NOT NULL DEFAULT '0',
  `TongTienHoan` decimal(18,0) NOT NULL DEFAULT '0',
  `TongTienNhaHangNhan` decimal(18,0) NOT NULL DEFAULT '0',
  `TongTienNhaHangDaThu` decimal(18,0) NOT NULL DEFAULT '0',
  `SoTienCanDoiSoat` decimal(18,0) GENERATED ALWAYS AS ((`TongTienNhaHangNhan` - `TongTienNhaHangDaThu`)) STORED,
  `TrangThai` enum('MoiTao','ChoXacNhan','DaXacNhan','DaThanhToan','TranhChap') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MoiTao',
  `MaGiaoDichDoiSoat` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `GhiChu` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `NgayTao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `NgayXacNhan` datetime DEFAULT NULL,
  `NgayThanhToan` datetime DEFAULT NULL,
  PRIMARY KEY (`MaDoiSoat`),
  UNIQUE KEY `UQ_DoiSoat_Ky` (`MaNhaHang`,`TuNgay`,`DenNgay`),
  UNIQUE KEY `UQ_DoiSoat_MaGiaoDich` (`MaGiaoDichDoiSoat`),
  UNIQUE KEY `UQ_DoiSoat_Ma_NhaHang` (`MaDoiSoat`,`MaNhaHang`),
  KEY `IX_DoiSoat_NhaHang_TrangThai` (`MaNhaHang`,`TrangThai`),
  KEY `IX_DoiSoat_NhaHang_MaDoiSoat` (`MaNhaHang`,`MaDoiSoat`),
  KEY `FK_DoiSoat_NguoiDuyet` (`MaTaiKhoanDuyet`),
  CONSTRAINT `FK_DoiSoat_NguoiDuyet` FOREIGN KEY (`MaTaiKhoanDuyet`) REFERENCES `taikhoan` (`MaTaiKhoan`),
  CONSTRAINT `FK_DoiSoat_NhaHang` FOREIGN KEY (`MaNhaHang`) REFERENCES `nhahang` (`MaNhaHang`),
  CONSTRAINT `CK_DoiSoat_SoLieu` CHECK (((`TongSoDon` >= 0) and (`TongTienHang` >= 0) and (`TongGiamGiaNhaHang` >= 0) and (`TongGiamGiaHeThong` >= 0) and (`TongPhiShip` >= 0) and (`TongPhiNenTang` >= 0) and (`TongTienHoan` >= 0) and (`TongTienNhaHangNhan` >= 0) and (`TongTienNhaHangDaThu` >= 0))),
  CONSTRAINT `CK_DoiSoat_ThoiGian` CHECK ((`DenNgay` >= `TuNgay`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `doisoatnhahang`
--

LOCK TABLES `doisoatnhahang` WRITE;
/*!40000 ALTER TABLE `doisoatnhahang` DISABLE KEYS */;
/*!40000 ALTER TABLE `doisoatnhahang` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `donhang`
--

DROP TABLE IF EXISTS `donhang`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `donhang` (
  `MaDonHang` int NOT NULL AUTO_INCREMENT,
  `MaDonHangHienThi` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `MaKhachHang` int NOT NULL,
  `MaNhaHang` int NOT NULL,
  `TenNhaHangLucDat` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `MaDiaChi` int DEFAULT NULL,
  `MaTrangThai` int NOT NULL,
  `MaKhuyenMai` int DEFAULT NULL,
  `ThoiGianDat` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ThoiGianGiaoDuKien` datetime DEFAULT NULL,
  `ThoiGianGiaoThucTe` datetime DEFAULT NULL,
  `TenNguoiNhan` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `SoDienThoaiNhan` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `DiaChiGiaoHang` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `TongTienHang` decimal(18,0) NOT NULL,
  `PhiShip` decimal(18,0) NOT NULL DEFAULT '0',
  `SoTienGiam` decimal(18,0) NOT NULL DEFAULT '0',
  `ThanhTien` decimal(18,0) NOT NULL,
  `GhiChu` varchar(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `LyDoHuy` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `MaHopDong` int DEFAULT NULL,
  `TyLePhiNenTang` decimal(5,2) NOT NULL DEFAULT '0.00',
  `GiamGiaNhaHang` decimal(18,0) NOT NULL DEFAULT '0',
  `GiamGiaHeThong` decimal(18,0) NOT NULL DEFAULT '0',
  `PhiNenTang` decimal(18,0) NOT NULL DEFAULT '0',
  `SoTienNhaHangNhan` decimal(18,0) NOT NULL DEFAULT '0',
  PRIMARY KEY (`MaDonHang`),
  UNIQUE KEY `MaDonHangHienThi` (`MaDonHangHienThi`),
  UNIQUE KEY `UQ_DonHang_Ma_NhaHang` (`MaDonHang`,`MaNhaHang`),
  KEY `FK_DonHang_KhachHang` (`MaKhachHang`),
  KEY `FK_DonHang_NhaHang` (`MaNhaHang`),
  KEY `FK_DonHang_DiaChi` (`MaDiaChi`),
  KEY `FK_DonHang_TrangThai` (`MaTrangThai`),
  KEY `FK_DonHang_KhuyenMai` (`MaKhuyenMai`),
  KEY `IX_DonHang_HopDong_NhaHang` (`MaHopDong`,`MaNhaHang`),
  KEY `IX_DonHang_DoiSoat` (`MaNhaHang`,`MaTrangThai`,`ThoiGianGiaoThucTe`,`MaDonHang`),
  CONSTRAINT `FK_DonHang_DiaChi` FOREIGN KEY (`MaDiaChi`) REFERENCES `diachi` (`MaDiaChi`) ON DELETE SET NULL,
  CONSTRAINT `FK_DonHang_HopDong_NhaHang` FOREIGN KEY (`MaHopDong`, `MaNhaHang`) REFERENCES `hopdongnhahang` (`MaHopDong`, `MaNhaHang`),
  CONSTRAINT `FK_DonHang_KhachHang` FOREIGN KEY (`MaKhachHang`) REFERENCES `khachhang` (`MaKhachHang`),
  CONSTRAINT `FK_DonHang_KhuyenMai` FOREIGN KEY (`MaKhuyenMai`) REFERENCES `khuyenmai` (`MaKhuyenMai`),
  CONSTRAINT `FK_DonHang_NhaHang` FOREIGN KEY (`MaNhaHang`) REFERENCES `nhahang` (`MaNhaHang`),
  CONSTRAINT `FK_DonHang_TrangThai` FOREIGN KEY (`MaTrangThai`) REFERENCES `trangthaidonhang` (`MaTrangThai`),
  CONSTRAINT `CK_DonHang_PhiVaGiamGia` CHECK (((`PhiNenTang` >= 0) and (`GiamGiaNhaHang` >= 0) and (`GiamGiaHeThong` >= 0) and (`SoTienNhaHangNhan` >= 0))),
  CONSTRAINT `CK_DonHang_TyLePhi` CHECK ((`TyLePhiNenTang` between 0 and 100))
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `donhang`
--

LOCK TABLES `donhang` WRITE;
/*!40000 ALTER TABLE `donhang` DISABLE KEYS */;
INSERT INTO `donhang` VALUES (1,'DH-PL-000001',1,1,'Phúc Long Coffee & Tea',1,5,NULL,'2026-09-25 13:47:21',NULL,NULL,'Nguyễn Văn Khách (Công ty)','0903333333','Tòa nhà Bitexco, Q1, TP.HCM',65000,15000,0,80000,'Ít đá, nhiều ngọt',NULL,NULL,0.00,0,0,0,80000),(2,'DH261005-2375',4,1,'Phúc Long Coffee & Tea',3,1,NULL,'2026-10-05 20:32:50',NULL,NULL,'Tran Ba C','0907113821','1211, Tran Hung Dao',95000,15000,0,110000,'',NULL,NULL,0.00,0,0,0,0),(3,'DH261005-8121',4,1,'Phúc Long Coffee & Tea',3,6,NULL,'2026-10-05 20:54:01',NULL,NULL,'Tran Ba C','0907113821','1211, Tran Hung Dao',55000,15000,0,70000,'','Hell elo',NULL,0.00,0,0,0,0),(4,'DH261005-9842',4,3,'Nhà Hàng Test 123',3,5,NULL,'2026-10-05 21:40:00',NULL,'2026-10-05 21:40:45','Tran Ba C','0907113821','1211, Tran Hung Dao',20000,15000,0,35000,'',NULL,NULL,0.00,0,0,0,0),(5,'DH261005-9249',4,1,'Phúc Long Coffee & Tea',3,1,NULL,'2026-10-05 21:48:29',NULL,NULL,'Tran Ba C','0907113821','1211, Tran Hung Dao',73000,15000,0,88000,'',NULL,NULL,0.00,0,0,0,0),(6,'DH261005-4531',4,3,'Nhà Hàng Test 123',3,5,NULL,'2026-10-05 21:59:54',NULL,'2026-10-05 22:00:11','Tran Ba C','0907113821','1211, Tran Hung Dao',20000,15000,0,35000,'',NULL,NULL,0.00,0,0,0,0),(7,'DH261006-1380',4,1,'Phúc Long Coffee & Tea',3,1,NULL,'2026-10-06 00:39:52',NULL,NULL,'Tran Ba C','0907113821','1211, Tran Hung Dao',80000,15000,0,95000,'',NULL,NULL,0.00,0,0,0,0),(8,'DH261006-1785',4,3,'Nhà Hàng Test 123',3,5,6,'2026-10-06 00:55:39',NULL,'2026-10-06 00:55:56','Tran Ba C','0907113821','1211, Tran Hung Dao',20000,15000,2000,33000,'',NULL,NULL,0.00,0,0,0,0),(9,'DH261006-5139',4,3,'Nhà Hàng Test 123',3,5,NULL,'2026-10-06 02:54:40',NULL,'2026-10-06 18:38:29','Tran Ba C','0907113821','1211, Tran Hung Dao',20000,15000,0,35000,'',NULL,NULL,0.00,0,0,0,0),(10,'DH261006-8865',4,1,'Phúc Long Coffee & Tea',3,6,NULL,'2026-10-06 18:31:20',NULL,NULL,'Tran Ba C','0907113821','1211, Tran Hung Dao',103000,15000,0,118000,'','tôi muốn đổi món',NULL,0.00,0,0,0,0),(11,'DH261006-9071',4,3,'Nhà Hàng Test 123',3,6,NULL,'2026-10-06 18:46:16',NULL,NULL,'Tran Ba C','0907113821','1211, Tran Hung Dao',20000,15000,0,35000,'','Hệ thống tự hủy do thanh toán online quá hạn 15 phút.',NULL,0.00,0,0,0,0),(12,'DH261006-7924',4,3,'Nhà Hàng Test 123',3,5,NULL,'2026-10-06 18:51:04',NULL,'2026-10-06 18:51:18','Tran Ba C','0907113821','1211, Tran Hung Dao',28000,15000,0,43000,'',NULL,NULL,0.00,0,0,0,0),(13,'DH261006-9687',4,3,'Nhà Hàng Test 123',3,5,NULL,'2026-10-06 19:02:40',NULL,'2026-10-06 19:03:04','Tran Ba C','0907113821','1211, Tran Hung Dao',20000,15000,0,35000,'',NULL,NULL,0.00,0,0,0,0),(14,'DH261007-5304',4,3,'Nhà Hàng Test 123',3,1,NULL,'2026-10-07 00:54:55',NULL,NULL,'Tran Ba C','0907113821','1211, Tran Hung Dao',20000,15000,0,35000,'',NULL,NULL,0.00,0,0,0,0),(15,'DH261007-1547',4,3,'Nhà Hàng Test 123',3,5,NULL,'2026-10-07 01:17:34',NULL,'2026-10-07 01:21:52','Tran Ba C','0907113821','1211, Tran Hung Dao',20000,15000,0,35000,'',NULL,NULL,0.00,0,0,0,0),(16,'DH261007-4042',4,3,'Nhà Hàng Test 123',3,5,NULL,'2026-10-07 01:22:11',NULL,'2026-10-07 01:31:28','Tran Ba C','0907113821','1211, Tran Hung Dao',20000,15000,0,35000,'',NULL,NULL,0.00,0,0,0,0),(17,'DH261007-1539',4,3,'Nhà Hàng Test 123',3,5,NULL,'2026-10-07 23:13:16',NULL,'2026-10-07 23:13:55','Tran Ba C','0907113821','1211, Tran Hung Dao',28000,15000,0,43000,'',NULL,NULL,0.00,0,0,0,0),(18,'DH261008-8562',4,3,'Nhà Hàng Test 123',3,6,1,'2026-10-08 01:31:37',NULL,NULL,'Tran Ba C','0907113821','1211, Tran Hung Dao',116000,15000,20880,110120,'','đổi',NULL,0.00,0,0,0,0),(19,'DH261008-1728',4,3,'Nhà Hàng Test 123',3,2,NULL,'2026-10-08 02:04:25',NULL,NULL,'Tran Ba C','0907113821','1211, Tran Hung Dao',20000,15000,0,35000,'',NULL,NULL,0.00,0,0,0,0),(20,'DH261008-8488',4,3,'Nhà Hàng Test 123',3,5,NULL,'2026-10-08 06:47:34',NULL,'2026-10-09 22:32:29','Tran Ba C','0907113821','1211, Tran Hung Dao',20000,15000,0,35000,'',NULL,NULL,0.00,0,0,0,0),(21,'DH261012-4706',4,3,'Nhà Hàng Test 123',3,1,NULL,'2026-10-12 00:23:47',NULL,NULL,'Tran Ba C','0907113821','1211, Tran Hung Dao',40000,15000,0,55000,'',NULL,NULL,0.00,0,0,0,0);
/*!40000 ALTER TABLE `donhang` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `giohang`
--

DROP TABLE IF EXISTS `giohang`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `giohang` (
  `MaGioHang` int NOT NULL AUTO_INCREMENT,
  `MaKhachHang` int NOT NULL,
  `NgayCapNhat` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `GiuCheckoutDenUtc` datetime(6) DEFAULT NULL,
  `MaNhaHang` int NOT NULL,
  PRIMARY KEY (`MaGioHang`),
  UNIQUE KEY `UQ_GioHang_KhachHang_NhaHang` (`MaKhachHang`,`MaNhaHang`),
  KEY `IX_GioHang_GiuCheckoutDenUtc` (`GiuCheckoutDenUtc`),
  KEY `FK_GioHang_NhaHang` (`MaNhaHang`),
  CONSTRAINT `FK_GioHang_KhachHang` FOREIGN KEY (`MaKhachHang`) REFERENCES `khachhang` (`MaKhachHang`),
  CONSTRAINT `FK_GioHang_NhaHang` FOREIGN KEY (`MaNhaHang`) REFERENCES `nhahang` (`MaNhaHang`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `giohang`
--

LOCK TABLES `giohang` WRITE;
/*!40000 ALTER TABLE `giohang` DISABLE KEYS */;
INSERT INTO `giohang` VALUES (5,4,'2026-10-06 21:40:07',NULL,1),(6,4,'2026-10-12 00:15:38',NULL,3);
/*!40000 ALTER TABLE `giohang` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hoantien`
--

DROP TABLE IF EXISTS `hoantien`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hoantien` (
  `MaHoanTien` int NOT NULL AUTO_INCREMENT,
  `MaThanhToan` int NOT NULL,
  `MaDonHang` int NOT NULL,
  `MaTaiKhoanYeuCau` int DEFAULT NULL,
  `MaTaiKhoanXuLy` int DEFAULT NULL,
  `SoTienHoan` decimal(18,0) NOT NULL,
  `LyDoHoan` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `KenhHoanTien` enum('MoMo','ZaloPay','VNPay','ChuyenKhoan','ThuCong','FoodPay') COLLATE utf8mb4_unicode_ci NOT NULL,
  `TrangThai` enum('ChoXuLy','DangXuLy','ThanhCong','ThatBai') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ChoXuLy',
  `MaYeuCauHoan` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `MaGiaoDichHoan` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `NoiDungLoi` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ThoiGianYeuCau` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ThoiGianXuLy` datetime DEFAULT NULL,
  `ThoiGianHoanThanh` datetime DEFAULT NULL,
  `NgayCapNhat` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`MaHoanTien`),
  UNIQUE KEY `UQ_HoanTien_ThanhToan` (`MaThanhToan`),
  UNIQUE KEY `UQ_HoanTien_MaYeuCau` (`MaYeuCauHoan`),
  UNIQUE KEY `UQ_HoanTien_Kenh_MaGiaoDich` (`KenhHoanTien`,`MaGiaoDichHoan`),
  KEY `IX_HoanTien_DonHang` (`MaDonHang`),
  KEY `IX_HoanTien_TrangThai` (`TrangThai`),
  KEY `FK_HoanTien_ThanhToan_DonHang` (`MaThanhToan`,`MaDonHang`),
  KEY `FK_HoanTien_NguoiYeuCau` (`MaTaiKhoanYeuCau`),
  KEY `FK_HoanTien_NguoiXuLy` (`MaTaiKhoanXuLy`),
  CONSTRAINT `FK_HoanTien_NguoiXuLy` FOREIGN KEY (`MaTaiKhoanXuLy`) REFERENCES `taikhoan` (`MaTaiKhoan`),
  CONSTRAINT `FK_HoanTien_NguoiYeuCau` FOREIGN KEY (`MaTaiKhoanYeuCau`) REFERENCES `taikhoan` (`MaTaiKhoan`),
  CONSTRAINT `FK_HoanTien_ThanhToan_DonHang` FOREIGN KEY (`MaThanhToan`, `MaDonHang`) REFERENCES `thanhtoan` (`MaThanhToan`, `MaDonHang`),
  CONSTRAINT `CK_HoanTien_SoTien` CHECK ((`SoTienHoan` > 0)),
  CONSTRAINT `CK_HoanTien_ThanhCong` CHECK (((`TrangThai` <> _utf8mb4'ThanhCong') or (`ThoiGianHoanThanh` is not null)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hoantien`
--

LOCK TABLES `hoantien` WRITE;
/*!40000 ALTER TABLE `hoantien` DISABLE KEYS */;
/*!40000 ALTER TABLE `hoantien` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hopdongnhahang`
--

DROP TABLE IF EXISTS `hopdongnhahang`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hopdongnhahang` (
  `MaHopDong` int NOT NULL AUTO_INCREMENT,
  `MaNhaHang` int NOT NULL,
  `SoHopDong` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `NguoiDaiDien` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ChucVuNguoiDaiDien` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `SoGiayToNguoiDaiDien` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `MaSoThue` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `TenPhapLy` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `DiaChiPhapLy` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `SoGiayPhepKinhDoanh` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `FileGiayPhepKinhDoanh` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `FileGiayToNguoiDaiDien` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `FileHopDong` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `NoiDungHopDong` longtext COLLATE utf8mb4_unicode_ci,
  `PhienBanDieuKhoan` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '1.0',
  `TyLePhiNenTang` decimal(5,2) NOT NULL DEFAULT '5.00',
  `NgayBatDau` date NOT NULL,
  `NgayKetThuc` date NOT NULL,
  `ThoiGianKy` datetime DEFAULT NULL,
  `ThoiGianDongYDieuKhoan` datetime DEFAULT NULL,
  `ThoiGianGuiDuyet` datetime DEFAULT NULL,
  `TrangThai` enum('Nhap','ChoKy','DaKy','ChoDuyet','HieuLuc','HetHan','TuChoi','ChamDut') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Nhap',
  `MaTaiKhoanDuyet` int DEFAULT NULL,
  `ThoiGianDuyet` datetime DEFAULT NULL,
  `LyDoTuChoi` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `LyDoChamDut` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `NgayTao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `NgayCapNhat` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `MaTaiKhoanChamDut` int DEFAULT NULL,
  `ThoiGianChamDut` datetime DEFAULT NULL,
  PRIMARY KEY (`MaHopDong`),
  UNIQUE KEY `UQ_HopDong_SoHopDong` (`SoHopDong`),
  UNIQUE KEY `UQ_HopDong_Ma_NhaHang` (`MaHopDong`,`MaNhaHang`),
  KEY `IX_HopDong_NhaHang_TrangThai` (`MaNhaHang`,`TrangThai`),
  KEY `IX_HopDong_NgayKetThuc` (`NgayKetThuc`),
  KEY `FK_HopDongNhaHang_NguoiDuyet` (`MaTaiKhoanDuyet`),
  KEY `FK_HopDong_TaiKhoanChamDut` (`MaTaiKhoanChamDut`),
  CONSTRAINT `FK_HopDong_TaiKhoanChamDut` FOREIGN KEY (`MaTaiKhoanChamDut`) REFERENCES `taikhoan` (`MaTaiKhoan`),
  CONSTRAINT `FK_HopDongNhaHang_NguoiDuyet` FOREIGN KEY (`MaTaiKhoanDuyet`) REFERENCES `taikhoan` (`MaTaiKhoan`),
  CONSTRAINT `FK_HopDongNhaHang_NhaHang` FOREIGN KEY (`MaNhaHang`) REFERENCES `nhahang` (`MaNhaHang`),
  CONSTRAINT `CK_HopDong_HieuLuc` CHECK (((`TrangThai` <> _utf8mb4'HieuLuc') or ((`ThoiGianKy` is not null) and (`ThoiGianDuyet` is not null) and (`MaTaiKhoanDuyet` is not null) and (`FileHopDong` is not null)))),
  CONSTRAINT `CK_HopDong_ThoiHan` CHECK ((`NgayKetThuc` > `NgayBatDau`)),
  CONSTRAINT `CK_HopDong_TyLePhi` CHECK ((`TyLePhiNenTang` between 0 and 100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hopdongnhahang`
--

LOCK TABLES `hopdongnhahang` WRITE;
/*!40000 ALTER TABLE `hopdongnhahang` DISABLE KEYS */;
/*!40000 ALTER TABLE `hopdongnhahang` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hosophaplynhahang`
--

DROP TABLE IF EXISTS `hosophaplynhahang`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hosophaplynhahang` (
  `MaNhaHang` int NOT NULL,
  `NguoiDaiDien` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ChucVuNguoiDaiDien` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `SoGiayToNguoiDaiDien` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `TenPhapLy` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `MaSoThue` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `DiaChiPhapLy` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `SoGiayPhepKinhDoanh` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `FileGiayPhepKinhDoanh` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `FileGiayToNguoiDaiDien` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `NgayTao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `NgayCapNhat` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`MaNhaHang`),
  CONSTRAINT `FK_HoSoPhapLy_NhaHang` FOREIGN KEY (`MaNhaHang`) REFERENCES `nhahang` (`MaNhaHang`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hosophaplynhahang`
--

LOCK TABLES `hosophaplynhahang` WRITE;
/*!40000 ALTER TABLE `hosophaplynhahang` DISABLE KEYS */;
/*!40000 ALTER TABLE `hosophaplynhahang` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `idempotencyrequest`
--

DROP TABLE IF EXISTS `idempotencyrequest`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `idempotencyrequest` (
  `MaRequest` bigint NOT NULL AUTO_INCREMENT,
  `ScopeHash` char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `IdempotencyKey` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `RequestHash` char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `ResponseJson` longtext NOT NULL,
  `StatusCode` smallint unsigned NOT NULL DEFAULT '200',
  `NgayTao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ExpiresAt` datetime NOT NULL,
  PRIMARY KEY (`MaRequest`),
  UNIQUE KEY `UQ_Idempotency_Scope_Key` (`ScopeHash`,`IdempotencyKey`),
  KEY `IX_Idempotency_ExpiresAt` (`ExpiresAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `idempotencyrequest`
--

LOCK TABLES `idempotencyrequest` WRITE;
/*!40000 ALTER TABLE `idempotencyrequest` DISABLE KEYS */;
/*!40000 ALTER TABLE `idempotencyrequest` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `khachhang`
--

DROP TABLE IF EXISTS `khachhang`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `khachhang` (
  `MaKhachHang` int NOT NULL AUTO_INCREMENT,
  `MaTaiKhoan` int NOT NULL,
  `HoTen` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `NgaySinh` date DEFAULT NULL,
  `GioiTinh` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`MaKhachHang`),
  UNIQUE KEY `MaTaiKhoan` (`MaTaiKhoan`),
  CONSTRAINT `FK_KhachHang_TaiKhoan` FOREIGN KEY (`MaTaiKhoan`) REFERENCES `taikhoan` (`MaTaiKhoan`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `khachhang`
--

LOCK TABLES `khachhang` WRITE;
/*!40000 ALTER TABLE `khachhang` DISABLE KEYS */;
INSERT INTO `khachhang` VALUES (1,4,'Nguyễn Văn Khách','2000-01-01','Nam'),(2,5,'Trần Thị Hàng','2002-05-15','Nữ'),(3,6,'Nguyễn Minh Danh','2025-03-12','Nam'),(4,9,'Nguyễn Văn A','2001-11-09','Nam'),(5,34,'Nguyễn Huy','2001-11-05','Nam');
/*!40000 ALTER TABLE `khachhang` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `khachhang_khuyenmai`
--

DROP TABLE IF EXISTS `khachhang_khuyenmai`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `khachhang_khuyenmai` (
  `MaKhachHang` int NOT NULL,
  `MaKhuyenMai` int NOT NULL,
  `NgayLuu` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`MaKhachHang`,`MaKhuyenMai`),
  KEY `FK_KhachHangKhuyenMai_KhuyenMai` (`MaKhuyenMai`),
  CONSTRAINT `FK_KhachHangKhuyenMai_KhachHang` FOREIGN KEY (`MaKhachHang`) REFERENCES `khachhang` (`MaKhachHang`) ON DELETE CASCADE,
  CONSTRAINT `FK_KhachHangKhuyenMai_KhuyenMai` FOREIGN KEY (`MaKhuyenMai`) REFERENCES `khuyenmai` (`MaKhuyenMai`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `khachhang_khuyenmai`
--

LOCK TABLES `khachhang_khuyenmai` WRITE;
/*!40000 ALTER TABLE `khachhang_khuyenmai` DISABLE KEYS */;
INSERT INTO `khachhang_khuyenmai` VALUES (4,6,'2026-10-11 23:59:54');
/*!40000 ALTER TABLE `khachhang_khuyenmai` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `khuyenmai`
--

DROP TABLE IF EXISTS `khuyenmai`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `khuyenmai` (
  `MaKhuyenMai` int NOT NULL AUTO_INCREMENT,
  `MaNhaHang` int DEFAULT NULL,
  `MaCode` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `MoTa` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `LoaiGiam` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `GiaTriGiam` decimal(18,0) NOT NULL,
  `GiamToiDa` decimal(18,0) DEFAULT NULL,
  `DonHangToiThieu` decimal(18,0) NOT NULL DEFAULT '0',
  `SoLuong` int NOT NULL,
  `SoLuongDaDung` int NOT NULL DEFAULT '0',
  `NgayBatDau` datetime NOT NULL,
  `NgayKetThuc` datetime NOT NULL,
  `TrangThai` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`MaKhuyenMai`),
  UNIQUE KEY `MaCode` (`MaCode`),
  KEY `FK_KhuyenMai_NhaHang` (`MaNhaHang`),
  CONSTRAINT `FK_KhuyenMai_NhaHang` FOREIGN KEY (`MaNhaHang`) REFERENCES `nhahang` (`MaNhaHang`),
  CONSTRAINT `CK_KhuyenMai_LoaiGiam` CHECK ((`LoaiGiam` in (_utf8mb4'PhanTram',_utf8mb4'SoTien')))
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `khuyenmai`
--

LOCK TABLES `khuyenmai` WRITE;
/*!40000 ALTER TABLE `khuyenmai` DISABLE KEYS */;
INSERT INTO `khuyenmai` VALUES (1,3,'TEST','Mã để test','PhanTram',18,50000,100,100,1,'2026-09-26 19:38:00','2026-10-11 19:38:00',1),(2,3,'TEST 1','aaaaaaa','SoTien',20,111111,100000,36,0,'2026-09-06 19:42:00','2026-10-08 19:43:00',0),(3,NULL,'ADMINKM','Admin tạo mã toàn hệ thống','SoTien',100000,100000,1000000,100,0,'2026-09-02 21:18:00','2026-09-30 21:18:00',1),(4,NULL,'ADTEST2','aaaaaaa','PhanTram',10,11111,11111,100,0,'2026-09-08 21:30:00','2026-10-06 21:30:00',1),(5,NULL,'MAGIAMGIA·','GIẢM·','PhanTram',99,NULL,0,1,0,'2026-09-28 13:17:00','2026-09-29 13:17:00',1),(6,3,'TESTMON',NULL,'PhanTram',10,100000,0,100,1,'2026-10-06 00:55:00','2026-10-31 00:55:00',1),(7,3,'FOOD',NULL,'PhanTram',10,10000,0,100,0,'2026-10-02 21:07:00','2026-10-05 21:07:00',1),(8,3,'FOOD1010','sale 10/10','PhanTram',50,70000,0,10,0,'2026-10-10 21:10:00','2026-10-11 21:10:00',1);
/*!40000 ALTER TABLE `khuyenmai` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lichsutrangthaidonhang`
--

DROP TABLE IF EXISTS `lichsutrangthaidonhang`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lichsutrangthaidonhang` (
  `MaLichSu` int NOT NULL AUTO_INCREMENT,
  `MaDonHang` int NOT NULL,
  `MaTrangThai` int NOT NULL,
  `MaTaiKhoan` int DEFAULT NULL,
  `ThoiGianTao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `GhiChu` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`MaLichSu`),
  KEY `FK_LichSu_DonHang` (`MaDonHang`),
  KEY `FK_LichSu_TrangThai` (`MaTrangThai`),
  KEY `FK_LichSu_TaiKhoan` (`MaTaiKhoan`),
  CONSTRAINT `FK_LichSu_DonHang` FOREIGN KEY (`MaDonHang`) REFERENCES `donhang` (`MaDonHang`),
  CONSTRAINT `FK_LichSu_TaiKhoan` FOREIGN KEY (`MaTaiKhoan`) REFERENCES `taikhoan` (`MaTaiKhoan`),
  CONSTRAINT `FK_LichSu_TrangThai` FOREIGN KEY (`MaTrangThai`) REFERENCES `trangthaidonhang` (`MaTrangThai`)
) ENGINE=InnoDB AUTO_INCREMENT=69 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lichsutrangthaidonhang`
--

LOCK TABLES `lichsutrangthaidonhang` WRITE;
/*!40000 ALTER TABLE `lichsutrangthaidonhang` DISABLE KEYS */;
INSERT INTO `lichsutrangthaidonhang` VALUES (1,1,1,4,'2026-09-25 13:47:22','Khách hàng đặt đơn'),(2,1,2,2,'2026-09-25 13:47:22','Quán xác nhận đơn'),(3,1,5,2,'2026-09-25 13:47:22','Giao hàng thành công'),(4,2,1,9,'2026-10-05 20:32:51','Khách hàng đặt đơn mới'),(5,3,1,9,'2026-10-05 20:54:01','Khách hàng đặt đơn mới'),(6,3,6,9,'2026-10-05 21:33:38','Huỷ đơn. Lý do: Hell elo'),(7,4,1,9,'2026-10-05 21:40:00','Khách hàng đặt đơn mới'),(8,4,2,7,'2026-10-05 21:40:24','Quán cập nhật trạng thái: DaXacNhan'),(9,4,3,7,'2026-10-05 21:40:26','Quán cập nhật trạng thái: DangChuanBi'),(10,4,4,7,'2026-10-05 21:40:43','Quán cập nhật trạng thái: DangGiao'),(11,4,5,7,'2026-10-05 21:40:45','Quán cập nhật trạng thái: HoanThanh'),(12,5,1,9,'2026-10-05 21:48:29','Khách hàng đặt đơn mới'),(13,6,1,9,'2026-10-05 21:59:54','Khách hàng đặt đơn mới'),(14,6,2,7,'2026-10-05 22:00:03','Quán cập nhật trạng thái: DaXacNhan'),(15,6,3,7,'2026-10-05 22:00:06','Quán cập nhật trạng thái: DangChuanBi'),(16,6,4,7,'2026-10-05 22:00:09','Quán cập nhật trạng thái: DangGiao'),(17,6,5,7,'2026-10-05 22:00:11','Quán cập nhật trạng thái: HoanThanh'),(18,7,1,9,'2026-10-06 00:39:53','Khách hàng đặt đơn mới'),(19,8,1,9,'2026-10-06 00:55:39','Khách hàng đặt đơn mới'),(20,8,2,7,'2026-10-06 00:55:52','Quán cập nhật trạng thái: DaXacNhan'),(21,8,3,7,'2026-10-06 00:55:54','Quán cập nhật trạng thái: DangChuanBi'),(22,8,4,7,'2026-10-06 00:55:55','Quán cập nhật trạng thái: DangGiao'),(23,8,5,7,'2026-10-06 00:55:56','Quán cập nhật trạng thái: HoanThanh'),(24,9,1,9,'2026-10-06 02:54:40','Khách hàng đặt đơn mới'),(25,10,1,9,'2026-10-06 18:31:20','Khách hàng đặt đơn mới'),(26,9,2,7,'2026-10-06 18:38:03','Quán cập nhật trạng thái: DaXacNhan'),(27,9,3,7,'2026-10-06 18:38:13','Quán cập nhật trạng thái: DangChuanBi'),(28,9,4,7,'2026-10-06 18:38:22','Quán cập nhật trạng thái: DangGiao'),(29,9,5,7,'2026-10-06 18:38:29','Quán cập nhật trạng thái: HoanThanh'),(30,11,1,9,'2026-10-06 18:46:16','Khách hàng đặt đơn mới'),(31,12,1,9,'2026-10-06 18:51:04','Khách hàng đặt đơn mới'),(32,12,2,7,'2026-10-06 18:51:15','Quán cập nhật trạng thái: DaXacNhan'),(33,12,3,7,'2026-10-06 18:51:16','Quán cập nhật trạng thái: DangChuanBi'),(34,12,4,7,'2026-10-06 18:51:17','Quán cập nhật trạng thái: DangGiao'),(35,12,5,7,'2026-10-06 18:51:18','Quán cập nhật trạng thái: HoanThanh'),(36,10,6,9,'2026-10-06 18:56:23','Huỷ đơn. Lý do: tôi muốn đổi món'),(37,13,1,9,'2026-10-06 19:02:40','Khách hàng đặt đơn mới'),(38,13,2,7,'2026-10-06 19:02:51','Quán cập nhật trạng thái: DaXacNhan'),(39,13,3,7,'2026-10-06 19:02:56','Quán cập nhật trạng thái: DangChuanBi'),(40,13,4,7,'2026-10-06 19:03:02','Quán cập nhật trạng thái: DangGiao'),(41,13,5,7,'2026-10-06 19:03:04','Quán cập nhật trạng thái: HoanThanh'),(42,14,1,9,'2026-10-07 00:54:56','Khách hàng đặt đơn mới'),(43,15,1,9,'2026-10-07 01:17:34','Khách hàng đặt đơn mới'),(44,15,2,7,'2026-10-07 01:17:43','Quán cập nhật trạng thái: DaXacNhan'),(45,15,3,7,'2026-10-07 01:17:53','Quán cập nhật trạng thái: DangChuanBi'),(46,15,4,7,'2026-10-07 01:21:45','Quán cập nhật trạng thái: DangGiao'),(47,15,5,7,'2026-10-07 01:21:52','Quán cập nhật trạng thái: HoanThanh'),(48,16,1,9,'2026-10-07 01:22:11','Khách hàng đặt đơn mới'),(49,16,2,7,'2026-10-07 01:22:25','Quán cập nhật trạng thái: DaXacNhan'),(50,16,3,7,'2026-10-07 01:22:31','Quán cập nhật trạng thái: DangChuanBi'),(51,16,4,7,'2026-10-07 01:26:27','Quán cập nhật trạng thái: DangGiao'),(52,16,5,7,'2026-10-07 01:31:28','Quán cập nhật trạng thái: HoanThanh'),(53,17,1,9,'2026-10-07 23:13:16','Khách hàng đặt đơn mới'),(54,17,2,7,'2026-10-07 23:13:27','Quán cập nhật trạng thái: DaXacNhan'),(55,17,3,7,'2026-10-07 23:13:39','Quán cập nhật trạng thái: DangChuanBi'),(56,17,4,7,'2026-10-07 23:13:47','Quán cập nhật trạng thái: DangGiao'),(57,17,5,7,'2026-10-07 23:13:55','Quán cập nhật trạng thái: HoanThanh'),(58,18,1,9,'2026-10-08 01:31:37','Khách hàng đặt đơn mới'),(59,18,6,9,'2026-10-08 01:40:25','Huỷ đơn. Lý do: đổi'),(60,19,1,9,'2026-10-08 02:04:25','Khách hàng đặt đơn mới'),(61,19,2,7,'2026-10-08 02:04:44','Quán cập nhật trạng thái: DaXacNhan'),(62,20,1,9,'2026-10-08 06:47:34','Khách hàng đặt đơn mới'),(63,11,6,NULL,'2026-10-09 22:10:25','Hệ thống tự hủy: thanh toán online quá hạn 15 phút.'),(64,20,2,7,'2026-10-09 22:32:16','Quán cập nhật trạng thái: DaXacNhan'),(65,20,3,7,'2026-10-09 22:32:23','Quán cập nhật trạng thái: DangChuanBi'),(66,20,4,7,'2026-10-09 22:32:27','Quán cập nhật trạng thái: DangGiao'),(67,20,5,7,'2026-10-09 22:32:29','Quán cập nhật trạng thái: HoanThanh'),(68,21,1,9,'2026-10-12 00:23:47','Khách hàng đặt đơn mới');
/*!40000 ALTER TABLE `lichsutrangthaidonhang` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `monan`
--

DROP TABLE IF EXISTS `monan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `monan` (
  `MaMonAn` int NOT NULL AUTO_INCREMENT,
  `MaNhaHang` int NOT NULL,
  `MaDanhMuc` int NOT NULL,
  `TenMonAn` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `MoTa` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Gia` decimal(18,0) NOT NULL,
  `HinhAnh` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `TrangThai` tinyint(1) NOT NULL DEFAULT '1',
  `DanhGiaTrungBinh` float NOT NULL DEFAULT '0',
  PRIMARY KEY (`MaMonAn`),
  KEY `FK_MonAn_NhaHang` (`MaNhaHang`),
  KEY `FK_MonAn_DanhMuc` (`MaDanhMuc`),
  CONSTRAINT `FK_MonAn_DanhMuc` FOREIGN KEY (`MaDanhMuc`) REFERENCES `danhmuc` (`MaDanhMuc`),
  CONSTRAINT `FK_MonAn_NhaHang` FOREIGN KEY (`MaNhaHang`) REFERENCES `nhahang` (`MaNhaHang`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `monan`
--

LOCK TABLES `monan` WRITE;
/*!40000 ALTER TABLE `monan` DISABLE KEYS */;
INSERT INTO `monan` VALUES (1,1,1,'Trà Sữa Phúc Long','Đậm vị trà đặc trưng',45000,'ts_phuclong.jpg',1,0),(2,1,1,'Trà Đào Cam Sả','Thanh mát giải nhiệt',50000,'tradao.jpg',1,0),(3,1,2,'Cà Phê Sữa Đá','Cà phê rang xay nguyên chất',35000,'cf_sua.jpg',1,0),(4,3,3,'Sữa tươi','Sữa tươi nguyên chất',20000,NULL,1,3.16667);
/*!40000 ALTER TABLE `monan` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `monan_nhomtopping`
--

DROP TABLE IF EXISTS `monan_nhomtopping`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `monan_nhomtopping` (
  `MaMonAn` int NOT NULL,
  `MaNhomTopping` int NOT NULL,
  PRIMARY KEY (`MaMonAn`,`MaNhomTopping`),
  KEY `FK_MonAnNhomTopping_NhomTopping` (`MaNhomTopping`),
  CONSTRAINT `FK_MonAnNhomTopping_MonAn` FOREIGN KEY (`MaMonAn`) REFERENCES `monan` (`MaMonAn`),
  CONSTRAINT `FK_MonAnNhomTopping_NhomTopping` FOREIGN KEY (`MaNhomTopping`) REFERENCES `nhomtopping` (`MaNhomTopping`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `monan_nhomtopping`
--

LOCK TABLES `monan_nhomtopping` WRITE;
/*!40000 ALTER TABLE `monan_nhomtopping` DISABLE KEYS */;
INSERT INTO `monan_nhomtopping` VALUES (1,1),(1,2),(4,3),(4,4);
/*!40000 ALTER TABLE `monan_nhomtopping` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `nhahang`
--

DROP TABLE IF EXISTS `nhahang`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `nhahang` (
  `MaNhaHang` int NOT NULL AUTO_INCREMENT,
  `MaTaiKhoan` int NOT NULL,
  `TenNhaHang` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `MoTa` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `DiaChiQuan` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `AnhBia` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `GioMoCua` time DEFAULT NULL,
  `GioDongCua` time DEFAULT NULL,
  `TrangThaiDuyet` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ChuaHoanTat',
  `TrangThaiHoatDong` enum('MoCua','DongCua','TamNgung') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MoCua',
  `CheDoHoatDong` enum('TuDong','MoThuCong','TamNgung') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'TuDong',
  `DanhGiaTrungBinh` float NOT NULL DEFAULT '0',
  `PhiShipMacDinh` decimal(18,0) NOT NULL DEFAULT '15000',
  PRIMARY KEY (`MaNhaHang`),
  UNIQUE KEY `MaTaiKhoan` (`MaTaiKhoan`),
  CONSTRAINT `FK_NhaHang_TaiKhoan` FOREIGN KEY (`MaTaiKhoan`) REFERENCES `taikhoan` (`MaTaiKhoan`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `nhahang`
--

LOCK TABLES `nhahang` WRITE;
/*!40000 ALTER TABLE `nhahang` DISABLE KEYS */;
INSERT INTO `nhahang` VALUES (1,2,'Phúc Long Coffee & Tea','Thương hiệu trà và cà phê nổi tiếng','123 Lê Lợi, Q1, TP.HCM',NULL,'07:00:00','22:30:00','DaDuyet','MoCua','TuDong',4.8,15000),(2,3,'Mixue Ice Cream & Tea','Kem và Trà sữa giá rẻ','456 Nguyễn Trãi, Q5, TP.HCM',NULL,'09:00:00','23:00:00','DaDuyet','MoCua','TuDong',4.5,15000),(3,7,'Nhà Hàng Test 123','Nhà hàng dùng để test tài khoản','123 Nguyễn Huệ, Quận 1, TP.HCM','https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=500&fit=crop','08:00:00','00:00:00','DaDuyet','MoCua','MoThuCong',4.83333,15000),(5,4,'The Coffee House','Không gian cà phê hiện đại, trẻ trung','45 Nguyễn Huệ, Q1, TP.HCM',NULL,'07:30:00','22:00:00','DaDuyet','MoCua','TuDong',0,15000),(6,10,'Cơm Tấm Sài Gòn','Cơm tấm sườn nướng, bì chả và các món ăn truyền thống.','120 Võ Văn Tần, Quận 3, TP.HCM','https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&h=700&fit=crop','06:00:00','23:59:00','DaDuyet','MoCua','TuDong',4.7,12000),(7,11,'Bếp Nhà Mình','Món cơm gia đình đậm đà, phù hợp cho bữa trưa và bữa tối.','88 Nguyễn Đình Chiểu, Quận 1, TP.HCM','https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?w=1200&h=700&fit=crop','09:00:00','21:30:00','DaDuyet','DongCua','TuDong',4.4,18000),(8,12,'Gà Rán Crunchy','Gà rán giòn, burger và combo dành cho nhóm bạn.','215 Cách Mạng Tháng 8, Quận 10, TP.HCM','https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=1200&h=700&fit=crop','08:00:00','23:59:00','DaDuyet','MoCua','TuDong',4.2,15000),(9,13,'Pizza Napoli','Pizza nướng thủ công với đế mỏng và nguyên liệu tươi.','42 Trần Hưng Đạo, Quận 5, TP.HCM','https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&h=700&fit=crop','10:00:00','22:30:00','DaDuyet','DongCua','TuDong',4.8,20000),(10,14,'Bún Bò Huế An Cựu','Bún bò Huế nước dùng đậm vị, thịt bò và chả cua.','63 Lý Chính Thắng, Quận 3, TP.HCM','https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&h=700&fit=crop','06:00:00','20:30:00','DaDuyet','DongCua','TuDong',4.6,14000),(11,15,'Sushi Sakura','Sushi, sashimi và các món Nhật được chế biến trong ngày.','19 Thái Văn Lung, Quận 1, TP.HCM','https://images.unsplash.com/photo-1579751626657-72bc17010498?w=1200&h=700&fit=crop','10:30:00','22:00:00','DaDuyet','DongCua','TuDong',4.9,25000),(12,16,'Mì Cay Seoul','Mì cay nhiều cấp độ cùng tokbokki và món ăn Hàn Quốc.','310 Nguyễn Tri Phương, Quận 10, TP.HCM','https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=1200&h=700&fit=crop','09:30:00','23:00:00','DaDuyet','DongCua','TuDong',4.3,16000),(13,17,'Lẩu Thái Tom Yum','Lẩu Thái chua cay cùng hải sản và nhiều loại topping.','105 Phan Xích Long, Quận Phú Nhuận, TP.HCM','https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&h=700&fit=crop','10:00:00','23:30:00','DaDuyet','DongCua','TuDong',4.5,22000),(14,18,'Bánh Mì Chảo 1985','Bánh mì chảo, bò né và các phần ăn sáng đầy đủ.','71 Hoàng Diệu, Quận 4, TP.HCM','https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1200&h=700&fit=crop','05:30:00','11:30:00','DaDuyet','DongCua','TuDong',4.1,10000),(15,19,'Chay An Nhiên','Món chay thanh đạm, nguyên liệu rau củ tươi mỗi ngày.','28 Nguyễn Văn Đậu, Quận Bình Thạnh, TP.HCM','https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=1200&h=700&fit=crop','07:00:00','21:00:00','DaDuyet','DongCua','TuDong',4.7,13000),(16,20,'Hải Sản Biển Đông','Hải sản tươi sống, chế biến theo yêu cầu của khách hàng.','156 Phạm Văn Đồng, TP. Thủ Đức, TP.HCM','https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1200&h=700&fit=crop','10:00:00','23:59:00','DaDuyet','MoCua','TuDong',4.6,28000),(17,21,'Tiệm Trà Mộc','Trà trái cây, trà sữa và bánh ngọt trong không gian nhẹ nhàng.','90 Sư Vạn Hạnh, Quận 10, TP.HCM','https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=700&fit=crop','07:30:00','23:59:00','DaDuyet','MoCua','TuDong',4,15000);
/*!40000 ALTER TABLE `nhahang` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `nhomtopping`
--

DROP TABLE IF EXISTS `nhomtopping`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `nhomtopping` (
  `MaNhomTopping` int NOT NULL AUTO_INCREMENT,
  `MaNhaHang` int NOT NULL,
  `TenNhom` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `BatBuocChon` tinyint(1) NOT NULL DEFAULT '0',
  `ChonToiDa` int DEFAULT NULL,
  PRIMARY KEY (`MaNhomTopping`),
  KEY `FK_NhomTopping_NhaHang` (`MaNhaHang`),
  CONSTRAINT `FK_NhomTopping_NhaHang` FOREIGN KEY (`MaNhaHang`) REFERENCES `nhahang` (`MaNhaHang`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `nhomtopping`
--

LOCK TABLES `nhomtopping` WRITE;
/*!40000 ALTER TABLE `nhomtopping` DISABLE KEYS */;
INSERT INTO `nhomtopping` VALUES (1,1,'Chọn Size',1,1),(2,1,'Topping Thêm',0,3),(3,3,'Lượng đá',0,1),(4,3,'chọn size',0,1);
/*!40000 ALTER TABLE `nhomtopping` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `phuongthucthanhtoan`
--

DROP TABLE IF EXISTS `phuongthucthanhtoan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `phuongthucthanhtoan` (
  `MaPhuongThuc` int NOT NULL AUTO_INCREMENT,
  `TenPhuongThuc` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `TrangThai` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`MaPhuongThuc`),
  UNIQUE KEY `TenPhuongThuc` (`TenPhuongThuc`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `phuongthucthanhtoan`
--

LOCK TABLES `phuongthucthanhtoan` WRITE;
/*!40000 ALTER TABLE `phuongthucthanhtoan` DISABLE KEYS */;
INSERT INTO `phuongthucthanhtoan` VALUES (1,'COD',1),(2,'Momo',1),(3,'VNPay',1),(4,'ZaloPay',1),(5,'FoodPay',1);
/*!40000 ALTER TABLE `phuongthucthanhtoan` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role`
--

DROP TABLE IF EXISTS `role`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role` (
  `MaRole` int NOT NULL AUTO_INCREMENT,
  `TenRole` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `MoTa` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`MaRole`),
  UNIQUE KEY `TenRole` (`TenRole`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role`
--

LOCK TABLES `role` WRITE;
/*!40000 ALTER TABLE `role` DISABLE KEYS */;
INSERT INTO `role` VALUES (1,'Admin','Quan tri he thong'),(2,'Quan','Chu nha hang / quan an'),(3,'KhachHang','Nguoi dat mon');
/*!40000 ALTER TABLE `role` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `taikhoan`
--

DROP TABLE IF EXISTS `taikhoan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `taikhoan` (
  `MaTaiKhoan` int NOT NULL AUTO_INCREMENT,
  `Email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `MatKhau` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `SoDienThoai` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `MaRole` int NOT NULL,
  `TrangThai` tinyint(1) NOT NULL DEFAULT '1',
  `DaXacThucEmail` tinyint(1) NOT NULL DEFAULT '0',
  `NgayTao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `AnhDaiDien` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`MaTaiKhoan`),
  UNIQUE KEY `Email` (`Email`),
  UNIQUE KEY `SoDienThoai` (`SoDienThoai`),
  KEY `FK_TaiKhoan_Role` (`MaRole`),
  CONSTRAINT `FK_TaiKhoan_Role` FOREIGN KEY (`MaRole`) REFERENCES `role` (`MaRole`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `taikhoan`
--

LOCK TABLES `taikhoan` WRITE;
/*!40000 ALTER TABLE `taikhoan` DISABLE KEYS */;
INSERT INTO `taikhoan` VALUES (1,'admin@hethong.com','hashed_pass_123','0900000000',1,1,1,'2026-09-25 13:47:21',NULL),(2,'phuclong@gmail.com','hashed_pass_123','0901111111',2,1,1,'2026-09-25 13:47:21',NULL),(3,'mixue@gmail.com','hashed_pass_123','0902222222',2,1,1,'2026-09-25 13:47:21',NULL),(4,'khachhang1@gmail.com','hashed_pass_123','0903333333',3,1,1,'2026-09-25 13:47:21',NULL),(5,'khachhang2@gmail.com','hashed_pass_123','0904444444',3,1,1,'2026-09-25 13:47:21',NULL),(6,'danhgarena2005@gmail.com','PBKDF2$100000$3I4kde5o/BZBfSvT3JtVOg==$XVU5sN3OhXPwCN2NBGDEoKJ89o4ARMurEvjGCOAW/rs=','0123456789',3,1,0,'2026-09-25 13:53:36',NULL),(7,'nhahangtest@gmail.com','PBKDF2$100000$5wnU52NdHSKxh1SdTlw6Xw==$GuxGNpGi57IX1Smici3KUlsxAq0vRl9LvXkY6pDPVIk=','0909999998',2,1,1,'2026-09-27 19:30:27',NULL),(8,'admintest@gmail.com','PBKDF2$100000$5wnU52NdHSKxh1SdTlw6Xw==$GuxGNpGi57IX1Smici3KUlsxAq0vRl9LvXkY6pDPVIk=','0909999999',1,1,1,'2026-09-27 20:39:38',NULL),(9,'khach1@gmail.com','PBKDF2$100000$3JhSv3zAgtdkpWoUwLmXpw==$komX3Io+ymfYnpLfCgJ/+NBX0WA6bomvpI0NQ/Vfxzc=','0123456798',3,1,0,'2026-09-27 23:10:13',NULL),(10,'quan.demo01@datmonan.local','hashed_pass_123','0900010001',2,1,1,'2026-10-08 00:04:40',NULL),(11,'quan.demo02@datmonan.local','hashed_pass_123','0900010002',2,1,1,'2026-10-08 00:04:40',NULL),(12,'quan.demo03@datmonan.local','hashed_pass_123','0900010003',2,1,1,'2026-10-08 00:04:40',NULL),(13,'quan.demo04@datmonan.local','hashed_pass_123','0900010004',2,1,1,'2026-10-08 00:04:40',NULL),(14,'quan.demo05@datmonan.local','hashed_pass_123','0900010005',2,1,1,'2026-10-08 00:04:40',NULL),(15,'quan.demo06@datmonan.local','hashed_pass_123','0900010006',2,1,1,'2026-10-08 00:04:40',NULL),(16,'quan.demo07@datmonan.local','hashed_pass_123','0900010007',2,1,1,'2026-10-08 00:04:40',NULL),(17,'quan.demo08@datmonan.local','hashed_pass_123','0900010008',2,1,1,'2026-10-08 00:04:40',NULL),(18,'quan.demo09@datmonan.local','hashed_pass_123','0900010009',2,1,1,'2026-10-08 00:04:40',NULL),(19,'quan.demo10@datmonan.local','hashed_pass_123','0900010010',2,1,1,'2026-10-08 00:04:40',NULL),(20,'quan.demo11@datmonan.local','hashed_pass_123','0900010011',2,1,1,'2026-10-08 00:04:40',NULL),(21,'quan.demo12@datmonan.local','hashed_pass_123','0900010012',2,1,1,'2026-10-08 00:04:40',NULL),(34,'ynghuy8@gmail.com','PBKDF2$100000$aRSBbMbpPMEhPQa2WWIVJg==$MihG4PnhP9fDmBorm4x2EU40UTB7qqBQxdDs+korI64=','01236547412',3,1,0,'2026-10-09 22:21:34',NULL);
/*!40000 ALTER TABLE `taikhoan` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Shared authentication state (survives restart and works across API instances)
--

DROP TABLE IF EXISTS `authratelimit`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = ascii */;
CREATE TABLE `authratelimit` (
  `PartitionHash` char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Policy` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `WindowStartUtc` datetime(6) NOT NULL,
  `RequestCount` int NOT NULL DEFAULT '0',
  `ExpiresAtUtc` datetime(6) NOT NULL,
  PRIMARY KEY (`PartitionHash`),
  KEY `IX_AuthRateLimit_ExpiresAtUtc` (`ExpiresAtUtc`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

DROP TABLE IF EXISTS `loginattempt`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = ascii */;
CREATE TABLE `loginattempt` (
  `EmailHash` char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `SoLanThatBai` int NOT NULL DEFAULT '0',
  `CuaSoBatDauUtc` datetime(6) NOT NULL,
  `KhoaDenUtc` datetime(6) DEFAULT NULL,
  `NgayCapNhatUtc` datetime(6) NOT NULL,
  PRIMARY KEY (`EmailHash`),
  KEY `IX_LoginAttempt_NgayCapNhatUtc` (`NgayCapNhatUtc`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

DROP TABLE IF EXISTS `passwordresetrequest`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = ascii */;
CREATE TABLE `passwordresetrequest` (
  `EmailHash` char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `MaYeuCau` char(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `MaTaiKhoan` int DEFAULT NULL,
  `MaXacNhanHash` varchar(88) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `MatKhauLucTaoYeuCau` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `SoLanThuSai` int NOT NULL DEFAULT '0',
  `HetHanUtc` datetime(6) NOT NULL,
  `NgayTaoUtc` datetime(6) NOT NULL,
  PRIMARY KEY (`EmailHash`),
  UNIQUE KEY `UQ_PasswordReset_MaYeuCau` (`MaYeuCau`),
  KEY `IX_PasswordReset_HetHanUtc` (`HetHanUtc`),
  KEY `FK_PasswordReset_TaiKhoan` (`MaTaiKhoan`),
  CONSTRAINT `FK_PasswordReset_TaiKhoan` FOREIGN KEY (`MaTaiKhoan`) REFERENCES `taikhoan` (`MaTaiKhoan`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `thamdinhhosonhahang`
--

DROP TABLE IF EXISTS `thamdinhhosonhahang`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `thamdinhhosonhahang` (
  `MaThamDinh` int NOT NULL AUTO_INCREMENT,
  `MaHopDong` int NOT NULL,
  `MaTaiKhoanAdmin` int NOT NULL,
  `KetQuaGiayPhep` enum('HopLe','CanBoSung') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `KetQuaGiayToDaiDien` enum('HopLe','CanBoSung') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `KetQuaHopDong` enum('HopLe','CanBoSung') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `KetQua` enum('DaDuyet','TuChoi') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `GhiChu` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ThoiGian` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`MaThamDinh`),
  UNIQUE KEY `UQ_ThamDinhHoSo_HopDong` (`MaHopDong`),
  KEY `FK_ThamDinhHoSo_Admin` (`MaTaiKhoanAdmin`),
  CONSTRAINT `FK_ThamDinhHoSo_Admin` FOREIGN KEY (`MaTaiKhoanAdmin`) REFERENCES `taikhoan` (`MaTaiKhoan`),
  CONSTRAINT `FK_ThamDinhHoSo_HopDong` FOREIGN KEY (`MaHopDong`) REFERENCES `hopdongnhahang` (`MaHopDong`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `thamdinhhosonhahang`
--

LOCK TABLES `thamdinhhosonhahang` WRITE;
/*!40000 ALTER TABLE `thamdinhhosonhahang` DISABLE KEYS */;
/*!40000 ALTER TABLE `thamdinhhosonhahang` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vi`
--

DROP TABLE IF EXISTS `vi`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vi` (
  `MaVi` int NOT NULL AUTO_INCREMENT,
  `MaTaiKhoan` int NOT NULL,
  `SoDu` decimal(18,0) NOT NULL DEFAULT '0',
  `DonViTienTe` char(3) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT 'VND',
  `TrangThai` enum('HoatDong','TamKhoa','Dong') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'HoatDong',
  `NgayTao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `NgayCapNhat` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`MaVi`),
  UNIQUE KEY `UQ_Vi_TaiKhoan` (`MaTaiKhoan`),
  CONSTRAINT `FK_Vi_TaiKhoan` FOREIGN KEY (`MaTaiKhoan`) REFERENCES `taikhoan` (`MaTaiKhoan`),
  CONSTRAINT `CK_Vi_SoDu` CHECK (`SoDu` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vi`
--

LOCK TABLES `vi` WRITE, `taikhoan` READ;
/*!40000 ALTER TABLE `vi` DISABLE KEYS */;
INSERT INTO `vi` (`MaTaiKhoan`, `SoDu`)
SELECT `MaTaiKhoan`, CASE WHEN `MaTaiKhoan` = 4 THEN 150 ELSE 0 END
FROM `taikhoan`
WHERE `MaRole` IN (2, 3)
ORDER BY `MaTaiKhoan`;
/*!40000 ALTER TABLE `vi` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `giaodichvi`
--

DROP TABLE IF EXISTS `giaodichvi`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `giaodichvi` (
  `MaGiaoDichVi` bigint NOT NULL AUTO_INCREMENT,
  `MaVi` int NOT NULL,
  `MaDonHang` int DEFAULT NULL,
  `MaHoanTien` int DEFAULT NULL,
  `MaDoiSoat` int DEFAULT NULL,
  `LoaiGiaoDich` enum('NapTien','ThanhToan','HoanTien','ThuNhapDonHang','NhanDoiSoat','RutTien','ChuyenTien','DieuChinh','KhoiTao') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `LoaiBienDong` enum('Cong','Tru') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `SoTien` decimal(18,0) NOT NULL,
  `SoDuTruoc` decimal(18,0) NOT NULL,
  `SoDuSau` decimal(18,0) NOT NULL,
  `TrangThai` enum('ChoXuLy','ThanhCong','ThatBai') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ThanhCong',
  `MaThamChieu` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `NoiDung` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `NgayTao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`MaGiaoDichVi`),
  UNIQUE KEY `UQ_GiaoDichVi_MaThamChieu` (`MaThamChieu`),
  KEY `IX_GiaoDichVi_Vi_NgayTao` (`MaVi`,`NgayTao`),
  KEY `IX_GiaoDichVi_DonHang` (`MaDonHang`),
  KEY `IX_GiaoDichVi_DonHang_Loai_TrangThai` (`MaDonHang`,`LoaiGiaoDich`,`TrangThai`),
  KEY `IX_GiaoDichVi_HoanTien` (`MaHoanTien`),
  KEY `IX_GiaoDichVi_DoiSoat` (`MaDoiSoat`),
  CONSTRAINT `FK_GiaoDichVi_Vi` FOREIGN KEY (`MaVi`) REFERENCES `vi` (`MaVi`),
  CONSTRAINT `FK_GiaoDichVi_DonHang` FOREIGN KEY (`MaDonHang`) REFERENCES `donhang` (`MaDonHang`),
  CONSTRAINT `FK_GiaoDichVi_HoanTien` FOREIGN KEY (`MaHoanTien`) REFERENCES `hoantien` (`MaHoanTien`),
  CONSTRAINT `FK_GiaoDichVi_DoiSoat` FOREIGN KEY (`MaDoiSoat`) REFERENCES `doisoatnhahang` (`MaDoiSoat`),
  CONSTRAINT `CK_GiaoDichVi_SoTien` CHECK (`SoTien` > 0),
  CONSTRAINT `CK_GiaoDichVi_SoDu` CHECK (`SoDuTruoc` >= 0 AND `SoDuSau` >= 0),
  CONSTRAINT `CK_GiaoDichVi_CanDoi` CHECK (
    (`LoaiBienDong` = 'Cong' AND `SoDuSau` = `SoDuTruoc` + `SoTien`)
    OR (`LoaiBienDong` = 'Tru' AND `SoDuSau` = `SoDuTruoc` - `SoTien`)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `giaodichvi`
--

LOCK TABLES `giaodichvi` WRITE, `vi` READ;
/*!40000 ALTER TABLE `giaodichvi` DISABLE KEYS */;
INSERT INTO `giaodichvi`
  (`MaVi`, `LoaiGiaoDich`, `LoaiBienDong`, `SoTien`, `SoDuTruoc`, `SoDuSau`, `TrangThai`, `MaThamChieu`, `NoiDung`)
SELECT `MaVi`, 'KhoiTao', 'Cong', `SoDu`, 0, `SoDu`, 'ThanhCong',
       CONCAT('MIGRATE-BALANCE:', `MaVi`), 'Số dư ban đầu'
FROM `vi`
WHERE `SoDu` > 0;
/*!40000 ALTER TABLE `giaodichvi` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `thanhtoan`
--

DROP TABLE IF EXISTS `thanhtoan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `thanhtoan` (
  `MaThanhToan` int NOT NULL AUTO_INCREMENT,
  `MaDonHang` int NOT NULL,
  `MaPhuongThuc` int NOT NULL,
  `SoTien` decimal(18,0) NOT NULL,
  `TrangThaiThanhToan` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ChoThanhToan',
  `MaGiaoDich` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ThoiGianThanhToan` datetime DEFAULT NULL,
  PRIMARY KEY (`MaThanhToan`),
  UNIQUE KEY `UQ_ThanhToan_PhuongThuc_GiaoDich` (`MaPhuongThuc`,`MaGiaoDich`),
  UNIQUE KEY `UQ_ThanhToan_Ma_DonHang` (`MaThanhToan`,`MaDonHang`),
  KEY `FK_ThanhToan_DonHang` (`MaDonHang`),
  KEY `FK_ThanhToan_PhuongThuc` (`MaPhuongThuc`),
  CONSTRAINT `FK_ThanhToan_DonHang` FOREIGN KEY (`MaDonHang`) REFERENCES `donhang` (`MaDonHang`),
  CONSTRAINT `FK_ThanhToan_PhuongThuc` FOREIGN KEY (`MaPhuongThuc`) REFERENCES `phuongthucthanhtoan` (`MaPhuongThuc`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `thanhtoan`
--

LOCK TABLES `thanhtoan` WRITE;
/*!40000 ALTER TABLE `thanhtoan` DISABLE KEYS */;
INSERT INTO `thanhtoan` VALUES (1,1,2,80000,'ThanhCong','MOMO_123456789',NULL),(2,7,2,95000,'ThanhCong','MOMO_20261006003954_2','2026-10-06 00:39:54'),(3,8,2,33000,'ThanhCong','MOMO_20261006005540_3','2026-10-06 00:55:40'),(4,9,2,35000,'ThatBai','MOMO_20261006025441_4','2026-10-06 02:54:41'),(5,9,2,35000,'ThanhCong','MOMO_20261006025556_5','2026-10-06 02:55:57'),(6,10,2,118000,'ThanhCong','MOMO_20261006183124_6','2026-10-06 18:31:25'),(7,11,2,35000,'ThatBai','MOMO_20261006184618_7','2026-10-06 18:46:18'),(8,12,2,43000,'ThanhCong','MOMO_20261006185105_8','2026-10-06 18:51:06'),(9,13,1,35000,'ThanhCong',NULL,'2026-10-06 19:03:04'),(10,14,1,35000,'ChoThanhToan',NULL,NULL),(11,15,1,35000,'ThanhCong',NULL,'2026-10-07 01:21:52'),(12,16,2,35000,'ThanhCong','MOMO_20261007012212_12','2026-10-07 01:22:12'),(13,17,3,43000,'ThanhCong','VNPAY_20261007231318_13','2026-10-07 23:13:19'),(14,18,2,110120,'ThatBai','MOMO_20261008013154_14','2026-10-08 01:31:54'),(15,18,2,110120,'ThanhCong','MOMO_20261008013203_15','2026-10-08 01:32:04'),(16,19,1,35000,'ChoThanhToan',NULL,NULL),(17,20,2,35000,'ThanhCong','MOMO_20261008065151_17','2026-10-08 06:51:52'),(18,21,1,55000,'ChoThanhToan',NULL,NULL);
/*!40000 ALTER TABLE `thanhtoan` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `thongbao`
--

DROP TABLE IF EXISTS `thongbao`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `thongbao` (
  `MaThongBao` int NOT NULL AUTO_INCREMENT,
  `MaTaiKhoan` int NOT NULL,
  `TieuDe` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `NoiDung` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `Loai` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `DuongDan` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `DaDoc` tinyint(1) NOT NULL DEFAULT '0',
  `NgayTao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`MaThongBao`),
  KEY `FK_ThongBao_TaiKhoan` (`MaTaiKhoan`),
  CONSTRAINT `FK_ThongBao_TaiKhoan` FOREIGN KEY (`MaTaiKhoan`) REFERENCES `taikhoan` (`MaTaiKhoan`)
) ENGINE=InnoDB AUTO_INCREMENT=45 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `thongbao`
--

LOCK TABLES `thongbao` WRITE;
/*!40000 ALTER TABLE `thongbao` DISABLE KEYS */;
INSERT INTO `thongbao` VALUES (1,9,'Cập nhật đơn hàng','Quán Nhà Hàng Test 123 đã xác nhận đơn DH261006-1785.','DonHang',NULL,1,'2026-10-06 00:55:52'),(2,9,'Cập nhật đơn hàng','Quán Nhà Hàng Test 123 đang chuẩn bị đơn DH261006-1785.','DonHang',NULL,1,'2026-10-06 00:55:54'),(3,9,'Cập nhật đơn hàng','Đơn DH261006-1785 đang được giao đến bạn.','DonHang',NULL,1,'2026-10-06 00:55:55'),(4,9,'Cập nhật đơn hàng','Đơn DH261006-1785 đã hoàn thành. Bạn có thể đánh giá quán và món ăn.','DonHang',NULL,1,'2026-10-06 00:55:56'),(5,9,'Cập nhật đơn hàng','Quán Nhà Hàng Test 123 đã xác nhận đơn DH261006-5139.','DonHang',NULL,1,'2026-10-06 18:38:03'),(6,9,'Cập nhật đơn hàng','Quán Nhà Hàng Test 123 đang chuẩn bị đơn DH261006-5139.','DonHang',NULL,1,'2026-10-06 18:38:13'),(7,9,'Cập nhật đơn hàng','Đơn DH261006-5139 đang được giao đến bạn.','DonHang',NULL,1,'2026-10-06 18:38:22'),(8,9,'Cập nhật đơn hàng','Đơn DH261006-5139 đã hoàn thành. Bạn có thể đánh giá quán và món ăn.','DonHang',NULL,1,'2026-10-06 18:38:29'),(9,9,'Cập nhật đơn hàng','Quán Nhà Hàng Test 123 đã xác nhận đơn DH261006-7924.','DonHang',NULL,1,'2026-10-06 18:51:15'),(10,9,'Cập nhật đơn hàng','Quán Nhà Hàng Test 123 đang chuẩn bị đơn DH261006-7924.','DonHang',NULL,1,'2026-10-06 18:51:16'),(11,9,'Cập nhật đơn hàng','Đơn DH261006-7924 đang được giao đến bạn.','DonHang',NULL,1,'2026-10-06 18:51:17'),(12,9,'Cập nhật đơn hàng','Đơn DH261006-7924 đã hoàn thành. Bạn có thể đánh giá quán và món ăn.','DonHang',NULL,1,'2026-10-06 18:51:18'),(13,2,'Đơn hàng đã bị hủy','Khách hàng đã hủy đơn DH261006-8865. Lý do: tôi muốn đổi món','DonHang',NULL,0,'2026-10-06 18:56:23'),(14,9,'Cập nhật đơn hàng','Quán Nhà Hàng Test 123 đã xác nhận đơn DH261006-9687.','DonHang',NULL,1,'2026-10-06 19:02:51'),(15,9,'Cập nhật đơn hàng','Quán Nhà Hàng Test 123 đang chuẩn bị đơn DH261006-9687.','DonHang',NULL,1,'2026-10-06 19:02:56'),(16,9,'Cập nhật đơn hàng','Đơn DH261006-9687 đang được giao đến bạn.','DonHang',NULL,1,'2026-10-06 19:03:02'),(17,9,'Cập nhật đơn hàng','Đơn DH261006-9687 đã hoàn thành. Bạn có thể đánh giá quán và món ăn.','DonHang',NULL,1,'2026-10-06 19:03:04'),(18,7,'Bạn có đơn hàng mới','Bạn có đơn hàng mới DH261007-5304, trị giá 35.000đ.','DonHang',NULL,1,'2026-10-07 00:54:56'),(19,7,'Bạn có đơn hàng mới','Bạn có đơn hàng mới DH261007-1547, trị giá 35.000đ.','DonHang','/quan/don-hang/15',1,'2026-10-07 01:17:34'),(20,9,'Cập nhật đơn hàng','Quán Nhà Hàng Test 123 đã xác nhận đơn DH261007-1547.','DonHang','/don-hang/15',1,'2026-10-07 01:17:43'),(21,9,'Cập nhật đơn hàng','Quán Nhà Hàng Test 123 đang chuẩn bị đơn DH261007-1547.','DonHang','/don-hang/15',1,'2026-10-07 01:17:53'),(22,9,'Cập nhật đơn hàng','Đơn DH261007-1547 đang được giao đến bạn.','DonHang','/don-hang/15',1,'2026-10-07 01:21:45'),(23,9,'Cập nhật đơn hàng','Đơn DH261007-1547 đã hoàn thành. Bạn có thể đánh giá quán và món ăn.','DonHang','/don-hang/15',1,'2026-10-07 01:21:52'),(24,7,'Bạn có đơn hàng mới','Bạn có đơn hàng mới DH261007-4042, trị giá 35.000đ.','DonHang','/quan/don-hang/16',1,'2026-10-07 01:22:12'),(25,9,'Cập nhật đơn hàng','Quán Nhà Hàng Test 123 đã xác nhận đơn DH261007-4042.','DonHang','/don-hang/16',1,'2026-10-07 01:22:25'),(26,9,'Cập nhật đơn hàng','Quán Nhà Hàng Test 123 đang chuẩn bị đơn DH261007-4042.','DonHang','/don-hang/16',1,'2026-10-07 01:22:31'),(27,9,'Cập nhật đơn hàng','Đơn DH261007-4042 đang được giao đến bạn.','DonHang','/don-hang/16',1,'2026-10-07 01:26:27'),(28,9,'Cập nhật đơn hàng','Đơn DH261007-4042 đã hoàn thành. Bạn có thể đánh giá quán và món ăn.','DonHang','/don-hang/16',1,'2026-10-07 01:31:28'),(29,7,'Bạn có đơn hàng mới','Bạn có đơn hàng mới DH261007-1539, trị giá 43.000đ.','DonHang','/quan/don-hang/17',1,'2026-10-07 23:13:19'),(30,9,'Cập nhật đơn hàng','Quán Nhà Hàng Test 123 đã xác nhận đơn DH261007-1539.','DonHang','/don-hang/17',1,'2026-10-07 23:13:27'),(31,9,'Cập nhật đơn hàng','Quán Nhà Hàng Test 123 đang chuẩn bị đơn DH261007-1539.','DonHang','/don-hang/17',1,'2026-10-07 23:13:39'),(32,9,'Cập nhật đơn hàng','Đơn DH261007-1539 đang được giao đến bạn.','DonHang','/don-hang/17',1,'2026-10-07 23:13:47'),(33,9,'Cập nhật đơn hàng','Đơn DH261007-1539 đã hoàn thành. Bạn có thể đánh giá quán và món ăn.','DonHang','/don-hang/17',1,'2026-10-07 23:13:55'),(34,7,'Bạn có đơn hàng mới','Bạn có đơn hàng mới DH261008-8562, trị giá 110.120đ.','DonHang','/quan/don-hang/18',1,'2026-10-08 01:32:04'),(35,7,'Đơn hàng đã bị hủy','Khách hàng đã hủy đơn DH261008-8562. Lý do: đổi','DonHang','/quan/don-hang/18',1,'2026-10-08 01:40:25'),(36,7,'Bạn có đơn hàng mới','Bạn có đơn hàng mới DH261008-1728, trị giá 35.000đ.','DonHang','/quan/don-hang/19',1,'2026-10-08 02:04:25'),(37,9,'Cập nhật đơn hàng','Quán Nhà Hàng Test 123 đã xác nhận đơn DH261008-1728.','DonHang','/don-hang/19',1,'2026-10-08 02:04:44'),(38,7,'Bạn có đơn hàng mới','Bạn có đơn hàng mới DH261008-8488, trị giá 35.000đ.','DonHang','/quan/don-hang/20',1,'2026-10-08 06:51:52'),(39,9,'Đơn hàng đã tự hủy','Đơn DH261006-9071 đã tự hủy vì chưa hoàn tất thanh toán trong 15 phút.','DonHang','/don-hang/11',0,'2026-10-09 22:10:25'),(40,9,'Cập nhật đơn hàng','Quán Nhà Hàng Test 123 đã xác nhận đơn DH261008-8488.','DonHang','/don-hang/20',0,'2026-10-09 22:32:17'),(41,9,'Cập nhật đơn hàng','Quán Nhà Hàng Test 123 đang chuẩn bị đơn DH261008-8488.','DonHang','/don-hang/20',0,'2026-10-09 22:32:23'),(42,9,'Cập nhật đơn hàng','Đơn DH261008-8488 đang được giao đến bạn.','DonHang','/don-hang/20',0,'2026-10-09 22:32:27'),(43,9,'Cập nhật đơn hàng','Đơn DH261008-8488 đã hoàn thành. Bạn có thể đánh giá quán và món ăn.','DonHang','/don-hang/20',0,'2026-10-09 22:32:29'),(44,7,'Bạn có đơn hàng mới','Bạn có đơn hàng mới DH261012-4706, trị giá 55.000đ.','DonHang','/quan/don-hang/21',0,'2026-10-12 00:23:47');
/*!40000 ALTER TABLE `thongbao` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `topping`
--

DROP TABLE IF EXISTS `topping`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `topping` (
  `MaTopping` int NOT NULL AUTO_INCREMENT,
  `MaNhomTopping` int NOT NULL,
  `TenTopping` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `GiaThem` decimal(18,0) NOT NULL DEFAULT '0',
  `TrangThai` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`MaTopping`),
  KEY `FK_Topping_NhomTopping` (`MaNhomTopping`),
  CONSTRAINT `FK_Topping_NhomTopping` FOREIGN KEY (`MaNhomTopping`) REFERENCES `nhomtopping` (`MaNhomTopping`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `topping`
--

LOCK TABLES `topping` WRITE;
/*!40000 ALTER TABLE `topping` DISABLE KEYS */;
INSERT INTO `topping` VALUES (1,1,'Size M (Vừa)',0,1),(2,1,'Size L (Lớn)',10000,1),(3,2,'Trân châu đen',10000,1),(4,2,'Thạch lô hội',8000,1),(5,3,'Trân châu',8000,1),(6,3,'ít đá',0,1),(7,3,'vừa',0,1),(8,4,'L',0,1),(9,4,'M',0,1);
/*!40000 ALTER TABLE `topping` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `trangthaidonhang`
--

DROP TABLE IF EXISTS `trangthaidonhang`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trangthaidonhang` (
  `MaTrangThai` int NOT NULL AUTO_INCREMENT,
  `TenTrangThai` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `ThuTu` int DEFAULT NULL,
  PRIMARY KEY (`MaTrangThai`),
  UNIQUE KEY `TenTrangThai` (`TenTrangThai`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `trangthaidonhang`
--

LOCK TABLES `trangthaidonhang` WRITE;
/*!40000 ALTER TABLE `trangthaidonhang` DISABLE KEYS */;
INSERT INTO `trangthaidonhang` VALUES (1,'ChoXacNhan',1),(2,'DaXacNhan',2),(3,'DangChuanBi',3),(4,'DangGiao',4),(5,'HoanThanh',5),(6,'DaHuy',6);
/*!40000 ALTER TABLE `trangthaidonhang` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-12 13:26:14
