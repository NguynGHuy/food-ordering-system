import {
    useEffect,
    useState,
} from "react";

import {
    UtensilsCrossed,
} from "lucide-react";

function PageLoader() {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setVisible(false);
        }, 600);

        return () => {
            window.clearTimeout(timer);
        };
    }, []);

    if (!visible) {
        return null;
    }

    return (
        <div
            className="page-loader-overlay"
            role="status"
            aria-label="Đang tải trang"
        >
            <div className="page-loader-content">
                <div className="page-loader-logo">
                    <UtensilsCrossed
                        size={34}
                        strokeWidth={2}
                    />
                </div>

                <strong>Foodie</strong>

                <div className="page-loader-progress">
                    <span />
                </div>

                <small>
                    Chợ ngon
                </small>
            </div>
        </div>
    );
}

export default PageLoader;
