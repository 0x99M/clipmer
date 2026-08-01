"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Download, Menu, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { GitHubIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/blog", label: "Blog" },
  { href: "/changelog", label: "Changelog" },
  { href: "/pro", label: "Pro" },
];

const GITHUB_URL = "https://github.com/0x99M/clipmer";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The site had no navigation at all before this — every page was reachable
 * only from the footer, which made the blog effectively invisible.
 *
 * Sits transparent over the hero and gains a blurred backdrop plus a hairline
 * once the page scrolls, so it never competes with article text.
 */
export function SiteNav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll(); // correct on load when restoring a scroll position
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Navigating away should never leave the panel hanging open. Adjusting during
  // render rather than in an effect avoids a cascading re-render, and unlike an
  // onClick handler it also covers browser back/forward.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenuOpen(false);
      // Dismissing unmounts the panel, so focus would otherwise fall to <body>
      // and restart the tab order at the top of the document (WCAG 2.4.3).
      toggleRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  // The panel and its toggle are display:none above `md`. Without this, resizing
  // past the breakpoint leaves menuOpen true — which pins the header in its
  // solid state at scroll-top and re-opens the panel on the way back down.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setMenuOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // An open panel needs a solid backdrop even at the top of the page.
  const solid = scrolled || menuOpen;

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-colors duration-200",
        solid
          ? "border-b border-border/60 bg-background/80 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <nav
        aria-label="Main"
        className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6"
      >
        <Link
          href="/"
          className="shrink-0 rounded-md text-[0.9375rem] font-semibold tracking-tight text-foreground transition-opacity hover:opacity-80"
        >
          Clipmer
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-surface/70 font-medium text-foreground"
                    : "text-muted-foreground hover:bg-surface/40 hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            );
          })}

          <span aria-hidden className="mx-2 h-5 w-px bg-border" />

          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Clipmer on GitHub"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "text-muted-foreground hover:bg-surface/40 hover:text-foreground"
            )}
          >
            <GitHubIcon className="size-[18px]" />
          </a>

          <Link
            href="/#download"
            aria-label="Download Clipmer for Linux"
            title="Download for Linux"
            className={cn(
              buttonVariants({ size: "icon" }),
              "ml-1 bg-orange text-white hover:bg-orange-hover"
            )}
          >
            <Download className="size-4" />
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          ref={toggleRef}
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          className="-mr-2 rounded-md p-2 text-muted-foreground transition-colors hover:bg-surface/40 hover:text-foreground md:hidden"
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {/* Mobile panel. Rendered only when open so its links stay out of the
          tab order while collapsed. */}
      {menuOpen ? (
        <div
          id="mobile-nav"
          className="border-t border-border/60 bg-background/95 backdrop-blur-md md:hidden"
          // Closing on click covers what the pathname comparison cannot: the
          // Download CTA below is a hash link, and usePathname() excludes the
          // hash, so navigating to /#download would otherwise leave this panel
          // pinned over the very section it just scrolled to.
          onClick={() => setMenuOpen(false)}
        >
          <div className="mx-auto max-w-7xl space-y-1 px-4 py-4 sm:px-6">
            {LINKS.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "block rounded-md px-3 py-2.5 text-[0.9375rem] transition-colors",
                    active
                      ? "bg-surface/70 font-medium text-foreground"
                      : "text-muted-foreground hover:bg-surface/40 hover:text-foreground"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}

            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-md px-3 py-2.5 text-[0.9375rem] text-muted-foreground transition-colors hover:bg-surface/40 hover:text-foreground"
            >
              <GitHubIcon className="size-4" />
              GitHub
            </a>

            <Link
              href="/#download"
              className={cn(
                buttonVariants({ size: "lg" }),
                "mt-3 w-full gap-2 bg-orange text-white hover:bg-orange-hover"
              )}
            >
              <Download className="size-4" />
              Download for Linux
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
