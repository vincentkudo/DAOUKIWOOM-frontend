export default function Pager({ page = 0, totalPages = 0, totalItems = 0, unit = "", onChange }) {
  const last = Math.max(totalPages - 1, 0);
  const current = Math.min(Math.max(page, 0), last);
  const pages = Math.max(totalPages, 1);
  return (
    <div className="pager">
      <span>
        Trang {totalItems === 0 ? 0 : current + 1}/{pages} · {totalItems} {unit}
      </span>
      {pages > 1 ? (
        <div className="row">
          {current > 0 ? (
            <button type="button" className="btn ghost compact" onClick={() => onChange(current - 1)}>
              Trước
            </button>
          ) : null}
          {current < last ? (
            <button type="button" className="btn ghost compact" onClick={() => onChange(current + 1)}>
              Sau
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
