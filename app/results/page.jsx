'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { spots } from '@/lib/spots';

const nameMap = {};
spots.forEach((s) => {
  nameMap[s.id] = s.name;
});

export default function ResultsPage() {
  const [submissions, setSubmissions] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/submissions');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '读取失败');
        setSubmissions(data.submissions || []);
      } catch (e) {
        setError(String((e && e.message) || e));
      }
    })();
  }, []);

  function goList(record) {
    const choices = (record && record.choices) || {};
    return Object.keys(choices)
      .filter((id) => choices[id] === 'go')
      .map((id) => nameMap[id] || id);
  }

  function fmtTime(iso) {
    if (!iso) return '时间未知';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleString('zh-CN', { hour12: false });
    } catch {
      return iso;
    }
  }

  return (
    <main className="container results-page">
      <h1>提交结果</h1>
      <p className="subtitle">
        共 {submissions === null ? '…' : submissions.length} 次提交
      </p>

      {error && <p className="error">读取失败：{error}</p>}

      {submissions === null && !error && <p className="subtitle">加载中…</p>}

      {submissions !== null && submissions.length === 0 && (
        <div className="card empty">还没有提交记录</div>
      )}

      {submissions !== null && submissions.length > 0 && (
        <ul className="results-list">
          {submissions.map((rec, i) => {
            const go = goList(rec);
            return (
              <li key={i} className="result-item card">
                <div className="result-head">
                  <span className="result-index">第 {submissions.length - i} 次</span>
                  <span className="result-time">{fmtTime(rec.submittedAt)}</span>
                </div>
                <div className="result-count">想去 {go.length} 个景点</div>
                {go.length > 0 ? (
                  <ul className="spot-tags result-tags">
                    {go.map((name) => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="result-none">一个都没选</p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="results-actions">
        <Link href="/" className="nav-btn">
          ← 返回首页
        </Link>
        <Link href="/spot/0" className="nav-btn next">
          再去挑选 →
        </Link>
      </div>
    </main>
  );
}