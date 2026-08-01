"use client";

import { motion } from "framer-motion";
import { FadeUp } from "@/components/fade-up";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Mini mockup components — each simulates a real feature in the app */
/* ------------------------------------------------------------------ */

function ClipboardHistoryMockup() {
  const entries = [
    { text: "const server = express()", time: "Just now", type: "code" },
    { text: "https://api.example.com/v2", time: "30s", type: "link" },
    { text: "Meeting notes from standup", time: "2m", type: "text" },
    { text: "SELECT * FROM users WHERE…", time: "5m", type: "code" },
    { text: "bearer eyJhbGciOiJIUzI1…", time: "8m", type: "text" },
    { text: "192.168.1.42", time: "15m", type: "text" },
  ];

  return (
    <div className="space-y-1">
      {entries.map((entry, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -8 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 + i * 0.07 }}
          className={cn(
            "flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs",
            i === 0 ? "bg-orange/10 border border-orange/20" : "hover:bg-white/[0.03]"
          )}
        >
          <span className={cn("truncate font-mono", i === 0 ? "text-orange" : "text-foreground/80")}>
            {entry.text}
          </span>
          <span className="ml-2 shrink-0 text-muted-foreground/60 text-[10px]">{entry.time}</span>
        </motion.div>
      ))}
      <div className="pt-1 text-center text-[10px] text-muted-foreground/40">
        6 of 200 entries
      </div>
    </div>
  );
}

function FoldersMockup() {
  const folders = [
    { name: "All", active: false },
    { name: "Servers", active: true },
    { name: "Secrets", active: false },
  ];
  const entries = [
    { text: "ssh deploy@prod-server-01", folder: "Servers" },
    { text: "ssh staging@10.0.0.42", folder: "Servers" },
    { text: "kubectl --context=prod get pods", folder: "Servers" },
  ];

  return (
    <div className="space-y-2.5">
      {/* Filter pill */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
        className="inline-flex items-center gap-1.5 rounded-md border border-orange/30 bg-orange/[0.08] px-2 py-1 text-[10px] text-orange"
      >
        <svg className="size-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3z" />
        </svg>
        <span className="font-medium">Servers</span>
        <svg className="size-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </motion.div>

      {/* Dropdown */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.35 }}
        className="rounded-md border border-border/60 bg-[#1f1f1f] p-1 space-y-0.5 max-w-[160px]"
      >
        {folders.map((f) => (
          <div
            key={f.name}
            className={cn(
              "flex items-center gap-1.5 rounded px-1.5 py-1 text-[10px]",
              f.active && "bg-orange/10 text-orange"
            )}
          >
            <span className={cn("size-2", f.active ? "text-orange" : "text-muted-foreground/30")}>
              {f.active ? "✓" : ""}
            </span>
            <span className={cn(!f.active && "text-foreground/70")}>{f.name}</span>
          </div>
        ))}
      </motion.div>

      {/* Filtered entries */}
      <div className="space-y-1 pt-1">
        {entries.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -6 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 + i * 0.08 }}
            className="flex items-center justify-between gap-2 rounded-md border border-border/40 bg-white/[0.02] px-2.5 py-1.5 text-xs"
          >
            <span className="truncate font-mono text-foreground/80 text-[11px]">{item.text}</span>
            <span className="inline-flex items-center gap-1 rounded border border-orange/20 bg-orange/[0.08] px-1 py-0.5 text-[8px] text-orange shrink-0">
              <svg className="size-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
              </svg>
              {item.folder}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function SmartSearchMockup() {
  const results = [
    { text: "git checkout -b feature/auth", match: "auth" },
    { text: "AUTH_SECRET=super_secret", match: "AUTH" },
    { text: "// TODO: fix auth middleware", match: "auth" },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-md border border-border/60 bg-white/[0.03] px-2.5 py-1.5">
        <svg className="size-3 text-muted-foreground/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="text-xs font-mono">
          <span className="text-foreground/80">auth</span>
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            className="text-orange"
          >
            |
          </motion.span>
        </span>
        <div className="ml-auto flex gap-1">
          <span className="rounded bg-orange/15 px-1.5 py-0.5 text-[9px] font-medium text-orange">Content</span>
          <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-muted-foreground/50">Notes</span>
        </div>
      </div>
      <div className="space-y-1">
        {results.map((r, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 + i * 0.1 }}
            className="rounded-md px-2.5 py-1.5 text-xs font-mono text-foreground/70 hover:bg-white/[0.03]"
          >
            {r.text.split(new RegExp(`(${r.match})`, "i")).map((part, j) =>
              part.toLowerCase() === r.match.toLowerCase() ? (
                <span key={j} className="bg-orange/20 text-orange rounded px-0.5">{part}</span>
              ) : (
                <span key={j}>{part}</span>
              )
            )}
          </motion.div>
        ))}
      </div>
      <div className="text-[10px] text-muted-foreground/40 text-center">3 results found</div>
    </div>
  );
}

