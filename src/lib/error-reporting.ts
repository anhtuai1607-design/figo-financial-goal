/** Ghi lỗi giao diện ra console để dễ kiểm tra (không gửi dữ liệu đi đâu). */
export function reportAppError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  console.error("[FiGo] Lỗi giao diện:", error, { route: window.location.pathname, ...context });
}
