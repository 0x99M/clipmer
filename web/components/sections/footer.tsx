import Link from "next/link";
import { Bug } from "lucide-react";
import { GitHubIcon } from "@/components/icons";

export function Footer() {
  return (
    <footer className="border-t border-border py-8">
      <div className="mx-auto max-w-5xl px-6">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Clipmer</span>
              <span className="text-sm text-muted-foreground">v3.2.0</span>
            </div>
            <a
              href="https://github.com/0x99M/clipmer"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <GitHubIcon className="size-4" />
              GitHub
            </a>
            <a
              href="https://github.com/0x99M/clipmer/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Bug className="size-4" />
              Report a Bug
            </a>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
            <Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link>
            <Link href="/changelog" className="hover:text-foreground transition-colors">Changelog</Link>
            <Link href="/pro" className="hover:text-foreground transition-colors">Pro</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/refund" className="hover:text-foreground transition-colors">Refunds</Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
            <span>&copy; 0x99M</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
