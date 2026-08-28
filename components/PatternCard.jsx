import Image from 'next/image';
import Link from 'next/link';

const typeLabel = { mural: '巨幅壁画', bag: '立体潮玩' };

export default function PatternCard({ pattern }) {
  return (
    <article className="pattern-card">
      <Link className="pattern-image" href={`/patterns/${pattern.slug}`}>
        <Image src={pattern.heroImage} alt={`${pattern.title}拼豆成品`} fill sizes="(max-width: 720px) 100vw, 33vw" />
      </Link>
      <div className="pattern-card-body">
        <div className="eyebrow"><span>{typeLabel[pattern.type]}</span><span>{pattern.difficulty}</span></div>
        <h3><Link href={`/patterns/${pattern.slug}`}>{pattern.title}</Link></h3>
        <p>{pattern.description}</p>
        <div className="pattern-meta"><span>{pattern.boardCount}</span><span>¥{pattern.price}</span></div>
      </div>
    </article>
  );
}
