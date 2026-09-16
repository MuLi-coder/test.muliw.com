'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { spots } from '@/lib/spots';

const STORAGE_KEY = 'spot_choices';

export default function SummaryPage() {
  const [choices, setChoices] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || '{}';
      setChoices(JSON.parse(raw));
    } catch {
      setChoices({});
    }
  }, []);

  function toggle(id) {
    setChoices((prev) => {
      const next = { ...prev, [id]: prev[id] === 'go' ? 'not' : 'go' };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choices }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '提交失败');
      setResult(data);
    } catch (e) {
      setError(String((e && e.message) || e));
    } finally {
      setSubmitting(false);
    }
  }

  const goCount = spots.filter((s) => choices[s.id] === 'go').length;

  return (
    <main className="container summary-page">
      <h1>统计页</h1>
      <p className="subtitle">
        打勾表示「可以考虑去」，不打勾表示「不是很想去」。共选了 {goCount} 个景点。
      </p>

      <ul className="summary-list card">
        {spots.map((s) => {
          const checked = choices[s.id] === 'go';
          return (
            <li key={s.id} className="summary-item">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(s.id)}
              />
              <span onClick={() => toggle(s.id)}>{s.name}</span>
            </li>
          );
        })}
      </ul>

      <div className="summary-actions">
        <Link href={`/spot/${spots.length - 1}`} className="back-btn">
          ← 返回上一个景点
        </Link>
        <button className="submit-btn" onClick={handleSubmit} disabled={submitting}>
          {submitting ? '提交中…' : '提交'}
        </button>
      </div>

      {error && <p className="error">提交失败：{error}</p>}
      {result && <p className="success">已保存到 {result.file}</p>}
    </main>
  );
}