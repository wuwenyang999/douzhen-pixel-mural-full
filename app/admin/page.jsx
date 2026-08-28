import { redirect } from 'next/navigation';
import AdminCodes from '../../components/AdminCodes.jsx';
import { listPatterns } from '../../lib/patterns.js';
import { getCurrentUser } from '../../lib/session.js';

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect('/');
  return <section className="page-shell"><p className="eyebrow"><span>管理</span><span>CODE DELIVERY</span></p><h1 className="page-title">生成一批<br />可交付图纸的码。</h1><p className="admin-copy">生成后立即复制，导入外部虚拟商品自动发货渠道。网站只负责兑换与已购内容访问。</p><AdminCodes patterns={listPatterns()} /></section>;
}
