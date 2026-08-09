# Gradus Counterpoint Studio — Codex Build Specification

## 1. Project Goal

Build a polished React + TypeScript web application named **Gradus Counterpoint Studio** for generating and evaluating species counterpoint inspired by Johann Joseph Fux's *Gradus ad Parnassum*.

The application must have exactly two primary modes:

1. **Generate**
   - Generate contrapuntal music in any of the five species.
   - Support **2, 3, or 4 total voices**.
   - One voice may be designated as the **cantus firmus (CF)**.
   - Generate one, two, or three counterpoint voices around the CF.
   - Permit the user to choose the species globally or separately for each generated counterpoint voice.

2. **Evaluate**
   - Let the user enter, edit, paste, import, or play in counterpoint.
   - Support **2, 3, or 4 total voices**.
   - Evaluate melodic writing, pairwise counterpoint, vertical sonorities, cadences, dissonance treatment, rhythmic/species compliance, and multi-voice texture.
   - Return a score plus precise, measure/beat/note-level explanations and suggested corrections.

This should be a serious educational/compositional tool, not a toy random-note generator.

---

# 2. Technology Stack

Use:

- **React 19**
- **TypeScript**
- **Vite**
- **Tailwind CSS**
- **shadcn/ui**
- **Zustand** for app/editor state
- **Tone.js** for playback
- **VexFlow** for notation rendering
- **@tonejs/midi** for MIDI import/export if helpful
- **Vitest** for unit tests
- **React Testing Library** for UI tests
- **Playwright** for end-to-end tests
- **zod** for data validation
- **lucide-react** for icons

The initial version should run fully client-side. Do not require a backend.

Persist user settings and recent exercises to `localStorage`.

Architect the rule engine so it could later be extracted into a backend package if needed.

---

# 3. General Product Philosophy

The program should distinguish between:

- **hard rule violations**
- **soft stylistic warnings**
- **preferences**
- **historically debatable rules**

Do not pretend that every Renaissance contrapuntal practice can be reduced to a single universally accepted rule set.

Call the default ruleset:

> **Fux-Inspired Strict Species Counterpoint**

Provide a settings panel that makes selected controversial or pedagogical rules configurable.

The evaluator should explain *why* a passage is problematic.

Example:

> Parallel perfect fifth between Alto and Tenor, m. 4 beat 1 → m. 5 beat 1.  
> In strict species counterpoint, parallel perfect consonances reduce independence between the voices.

Avoid opaque scoring.

---

# 4. Main Navigation

The application should use a three-part layout:

## Left Sidebar

- New Exercise
- Generate
- Evaluate
- Examples
- Rule Reference
- Settings

## Main Workspace

Notation editor / generation interface.

## Right Inspector

Context-dependent panel containing:

- selected note properties
- generation constraints
- evaluation results
- detected violations
- rule explanations
- suggested fixes

The top toolbar should include:

- New
- Undo
- Redo
- Play / Pause
- Tempo
- Metronome toggle
- Import MIDI
- Export MIDI
- Export JSON
- Import JSON
- Export MusicXML if practical
- Clear

---

# 5. Musical Scope

## 5.1 Voice Count

Support:

- 2 voices
- 3 voices
- 4 voices

In Generate mode, one voice is normally the CF.

Examples:

- 2 voices = CF + 1 contrapuntal voice
- 3 voices = CF + 2 contrapuntal voices
- 4 voices = CF + 3 contrapuntal voices

In Evaluate mode, allow exercises with or without an explicitly designated CF.

If no CF is designated, evaluate the texture as free multi-voice species-style counterpoint.

---

# 6. Species

Implement all five traditional species.

## First Species

**One note against one note.**

Default rules:

- only consonant vertical intervals
- imperfect consonances preferred for variety
- perfect consonances carefully controlled
- no parallel perfect fifths
- no parallel octaves/unisons
- avoid hidden/direct perfect fifths or octaves in outer voices when approached by similar motion and the upper voice leaps
- avoid excessive consecutive thirds or sixths
- avoid voice crossing by default
- avoid voice overlap
- unisons only where stylistically justified, preferably beginning/end depending on voice position
- penultimate-to-final cadence follows standard species conventions
- melodic line should be singable
- avoid augmented/diminished melodic intervals
- avoid repeated notes by default
- avoid large leaps
- compensate large leaps with stepwise motion in the opposite direction
- avoid multiple leaps in the same direction
- prefer contrary and oblique motion
- maintain a clear climax
- avoid melodic tritones where possible

## Second Species

**Two notes against one CF note.**

Additional rules:

- strong beat should normally be consonant
- weak beat may contain passing dissonance
- dissonant weak beat should be approached and left by step, normally in the same direction
- weak-beat consonances may move freely subject to melodic rules
- no illegal parallels between structurally corresponding beats
- treat repeated perfect consonances carefully
- optional half-note opening before the first CF pulse
- cadence adapted for second species

## Third Species

**Four notes against one CF note.**

Additional rules:

- beat 1 normally consonant
- internal notes may use passing and neighbor motion
- dissonance must be justified by recognized melodic patterns
- permit cambiata-like figures only when enabled by configuration
- control repeated notes
- avoid outlines that imply forbidden parallel perfect consonances at structurally accented locations
- cadence adapted for third species
- include configurable support for:
  - passing tones
  - lower neighbors
  - upper neighbors
  - double neighbors
  - cambiata
  - consonant skips

