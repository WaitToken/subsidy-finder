"""
軽量クローラー

httpx + trafilatura で HTML を取得・本文抽出。
PDF は pdfplumber でテキスト化。

robots.txt 遵守 + リクエスト間隔 (デフォルト 2秒) を必ず守る。
"""
import io
import logging
import os
import time
from datetime import datetime, timezone
from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser

import httpx
import trafilatura
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# 連絡先は環境変数 CONTACT_EMAIL から取得 (本番では必ず実アドレスを設定)。
# 自治体から問い合わせが来た場合の窓口になるため、放置メールは使わないこと。
_CONTACT = os.getenv("CONTACT_EMAIL", "your-email@example.com")
USER_AGENT = (
    f"SubsidyFinderBot/0.5 (PoC research; contact: {_CONTACT})"
)
REQUEST_DELAY_SECONDS = 2.0
TIMEOUT_SECONDS = 30.0

# 補助金関連リンクを発見するキーワード
SUBSIDY_KEYWORDS = [
    "補助", "助成", "給付", "支援金", "奨励", "手当",
    "subsidy", "grant", "support",
]

# depth>=2 の探索で、カテゴリ index ページへ降りるためのキーワード
CATEGORY_KEYWORDS = [
    "くらし", "暮らし", "子育て", "健康", "福祉", "住まい", "高齢", "障害",
    "妊娠", "出産", "教育", "環境", "就労", "事業者",
]


class Crawler:
    def __init__(self, request_delay: float = REQUEST_DELAY_SECONDS):
        self.client = httpx.Client(
            headers={"User-Agent": USER_AGENT},
            timeout=TIMEOUT_SECONDS,
            follow_redirects=True,
        )
        self.request_delay = request_delay
        self._last_request_per_host: dict[str, float] = {}
        self._robots_cache: dict[str, RobotFileParser] = {}

    def close(self):
        self.client.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()

    # -- robots.txt --
    def _allowed(self, url: str) -> bool:
        host = urlparse(url).netloc
        if host not in self._robots_cache:
            rp = RobotFileParser()
            rp.set_url(f"https://{host}/robots.txt")
            try:
                rp.read()
            except Exception as e:
                logger.warning("Failed to read robots.txt for %s: %s", host, e)
            self._robots_cache[host] = rp
        return self._robots_cache[host].can_fetch(USER_AGENT, url)

    # -- rate limit --
    def _wait(self, url: str):
        host = urlparse(url).netloc
        last = self._last_request_per_host.get(host)
        if last is not None:
            elapsed = time.monotonic() - last
            if elapsed < self.request_delay:
                time.sleep(self.request_delay - elapsed)
        self._last_request_per_host[host] = time.monotonic()

    # -- fetch HTML --
    def fetch(self, url: str) -> dict | None:
        if not self._allowed(url):
            logger.info("Blocked by robots.txt: %s", url)
            return None

        self._wait(url)
        try:
            r = self.client.get(url)
            r.raise_for_status()
        except Exception as e:
            logger.warning("Fetch failed for %s: %s", url, e)
            return None

        ct = r.headers.get("content-type", "").lower()
        fetched_at = datetime.now(timezone.utc).isoformat()

        if "application/pdf" in ct or url.lower().endswith(".pdf"):
            text = self._extract_pdf(r.content)
            title = url.rsplit("/", 1)[-1]
        else:
            text, title = self._extract_html(r.text)

        return {
            "url": str(r.url),
            "title": title,
            "content": text or "",
            "fetched_at": fetched_at,
            "content_type": ct,
        }

    # -- HTML extraction --
    @staticmethod
    def _extract_html(html: str) -> tuple[str, str]:
        soup = BeautifulSoup(html, "html.parser")
        title = (soup.title.string.strip() if soup.title and soup.title.string else "")
        text = trafilatura.extract(
            html,
            include_tables=True,
            include_links=False,
            favor_recall=True,
        ) or ""
        return text, title

    # -- PDF extraction --
    @staticmethod
    def _extract_pdf(content: bytes) -> str:
        try:
            import pdfplumber
        except ImportError:
            logger.error("pdfplumber not installed; cannot parse PDF")
            return ""
        try:
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                return "\n\n".join((p.extract_text() or "") for p in pdf.pages)
        except Exception as e:
            logger.warning("PDF extraction failed: %s", e)
            return ""

    # -- collect same-domain links from one page --
    def _same_domain_links(self, url: str, domain: str) -> list[tuple[str, str]]:
        """url を取得し、同一ドメインの (リンクURL, アンカーテキスト) 一覧を返す。"""
        if not self._allowed(url):
            return []
        self._wait(url)
        try:
            r = self.client.get(url)
            r.raise_for_status()
        except Exception as e:
            logger.warning("Discover fetch failed for %s: %s", url, e)
            return []

        soup = BeautifulSoup(r.text, "html.parser")
        out: list[tuple[str, str]] = []
        for a in soup.find_all("a", href=True):
            full = urljoin(url, a["href"]).split("#")[0]
            if urlparse(full).netloc != domain:
                continue
            out.append((full, a.get_text(strip=True)))
        return out

    # -- discover subsidy links from a listing page --
    def discover(
        self, seed_url: str, max_links: int = 50, depth: int = 1
    ) -> list[str]:
        """シードURLから補助金関連ページのリンクを発見する。

        depth=1: シードページ直下のリンクのみ (従来動作)
        depth>=2: カテゴリ系リンク (くらし・子育て・福祉等) を1段ずつたどり、
                  深い階層の個別制度ページも BFS で探索する。
        """
        if not self._allowed(seed_url):
            return []

        seed_domain = urlparse(seed_url).netloc
        leaves: dict[str, str] = {}  # 補助金ページ url -> anchor text
        visited: set[str] = set()
        frontier: list[tuple[str, int]] = [(seed_url, 0)]
        max_discovery_pages = 25  # discovery 中のフェッチ上限 (自治体への礼儀)

        while frontier and len(visited) < max_discovery_pages:
            url, level = frontier.pop(0)
            if url in visited:
                continue
            visited.add(url)

            for full, text in self._same_domain_links(url, seed_domain):
                haystack = (text + " " + full).lower()
                is_subsidy = any(k.lower() in haystack for k in SUBSIDY_KEYWORDS)
                if is_subsidy:
                    # 重複を避けるが、より長いアンカーテキストを優先
                    if full not in leaves or len(text) > len(leaves[full]):
                        leaves[full] = text
                # 次の層へ: カテゴリ系 or 補助金系リンクのみたどる (爆発を防ぐ)
                if level + 1 < depth and full not in visited:
                    is_category = any(k in haystack for k in CATEGORY_KEYWORDS)
                    if is_subsidy or is_category:
                        frontier.append((full, level + 1))

        result = sorted(leaves.keys())[:max_links]
        logger.info(
            "Discovered %d subsidy links from %s (depth=%d, fetched=%d pages)",
            len(result), seed_url, depth, len(visited),
        )
        return result
