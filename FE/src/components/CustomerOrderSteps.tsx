/** A visual guide to the existing cart → checkout → review sequence. No navigation or state. */
export default function CustomerOrderSteps({ current }: { current: "cart" | "checkout" | "review" }) {
  return (
    <ol className="cg-order-steps" aria-label="Các bước đặt món">
      {([
        ["cart", "Giỏ hàng"],
        ["checkout", "Thông tin đặt món"],
        ["review", "Kiểm tra & thanh toán"],
      ] as const).map(([step, label], index) => <li key={step} aria-current={current === step ? "step" : undefined}><span aria-hidden="true">{index + 1}</span>{label}</li>)}
    </ol>
  );
}
