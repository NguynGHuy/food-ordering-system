using Microsoft.EntityFrameworkCore;

namespace DatMonAnOnline.API.Models;

public partial class DatMonAnOnlineContext : DbContext
{
    public DatMonAnOnlineContext(DbContextOptions<DatMonAnOnlineContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Hosophaplynhahang> Hosophaplynhahangs { get; set; }

    public virtual DbSet<Authratelimit> Authratelimits { get; set; }

    public virtual DbSet<Chitietdoisoat> Chitietdoisoats { get; set; }

    public virtual DbSet<Chitietdonhang> Chitietdonhangs { get; set; }

    public virtual DbSet<ChitietdonhangTopping> ChitietdonhangToppings { get; set; }

    public virtual DbSet<Chitietgiohang> Chitietgiohangs { get; set; }

    public virtual DbSet<ChitietgiohangTopping> ChitietgiohangToppings { get; set; }

    public virtual DbSet<Danhgiamonan> Danhgiamonans { get; set; }

    public virtual DbSet<Danhgianhahang> Danhgianhahangs { get; set; }

    public virtual DbSet<Danhmuc> Danhmucs { get; set; }

    public virtual DbSet<Diachi> Diachis { get; set; }

    public virtual DbSet<Doisoatnhahang> Doisoatnhahangs { get; set; }

    public virtual DbSet<Donhang> Donhangs { get; set; }

    public virtual DbSet<Giohang> Giohangs { get; set; }

    public virtual DbSet<Giaodichvi> Giaodichvis { get; set; }

    public virtual DbSet<Hoantien> Hoantiens { get; set; }

    public virtual DbSet<Lichsudoisoat> Lichsudoisoats { get; set; }

    public virtual DbSet<Hopdongnhahang> Hopdongnhahangs { get; set; }

    public virtual DbSet<Khachhang> Khachhangs { get; set; }

    public virtual DbSet<KhachhangKhuyenmai> KhachhangKhuyenmais { get; set; }

    public virtual DbSet<Khuyenmai> Khuyenmais { get; set; }

    public virtual DbSet<Lichsutrangthaidonhang> Lichsutrangthaidonhangs { get; set; }

    public virtual DbSet<Loginattempt> Loginattempts { get; set; }

    public virtual DbSet<Monan> Monans { get; set; }

    public virtual DbSet<Nhahang> Nhahangs { get; set; }

    public virtual DbSet<Nhomtopping> Nhomtoppings { get; set; }

    public virtual DbSet<Phuongthucthanhtoan> Phuongthucthanhtoans { get; set; }

    public virtual DbSet<Passwordresetrequest> Passwordresetrequests { get; set; }

    public virtual DbSet<Role> Roles { get; set; }

    public virtual DbSet<Taikhoan> Taikhoans { get; set; }

    public virtual DbSet<Thanhtoan> Thanhtoans { get; set; }

    public virtual DbSet<Thamdinhhosonhahang> Thamdinhhosonhahangs { get; set; }

    public virtual DbSet<Thongbao> Thongbaos { get; set; }

    public virtual DbSet<Topping> Toppings { get; set; }

    public virtual DbSet<Trangthaidonhang> Trangthaidonhangs { get; set; }

    public virtual DbSet<Vi> Vis { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder
            .UseCollation("utf8mb4_unicode_ci")
            .HasCharSet("utf8mb4");

        modelBuilder.Entity<Authratelimit>(entity =>
        {
            entity.HasKey(e => e.PartitionHash).HasName("PRIMARY");
            entity.ToTable("authratelimit");
            entity.HasIndex(e => e.ExpiresAtUtc, "IX_AuthRateLimit_ExpiresAtUtc");
            entity.Property(e => e.PartitionHash)
                .HasMaxLength(64)
                .IsFixedLength()
                .UseCollation("ascii_bin")
                .HasCharSet("ascii");
            entity.Property(e => e.Policy).HasMaxLength(50);
            entity.Property(e => e.WindowStartUtc).HasColumnType("datetime(6)");
            entity.Property(e => e.ExpiresAtUtc).HasColumnType("datetime(6)");
        });

        modelBuilder.Entity<Loginattempt>(entity =>
        {
            entity.HasKey(e => e.EmailHash).HasName("PRIMARY");
            entity.ToTable("loginattempt");
            entity.HasIndex(e => e.NgayCapNhatUtc, "IX_LoginAttempt_NgayCapNhatUtc");
            entity.Property(e => e.EmailHash)
                .HasMaxLength(64)
                .IsFixedLength()
                .UseCollation("ascii_bin")
                .HasCharSet("ascii");
            entity.Property(e => e.CuaSoBatDauUtc).HasColumnType("datetime(6)");
            entity.Property(e => e.KhoaDenUtc).HasColumnType("datetime(6)");
            entity.Property(e => e.NgayCapNhatUtc).HasColumnType("datetime(6)");
        });

        modelBuilder.Entity<Passwordresetrequest>(entity =>
        {
            entity.HasKey(e => e.EmailHash).HasName("PRIMARY");
            entity.ToTable("passwordresetrequest");
            entity.HasIndex(e => e.MaYeuCau, "UQ_PasswordReset_MaYeuCau").IsUnique();
            entity.HasIndex(e => e.HetHanUtc, "IX_PasswordReset_HetHanUtc");
            entity.HasIndex(e => e.MaTaiKhoan, "FK_PasswordReset_TaiKhoan");
            entity.Property(e => e.EmailHash)
                .HasMaxLength(64)
                .IsFixedLength()
                .UseCollation("ascii_bin")
                .HasCharSet("ascii");
            entity.Property(e => e.MaYeuCau)
                .HasMaxLength(32)
                .IsFixedLength()
                .UseCollation("ascii_bin")
                .HasCharSet("ascii");
            entity.Property(e => e.MaXacNhanHash).HasMaxLength(88).HasCharSet("ascii");
            entity.Property(e => e.MatKhauLucTaoYeuCau).HasMaxLength(255);
            entity.Property(e => e.HetHanUtc).HasColumnType("datetime(6)");
            entity.Property(e => e.NgayTaoUtc).HasColumnType("datetime(6)");

            entity.HasOne<Taikhoan>()
                .WithMany()
                .HasForeignKey(e => e.MaTaiKhoan)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_PasswordReset_TaiKhoan");
        });

        modelBuilder.Entity<Chitietdoisoat>(entity =>
        {
            entity.HasKey(e => e.MaChiTietDoiSoat).HasName("PRIMARY");

            entity.ToTable("chitietdoisoat");

            entity.HasIndex(e => new { e.MaDonHang, e.MaNhaHang }, "IX_ChiTietDoiSoat_DonHang_NhaHang");

            entity.HasIndex(e => new { e.MaDoiSoat, e.MaNhaHang }, "IX_ChiTietDoiSoat_Ky_NhaHang");

            entity.HasIndex(e => e.MaDonHang, "UQ_ChiTietDoiSoat_DonHang").IsUnique();

            entity.Property(e => e.GiamGiaHeThong).HasPrecision(18);
            entity.Property(e => e.GiamGiaNhaHang).HasPrecision(18);
            entity.Property(e => e.NgayThem)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime");
            entity.Property(e => e.PhiNenTang).HasPrecision(18);
            entity.Property(e => e.PhiShip).HasPrecision(18);
            entity.Property(e => e.SoTienCanDoiSoat)
                .HasPrecision(18)
                .HasComputedColumnSql("`SoTienNhaHangNhan` - `TienNhaHangDaThu`", true);
            entity.Property(e => e.SoTienHoan).HasPrecision(18);
            entity.Property(e => e.SoTienNhaHangNhan).HasPrecision(18);
            entity.Property(e => e.TienNhaHangDaThu).HasPrecision(18);
            entity.Property(e => e.TongTienHang).HasPrecision(18);
            entity.Property(e => e.TyLePhiNenTang).HasPrecision(5, 2);

            entity.HasOne(d => d.Doisoatnhahang).WithMany(p => p.Chitietdoisoats)
                .HasPrincipalKey(p => new { p.MaDoiSoat, p.MaNhaHang })
                .HasForeignKey(d => new { d.MaDoiSoat, d.MaNhaHang })
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ChiTietDoiSoat_Ky_NhaHang");

            entity.HasOne(d => d.Donhang).WithMany(p => p.Chitietdoisoats)
                .HasPrincipalKey(p => new { p.MaDonHang, p.MaNhaHang })
                .HasForeignKey(d => new { d.MaDonHang, d.MaNhaHang })
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ChiTietDoiSoat_DonHang_NhaHang");
        });

        modelBuilder.Entity<Chitietdonhang>(entity =>
        {
            entity.HasKey(e => e.MaChiTietDonHang).HasName("PRIMARY");

            entity.ToTable("chitietdonhang");

            entity.HasIndex(e => e.MaDonHang, "FK_ChiTietDonHang_DonHang");

            entity.HasIndex(e => e.MaMonAn, "FK_ChiTietDonHang_MonAn");

            entity.Property(e => e.DonGia).HasPrecision(18);
            entity.Property(e => e.GhiChu).HasMaxLength(255);
            entity.Property(e => e.TenMonAnLucDat).HasMaxLength(150);
            entity.Property(e => e.ThanhTien).HasPrecision(18);

            entity.HasOne(d => d.MaDonHangNavigation).WithMany(p => p.Chitietdonhangs)
                .HasForeignKey(d => d.MaDonHang)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ChiTietDonHang_DonHang");

            entity.HasOne(d => d.MaMonAnNavigation).WithMany(p => p.Chitietdonhangs)
                .HasForeignKey(d => d.MaMonAn)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ChiTietDonHang_MonAn");
        });

        modelBuilder.Entity<ChitietdonhangTopping>(entity =>
        {
            entity.HasKey(e => new { e.MaChiTietDonHang, e.MaTopping })
                .HasName("PRIMARY")
                .HasAnnotation("MySql:IndexPrefixLength", new[] { 0, 0 });

            entity.ToTable("chitietdonhang_topping");

            entity.HasIndex(e => e.MaTopping, "FK_CTDHTopping_Topping");

            entity.Property(e => e.GiaThemLucDat).HasPrecision(18);
            entity.Property(e => e.SoLuong).HasDefaultValueSql("'1'");
            entity.Property(e => e.TenToppingLucDat).HasMaxLength(100);

            entity.HasOne(d => d.MaChiTietDonHangNavigation).WithMany(p => p.ChitietdonhangToppings)
                .HasForeignKey(d => d.MaChiTietDonHang)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_CTDHTopping_ChiTietDonHang");

            entity.HasOne(d => d.MaToppingNavigation).WithMany(p => p.ChitietdonhangToppings)
                .HasForeignKey(d => d.MaTopping)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_CTDHTopping_Topping");
        });

        modelBuilder.Entity<Chitietgiohang>(entity =>
        {
            entity.HasKey(e => e.MaChiTietGioHang).HasName("PRIMARY");

            entity.ToTable("chitietgiohang");

            entity.HasIndex(e => e.MaGioHang, "FK_ChiTietGioHang_GioHang");

            entity.HasIndex(e => e.MaMonAn, "FK_ChiTietGioHang_MonAn");

            entity.Property(e => e.GhiChu).HasMaxLength(200);
            entity.Property(e => e.SoLuong).HasDefaultValueSql("'1'");

            entity.HasOne(d => d.MaGioHangNavigation).WithMany(p => p.Chitietgiohangs)
                .HasForeignKey(d => d.MaGioHang)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ChiTietGioHang_GioHang");

            entity.HasOne(d => d.MaMonAnNavigation).WithMany(p => p.Chitietgiohangs)
                .HasForeignKey(d => d.MaMonAn)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ChiTietGioHang_MonAn");
        });

        modelBuilder.Entity<ChitietgiohangTopping>(entity =>
        {
            entity.HasKey(e => new { e.MaChiTietGioHang, e.MaTopping })
                .HasName("PRIMARY")
                .HasAnnotation("MySql:IndexPrefixLength", new[] { 0, 0 });

            entity.ToTable("chitietgiohang_topping");

            entity.HasIndex(e => e.MaTopping, "FK_CTGHTopping_Topping");

            entity.Property(e => e.GiaThem).HasPrecision(18);
            entity.Property(e => e.SoLuong).HasDefaultValueSql("'1'");

            entity.HasOne(d => d.MaChiTietGioHangNavigation).WithMany(p => p.ChitietgiohangToppings)
                .HasForeignKey(d => d.MaChiTietGioHang)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_CTGHTopping_ChiTietGioHang");

            entity.HasOne(d => d.MaToppingNavigation).WithMany(p => p.ChitietgiohangToppings)
                .HasForeignKey(d => d.MaTopping)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_CTGHTopping_Topping");
        });

        modelBuilder.Entity<Danhgiamonan>(entity =>
        {
            entity.HasKey(e => e.MaDanhGia).HasName("PRIMARY");

            entity.ToTable("danhgiamonan");

            entity.HasIndex(e => e.MaDonHang, "FK_DanhGiaMonAn_DonHang");

            entity.HasIndex(e => e.MaMonAn, "FK_DanhGiaMonAn_MonAn");

            entity.HasIndex(e => new { e.MaKhachHang, e.MaMonAn, e.MaDonHang }, "UQ_DanhGiaMonAn").IsUnique();

            entity.Property(e => e.HinhAnh).HasMaxLength(255);
            entity.Property(e => e.NgayDanhGia)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime");
            entity.Property(e => e.NoiDung).HasMaxLength(500);

            entity.HasOne(d => d.MaDonHangNavigation).WithMany(p => p.Danhgiamonans)
                .HasForeignKey(d => d.MaDonHang)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_DanhGiaMonAn_DonHang");

            entity.HasOne(d => d.MaKhachHangNavigation).WithMany(p => p.Danhgiamonans)
                .HasForeignKey(d => d.MaKhachHang)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_DanhGiaMonAn_KhachHang");

            entity.HasOne(d => d.MaMonAnNavigation).WithMany(p => p.Danhgiamonans)
                .HasForeignKey(d => d.MaMonAn)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_DanhGiaMonAn_MonAn");
        });

        modelBuilder.Entity<Danhgianhahang>(entity =>
        {
            entity.HasKey(e => e.MaDanhGia).HasName("PRIMARY");

            entity.ToTable("danhgianhahang");

            entity.HasIndex(e => e.MaDonHang, "FK_DanhGiaNhaHang_DonHang");

            entity.HasIndex(e => e.MaNhaHang, "FK_DanhGiaNhaHang_NhaHang");

            entity.HasIndex(e => new { e.MaKhachHang, e.MaNhaHang, e.MaDonHang }, "UQ_DanhGiaNhaHang").IsUnique();

            entity.Property(e => e.NgayDanhGia)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime");
            entity.Property(e => e.NoiDung).HasMaxLength(500);

            entity.HasOne(d => d.MaDonHangNavigation).WithMany(p => p.Danhgianhahangs)
                .HasForeignKey(d => d.MaDonHang)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_DanhGiaNhaHang_DonHang");

            entity.HasOne(d => d.MaKhachHangNavigation).WithMany(p => p.Danhgianhahangs)
                .HasForeignKey(d => d.MaKhachHang)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_DanhGiaNhaHang_KhachHang");

            entity.HasOne(d => d.MaNhaHangNavigation).WithMany(p => p.Danhgianhahangs)
                .HasForeignKey(d => d.MaNhaHang)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_DanhGiaNhaHang_NhaHang");
        });

        modelBuilder.Entity<Danhmuc>(entity =>
        {
            entity.HasKey(e => e.MaDanhMuc).HasName("PRIMARY");

            entity.ToTable("danhmuc");

            entity.HasIndex(e => e.MaNhaHang, "FK_DanhMuc_NhaHang");

            entity.Property(e => e.TenDanhMuc).HasMaxLength(100);

            entity.HasOne(d => d.MaNhaHangNavigation).WithMany(p => p.Danhmucs)
                .HasForeignKey(d => d.MaNhaHang)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_DanhMuc_NhaHang");
        });

        modelBuilder.Entity<Diachi>(entity =>
        {
            entity.HasKey(e => e.MaDiaChi).HasName("PRIMARY");

            entity.ToTable("diachi");

            entity.HasIndex(e => e.MaKhachHang, "FK_DiaChi_KhachHang");

            entity.Property(e => e.DiaChiCuThe).HasMaxLength(255);
            entity.Property(e => e.GhiChu).HasMaxLength(100);
            entity.Property(e => e.SoDienThoaiNhan).HasMaxLength(15);
            entity.Property(e => e.TenNguoiNhan).HasMaxLength(100);

            entity.HasOne(d => d.MaKhachHangNavigation).WithMany(p => p.Diachis)
                .HasForeignKey(d => d.MaKhachHang)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_DiaChi_KhachHang");
        });

        modelBuilder.Entity<Doisoatnhahang>(entity =>
        {
            entity.HasKey(e => e.MaDoiSoat).HasName("PRIMARY");

            entity.ToTable("doisoatnhahang");

            entity.HasIndex(e => e.MaTaiKhoanDuyet, "FK_DoiSoat_NguoiDuyet");

            entity.HasIndex(e => new { e.MaNhaHang, e.TrangThai }, "IX_DoiSoat_NhaHang_TrangThai");

            entity.HasIndex(e => new { e.MaNhaHang, e.MaDoiSoat }, "IX_DoiSoat_NhaHang_MaDoiSoat");

            entity.HasIndex(e => new { e.MaNhaHang, e.TuNgay, e.DenNgay }, "UQ_DoiSoat_Ky").IsUnique();

            entity.HasIndex(e => e.MaGiaoDichDoiSoat, "UQ_DoiSoat_MaGiaoDich").IsUnique();

            entity.HasIndex(e => new { e.MaDoiSoat, e.MaNhaHang }, "UQ_DoiSoat_Ma_NhaHang").IsUnique();

            entity.Property(e => e.GhiChu).HasMaxLength(500);
            entity.Property(e => e.MaGiaoDichDoiSoat).HasMaxLength(100);
            entity.Property(e => e.NgayTao)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime");
            entity.Property(e => e.NgayThanhToan).HasColumnType("datetime");
            entity.Property(e => e.NgayXacNhan).HasColumnType("datetime");
            entity.Property(e => e.SoTienCanDoiSoat)
                .HasPrecision(18)
                .HasComputedColumnSql("`TongTienNhaHangNhan` - `TongTienNhaHangDaThu`", true);
            entity.Property(e => e.TongGiamGiaHeThong).HasPrecision(18);
            entity.Property(e => e.TongGiamGiaNhaHang).HasPrecision(18);
            entity.Property(e => e.TongPhiNenTang).HasPrecision(18);
            entity.Property(e => e.TongPhiShip).HasPrecision(18);
            entity.Property(e => e.TongTienHang).HasPrecision(18);
            entity.Property(e => e.TongTienHoan).HasPrecision(18);
            entity.Property(e => e.TongTienNhaHangDaThu).HasPrecision(18);
            entity.Property(e => e.TongTienNhaHangNhan).HasPrecision(18);
            entity.Property(e => e.TrangThai)
                .HasDefaultValueSql("'MoiTao'")
                .HasColumnType("enum('MoiTao','ChoXacNhan','DaXacNhan','DaThanhToan','TranhChap')");

            entity.HasOne(d => d.MaNhaHangNavigation).WithMany(p => p.Doisoatnhahangs)
                .HasForeignKey(d => d.MaNhaHang)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_DoiSoat_NhaHang");

            entity.HasOne(d => d.MaTaiKhoanDuyetNavigation).WithMany(p => p.Doisoatnhahangs)
                .HasForeignKey(d => d.MaTaiKhoanDuyet)
                .HasConstraintName("FK_DoiSoat_NguoiDuyet");
        });

        modelBuilder.Entity<Lichsudoisoat>(entity =>
        {
            entity.HasKey(e => e.MaLichSuDoiSoat).HasName("PRIMARY");

            entity.ToTable("lichsudoisoat");

            entity.HasIndex(e => new { e.MaDoiSoat, e.ThoiGian }, "IX_LichSuDoiSoat_Ky_ThoiGian");

            entity.HasIndex(e => e.MaTaiKhoan, "FK_LichSuDoiSoat_TaiKhoan");

            entity.Property(e => e.HanhDong).HasMaxLength(50);
            entity.Property(e => e.TrangThaiTruoc).HasMaxLength(20);
            entity.Property(e => e.TrangThaiSau).HasMaxLength(20);
            entity.Property(e => e.MaGiaoDich).HasMaxLength(100);
            entity.Property(e => e.GhiChu).HasMaxLength(500);
            entity.Property(e => e.ThoiGian)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime");

            entity.HasOne(d => d.MaDoiSoatNavigation).WithMany(p => p.Lichsudoisoats)
                .HasForeignKey(d => d.MaDoiSoat)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_LichSuDoiSoat_DoiSoat");

            entity.HasOne(d => d.MaTaiKhoanNavigation).WithMany(p => p.Lichsudoisoats)
                .HasForeignKey(d => d.MaTaiKhoan)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_LichSuDoiSoat_TaiKhoan");
        });

        modelBuilder.Entity<Donhang>(entity =>
        {
            entity.HasKey(e => e.MaDonHang).HasName("PRIMARY");

            entity.ToTable("donhang");

            entity.HasIndex(e => e.MaDiaChi, "FK_DonHang_DiaChi");

            entity.HasIndex(e => e.MaKhachHang, "FK_DonHang_KhachHang");

            entity.HasIndex(e => e.MaKhuyenMai, "FK_DonHang_KhuyenMai");

            entity.HasIndex(e => e.MaNhaHang, "FK_DonHang_NhaHang");

            entity.HasIndex(e => e.MaTrangThai, "FK_DonHang_TrangThai");

            entity.HasIndex(e => new { e.MaHopDong, e.MaNhaHang }, "IX_DonHang_HopDong_NhaHang");

            entity.HasIndex(e => new { e.MaNhaHang, e.MaTrangThai, e.ThoiGianGiaoThucTe, e.MaDonHang }, "IX_DonHang_DoiSoat");

            entity.HasIndex(e => e.MaDonHangHienThi, "MaDonHangHienThi").IsUnique();

            entity.HasIndex(e => new { e.MaDonHang, e.MaNhaHang }, "UQ_DonHang_Ma_NhaHang").IsUnique();

            entity.Property(e => e.DiaChiGiaoHang).HasMaxLength(255);
            entity.Property(e => e.GhiChu).HasMaxLength(300);
            entity.Property(e => e.GiamGiaHeThong).HasPrecision(18);
            entity.Property(e => e.GiamGiaNhaHang).HasPrecision(18);
            entity.Property(e => e.LyDoHuy).HasMaxLength(500);
            entity.Property(e => e.MaDonHangHienThi).HasMaxLength(50);
            entity.Property(e => e.TenNhaHangLucDat).HasMaxLength(150);
            entity.Property(e => e.PhiNenTang).HasPrecision(18);
            entity.Property(e => e.PhiShip).HasPrecision(18);
            entity.Property(e => e.SoDienThoaiNhan).HasMaxLength(15);
            entity.Property(e => e.SoTienGiam).HasPrecision(18);
            entity.Property(e => e.SoTienNhaHangNhan).HasPrecision(18);
            entity.Property(e => e.TenNguoiNhan).HasMaxLength(100);
            entity.Property(e => e.ThanhTien).HasPrecision(18);
            entity.Property(e => e.ThoiGianDat)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime");
            entity.Property(e => e.ThoiGianGiaoDuKien).HasColumnType("datetime");
            entity.Property(e => e.ThoiGianGiaoThucTe).HasColumnType("datetime");
            entity.Property(e => e.TongTienHang).HasPrecision(18);
            entity.Property(e => e.TyLePhiNenTang).HasPrecision(5, 2);

            entity.HasOne(d => d.MaDiaChiNavigation).WithMany(p => p.Donhangs)
                .HasForeignKey(d => d.MaDiaChi)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("FK_DonHang_DiaChi");

            entity.HasOne(d => d.MaKhachHangNavigation).WithMany(p => p.Donhangs)
                .HasForeignKey(d => d.MaKhachHang)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_DonHang_KhachHang");

            entity.HasOne(d => d.MaKhuyenMaiNavigation).WithMany(p => p.Donhangs)
                .HasForeignKey(d => d.MaKhuyenMai)
                .HasConstraintName("FK_DonHang_KhuyenMai");

            entity.HasOne(d => d.MaNhaHangNavigation).WithMany(p => p.Donhangs)
                .HasForeignKey(d => d.MaNhaHang)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_DonHang_NhaHang");

            entity.HasOne(d => d.MaTrangThaiNavigation).WithMany(p => p.Donhangs)
                .HasForeignKey(d => d.MaTrangThai)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_DonHang_TrangThai");

            entity.HasOne(d => d.Hopdongnhahang).WithMany(p => p.Donhangs)
                .HasPrincipalKey(p => new { p.MaHopDong, p.MaNhaHang })
                .HasForeignKey(d => new { d.MaHopDong, d.MaNhaHang })
                .HasConstraintName("FK_DonHang_HopDong_NhaHang");
        });

        modelBuilder.Entity<Giohang>(entity =>
        {
            entity.HasKey(e => e.MaGioHang).HasName("PRIMARY");

            entity.ToTable("giohang");

            entity.HasIndex(e => e.MaNhaHang, "FK_GioHang_NhaHang");

            entity.HasIndex(e => e.GiuCheckoutDenUtc, "IX_GioHang_GiuCheckoutDenUtc");

            entity.HasIndex(e => new { e.MaKhachHang, e.MaNhaHang }, "UQ_GioHang_KhachHang_NhaHang").IsUnique();

            entity.Property(e => e.NgayCapNhat)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime");

            entity.Property(e => e.GiuCheckoutDenUtc)
                .HasColumnType("datetime(6)");

            entity.HasOne(d => d.MaKhachHangNavigation).WithMany(p => p.Giohangs)
                .HasForeignKey(d => d.MaKhachHang)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_GioHang_KhachHang");

            entity.HasOne(d => d.MaNhaHangNavigation).WithMany(p => p.Giohangs)
                .HasForeignKey(d => d.MaNhaHang)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_GioHang_NhaHang");
        });

        modelBuilder.Entity<Hoantien>(entity =>
        {
            entity.HasKey(e => e.MaHoanTien).HasName("PRIMARY");

            entity.ToTable("hoantien");

            entity.HasIndex(e => e.MaTaiKhoanXuLy, "FK_HoanTien_NguoiXuLy");

            entity.HasIndex(e => e.MaTaiKhoanYeuCau, "FK_HoanTien_NguoiYeuCau");

            entity.HasIndex(e => new { e.MaThanhToan, e.MaDonHang }, "FK_HoanTien_ThanhToan_DonHang");

            entity.HasIndex(e => e.MaDonHang, "IX_HoanTien_DonHang");

            entity.HasIndex(e => e.TrangThai, "IX_HoanTien_TrangThai");

            entity.HasIndex(e => new { e.KenhHoanTien, e.MaGiaoDichHoan }, "UQ_HoanTien_Kenh_MaGiaoDich").IsUnique();

            entity.HasIndex(e => e.MaYeuCauHoan, "UQ_HoanTien_MaYeuCau").IsUnique();

            entity.HasIndex(e => e.MaThanhToan, "UQ_HoanTien_ThanhToan").IsUnique();

            entity.Property(e => e.KenhHoanTien).HasColumnType("enum('MoMo','ZaloPay','VNPay','ChuyenKhoan','ThuCong','FoodPay')");
            entity.Property(e => e.LyDoHoan).HasMaxLength(500);
            entity.Property(e => e.MaGiaoDichHoan).HasMaxLength(100);
            entity.Property(e => e.MaYeuCauHoan).HasMaxLength(100);
            entity.Property(e => e.NgayCapNhat)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime");
            entity.Property(e => e.NoiDungLoi).HasMaxLength(500);
            entity.Property(e => e.SoTienHoan).HasPrecision(18);
            entity.Property(e => e.ThoiGianHoanThanh).HasColumnType("datetime");
            entity.Property(e => e.ThoiGianXuLy).HasColumnType("datetime");
            entity.Property(e => e.ThoiGianYeuCau)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime");
            entity.Property(e => e.TrangThai)
                .HasDefaultValueSql("'ChoXuLy'")
                .HasColumnType("enum('ChoXuLy','DangXuLy','ThanhCong','ThatBai')");

            entity.HasOne(d => d.MaTaiKhoanXuLyNavigation).WithMany(p => p.HoantienMaTaiKhoanXuLyNavigations)
                .HasForeignKey(d => d.MaTaiKhoanXuLy)
                .HasConstraintName("FK_HoanTien_NguoiXuLy");

            entity.HasOne(d => d.MaTaiKhoanYeuCauNavigation).WithMany(p => p.HoantienMaTaiKhoanYeuCauNavigations)
                .HasForeignKey(d => d.MaTaiKhoanYeuCau)
                .HasConstraintName("FK_HoanTien_NguoiYeuCau");

            entity.HasOne(d => d.Thanhtoan).WithMany(p => p.Hoantiens)
                .HasPrincipalKey(p => new { p.MaThanhToan, p.MaDonHang })
                .HasForeignKey(d => new { d.MaThanhToan, d.MaDonHang })
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_HoanTien_ThanhToan_DonHang");
        });

        modelBuilder.Entity<Giaodichvi>(entity =>
        {
            entity.HasKey(e => e.MaGiaoDichVi).HasName("PRIMARY");

            entity.ToTable("giaodichvi");

            entity.HasIndex(e => new { e.MaVi, e.NgayTao }, "IX_GiaoDichVi_Vi_NgayTao");
            entity.HasIndex(e => e.MaDonHang, "IX_GiaoDichVi_DonHang");
            entity.HasIndex(
                e => new { e.MaDonHang, e.LoaiGiaoDich, e.TrangThai },
                "IX_GiaoDichVi_DonHang_Loai_TrangThai");
            entity.HasIndex(e => e.MaHoanTien, "IX_GiaoDichVi_HoanTien");
            entity.HasIndex(e => e.MaDoiSoat, "IX_GiaoDichVi_DoiSoat");
            entity.HasIndex(e => e.MaThamChieu, "UQ_GiaoDichVi_MaThamChieu").IsUnique();

            entity.Property(e => e.LoaiGiaoDich)
                .HasColumnType("enum('NapTien','ThanhToan','HoanTien','ThuNhapDonHang','NhanDoiSoat','RutTien','ChuyenTien','DieuChinh','KhoiTao')");
            entity.Property(e => e.LoaiBienDong)
                .HasColumnType("enum('Cong','Tru')");
            entity.Property(e => e.SoTien).HasPrecision(18);
            entity.Property(e => e.SoDuTruoc).HasPrecision(18);
            entity.Property(e => e.SoDuSau).HasPrecision(18);
            entity.Property(e => e.TrangThai)
                .HasDefaultValueSql("'ThanhCong'")
                .HasColumnType("enum('ChoXuLy','ThanhCong','ThatBai')");
            entity.Property(e => e.MaThamChieu).HasMaxLength(100);
            entity.Property(e => e.NoiDung).HasMaxLength(500);
            entity.Property(e => e.NgayTao)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime");

            entity.HasOne(d => d.MaViNavigation).WithMany(p => p.Giaodichvis)
                .HasForeignKey(d => d.MaVi)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_GiaoDichVi_Vi");

            entity.HasOne(d => d.MaDonHangNavigation).WithMany(p => p.Giaodichvis)
                .HasForeignKey(d => d.MaDonHang)
                .HasConstraintName("FK_GiaoDichVi_DonHang");

            entity.HasOne(d => d.MaHoanTienNavigation).WithMany(p => p.Giaodichvis)
                .HasForeignKey(d => d.MaHoanTien)
                .HasConstraintName("FK_GiaoDichVi_HoanTien");

            entity.HasOne(d => d.MaDoiSoatNavigation).WithMany(p => p.Giaodichvis)
                .HasForeignKey(d => d.MaDoiSoat)
                .HasConstraintName("FK_GiaoDichVi_DoiSoat");
        });

        modelBuilder.Entity<Hosophaplynhahang>(entity =>
        {
            entity.HasKey(e => e.MaNhaHang).HasName("PRIMARY");

            entity.ToTable("hosophaplynhahang");

            // Mã nhà hàng được lấy từ nhà hàng hiện có.
            entity.Property(e => e.MaNhaHang)
                .ValueGeneratedNever();

            entity.Property(e => e.NguoiDaiDien)
                .HasMaxLength(100);

            entity.Property(e => e.ChucVuNguoiDaiDien)
                .HasMaxLength(100);

            entity.Property(e => e.SoGiayToNguoiDaiDien)
                .HasMaxLength(30);

            entity.Property(e => e.TenPhapLy)
                .HasMaxLength(200);

            entity.Property(e => e.MaSoThue)
                .HasMaxLength(30);

            entity.Property(e => e.DiaChiPhapLy)
                .HasMaxLength(255);

            entity.Property(e => e.SoGiayPhepKinhDoanh)
                .HasMaxLength(50);

            entity.Property(e => e.FileGiayPhepKinhDoanh)
                .HasMaxLength(500);

            entity.Property(e => e.FileGiayToNguoiDaiDien)
                .HasMaxLength(500);

            entity.Property(e => e.NgayTao)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime");

            entity.Property(e => e.NgayCapNhat)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime");

            entity.HasOne(e => e.MaNhaHangNavigation)
                .WithOne()
                .HasForeignKey<Hosophaplynhahang>(e => e.MaNhaHang)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_HoSoPhapLy_NhaHang");
        });

        modelBuilder.Entity<Hopdongnhahang>(entity =>
        {
            entity.HasKey(e => e.MaHopDong).HasName("PRIMARY");

            entity.ToTable("hopdongnhahang");

            entity.Property(e => e.TenPhapLy)
                .HasMaxLength(200);

            entity.Property(e => e.DiaChiPhapLy)
                .HasMaxLength(255);

            entity.Property(e => e.NoiDungHopDong)
                .HasColumnType("longtext");

            entity.Property(e => e.ThoiGianDongYDieuKhoan)
                .HasColumnType("datetime");

            entity.Property(e => e.ThoiGianGuiDuyet)
                .HasColumnType("datetime");

            entity.HasIndex(e => e.MaTaiKhoanDuyet, "FK_HopDongNhaHang_NguoiDuyet");

            entity.HasIndex(e => e.NgayKetThuc, "IX_HopDong_NgayKetThuc");

            entity.HasIndex(e => new { e.MaNhaHang, e.TrangThai }, "IX_HopDong_NhaHang_TrangThai");

            entity.HasIndex(e => new { e.MaHopDong, e.MaNhaHang }, "UQ_HopDong_Ma_NhaHang").IsUnique();

            entity.HasIndex(e => e.SoHopDong, "UQ_HopDong_SoHopDong").IsUnique();

            entity.Property(e => e.ChucVuNguoiDaiDien).HasMaxLength(100);
            entity.Property(e => e.FileGiayPhepKinhDoanh).HasMaxLength(500);
            entity.Property(e => e.FileGiayToNguoiDaiDien).HasMaxLength(500);
            entity.Property(e => e.FileHopDong).HasMaxLength(500);
            entity.Property(e => e.LyDoChamDut).HasMaxLength(500);
            entity.Property(e => e.LyDoTuChoi).HasMaxLength(500);
            entity.Property(e => e.MaSoThue).HasMaxLength(30);
            entity.Property(e => e.NgayCapNhat)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime");
            entity.Property(e => e.NgayTao)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime");
            entity.Property(e => e.NguoiDaiDien).HasMaxLength(100);
            entity.Property(e => e.PhienBanDieuKhoan)
                .HasMaxLength(50)
                .HasDefaultValueSql("'1.0'");
            entity.Property(e => e.SoGiayPhepKinhDoanh).HasMaxLength(50);
            entity.Property(e => e.SoGiayToNguoiDaiDien).HasMaxLength(30);
            entity.Property(e => e.SoHopDong).HasMaxLength(50);
            entity.Property(e => e.ThoiGianDuyet).HasColumnType("datetime");
            entity.Property(e => e.ThoiGianKy).HasColumnType("datetime");
            entity.Property(e => e.TrangThai)
                .HasDefaultValueSql("'Nhap'")
                .HasColumnType("enum('Nhap','ChoKy','DaKy','ChoDuyet','HieuLuc','HetHan','TuChoi','ChamDut')");
            entity.Property(e => e.TyLePhiNenTang)
                .HasPrecision(5, 2)
                .HasDefaultValueSql("'5.00'");

            entity.HasOne(d => d.MaNhaHangNavigation).WithMany(p => p.Hopdongnhahangs)
                .HasForeignKey(d => d.MaNhaHang)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_HopDongNhaHang_NhaHang");

            entity.HasOne(d => d.MaTaiKhoanDuyetNavigation).WithMany(p => p.Hopdongnhahangs)
                .HasForeignKey(d => d.MaTaiKhoanDuyet)
                .HasConstraintName("FK_HopDongNhaHang_NguoiDuyet");

            entity.Property(e => e.ThoiGianChamDut)
                .HasColumnType("datetime");

            entity.HasOne<Taikhoan>()
                .WithMany()
                .HasForeignKey(e => e.MaTaiKhoanChamDut)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("FK_HopDong_TaiKhoanChamDut");
        });

        modelBuilder.Entity<Thamdinhhosonhahang>(entity =>
        {
            entity.HasKey(e => e.MaThamDinh).HasName("PRIMARY");

            entity.ToTable("thamdinhhosonhahang");

            entity.HasIndex(e => e.MaHopDong, "UQ_ThamDinhHoSo_HopDong").IsUnique();
            entity.HasIndex(e => e.MaTaiKhoanAdmin, "FK_ThamDinhHoSo_Admin");

            entity.Property(e => e.KetQua)
                .HasColumnType("enum('DaDuyet','TuChoi')");
            entity.Property(e => e.KetQuaGiayPhep)
                .HasColumnType("enum('HopLe','CanBoSung')");
            entity.Property(e => e.KetQuaGiayToDaiDien)
                .HasColumnType("enum('HopLe','CanBoSung')");
            entity.Property(e => e.KetQuaHopDong)
                .HasColumnType("enum('HopLe','CanBoSung')");
            entity.Property(e => e.GhiChu).HasMaxLength(1000);
            entity.Property(e => e.ThoiGian)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime");

            entity.HasOne<Hopdongnhahang>()
                .WithOne()
                .HasForeignKey<Thamdinhhosonhahang>(e => e.MaHopDong)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ThamDinhHoSo_HopDong");

            entity.HasOne<Taikhoan>()
                .WithMany()
                .HasForeignKey(e => e.MaTaiKhoanAdmin)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ThamDinhHoSo_Admin");
        });

        modelBuilder.Entity<Khachhang>(entity =>
        {
            entity.HasKey(e => e.MaKhachHang).HasName("PRIMARY");

            entity.ToTable("khachhang");

            entity.HasIndex(e => e.MaTaiKhoan, "MaTaiKhoan").IsUnique();

            entity.Property(e => e.GioiTinh).HasMaxLength(10);
            entity.Property(e => e.HoTen).HasMaxLength(100);

            entity.HasOne(d => d.MaTaiKhoanNavigation).WithOne(p => p.Khachhang)
                .HasForeignKey<Khachhang>(d => d.MaTaiKhoan)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_KhachHang_TaiKhoan");
        });

        modelBuilder.Entity<Khuyenmai>(entity =>
        {
            entity.HasKey(e => e.MaKhuyenMai).HasName("PRIMARY");

            entity.ToTable("khuyenmai");

            entity.HasIndex(e => e.MaNhaHang, "FK_KhuyenMai_NhaHang");

            entity.HasIndex(e => e.MaCode, "MaCode").IsUnique();

            entity.Property(e => e.DonHangToiThieu).HasPrecision(18);
            entity.Property(e => e.GiaTriGiam).HasPrecision(18);
            entity.Property(e => e.GiamToiDa).HasPrecision(18);
            entity.Property(e => e.LoaiGiam).HasMaxLength(20);
            entity.Property(e => e.MaCode).HasMaxLength(30);
            entity.Property(e => e.MoTa).HasMaxLength(200);
            entity.Property(e => e.NgayBatDau).HasColumnType("datetime");
            entity.Property(e => e.NgayKetThuc).HasColumnType("datetime");
            entity.Property(e => e.SoLuotToiDaMoiKhach).HasDefaultValue(1);
            entity.Property(e => e.TrangThai)
                .IsRequired()
                .HasDefaultValueSql("'1'");

            entity.HasOne(d => d.MaNhaHangNavigation).WithMany(p => p.Khuyenmais)
                .HasForeignKey(d => d.MaNhaHang)
                .HasConstraintName("FK_KhuyenMai_NhaHang");
        });

        modelBuilder.Entity<KhachhangKhuyenmai>(entity =>
        {
            entity.HasKey(e => new { e.MaKhachHang, e.MaKhuyenMai })
                .HasName("PRIMARY");

            entity.ToTable("khachhang_khuyenmai");

            entity.HasIndex(e => e.MaKhuyenMai, "FK_KhachHangKhuyenMai_KhuyenMai");

            entity.Property(e => e.NgayLuu)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime");

            entity.HasOne(d => d.MaKhachHangNavigation)
                .WithMany(p => p.KhachhangKhuyenmais)
                .HasForeignKey(d => d.MaKhachHang)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_KhachHangKhuyenMai_KhachHang");

            entity.HasOne(d => d.MaKhuyenMaiNavigation)
                .WithMany(p => p.KhachhangKhuyenmais)
                .HasForeignKey(d => d.MaKhuyenMai)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_KhachHangKhuyenMai_KhuyenMai");
        });

        modelBuilder.Entity<Lichsutrangthaidonhang>(entity =>
        {
            entity.HasKey(e => e.MaLichSu).HasName("PRIMARY");

            entity.ToTable("lichsutrangthaidonhang");

            entity.HasIndex(e => e.MaDonHang, "FK_LichSu_DonHang");

            entity.HasIndex(e => e.MaTaiKhoan, "FK_LichSu_TaiKhoan");

            entity.HasIndex(e => e.MaTrangThai, "FK_LichSu_TrangThai");

            entity.Property(e => e.GhiChu).HasMaxLength(200);
            entity.Property(e => e.ThoiGianTao)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime");

            entity.HasOne(d => d.MaDonHangNavigation).WithMany(p => p.Lichsutrangthaidonhangs)
                .HasForeignKey(d => d.MaDonHang)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_LichSu_DonHang");

            entity.HasOne(d => d.MaTaiKhoanNavigation).WithMany(p => p.Lichsutrangthaidonhangs)
                .HasForeignKey(d => d.MaTaiKhoan)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_LichSu_TaiKhoan");

            entity.HasOne(d => d.MaTrangThaiNavigation).WithMany(p => p.Lichsutrangthaidonhangs)
                .HasForeignKey(d => d.MaTrangThai)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_LichSu_TrangThai");
        });

        modelBuilder.Entity<Monan>(entity =>
        {
            entity.HasKey(e => e.MaMonAn).HasName("PRIMARY");

            entity.ToTable("monan");

            entity.HasIndex(e => e.MaDanhMuc, "FK_MonAn_DanhMuc");

            entity.HasIndex(e => e.MaNhaHang, "FK_MonAn_NhaHang");

            entity.Property(e => e.Gia).HasPrecision(18);
            entity.Property(e => e.HinhAnh).HasMaxLength(255);
            entity.Property(e => e.MoTa).HasMaxLength(500);
            entity.Property(e => e.TenMonAn).HasMaxLength(150);
            entity.Property(e => e.TrangThai)
                .IsRequired()
                .HasDefaultValueSql("'1'");

            entity.HasOne(d => d.MaDanhMucNavigation).WithMany(p => p.Monans)
                .HasForeignKey(d => d.MaDanhMuc)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_MonAn_DanhMuc");

            entity.HasOne(d => d.MaNhaHangNavigation).WithMany(p => p.Monans)
                .HasForeignKey(d => d.MaNhaHang)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_MonAn_NhaHang");

            entity.HasMany(d => d.MaNhomToppings).WithMany(p => p.MaMonAns)
                .UsingEntity<Dictionary<string, object>>(
                    "MonanNhomtopping",
                    r => r.HasOne<Nhomtopping>().WithMany()
                        .HasForeignKey("MaNhomTopping")
                        .OnDelete(DeleteBehavior.ClientSetNull)
                        .HasConstraintName("FK_MonAnNhomTopping_NhomTopping"),
                    l => l.HasOne<Monan>().WithMany()
                        .HasForeignKey("MaMonAn")
                        .OnDelete(DeleteBehavior.ClientSetNull)
                        .HasConstraintName("FK_MonAnNhomTopping_MonAn"),
                    j =>
                    {
                        j.HasKey("MaMonAn", "MaNhomTopping")
                            .HasName("PRIMARY")
                            .HasAnnotation("MySql:IndexPrefixLength", new[] { 0, 0 });
                        j.ToTable("monan_nhomtopping");
                        j.HasIndex(new[] { "MaNhomTopping" }, "FK_MonAnNhomTopping_NhomTopping");
                    });
        });

        modelBuilder.Entity<Nhahang>(entity =>
        {
            entity.HasKey(e => e.MaNhaHang).HasName("PRIMARY");

            entity.ToTable("nhahang");

            entity.HasIndex(e => e.MaTaiKhoan, "MaTaiKhoan").IsUnique();

            entity.Property(e => e.AnhBia).HasMaxLength(255);
            entity.Property(e => e.CheDoHoatDong)
                .HasDefaultValueSql("'TuDong'")
                .HasColumnType("enum('TuDong','MoThuCong','TamNgung')");
            entity.Property(e => e.DiaChiQuan).HasMaxLength(255);
            entity.Property(e => e.GioDongCua).HasColumnType("time");
            entity.Property(e => e.GioMoCua).HasColumnType("time");
            entity.Property(e => e.MoTa).HasMaxLength(500);
            entity.Property(e => e.PhiShipMacDinh)
                .HasPrecision(18)
                .HasDefaultValueSql("'15000'");
            entity.Property(e => e.TenNhaHang).HasMaxLength(150);
            entity.Property(e => e.TrangThaiDuyet)
                .HasMaxLength(20)
                .HasDefaultValueSql("'ChuaHoanTat'");
            entity.Property(e => e.TrangThaiHoatDong)
                .HasDefaultValueSql("'MoCua'")
                .HasColumnType("enum('MoCua','DongCua','TamNgung')");

            entity.HasOne(d => d.MaTaiKhoanNavigation).WithOne(p => p.Nhahang)
                .HasForeignKey<Nhahang>(d => d.MaTaiKhoan)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_NhaHang_TaiKhoan");
        });

        modelBuilder.Entity<Nhomtopping>(entity =>
        {
            entity.HasKey(e => e.MaNhomTopping).HasName("PRIMARY");

            entity.ToTable("nhomtopping");

            entity.HasIndex(e => e.MaNhaHang, "FK_NhomTopping_NhaHang");

            entity.Property(e => e.TenNhom).HasMaxLength(100);

            entity.HasOne(d => d.MaNhaHangNavigation).WithMany(p => p.Nhomtoppings)
                .HasForeignKey(d => d.MaNhaHang)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_NhomTopping_NhaHang");
        });

        modelBuilder.Entity<Phuongthucthanhtoan>(entity =>
        {
            entity.HasKey(e => e.MaPhuongThuc).HasName("PRIMARY");

            entity.ToTable("phuongthucthanhtoan");

            entity.HasIndex(e => e.TenPhuongThuc, "TenPhuongThuc").IsUnique();

            entity.Property(e => e.TenPhuongThuc).HasMaxLength(50);
            entity.Property(e => e.TrangThai)
                .IsRequired()
                .HasDefaultValueSql("'1'");
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasKey(e => e.MaRole).HasName("PRIMARY");

            entity.ToTable("role");

            entity.HasIndex(e => e.TenRole, "TenRole").IsUnique();

            entity.Property(e => e.MoTa).HasMaxLength(200);
            entity.Property(e => e.TenRole).HasMaxLength(50);
        });

        modelBuilder.Entity<Taikhoan>(entity =>
        {
            entity.HasKey(e => e.MaTaiKhoan).HasName("PRIMARY");

            entity.ToTable("taikhoan");

            entity.HasIndex(e => e.Email, "Email").IsUnique();

            entity.HasIndex(e => e.MaRole, "FK_TaiKhoan_Role");

            entity.HasIndex(e => e.SoDienThoai, "SoDienThoai").IsUnique();

            entity.Property(e => e.AnhDaiDien).HasMaxLength(255);
            entity.Property(e => e.Email).HasMaxLength(100);
            entity.Property(e => e.MatKhau).HasMaxLength(255);
            entity.Property(e => e.NgayTao)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime");
            entity.Property(e => e.SoDienThoai).HasMaxLength(15);
            entity.Property(e => e.TrangThai)
                .IsRequired()
                .HasDefaultValueSql("'1'");

            entity.HasOne(d => d.MaRoleNavigation).WithMany(p => p.Taikhoans)
                .HasForeignKey(d => d.MaRole)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_TaiKhoan_Role");
        });

        modelBuilder.Entity<Thanhtoan>(entity =>
        {
            entity.HasKey(e => e.MaThanhToan).HasName("PRIMARY");

            entity.ToTable("thanhtoan");

            entity.HasIndex(e => e.MaDonHang, "FK_ThanhToan_DonHang");

            entity.HasIndex(e => e.MaPhuongThuc, "FK_ThanhToan_PhuongThuc");

            entity.HasIndex(e => new { e.MaPhuongThuc, e.MaGiaoDich }, "UQ_ThanhToan_PhuongThuc_GiaoDich").IsUnique();

            entity.HasIndex(e => new { e.MaThanhToan, e.MaDonHang }, "UQ_ThanhToan_Ma_DonHang").IsUnique();

            entity.Property(e => e.MaGiaoDich).HasMaxLength(100);
            entity.Property(e => e.SoTien).HasPrecision(18);
            entity.Property(e => e.ThoiGianThanhToan).HasColumnType("datetime");
            entity.Property(e => e.TrangThaiThanhToan)
                .HasMaxLength(20)
                .HasDefaultValueSql("'ChoThanhToan'");

            entity.HasOne(d => d.MaDonHangNavigation).WithMany(p => p.Thanhtoans)
                .HasForeignKey(d => d.MaDonHang)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ThanhToan_DonHang");

            entity.HasOne(d => d.MaPhuongThucNavigation).WithMany(p => p.Thanhtoans)
                .HasForeignKey(d => d.MaPhuongThuc)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ThanhToan_PhuongThuc");
        });

        modelBuilder.Entity<Thongbao>(entity =>
        {
            entity.HasKey(e => e.MaThongBao).HasName("PRIMARY");

            entity.ToTable("thongbao");

            entity.HasIndex(e => e.MaTaiKhoan, "FK_ThongBao_TaiKhoan");

            entity.Property(e => e.Loai).HasMaxLength(30);
            entity.Property(e => e.NgayTao)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime");
            entity.Property(e => e.NoiDung).HasMaxLength(500);
            entity.Property(e => e.TieuDe).HasMaxLength(150);

            entity.HasOne(d => d.MaTaiKhoanNavigation).WithMany(p => p.Thongbaos)
                .HasForeignKey(d => d.MaTaiKhoan)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ThongBao_TaiKhoan");
        });

        modelBuilder.Entity<Vi>(entity =>
        {
            entity.HasKey(e => e.MaVi).HasName("PRIMARY");

            entity.ToTable("vi");

            entity.HasIndex(e => e.MaTaiKhoan, "UQ_Vi_TaiKhoan").IsUnique();
            entity.Property(e => e.SoDu).HasPrecision(18);
            entity.Property(e => e.DonViTienTe)
                .HasMaxLength(3)
                .IsFixedLength()
                .HasDefaultValueSql("'VND'");
            entity.Property(e => e.TrangThai)
                .HasDefaultValueSql("'HoatDong'")
                .HasColumnType("enum('HoatDong','TamKhoa','Dong')");
            entity.Property(e => e.NgayTao)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime");
            entity.Property(e => e.NgayCapNhat)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime");

            entity.HasOne(d => d.MaTaiKhoanNavigation).WithOne(p => p.Vi)
                .HasForeignKey<Vi>(d => d.MaTaiKhoan)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Vi_TaiKhoan");
        });

        modelBuilder.Entity<Topping>(entity =>
        {
            entity.HasKey(e => e.MaTopping).HasName("PRIMARY");

            entity.ToTable("topping");

            entity.HasIndex(e => e.MaNhomTopping, "FK_Topping_NhomTopping");

            entity.Property(e => e.GiaThem).HasPrecision(18);
            entity.Property(e => e.TenTopping).HasMaxLength(100);
            entity.Property(e => e.TrangThai)
                .IsRequired()
                .HasDefaultValueSql("'1'");

            entity.HasOne(d => d.MaNhomToppingNavigation).WithMany(p => p.Toppings)
                .HasForeignKey(d => d.MaNhomTopping)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Topping_NhomTopping");
        });

        modelBuilder.Entity<Trangthaidonhang>(entity =>
        {
            entity.HasKey(e => e.MaTrangThai).HasName("PRIMARY");

            entity.ToTable("trangthaidonhang");

            entity.HasIndex(e => e.TenTrangThai, "TenTrangThai").IsUnique();

            entity.Property(e => e.TenTrangThai).HasMaxLength(50);
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
