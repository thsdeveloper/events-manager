#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source_dir="$PWD"
build_dir="$(mktemp -d /tmp/stormer123.XXXXXX)"
for suite in core ea; do
  g++ -std=c++17 -Wall -Wextra -Werror -pedantic --coverage "$source_dir/tests/$suite.test.cpp" -o "$build_dir/$suite-tests"
  "$build_dir/$suite-tests"
  if [[ "${1:-}" == coverage ]]; then
    cd "$build_dir"
    gcov -b "$suite-tests-$suite.test.gcno" > "$suite-coverage.txt"
    if [[ "$suite" == core ]]; then header=Stormer123Core.mqh; else header=Stormer123EARules.mqh; fi
    python3 - "$header" <<'PY'
from pathlib import Path
import sys
header = sys.argv[1]
report = Path(header + '.gcov').read_text()
assert '#####' not in report and '=====' not in report, header + ' coverage fell below 100%'
print(header + ': line coverage gate 100% PASS')
PY
    cd "$source_dir"
  fi
done
