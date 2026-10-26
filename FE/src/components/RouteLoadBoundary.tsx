import { Component, type ReactNode } from "react";

export default class RouteLoadBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
    state = { failed: false };

    static getDerivedStateFromError() {
        return { failed: true };
    }

    render() {
        if (this.state.failed) {
            return (
                <div className="admin-access-message" role="alert">
                    <p>Không thể tải trang. Vui lòng kiểm tra kết nối rồi thử lại.</p>
                    <button type="button" onClick={() => window.location.reload()}>Tải lại trang</button>
                </div>
            );
        }
        return this.props.children;
    }
}
