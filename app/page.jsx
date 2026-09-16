'use client';

import Link from 'next/link';
import { spots } from '@/lib/spots';

export default function Home() {
  return (
    <main className="container">
      <h1>北京景点候选</h1>
      <p className="subtitle">帮你挑出真正想去的北京景点</p>

      <section className="rules card">
        <h2>规则说明</h2>
        <ol>
          <li>接下来会逐个展示 {spots.length} 个景点，每个景点配有图片和简介。</li>
          <li>对每个景点选择「可以考虑去」或「不是很想去」。</li>
          <li>浏览完会进入统计页，可以统一勾选 / 调整想去的景点。</li>
          <li>确认后点击提交，结果会保存到后端项目文件夹中。</li>
        </ol>
      </section>

      <section className="spots-overview">
        <h2>景点候选（共 {spots.length} 个）</h2>
        <ul className="spot-tags">
          {spots.map((s) => (
            <li key={s.id}>{s.name}</li>
          ))}
        </ul>
      </section>

      <Link href="/spot/0" className="start-btn">
        开始挑选 →
      </Link>
    </main>
  );
}