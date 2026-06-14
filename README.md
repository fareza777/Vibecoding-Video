# Vibecoding Video

AI-powered video editor dengan fokus **Vibecoding** — edit video menggunakan bahasa natural, seperti Replit tapi untuk video.

![Vibecoding Video](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

## Fitur

### Fase 1 ✅ (Saat ini)
- **Shell UI profesional** — layout editor lengkap (media panel, preview, timeline, vibecoding panel)
- **Media import** — drag & drop video, audio, gambar
- **Live preview** — pemutar video dengan kontrol playback
- **Multi-track timeline** — video, audio, text, effects tracks
- **Vibecoding panel** — edit dengan perintah bahasa natural (ID/EN)

### Fase 2 (Berikutnya)
- Drag & resize clip di timeline
- Snap-to-grid & ripple edit
- Waveform audio visualization
- Keyboard shortcuts

### Fase 3 (Berikutnya)
- Integrasi Claude API untuk editing AI canggih
- Transcript-based editing
- Scene detection otomatis

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