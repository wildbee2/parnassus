# Gradus Counterpoint Studio

Generate, hear, and analyze species counterpoint in a Fux-inspired pedagogical environment.

## Overview

Gradus Counterpoint Studio is a client-side React + TypeScript application for:

- generating species counterpoint with seeded deterministic search
- evaluating counterpoint with rule-based analysis and explanations
- editing scores in a notation-oriented grid
- importing and exporting JSON, MIDI, and printable report data
- browsing built-in examples and rule reference material

The app is intentionally educational. It models a strict, configurable species-counterpoint system rather than a full historical reconstruction.

## Screenshots

Placeholder:

- `docs/screenshots/landing.png`
- `docs/screenshots/generate.png`
- `docs/screenshots/evaluate.png`

## Setup

```bash
npm install
npm run dev
```

## Development

```bash
npm run dev
```

## Tests

```bash
npm run test
npm run test:e2e
```

## Build

```bash
npm run build
```

## Architecture

The project is organized around a shared counterpoint core:

- `src/music/` contains pitch, interval, mode, rhythm, motion, consonance, and cadence helpers
- `src/counterpoint/` defines the score model, evaluator, scoring, rule registry, parser, and suggestion engine
- `src/generator/` contains deterministic cantus-firmus and counterpoint generation logic
- `src/store/` holds app state, settings, recent exercises, and undo/redo history with local persistence
- `src/components/` provides the app shell, notation grid, inspector, and playback controls
- `src/pages/` contains the routed workflows
- `src/workers/` exposes the worker message contract

## Rule Engine

The evaluator uses explicit rule objects with stable IDs and metadata. Rules are grouped by category:

- melody
- harmony
- motion
- dissonance
- rhythm
- cadence
- species
- range
- texture

Violations include:

- severity
- location
- explanation
- suggested fixes where practical

The score is a transparent pedagogical summary, not a historical verdict.

## Generation Algorithm

The generator is deterministic with a numeric seed. It uses a constraint-driven, species-aware search strategy:

1. generate or accept a cantus firmus
2. generate counterpoint voice by voice
3. filter candidates against hard local rules
4. score remaining candidates with style weights
5. evaluate the completed score globally

This is intentionally rule-based rather than ML-driven.

## Limitations

- MusicXML export is a lightweight adapter, not a full engraving pipeline
- playback uses simple Tone.js instruments
- notation editing is grid-based rather than a full drag-and-drop notation editor
- the generation engine is practical and deterministic, but not a full research CSP solver
- the rule system is pedagogical and configurable, not a complete model of Renaissance practice

## Historical Caveat

This application models a pedagogically strict, Fux-inspired species-counterpoint system. Fux's rules are an abstraction of Renaissance practice and should not be treated as a complete description of Palestrina's compositional language.

## Roadmap

- richer VexFlow engraving
- more complete fifth-species rhythm handling
- deeper suspension inference
- MusicXML import
- more nuanced local repair suggestions
- worker-backed long-running search and evaluation
- broader built-in example library

