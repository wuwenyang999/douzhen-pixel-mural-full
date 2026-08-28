import Link from 'next/link';
import { getCurrentUser } from '../lib/session.js';

export default async function Header() {
  const user = await getCurrentUser();

  return (
    <header className="site-header">
      <Link className="brand" href="/">
        <span className="brand-mark" aria-hidden="true">●</span>
        <span>豆阵</span>
        <small>PIXEL ASSEMBLY</small>
      </Link>
      <nav aria-label="主导航">
        <Link href="/library">图纸库</Link>
        <Link href="/redeem">兑换</Link>
        {user ? <Link href="/my-patterns">我的图纸</Link> : <Link href="/login">登录</Link>}
        {user?.role === 'admin' && <Link href="/admin">管理</Link>}
        {user && (
          <form action="/api/auth/logout" method="post">
            <button className="text-button" type="submit">退出</button>
          </form>
        )}
      </nav>
    </header>
  );
}
