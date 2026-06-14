# Vibecoding Video

AI-powered video editor dengan fokus **Vibecoding** — edit video menggunakan bahasa natural, seperti Replit tapi untuk video.

![Vibecoding Video](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

## Fitur

### Fase 1 ✅
- **Shell UI profesional** — layout editor lengkap (media panel, preview, timeline, vibecoding panel)
- **Media import** — drag & drop video, audio, gambar
- **Live preview** — pemutar video dengan kontrol playback
- **Multi-track timeline** — video, audio, text, effects tracks
- **Vibecoding panel** — edit dengan perintah bahasa natural (ID/EN)

### Fase 2 ✅
- **Drag & resize clip** — geser clip, resize kiri/kanan, pindah antar track
- **Snap-to-grid** — toggle snap (tombol Snap / tombol N)
- **Waveform visualization** — waveform otomatis untuk audio & video
- **Keyboard shortcuts** — Space, S, Del, J/K/L, Ctrl+Z/Y, panah
- **Undo/Redo** — riwayat editing hingga 50 langkah
- **Split clip** — belah clip di playhead (S)

### Fase 3 ✅ (Saat ini)
- **Claude API integration** — `/api/vibecoding` dengan Sonnet/Haiku/Opus
- **Context-aware editing** — AI menerima state timeline lengkap
- **Settings panel** — API key, model selection, enable/disable AI
- **Structured actions** — JSON actions dari Claude → diterapkan ke timeline
- **Fallback lokal** — parser regex jika API tidak tersedia

### Fase 4 (Berikutnya)
- FFmpeg.wasm untuk processing di browser
- Effects engine (blur, color grade, transitions)
- Text overlay renderer

### Fase 5 (Berikutnya)
- Export MP4/WebM
- Project save/load (JSON)
- Cloud sync

## Vibecoding Commands

| Perintah | Contoh |
|----------|--------|
| Potong/Cut | `Potong 0:30 sampai 1:15` |
| Fade | `Tambahkan fade in` / `fade out` |
| Speed | `Percepat 2x` / `Perlambat 0.5x` |
| Text | `Tambahkan teks "Subscribe!"` |
| Split | `Split di 0:45` |
| Volume | `Volume 80%` |
| Effects | `Blur` / `Brightness` / `Zoom 1.5x` |
| Export | `Export video` |

## Quick Start

```bash
# Install dependencies
npm install

# Development
npm run dev

# Build
npm run build

# Type check
npm run typecheck
```

Buka [http://localhost:3000](http://localhost:3000)

### AI Setup (Vibecoding)

```bash
# Copy dan isi API key
cp .env.example .env.local
```

Atau masukkan API key di **Settings** (disimpan lokal di browser).

Dapatkan key di [console.anthropic.com](https://console.anthropic.com/)

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **State**: Zustand
- **UI**: Radix UI + custom components
- **Icons**: Lucide React
- **Animation**: Framer Motion

## Struktur Proyek

```
src/
├── app/                  # Next.js pages & layout
├── components/
│   ├── editor/           # Editor shell components
│   │   ├── EditorShell.tsx
│   │   ├── Header.tsx
│   │   ├── MediaPanel.tsx
│   │   ├── PreviewPanel.tsx
│   │   ├── TimelinePanel.tsx
│   │   └── VibecodingPanel.tsx
│   └── ui/               # Reusable UI primitives
├── lib/
│   ├── utils.ts
│   └── vibecoding-engine.ts  # NL command parser
├── store/
│   └── editor-store.ts   # Zustand state
└── types/
    └── editor.ts         # TypeScript types
```

## Repository

https://github.com/fareza777/Vibecoding-Video

## License

MIT