import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPatternBySlug, ownsPattern } from '../../../lib/patterns.js';
import { getCurrentUser } from '../../../lib/session.js';

export default async function PatternPage({ params }) {
  const { slug } = await params;
  const pattern = getPatternBySlug(slug);
  if (!pattern) notFound();
  const user = await getCurrentUser();
  const owned = user && ownsPattern(user.id, pattern.id);
  const purchaseUrl = process.env.PURCHASE_BASE_URL
    ? `${process.env.PURCHASE_BASE_URL}${process.env.PURCHASE_BASE_URL.includes('?') ? '&' : '?'}pattern=${pattern.slug}`
    : '/redeem';

  return (
    <section className="detail-layout">
      <div className="detail-art"><Image src={pattern.heroImage} alt={`${pattern.title}成品展示`} fill priority sizes="(max-width: 900px) 100vw, 60vw" /></div>
      <div className="detail-copy">
        <p className="eyebrow"><span>{pattern.type === 'bag' ? '立体潮玩' : '巨幅壁画'}</span><span>原创作品</span></p>
        <h1>{pattern.title}</h1>
        <p>{pattern.description}</p>
        <dl className="spec-list">
          <div><dt>最终尺寸</dt><dd>{pattern.finishedSize}</dd></div>
          <div><dt>拼板 / 组件</dt><dd>{pattern.boardCount}</dd></div>
          <div><dt>颜色数量</dt><dd>{pattern.colorCount} 色</dd></div>
          <div><dt>制作难度</dt><dd>{pattern.difficulty}</dd></div>
        </dl>
        <div className="detail-price"><small>图纸价格</small><strong>¥{pattern.price}</strong></div>
        {owned ? <Link className="button button-primary" href={`/studio/${pattern.slug}`}>进入制作台</Link> : <a className="button button-primary" href={purchaseUrl}>{process.env.PURCHASE_BASE_URL ? '前往外部购买' : '已有兑换码，立即解锁'}</a>}
        <p className="copyright-note">图纸为原创作品，仅限个人制作使用；购买后可在网站制作台查看、定位和记录进度。</p>
      </div>
    </section>
  );
}
