"use client";

import { motion } from "framer-motion";
import { FadeUp } from "@/components/fade-up";
import { cn } from "@/lib/utils";

/* ---- Step 1: Copy anything ---- */
function CopyScene() {
  const lines = [
    { text: "const app = express();", highlight: false },
    { text: 'app.get("/api", handler);', highlight: true },
    { text: "app.listen(3000);", highlight: false },
  ];

  return (
    <div className="space-y-3">
      {/* Code editor */}
      <div className="rounded-lg border border-border/60 bg-[#161616] overflow-hidden">
        <div className="flex items-center gap-1.5 border-b border-border/40 px-3 py-2">
          <div className="size-2 rounded-full bg-[#ff5f57]" />
          <div className="size-2 rounded-full bg-[#febc2e]" />
          <div className="size-2 rounded-full bg-[#28c840]" />
          <span className="ml-2 text-[10px] text-muted-foreground/50 font-mono">server.js</span>
        </div>
        <div className="p-3 space-y-1">
          {lines.map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0.4 }}
              whileInView={line.highlight ? { opacity: 1 } : { opacity: 0.4 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className={cn(
                "rounded px-2 py-0.5 font-mono text-[11px] sm:text-xs",
                line.highlight && "bg-orange/10 border border-orange/20 text-orange"
              )}
            >
              {line.text}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Selection + copy action */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.7 }}
        className="flex items-center justify-center gap-2"
      >
        <div className="flex items-center gap-1.5 rounded-md border border-border/60 bg-card px-2.5 py-1.5">
          <kbd className="rounded border border-border/50 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px] text-foreground/60">Ctrl</kbd>
          <span className="text-[9px] text-muted-foreground/40">+</span>
          <kbd className="rounded border border-border/50 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px] text-foreground/60">C</kbd>
        </div>
        <motion.div
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 1, type: "spring", stiffness: 300 }}
          className="rounded-full bg-orange/15 px-2.5 py-1 text-[10px] font-medium text-orange"
        >
          Copied!
        </motion.div>
      </motion.div>

      {/* Clipmer notification */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 1.2 }}
        className="flex items-center gap-2 rounded-lg border border-orange/20 bg-orange/[0.04] px-3 py-2"
      >
        <motion.div
          className="size-1.5 rounded-full bg-orange"
          animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <span className="text-[10px] text-orange font-mono">Saved to Clipmer</span>
        <span className="ml-auto text-[9px] text-muted-foreground/50">Entry #147</span>
      </motion.div>
    </div>
  );
}

/* ---- Step 2: Open & search ---- */
function SearchScene() {
  const results = [
    { text: 'app.get("/api", handler);', time: "Just now", active: true },
    { text: 'fetch("/api/users")', time: "3m ago", active: false },
    { text: "// api endpoint config", time: "1h ago", active: false },
  ];

  return (
    <div className="space-y-3">
      {/* Shortcut trigger */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3 }}
        className="flex items-center justify-center gap-1.5"
      >
        {["Ctrl", "Shift", "D"].map((key) => (
          <motion.kbd
            key={key}
            initial={{ y: 0 }}
            whileInView={{ y: [0, -4, 0] }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 0.3 }}
            className="rounded-md border border-border/60 bg-white/[0.04] px-2.5 py-1 font-mono text-[10px] text-foreground/70 shadow-sm"
          >
            {key}
          </motion.kbd>
        ))}
      </motion.div>

      {/* Clipmer window appearing */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        whileInView={{ opacity: 1, scale: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.6, type: "spring", stiffness: 200, damping: 20 }}
        className="rounded-lg border border-border/60 bg-[#161616] overflow-hidden"
      >
        <div className="flex items-center gap-1.5 border-b border-border/40 px-3 py-2">
          <div className="size-2 rounded-full bg-[#ff5f57]" />
          <div className="size-2 rounded-full bg-[#febc2e]" />
          <div className="size-2 rounded-full bg-[#28c840]" />
          <span className="ml-2 text-[10px] text-muted-foreground/50 font-mono">Clipmer</span>
        </div>
        <div className="p-3 space-y-2">
          {/* Search bar with typing */}
          <div className="flex items-center gap-2 rounded-md border border-border/50 bg-white/[0.03] px-2.5 py-1.5">
            <svg className="size-3 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="font-mono text-[11px]">
              <motion.span
                initial={{ width: 0 }}
                whileInView={{ width: "auto" }}
                viewport={{ once: true }}
                transition={{ delay: 0.9, duration: 0.5 }}
                className="inline-block overflow-hidden whitespace-nowrap text-foreground/80"
              >
                api
              </motion.span>
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.6, repeat: Infinity }}
                className="text-orange"
              >
                |
              </motion.span>
            </span>
          </div>

          {/* Results filtering in */}
          <div className="space-y-1">
            {results.map((r, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 4 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 1.3 + i * 0.1 }}
                className={cn(
                  "flex items-center justify-between rounded-md px-2.5 py-1.5 text-[10px] sm:text-[11px] font-mono",
                  r.active && "bg-orange/10 border border-orange/20"
                )}
              >
                <span className={r.active ? "text-orange" : "text-foreground/50"}>{r.text}</span>
                <span className="text-muted-foreground/40 ml-2">{r.time}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ---- Step 3: Press Enter, pasted ---- */
function PasteScene() {
  return (
    <div className="space-y-3">
      {/* Enter key press */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3 }}
        className="flex justify-center"
      >
        <motion.kbd
          whileInView={{ scale: [1, 0.9, 1] }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.2 }}
          className="rounded-lg border border-orange/30 bg-orange/10 px-5 py-2 font-mono text-xs text-orange shadow-[0_0_15px_rgba(233,84,32,0.15)]"
        >
          Enter &#8629;
        </motion.kbd>
      </motion.div>

      {/* Animated flow line */}
      <div className="flex items-center justify-center gap-3">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: "4rem" }}
          viewport={{ once: true }}
          transition={{ delay: 0.7, duration: 0.4 }}
          className="h-px bg-gradient-to-r from-transparent to-orange/40"
        />
        <motion.div
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.9, type: "spring", stiffness: 300 }}
          className="flex items-center gap-1 rounded-full bg-orange/15 px-2.5 py-1"
        >
          <svg className="size-3 text-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          <span className="text-[9px] font-medium text-orange">auto-paste</span>
        </motion.div>
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: "4rem" }}
          viewport={{ once: true }}
          transition={{ delay: 0.7, duration: 0.4 }}
          className="h-px bg-gradient-to-l from-transparent to-orange/40"
        />
      </div>

      {/* Target app receiving paste */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 1.1 }}
        className="rounded-lg border border-border/60 bg-[#161616] overflow-hidden"
      >
        <div className="flex items-center gap-1.5 border-b border-border/40 px-3 py-2">
          <div className="size-2 rounded-full bg-[#ff5f57]" />
          <div className="size-2 rounded-full bg-[#febc2e]" />
          <div className="size-2 rounded-full bg-[#28c840]" />
          <span className="ml-2 text-[10px] text-muted-foreground/50 font-mono">Terminal</span>
        </div>
        <div className="p-3 space-y-1">
          <div className="text-[11px] font-mono text-foreground/40">
            <span className="text-green-500">~$</span> vim server.js
          </div>
          <div className="text-[11px] font-mono">
            <span className="text-green-500">~$</span>{" "}
            <motion.span
              initial={{ width: 0 }}
              whileInView={{ width: "auto" }}
              viewport={{ once: true }}
              transition={{ delay: 1.4, duration: 0.6 }}
              className="inline-block overflow-hidden whitespace-nowrap text-orange"
            >
              app.get(&quot;/api&quot;, handler);
            </motion.span>
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.6, repeat: Infinity }}
              className="text-foreground/60"
            >
              _
            </motion.span>
          </div>
        </div>
      </motion.div>

      {/* Success */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 2 }}
        className="flex justify-center"
      >
        <div className="flex items-center gap-1.5 rounded-full bg-green-500/10 border border-green-500/20 px-3 py-1">
          <svg className="size-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-[10px] font-medium text-green-500">Pasted</span>
        </div>
      </motion.div>
    </div>
  );
}

