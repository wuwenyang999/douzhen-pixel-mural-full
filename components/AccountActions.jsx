'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AccountActions({ email }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function deleteAccount() {
    const ok = window.confirm(
      `确定要注销账户 ${email} 吗？\n\n注销后邮箱与密码将被删除且无法恢复登录；为防止兑换码重复使用，会保留匿名兑换记录。`,
    );
    if (!ok) return;
    setBusy(true);
    const response = await fetch('/api/account/delete', { method: 'POST' });
    if (response.ok) {
      window.location.href = '/';
    } else {
      setBusy(false);
      window.alert('注销失败，请稍后再试或联系客服。');
    }
  }

  return (
    <div className="account-actions">
      <p className="eyebrow"><span>账户</span><span>{email}</span></p>
      <button className="button button-quiet danger" type="button" disabled={busy} onClick={deleteAccount}>
        {busy ? '正在注销…' : '注销账户并删除我的信息'}
      </button>
      <Link href="/privacy" className="privacy-link">隐私政策</Link>
    </div>
  );
}

function Link({ href, children, className }) {
  return (
    <a className={className} href={href}>{children}</a>
  );
}