## Fourth Species

**Syncopation / suspensions.**

Core rules:

- preparation must be consonant
- tied note creates a controlled dissonance on the strong beat
- dissonance resolves downward by step by default
- recognize conventional suspension patterns including:
  - 4–3
  - 7–6
  - 9–8
  - 2–3 where contextually appropriate
- distinguish consonant syncopation from true suspension
- allow breaking species where required for cadence
- identify chains of suspensions
- reject unprepared dissonance
- reject unresolved suspension
- reject incorrect resolution direction unless explicitly configured

## Fifth Species

**Florid counterpoint.**

Combine the previous species.

Require:

- rhythmic variety
- correct dissonance treatment
- sensible balance of quarter, half, whole-note activity
- suspensions
- passing tones
- occasional consonant leaps
- no uncontrolled rhythmic clutter
- clear cadence
- melodic independence
- no long sequences of mechanically identical rhythmic patterns

The generator should not merely shuffle species randomly. It should create an intentional phrase with a beginning, development, climax, and cadence.

---

# 7. Multi-Voice Counterpoint Rules

For 3- and 4-voice textures, evaluation must occur on multiple levels.

## 7.1 Pairwise Counterpoint

Evaluate every pair of voices independently.

For voices A, B, C, D evaluate:

- A-B
- A-C
- A-D
- B-C
- B-D
- C-D

Each pair receives:

- interval classification
- motion classification
- parallel-perfect detection
- hidden/direct-perfect detection where relevant
- voice crossing/overlap checks
- rhythmic/species relationship checks

## 7.2 Full Vertical Sonority

At every rhythmic event, calculate the complete pitch-class/pitch stack.

Classify:

- consonant sonority
- controlled dissonance
- unresolved dissonance
- doubled pitch
- doubled tendency tone if tonal mode makes this relevant
- excessive perfect-interval reinforcement

The program should not use modern chord-symbol logic as its primary analytical model.

Do not reject a sonority merely because it is not a common-practice triad.

Analyze it contrapuntally.

## 7.3 Outer Voices

Give special weight to soprano-bass motion.

Check:

- parallel fifths
- parallel octaves
- direct fifths/octaves
- cadence structure
- range
- independence

## 7.4 Voice Independence

Measure and report:

- percentage contrary motion
- percentage similar motion
- percentage parallel motion
- percentage oblique motion
- rhythmic independence
- melodic contour similarity
- repeated interval patterns
- duplicated melodic lines at octave/unison

Flag suspiciously dependent lines.

---

# 8. Modes and Scales

Support modal exercises.

At minimum:

- Ionian
- Dorian
- Phrygian
- Lydian
- Mixolydian
- Aeolian

Also allow:

- Major
- Natural minor

Represent the mode explicitly rather than relying only on a key signature.

Let the user choose:

- tonic/final
- mode
- octave/register for CF
- voice ranges

For cadential behavior, implement mode-aware rules.

Allow configurable musica ficta behavior for cadences, but keep it disabled or conservative by default.

---

# 9. Voice Ranges

Provide defaults approximating singable historical vocal ranges:

```ts
export const DEFAULT_RANGES = {
  soprano: { min: "C4", max: "G5" },
  alto:    { min: "G3", max: "D5" },
  tenor:   { min: "C3", max: "G4" },
  bass:    { min: "E2", max: "C4" },
};
```

These should be configurable.

Never generate notes outside the chosen range.

Also track practical tessitura, not just absolute range.

---

# 10. Cantus Firmus Generator

Provide a separate CF generator.

Inputs:

- mode
- final
- length
- range
- preferred climax position
- max leap
- seed

Default CF length:

- 8–14 whole notes

A generated CF should satisfy:

- begin and end on final
- mostly stepwise motion
- one primary climax
- no excessive repeated notes
- no awkward repeated leaps
- no augmented/diminished melodic intervals
- limited total range
- avoid outlining tritone
- avoid sequences
- avoid excessive monotony
- approach final appropriately
- use a coherent arch-like contour where practical

Allow users to lock or manually edit the CF before generating counterpoint.

---

# 11. Generate Mode UI

## Generation Setup Panel

Fields:

- Number of voices: 2 / 3 / 4
- Cantus Firmus:
  - Generate new
  - Enter manually
  - Import
- Mode
- Final
- Number of CF notes
- Tempo
- Random seed
- Strictness:
  - Pedagogical strict
  - Balanced
  - Historically permissive

For each counterpoint voice:

- position relative to CF:
  - above
  - below
  - auto
- vocal range
- species:
  - First
  - Second
  - Third
  - Fourth
  - Fifth
- optional local constraints

Buttons:

- Generate
- Generate 5 Alternatives
- Regenerate Selected Voice
- Keep Selected Notes and Regenerate Rest

## Generated Result

Show:

- staff notation
- playback
- per-voice mute/solo
- generated-score quality score
- rule compliance summary
- alternative candidates

Users should be able to manually edit generated music.

---

# 12. Generation Algorithm

