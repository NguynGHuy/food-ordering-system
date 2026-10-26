-- FOODIE - DATABASE SCHEMA (bảng + dữ liệu danh mục hệ thống)
-- Dữ liệu demo nằm ở SeedDemo.sql (chạy SAU file này).
-- Safe fresh-install script: NO database/table is dropped. If DB exists, stop.
-- Then run SeedDemo.sql. Never run on your active database.

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


--
-- Table structure for table `chitietdonhang`
--

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chitietdonhang`
--


--
-- Table structure for table `chitietdonhang_topping`
--

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


--
-- Table structure for table `chitietgiohang`
--

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chitietgiohang`
--


--
-- Table structure for table `chitietgiohang_topping`
--

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


--
-- Table structure for table `danhgiamonan`
--

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `danhgiamonan`
--


--
-- Table structure for table `danhgianhahang`
--

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `danhgianhahang`
--


--
-- Table structure for table `danhmuc`
--

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `danhmuc`
--


--
-- Table structure for table `diachi`
--

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `diachi`
--


--
-- Table structure for table `doisoatnhahang`
--

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


--
-- Table structure for table `lichsudoisoat`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lichsudoisoat` (
  `MaLichSuDoiSoat` bigint NOT NULL AUTO_INCREMENT,
  `MaDoiSoat` int NOT NULL,
  `MaTaiKhoan` int NOT NULL,
  `HanhDong` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `TrangThaiTruoc` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `TrangThaiSau` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `MaGiaoDich` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `GhiChu` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ThoiGian` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`MaLichSuDoiSoat`),
  KEY `IX_LichSuDoiSoat_Ky_ThoiGian` (`MaDoiSoat`,`ThoiGian`),
  KEY `FK_LichSuDoiSoat_TaiKhoan` (`MaTaiKhoan`),
  CONSTRAINT `FK_LichSuDoiSoat_DoiSoat` FOREIGN KEY (`MaDoiSoat`) REFERENCES `doisoatnhahang` (`MaDoiSoat`) ON DELETE CASCADE,
  CONSTRAINT `FK_LichSuDoiSoat_TaiKhoan` FOREIGN KEY (`MaTaiKhoan`) REFERENCES `taikhoan` (`MaTaiKhoan`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lichsudoisoat`
--


--
-- Table structure for table `donhang`
--

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `donhang`
--


--
-- Table structure for table `giohang`
--

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `giohang`
--


--
-- Table structure for table `hoantien`
--

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


--
-- Table structure for table `hopdongnhahang`
--

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


--
-- Table structure for table `hosophaplynhahang`
--

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


--
-- Table structure for table `idempotencyrequest`
--

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


--
-- Table structure for table `khachhang`
--

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `khachhang`
--


--
-- Table structure for table `khachhang_khuyenmai`
--

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


--
-- Table structure for table `khuyenmai`
--

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
  `SoLuotToiDaMoiKhach` int NOT NULL DEFAULT '1',
  `NgayBatDau` datetime NOT NULL,
  `NgayKetThuc` datetime NOT NULL,
  `TrangThai` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`MaKhuyenMai`),
  UNIQUE KEY `MaCode` (`MaCode`),
  KEY `FK_KhuyenMai_NhaHang` (`MaNhaHang`),
  CONSTRAINT `FK_KhuyenMai_NhaHang` FOREIGN KEY (`MaNhaHang`) REFERENCES `nhahang` (`MaNhaHang`),
  CONSTRAINT `CK_KhuyenMai_LoaiGiam` CHECK ((`LoaiGiam` in (_utf8mb4'PhanTram',_utf8mb4'SoTien'))),
  CONSTRAINT `CK_KhuyenMai_GioiHan` CHECK ((`SoLuong` > 0) and (`SoLuongDaDung` >= 0) and (`SoLuongDaDung` <= `SoLuong`) and (`SoLuotToiDaMoiKhach` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `khuyenmai`
--


--
-- Table structure for table `lichsutrangthaidonhang`
--

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lichsutrangthaidonhang`
--


--
-- Table structure for table `monan`
--

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `monan`
--


--
-- Table structure for table `monan_nhomtopping`
--

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


--
-- Table structure for table `nhahang`
--

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `nhahang`
--


--
-- Table structure for table `nhomtopping`
--

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `nhomtopping`
--


--
-- Table structure for table `phuongthucthanhtoan`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `phuongthucthanhtoan` (
  `MaPhuongThuc` int NOT NULL AUTO_INCREMENT,
  `TenPhuongThuc` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `TrangThai` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`MaPhuongThuc`),
  UNIQUE KEY `TenPhuongThuc` (`TenPhuongThuc`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role` (
  `MaRole` int NOT NULL AUTO_INCREMENT,
  `TenRole` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `MoTa` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`MaRole`),
  UNIQUE KEY `TenRole` (`TenRole`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `taikhoan`
--


--
-- Shared authentication state (survives restart and works across API instances)
--

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


--
-- Table structure for table `vi`
--

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


--
-- Table structure for table `giaodichvi`
--

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


--
-- Table structure for table `thanhtoan`
--

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `thanhtoan`
--


--
-- Table structure for table `thongbao`
--

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `thongbao`
--


--
-- Table structure for table `topping`
--

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `topping`
--


--
-- Table structure for table `trangthaidonhang`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trangthaidonhang` (
  `MaTrangThai` int NOT NULL AUTO_INCREMENT,
  `TenTrangThai` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `ThuTu` int DEFAULT NULL,
  PRIMARY KEY (`MaTrangThai`),
  UNIQUE KEY `TenTrangThai` (`TenTrangThai`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
