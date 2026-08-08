import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { Footer } from "@/components/sections/footer";

// The 404 status was already correct — this is not a crawling fix. Without it a
// visitor on a stale or typo'd link landed on the unstyled default with no way
// back into the site.
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-24">
        <p className="font-mono text-sm text-orange">404</p>
        <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          That page isn&apos;t here.
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          It may have moved, or the link may be out of date.
        </p>
        <ul className="mt-8 space-y-3 leading-relaxed">
          <li>
            <Link href="/" className="text-orange hover:underline">
              Clipmer home
            </Link>{" "}
            <span className="text-muted-foreground">
              &mdash; a clipboard manager for Linux that masks secrets
            </span>
          </li>
          <li>
            <Link href="/install" className="text-orange hover:underline">
              Install Clipmer
            </Link>{" "}
            <span className="text-muted-foreground">
              &mdash; one command for Ubuntu, Fedora or any distro
            </span>
          </li>
          <li>
            <Link href="/blog" className="text-orange hover:underline">
              Linux clipboard guides
            </Link>{" "}
            <span className="text-muted-foreground">&mdash; how the clipboard works on Wayland and X11</span>
          </li>
          <li>
            <Link href="/changelog" className="text-orange hover:underline">
              Changelog
            </Link>{" "}
            <span className="text-muted-foreground">&mdash; what shipped in each release</span>
          </li>
        </ul>
      </main>
      <Footer />
    </div>
  );
}