Do **not** generate counterpoint using naive randomness.

Use a constraint-based search.

Recommended architecture:

1. Convert exercise into a time grid.
2. Generate legal pitch candidates at each event.
3. Eliminate candidates violating hard rules.
4. Score remaining candidates using soft preferences.
5. Use beam search, backtracking, or best-first search.
6. Preserve multiple candidates to avoid greedy dead ends.
7. Perform phrase-level scoring after a full line is generated.
8. For 3–4 voices, generate iteratively but perform global repair/search.

Recommended default:

- beam width: 50–200 depending on texture
- deterministic seeded PRNG
- backtracking when no legal continuation exists

For multi-voice generation:

### Option A — Sequential + Global Validation

1. Generate CF.
2. Generate first counterpoint line.
3. Generate second line while validating against CF and first line.
4. Generate third line while validating against all existing voices.
5. Run a global optimization/repair pass.

### Option B — Simultaneous Search

Implement later if practical.

The initial version may use Option A, but structure the search engine so simultaneous generation could be added.

---

# 13. Candidate Scoring

Each candidate continuation should receive a score.

Example soft costs:

```ts
interface StyleWeights {
  stepMotionReward: number;
  contraryMotionReward: number;
  imperfectConsonanceReward: number;
  repeatedIntervalPenalty: number;
  repeatedPatternPenalty: number;
  largeLeapPenalty: number;
  contourPenalty: number;
  climaxPenalty: number;
  perfectConsonancePenalty: number;
  similarMotionPenalty: number;
  rangeEdgePenalty: number;
}
```

Hard violations should not merely get a large penalty.

They should normally make the candidate invalid.

---

# 14. Rule Engine Architecture

Use explicit, composable rules.

Example:

```ts
export type Severity =
  | "fatal"
  | "error"
  | "warning"
  | "info";

export interface RuleContext {
  score: CounterpointScore;
  voiceIndex?: number;
  otherVoiceIndex?: number;
  eventIndex?: number;
}

export interface RuleViolation {
  ruleId: string;
  severity: Severity;
  message: string;
  explanation: string;
  voiceIds: string[];
  startTick: number;
  endTick?: number;
  noteIds?: string[];
  suggestedFixes?: SuggestedFix[];
}

export interface CounterpointRule {
  id: string;
  name: string;
  category:
    | "melody"
    | "harmony"
    | "motion"
    | "dissonance"
    | "rhythm"
    | "cadence"
    | "species"
    | "range"
    | "texture";
  applies(context: RuleContext): boolean;
  evaluate(context: RuleContext): RuleViolation[];
}
```

Rules should be testable independently.

---

# 15. Core Data Model

Use MIDI numbers internally for pitch calculations.

```ts
export type Species =
  | "first"
  | "second"
  | "third"
  | "fourth"
  | "fifth";

export interface NoteEvent {
  id: string;
  midi: number;
  startTick: number;
  durationTicks: number;
  tiedFromPrevious?: boolean;
  tiedToNext?: boolean;
}

export interface Voice {
  id: string;
  name: string;
  role: "cantus" | "counterpoint";
  species?: Species;
  rangeMinMidi: number;
  rangeMaxMidi: number;
  notes: NoteEvent[];
}

export interface CounterpointScore {
  id: string;
  title: string;
  tonicPitchClass: number;
  mode: ModeName;
  ticksPerWhole: number;
  voices: Voice[];
  tempoBpm: number;
}
```

Create helper abstractions for:

- metric position
- interval
- melodic interval
- motion type
- consonance classification
- dissonance function
- cadence function

---

# 16. Interval System

Implement interval calculations both as:

- diatonic interval
- chromatic semitone interval
- simple interval
- compound interval
- interval class
- quality

The rule engine should distinguish at least:

## Perfect Consonances

- unison
- perfect fifth
- octave
- compound equivalents

## Imperfect Consonances

- minor third
- major third
- minor sixth
- major sixth
- compound equivalents

## Dissonances

- seconds
- sevenths
- tritone
- fourth above the bass in contexts where treated as dissonant
- augmented/diminished intervals as applicable

Do not rely only on pitch-class interval.

Register matters.

---

# 17. Motion Classification

For every pair of voices between adjacent structural events classify:

- contrary
- oblique
- similar
- parallel

Additionally identify:

- parallel perfect fifth
- parallel octave
- parallel unison
- direct/hidden perfect fifth
- direct/hidden octave

Expose these classifications visually in Evaluate mode.

---

# 18. Dissonance Analysis

Every dissonant note should receive a functional label where possible.

Possible labels:

- passing tone
- neighbor tone
- suspension
- consonant preparation
- resolution
- cambiata
- unsupported / illegal dissonance

Example:

```ts
export type DissonanceFunction =
  | "passing"
  | "upper-neighbor"
  | "lower-neighbor"
  | "suspension"
  | "cambiata"
  | "other-controlled"
  | "illegal";
```

For fifth species, infer the most likely role based on:

- metric position
- melodic approach
- melodic departure
- tie status
- vertical interval before/during/after
- bass relationship

---

# 19. Cadence Detection

Implement cadence recognition rather than checking only the final sonority.

Detect:

