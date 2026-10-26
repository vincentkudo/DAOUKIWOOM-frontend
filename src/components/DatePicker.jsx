import { useEffect, useId, useMemo, useRef, useState } from "react";

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const MONTHS = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];

function pad(n) {
  return String(n).padStart(2, "0");
}

function toIso(year, month, day) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function parseIso(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return null;
  }
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

function formatLabel(iso) {
  const date = parseIso(iso);
  if (!date) {
    return "Chọn ngày";
  }
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export default function DatePicker({ label, value, onChange, min, max, align = "start" }) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => parseIso(value), [value]);
  const [cursor, setCursor] = useState(() => selected || new Date());
  const rootRef = useRef(null);
  const panelId = useId();
  const today = useMemo(() => startOfDay(new Date()), []);
  const minDate = useMemo(() => parseIso(min), [min]);
  const maxDate = useMemo(() => parseIso(max), [max]);

  useEffect(() => {
    if (open) {
      setCursor(selected || new Date());
    }
  }, [open, selected]);

  useEffect(() => {
    function onPointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }
    function onKey(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevLast = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i += 1) {
    const day = prevLast - firstDow + i + 1;
    cells.push({ day, inMonth: false, date: new Date(year, month - 1, day) });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ day, inMonth: true, date: new Date(year, month, day) });
  }
  let next = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ day: next, inMonth: false, date: new Date(year, month + 1, next) });
    next += 1;
  }

  function blocked(date) {
    const start = startOfDay(date);
    if (minDate && start < startOfDay(minDate)) {
      return true;
    }
    if (maxDate && start > startOfDay(maxDate)) {
      return true;
    }
    return false;
  }

  function pick(date) {
    if (blocked(date)) {
      return;
    }
    onChange(toIso(date.getFullYear(), date.getMonth(), date.getDate()));
    setOpen(false);
  }

  const todayOk = !blocked(today);

  return (
    <div className={`pick ${open ? "is-open" : ""}`} ref={rootRef}>
      {label ? <span className="field-label">{label}</span> : null}
      <button
        type="button"
        className="pick-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{formatLabel(value)}</span>
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <rect x="2.2" y="3.2" width="11.6" height="10.4" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M2.2 6.4h11.6M5.2 2v2.6M10.8 2v2.6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      {open ? (
        <div className={`date-panel${align === "end" ? " is-end" : ""}`} id={panelId} role="dialog" aria-label="Chọn ngày">
          <div className="date-head">
            <strong>
              {MONTHS[month]} {year}
            </strong>
            <div className="date-nav">
              <button type="button" aria-label="Tháng trước" onClick={() => setCursor(new Date(year, month - 1, 1))}>
                <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                  <path d="M10 4L6 8l4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
              <button type="button" aria-label="Tháng sau" onClick={() => setCursor(new Date(year, month + 1, 1))}>
                <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                  <path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
          <div className="date-dows">
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="date-grid">
            {cells.map((cell) => {
              const iso = toIso(cell.date.getFullYear(), cell.date.getMonth(), cell.date.getDate());
              const selectedDay = selected && sameDay(cell.date, selected);
              const isToday = sameDay(cell.date, today);
              const disabled = blocked(cell.date);
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={disabled}
                  className={`date-day${selectedDay ? " is-selected" : ""}${isToday && !selectedDay && !disabled ? " is-today" : ""}${
                    cell.inMonth ? "" : " is-muted"
                  }`}
                  onClick={() => pick(cell.date)}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
          {todayOk ? (
            <button type="button" className="date-today" onClick={() => pick(today)}>
              Hôm nay
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
