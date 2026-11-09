# Dependency setup shared by run-sandbox.sh and test-sandbox.sh. Source it; do not run it.
#
# `install_dependencies` installs the API's (api/.venv) and the web app's (web/node_modules)
# dependencies, trying in order:
#   1. the versions in the lockfiles, offline (from the uv and pnpm caches);
#   2. the versions in the lockfiles, with network;
#   3. when the package index refuses versions the lockfiles pin (a mirror that lags behind, or
#      a "minimum release age" policy): a new resolution within the ranges of pyproject.toml and
#      package.json that skips releases newer than N days, for each N in
#      SANDBOX_DEPS_MIN_AGE_DAYS, offline first and then with network.
# Step 3 never rewrites uv.lock or pnpm-lock.yaml: it installs with `uv pip` and with pnpm's
# lockfile turned off, and prints a warning, since the versions differ from the lockfiles.
# It remembers in .sandbox/deps/ which N worked: while the lockfile is unchanged, later runs go
# straight to that N (delete .sandbox/deps/ to try the lockfile again).
#
# A failed pnpm install can leave node_modules half-relinked, with links to packages it could not
# download. So every web attempt is checked for dangling links, and after a failed one
# web/node_modules is removed: the next attempt relinks it from pnpm's store.
#
# If pnpm cannot switch to the version pinned in web/package.json ("packageManager"), for
# example because the registry serves it unsigned, the installed pnpm is used instead.
#
# Settings (environment variables):
#   SANDBOX_DEPS=locked                  use only the lockfiles (steps 1 and 2), never step 3
#   SANDBOX_OFFLINE=1                    never use the network
#   SANDBOX_DEPS_MIN_AGE_DAYS="14 30"    the N values step 3 tries (default "14 30 60 90")
#
# Afterwards, run API commands with `api_run <command>`: it uses api/.venv as installed and
# never syncs it again (so it also works offline). It also puts api/ on PYTHONPATH, so
# `python -m scripts.…` and `app` imports work even where PYTHONSAFEPATH is set (Python then
# leaves the current directory out of sys.path).

SANDBOX_DEPS="${SANDBOX_DEPS:-auto}"
SANDBOX_OFFLINE="${SANDBOX_OFFLINE:-0}"
SANDBOX_DEPS_MIN_AGE_DAYS="${SANDBOX_DEPS_MIN_AGE_DAYS:-14 30 60 90}"
_deps_state_dir=".sandbox/deps"
_deps_log="$(mktemp "${TMPDIR:-/tmp}/kambi-deps-XXXXXX")"

api_run() {
  UV_OFFLINE=1 PYTHONPATH="$PWD/api${PYTHONPATH:+:$PYTHONPATH}" \
    uv run --directory api --no-sync "$@"
}

_deps_note() {
  echo "sandbox-deps: $*" >&2
}

# Run a quiet attempt; keep its output in the log for the final error message.
_deps_try() {
  echo "\$ $*" >>"$_deps_log"
  "$@" >>"$_deps_log" 2>&1
}

# The date N days ago (UTC), with GNU or BSD date.
_deps_days_ago() {
  date -u -d "-$1 days" +%F 2>/dev/null || date -u -v "-$1d" +%F
}

_deps_checksum() {
  cat "$@" | cksum | cut -d ' ' -f 1
}

# The network modes to try: offline first, then online unless SANDBOX_OFFLINE=1.
_deps_networks() {
  if [ "$SANDBOX_OFFLINE" = "1" ]; then echo offline; else echo "offline online"; fi
}

# The N that worked in step 3 for this lockfile, if any.
_deps_remembered() {
  if [ -f "$_deps_state_dir/$1" ]; then
    awk -v sum="$2" '$1 == sum { print $2 }' "$_deps_state_dir/$1"
  fi
}

# The N values to try in step 3, without the remembered one (it was tried first).
_deps_ages() {
  for age in $SANDBOX_DEPS_MIN_AGE_DAYS; do
    if [ "$age" != "$1" ]; then echo "$age"; fi
  done
}

_deps_remember() {
  mkdir -p "$_deps_state_dir"
  echo "$2 $3" >"$_deps_state_dir/$1"
}

_deps_forget() {
  rm -f "$_deps_state_dir/$1"
}

_deps_api_locked() {
  if [ "$1" = "offline" ]; then
    _deps_try env UV_OFFLINE=1 uv sync --directory api --frozen
  else
    _deps_try env -u UV_OFFLINE uv sync --directory api --frozen
  fi
}

