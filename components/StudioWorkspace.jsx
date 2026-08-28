'use client';

import { useMemo, useState } from 'react';

export default function StudioWorkspace({ pattern, initialCompleteSectionIds }) {
  const [activeId, setActiveId] = useState(pattern.sections[0]?.id);
  const [completeIds, setCompleteIds] = useState(initialCompleteSectionIds);
  const activeSection = useMemo(
    () => pattern.sections.find((section) => section.id === activeId) || pattern.sections[0],
    [activeId, pattern.sections],
  );
  const progress = Math.round((completeIds.length / pattern.sections.length) * 100);

  async function toggleSection(sectionId) {
    const complete = !completeIds.includes(sectionId);
    const response = await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patternId: pattern.id, sectionId, complete }),
    });
    if (!response.ok) return;
    setCompleteIds((current) => (complete ? [...current, sectionId] : current.filter((id) => id !== sectionId)));
  }

  return (
    <div className="studio-layout">
      <aside className="studio-sidebar">
        <p className="eyebrow"><span>制作进度</span><span>{progress}%</span></p>
        <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
        <ol className="section-list">
          {pattern.sections.map((section, index) => (
            <li key={section.id}>
              <button className={activeId === section.id ? 'section-button active' : 'section-button'} onClick={() => setActiveId(section.id)} type="button">
                <span>{String(index + 1).padStart(2, '0')}</span>{section.name}
              </button>
              <button className={completeIds.includes(section.id) ? 'check-button complete' : 'check-button'} onClick={() => toggleSection(section.id)} type="button">
                {completeIds.includes(section.id) ? '已完成' : '完成'}
              </button>
            </li>
          ))}
        </ol>
      </aside>
      <section className="studio-main">
        <div className="studio-visual">
          <img src={pattern.heroImage} alt={`${pattern.title}总览`} />
          <span className="grid-overlay" aria-hidden="true" />
        </div>
        <div className="section-note">
          <p className="eyebrow"><span>{pattern.type === 'bag' ? '组件' : '分区'}</span><span>{activeSection.id}</span></p>
          <h2>{activeSection.name}</h2>
          <p>{activeSection.instruction}</p>
        </div>
      </section>
    </div>
  );
}
