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

missing=0
for f in "$DEB" "$APPIMAGE"; do
  if [[ ! -f "$f" ]]; then
    echo "ERROR: Missing $f"
    missing=1
  fi
done
[[ $missing -eq 1 ]] && echo "Run electron-builder first." && exit 1

echo "Found:"
echo "  .deb      $(du -h "$DEB" | cut -f1)  $DEB"
echo "  AppImage  $(du -h "$APPIMAGE" | cut -f1)  $APPIMAGE"

# ── Create or update GitHub release ───────────────────────────────────
echo ""
echo "Creating GitHub release $TAG ..."

if gh release view "$TAG" --repo "$GITHUB_REPO" &>/dev/null; then
  echo "Release $TAG already exists — uploading assets (overwrite)..."
  gh release upload "$TAG" "$DEB" "$APPIMAGE" --repo "$GITHUB_REPO" --clobber
else
  gh release create "$TAG" "$DEB" "$APPIMAGE" \
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

# download.tsx — version badge and download URLs
sed -i \
  -e "s|releases/download/v[0-9.]\+/clipmer_[0-9.]\+_amd64\.deb|releases/download/$TAG/clipmer_${VERSION}_amd64.deb|g" \
  -e "s|releases/download/v[0-9.]\+/Clipmer-[0-9.]\+\.AppImage|releases/download/$TAG/Clipmer-${VERSION}.AppImage|g" \
  -e "s|>v[0-9.]\+<|>v${VERSION}<|g" \
  "$WEB/components/sections/download.tsx"

# hero.tsx — mockup title bar
sed -i \
  "s|Clipmer v[0-9.]\+|Clipmer v${VERSION}|g" \
  "$WEB/components/sections/hero.tsx"

# footer.tsx — version display
sed -i \
  "s|>v[0-9.]\+<|>v${VERSION}<|g" \
  "$WEB/components/sections/footer.tsx"

echo "Updated:"
echo "  web/package.json"
echo "  web/components/sections/download.tsx"
echo "  web/components/sections/hero.tsx"
echo "  web/components/sections/footer.tsx"

# ── Verify ────────────────────────────────────────────────────────────
echo ""
echo "Verifying ..."
FOUND=$(grep -r "v$VERSION" "$WEB/components/sections/" | wc -l)
echo "Found $FOUND version references in web/components/sections/"

echo ""
echo "Done. Run 'cd web && npm run build' to rebuild the site."
