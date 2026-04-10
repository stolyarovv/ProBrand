#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Тот же Homebrew, что в ~/.bash_profile, чтобы были node/npm/npx
for _brew in "$HOME/homebrew/bin/brew" /opt/homebrew/bin/brew /usr/local/bin/brew; do
  if [[ -x "$_brew" ]]; then
    # shellcheck disable=SC2090
    eval "$("$_brew" shellenv)"
    break
  fi
done

TOOLS_NODE="$ROOT/.tools/node/bin"
if [[ -x "$TOOLS_NODE/node" ]]; then
  export PATH="$TOOLS_NODE:$PATH"
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node не найден. Установите Node.js или используйте portable в $ROOT/.tools/node"
  exit 1
fi

if command -v docker >/dev/null 2>&1; then
  docker compose up -d
  echo "Ожидание PostgreSQL на localhost:5432…"
  for _ in $(seq 1 40); do
    if nc -z localhost 5432 2>/dev/null; then
      break
    fi
    sleep 1
  done
else
  echo "Docker не найден в PATH. Запустите БД сами:"
  echo "  • Docker Desktop: в другом терминале — docker compose up -d"
  echo "  • или Postgres.app / свой Postgres на localhost:5432 с URL из .env"
  if ! nc -z localhost 5432 2>/dev/null; then
    echo "Порт 5432 недоступен. Остановка."
    exit 1
  fi
fi

npx prisma db push
npx prisma db seed
exec npm run dev
