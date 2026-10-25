import { CommandBlock } from "@/components/copy-button";
import { ASSETS } from "@/lib/release";

/**
 * The .deb install command for blog posts, built from lib/release.ts.
 *
 * Posts used to hardcode the filename inside a ```bash fence, which
 * scripts/release.sh then had to chase with a sed on every release. The URL was
 * worse than the duplication: /releases/latest/download/clipmer_<version>.deb
 * is a floating alias pointing at a pinned filename, so the moment a release
 * was published the deployed site's command 404'd — `latest` had moved on, and
 * the old asset name does not exist in the new release. It stayed broken until
 * master was pushed.
 *
 * Reading the pinned /releases/download/v<tag>/ URL from lib/release.ts closes
 * that window in both directions: the deployed HTML always names a release that
 * exists, and the worst case is offering the previous version, which installs
 * fine. Same form the download buttons already use.
 */
export function InstallCommand() {
  return (
    <CommandBlock
      className="my-6"
      command={`curl -LO ${ASSETS.deb.url}\nsudo apt install ./${ASSETS.deb.file}`}
    />
  );
}
