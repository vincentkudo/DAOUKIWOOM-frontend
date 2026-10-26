const API_BASE = import.meta.env.VITE_API_URL || "";

function unwrap(payload) {
  if (payload && payload.code === 1000) {
    return payload.result;
  }
  if (payload && payload.success) {
    return payload.data;
  }
  let message = payload?.message || payload?.error?.message || "Có lỗi xảy ra. Vui lòng thử lại.";
  if (/must be a future date/i.test(message)) {
    message = "Khung giờ đã qua. Hãy chọn ngày làm việc tiếp theo.";
  }
  const error = new Error(message);
  error.code = payload?.code || payload?.error?.code;
  throw error;
}

export async function api(path, { method = "GET", body, token } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    unwrap(payload || { success: false, error: { message: `HTTP ${response.status}` } });
  }
  return unwrap(payload);
}

export const amenityLabel = {
  PROJECTOR: "Máy chiếu",
  WHITEBOARD: "Bảng trắng",
  VIDEO_CONFERENCE: "Họp online",
  TV: "TV / màn hình",
  PHONE: "Điện thoại",
  AIR_CONDITIONER: "Điều hòa",
};

export const fitTone = {
  PERFECT: "perfect",
  TIGHT: "tight",
  GOOD: "good",
  SPACIOUS: "spacious",
};

export const fitLabel = {
  PERFECT: "Vừa",
  TIGHT: "Tốt",
  GOOD: "Ổn",
  SPACIOUS: "Rộng",
};