/* ---- Config ---- */
const steps = [
  {
    number: "1",
    title: "Copy like you always do",
    subtitle: "Nothing to learn",
    description: "Clipmer runs in your tray and watches the system clipboard. Every Ctrl+C is saved locally — text, code, snippets. You don't change your workflow.",
    scene: CopyScene,
  },
  {
    number: "2",
    title: "Ctrl+Shift+D, type what you remember",
    subtitle: "One shortcut, full history",
    description: "Clipmer pops up instantly. Start typing any word you remember from the copy — it filters as you type. Search content or notes.",
    scene: SearchScene,
  },
  {
    number: "3",
    title: "Enter pastes it",
    subtitle: "Back where you were",
    description: "Clipmer disappears and the text lands in the app you came from. No alt-tab, no reformat, no rewrite. You're back in flow.",
    scene: PasteScene,
  },
];

/* ---- Section ---- */
export function HowItWorks() {
  return (
    <section className="relative py-24 lg:py-32" id="how-it-works">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <FadeUp>
          <div className="text-center mb-16 lg:mb-24">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Three keystrokes:{" "}
              <span className="text-orange">Ctrl+C, Ctrl+Shift+D, Enter.</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Install it once. You&apos;ll forget it&apos;s there — until the day you need a copy from an hour ago.
            </p>
          </div>
        </FadeUp>

        <div className="relative space-y-16 lg:space-y-0">
          {steps.map((step, i) => (
            <div
              key={step.number}
              className="relative lg:grid lg:grid-cols-[1fr_1fr] lg:gap-12 lg:py-12"
            >
              {/* Text */}
              <FadeUp delay={0.1} className={cn(i % 2 !== 0 && "lg:order-2")}>
                <div className="mb-6 lg:mb-0">
                  <span className="font-mono text-sm text-orange/50">{String(i + 1).padStart(2, "0")}</span>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wider text-orange/70 mb-2">{step.subtitle}</p>
                  <h3 className="text-2xl font-bold tracking-tight mb-3">{step.title}</h3>
                  <p className="text-base text-muted-foreground leading-relaxed max-w-md">{step.description}</p>
                </div>
              </FadeUp>

              {/* Scene */}
              <FadeUp delay={0.3} className={cn(i % 2 !== 0 && "lg:order-1")}>
                <div className="rounded-xl border border-border bg-card p-4 sm:p-6 transition-all duration-300 hover:border-orange/20 hover:shadow-lg hover:shadow-orange/[0.03]">
                  <step.scene />
                </div>
              </FadeUp>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
