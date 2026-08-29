'use client';

import { useMemo, useState } from 'react';

function shortCode(code) {
  return code.replace(/^MARD\s*/i, '');
}

export default function StudioWorkspace({ pattern, initialCompleteSectionIds }) {
  const [activeId, setActiveId] = useState(pattern.sections[0]?.id);
  const [completeIds, setCompleteIds] = useState(initialCompleteSectionIds || []);
  const activeSection = useMemo(
    () => pattern.sections.find((s) => s.id === activeId) || pattern.sections[0],
    [activeId, pattern.sections],
  );
  const progress = Math.round((completeIds.length / pattern.sections.length) * 100);
  const sectionCountByCode = useMemo(() => {
    const map = {};
    for (const c of activeSection?.colours || []) map[c.code] = c.count;
    return map;
  }, [activeSection]);

  async function toggleSection(sectionId) {
    const complete = !completeIds.includes(sectionId);
    const response = await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patternId: pattern.id, sectionId, complete }),
    });
    if (!response.ok) return;
    setCompleteIds((current) => (complete
      ? [...current, sectionId]
      : current.filter((id) => id !== sectionId)));
  }

  return (
    <div className="studio-layout">
      <aside className="studio-sidebar">
        <p className="eyebrow"><span>制作进度</span><span>{progress}%</span></p>
        <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
        <ol className="section-list">
          {pattern.sections.map((section, index) => (
            <li key={section.id}>
              <button
                className={activeId === section.id ? 'section-button active' : 'section-button'}
                onClick={() => setActiveId(section.id)}
                type="button"
              >
                <span>{String(index + 1).padStart(2, '0')}</span>{section.id} · {section.name}
              </button>
              <button
                className={completeIds.includes(section.id) ? 'check-button complete' : 'check-button'}
                onClick={() => toggleSection(section.id)}
                type="button"
              >
                {completeIds.includes(section.id) ? '✓ 已完成' : '完成'}
              </button>
            </li>
          ))}
        </ol>
      </aside>

      <section className="studio-main">
        <div className="material-summary">
          <div><small>色卡品牌</small><b>{pattern.brandPalette}</b></div>
          <div><small>全图总颗数</small><b>{pattern.totalBeads.toLocaleString()} 颗</b></div>
          <div><small>{pattern.type === 'bag' ? '组件数量' : '分区数量'}</small><b>{pattern.totalBoards} 区</b></div>
          <div><small>使用颜色</small><b>{pattern.totalColors} 色</b></div>
        </div>

        <div className="section-note">
          <p className="eyebrow"><span>{pattern.type === 'bag' ? '组件' : '分区'} {activeSection.id}</span><span>{activeSection.rows} × {activeSection.cols} 格 · {activeSection.cells.length} 颗</span></p>
          <h2>{activeSection.name}</h2>
          <p>{activeSection.instruction}</p>
        </div>

        <div className="bead-board">
          <div
            className="bead-grid"
            style={{ gridTemplateColumns: `repeat(${activeSection.cols}, 1fr)` }}
          >
            {activeSection.cells.map((cell, i) => (
              <span key={i} style={{ background: cell.hex }} title={`${cell.code} ${cell.name}`}>
                {shortCode(cell.code)}
              </span>
            ))}
          </div>
        </div>

        <div className="colour-list">
          <div className="colour-heading">
            <p className="eyebrow"><span>{pattern.brandPalette} 采购清单</span><span>全图 / 当前分区</span></p>
            <p>整幅 {pattern.totalBeads.toLocaleString()} 颗；每种色按“全图数量”备料，再按“{activeSection.id} 数量”分装。</p>
          </div>
          <div className="colour-table">
            {pattern.colours.map((colour) => (
              <div key={colour.code}>
                <i style={{ background: colour.hex }} />
                <span><b>{colour.code}</b><small>{colour.name} · {colour.hex}</small></span>
                <em>{colour.count.toLocaleString()} 颗<small>全图</small></em>
                <strong>{(sectionCountByCode[colour.code] || 0).toLocaleString()} 颗<small>{activeSection.id}</small></strong>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
