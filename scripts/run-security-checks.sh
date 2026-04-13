#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
echo "=== npm audit (moderate+) ==="
npm audit --audit-level=moderate || true
echo ""
echo "=== Vitest ==="
npm run test
