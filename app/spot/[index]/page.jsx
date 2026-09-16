'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { spots } from '@/lib/spots';

const STORAGE_KEY = 'spot_choices';

function getChoices() {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

export default function SpotPage({ params }) {
  const index = Number(params.index);
  const spot = spots[index];
  const [choice, setChoice] = useState('not');
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (spot) {
      const choices = getChoices();
      setChoice(choices[spot.id] || 'not');
      setImgError(false);
    }
  }, [spot]);

  if (!spot) {
    return (
      <main className="container">
        <p>景点不存在。</p>
        <Link href="/" className="nav-btn" style={{ marginTop: 16, display: 'inline-block' }}>
          返回首页
        </Link>
      </main>
    );
  }

  function choose(value) {
    setChoice(value);
    const choices = getChoices();
    choices[spot.id] = value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(choices));
  }

  const isFirst = index === 0;
  const isLast = index === spots.length - 1;

  return (
    <main className="container">
      <div className="progress">
        第 {index + 1} / {spots.length} 个
      </div>

      <h1 className="spot-name">{spot.name}</h1>

      <div className="spot-image">
        {!imgError ? (
          <img
            src={spot.image}
            alt={spot.name}
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="img-error">{spot.name}</div>
        )}
      </div>

      <p className="spot-desc">{spot.description}</p>

      <div className="choices">
        <button
          className={`choice-btn go${choice === 'go' ? ' active' : ''}`}
          onClick={() => choose('go')}
        >
          👍 可以考虑去
        </button>
        <button
          className={`choice-btn not${choice === 'not' ? ' active' : ''}`}
          onClick={() => choose('not')}
        >
          👎 不是很想去
        </button>
      </div>

      <div className="nav">
        {!isFirst ? (
          <Link href={`/spot/${index - 1}`} className="nav-btn">
            ← 上一个
          </Link>
        ) : (
          <Link href="/" className="nav-btn">
            ← 返回首页
          </Link>
        )}

        {!isLast ? (
          <Link href={`/spot/${index + 1}`} className="nav-btn next">
            下一个 →
          </Link>
        ) : (
          <Link href="/summary" className="nav-btn next">
            去统计页 →
          </Link>
        )}
      </div>
    </main>
  );
}