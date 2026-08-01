"use client";

import { motion } from "framer-motion";
import { Download, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FadeUp } from "@/components/fade-up";
import { AnimatedGrid } from "@/components/magicui/animated-grid";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

/* ---- Infinite scrolling clipboard ticker ---- */
const tickerItems = [
  "git push origin main",
  "192.168.1.42",
  "SELECT * FROM users",
  "sk_live_4eC39HqLy…",
  "docker compose up -d",
  "https://api.example.com",
  "export NODE_ENV=prod",
  "ssh deploy@server-01",
  "npm run build",
  "PGPASSWORD=s3cure!",
];

function ClipboardTicker() {
  const doubled = [...tickerItems, ...tickerItems];
  return (
    <div className="relative overflow-hidden py-4">
      <div className="absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent" />
      <div className="absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent" />
      <motion.div
        className="flex gap-3 whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      >
        {doubled.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center rounded-md border border-border/50 bg-card/60 px-3 py-1.5 font-mono text-xs text-muted-foreground/70 backdrop-blur-sm"
          >
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* ---- Floating orbs ---- */
function FloatingOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Large warm orb top-right */}
      <motion.div
        className="absolute -top-32 -right-32 size-96 rounded-full bg-orange/[0.07] blur-[100px]"
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Small orb left */}
      <motion.div
        className="absolute top-1/3 -left-16 size-64 rounded-full bg-orange/[0.04] blur-[80px]"
        animate={{ y: [0, 40, 0], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Center accent */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[500px] rounded-full bg-orange/[0.03] blur-[120px]"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

/* ---- Orbiting ring around the mockup ---- */
function OrbitRing() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <motion.div
        className="absolute size-[110%] rounded-full border border-orange/10"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      >
        {/* Orbiting dot */}
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 size-2 rounded-full bg-orange shadow-[0_0_10px_rgba(233,84,32,0.6)]" />
      </motion.div>
      <motion.div
        className="absolute size-[125%] rounded-full border border-orange/5"
        animate={{ rotate: -360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      >
        <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 size-1.5 rounded-full bg-orange/60 shadow-[0_0_8px_rgba(233,84,32,0.4)]" />
      </motion.div>
    </div>
  );
}

/* ---- Hero ---- */
export function Hero() {
  return (
    <section className="relative flex min-h-[calc(100svh-2rem)] items-center overflow-hidden py-20 sm:py-24 lg:min-h-screen lg:py-32">
      <AnimatedGrid />
      <FloatingOrbs />

      {/* Bottom fade */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />

      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 sm:px-6">
        <div className="flex flex-col gap-10 lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center">
          {/* ---- Copy ---- */}
          <div className="flex flex-col gap-5 sm:gap-6 text-center lg:text-left">
            <FadeUp>
              <motion.div
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="flex justify-center lg:justify-start"
              >
                <Badge
                  variant="outline"
                  className="w-fit border-orange/30 bg-orange/10 text-orange px-3 py-1 text-xs sm:text-sm backdrop-blur-sm"
                >
                  <motion.span
                    className="mr-1.5 inline-block size-1.5 rounded-full bg-orange"
                    animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  100% offline &middot; No telemetry
                </Badge>
              </motion.div>
            </FadeUp>

            <FadeUp delay={0.1}>
              <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Never lose a{" "}
                <span className="inline-block bg-gradient-to-r from-orange via-[#ff7b45] to-orange bg-[length:200%_auto] bg-clip-text text-transparent animate-[gradient-shift_3s_ease_infinite]">
                  copied item again.
                </span>
              </h1>
            </FadeUp>

            <FadeUp delay={0.2}>
              <p className="mx-auto max-w-lg text-base text-muted-foreground leading-relaxed sm:text-lg lg:mx-0">
                A fast clipboard history manager for Linux. Your copies stay on
                your machine — no cloud, no telemetry, no account.
              </p>
            </FadeUp>

            <FadeUp delay={0.3}>
              <div className="flex flex-col gap-3 sm:flex-row">
                <a
                  href="#download"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "group/btn relative h-11 sm:flex-1 gap-2 overflow-hidden px-5 text-sm sm:h-12 sm:px-6 sm:text-base bg-orange text-white hover:bg-orange-hover"
                  )}
                >
                  {/* Shimmer */}
                  <span className="absolute inset-0 -translate-x-full animate-[shimmer_2.5s_ease_infinite] bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                  <Download className="relative size-4 sm:size-5" />
                  <span className="relative">Download for Linux</span>
                </a>
                <a
                  href="https://github.com/0x99M/clipmer"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "h-11 sm:flex-1 gap-2 px-5 text-sm sm:h-12 sm:px-6 sm:text-base border-border hover:bg-surface backdrop-blur-sm"
                  )}
                >
                  <svg className="size-4 sm:size-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
                  View on GitHub
                </a>
              </div>
            </FadeUp>

            <FadeUp delay={0.35}>
              <a
                href="/pro"
                className="group flex w-full items-center gap-2 rounded-lg border border-orange/30 bg-orange/[0.08] hover:bg-orange/15 pl-1.5 pr-4 py-2 text-sm sm:text-base backdrop-blur-sm transition-colors"
              >
                <span className="inline-flex items-center gap-1 rounded-md bg-orange text-white px-2.5 py-1 text-xs font-semibold uppercase tracking-wider shrink-0">
                  <Sparkles className="size-3.5" />
                  $9
                </span>
                <span className="text-orange">Get Clipmer Pro — one payment, forever</span>
                <span className="ml-auto text-orange/60 transition-transform group-hover:translate-x-0.5">&rarr;</span>
              </a>
            </FadeUp>
          </div>

          {/* ---- Mockup with orbit ---- */}
          <FadeUp delay={0.4} className="relative">
            <div className="relative mx-auto w-full max-w-sm sm:max-w-md lg:max-w-none">
              <OrbitRing />

              {/* Pulsing glow */}
              <motion.div
                className="absolute -inset-6 rounded-2xl bg-orange/8 blur-3xl"
                animate={{ opacity: [0.4, 0.7, 0.4], scale: [0.95, 1.02, 0.95] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />

              <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card shadow-2xl shadow-orange/[0.05] backdrop-blur-sm">
                {/* Animated border glow */}
                <div className="absolute inset-0 rounded-xl opacity-50">
                  <motion.div
                    className="absolute inset-[-1px] rounded-xl"
                    style={{
                      background: "conic-gradient(from 0deg, transparent 60%, rgba(233,84,32,0.3) 80%, transparent 100%)",
                    }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  />
                </div>

                <div className="relative rounded-xl bg-card">
                  <div className="flex items-center gap-1.5 border-b border-border px-3 py-2 sm:gap-2 sm:px-4 sm:py-3">
                    <div className="size-2.5 rounded-full bg-[#ff5f57] sm:size-3" />
                    <div className="size-2.5 rounded-full bg-[#febc2e] sm:size-3" />
                    <div className="size-2.5 rounded-full bg-[#28c840] sm:size-3" />
                    <span className="ml-1.5 text-[10px] text-muted-foreground font-mono sm:ml-2 sm:text-xs">
                      Clipmer v3.0.5
                    </span>
                    <motion.div
                      className="ml-auto size-1.5 rounded-full bg-green-500"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  </div>
                  <div className="p-3 space-y-1.5 sm:p-4 sm:space-y-2">
                    <div className="flex items-center gap-2 rounded-lg bg-surface/50 px-2.5 py-1.5 border border-border/50 sm:px-3 sm:py-2">
                      <svg
                        className="size-3.5 text-muted-foreground sm:size-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <span className="text-xs text-muted-foreground sm:text-sm">
                        Search clipboard...
                      </span>
                    </div>
                    {[
                      { text: "npm install clipmer", time: "Just now", folder: "Work" },
                      { text: "https://github.com/0x99M/clipmer", time: "2m ago", folder: null },
                      { text: "export default function App() {", time: "5m ago", folder: null },
                      { text: "E95420", time: "12m ago", folder: null },
                      { text: "ssh user@192.168.1.100", time: "1h ago", folder: "Servers" },
                    ].map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5 + i * 0.1 }}
                        className="flex items-center justify-between rounded-lg px-2.5 py-2 hover:bg-surface/30 transition-colors sm:px-3 sm:py-2.5"
                      >
                        <div className="flex items-center gap-2 min-w-0 sm:gap-3">
                          <span className="text-xs truncate font-mono sm:text-sm">{item.text}</span>
                          {item.folder && (
                            <span className="inline-flex items-center gap-1 rounded-md border border-orange/20 bg-orange/[0.08] px-1.5 py-0.5 text-[9px] sm:text-[10px] text-orange shrink-0">
                              <svg className="size-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                              </svg>
                              {item.folder}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground ml-2 whitespace-nowrap sm:text-xs sm:ml-3">{item.time}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </FadeUp>
        </div>

        {/* ---- Infinite clipboard ticker ---- */}
        <FadeUp delay={0.6}>
          <div className="mt-16 lg:mt-24">
            <ClipboardTicker />
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
