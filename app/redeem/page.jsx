import { redirect } from 'next/navigation';
import RedeemForm from '../../components/RedeemForm.jsx';
import { getCurrentUser } from '../../lib/session.js';

export default async function RedeemPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return <section className="center-shell"><p className="eyebrow"><span>兑换图纸</span><span>ONE CODE · ONE WORK</span></p><h1>把作品<br />放进账户。</h1><p>在外部购买渠道获得兑换码后，在这里解锁对应图纸。</p><RedeemForm /></section>;
}
