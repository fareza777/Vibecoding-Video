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

### Fase 3 ✅
- **AI Vibecoding** — context-aware editing dengan state timeline lengkap
- **Settings panel** — API key, model selection, enable/disable AI
- **Structured actions** — JSON actions → diterapkan ke timeline
- **Fallback lokal** — parser regex jika API tidak tersedia

### Fase 4 ✅
- **MiniMax provider** — model default `MiniMax-M3` via OpenAI-compatible API
- **Effects engine** — fade, blur, brightness, contrast, saturation, zoom, speed di preview
- **Text overlay renderer** — teks tampil real-time di preview
- **FFmpeg.wasm export** — export MP4/WebM/MOV langsung dari browser

### Fase 5 ✅ (Saat ini)
- **Save/Load proyek** — format `.vibe.json` dengan struktur timeline lengkap
- **Auto-save** — setiap 30 detik ke localStorage + media ke IndexedDB
- **Recent projects** — daftar proyek terakhir di dialog Open
- **Multi-clip export** — trim per segment lalu concat dengan resolusi 720p/1080p/4K
- **Shortcuts** — Ctrl+S save, Ctrl+O open

### Fase 6 (Berikutnya)
- Full timeline render dengan effects baked-in
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
| Save | `Ctrl+S` atau tombol Save |
| Open | `Ctrl+O` atau tombol Open |

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

### AI Setup (MiniMax Vibecoding)

```bash
# Copy dan isi API key
cp .env.example .env.local
# MINIMAX_API_KEY=your-key
```

Atau masukkan API key di **Settings** (disimpan lokal di browser).

- Provider: [MiniMax](https://platform.minimax.io/)
- Model default: **MiniMax-M3**

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
│   │   ├── OpenProjectDialog.tsx
│   │   └── VibecodingPanel.tsx
│   └── ui/               # Reusable UI primitives
├── hooks/
│   ├── use-auto-save.ts
│   └── use-project-bootstrap.ts
├── lib/
│   ├── utils.ts
│   ├── project-persistence.ts
│   ├── media-storage.ts
│   └── vibecoding-engine.ts
├── store/
│   └── editor-store.ts   # Zustand state
└── types/
    └── editor.ts         # TypeScript types
```

## Repository

https://github.com/fareza777/Vibecoding-Video

## License

MIT