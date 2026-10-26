using System.Security.Claims;
using System.Text.RegularExpressions;
using DatMonAnOnline.API.Controllers;
using DatMonAnOnline.API.Models;
using DatMonAnOnline.API.Options;
using DatMonAnOnline.API.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using MySqlConnector;
using Xunit;

namespace DatMonAnOnline.Tests;

public sealed class MySqlFactAttribute : FactAttribute
{
    public MySqlFactAttribute()
    {
        if (Environment.GetEnvironmentVariable("FOODIE_RUN_MYSQL_TESTS") != "1")
            Skip = "Requires isolated loopback MySQL test instance; see AUDIT_PROGRESS.md.";
    }
}

internal sealed class IsolatedMySql(string connectionString)
{
    public DatMonAnOnlineContext Open(params Microsoft.EntityFrameworkCore.Diagnostics.IInterceptor[] interceptors) => new(new DbContextOptionsBuilder<DatMonAnOnlineContext>()
        .UseMySql(connectionString, new MySqlServerVersion(new Version(8, 0, 45))).AddInterceptors(interceptors).Options);

    public static async Task<IsolatedMySql> CreateAsync(bool installSchema = true)
    {
        // Deliberately never read production/user-secrets connection strings.
        const string server = "Server=127.0.0.1;Port=13487;User ID=root;Connection Timeout=3;Default Command Timeout=15";
        await using var connection = new MySqlConnection(server);
        await connection.OpenAsync();
        var dataDirectory = (string)(await new MySqlCommand("SELECT @@datadir", connection).ExecuteScalarAsync())!;
        if (!dataDirectory.Replace('\\', '/').TrimEnd('/').EndsWith("/.build-check/audit-mysql-20261024", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Refusing to write outside the isolated audit MySQL instance.");
        var database = "foodie_audit_" + Guid.NewGuid().ToString("N");
        await new MySqlCommand($"CREATE DATABASE `{database}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci", connection).ExecuteNonQueryAsync();
        await connection.ChangeDatabaseAsync(database);
        if (!installSchema) return new IsolatedMySql(server + ";Database=" + database);
        // Import ONLY CREATE TABLE statements: never run installer DROP/seed SQL.
        var sql = await File.ReadAllTextAsync(Path.Combine(AppContext.BaseDirectory, "Database.sql"));
        var tables = Regex.Matches(sql, @"CREATE TABLE `[^`]+` \([\s\S]*?\) ENGINE=[^;]+;", RegexOptions.None, TimeSpan.FromSeconds(2));
        Assert.True(tables.Count >= 30, "Schema extraction failed.");
        await new MySqlCommand("SET FOREIGN_KEY_CHECKS=0", connection).ExecuteNonQueryAsync();
        foreach (Match table in tables)
            await new MySqlCommand(table.Value, connection).ExecuteNonQueryAsync();
        await new MySqlCommand("SET FOREIGN_KEY_CHECKS=1", connection).ExecuteNonQueryAsync();
        var fixture = new IsolatedMySql(server + ";Database=" + database);
        await fixture.SeedAsync();
        return fixture;
    }

    private async Task SeedAsync()
    {
        await using var db = Open();
        db.Roles.AddRange(new Role { MaRole = 1, TenRole = "Admin" }, new Role { MaRole = 2, TenRole = "Quan" }, new Role { MaRole = 3, TenRole = "KhachHang" });
        db.Taikhoans.AddRange(
            new Taikhoan { MaTaiKhoan = 1, MaRole = 3, Email = "customer@example.invalid", MatKhau = "test-only", TrangThai = true },
            new Taikhoan { MaTaiKhoan = 2, MaRole = 2, Email = "restaurant@example.invalid", MatKhau = "test-only", TrangThai = true },
            new Taikhoan { MaTaiKhoan = 3, MaRole = 1, Email = "admin@example.invalid", MatKhau = "test-only", TrangThai = true });
        db.Khachhangs.Add(new Khachhang { MaKhachHang = 1, MaTaiKhoan = 1, HoTen = "Test customer" });
        db.Nhahangs.Add(new Nhahang { MaNhaHang = 1, MaTaiKhoan = 2, TenNhaHang = "Test restaurant", DiaChiQuan = "Test address", TrangThaiDuyet = "DaDuyet", TrangThaiHoatDong = "MoCua", CheDoHoatDong = "MoThuCong", PhiShipMacDinh = 15000 });
        db.Danhmucs.Add(new Danhmuc { MaDanhMuc = 1, MaNhaHang = 1, TenDanhMuc = "Test menu" });
        db.Monans.Add(new Monan { MaMonAn = 1, MaNhaHang = 1, MaDanhMuc = 1, TenMonAn = "Test item", Gia = 10010, TrangThai = true });
        db.Diachis.Add(new Diachi { MaDiaChi = 1, MaKhachHang = 1, TenNguoiNhan = "Test recipient", SoDienThoaiNhan = "0000000001", DiaChiCuThe = "Test address" });
        var now = DateTime.Now;
        db.Hopdongnhahangs.Add(new Hopdongnhahang { MaHopDong = 1, MaNhaHang = 1, SoHopDong = "TEST-001", NguoiDaiDien = "Test representative", PhienBanDieuKhoan = "1.0", TyLePhiNenTang = 5, TrangThai = "HieuLuc", NgayBatDau = DateOnly.FromDateTime(now.AddDays(-10)), NgayKetThuc = DateOnly.FromDateTime(now.AddDays(10)), ThoiGianKy = now, ThoiGianDuyet = now, MaTaiKhoanDuyet = 3, FileHopDong = "test-only.txt" });
        db.Phuongthucthanhtoans.AddRange(new Phuongthucthanhtoan { MaPhuongThuc = 1, TenPhuongThuc = "COD", TrangThai = true }, new Phuongthucthanhtoan { MaPhuongThuc = 2, TenPhuongThuc = "MoMo", TrangThai = true }, new Phuongthucthanhtoan { MaPhuongThuc = 5, TenPhuongThuc = "FoodPay", TrangThai = true });
        var statuses = new[] { "ChoXacNhan", "DaXacNhan", "DangChuanBi", "DangGiao", "HoanThanh", "DaHuy" };
        for (var i = 0; i < statuses.Length; i++) db.Trangthaidonhangs.Add(new() { MaTrangThai = i + 1, TenTrangThai = statuses[i], ThuTu = i + 1 });
        await db.SaveChangesAsync();
    }

    public static T AsCustomer<T>(T controller, string? idempotencyKey = null) where T : ControllerBase
    {
        var http = new DefaultHttpContext();
        http.User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, "1"), new Claim(ClaimTypes.Role, "KhachHang")], "Test"));
        http.Request.Method = "POST";
        http.Request.Path = "/api/don-hang/dat-hang";
        http.Request.Headers["Idempotency-Key"] = idempotencyKey ?? Guid.NewGuid().ToString();
        controller.ControllerContext = new ControllerContext { HttpContext = http };
        return controller;
    }

    public static GioHangController Cart(DatMonAnOnlineContext db) => AsCustomer(new GioHangController(db, new CheckoutCartReservationService()));
    public static DonHangController Orders(DatMonAnOnlineContext db, string? key = null, TimeProvider? clock = null)
    {
        var wallet = new WalletService(db);
        var settlement = new OrderIncomeSettlementService(db, wallet, Options.Create(new DoiSoatOptions { BatDauApDung = new DateTime(2020, 1, 1) }));
        return AsCustomer(new DonHangController(db, new NoopRealtime(), NullLogger<DonHangController>.Instance, new CheckoutCartReservationService(), wallet, settlement, clock), key);
    }

    internal sealed class NoopRealtime : IRealtimeNotificationService
    {
        public Task GuiThongBaoAsync(int id, object payload) => Task.CompletedTask;
        public Task GuiDonHangMoiAsync(int id, object payload) => Task.CompletedTask;
        public Task GuiDonHangCapNhatAsync(int id, object payload) => Task.CompletedTask;
        public Task GuiDonHangDaHuyAsync(int id, object payload) => Task.CompletedTask;
        public Task GuiDuLieuThayDoiAsync(int id, IEnumerable<string> scopes, object? payload = null) => Task.CompletedTask;
        public Task GuiDuLieuThayDoiTheoVaiTroAsync(string role, IEnumerable<string> scopes, object? payload = null) => Task.CompletedTask;
    }
}