function AutoPasteMockup() {
  return (
    <div className="space-y-2">
      {/* Clipmer window */}
      <div className="rounded-md border border-border/60 bg-white/[0.02] p-2 space-y-1">
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="size-1.5 rounded-full bg-[#ff5f57]" />
          <div className="size-1.5 rounded-full bg-[#febc2e]" />
          <div className="size-1.5 rounded-full bg-[#28c840]" />
          <span className="ml-1 text-[9px] text-muted-foreground/50">Clipmer</span>
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="rounded bg-orange/10 border border-orange/20 px-2 py-1 text-[10px] font-mono text-orange"
        >
          npm run build
        </motion.div>
        <div className="rounded px-2 py-1 text-[10px] font-mono text-foreground/40">
          cd ~/projects
        </div>
      </div>

      {/* Arrow */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5 }}
        className="flex items-center justify-center gap-2"
      >
        <div className="h-px flex-1 bg-orange/20" />
        <div className="flex items-center gap-1 text-[10px] text-orange">
          <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
          Enter
        </div>
        <div className="h-px flex-1 bg-orange/20" />
      </motion.div>

      {/* Target terminal */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.7 }}
        className="rounded-md border border-border/60 bg-white/[0.02] p-2"
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="size-1.5 rounded-full bg-[#ff5f57]" />
          <div className="size-1.5 rounded-full bg-[#febc2e]" />
          <div className="size-1.5 rounded-full bg-[#28c840]" />
          <span className="ml-1 text-[9px] text-muted-foreground/50">Terminal</span>
        </div>
        <div className="text-[10px] font-mono">
          <span className="text-green-500">~$</span>{" "}
          <motion.span
            initial={{ width: 0 }}
            whileInView={{ width: "auto" }}
            viewport={{ once: true }}
            transition={{ delay: 0.9, duration: 0.4 }}
            className="inline-block overflow-hidden text-orange whitespace-nowrap"
          >
            npm run build
          </motion.span>
        </div>
      </motion.div>
    </div>
  );
}

function KeyboardMockup() {
  const shortcuts = [
    { keys: ["Ctrl", "Shift", "D"], action: "Open Clipmer" },
    { keys: ["\u2191", "\u2193"], action: "Navigate entries" },
    { keys: ["Enter"], action: "Paste selected" },
    { keys: ["Esc"], action: "Close window" },
    { keys: ["Tab"], action: "Switch search mode" },
  ];

  return (
    <div className="space-y-1.5">
      {shortcuts.map((s, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -6 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 + i * 0.08 }}
          className="flex items-center justify-between text-xs"
        >
          <div className="flex gap-1">
            {s.keys.map((key) => (
              <kbd
                key={key}
                className="inline-flex items-center justify-center rounded border border-border/60 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-foreground/70 min-w-[22px]"
              >
                {key}
              </kbd>
            ))}
          </div>
          <span className="text-muted-foreground/60 text-[11px]">{s.action}</span>
        </motion.div>
      ))}
    </div>
  );
}