- final approach
- penultimate sonority
- leading-tone-like inflection when enabled
- contrary motion into final
- modal cadence patterns
- upper/lower voice placement
- fourth-species cadence exception

Return a cadence analysis object.

```ts
interface CadenceAnalysis {
  detected: boolean;
  startTick: number;
  endTick: number;
  quality: "strong" | "acceptable" | "weak" | "invalid";
  explanation: string;
}
```

---

# 20. Evaluate Mode

Users should be able to:

- create notes with mouse
- select duration
- drag notes vertically
- delete notes
- change ties
- paste note names from text
- import MIDI
- load built-in examples

Provide an **Evaluate** button.

Also support optional live evaluation after edits with debounce.

---

# 21. Evaluation Results

Provide:

## Overall Score

0–100.

But always state:

> The numeric score is a pedagogical summary, not a historical or aesthetic verdict.

## Category Scores

- Species compliance
- Melodic quality
- Consonance/dissonance handling
- Voice independence
- Perfect-consonance control
- Cadence
- Range/tessitura
- Multi-voice texture

## Violation Table

Columns:

- Severity
- Measure
- Beat
- Voice(s)
- Rule
- Explanation
- Suggested correction

Clicking a row should highlight the affected notes in the notation.

---

# 22. Evaluation Score Formula

Use a transparent scoring model.

Example:

```ts
score = 100
  - fatalCount * 20
  - errorCount * 7
  - warningCount * 2
  - stylePenalty;
```

Clamp to `[0, 100]`.

Then derive category scores independently.

Do not allow one repeated type of violation to make the score meaningless.

Use diminishing penalties for repeated identical low-level warnings.

Example:

- first occurrence: full penalty
- second: 80%
- third: 60%
- subsequent: 40%

---

# 23. Suggested Fixes

The evaluator should generate possible repairs.

Example:

> Parallel fifth between Soprano and Alto. Suggested alternatives for Soprano note D5:
>
> - C5 — creates a sixth
> - E5 — creates a third
> - B4 — creates contrary motion and a tenth

Suggested fixes should themselves pass local hard-rule validation.

When practical, rank fixes by estimated style improvement.

---

# 24. Visual Analysis

Provide optional overlays.

## Interval Overlay

Display vertical intervals between selected pair of voices.

Example:

`3  6  5  6  8`

## Motion Overlay

Use compact symbols/text:

- C = contrary
- O = oblique
- S = similar
- P = parallel

## Dissonance Overlay

Label notes:

- PT = passing tone
- NT = neighbor tone
- SUS = suspension
- CAM = cambiata
- ? = unsupported dissonance

## Violation Highlighting

Severity presentation should be accessible and not depend solely on color.

Use:

- icon
- underline/outline style
- tooltip
- text label

---

# 25. Rule Reference

Create a searchable in-app reference containing every implemented rule.

Each rule page should include:

- rule name
- category
- severity
- applicable species
- explanation
- short example
- whether configurable
- current setting

Example:

## Parallel Perfect Fifths

**Default:** prohibited

Two voices may not move from one perfect fifth directly to another perfect fifth by similar motion.

Why:

The voices momentarily lose contrapuntal independence.

Applies to:

- First species
- Second species structural beats
- Third species structurally relevant positions
- Fourth species according to suspension context
- Fifth species according to rhythmic context
- Multi-voice pairwise analysis

---

# 26. Configurable Rules

Settings should include toggles/sliders for:

- permit repeated notes
- permit more than 3 consecutive thirds
- permit more than 3 consecutive sixths
- direct perfect consonance strictness
- permit voice crossing
- permit voice overlap
- allow cambiata
- allow accented passing dissonance in fifth species
- strict suspension resolution
- permit melodic minor sixth
- permit octave melodic leap
- climax uniqueness strictness
- cadence strictness
- musica ficta
- fourth-above-bass treatment

Save settings locally.

---

# 27. Notation Editor

The notation editor is central.

Required:

- multiple staves
- treble, alto, tenor, bass clefs as appropriate
- selectable notes
- duration palette
- ties
- playback cursor
- zoom
- horizontal scrolling
- measure/CF-pulse numbering
- keyboard shortcuts

Suggested shortcuts:

- `1` whole
- `2` half
- `4` quarter
- `8` eighth if fifth species supports it
- arrow up/down = transpose selected note diatonically
- shift + arrow = chromatic transpose
- delete/backspace = delete
- space = play/pause
- Ctrl/Cmd+Z = undo
- Ctrl/Cmd+Shift+Z = redo

---

# 28. Text Entry

Provide a simple textual note-entry syntax.

Example:

```text
CF:    D4 E4 F4 A4 G4 F4 E4 D4
CP1:   A4 C5 A4 C5 B4 A4 C5 D5
```

For rhythmic species:

```text
CP1:
A4/2 B4/2 C5/2 D5/2
E5/2 D5/2 C5/2 B4/2
```

Where:

- `/1` = whole
- `/2` = half
- `/4` = quarter

Support ties:

```text
A4/2~ A4/2
```

Add a parser and clear error messages.

---

# 29. Playback

Use Tone.js.

Features:

- play full score
- loop selected region
- per-voice mute
- per-voice solo
- adjustable tempo
- optional metronome
- playback cursor
- count-in toggle

