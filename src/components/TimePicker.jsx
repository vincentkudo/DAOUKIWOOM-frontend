import { useEffect, useId, useRef, useState } from "react";

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7);
const MINUTES = [0, 15, 30, 45];

function pad(n) {
  return String(n).padStart(2, "0");
}

function parseTime(value) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value || "");
  if (!match) {
    return { hour: 9, minute: 0 };
  }
  let hour = Number(match[1]);
  let minute = Number(match[2]);
  hour = Math.min(21, Math.max(7, Number.isFinite(hour) ? hour : 9));
  minute = MINUTES.includes(minute) ? minute : MINUTES.reduce((best, item) => (Math.abs(item - minute) < Math.abs(best - minute) ? item : best), 0);
  return { hour, minute };
}

function toValue(hour, minute) {
  return `${pad(hour)}:${pad(minute)}`;
}

export default function TimePicker({ label, value, onChange, align = "end" }) {
  const [open, setOpen] = useState(false);
  const parsed = parseTime(value);
  const rootRef = useRef(null);
  const panelId = useId();

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

  function setHour(hour) {
    onChange(toValue(hour, parsed.minute));
  }

  function setMinute(minute) {
    onChange(toValue(parsed.hour, minute));
    setOpen(false);
  }

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
        <span>{value || "Chọn giờ"}</span>
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <circle cx="8" cy="8" r="5.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 5.2V8.2l2.1 1.4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      {open ? (
        <div className={`time-panel${align === "end" ? " is-end" : ""}`} id={panelId} role="dialog" aria-label="Chọn giờ">
          <p className="time-caption">Giờ · 07:00–21:00</p>
          <div className="time-hours">
            {HOURS.map((hour) => (
              <button
                key={hour}
                type="button"
                className={hour === parsed.hour ? "is-selected" : undefined}
                onClick={() => setHour(hour)}
              >
                {pad(hour)}
              </button>
            ))}
          </div>
          <p className="time-caption">Phút</p>
          <div className="time-mins">
            {MINUTES.map((minute) => (
              <button
                key={minute}
                type="button"
                className={minute === parsed.minute ? "is-selected" : undefined}
                onClick={() => setMinute(minute)}
              >
                :{pad(minute)}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
