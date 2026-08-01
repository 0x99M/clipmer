import type { MDXComponents } from "mdx/types";
import { isValidElement, type ReactNode } from "react";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/utils";

/**
 * Required at the project root for @next/mdx with the App Router — the plugin
 * does not work without it. In Next 16 `useMDXComponents` takes no arguments
 * (earlier versions passed in the inherited components).
 */

/** Flatten MDX children to plain text so headings can derive a stable id. */
function toText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(toText).join("");
  if (isValidElement(node)) {
    return toText((node.props as { children?: ReactNode }).children);
  }
  return "";
}

/** Heading that is its own anchor target, with a # that appears on hover. */
function heading(level: 2 | 3 | 4) {
  const Tag = `h${level}` as "h2" | "h3" | "h4";
  const size = {
    2: "text-2xl sm:text-[1.75rem] font-bold mt-14 mb-4 tracking-tight",
    3: "text-xl font-semibold mt-10 mb-3 tracking-tight",
    4: "text-base font-semibold mt-8 mb-2 text-foreground/90",
  }[level];

  function H({ children }: { children?: ReactNode }) {
    const id = slugify(toText(children));
    return (
      <Tag id={id} className={cn("group scroll-mt-24 text-foreground", size)}>
        <a href={`#${id}`} className="no-underline">
          {children}
          <span
            aria-hidden
            className="ml-2 select-none text-orange opacity-0 transition-opacity group-hover:opacity-60"
          >
            #
          </span>
        </a>
      </Tag>
    );
  }
  H.displayName = `MDXH${level}`;
  return H;
}

const components: MDXComponents = {
  h1: ({ children }) => (
    // Posts render their own <h1> in the article shell; a stray one in MDX
    // would be a second H1, so it degrades to an h2.
    <h2 className="mt-14 mb-4 text-2xl font-bold tracking-tight text-foreground">
      {children}
    </h2>
  ),
  h2: heading(2),
  h3: heading(3),
  h4: heading(4),

  p: ({ children }) => (
    <p className="my-5 text-[1.0625rem] leading-[1.75] text-foreground/85">
      {children}
    </p>
  ),

  a: ({ href, children }) => {
    const external = typeof href === "string" && /^https?:\/\//.test(href);
    return (
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="text-orange underline decoration-orange/40 underline-offset-[3px] transition-colors hover:decoration-orange"
      >
        {children}
      </a>
    );
  },

  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,

  ul: ({ children }) => (
    <ul className="my-5 space-y-2 pl-5 text-[1.0625rem] leading-[1.7] text-foreground/85 [&>li]:list-disc [&>li]:marker:text-orange/60">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-5 space-y-2 pl-5 text-[1.0625rem] leading-[1.7] text-foreground/85 [&>li]:list-decimal [&>li]:marker:text-muted-foreground">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-1.5">{children}</li>,

  blockquote: ({ children }) => (
    <blockquote className="my-6 border-l-2 border-orange/50 bg-orange/[0.04] py-1 pl-5 pr-4 [&>p]:text-foreground/75">
      {children}
    </blockquote>
  ),

  hr: () => <hr className="my-12 border-border" />,

  // Inline code. Block code arrives wrapped in <pre>, which resets these.
  code: ({ children, className }) => (
    <code
      className={cn(
        "rounded border border-border/70 bg-surface px-1.5 py-0.5 font-mono text-[0.875em] text-orange",
        // Inside <pre> the wrapper owns the styling, so strip it back.
        "[pre_&]:border-0 [pre_&]:bg-transparent [pre_&]:p-0 [pre_&]:text-[inherit] [pre_&]:text-foreground/90",
        className
      )}
    >
      {children}
    </code>
  ),

  pre: ({ children }) => (
    <pre className="my-6 overflow-x-auto rounded-lg border border-border bg-[#161616] p-4 font-mono text-[0.8125rem] leading-relaxed">
      {children}
    </pre>
  ),

  img: (props) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      alt={props.alt ?? ""}
      className="my-6 w-full rounded-lg border border-border"
    />
  ),
};

export function useMDXComponents(): MDXComponents {
  return components;
}