Use simple neutral instrument timbres by default.

Allow different timbres per voice but do not make sound design the focus.

---

# 30. Import / Export

Support:

## JSON

This is the canonical lossless application format.

## MIDI

Import:

- assign MIDI tracks to voices
- quantize to species grid
- warn if quantization is ambiguous

Export:

- one MIDI track per voice

## MusicXML

If practical, implement export in the initial version.

If not, create a clean adapter interface and mark as a phase-2 feature.

---

# 31. Built-In Exercises

Provide at least 12 examples.

At least:

- 2 first-species examples
- 2 second-species examples
- 2 third-species examples
- 2 fourth-species examples
- 2 fifth-species examples
- 1 three-voice example
- 1 four-voice example

Include both:

- good examples
- intentionally flawed examples

The flawed examples should demonstrate:

- parallel fifth
- parallel octave
- hidden octave
- illegal passing dissonance
- unresolved suspension
- excessive melodic leap
- voice crossing
- weak cadence
- repeated perfect consonances
- poor multi-voice independence

---

# 32. Application Pages

Use React Router.

Routes:

```text
/
  landing/dashboard

/generate
/evaluate
/examples
/rules
/settings
```

---

# 33. Landing Page

The landing page should contain:

- title: Gradus Counterpoint Studio
- subtitle:
  "Generate, hear, and analyze species counterpoint."
- two large cards:
  - Generate Counterpoint
  - Evaluate Counterpoint
- recent exercises
- quick-start examples

The aesthetic should feel like a modern scholarly music tool.

Avoid medieval parchment clichés.

Use clean typography, restrained ornament, and a score-centered interface.

---

# 34. Generate Workflow

Example workflow:

1. User opens Generate.
2. Selects 4 voices.
3. Selects D Dorian.
4. Generates a 10-note CF in Tenor.
5. Chooses:
   - Soprano = fifth species
   - Alto = fourth species
   - Bass = first species
6. Clicks Generate.
7. Search engine creates valid candidates.
8. User previews 3 alternatives.
9. User selects one.
10. User manually modifies measure 5.
11. User clicks Evaluate.
12. Violations appear in side panel.

The implementation must support this end-to-end.

---

# 35. Evaluate Workflow

Example:

1. User opens Evaluate.
2. Selects 3 voices.
3. Pastes or imports music.
4. Marks middle voice as CF.
5. Chooses "Second species" for upper line.
6. Chooses "First species" for lower line.
7. Clicks Evaluate.
8. Score is shown.
9. Violations are listed.
10. Clicking "Parallel Fifth" highlights the two notes in question.
11. Suggested fixes are displayed.
12. User applies one suggested fix.
13. Score updates.

---

# 36. Search Engine Design

Create a reusable CSP/search layer.

Suggested interfaces:

```ts
interface SearchState {
  score: CounterpointScore;
  nextVoiceId: string;
  nextTick: number;
  accumulatedScore: number;
}

interface Candidate {
  midi: number;
  durationTicks: number;
  tie?: boolean;
}

interface SearchOptions {
  beamWidth: number;
  maxBacktracks: number;
  seed: number;
  strictness: "strict" | "balanced" | "permissive";
}
```

Search procedure:

```text
initialize beam
for each event position:
    generate candidate notes
    reject hard violations
    score stylistic qualities
    retain top N beam states
if beam becomes empty:
    backtrack / relax only soft constraints
run phrase-level validation
rerank complete solutions
return top K
```

Never silently relax hard rules.

If generation is impossible:

> No valid solution was found under the current constraints.

Then identify likely causes:

- range too narrow
- incompatible voice positions
- overly strict cadence/range combination
- manually locked notes create contradiction

---

# 37. Determinism

Every generation request must support a numeric seed.

Given:

- same CF
- same settings
- same seed
- same software version

the generator should return the same result.

Include the seed in exported JSON.

---

# 38. Performance

Targets on a normal desktop browser:

- 2-voice generation: under ~1 second for typical 8–12 CF notes
- 3-voice generation: a few seconds or less
- 4-voice generation: aim for interactive response

Use Web Workers for expensive generation/evaluation.

Never block the UI during search.

Provide:

- cancel generation
- progress indicator
- current candidate count

Do not fake exact progress percentages if the search space is unknown.

---

# 39. Web Worker Architecture

Move:

- beam search
- global evaluation
- candidate scoring

to:

```text
src/workers/counterpoint.worker.ts
```

Messages:

```ts
type WorkerRequest =
  | { type: "generate"; payload: GenerateRequest }
  | { type: "evaluate"; payload: EvaluateRequest }
  | { type: "cancel"; requestId: string };

type WorkerResponse =
  | { type: "progress"; requestId: string; payload: ProgressData }
  | { type: "generated"; requestId: string; payload: GeneratedResult }
  | { type: "evaluated"; requestId: string; payload: EvaluationResult }
  | { type: "error"; requestId: string; message: string };
```

---

# 40. Folder Structure

Use approximately:

