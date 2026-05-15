"""
全国自治体 補助金・助成金 構造化スキーマ v0.5

v0.1 → v0.2: ポイント型給付・条件付き期限・予算依存・制度間関係に対応
v0.2 → v0.3: 経費補助型 (助成率% + 対象経費カテゴリ)・複数回募集・採択枠に対応
v0.3 → v0.4: 段階金額 (車種別・所得別など条件で変わる金額) と
             現物給付の品目・在庫限定フラグに対応
v0.4 → v0.5: 個人向け / 事業者向け の対象者区分 (target_audience) に対応。
             生活者向けと事業者向けを対等に扱う。
"""
from datetime import date
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


# ============================================================
# Enums
# ============================================================
class Category(str, Enum):
    CHILDCARE_EDUCATION = "子育て・教育"
    HOUSING = "住まい"
    MEDICAL_HEALTH = "医療・健康"
    ELDERLY_CARE = "高齢者・介護"
    DISABILITY = "障害者支援"
    EMPLOYMENT = "就労・起業"
    SINGLE_PARENT_LOW_INCOME = "ひとり親・低所得"
    ENVIRONMENT = "環境"
    OTHER = "その他"


class Status(str, Enum):
    OPEN = "募集中"
    CLOSED = "終了"
    UPCOMING = "予定"
    YEAR_ROUND = "通年"
    UNKNOWN = "不明"


# ====== v0.5 NEW ======
class TargetAudience(str, Enum):
    """誰が申請できるか。個人向け / 事業者向けを対等に扱うための区分。"""
    INDIVIDUAL = "個人"      # 生活者・個人 (個人事業主・創業予定者・フリーランス含む)
    BUSINESS = "事業者"      # 法人・事業者・施設・団体
    BOTH = "両方"            # 個人も事業者も申請できる
    UNKNOWN = "不明"


class ApplicationMethod(str, Enum):
    ONLINE = "オンライン"
    MAIL = "郵送"
    WINDOW = "窓口"
    MIXED = "複数"
    UNKNOWN = "不明"


# ====== v0.2 NEW ======
class BenefitType(str, Enum):
    """給付の形態。現金以外が増えているため必須化。"""
    CASH = "現金"
    POINTS = "ポイント・電子マネー"     # 例: せたがやPay, 区独自ポイント
    VOUCHER = "商品券・クーポン"
    SERVICE = "サービス提供"             # 例: ホームヘルパー派遣
    GOODS = "現物給付"                   # 例: 育児用品
    MIXED = "複合"                       # 現金+ポイント等
    UNKNOWN = "不明"


class ApplicationWindowType(str, Enum):
    """申請期限の性質。固定日付以外のパターンに対応。"""
    FIXED_DATE = "固定日付"              # 〜2026年3月31日
    RELATIVE_TO_EVENT = "イベント基準"    # 転居から90日以内
    YEAR_ROUND = "通年"
    BUDGET_DEPENDENT = "予算枠まで"       # 上限到達で早期終了
    UNKNOWN = "不明"


class ProgramRelationType(str, Enum):
    """他制度との関係性。"""
    COMBINABLE = "併用可能"              # 同時申請で増額
    PREREQUISITE = "前提"                # この制度の申請に必要
    ALTERNATIVE = "代替"                 # どちらか一方のみ
    RELATED = "関連"                     # 同テーマの参考制度


class ProgramRelation(BaseModel):
    """関連する他制度への参照。

    抽出時には ID が未確定のため program_name で記録。
    後段で program_name → ID マッチングを行う。
    """
    program_name: str
    relation_type: ProgramRelationType
    note: Optional[str] = Field(
        default=None,
        description="例: '併用で最大70万円相当'"
    )


# ====== v0.3 NEW ======
class ApplicationRound(BaseModel):
    """1つの申請受付期間。複数回募集の制度に対応。"""
    round_number: int = Field(description="第N回")
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    note: Optional[str] = Field(
        default=None,
        description="例: '電子申請のみ', '面接審査あり'"
    )


# ====== v0.4 NEW ======
class BenefitTierCondition(str, Enum):
    """段階金額が何によって決まるか。"""
    VEHICLE_TYPE = "車種"            # 例: EV補助 (軽EV / 普通EV / 燃料電池車)
    INCOME_BRACKET = "所得区分"       # 例: 高校学費助成 (年収階層別)
    HOUSEHOLD_SIZE = "世帯人数"
    CHILD_ORDER = "子の出生順"        # 例: 第1子 / 第3子以降で増額
    AGE_BRACKET = "年齢区分"
    REGION = "地域区分"
    OTHER = "その他"


