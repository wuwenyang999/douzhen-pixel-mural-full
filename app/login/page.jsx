export default function LoginPage({ searchParams }) {
  const error = searchParams?.error;
  return (
    <section className="auth-shell">
      <div><p className="eyebrow"><span>账户</span><span>KEEP YOUR PROGRESS</span></p><h1>把图纸<br />放进你的账户。</h1><p>登录后兑换图纸，并在任何设备继续记录制作进度。</p></div>
      <div className="auth-forms">
        {error && <p className="form-message">{error}</p>}
        <form action="/api/auth/login" method="post"><h2>登录</h2><label>邮箱<input name="email" type="email" required /></label><label>密码<input name="password" type="password" minLength="8" required /></label><button className="button button-primary" type="submit">登录</button></form>
        <form action="/api/auth/register" method="post"><h2>首次使用</h2><label>邮箱<input name="email" type="email" required /></label><label>设置密码<input name="password" type="password" minLength="8" required /></label><button className="button button-quiet" type="submit">创建账户</button></form>
      </div>
    </section>
  );
}
