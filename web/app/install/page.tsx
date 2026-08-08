import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { Footer } from "@/components/sections/footer";
import { InstallGuide } from "@/components/install/install-guide";
import { CommandBlock } from "@/components/copy-button";
import { TESTED_ON } from "@/lib/tested-on";
import { CHECKSUMS_URL, VERSION } from "@/lib/release";
import { ALTERNATE_TYPES, OG_BASE, canonical } from "@/lib/seo";

const TITLE = "Install Clipmer on Linux — Ubuntu, Fedora, AppImage";
const DESCRIPTION =
  "Install the Clipmer clipboard manager on Linux in one command — Ubuntu and Debian (.deb), Fedora and RHEL (.rpm), or any distro via AppImage.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: canonical("/install"),
    types: ALTERNATE_TYPES,
  },
  openGraph: {
    ...OG_BASE,
    url: canonical("/install"),
    title: "Install Clipmer on Linux",
    description:
      "One command for Ubuntu, Fedora, or any distribution via AppImage — plus the two post-install steps that matter.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Install Clipmer on Linux",
    description:
      "One command for Ubuntu, Fedora, or any distribution via AppImage — plus the two post-install steps that matter.",
  },
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-16">
      <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function InstallPage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 pt-12 pb-24 sm:px-6 sm:pt-16">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Install Clipmer
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
          One command. Clipmer is a{" "}
          <span className="text-foreground">Linux desktop app</span> — it runs entirely on
          your machine and never sends your clipboard anywhere.
        </p>

        <div className="mt-10">
          <InstallGuide />
        </div>

        <Section title="After installing">
          <ol className="space-y-5">
            <li className="flex gap-4">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-orange/15 text-xs font-semibold text-orange">
                1
              </span>
              <div className="min-w-0">
                <p className="leading-relaxed">
                  Launch Clipmer from your applications menu. It lives in the system tray
                  rather than the taskbar.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-orange/15 text-xs font-semibold text-orange">
                2
              </span>
              <div className="min-w-0">
                <p className="leading-relaxed">
                  Press{" "}
                  <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[13px]">
                    Ctrl+Shift+D
                  </kbd>{" "}
                  to open it. Copy a few things first, or the list will be empty.
                </p>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  On Wayland, Clipmer registers a GNOME keyboard shortcut for this
                  automatically, because applications cannot claim global hotkeys directly.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-orange/15 text-xs font-semibold text-orange">
                3
              </span>
              <div className="min-w-0">
                <p className="leading-relaxed">
                  Turning on auto-paste?{" "}
                  <span className="text-foreground">Log out and back in afterwards.</span>
                </p>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Auto-paste installs a small GNOME Shell extension, and GNOME only loads
                  extensions when your session starts. Until you log out, selecting an entry
                  copies it but will not paste.
                </p>
              </div>
            </li>
          </ol>
        </Section>

        <Section title="Verify what you downloaded">
          <p className="leading-relaxed text-muted-foreground">
            Every release publishes a{" "}
            <a
              href={CHECKSUMS_URL}
              className="text-orange hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              SHA256SUMS
            </a>{" "}
            file. Run this in the directory you downloaded to, before installing:
          </p>
          <div className="mt-4">
            <CommandBlock
              command={`curl -fsSL ${CHECKSUMS_URL} -o SHA256SUMS && sha256sum -c --ignore-missing SHA256SUMS`}
            />
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            You should see <code className="font-mono text-foreground">OK</code> next to each
            file you have.{" "}
            <code className="font-mono text-foreground">--ignore-missing</code> means it only
            checks the ones you actually downloaded. If a line says{" "}
            <code className="font-mono text-foreground">FAILED</code>, do not install it —
            tell us instead.
          </p>
        </Section>

        <Section title="Requirements">
          <ul className="space-y-2 text-muted-foreground">
            <li>
              <span className="text-foreground">GNOME on X11 or Wayland.</span> Other desktops
              mostly work, but the auto-paste helper is GNOME-specific.
            </li>
            <li>
              <span className="text-foreground">x86_64.</span> There is no ARM build yet.
            </li>
            <li>
              <span className="text-foreground">Ubuntu 20.04+ or Fedora 30+</span> for the
              packaged builds. The AppImage is more forgiving.
            </li>
          </ul>
          <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Tested on:</span>
            {TESTED_ON.map((os) => (
              <span
                key={`${os.name}-${os.version}`}
                className="rounded-md border border-orange/30 bg-orange/10 px-2 py-0.5 text-orange"
              >
                {os.name} {os.version}
              </span>
            ))}
          </div>
        </Section>

        <Section title="Updating">
          <p className="leading-relaxed text-muted-foreground">
            Clipmer does not update itself. Install the newer package over the old one with
            the same command — your history, folders and licence are kept, since they live in{" "}
            <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-[13px] text-foreground">
              ~/.config/clipmer
            </code>{" "}
            rather than inside the app.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            The{" "}
            <Link href="/changelog" className="text-orange hover:underline">
              changelog
            </Link>{" "}
            lists what each version changed. You are looking at v{VERSION}.
          </p>
        </Section>

        <Section title="Uninstalling">
          <div className="space-y-4">
            <CommandBlock label="Ubuntu, Debian and derivatives" command="sudo apt remove clipmer" />
            <CommandBlock label="Fedora, RHEL, openSUSE" command="sudo dnf remove clipmer" />
            <CommandBlock
              label="Remove your history and settings too"
              command="rm -rf ~/.config/clipmer"
            />
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Removing the package also removes the auto-paste helper, the keyboard shortcut it
            registered, and the start-on-login entry. If you used the AppImage, delete the
            file.
          </p>
        </Section>

        <Section title="Something not working?">
          <p className="leading-relaxed text-muted-foreground">
            Open an issue on{" "}
            <a
              href="https://github.com/0x99M/clipmer/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange hover:underline"
            >
              GitHub
            </a>{" "}
            or email{" "}
            <a href="mailto:support@clipmer.app" className="text-orange hover:underline">
              support@clipmer.app
            </a>
            . Telling us your distribution and whether you are on X11 or Wayland saves a
            round trip — check with{" "}
            <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-[13px] text-foreground">
              echo $XDG_SESSION_TYPE
            </code>
            .
          </p>
        </Section>
      </main>
      <Footer />
    </>
  );
}
