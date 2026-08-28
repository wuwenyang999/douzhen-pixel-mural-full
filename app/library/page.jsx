import PatternCard from '../../components/PatternCard.jsx';
import { listPatterns } from '../../lib/patterns.js';

export default function LibraryPage() {
  const patterns = listPatterns();
  return (
    <section className="page-shell">
      <p className="eyebrow"><span>图纸库</span><span>ORIGINAL COLLECTION</span></p>
      <h1 className="page-title">选择一件<br />要完成的作品。</h1>
      <div className="filter-note"><span>巨幅壁画</span><span>立体潮玩</span><span>全部原创</span></div>
      <div className="pattern-grid">{patterns.map((pattern) => <PatternCard key={pattern.id} pattern={pattern} />)}</div>
    </section>
  );
}