class BenefitTier(BaseModel):
    """条件によって金額が段階的に変わる給付の1段階。

    例: EV補助で「軽EV → 45万円」「燃料電池車 → 110万円」のような車種別段階金額、
        高校学費助成で「年収910万円未満 → 全額」のような所得区分別の金額。
    benefit_amount_max_yen には全段階の最大額を入れ、内訳をここに記録する。
    """
    condition_type: BenefitTierCondition
    condition_label: str = Field(
        description="この段階の条件。例: '軽EV', '年収360万円未満', '第3子以降'"
    )
    amount_yen: Optional[int] = Field(
        default=None, description="この段階での支給額 (円)"
    )
    rate_percent: Optional[int] = Field(
        default=None, description="この段階での補助率 (%)。定額給付なら null"
    )
    note: Optional[str] = None


class GoodsItem(BaseModel):
    """現物給付の品目。

    例: 出産用品配布で「新生児用肌着セット (1世帯1点・数量限定)」。
    抽出時点でページに書かれた事実を記録する。
    実運用時の在庫数カウントは DB 側の責務で、ここでは在庫限定か否かのみ持つ。
    """
    item_name: str = Field(description="品目名。例: '新生児用肌着セット'")
    quantity_note: Optional[str] = Field(
        default=None, description="数量の説明。例: '1世帯1点', '上限3個'"
    )
    stock_limited: bool = Field(
        default=False,
        description="在庫・数量限定か (先着順・なくなり次第終了など)"
    )
    note: Optional[str] = None


# ============================================================
# Main Schema
# ============================================================
class Subsidy(BaseModel):
    # --- 1. 基本情報 ---
    program_name: str = Field(description="制度の正式名称")
    operating_body: str = Field(description="実施主体。例: '東京都', '新宿区'")

    # --- 2. 分類 ---
    category: Category
    subcategory: Optional[str] = None
    # v0.5 NEW
    target_audience: TargetAudience = Field(
        default=TargetAudience.UNKNOWN,
        description="個人向けか事業者向けか。サービスの主要な区分軸"
    )

    # --- 3. 対象者 ---
    target_summary: str
    target_age_min: Optional[int] = None
    target_age_max: Optional[int] = None
    target_household: Optional[list[str]] = None
    target_income_max_yen: Optional[int] = None
    target_residency_required: bool = True

    # --- 4. 支援内容 ---
    benefit_summary: str
    benefit_type: BenefitType = Field(
        default=BenefitType.UNKNOWN,
        description="給付の形態。ポイント・サービス等を区別"
    )
    benefit_amount_max_yen: Optional[int] = Field(
        default=None,
        description="最大支給額の円換算。ポイント等も換算して入れる"
    )
    # v0.3 NEW
    benefit_rate_percent: Optional[int] = Field(
        default=None,
        description="経費補助率 (%)。例: 助成率2/3 → 67。固定額給付の場合は null"
    )
    eligible_expense_categories: Optional[list[str]] = Field(
        default=None,
        description="経費補助型のとき、対象となる経費カテゴリ。例: ['賃借料', '広告費', '人件費']"
    )
    selection_quota: Optional[int] = Field(
        default=None,
        description="採択枠の件数。競争率がある制度向け"
    )
    # v0.4 NEW
    benefit_tiers: list[BenefitTier] = Field(
        default_factory=list,
        description="車種別・所得別など、条件で段階的に変わる金額の内訳。単一額なら空"
    )
    goods_items: list[GoodsItem] = Field(
        default_factory=list,
        description="現物給付の品目。benefit_type が '現物給付' '複合' のとき"
    )

    # --- 5. 申請 ---
    application_window_type: ApplicationWindowType = Field(
        default=ApplicationWindowType.UNKNOWN,
        description="期限の性質"
    )
    application_window_note: Optional[str] = Field(
        default=None,
        description="期限の自然言語説明。例: '転居日から90日以内', '予算上限まで'"
    )
    application_start: Optional[date] = None
    application_end: Optional[date] = None
    # v0.3 NEW
    application_rounds: list[ApplicationRound] = Field(
        default_factory=list,
        description="年複数回募集の場合の各回の情報"
    )
    application_method: ApplicationMethod = ApplicationMethod.UNKNOWN
    required_documents: Optional[list[str]] = None

    # --- 6. ステータス ---
    status: Status = Status.UNKNOWN
    status_note: Optional[str] = Field(
        default=None,
        description="ステータスの追加情報。例: '予算上限到達で受付終了', '先着順'"
    )

    # --- 7. 関連制度 (v0.2 NEW) ---
    related_programs: list[ProgramRelation] = Field(
        default_factory=list,
        description="併用可能・前提・代替の他制度"
    )

    # --- 8. 連絡先 & 出典 ---
    contact: Optional[str] = None
    source_url: str

    # --- 9. ユーザー向け要約 ---
    plain_summary: str = Field(
        description="中学生でも理解できる平易な日本語。200文字以内。"
    )


class ExtractionResult(BaseModel):
    """1ページからの抽出結果。"""
    subsidies: list[Subsidy]
    page_was_a_subsidy_page: bool