```text
src/
  app/
    App.tsx
    router.tsx

  components/
    layout/
    notation/
    editor/
    generation/
    evaluation/
    rules/
    playback/

  pages/
    LandingPage.tsx
    GeneratePage.tsx
    EvaluatePage.tsx
    ExamplesPage.tsx
    RulesPage.tsx
    SettingsPage.tsx

  music/
    pitch.ts
    interval.ts
    mode.ts
    rhythm.ts
    motion.ts
    cadence.ts
    consonance.ts
    dissonance.ts

  counterpoint/
    model.ts
    rules/
      melodic/
      harmonic/
      motion/
      species/
      cadence/
      texture/
    evaluator.ts
    scoring.ts
    suggestions.ts

  generator/
    cantusGenerator.ts
    candidateGenerator.ts
    beamSearch.ts
    voiceGenerator.ts
    multiVoiceGenerator.ts
    phraseScoring.ts
    seededRandom.ts

  store/
    useAppStore.ts

  importExport/
    json.ts
    midi.ts
    musicxml.ts

  workers/
    counterpoint.worker.ts

  examples/
    builtInExamples.ts

  tests/
```

---

# 41. Important Rule Implementations

At minimum implement and test all rules below.

## Melodic Rules

- remain inside range
- remain inside practical tessitura where possible
- prefer stepwise motion
- no augmented melodic interval
- no diminished melodic interval by default
- no melodic tritone
- limit large leaps
- compensate large leap
- avoid repeated leaps in same direction
- avoid excessive repeated notes
- avoid excessive monotonic contour
- avoid sequence-like repetition
- climax should generally be unique
- do not place climax too early or too late where possible

## Vertical Rules

- classify consonance/dissonance
- no parallel fifth
- no parallel octave
- no parallel unison
- direct perfect fifth check
- direct octave check
- control repeated perfect consonances
- handle perfect fourth relative to bass
- voice crossing
- voice overlap

## Species Rules

- first: all structural verticals consonant
- second: strong beats consonant; weak dissonance only as passing motion
- third: controlled passing/neighbor/cambiata patterns
- fourth: preparation-suspension-resolution
- fifth: controlled combination of all species

## Cadence Rules

- final consonance
- valid penultimate approach
- suitable contrary/oblique motion
- mode-aware final
- fourth species cadence exception

## Texture Rules

- excessive parallel motion
- duplicated contours
- octave doubling of complete lines
- excessive rhythmic synchronization in florid textures
- poor spacing between adjacent voices
- voice-order instability

---

# 42. Historical/Rule Caveat UI

Include a small persistent informational note in the Rule Reference:

> This application models a pedagogically strict, Fux-inspired species-counterpoint system. Fux's rules are an abstraction of Renaissance practice and should not be treated as a complete description of Palestrina's compositional language.

This is important.

---

# 43. Testing Requirements

Use unit tests heavily.

At least 100 meaningful rule-engine tests.

## Required Test Categories

### Interval

- major/minor/perfect intervals
- compound intervals
- inversion where relevant
- pitch ordering

### Motion

- contrary
- similar
- oblique
- parallel
- parallel fifth
- parallel octave
- hidden fifth
- hidden octave

### Species

- legal first species
- illegal first species dissonance
- legal second-species passing tone
- illegal second-species accented dissonance
- legal third-species neighbor
- illegal third-species leap into dissonance
- legal 4–3 suspension
- illegal unprepared suspension
- illegal upward suspension resolution
- legal fifth-species mixed passage

### Multi-Voice

- pairwise parallel hidden inside otherwise consonant 4-part sonority
- outer-voice direct octave
- legal suspension against multiple voices
- voice crossing
- spacing violation

### Generation

- deterministic output by seed
- all generated notes inside ranges
- no fatal violations in strict mode
- cadence valid
- generated CF valid
- generated first species valid
- generated second species valid
- generated third species valid
- generated fourth species valid
- generated fifth species valid
- 3-voice generation produces zero fatal violations
- 4-voice generation produces zero fatal violations

---

# 44. Golden Test Examples

Create hand-authored known-good and known-bad passages.

Store them as JSON fixtures.

Example:

```text
tests/fixtures/
  first_species_good_01.json
  first_species_parallel_fifth.json
  second_species_good_passing.json
  second_species_bad_accented_dissonance.json
  fourth_species_good_43.json
  fourth_species_bad_unresolved.json
  three_voice_good_01.json
  four_voice_parallel_hidden_pair.json
```

Golden tests should assert exact rule IDs where practical.

---

# 45. Rule IDs

Use stable IDs.

Examples:

```text
MEL_RANGE
MEL_AUGMENTED_LEAP
MEL_TRITONE
MEL_LEAP_RECOVERY
MEL_REPEATED_NOTES
MEL_CLIMAX
HAR_PARALLEL_5
HAR_PARALLEL_8
HAR_PARALLEL_1
HAR_DIRECT_5
HAR_DIRECT_8
HAR_VOICE_CROSSING
HAR_VOICE_OVERLAP
SP1_DISSONANCE
SP2_ACCENTED_DISSONANCE
SP2_BAD_PASSING
SP3_BAD_DISSONANCE
SP4_UNPREPARED_SUSPENSION
SP4_UNRESOLVED_SUSPENSION
SP4_BAD_RESOLUTION
SP5_BAD_DISSONANCE
CAD_FINAL
CAD_PENULTIMATE
TEX_DUPLICATED_LINE
TEX_EXCESSIVE_PARALLEL_MOTION
```

