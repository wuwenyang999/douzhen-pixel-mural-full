import Link from 'next/link';
import { redirect } from 'next/navigation';
import PatternCard from '../../components/PatternCard.jsx';
import { getOwnedPatterns } from '../../lib/patterns.js';
import { getCurrentUser } from '../../lib/session.js';

export default async function MyPatternsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const patterns = getOwnedPatterns(user.id);
  return (
    <section className="page-shell">
      <p className="eyebrow"><span>我的图纸</span><span>{user.email}</span></p>
      <h1 className="page-title">继续完成<br />你的作品。</h1>
      {patterns.length ? <div className="pattern-grid">{patterns.map((pattern) => <PatternCard key={pattern.id} pattern={pattern} />)}</div> : <div className="empty-state"><p>还没有解锁图纸。</p><Link className="button button-primary" href="/redeem">兑换图纸</Link></div>}
    </section>
  );
}
