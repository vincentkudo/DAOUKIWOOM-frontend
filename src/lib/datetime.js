function pad(n) {
  return String(n).padStart(2, "0");
}

export function dateKey(value) {
  const d = value instanceof Date ? value : new Date(value);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatDate(value) {
  return new Date(value).toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

export function formatDateLong(value) {
  return new Date(value).toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatTime(value) {
  return new Date(value).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTime(value) {
  return `${formatDate(value)} · ${formatTime(value)}`;
}

export function toLocalIso(date, time) {
  return new Date(`${date}T${time}:00`).toISOString();
}

export function startOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Next weekday at 09:00–10:00 so booking never starts in the past. */
export function nextWorkdayWindow() {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  while (start.getDay() === 0 || start.getDay() === 6) {
    start.setDate(start.getDate() + 1);
  }
  start.setHours(9, 0, 0, 0);
  return {
    date: dateKey(start),
    start: "09:00",
    end: "10:00",
    label: `${formatDateLong(start)} · 09:00–10:00`,
  };
}

export function isPastSlot(date, time) {
  return new Date(`${date}T${time}:00`).getTime() <= Date.now() + 60_000;
}

export function ensureFutureWindow(date, start, end) {
  if (date && start && end && !isPastSlot(date, start)) {
    return { date, start, end, adjusted: false };
  }
  return { ...nextWorkdayWindow(), adjusted: true };
}
