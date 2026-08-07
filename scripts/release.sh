#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GITHUB_REPO="0x99M/clipmer"

# ── Read version from linux/package.json ──────────────────────────────
VERSION=$(node -p "require('$REPO_ROOT/linux/package.json').version")
TAG="v$VERSION"
echo "Version: $VERSION (tag: $TAG)"

# ── Require a changelog entry ─────────────────────────────────────────
# The site's /changelog reads web/lib/changelog.ts, which is hand-maintained.
# Refusing to publish without an entry is what stops it going stale.
CHANGELOG_TS="$REPO_ROOT/web/lib/changelog.ts"
if ! grep -q "version: \"$VERSION\"" "$CHANGELOG_TS"; then
  echo "ERROR: No changelog entry for $VERSION in web/lib/changelog.ts"
  echo "Add a Release entry at the top of CHANGELOG, then re-run."
  exit 1
fi
echo "Changelog entry for $VERSION found."

# ── Locate dist files ─────────────────────────────────────────────────
DEB="$REPO_ROOT/linux/dist/clipmer_${VERSION}_amd64.deb"
APPIMAGE="$REPO_ROOT/linux/dist/Clipmer-${VERSION}.AppImage"
RPM="$REPO_ROOT/linux/dist/clipmer-${VERSION}.x86_64.rpm"

missing=0
for f in "$DEB" "$APPIMAGE" "$RPM"; do
  if [[ ! -f "$f" ]]; then
    echo "ERROR: Missing $f"
    missing=1
  fi
done
[[ $missing -eq 1 ]] && echo "Run electron-builder first." && exit 1

echo "Found:"
echo "  .deb      $(du -h "$DEB" | cut -f1)  $DEB"
echo "  AppImage  $(du -h "$APPIMAGE" | cut -f1)  $APPIMAGE"
echo "  .rpm      $(du -h "$RPM" | cut -f1)  $RPM"

# ── Checksums ─────────────────────────────────────────────────────────
# Published as a fourth asset so anyone can verify what they downloaded before
# running it with sudo. Generated from the same files that are uploaded below,
# in the dist directory, so the names in the file are bare and `sha256sum -c`
# works from wherever the user saved them.
echo ""
echo "Generating SHA256SUMS ..."
SUMS="$REPO_ROOT/linux/dist/SHA256SUMS"
(
  cd "$REPO_ROOT/linux/dist"
  sha256sum "$(basename "$DEB")" "$(basename "$APPIMAGE")" "$(basename "$RPM")" > SHA256SUMS
  sha256sum -c SHA256SUMS >/dev/null
)
cat "$SUMS" | sed 's/^/  /'

# ── Create or update GitHub release ───────────────────────────────────
echo ""
echo "Creating GitHub release $TAG ..."

if gh release view "$TAG" --repo "$GITHUB_REPO" &>/dev/null; then
  echo "Release $TAG already exists — uploading assets (overwrite)..."
  gh release upload "$TAG" "$DEB" "$APPIMAGE" "$RPM" "$SUMS" --repo "$GITHUB_REPO" --clobber
else
  gh release create "$TAG" "$DEB" "$APPIMAGE" "$RPM" "$SUMS" \
    --repo "$GITHUB_REPO" \
    --title "Clipmer $TAG" \
    --notes "Secrets-aware clipboard manager for Linux (Ubuntu/GNOME/Wayland)" \
    --latest
fi

echo "Release uploaded."

# ── Update version strings in web/ ────────────────────────────────────
echo ""
echo "Updating web/ version references ..."

WEB="$REPO_ROOT/web"
DEB_URL="https://github.com/$GITHUB_REPO/releases/download/$TAG/clipmer_${VERSION}_amd64.deb"
APPIMAGE_URL="https://github.com/$GITHUB_REPO/releases/download/$TAG/Clipmer-${VERSION}.AppImage"

# web/package.json — sync version
npm --prefix "$WEB" version "$VERSION" --no-git-tag-version --allow-same-version >/dev/null

# lib/release.ts — the single source for the version and every asset URL.
# download.tsx, footer.tsx and the install guide all import from it, so this one
# substitution covers all of them.
sed -i -E \
  "s|^export const VERSION = \"[0-9.]+\";|export const VERSION = \"${VERSION}\";|" \
  "$WEB/lib/release.ts"

# Blog posts quote versioned asset filenames in install commands. GitHub's
# /releases/latest/download/ still needs the exact asset name, so these cannot be
# made version-agnostic and have to be rewritten on every release.
if compgen -G "$WEB/content/blog/*.mdx" >/dev/null; then
  sed -i \
    -e "s|clipmer_[0-9.]\+_amd64\.deb|clipmer_${VERSION}_amd64.deb|g" \
    -e "s|clipmer-[0-9.]\+\.x86_64\.rpm|clipmer-${VERSION}.x86_64.rpm|g" \
    -e "s|Clipmer-[0-9.]\+\.AppImage|Clipmer-${VERSION}.AppImage|g" \
    "$WEB"/content/blog/*.mdx
fi

# NOTE: hero.tsx no longer carries a version string. Its mockup title bar shows
# the live "N masked" pill instead, so there is nothing here to rewrite.

echo "Updated:"
echo "  web/package.json"
echo "  web/lib/release.ts"

# ── Verify ────────────────────────────────────────────────────────────
echo ""
echo "Verifying ..."
grep -q "export const VERSION = \"$VERSION\";" "$WEB/lib/release.ts" \
  && echo "lib/release.ts pinned to $VERSION" \
  || echo "WARNING: lib/release.ts was not updated"

echo ""
echo "Done. Run 'cd web && npm run build' to rebuild the site."
