"use client";

import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import {
  ArrowRight,
  Cloud,
  Film,
  Layers,
  MessageSquareText,
  Sparkles,
  Users,
  Wand2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  }),
};

const features = [
  {
    icon: MessageSquareText,
    title: "Vibecoding",
    desc: "Ketik perintah natural — potong, fade, teks, speed — AI menerjemahkan ke aksi timeline.",
    span: "col-span-1 md:col-span-2",
    accent: "from-cyan/20 to-transparent",
  },
  {
    icon: Layers,
    title: "Multi-track Timeline",
    desc: "Video, audio, teks, efek. Drag, resize, snap, split, undo/redo.",
    span: "col-span-1",
    accent: "from-sky-500/15 to-transparent",
  },
  {
    icon: Film,
    title: "Live Preview",
    desc: "Efek real-time: blur, brightness, zoom, overlay teks sebelum export.",
    span: "col-span-1",
    accent: "from-emerald-500/15 to-transparent",
  },
  {
    icon: Zap,
    title: "Export FFmpeg",
    desc: "Render MP4/WebM/MOV di browser. Efek & audio mix terbake.",
    span: "col-span-1 md:col-span-2",
    accent: "from-cyan/15 to-transparent",
  },
  {
    icon: Cloud,
    title: "Cloud Sync",
    desc: "Proyek .vibe.json + media ke Supabase. Kolaborasi dengan presence & pull updates.",
    span: "col-span-1",
    accent: "from-violet-500/10 to-transparent",
  },
];

const stats = [
  { value: "4K", label: "Export siap tayang" },
  { value: "ID/EN", label: "Prompt natural language" },
  { value: "Cloud", label: "Sync proyek & media" },
  { value: "0", label: "Install desktop" },
];

const workflows = [
  {
    icon: Film,
    title: "Drop media dan mulai kasar",
    desc: "Import video, audio, atau gambar lalu susun timeline dasar dalam hitungan menit.",
  },
  {
    icon: MessageSquareText,
    title: "Ketik instruksi seperti editor manusia",
    desc: 'Gunakan prompt seperti "potong tengah", "tambah fade in", atau "buat intro 5 detik".',
  },
  {
    icon: Wand2,
    title: "Polish dan export final",
    desc: "Rapikan efek, overlay teks, mix audio, lalu render final langsung dari browser.",
  },
];

function EditorMockup() {
  return (
    <div className="relative w-full aspect-[16/10] rounded-2xl glass-panel-strong overflow-hidden preview-grid">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan/5 via-transparent to-transparent" />
      <div className="flex h-9 items-center gap-2 border-b border-white/5 px-4 bg-black/30">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
        </div>
        <span className="ml-2 font-mono text-[10px] text-muted-foreground">
          vibecoding-demo.vibe
        </span>
      </div>
      <div className="flex h-[calc(100%-2.25rem)]">
        <div className="w-[18%] border-r border-white/5 p-2 space-y-2">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-8 rounded-md bg-white/5 border border-white/5"
            />
          ))}
        </div>
        <div className="flex-1 flex flex-col">
          <div className="flex-1 m-3 rounded-lg border border-cyan/20 bg-black/40 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-cyan/10 to-transparent" />
            <Film className="h-10 w-10 text-cyan/40" />
            <div className="absolute bottom-3 left-3 right-3 h-1 rounded-full bg-white/10">
              <div className="h-full w-[42%] rounded-full bg-cyan/60 glow-accent-sm" />
            </div>
          </div>
          <div className="h-[28%] border-t border-white/5 p-2 space-y-1.5">
            <div className="h-3 w-full rounded bg-track-video/30 border border-track-video/20" />
            <div className="h-3 w-[70%] ml-8 rounded bg-track-audio/30 border border-track-audio/20" />
            <div className="h-3 w-[45%] ml-16 rounded bg-track-text/30 border border-track-text/20" />
          </div>
        </div>
        <div className="w-[22%] border-l border-white/5 p-2">
          <div className="rounded-lg border border-cyan/15 bg-cyan/5 p-2 mb-2">
            <p className="font-mono text-[9px] text-cyan leading-relaxed">
              &gt; Tambahkan fade in 2 detik
            </p>
          </div>
          <div className="space-y-1.5">
            {[1, 2].map((n) => (
              <div key={n} className="h-6 rounded bg-white/5" />
            ))}
          </div>
        </div>
      </div>
      <div className="absolute -right-6 -bottom-6 h-32 w-32 rounded-full bg-cyan/20 blur-3xl pointer-events-none" />
    </div>
  );
}

