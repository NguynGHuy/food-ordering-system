import { useEffect, useRef, useState } from "react";

import type { CSSProperties, ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

function ScrollReveal({
  children,
  className = "",
  delay = 0,
}: ScrollRevealProps) {
  const elementRef = useRef<HTMLDivElement | null>(null);

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = elementRef.current;

    if (!element) {
      return;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      const frame = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }

    // 1. Phía trên hoặc đang nằm trong màn hình ban đầu (Above the fold):
    // Kích hoạt hiển thị mượt mà trên màn hình đầu tiên, lướt lên rõ ràng và êm ái
    const rect = element.getBoundingClientRect();
    const inOrAboveViewport = rect.top < window.innerHeight;
    if (inOrAboveViewport) {
      const frame = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }

    // 2. Phía dưới màn hình (Below the fold):
    // Kích hoạt hiệu ứng cuộn rõ ràng, sống động (Scroll Reveal) khi người dùng cuộn tới.
    // rootMargin -25px giúp phần tử đi vào trong tầm mắt người dùng 25px rồi mới bắt đầu lướt lên,
    // đảm bảo người dùng nhìn thấy trọn vẹn chuyển động lướt lên êm ái, không bị trôi qua quá nhanh.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          return;
        }

        setVisible(true);

        // Dừng theo dõi sau lần xuất hiện đầu tiên.
        observer.unobserve(element);
      },
      {
        threshold: 0.08,
        rootMargin: "0px 0px -25px 0px",
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Điều chỉnh delay theo bậc thang nhịp nhàng
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 640;
  const effectiveDelay = isMobile ? Math.min(delay, 70) : delay;

  const style = {
    "--scroll-reveal-delay": `${effectiveDelay}ms`,
  } as CSSProperties;

  return (
    <div
      ref={elementRef}
      style={style}
      className={["app-scroll-reveal", visible ? "is-visible" : "", className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}

export default ScrollReveal;
