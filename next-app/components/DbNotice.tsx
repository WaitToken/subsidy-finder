/**
 * DB に接続できないときのフォールバック表示。
 * PoC では DB 未起動のことが多いので、復旧手順を画面に出す。
 */
export function DbNotice({ detail }: { detail?: string }) {
  return (
    <div className="rounded-md border border-accent bg-accent-soft p-6">
      <h2 className="font-serif text-lg text-accent">
        データベースに接続できませんでした
      </h2>
      <p className="mt-2 text-sm text-ink">
        ローカル開発では、リポジトリ直下で以下を実行してください:
      </p>
      <pre className="mt-3 overflow-x-auto rounded-sm bg-ink/90 px-4 py-3 text-xs text-paper">
        {`docker compose up -d db
export DATABASE_URL=postgresql://dev:dev@localhost:5432/tokyo_subsidy
python -m db.migrate_from_json --extracted data/extracted`}
      </pre>
      {detail && (
        <p className="mt-3 text-xs text-subink">詳細: {detail}</p>
      )}
    </div>
  );
}
