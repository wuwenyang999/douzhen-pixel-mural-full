'use client';

import { useEffect, useState } from 'react';

export default function AdminCodes({ patterns }) {
  const [patternId, setPatternId] = useState(patterns[0]?.id || '');
  const [count, setCount] = useState(10);
  const [codes, setCodes] = useState([]);
  const [message, setMessage] = useState('');
  const [recentCodes, setRecentCodes] = useState([]);

  async function loadRecentCodes() {
    const response = await fetch('/api/admin/codes');
    if (!response.ok) return;
    const result = await response.json();
    setRecentCodes(result.codes);
  }

  useEffect(() => { loadRecentCodes(); }, []);

  async function submit(event) {
    event.preventDefault();
    setMessage('');
    const response = await fetch('/api/admin/codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patternId, count: Number(count) }),
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.message || '生成失败。');
      return;
    }
    setCodes(result.codes);
    setMessage('兑换码只在本页显示一次，请复制后导入外部自动发货渠道。');
    loadRecentCodes();
  }

  async function revoke(codeId) {
    const response = await fetch('/api/admin/codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'revoke', codeId }),
    });
    if (response.ok) loadRecentCodes();
  }

  return (
    <div className="admin-codes">
      <form onSubmit={submit}>
        <label>图纸<select value={patternId} onChange={(event) => setPatternId(event.target.value)}>{patterns.map((pattern) => <option key={pattern.id} value={pattern.id}>{pattern.title}</option>)}</select></label>
        <label>数量<input value={count} min="1" max="100" onChange={(event) => setCount(event.target.value)} type="number" /></label>
        <button className="button button-primary" type="submit">生成兑换码</button>
      </form>
      {message && <p className="form-message">{message}</p>}
      {codes.length > 0 && <textarea aria-label="本次生成的兑换码" readOnly value={codes.join('\n')} />}
      <div className="code-status-list">
        <p className="eyebrow"><span>最近生成</span><span>{recentCodes.length} 条</span></p>
        {recentCodes.map((code) => <div key={code.id}><span>{code.title}</span><small>{code.redeemedAt ? '已兑换' : code.revokedAt ? '已作废' : '未使用'}</small>{!code.redeemedAt && !code.revokedAt && <button onClick={() => revoke(code.id)} type="button">作废</button>}</div>)}
      </div>
    </div>
  );
}
