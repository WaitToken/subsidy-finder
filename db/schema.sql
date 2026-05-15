-- ============================================================
-- Subsidy Finder — PostgreSQL Schema v0.5 (全国・個人/事業者対応)
-- ============================================================

-- Drop existing (development convenience)
DROP TABLE IF EXISTS benefit_tiers CASCADE;
DROP TABLE IF EXISTS goods_items CASCADE;
DROP TABLE IF EXISTS subsidy_relations CASCADE;
DROP TABLE IF EXISTS application_rounds CASCADE;
DROP TABLE IF EXISTS subsidies CASCADE;
DROP TABLE IF EXISTS operating_bodies CASCADE;

-- ============================================================
-- Operating bodies (実施主体: 都道府県・政令市・特別区など全国の自治体)
-- ============================================================
CREATE TABLE operating_bodies (
    id          SERIAL PRIMARY KEY,
    code        TEXT UNIQUE NOT NULL,           -- 'tokyo', 'osaka-shi', 'setagaya', ...
    name        TEXT NOT NULL,                  -- '東京都', '大阪市', '世田谷区'
    type        TEXT NOT NULL CHECK (type IN (
        'prefecture', 'designated_city', 'ward', 'city', 'town', 'village'
    )),
    prefecture_code TEXT NOT NULL,              -- 所属都道府県の code。都道府県自身は自分の code
    homepage_url TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_operating_bodies_prefecture ON operating_bodies(prefecture_code);

-- 自治体マスタは data/seeds.yaml を single source of truth とする。
-- schema 適用後に db/load_bodies.py で operating_bodies へ投入すること。
--   python -m db.load_bodies --seeds data/seeds.yaml

-- ============================================================
-- Main subsidies table
-- ============================================================
CREATE TABLE subsidies (
    id                    SERIAL PRIMARY KEY,
    -- 基本
    program_name          TEXT NOT NULL,
    operating_body_id     INTEGER NOT NULL REFERENCES operating_bodies(id),

    -- 分類
    category              TEXT NOT NULL CHECK (category IN (
        '子育て・教育', '住まい', '医療・健康', '高齢者・介護',
        '障害者支援', '就労・起業', 'ひとり親・低所得', '環境', 'その他'
    )),
    subcategory           TEXT,
    -- v0.5: 個人向け / 事業者向けの区分
    target_audience       TEXT NOT NULL DEFAULT '不明' CHECK (target_audience IN (
        '個人', '事業者', '両方', '不明'
    )),

    -- 対象者
    target_summary        TEXT NOT NULL,
    target_age_min        INTEGER,
    target_age_max        INTEGER,
    target_household      JSONB DEFAULT '[]'::JSONB,        -- list[str]
    target_income_max_yen BIGINT,
    target_residency_required BOOLEAN DEFAULT TRUE,

    -- 支援内容
    benefit_summary       TEXT NOT NULL,
    benefit_type          TEXT NOT NULL CHECK (benefit_type IN (
        '現金', 'ポイント・電子マネー', '商品券・クーポン',
        'サービス提供', '現物給付', '複合', '不明'
    )),
    benefit_amount_max_yen BIGINT,
    benefit_rate_percent   INTEGER CHECK (benefit_rate_percent BETWEEN 0 AND 100),
    eligible_expense_categories JSONB,
    selection_quota        INTEGER,

    -- 申請
    application_window_type TEXT CHECK (application_window_type IN (
        '固定日付', 'イベント基準', '通年', '予算枠まで', '不明'
    )),
    application_window_note TEXT,
    application_start      DATE,
    application_end        DATE,
    application_method     TEXT,
    required_documents     JSONB,

    -- ステータス
    status                 TEXT NOT NULL CHECK (status IN (
        '募集中', '終了', '予定', '通年', '不明'
    )),
    status_note            TEXT,

    -- 連絡先 & 出典
    contact                TEXT,
    source_url             TEXT NOT NULL UNIQUE,

    -- ユーザー向け要約
    plain_summary          TEXT NOT NULL,

    -- メタデータ
    extracted_at           TIMESTAMPTZ,
    verified               BOOLEAN DEFAULT FALSE,           -- 人手検証済みフラグ
    extraction_confidence  REAL,                            -- LLM 信頼度
    created_at             TIMESTAMPTZ DEFAULT NOW(),
    updated_at             TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Application rounds (年複数回募集)
-- ============================================================
CREATE TABLE application_rounds (
    id              SERIAL PRIMARY KEY,
    subsidy_id      INTEGER NOT NULL REFERENCES subsidies(id) ON DELETE CASCADE,
    round_number    INTEGER NOT NULL,
    start_date      DATE,
    end_date        DATE,
    note            TEXT,
    UNIQUE(subsidy_id, round_number)
);

-- ============================================================
-- Related programs (制度間関係)
-- ============================================================
CREATE TABLE subsidy_relations (
    id                  SERIAL PRIMARY KEY,
    subsidy_id          INTEGER NOT NULL REFERENCES subsidies(id) ON DELETE CASCADE,
    related_program_name TEXT NOT NULL,
    related_subsidy_id  INTEGER REFERENCES subsidies(id),   -- nullable: 名寄せ後にリンク
    relation_type       TEXT NOT NULL CHECK (relation_type IN (
        '併用可能', '前提', '代替', '関連'
    )),
    note                TEXT
);

-- ============================================================
-- Benefit tiers (段階金額: 車種別・所得別など)  ← v0.4
-- ============================================================
CREATE TABLE benefit_tiers (
    id              SERIAL PRIMARY KEY,
    subsidy_id      INTEGER NOT NULL REFERENCES subsidies(id) ON DELETE CASCADE,
    condition_type  TEXT NOT NULL CHECK (condition_type IN (
        '車種', '所得区分', '世帯人数', '子の出生順', '年齢区分', '地域区分', 'その他'
    )),
    condition_label TEXT NOT NULL,
    amount_yen      BIGINT,
    rate_percent    INTEGER CHECK (rate_percent BETWEEN 0 AND 100),
    note            TEXT
);

-- ============================================================
-- Goods items (現物給付の品目・在庫限定フラグ)  ← v0.4
-- ============================================================
CREATE TABLE goods_items (
    id              SERIAL PRIMARY KEY,
    subsidy_id      INTEGER NOT NULL REFERENCES subsidies(id) ON DELETE CASCADE,
    item_name       TEXT NOT NULL,
    quantity_note   TEXT,
    stock_limited   BOOLEAN NOT NULL DEFAULT FALSE,
    note            TEXT
);

-- ============================================================
-- Indexes for filter + search performance
-- ============================================================
CREATE INDEX idx_subsidies_category    ON subsidies(category);
CREATE INDEX idx_subsidies_audience    ON subsidies(target_audience);
CREATE INDEX idx_subsidies_body        ON subsidies(operating_body_id);
CREATE INDEX idx_subsidies_status      ON subsidies(status);
CREATE INDEX idx_subsidies_deadline    ON subsidies(application_end) WHERE application_end IS NOT NULL;
CREATE INDEX idx_subsidies_household   ON subsidies USING GIN (target_household);
CREATE INDEX idx_benefit_tiers_subsidy ON benefit_tiers(subsidy_id);
CREATE INDEX idx_goods_items_subsidy   ON goods_items(subsidy_id);

-- Trigram index for fuzzy program name search
-- (require: CREATE EXTENSION pg_trgm;)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_subsidies_name_trgm   ON subsidies USING GIN (program_name gin_trgm_ops);

-- Full-text search index (Japanese requires bigm or similar in production;
-- pg_trgm acceptable for PoC)
CREATE INDEX idx_subsidies_plain_trgm  ON subsidies USING GIN (plain_summary gin_trgm_ops);

-- ============================================================
-- Updated-at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_subsidies_updated_at
    BEFORE UPDATE ON subsidies
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- View: searchable_subsidies (denormalized for API convenience)
-- ============================================================
CREATE OR REPLACE VIEW searchable_subsidies AS
SELECT
    s.*,
    ob.code            AS body_code,
    ob.name            AS body_name,
    ob.type            AS body_type,
    ob.prefecture_code AS body_prefecture,
    (SELECT json_agg(row_to_json(ar)) FROM application_rounds ar WHERE ar.subsidy_id = s.id)
                   AS application_rounds,
    (SELECT json_agg(row_to_json(sr)) FROM subsidy_relations sr WHERE sr.subsidy_id = s.id)
                   AS related_programs,
    (SELECT json_agg(row_to_json(bt)) FROM benefit_tiers bt WHERE bt.subsidy_id = s.id)
                   AS benefit_tiers,
    (SELECT json_agg(row_to_json(gi)) FROM goods_items gi WHERE gi.subsidy_id = s.id)
                   AS goods_items
FROM subsidies s
JOIN operating_bodies ob ON s.operating_body_id = ob.id;