function MinimalViewMockup() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="relative w-full">
        {/* Full view (faded) */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.25 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="rounded-md border border-border/30 bg-white/[0.02] p-2 space-y-1.5"
        >
          <div className="flex items-center justify-between">
            <div className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] text-muted-foreground/40">All ▾</div>
            <div className="size-3 rounded bg-white/5" />
          </div>
          <div className="h-1.5 w-full rounded bg-white/5" />
          <div className="space-y-1">
            <div className="h-4 rounded bg-white/5" />
            <div className="h-4 rounded bg-white/5" />
            <div className="h-4 rounded bg-white/5" />
          </div>
          <div className="h-3 w-1/2 mx-auto rounded bg-white/5" />
        </motion.div>

        {/* Minimal view (overlaid) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, type: "spring", stiffness: 200, damping: 20 }}
          className="absolute inset-x-2 top-3 rounded-md border border-orange/20 bg-[#1e1e1e] p-2 shadow-xl shadow-black/40 space-y-1"
        >
          <div className="flex items-center gap-1.5 rounded bg-white/[0.04] px-2 py-1">
            <svg className="size-2.5 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-[9px] text-muted-foreground/50">Search…</span>
          </div>
          {["git push origin main", "docker restart app", "export API_KEY=…"].map((t, i) => (
            <div key={i} className={cn(
              "rounded px-2 py-1 text-[9px] font-mono",
              i === 0 ? "bg-orange/10 text-orange" : "text-foreground/60"
            )}>
              {t}
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

function ThemeMockup() {
  const entries = ["npm start", "192.168.1.1", "SELECT * FROM…"];

  return (
    <div className="flex gap-2.5 h-full items-stretch">
      {/* Dark theme */}
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3 }}
        className="flex-1 rounded-md border border-orange/20 bg-[#1e1e1e] p-2 space-y-1"
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex gap-1">
            <div className="size-1.5 rounded-full bg-[#ff5f57]" />
            <div className="size-1.5 rounded-full bg-[#febc2e]" />
            <div className="size-1.5 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex items-center gap-1">
            <div className="size-2 rounded-full bg-orange/80" />
            <span className="text-[8px] text-orange font-medium">Dark</span>
          </div>
        </div>
        <div className="rounded bg-white/[0.04] px-1.5 py-0.5 text-[8px] text-[#888]">Search…</div>
        {entries.map((t, i) => (
          <div key={i} className={cn(
            "rounded px-1.5 py-0.5 text-[8px] font-mono",
            i === 0 ? "bg-orange/10 text-orange" : "text-[#EEEEEC]/70"
          )}>
            {t}
          </div>
        ))}
      </motion.div>

      {/* Light theme */}
      <motion.div
        initial={{ opacity: 0, x: 8 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.45 }}
        className="flex-1 rounded-md border border-[#d0d0d0] bg-[#f7f7f7] p-2 space-y-1"
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex gap-1">
            <div className="size-1.5 rounded-full bg-[#ff5f57]" />
            <div className="size-1.5 rounded-full bg-[#febc2e]" />
            <div className="size-1.5 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex items-center gap-1">
            <div className="size-2 rounded-full border border-[#ccc] bg-[#f7f7f7]" />
            <span className="text-[8px] text-[#555] font-medium">Light</span>
          </div>
        </div>
        <div className="rounded bg-black/[0.04] px-1.5 py-0.5 text-[8px] text-[#999]">Search���</div>
        {entries.map((t, i) => (
          <div key={i} className={cn(
            "rounded px-1.5 py-0.5 text-[8px] font-mono",
            i === 0 ? "bg-orange/10 text-orange" : "text-[#333]/80"
          )}>
            {t}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

function FontSizeMockup() {
  const sizes = [
    { label: "10px", scale: 0.7 },
    { label: "14px", scale: 1 },
    { label: "18px", scale: 1.35 },
  ];

  return (
    <div className="space-y-3">
      {/* Slider */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3 }}
        className="space-y-1.5"
      >
        <div className="flex items-center justify-between text-[9px] text-muted-foreground/50">
          <span>Font Size</span>
          <span className="font-mono text-orange">14px</span>
        </div>
        <div className="relative h-1.5 rounded-full bg-white/[0.06]">
          <motion.div
            initial={{ width: "0%" }}
            whileInView={{ width: "50%" }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="absolute inset-y-0 left-0 rounded-full bg-orange/60"
          />
          <motion.div
            initial={{ left: "0%" }}
            whileInView={{ left: "50%" }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-3 rounded-full border-2 border-orange bg-[#161616]"
          />
        </div>
        <div className="flex justify-between text-[8px] text-muted-foreground/30 font-mono">
          <span>10</span>
          <span>14</span>
          <span>18</span>
        </div>
      </motion.div>

      {/* Preview at different sizes */}
      <div className="space-y-1.5">
        {sizes.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 4 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 + i * 0.12 }}
            className={cn(
              "rounded-md border px-2 py-1.5 font-mono",
              i === 1
                ? "border-orange/20 bg-orange/[0.04]"
                : "border-border/30 bg-white/[0.02]"
            )}
          >
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "truncate",
                  i === 1 ? "text-orange" : "text-foreground/50"
                )}
                style={{ fontSize: `${8 * s.scale}px` }}
              >
                git push origin main
              </span>
              <span className={cn(
                "shrink-0 ml-2 font-mono",
                i === 1 ? "text-orange/60" : "text-muted-foreground/30"
              )} style={{ fontSize: "8px" }}>
                {s.label}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function NotesMockup() {
  const entries = [
    { text: "ssh deploy@prod-01", note: "Production server - US East", hasNote: true },
    { text: "PGPASSWORD=s3cure!x9", note: "Staging DB password", hasNote: true },
    { text: "curl -X POST https://…", note: null, hasNote: false },
  ];

  return (
    <div className="space-y-1.5">
      {entries.map((entry, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 6 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 + i * 0.12 }}
          className="rounded-md border border-border/40 bg-white/[0.02] px-2.5 py-2 space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className={cn(
              "text-[10px] font-mono truncate",
              i === 0 ? "text-orange" : "text-foreground/70"
            )}>
              {entry.text}
            </span>
          </div>
          {entry.hasNote ? (
            <div className="flex items-start gap-1.5">
              <svg className="size-2.5 mt-0.5 shrink-0 text-orange/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span className="text-[9px] text-orange/70 italic">{entry.note}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 opacity-30">
              <svg className="size-2.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-[9px] text-muted-foreground">Add a note…</span>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

function HiddenEntryMockup() {
  const entries = [
    { text: "TODO: refactor auth flow before Friday", hidden: false },
    { text: "PGPASSWORD=s3cure!x9", hidden: true },
    { text: "ssh deploy@prod-01", hidden: false },
  ];

  return (
    <div className="space-y-1.5">
      {entries.map((entry, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 6 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 + i * 0.12 }}
          className="flex items-center gap-2 rounded-md border border-border/40 bg-white/[0.02] px-2.5 py-2"
        >
          {entry.hidden ? (
            <>
              <svg className="size-2.5 shrink-0 text-orange/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-[10px] font-mono tracking-widest text-muted-foreground/70">
                ••••••••••
              </span>
            </>
          ) : (
            <span className="text-[10px] font-mono truncate text-foreground/70">
              {entry.text}
            </span>
          )}
        </motion.div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Feature cards config                                               */
/* ------------------------------------------------------------------ */

const features = [
  {
    title: "Hide what shouldn't be on screen",
    description: "Marking an entry as hidden masks it as ••••••••• in the list — safe to leave open during a screen-share or pair session. Click-to-copy still pastes the real content; search skips hidden entries so they can't be surfaced by accident.",
    mockup: HiddenEntryMockup,
  },
  {
    title: "Add context with notes",
    description: "Attach a note to any entry — label that token as \"staging API key\" so future-you knows what it's for. Notes are fully searchable.",
    mockup: NotesMockup,
  },
  {
    title: "Group with folders",
    description: "Sort SSH commands, API tokens, connection strings into named folders. Pick a folder from the filter pill and the list narrows to just that set — the rest of your history stays out of the way.",
    mockup: FoldersMockup,
  },
  {
    title: "Find anything, instantly",
    description: "Start typing — results filter as you go. Search content or notes, no lag even at 200 entries. If you copied it, you'll find it.",
    mockup: SmartSearchMockup,
  },
  {
    title: "Every copy, saved",
    description: "Ctrl+C is now a permanent record. Text, code, links, snippets — up to 200 entries, deduplicated, still here after reboot.",
    mockup: ClipboardHistoryMockup,
  },
  {
    title: "Paste without switching windows",
    description: "Open Clipmer, pick an entry, press Enter — it's pasted into whatever app you were just in. Works on Wayland. No xdotool hacks.",
    mockup: AutoPasteMockup,
  },
  {
    title: "Mouse never required",
    description: "Open with one shortcut, navigate with arrows, Enter to paste, Esc to dismiss. Tab switches search modes. Your hands stay on the keys.",
    mockup: KeyboardMockup,
  },
  {
    title: "Match your desktop",
    description: "Light or dark. Any accent color. Clipmer should look like it belongs on your machine.",
    mockup: ThemeMockup,
  },
  {
    title: "Your eyes, your font size",
    description: "Slide from 10 to 18px. The whole UI scales proportionally — padding, icons, row heights. Not just the text.",
    mockup: FontSizeMockup,
  },
  {
    title: "Strip it down to just the list",
    description: "Minimal mode hides everything but the entries. Toggle it with one shortcut when you need to focus.",
    mockup: MinimalViewMockup,
  },
];

/* ------------------------------------------------------------------ */
/*  Section                                                            */
/* ------------------------------------------------------------------ */

export function Features() {
  return (
    <section className="relative py-24 lg:py-32" id="features">
      <div className="mx-auto max-w-5xl px-6">
        <FadeUp>
          <div className="text-center mb-20 lg:mb-28">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need.{" "}
              <span className="text-orange">Nothing you don&apos;t.</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
              Your clipboard already handles passwords, API keys, and private
              snippets. A manager for it should take that seriously.
            </p>
          </div>
        </FadeUp>

        <div className="space-y-20 lg:space-y-32">
          {features.map((feature, i) => {
            const isEven = i % 2 === 0;
            return (
              <div
                key={feature.title}
                className={cn(
                  "flex flex-col gap-8 lg:gap-16 lg:items-center",
                  isEven ? "lg:flex-row" : "lg:flex-row-reverse"
                )}
              >
                {/* Text */}
                <FadeUp delay={0.1} className="flex-1 lg:max-w-md">
                  <div className="space-y-4">
                    <div className="inline-flex items-center justify-center rounded-lg bg-orange/10 px-3 py-1">
                      <span className="text-sm font-medium text-orange">{String(i + 1).padStart(2, "0")}</span>
                    </div>
                    <h3 className="text-2xl font-bold tracking-tight lg:text-3xl">
                      {feature.title}
                    </h3>
                    <p className="text-base text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </FadeUp>

                {/* Mockup */}
                <FadeUp delay={0.25} className="flex-1">
                  <div
                    className={cn(
                      "overflow-hidden rounded-xl border border-border bg-card",
                      "transition-all duration-300",
                      "hover:border-orange/20 hover:shadow-xl hover:shadow-orange/[0.04]"
                    )}
                  >
                    <div className="bg-[#161616] p-6 sm:p-8 min-h-[220px]">
                      <feature.mockup />
                    </div>
                  </div>
                </FadeUp>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
