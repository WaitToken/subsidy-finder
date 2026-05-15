# CLAUDE.md

このファイルは Claude Code がこのプロジェクトで作業を始めるときに自動的に読み込みます。
プロジェクトの背景・設計判断・現状・優先タスクをここに記録しておくと、
新しいセッションが過去の文脈を持って始められます。

---

## プロジェクトの目的

全国の自治体（47都道府県＋政令指定都市20＋東京23特別区＝90自治体）が発行する
**補助金・助成金**を、自治体公式サイトからクローラー＋LLM で構造化収集し、
わかりやすく提供するサービス。**個人向け・事業者向けの両方**を対等に扱う
（`target_audience` でタグ付け）。

差別化:
- 個人向け・事業者向けを横断できる、全国規模の構造化データ
- 「○○Payで10万円分」など給付の質を表現できるスキーマ
- 30秒診断で「あなたが使えるかも」を提示

> 注: 元は「東京都＋23特別区の個人向け特化」で開始（v0.1〜v0.4）。
> v0.5 で事業者向けを対象に追加、スコープを全国へ拡大した。

## アーキテクチャ (1行で)

`自治体サイト → Crawler → LLM Extractor (Claude Sonnet 4.6) → PostgreSQL → Next.js API → React UI`

詳細は `README.md`。

## ディレクトリ規則

- `src/` — Python 抽出パイプライン (Pydantic スキーマもここ)
- `eval/` — Ground Truth + 精度評価
- `db/` — PostgreSQL DDL + マイグレーション
- `next-app/` — Next.js (TypeScript)
- `data/extracted/` — 抽出された JSON (Git にコミット)
- `data/seeds.yaml` — 24自治体のシードURL

## 重要な設計判断 (なぜそうなっているか)

1. **スキーマは LLM tool use で構造化強制** — 24自治体の HTML をパース個別実装は破綻するため。`src/extractor.py` 参照。

2. **スキーマは段階進化 (v0.1 → v0.2 → v0.3)** — 実データ検証で発見した穴を埋める。各バージョンの理由:
   - v0.2: 世田谷区「ずっと、世田谷。」で発見 — ポイント給付 / 条件付き期限 / 予算依存 / 制度間関係
   - v0.3: 東京都「創業助成事業」で発見 — 経費補助率(%) / 対象経費カテゴリ / 複数回募集 / 採択枠

3. **plain_summary がプロダクトの心臓部** — 中学生でも理解できる平易な日本語要約。LLM プロンプトで200字以内・対象/金額/期限の3要素を必須化。

4. **検証マーク (verified=true) は人手確認済みのみ** — LLM 抽出だけでは付けない。データ信頼性の二段階管理。

5. **robots.txt 遵守 + 2秒間隔** — `src/crawler.py` で自動。自治体に迷惑をかけない。

## 検証済み実データ

- `data/extracted/setagaya-zutto-v02.json` — 世田谷区「ずっと、世田谷。」3制度。スキーマ v0.2 形式。
- 「創業助成事業」は GT (`eval/ground_truth.json`) に登録済みだが、JSON 抽出はまだ。

## よく使うコマンド

```bash
# DB 起動 + スキーマ自動適用
docker compose up -d db

# JSON → DB ロード
export DATABASE_URL=postgresql://dev:dev@localhost:5432/tokyo_subsidy
python -m db.migrate_from_json --extracted data/extracted

# 1 URL でパイプラインを動作確認 (デバッグ用)
export ANTHROPIC_API_KEY=sk-ant-...
python -m src.run --url "https://www.city.setagaya.lg.jp/03665/31163.html"

# 5自治体 × 10ページで小規模テスト
python -m src.run --seeds data/seeds.yaml --limit-sources 5 --limit-pages-per-source 10

# 精度評価
python -m eval.evaluate --truth eval/ground_truth.json --extracted data/extracted

# Next.js
cd next-app && npm install && npm run dev
```

## 現在の優先タスク (上から順に)

1. **Ground Truth を 100件まで拡充** — 自動評価の信頼性確立に必須
2. **残り21自治体に抽出を展開** — 世田谷で動いたフローを横展開 (1自治体 ~$2)
3. **v0.4 候補パターンの発見** — 子育て・医療カテゴリでの実データ検証
4. **Next.js UI を本格化** — 既存 React アーティファクトを Next.js ページに移植
5. **LINE 連携** — 締切通知 + マッチ条件変更時のプッシュ (日本の B2C で強力)

## してはいけないこと

- robots.txt の無視・短すぎる間隔
- 自治体名を勝手に略する (新宿区 ≠ 「新宿」、世田谷区 ≠ 「世田谷」)
- 抽出結果を verified=true で保存 (人手確認していない限り)
- 「経費の○○%以内」を `benefit_amount_max_yen` だけに押し込む — 必ず `benefit_rate_percent` も使う
- ポイント給付を「現金」として記録 — `benefit_type=ポイント・電子マネー` を必ずセット

## スタイル

- Python: type hint 必須、`from __future__ import annotations` 不要 (Python 3.10+ を前提)
- TypeScript: strict mode、Zod でランタイム検証
- 日本語コメント OK (生活者向けプロダクトのドメイン語彙が日本語のため)
- コミットメッセージは英語 (Conventional Commits)

## モデル選定

抽出には `claude-sonnet-4-6` を使用。
精度 vs コストのバランスが良く、tool use が安定。
v0.3 スキーマ (15+フィールド) でも安定して JSON を生成する。

## 連絡先 (実運用時)

User-Agent: `TokyoSubsidyBot/0.3 (contact: <YOUR_EMAIL>)`
自治体からの問い合わせ対応用に、本番では実メールアドレスを設定すること。

---

## Claude Code への期待

このプロジェクトで Claude Code に頼みたい典型的な作業:

- 「足立区のシードから30ページ取得して抽出して」 → 自動で全パイプラインを実行
- 「子育てカテゴリで GT を10件作って」 → 実ページ取得→構造化→GT 追加
- 「精度を測って、弱いフィールドを特定して、プロンプトを改善して」 → eval → 分析 → src/extractor.py 編集 → 再評価のループ
- 「Next.js の `/api/subsidies` に並び替えオプションを追加」 → route.ts 編集 + types.ts 更新 + テスト

すべて自然言語1回でループまで回せる。