Do not make UI text depend on parsing IDs.

---

# 46. Rule Metadata

Each rule should expose metadata:

```ts
interface RuleMetadata {
  id: string;
  title: string;
  summary: string;
  detailedExplanation: string;
  species: Species[] | "all";
  defaultSeverity: Severity;
  configurable: boolean;
}
```

The Rule Reference page should be generated from the same metadata used by the evaluator.

---

# 47. Suggested Fix Engine

Implement local repairs.

For every pitch-related violation:

1. determine editable note(s)
2. generate nearby candidate notes
3. test them against local rules
4. estimate resulting score delta
5. return top 3 suggestions

Interface:

```ts
interface SuggestedFix {
  description: string;
  noteChanges: {
    noteId: string;
    oldMidi: number;
    newMidi: number;
  }[];
  estimatedScoreDelta: number;
}
```

Provide "Apply Fix" with undo support.

---

# 48. Undo / Redo

Use command-style history or snapshot history.

Every operation should be reversible:

- add note
- remove note
- move note
- change duration
- add/remove tie
- apply suggested fix
- regenerate selected voice

---

# 49. Accessibility

Requirements:

- keyboard-operable interface
- ARIA labels
- visible focus
- no color-only error distinction
- screen-reader-readable violation list
- scalable notation where practical

---

# 50. Error Handling

Show human-readable messages.

Examples:

### Impossible Generation

> No strict solution was found. Try widening the Alto range or changing the locked note in CF measure 6.

### MIDI Import

> Track 2 contains rhythms that do not fit the selected second-species grid. Choose a quantization strategy.

### Invalid Text Input

> `H4` is not a recognized pitch name. Did you mean `B4`?

---

# 51. Development Sequence

Implement in this order.

## Phase 1 — Core Music Theory

- pitch
- interval
- mode
- rhythm
- motion
- consonance
- tests

## Phase 2 — Data Model

- score
- voices
- notes
- serialization
- tests

## Phase 3 — First Species Evaluator

- melodic rules
- vertical rules
- cadence
- UI evaluation list

## Phase 4 — First Species Generator

- candidate generation
- seeded search
- beam search
- CF generator

## Phase 5 — Species 2–4

Implement each evaluator before its generator.

## Phase 6 — Fifth Species

- mixed rhythm evaluator
- dissonance-role inference
- generator

## Phase 7 — Multi-Voice

- pairwise analysis
- global sonority analysis
- outer-voice weighting
- 3/4 voice generation

## Phase 8 — Notation Editor

- multi-staff
- note editing
- ties
- playback cursor

## Phase 9 — Playback and I/O

- Tone.js
- JSON
- MIDI
- optional MusicXML

## Phase 10 — Polish

- examples
- rule reference
- settings
- accessibility
- E2E tests

---

# 52. Acceptance Criteria

The project is not complete until all of the following work.

## Generate

- user can generate 2 voices in all five species
- user can generate 3 voices
- user can generate 4 voices
- user can assign different species to different contrapuntal voices
- user can regenerate one voice while locking others
- user can edit generated notes
- user can play generated music
- user can generate alternatives
- seeded generation is deterministic

## Evaluate

- user can evaluate 2, 3, and 4 voices
- violations link to exact affected notes
- all voice pairs are evaluated
- full vertical sonority is evaluated
- species-specific dissonance treatment works
- suspensions are identified
- cadence quality is reported
- category scores are displayed
- suggested fixes can be applied
- edits can be undone

## Editor

- multiple staves render correctly
- note durations are editable
- ties are editable
- playback works
- voice mute/solo works
- JSON import/export works
- MIDI export works

## Quality

- no fatal violations in strict generated output
- at least 100 rule tests
- golden fixtures
- responsive UI
- no long UI freezes

---

# 53. Initial Seed Examples

Include several canonical simple cantus examples generated internally.

Example D Dorian CF:

```text
D4 F4 E4 G4 F4 A4 G4 F4 E4 D4
```

Do not assume this single example is universally ideal; it is simply a development fixture.

Create additional fixtures in:

- C Ionian
- D Dorian
- E Phrygian
- F Lydian
- G Mixolydian
- A Aeolian

---

# 54. Strictness Profiles

Create presets.

## Pedagogical Strict

- maximum Fux-like restriction
- direct perfects tightly controlled
- voice crossing disabled
- repeated notes discouraged/prohibited according to species
- strict suspension resolution
- conservative dissonance handling

## Balanced

- preserves species pedagogy
- softens some melodic preferences
- limited historically plausible exceptions

## Historically Permissive

- more exceptions
- but never allows obvious uncontrolled parallel fifths/octaves by default
- clearly mark which rules are relaxed

The active rule profile must be visible in the evaluation report.

---

# 55. Explainability

Every violation must answer:

1. **What happened?**
2. **Where did it happen?**
3. **Why does the rule matter?**
4. **How could it be improved?**

Example:

