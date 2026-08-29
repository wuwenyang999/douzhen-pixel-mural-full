'use client';

import { useEffect, useState } from 'react';

const statusLabel = { active: '未使用', redeemed: '已兑换', revoked: '已作废' };
const actionLabel = {
  'batch.create': '生成批次',
  'code.revoke': '作废兑换码',
  'entitlement.manual_grant': '人工补发',
};

export default function AdminCodes({ patterns }) {
  const [patternId, setPatternId] = useState(patterns[0]?.id || '');
  const [count, setCount] = useState(10);
  const [codes, setCodes] = useState([]);
  const [batchId, setBatchId] = useState('');
  const [message, setMessage] = useState('');
  const [data, setData] = useState({ codes: [], batches: [], users: [], audit: [] });
  const [grantUser, setGrantUser] = useState('');
  const [grantPattern, setGrantPattern] = useState(patterns[0]?.id || '');

  async function load() {
    const response = await fetch('/api/admin/codes');
    if (!response.ok) return;
    setData(await response.json());
  }
  useEffect(() => { load(); }, []);

  async function generate(event) {
    event.preventDefault();
    setMessage('');
    const response = await fetch('/api/admin/codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patternId, count: Number(count) }),
    });
    const result = await response.json();
    if (!response.ok) { setMessage(result.message || '生成失败。'); return; }
    setCodes(result.codes || []);
    setBatchId(result.batchId || '');
    setMessage('明文兑换码只显示这一次，请立即复制并导入外部自动发货渠道。');
    load();
  }

  async function revoke(codeId) {
    await fetch('/api/admin/codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'revoke', codeId }),
    });
    load();
  }

  async function grant(event) {
    event.preventDefault();
    const response = await fetch('/api/admin/codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'grant', patternId: grantPattern, userId: grantUser }),
    });
    const result = await response.json();
    setMessage(response.ok ? '已人工补发，权益写入账户。' : (result.message || '补发失败。'));
    load();
  }

  function copyCodes() {
    navigator.clipboard?.writeText(codes.join('\n'));
    setMessage('已复制到剪贴板。');
  }

  return (
    <div className="admin-codes">
      <div className="admin-grid">
        <form className="admin-panel" onSubmit={generate}>
          <h3>① 生成兑换码批次</h3>
          <label>图纸
            <select value={patternId} onChange={(e) => setPatternId(e.target.value)}>
              {patterns.map((p) => <option key={p.id} value={p.id}>{p.title}（v{p.version}）</option>)}
            </select>
          </label>
          <label>数量（1-200）<input value={count} min="1" max="200" type="number" onChange={(e) => setCount(e.target.value)} /></label>
          <button className="button button-primary" type="submit">生成批次</button>
        </form>

        <form className="admin-panel" onSubmit={grant}>
          <h3>② 人工补发</h3>
          <label>用户
            <select value={grantUser} onChange={(e) => setGrantUser(e.target.value)}>
              <option value="">选择用户</option>
              {data.users.map((u) => <option key={u.id} value={u.id}>{u.email}</option>)}
            </select>
          </label>
          <label>图纸
            <select value={grantPattern} onChange={(e) => setGrantPattern(e.target.value)}>
              {patterns.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </label>
          <button className="button button-quiet" type="submit">直接授予</button>
        </form>
      </div>

      {message && <p className="form-message">{message}</p>}
      {codes.length > 0 && (
        <div className="admin-panel">
          <div className="codes-head">
            <h3>本次明文码（{codes.length} 个 · 批次 {batchId.slice(0, 8)}）</h3>
            <button className="button button-quiet" type="button" onClick={copyCodes}>复制全部</button>
          </div>
          <textarea aria-label="本次生成的兑换码" readOnly value={codes.join('\n')} />
        </div>
      )}

      <div className="admin-panel">
        <h3>批次状态</h3>
        <table className="admin-table">
          <thead><tr><th>图纸</th><th>数量</th><th>未使用</th><th>已兑换</th><th>已作废</th><th>创建时间</th></tr></thead>
          <tbody>
            {data.batches.map((b) => (
              <tr key={b.id}><td>{b.title}</td><td>{b.quantity}</td><td>{b.active_count}</td><td>{b.redeemed_count}</td><td>{b.revoked_count}</td><td>{b.created_at}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-panel">
        <h3>最近兑换码（仅状态，不可再看明文）</h3>
        <div className="code-status-list">
          {data.codes.map((code) => (
            <div key={code.id}>
              <span>#{code.id} · {code.title}</span>
              <small className={`status-${code.status}`}>{statusLabel[code.status] || code.status}</small>
              {code.status === 'active' && <button type="button" onClick={() => revoke(code.id)}>作废</button>}
            </div>
          ))}
        </div>
      </div>

      <div className="admin-panel">
        <h3>管理审计</h3>
        <table className="admin-table">
          <thead><tr><th>时间</th><th>动作</th><th>对象</th><th>详情</th></tr></thead>
          <tbody>
            {data.audit.map((a) => (
              <tr key={a.id}><td>{a.created_at}</td><td>{actionLabel[a.action] || a.action}</td><td>{a.target_type}</td><td>{a.detail_json}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
