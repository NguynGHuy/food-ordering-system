import { ArrowLeft, House, SearchX } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

function NotFound() {
  const navigate = useNavigate();

  return (
    <main className="not-found-page">
      <section className="not-found-card" aria-labelledby="not-found-title">
        <span className="not-found-code">404</span>
        <span className="not-found-icon" aria-hidden="true">
          <SearchX size={34} />
        </span>

        <h1 id="not-found-title">Không tìm thấy trang</h1>
        <p>
          Đường dẫn bạn mở không tồn tại, đã được đổi tên hoặc không còn khả dụng.
        </p>

        <div className="not-found-actions">
          <button type="button" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} />
            Quay lại
          </button>
          <Link to="/">
            <House size={18} />
            Về trang chủ
          </Link>
        </div>
      </section>
    </main>
  );
}

export default NotFound;