> **Parallel octave — Soprano/Bass**  
> m. 6 beat 1 → m. 7 beat 1  
> Both voices move upward while maintaining an octave. In strict species counterpoint, parallel octaves weaken the independence of the lines. Consider moving the soprano by step in the opposite direction or retaining one voice to create oblique motion.

---

# 56. Evaluation Report Export

Allow report export as JSON and printable HTML.

Include:

- title
- date
- ruleset
- overall score
- category scores
- violations
- warnings
- cadence analysis
- motion statistics
- interval statistics
- species analysis

Do not add PDF generation in the first implementation unless easy.

---

# 57. Statistics Panel

For each voice:

- pitch range
- tessitura
- percent stepwise motion
- largest leap
- climax pitch
- climax position
- repeated-note count

For each voice pair:

- contrary-motion %
- oblique-motion %
- similar-motion %
- parallel-motion %
- perfect fifth count
- octave count
- parallel fifth violations
- parallel octave violations
- dissonance count

For full texture:

- average active voices
- controlled dissonance count
- illegal dissonance count
- cadence quality

---

# 58. UI Styling

Use a modern light theme by default.

Suggested feel:

- scholarly
- calm
- precise
- spacious
- score-first

Use:

- serif display font for title only if easily available
- clean sans-serif UI typography
- subtle staff-paper visual references
- modest borders
- strong spacing
- no skeuomorphic parchment
- no unnecessary animations

Dark mode is optional but desirable.

---

# 59. Empty States

Generate:

> Choose a cantus firmus, species, and number of voices to begin.

Evaluate:

> Enter, paste, or import counterpoint to analyze it.

Violations:

> No rule violations detected under the current ruleset.

Do not say "perfect counterpoint."

---

# 60. Future Architecture Hooks

Design interfaces so these could be added later without rewriting the core:

- imitation
- canon
- invertible counterpoint
- free counterpoint
- Renaissance-style probabilistic model
- Palestrina corpus comparison
- machine-learning ranking
- teacher/student exercise assignments
- cloud accounts
- saved libraries
- MusicXML import
- keyboard/MIDI live input

Do not implement these now unless trivial.

---

# 61. Non-Goals for Version 1

Do not attempt:

- full harmonic Roman-numeral analysis
- figured bass realization
- tonal common-practice counterpoint
- orchestration
- DAW functionality
- neural-network generation
- LLM-based generation
- automatic Palestrina-style composition beyond species pedagogy

The generator should be rule/search based.

---

# 62. README Requirements

Create a comprehensive `README.md` with:

- project overview
- screenshots placeholders
- setup
- development
- tests
- architecture
- rule-engine explanation
- generation algorithm
- limitations
- historical caveat
- roadmap

Commands should be:

```bash
npm install
npm run dev
npm run test
npm run test:e2e
npm run build
```

---

# 63. Code Quality Requirements

- TypeScript strict mode
- avoid `any`
- small pure functions for music theory
- no duplicated rule logic
- rule engine separated from UI
- generation engine separated from rendering
- deterministic tests
- comments explain musical reasoning, not obvious syntax
- use immutable updates where practical
- run ESLint and formatting
- no console errors

---

# 64. Codex Execution Instruction

You are Codex implementing this application.

Work iteratively, but produce a runnable application rather than a mockup.

Prioritize correctness of the counterpoint engine over decorative UI.

When a historically ambiguous rule is encountered:

1. implement the conservative pedagogical interpretation,
2. make it configurable when practical,
3. document the choice in the Rule Reference.

Do not substitute placeholder logic for the rule engine.

Do not call an LLM to decide whether counterpoint is valid.

Every evaluation result must be reproducible from explicit local rules.

Every generated result must be reproducible from the seed and settings.

Before considering the application complete:

1. run the unit tests,
2. run the production build,
3. fix all TypeScript errors,
4. verify the main Generate workflow,
5. verify the main Evaluate workflow,
6. verify 2-, 3-, and 4-voice behavior,
7. verify all five species,
8. verify playback,
9. verify JSON round-tripping,
10. verify rule highlighting and suggested fixes.

---

# 65. Minimum Viable Demonstration

A successful first full demonstration should show:

### Example A — Generation

- D Dorian
- 10-note CF
- 2 voices
- first species
- generate 3 alternatives
- play one
- evaluate it
- zero fatal violations

### Example B — Detection

Load a first-species example containing one deliberate parallel fifth.

The UI must:

- detect it
- name the two voices
- identify the two note pairs
- highlight them
- explain the rule
- propose at least one legal local fix

### Example C — Suspension

Load a fourth-species exercise.

The UI must distinguish:

- preparation
- dissonant suspension
- stepwise resolution

and identify a 4–3 or 7–6 suspension.

### Example D — Four Voices

Generate:

- CF in Tenor
- Soprano in fifth species
- Alto in fourth species
- Bass in first species

The engine must evaluate all six voice pairs and the complete texture.

---

# 66. Definition of Done

The application is done when it can credibly function as a digital species-counterpoint tutor:

- it can construct musically plausible exercises,
- it can reject structurally invalid counterpoint,
- it explains its reasoning,
- it works from two through four voices,
- it handles all five species,
- it is deterministic and testable,
- and its rule system is visible rather than opaque.

The guiding principle is:

> **Teach the user how the voices behave, not merely whether the score passes.**