_deps_api_fallback() {
  local mode="-u UV_OFFLINE" cutoff
  cutoff="$(_deps_days_ago "$2")"
  if [ "$1" = "offline" ]; then mode="UV_OFFLINE=1"; fi
  # shellcheck disable=SC2086 # $mode is one env argument or two
  _deps_try env $mode uv venv --directory api --allow-existing --quiet &&
    _deps_try env $mode uv pip install --directory api --quiet \
      -r pyproject.toml --group dev --exclude-newer "$cutoff"
}

_deps_web_locked() {
  local offline=""
  if [ "$1" = "offline" ]; then offline="--offline"; fi
  # shellcheck disable=SC2086 # $offline is empty or one flag
  _deps_web_checked pnpm --dir web install --frozen-lockfile \
    --config.confirm-modules-purge=false $offline
}

_deps_web_fallback() {
  local offline=""
  if [ "$1" = "offline" ]; then offline="--offline"; fi
  # shellcheck disable=SC2086 # $offline is empty or one flag
  _deps_web_checked pnpm --dir web install --config.lockfile=false \
    --config.confirm-modules-purge=false --config.minimum-release-age="$(($2 * 24 * 60))" $offline
}

# The first dangling link in web/node_modules (links of packages and of their dependencies).
_deps_web_dangling_link() {
  find -L web/node_modules -maxdepth 5 -type l 2>/dev/null | head -n 1 || true
}

# Run a pnpm install and check its result; on failure, remove the half-linked node_modules.
_deps_web_checked() {
  local dangling
  if _deps_try "$@"; then
    dangling="$(_deps_web_dangling_link)"
    if [ -z "$dangling" ]; then return 0; fi
    echo "dangling link after the install: $dangling" >>"$_deps_log"
  fi
  rm -rf web/node_modules
  return 1
}

# Step 3 with N days: offline, then with network. Remembers N when it works.
_deps_fallback_with() {
  local name="$1" checksum="$2" age="$3" network
  for network in $(_deps_networks); do
    if "_deps_${name}_fallback" "$network" "$age"; then
      _deps_remember "$name" "$checksum" "$age"
      _deps_note "WARNING: $name: the lockfile's versions are not available here, so it was" \
        "installed from its version ranges, skipping releases newer than $age days" \
        "($network). The lockfile is unchanged."
      return 0
    fi
  done
  return 1
}

# install_component <name> <lockfile...>: runs steps 1 to 3 with _deps_<name>_locked/_fallback.
_deps_install_component() {
  local name="$1" checksum network age remembered=""
  shift
  checksum="$(_deps_checksum "$@")"
  if [ "$SANDBOX_DEPS" != "locked" ]; then
    remembered="$(_deps_remembered "$name" "$checksum")"
    if [ -n "$remembered" ] && _deps_fallback_with "$name" "$checksum" "$remembered"; then
      return 0
    fi
  fi
  for network in $(_deps_networks); do
    if "_deps_${name}_locked" "$network"; then
      _deps_forget "$name"
      return 0
    fi
  done
  if [ "$SANDBOX_DEPS" = "locked" ]; then
    _deps_note "$name: the versions in the lockfile could not be installed (SANDBOX_DEPS=locked)."
    return 1
  fi
  for age in $(_deps_ages "$remembered"); do
    if _deps_fallback_with "$name" "$checksum" "$age"; then return 0; fi
  done
  _deps_note "$name: no way to install the dependencies worked."
  return 1
}

# If pnpm cannot switch to the version in package.json, use the installed one.
_deps_check_pnpm() {
  if ! _deps_try pnpm --dir web exec node --version; then
    export npm_config_manage_package_manager_versions=false
    if _deps_try pnpm --dir web exec node --version; then
      _deps_note "WARNING: pnpm could not switch to the version in web/package.json;" \
        "using the installed pnpm $(pnpm --version) instead."
    fi
  fi
}

install_dependencies() {
  _deps_note "installing dependencies (details in $_deps_log)..."
  if ! _deps_install_component api api/uv.lock api/pyproject.toml; then
    tail -n 20 "$_deps_log" >&2
    return 1
  fi
  _deps_check_pnpm
  if ! _deps_install_component web web/pnpm-lock.yaml web/package.json; then
    tail -n 20 "$_deps_log" >&2
    return 1
  fi
  rm -f "$_deps_log"
}
