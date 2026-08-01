#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GITHUB_REPO="0x99M/clipmer"

# ── Read version from linux/package.json ──────────────────────────────
VERSION=$(node -p "require('$REPO_ROOT/linux/package.json').version")
TAG="v$VERSION"
echo "Version: $VERSION (tag: $TAG)"

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

# ── Create or update GitHub release ───────────────────────────────────
echo ""
echo "Creating GitHub release $TAG ..."

if gh release view "$TAG" --repo "$GITHUB_REPO" &>/dev/null; then
  echo "Release $TAG already exists — uploading assets (overwrite)..."
  gh release upload "$TAG" "$DEB" "$APPIMAGE" "$RPM" --repo "$GITHUB_REPO" --clobber
else
  gh release create "$TAG" "$DEB" "$APPIMAGE" "$RPM" \
    --repo "$GITHUB_REPO" \
    --title "Clipmer $TAG" \
    --notes "Clipboard history manager for Linux (Ubuntu/GNOME/Wayland)" \
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

# download.tsx — all three release asset URLs plus the version badge.
# The badge renders its text on its own JSX line, so it is matched as a
# whitespace-only line rather than with the >v…< form used in footer.tsx.
sed -i \
  -e "s|releases/download/v[0-9.]\+/clipmer_[0-9.]\+_amd64\.deb|releases/download/$TAG/clipmer_${VERSION}_amd64.deb|g" \
  -e "s|releases/download/v[0-9.]\+/clipmer-[0-9.]\+\.x86_64\.rpm|releases/download/$TAG/clipmer-${VERSION}.x86_64.rpm|g" \
  -e "s|releases/download/v[0-9.]\+/Clipmer-[0-9.]\+\.AppImage|releases/download/$TAG/Clipmer-${VERSION}.AppImage|g" \
  "$WEB/components/sections/download.tsx"
sed -i -E \
  "s|^([[:space:]]*)v[0-9]+\.[0-9]+\.[0-9]+[[:space:]]*$|\1v${VERSION}|" \
  "$WEB/components/sections/download.tsx"

# footer.tsx — inline version display
sed -i \
  "s|>v[0-9.]\+<|>v${VERSION}<|g" \
  "$WEB/components/sections/footer.tsx"

# NOTE: hero.tsx no longer carries a version string. Its mockup title bar shows
# the live "N masked" pill instead, so there is nothing here to rewrite.

echo "Updated:"
echo "  web/package.json"
echo "  web/components/sections/download.tsx"
echo "  web/components/sections/footer.tsx"

# ── Verify ────────────────────────────────────────────────────────────
echo ""
echo "Verifying ..."
FOUND=$(grep -r "v$VERSION" "$WEB/components/sections/" | wc -l)
echo "Found $FOUND version references in web/components/sections/"

echo ""
echo "Done. Run 'cd web && npm run build' to rebuild the site."