export function LandingPage() {
  const reduceMotion = useReducedMotion();

  const motionProps = reduceMotion
    ? {}
    : { initial: "hidden", animate: "visible", viewport: { once: true } };

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden">
      <div className="fixed inset-0 mesh-hero pointer-events-none" />
      <div className="fixed inset-0 landing-grid-lines pointer-events-none" />
      <div className="fixed inset-0 grain-overlay pointer-events-none z-50 opacity-60" />

      <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan/10 border border-cyan/20 glow-accent-sm transition-transform group-hover:scale-105">
            <Film className="h-5 w-5 text-cyan" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight">Vibecoding Video</p>
            <p className="text-[11px] text-muted-foreground font-mono">v0.7 · Fase 7</p>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="https://github.com/fareza777/Vibecoding-Video"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            GitHub
          </Link>
          <Button asChild variant="default" size="sm" className="glow-accent">
            <Link href="/editor">
              Buka Editor
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </nav>

      <section className="relative z-10 mx-auto max-w-6xl px-6 pt-8 pb-24 md:pt-16 md:pb-32">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 items-center">
          <div>
            <motion.div
              custom={0}
              variants={fadeUp}
              {...motionProps}
              className="inline-flex items-center gap-2 rounded-full border border-cyan/20 bg-cyan/5 px-3 py-1.5 mb-6"
            >
              <Sparkles className="h-3.5 w-3.5 text-cyan" />
              <span className="text-xs font-medium text-cyan">
                AI-powered · Browser-native
              </span>
            </motion.div>

            <motion.h1
              custom={1}
              variants={fadeUp}
              {...motionProps}
              className="text-4xl sm:text-5xl md:text-[3.4rem] font-semibold leading-[1.08] tracking-tight"
            >
              Edit video seperti{" "}
              <span className="text-gradient">ngobrol</span>
              <br />
              dengan mesin.
            </motion.h1>

            <motion.p
              custom={2}
              variants={fadeUp}
              {...motionProps}
              className="mt-6 max-w-lg text-base md:text-lg text-muted-foreground leading-relaxed"
            >
              Timeline profesional, live preview, export FFmpeg di browser, dan{" "}
              <strong className="text-foreground font-medium">Vibecoding</strong>{" "}
              — cukup ketik &ldquo;potong 0:30&rdquo; atau &ldquo;tambah fade in&rdquo;.
            </motion.p>

            <motion.p
              custom={2.5}
              variants={fadeUp}
              {...motionProps}
              className="mt-4 max-w-lg text-sm text-muted-foreground/90"
            >
              Cocok untuk draft Shorts, cutdown webinar, podcast clips, dan konten sosial yang perlu cepat jadi.
            </motion.p>

            <motion.div
              custom={3}
              variants={fadeUp}
              {...motionProps}
              className="mt-8 flex flex-wrap items-center gap-4"
            >
              <Button asChild size="lg" className="glow-accent h-12 px-7 text-base">
                <Link href="/editor">
                  <Wand2 className="h-4 w-4" />
                  Mulai Editing
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 px-6 text-base border-white/10">
                <Link href="#fitur">Lihat Fitur</Link>
              </Button>
            </motion.div>

            <motion.div
              custom={4}
              variants={fadeUp}
              {...motionProps}
              className="mt-10 flex flex-wrap gap-6 text-sm text-muted-foreground"
            >
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4 text-cyan/70" />
                Kolaborasi cloud
              </span>
              <span className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-cyan/70" />
                Tanpa install desktop
              </span>
            </motion.div>
          </div>

          <motion.div
            custom={2}
            variants={fadeUp}
            {...motionProps}
            className="relative lg:pl-4"
          >
            <div className="absolute -inset-4 rounded-3xl bg-cyan/5 blur-2xl" />
            <EditorMockup />
          </motion.div>
        </div>
      </section>

      <section className="relative z-10 border-y border-white/5 bg-surface/50">
        <div className="mx-auto max-w-6xl px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="text-center md:text-left"
            >
              <p className="text-3xl md:text-4xl font-semibold text-gradient-warm tabular-nums">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="fitur" className="relative z-10 mx-auto max-w-6xl px-6 py-24 md:py-32">
        <motion.div
          custom={0}
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="max-w-2xl mb-14"
        >
          <p className="font-mono text-xs text-cyan uppercase tracking-widest mb-3">
            Capability stack
          </p>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Semua yang dibutuhkan kreator modern
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Dari import media hingga export final — dengan AI di sisi kanan timeline Anda.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {features.map((feat, i) => (
            <motion.div
              key={feat.title}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className={`${feat.span} group rounded-2xl glass-panel p-6 md:p-7 transition-colors hover:border-cyan/20`}
            >
              <div
                className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${feat.accent} border border-white/5 mb-5`}
              >
                <feat.icon className="h-5 w-5 text-cyan" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feat.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feat.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-24 md:pb-28">
        <div className="mb-10 max-w-2xl">
          <p className="font-mono text-xs text-cyan uppercase tracking-widest mb-3">
            Workflow
          </p>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Dari ide ke video final dalam 3 langkah
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Fokus pada hasil: cepat masuk, cepat edit, cepat tayang.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {workflows.map((item, i) => (
            <motion.div
              key={item.title}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="rounded-2xl glass-panel p-6"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan/15 bg-cyan/5 mb-5">
                <item.icon className="h-5 w-5 text-cyan" />
              </div>
              <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-cyan/80 mb-2">
                Langkah 0{i + 1}
              </p>
              <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-24 md:pb-32">
        <motion.div
          custom={0}
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl glass-panel-strong px-8 py-14 md:px-14 md:py-16 text-center"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-cyan/10 via-transparent to-cyan/5" />
          <div className="relative">
            <h2 className="text-2xl md:text-4xl font-semibold tracking-tight max-w-xl mx-auto">
              Siap lihat tampilan editor live?
            </h2>
            <p className="mt-4 text-muted-foreground max-w-md mx-auto">
              Deploy ke Vercel dalam hitungan menit. Buka /editor dan mulai proyek pertama Anda.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Button asChild size="lg" className="glow-accent h-12 px-8">
                <Link href="/editor">
                  Launch Editor
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </section>

      <footer className="relative z-10 border-t border-white/5 py-8">
        <div className="mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Vibecoding Video · MIT</p>
          <div className="flex gap-6">
            <Link href="/editor" className="hover:text-cyan transition-colors">
              Editor
            </Link>
            <Link
              href="https://github.com/fareza777/Vibecoding-Video"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-cyan transition-colors"
            >
              Repository
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
