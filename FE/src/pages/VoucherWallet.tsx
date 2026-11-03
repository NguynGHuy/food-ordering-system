import CustomerAccountNav from "../components/CustomerAccountNav";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Gift, LoaderCircle, TicketPercent } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Pagination from "../components/Pagination";
import ScrollReveal from "../components/ScrollReveal";
import VoucherCard from "../components/VoucherCard";
import {
  getSystemVouchers,
  getVoucherWallet,
  removeSavedVoucher,
  saveVoucher,
  type CustomerVoucher,
} from "../services/promotionService";

function VoucherWallet() {
  const navigate = useNavigate();
  const PAGE_SIZE = 6;
  const [saved, setSaved] = useState<CustomerVoucher[]>([]);
  const [systemVouchers, setSystemVouchers] = useState<CustomerVoucher[]>([]);
  const [savedPage, setSavedPage] = useState(1);
  const [savedPages, setSavedPages] = useState(0);
  const [savedTotal, setSavedTotal] = useState(0);
  const [systemPage, setSystemPage] = useState(1);
  const [systemPages, setSystemPages] = useState(0);
  const [systemTotal, setSystemTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadVouchers = useCallback(async (showLoading = true) => {
    if (!localStorage.getItem("token")) {
      navigate(`/dang-nhap?returnUrl=${encodeURIComponent("/kho-voucher")}`, {
        replace: true,
      });
      return;
    }

    try {
      if (showLoading) setLoading(true);
      setError("");

      const [savedResult, systemResult] = await Promise.all([
        getVoucherWallet({ pageNumber: savedPage, pageSize: PAGE_SIZE }),
        getSystemVouchers({ pageNumber: systemPage, pageSize: PAGE_SIZE }),
      ]);

      setSaved(savedResult.items);
      setSavedTotal(savedResult.totalItems);
      setSavedPages(savedResult.totalPages);
      if (savedResult.pageNumber !== savedPage) setSavedPage(savedResult.pageNumber);

      setSystemVouchers(systemResult.items);
      setSystemTotal(systemResult.totalItems);
      setSystemPages(systemResult.totalPages);
      if (systemResult.pageNumber !== systemPage) setSystemPage(systemResult.pageNumber);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải kho voucher.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [navigate, savedPage, systemPage]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      void loadVouchers();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [loadVouchers]);

  const handleSave = async (voucher: CustomerVoucher) => {
    try {
      setBusyId(voucher.maKhuyenMai);
      setError("");
      await saveVoucher(voucher.maKhuyenMai);
      setNotice(`Đã lưu mã ${voucher.maCode} vào kho.`);
      await loadVouchers(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu voucher.");
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (voucher: CustomerVoucher) => {
    try {
      setBusyId(voucher.maKhuyenMai);
      setError("");
      await removeSavedVoucher(voucher.maKhuyenMai);
      setNotice(`Đã bỏ mã ${voucher.maCode} khỏi kho.`);
      await loadVouchers(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể bỏ lưu voucher.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="voucher-wallet-page">
      <CustomerAccountNav />
      <Link to="/ho-so" className="voucher-wallet-back">
        <ArrowLeft size={16} /> Quay lại hồ sơ
      </Link>

      <ScrollReveal delay={40}>
        <header className="voucher-wallet-hero">
          <span><TicketPercent size={24} /></span>
          <div>

            <h1>Kho voucher</h1>
            <p>Lưu voucher trước, sau đó chọn nhanh khi thanh toán.</p>
          </div>
          <div className="compact-account-total">
            <strong>{savedTotal}</strong>
            <span>đã lưu</span>
          </div>
        </header>
      </ScrollReveal>

      {notice && <div className="voucher-wallet-notice success">{notice}</div>}
      {error && <div className="voucher-wallet-notice error">{error}</div>}

      {loading ? (
        <div className="voucher-wallet-loading">
          <LoaderCircle className="profile-spin-icon" size={24} /> Đang tải voucher...
        </div>
      ) : (
        <>
          <ScrollReveal delay={80}>
            <section className="voucher-wallet-section">
              <div className="voucher-wallet-section-heading">
                <div><h2>Voucher đã lưu</h2><p>Chỉ các voucher trong mục này mới được gợi ý khi thanh toán.</p></div>
                <span>{savedTotal} voucher</span>
              </div>

              {saved.length === 0 ? (
                <div className="voucher-wallet-empty">
                  <Gift size={28} />
                  <h3>Kho voucher đang trống</h3>
                  <p>Hãy lưu ưu đãi hệ thống bên dưới hoặc voucher tại trang nhà hàng.</p>
                </div>
              ) : (
                <div className="voucher-wallet-grid">
                  {saved.map((voucher) => (
                    <VoucherCard
                      key={voucher.maKhuyenMai}
                      voucher={voucher}
                      // actionLabel="Bỏ lưu"
                      actionDisabled={busyId !== null}
                      onAction={(item) => void handleRemove(item)}
                    />
                  ))}
                </div>
              )}

              <Pagination
                pageNumber={savedPage}
                totalPages={savedPages}
                totalItems={savedTotal}
                disabled={busyId !== null}
                onPageChange={setSavedPage}
              />
            </section>
          </ScrollReveal>

          <ScrollReveal delay={120}>
            <section className="voucher-wallet-section system-offers">
              <div className="voucher-wallet-section-heading">
                <div><h2>Ưu đãi hệ thống</h2><p>Voucher do Foodie phát hành, dùng được tại các nhà hàng phù hợp.</p></div>
                <span>{systemTotal} ưu đãi</span>
              </div>

              <div className="voucher-wallet-grid">
                {systemVouchers.map((voucher) => (
                  <VoucherCard
                    key={voucher.maKhuyenMai}
                    voucher={voucher}
                    actionLabel={voucher.daLuu ? "Đã lưu" : "Lưu voucher"}
                    actionDisabled={busyId !== null || voucher.daLuu}
                    onAction={(item) => void handleSave(item)}
                  />
                ))}
              </div>

              <Pagination
                pageNumber={systemPage}
                totalPages={systemPages}
                totalItems={systemTotal}
                disabled={busyId !== null}
                onPageChange={setSystemPage}
              />
            </section>
          </ScrollReveal>
        </>
      )}
    </main>
  );
}

export default VoucherWallet;
