'use client';

import { useState } from 'react';
import type { DiagnoseResult } from '@/lib/types';
import { PREFECTURE_GROUPS } from '@/lib/bodies';
import { HOUSEHOLDS, INTERESTS } from '@/lib/constants';
import { SubsidyCard } from './SubsidyCard';

interface DiagnoseResponse {
  matched: DiagnoseResult[];
  partial: DiagnoseResult[];
  total_evaluated: number;
}

const FAMILY_HOUSEHOLDS = new Set(['family_young', 'family_school']);

export function DiagnoseForm() {
  const [ward, setWard] = useState('');
  const [household, setHousehold] = useState('');
  const [age, setAge] = useState('');
  const [childAge, setChildAge] = useState('');
  const [interests, setInterests] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DiagnoseResponse | null>(null);

  const showChildAge = FAMILY_HOUSEHOLDS.has(household);

  function toggleInterest(value: string) {
    setInterests((prev) =>
      prev.includes(value) ? prev.filter((i) => i !== value) : [...prev, value],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const payload: Record<string, unknown> = {};
    if (ward) payload.ward = ward;
    if (household) payload.household = household;
    if (age) payload.age = Number(age);
    if (showChildAge && childAge) payload.child_age = Number(childAge);
    if (interests.length) payload.interests = interests;

    try {
      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        throw new Error(detail?.error ?? `診断に失敗しました (${res.status})`);
      }
      setResult((await res.json()) as DiagnoseResponse);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : '診断に失敗しました。DB が起動しているか確認してください。',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form
        onSubmit={handleSubmit}
        className="rounded-md border border-line bg-panel p-6"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          {/* お住まいの自治体 */}
          <label className="block">
            <span className="text-sm text-subink">お住まいの自治体</span>
            <select
              value={ward}
              onChange={(e) => setWard(e.target.value)}
              className="mt-1 w-full rounded-sm border border-line bg-white px-3 py-2 text-sm"
            >
              <option value="">選択しない</option>
              {PREFECTURE_GROUPS.map((g) => (
                <optgroup key={g.prefecture.code} label={g.prefecture.name}>
                  <option value={g.prefecture.code}>{g.prefecture.name}</option>
                  {g.members.map((m) => (
                    <option key={m.code} value={m.code}>
                      {m.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          {/* 世帯区分 */}
          <label className="block">
            <span className="text-sm text-subink">世帯区分</span>
            <select
              value={household}
              onChange={(e) => setHousehold(e.target.value)}
              className="mt-1 w-full rounded-sm border border-line bg-white px-3 py-2 text-sm"
            >
              <option value="">選択しない</option>
              {HOUSEHOLDS.map((h) => (
                <option key={h.value} value={h.value}>
                  {h.label}
                </option>
              ))}
            </select>
          </label>

          {/* 本人の年齢 */}
          <label className="block">
            <span className="text-sm text-subink">あなたの年齢（任意）</span>
            <input
              type="number"
              min={0}
              max={120}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="例: 34"
              className="mt-1 w-full rounded-sm border border-line bg-white px-3 py-2 text-sm"
            />
          </label>

          {/* お子さんの年齢 (子育て世帯のみ) */}
          {showChildAge && (
            <label className="block">
              <span className="text-sm text-subink">お子さんの年齢（任意）</span>
              <input
                type="number"
                min={0}
                max={25}
                value={childAge}
                onChange={(e) => setChildAge(e.target.value)}
                placeholder="例: 3"
                className="mt-1 w-full rounded-sm border border-line bg-white px-3 py-2 text-sm"
              />
            </label>
          )}
        </div>

        {/* 関心テーマ */}
        <fieldset className="mt-5">
          <legend className="text-sm text-subink">関心のあるテーマ（複数可）</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {INTERESTS.map((i) => {
              const active = interests.includes(i.value);
              return (
                <button
                  type="button"
                  key={i.value}
                  onClick={() => toggleInterest(i.value)}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                    active
                      ? 'border-accent bg-accent text-white'
                      : 'border-line bg-white text-subink hover:border-accent'
                  }`}
                >
                  {i.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-sm bg-ink px-4 py-3 font-serif text-base text-paper hover:bg-accent disabled:opacity-50 sm:w-auto sm:px-10"
        >
          {loading ? '診断中…' : 'あなたが使えるかも、を見る'}
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-sm border border-accent bg-accent-soft px-4 py-3 text-sm text-accent">
          {error}
        </p>
      )}

      {result && <DiagnoseResults result={result} />}
    </div>
  );
}

function DiagnoseResults({ result }: { result: DiagnoseResponse }) {
  const { matched, partial, total_evaluated } = result;

  return (
    <div className="mt-10">
      <p className="text-sm text-subink">
        {total_evaluated}件を診断 — 該当 {matched.length}件 / 条件を絞ると見つかるかも{' '}
        {partial.length}件
      </p>

      {matched.length === 0 && partial.length === 0 && (
        <p className="mt-4 text-sm text-subink">
          条件に合う制度が見つかりませんでした。条件をゆるめて再診断するか、
          制度一覧から探してみてください。
        </p>
      )}

      {matched.length > 0 && (
        <section className="mt-6">
          <h3 className="section-rule font-serif text-lg">あなたが使えるかも</h3>
          <div className="mt-4 grid gap-4">
            {matched.map((r) => (
              <SubsidyCard
                key={r.subsidy.id}
                subsidy={r.subsidy}
                score={r.match_score}
                reasons={r.match_reasons}
              />
            ))}
          </div>
        </section>
      )}

      {partial.length > 0 && (
        <section className="mt-8">
          <h3 className="section-rule font-serif text-lg text-subink">
            条件によっては対象になるかも
          </h3>
          <div className="mt-4 grid gap-4">
            {partial.map((r) => (
              <SubsidyCard
                key={r.subsidy.id}
                subsidy={r.subsidy}
                score={r.match_score}
                reasons={r.match_reasons}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
