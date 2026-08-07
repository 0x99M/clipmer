"use client";

import { useState, useSyncExternalStore } from "react";
import { AlertTriangle, Download, Terminal } from "lucide-react";
import { CommandBlock } from "@/components/copy-button";
import { ASSETS, RELEASE_PAGE, SUPPORTED_ARCH, VERSION } from "@/lib/release";
import { cn } from "@/lib/utils";

type MethodId = "deb" | "rpm" | "appimage";

const METHODS: {
  id: MethodId;
  label: string;
  distros: string;
  steps: { label?: string; command: string }[];
  note?: string;
}[] = [
  {
    id: "deb",
    label: ".deb",
    distros: "Ubuntu · Debian · Linux Mint · Pop!_OS · Zorin",
    steps: [
      {
        label: "Download and install",
        command: `curl -LO ${ASSETS.deb.url} && sudo apt install ./${ASSETS.deb.file}`,
      },
    ],
    note: "apt pulls in at-spi2-core, which Clipmer needs, and sets up the Chromium sandbox helper. The download is around 85 MB, so curl shows a progress meter while it runs.",
  },
  {
    id: "rpm",
    label: ".rpm",
    distros: "Fedora · RHEL · openSUSE",
    steps: [
      {
        label: "Download and install",
        command: `curl -LO ${ASSETS.rpm.url} && sudo dnf install ./${ASSETS.rpm.file}`,
      },
    ],
    note: "On openSUSE substitute zypper install for dnf install.",
  },
  {
    id: "appimage",
    label: "AppImage",
    distros: "Any distribution · no root required",
    steps: [
      {
        label: "Download and make it executable",
        command: `mkdir -p ~/Applications && curl -L -o ~/Applications/Clipmer.AppImage ${ASSETS.appImage.url} && chmod +x ~/Applications/Clipmer.AppImage`,
      },
      { label: "Run it", command: "~/Applications/Clipmer.AppImage" },
    ],
    note: "The AppImage runs with the Chromium sandbox disabled, because AppImages mount on a nosuid filesystem where the sandbox helper cannot be setuid root. The .deb and .rpm keep it enabled — prefer those if your distro supports them.",
  },
];

type Detected = {
  isLinux: boolean;
  os: string;
  suggested: MethodId | null;
  armWarning: boolean;
};

function detect(userAgent: string): Detected {
  const ua = userAgent.toLowerCase();
  const isLinux = ua.includes("linux") && !ua.includes("android");

  // Only some browsers leak the distribution — Firefox on Ubuntu reports
  // "X11; Ubuntu; Linux x86_64", while Chrome reports only "X11; Linux x86_64".
  // So this is a hint that picks a sensible default tab, never a claim.
  let suggested: MethodId | null = null;
  if (isLinux) {
    if (ua.includes("ubuntu") || ua.includes("debian") || ua.includes("mint")) suggested = "deb";
    else if (ua.includes("fedora") || ua.includes("red hat") || ua.includes("suse")) suggested = "rpm";
    else suggested = "deb";
  }

  let os = "your system";
  if (ua.includes("android")) os = "Android";
  else if (isLinux) os = "Linux";
  else if (ua.includes("mac os") || ua.includes("macintosh")) os = "macOS";
  else if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("iphone") || ua.includes("ipad")) os = "iOS";

  // Only x86_64 is published. aarch64 shows up as "aarch64" or "arm64".
  const armWarning = isLinux && (ua.includes("aarch64") || ua.includes("arm64"));

  return { isLinux, os, suggested, armWarning };
}

/* Detection is read through useSyncExternalStore rather than an effect: Next 16
   forbids calling setState in an effect body, and this is exactly what the hook
   is for — a value that exists only on the client and never changes afterwards.
   The snapshot is cached because React compares it with Object.is, and a fresh
   object every call would loop. */
let cached: Detected | null = null;
const subscribe = () => () => {};
const clientSnapshot = () => (cached ??= detect(navigator.userAgent));
const serverSnapshot = () => null;

export function InstallGuide() {
  const detected = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  // Null until the user picks a tab, so the detected suggestion stays in effect
  // without ever being written into state.
  const [chosen, setChosen] = useState<MethodId | null>(null);

  const active: MethodId = chosen ?? detected?.suggested ?? "deb";
  const setActive = setChosen;

  const method = METHODS.find((m) => m.id === active) ?? METHODS[0];

  return (
    <div>
      {/* Detection banner. Rendered only after mount, so the server HTML never
          asserts something about a visitor it cannot know. */}
      {detected && !detected.isLinux ? (
        <div className="mb-8 flex items-start gap-3 rounded-lg border border-orange/25 bg-orange/[0.06] px-4 py-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-orange" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            <span className="text-foreground">Clipmer is Linux-only.</span> It looks like
            you are on {detected.os}, so the commands below will not run here — but you can
            copy the link and pick it up on your Linux machine.
          </p>
        </div>
      ) : null}

      {detected?.armWarning ? (
        <div className="mb-8 flex items-start gap-3 rounded-lg border border-orange/25 bg-orange/[0.06] px-4 py-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-orange" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            <span className="text-foreground">ARM is not supported yet.</span> Clipmer is
            published for {SUPPORTED_ARCH} only. An ARM build is not available, so these
            packages will not install on this machine.
          </p>
        </div>
      ) : null}

      <div
        role="tablist"
        aria-label="Installation method"
        className="flex flex-wrap gap-2"
      >
        {METHODS.map((m) => {
          const selected = m.id === active;
          return (
            <button
              key={m.id}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`install-${m.id}`}
              onClick={() => setActive(m.id)}
              className={cn(
                "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                selected
                  ? "border-orange/50 bg-orange/10 text-orange"
                  : "border-border text-muted-foreground hover:border-border hover:bg-surface/50 hover:text-foreground"
              )}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Every panel is rendered and the inactive ones are hidden, rather than
          swapped in on click. Otherwise the Fedora and AppImage commands exist
          nowhere in the HTML, which is most of what this page is for — someone
          searching "install clipmer fedora" has to be able to match it. It also
          means the commands are readable without JavaScript. */}
      {METHODS.map((m) => (
        <div
          key={m.id}
          id={`install-${m.id}`}
          role="tabpanel"
          hidden={m.id !== active}
          aria-label={`Install with ${m.label}`}
        >
          <div className="mt-3 text-sm text-muted-foreground">{m.distros}</div>

          <div className="mt-6 space-y-4">
            {m.steps.map((step) => (
              <CommandBlock key={step.command} label={step.label} command={step.command} />
            ))}
          </div>

          {m.note ? (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{m.note}</p>
          ) : null}
        </div>
      ))}

      <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <a
          href={ASSETS[active === "appimage" ? "appImage" : active].url}
          className="inline-flex items-center gap-1.5 text-orange hover:underline"
        >
          <Download className="size-4" />
          Download {method.label} directly
        </a>
        <a
          href={RELEASE_PAGE}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <Terminal className="size-4" />
          All v{VERSION} assets on GitHub
        </a>
      </div>
    </div>
  );
}
