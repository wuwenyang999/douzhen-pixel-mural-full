import Image from 'next/image';
import Link from 'next/link';
import PatternCard from '../components/PatternCard.jsx';
import { listPatterns } from '../lib/patterns.js';

export default function HomePage() {
  const patterns = listPatterns();
  const hero = patterns[0];

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow"><span>ORIGINAL BEADWORK</span><span>01 / 03</span></p>
          <h1>把一面墙<br />拼成你的世界。</h1>
          <p className="hero-description">原创超大型拼豆壁画与可背的立体拼豆潮玩。每一张图纸，都已拆成可完成的工程。</p>
          <div className="hero-actions"><Link className="button button-primary" href="/library">浏览图纸</Link><Link className="button button-quiet" href="/redeem">兑换已购图纸</Link></div>
        </div>
        <div className="hero-art">
          <Image src={hero.heroImage} alt="原创巨幅拼豆壁画" fill priority sizes="(max-width: 900px) 100vw, 55vw" />
          <span className="hero-stamp">8 × 12<br />BOARD MAP</span>
        </div>
      </section>
      <section className="promise-grid">
        <p><b>完整拆分</b>总览、分区、组件顺序</p>
        <p><b>原创可售</b>只收录自有或获授权作品</p>
        <p><b>在线制作</b>按板定位，完成即打钩</p>
      </section>
      <section className="content-section">
        <div className="section-heading"><p className="eyebrow"><span>首批作品</span><span>03 件</span></p><h2>不是小挂件。<br />是作品。</h2><Link href="/library">查看全部 →</Link></div>
        <div className="pattern-grid">{patterns.map((pattern) => <PatternCard key={pattern.id} pattern={pattern} />)}</div>
      </section>
    </>
  );
}
