import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPatternBySlug, ownsSlug } from '../../../lib/patterns.js';
import { getCurrentUser } from '../../../lib/session.js';

export const runtime = 'nodejs';

export default async function PatternPage({ params }) {
  const { slug } = await params;
  const pattern = getPatternBySlug(slug);
  if (!pattern) notFound();
  const user = await getCurrentUser();
  const owned = user && ownsSlug(user.id, pattern.slug);
  const purchaseUrl = process.env.PURCHASE_BASE_URL
    ? `${process.env.PURCHASE_BASE_URL}${process.env.PURCHASE_BASE_URL.includes('?') ? '&' : '?'}pattern=${pattern.slug}`
    : '/redeem';

  return (
    <section className="detail-layout">
      <div className="detail-art"><Image src={pattern.heroImage} alt={`${pattern.title}成品展示`} fill priority sizes="(max-width: 900px) 100vw, 60vw" /></div>
      <div className="detail-copy">
        <p className="eyebrow"><span>{pattern.type === 'bag' ? '立体潮玩' : '巨幅壁画'}</span><span>{pattern.copyright}</span></p>
        <h1>{pattern.title}</h1>
        <p>{pattern.description}</p>
        <dl className="spec-list">
          <div><dt>色卡版本</dt><dd>{pattern.brandPalette} · v{pattern.version}</dd></div>
          <div><dt>最终尺寸</dt><dd>{pattern.finishedSize}</dd></div>
          <div><dt>拼板 / 组件</dt><dd>{pattern.boardCount}（{pattern.totalBoards} 个交付分区）</dd></div>
          <div><dt>全图总颗数</dt><dd>{pattern.totalBeads.toLocaleString()} 颗</dd></div>
          <div><dt>颜色数量</dt><dd>{pattern.totalColors} 色</dd></div>
          <div><dt>制作难度</dt><dd>{pattern.difficulty}</dd></div>
        </dl>
        <div className="detail-price"><small>图纸价格</small><strong>¥{pattern.price}</strong></div>
        {owned
          ? <Link className="button button-primary" href={`/studio/${pattern.slug}`}>进入制作台</Link>
          : (
            <div className="detail-actions">
              <a className="button button-primary" href={purchaseUrl}>{process.env.PURCHASE_BASE_URL ? '前往外部购买' : '已有兑换码，立即解锁'}</a>
              <Link className="button button-quiet" href="/redeem">输入兑换码</Link>
            </div>
          )}
        <p className="copyright-note">购买后解锁：总览、按分区/组件的逐格色号图、全图与分区采购清单、制作与组装顺序，并可在线记录进度。图纸为原创作品，仅限个人制作使用。</p>
      </div>
    </section>
  );
}
