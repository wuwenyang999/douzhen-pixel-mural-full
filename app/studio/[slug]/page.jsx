import { notFound, redirect } from 'next/navigation';
import StudioWorkspace from '../../../components/StudioWorkspace.jsx';
import { getCompletedSectionIds, getStudioPattern } from '../../../lib/patterns.js';
import { getCurrentUser } from '../../../lib/session.js';

export const runtime = 'nodejs';

export default async function StudioPage({ params }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // 服务端同时校验“用户 + 权益”，未购买者拿不到逐格网格。
  const pattern = getStudioPattern(user.id, slug);
  if (!pattern) notFound();
  const completeSectionIds = getCompletedSectionIds(user.id, pattern.id);

  return (
    <section className="studio-shell">
      <div className="studio-heading">
        <p className="eyebrow"><span>在线制作台</span><span>{pattern.brandPalette} · v{pattern.version}</span></p>
        <h1>{pattern.title}</h1>
        <p>{pattern.type === 'bag' ? '按组件制作，最后根据组装顺序穿线连接。' : '按分区制作，每完成一块就在这里打钩。'}</p>
      </div>
      <StudioWorkspace pattern={pattern} initialCompleteSectionIds={completeSectionIds} />
    </section>
  );
}
