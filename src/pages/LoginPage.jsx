import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const DEMOS = [
  { label: "Admin", email: "admin@daoukiwoom.vn", password: "Admin123!" },
  { label: "Nhân viên", email: "linh.tran@daoukiwoom.vn", password: "Emp123!" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(DEMOS[1].email);
  const [password, setPassword] = useState(DEMOS[1].password);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <section className="login-hero">
        <p className="eyebrow">DAOU KIWOOM · RoomFlow</p>
        <h1>Đặt phòng họp không còn trùng lịch.</h1>
        <p className="muted">
          Nhân viên chọn số người trước, hệ thống đề xuất phòng vừa sức và còn trống.
          Ai đặt trước — giữ phòng.
        </p>
      </section>
      <form className="card login-card" onSubmit={onSubmit}>
        <h2>Đăng nhập</h2>
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </label>
        <label>
          Mật khẩu
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn primary" disabled={loading} type="submit">
          {loading ? "Đang vào…" : "Vào hệ thống"}
        </button>
        <div className="demo-row">
          {DEMOS.map((demo) => (
            <button
              key={demo.email}
              type="button"
              className="btn ghost"
              onClick={() => {
                setEmail(demo.email);
                setPassword(demo.password);
              }}
            >
              Dùng {demo.label}
            </button>
          ))}
        </div>
      </form>
    </div>
  );
}
