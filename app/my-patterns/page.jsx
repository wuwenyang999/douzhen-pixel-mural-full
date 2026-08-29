import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCompletedSectionIds, getOwnedPatterns } from '../../lib/patterns.js';
import { getCurrentUser } from '../../lib/session.js';
import AccountActions from '../../components/AccountActions.jsx';

export const runtime = 'nodejs';

export default async function MyPatternsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const patterns = getOwnedPatterns(user.id);
  const withProgress = patterns.map((p) => {
    const done = getCompletedSectionIds(user.id, p.id);
    const percent = p.sections.length ? Math.round((done.length / p.sections.length) * 100) : 0;
    return { ...p, percent };
  });

  return (
    <section className="page-shell">
      <p className="eyebrow"><span>我的图纸</span><span>{user.email}</span></p>
      <h1 className="page-title">继续完成<br />你的作品。</h1>
      {withProgress.length ? (
        <div className="owned-list">
          {withProgress.map((p) => (
            <article key={p.id} className="owned-row">
              <div className="owned-info">
                <h3>{p.title} <small>v{p.version} · {p.brandPalette}</small></h3>
                <div className="progress-track"><span style={{ width: `${p.percent}%` }} /></div>
                <p>{p.percent}% 完成 · {p.boardCount} · {p.totalBeads.toLocaleString()} 颗</p>
              </div>
              <Link className="button button-primary" href={`/studio/${p.slug}`}>
                {p.percent === 0 ? '进入制作台' : '继续制作'}
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>还没有解锁图纸。在外部渠道购买后，用兑换码在这里解锁。</p>
          <Link className="button button-primary" href="/redeem">兑换图纸</Link>
        </div>
      )}

      <hr className="divider" />
      <AccountActions email={user.email} />
    </section>
  );
}
