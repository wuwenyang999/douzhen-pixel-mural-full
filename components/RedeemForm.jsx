'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RedeemForm() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    const response = await fetch('/api/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const result = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(result.message || '兑换失败，请检查兑换码。');
      return;
    }

    router.push(`/studio/${result.slug}`);
    router.refresh();
  }

  return (
    <form className="redeem-form" onSubmit={submit}>
      <label htmlFor="code">输入图纸兑换码</label>
      <div>
        <input id="code" value={code} onChange={(event) => setCode(event.target.value)} placeholder="PB-XXXXXXXXXXXXXXXXXXXXXXXX" required />
        <button className="button button-primary" disabled={loading} type="submit">{loading ? '正在兑换' : '兑换图纸'}</button>
      </div>
      {message && <p className="form-message" role="status">{message}</p>}
    </form>
  );
}
