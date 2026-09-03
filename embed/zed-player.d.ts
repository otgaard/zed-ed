// zed-player.d.ts — hand-authored host-facing TypeScript declarations for the
// Zed embed elements (<zed-player>, <zed-player-controls>, <zed-panel>,
// <zed-view>). This file is the npm package's `types` entry and is copied to
// `dist/embed/zed-player.d.ts` at build so a plain-script host can reference
// it by path.
//
// Deliberately self-contained: every type a host can observe is declared here
// (no imports from the Zed source tree). Keep it in lockstep with
// `src/embed/ZedPlayer.svelte.ts` (methods / attributes / events),
// `src/lib/contract/types.ts` (ApiContract), and
// `src/lib/state/project.svelte.ts` (BundleManifest).

// ---------------------------------------------------------------------------
// Shared value types
// ---------------------------------------------------------------------------

/** Chrome selection for a bundle player. */
export type ZedPlayerMode = 'hero' | 'minimal' | 'controls' | 'full';

/** Inline-shader layout (bundle players ignore this). */
export type ZedPlayerView = 'run' | 'code' | 'split' | 'split-swap';

export type ZedPlayerChrome = 'visible' | 'hidden' | 'auto';

/** Loader-overlay override: `auto` hides it only for `hero` mode. */
export type ZedPlayerLoader = 'auto' | 'visible' | 'hidden';

/** Load-progress phases reported by the `zed-loading` event. */
export type ZedLoadPhase = 'downloading' | 'unpacking' | 'compiling' | 'assets';

/** The depth convention a GL context resolved (docs/reversed-depth-buffers.md).
 *  `'reversed'` = a reversed floating-point depth buffer via `EXT_clip_control`
 *  (near = 1.0, far = 0.0); `'classical'` = the historical near = 0.0 / far =
 *  1.0 buffer, used wherever the extension is unavailable or was forced off. */
export type DepthMode = 'classical' | 'reversed';

/** Quality tier (fable-future spec 02 / W2): selects shader `#if ZED_TIER`
 *  paths + `enabledForTiers` chain topology. Resolved once per activation. */
export type QualityTier = 'lite' | 'balanced' | 'high';

/** Input channels accepted by the `input` attribute (space-separated). */
export type ZedInputChannel =
  | 'mouseMove'
  | 'mouseButton'
  | 'wheel'
  | 'keyboard'
  | 'touch'
  | 'pinch'
  | 'orbit';

/** A value accepted / returned by the control surface. */
export type ZedControlValue = number | number[] | string;

// ---------------------------------------------------------------------------
// Bundle manifest (the `zed-ready` / `zed-load` payload)
// ---------------------------------------------------------------------------

export interface ZedControlsFilter {
  include?: string[];
  exclude?: string[];
  labels?: Record<string, string>;
  groups?: Array<{ name: string; controls: string[] }>;
  allowExternalSamplers?: boolean;
}

/** The JSON manifest baked into a published `.zedp` bundle. All optional. */
export interface BundleManifest {
  title?: string;
  description?: string;
  /** v12 legacy single thumbnail path (in-zip). */
  thumbnail?: string;
  /** v13 ordered thumbnail paths (stills + short clips, in-zip). */
  thumbnails?: string[];
  primaryThumbnailIndex?: number;
  /** Poster dim factor 0..1 (default 0.4). */
  posterBrightness?: number;
  /** Poster crossfade interval on hover, ms (default 800). */
  posterCycleIntervalMs?: number;
  /** ISO 8601 export timestamp. */
  createdAt?: string;
  engineSchema?: number;
  keyboardShortcuts?: boolean;
  /** Which decorated uniforms the controls panel exposes. */
  controls?: 'auto' | 'none' | ZedControlsFilter;
  loop?: boolean;
  autoplay?: boolean;
  defaultMode?: ZedPlayerMode;
  /** `'on-demand'` = render-when-dirty (host-driven frames). */
  renderMode?: 'auto' | 'on-demand';
  /**
   * Input-channel declaration (channel names) or `'all'`. On-demand: the
   * opt-in allowlist of channels the player enables (rest stay off). Auto:
   * channels are all on regardless, but a declared `'keyboard'` marks the
   * content as consuming raw keys — the player's transport shortcuts (Space,
   * ←/→) then yield to it (f/m stay). Overridable via the `input` attribute.
   */
  input?: string[] | 'all';
  /**
   * Author-opted adaptive quality: when `adaptive`, the player defends
   * `targetFps` (default 30) by stepping the render scale down under
   * sustained load (never below `minScale`, default 0.5) and back up with
   * hysteresis — every change fires `zed-quality-change`. Host veto:
   * `quality="off"`.
   */
  quality?: { adaptive?: boolean; minScale?: number; targetFps?: number };
  /**
   * Author's default quality tier. Resolution precedence at play time is host
   * `tier` attribute > this > device probe. Absent ⇒ the player uses the device
   * probe. Selects shader `#if ZED_TIER` paths + `enabledForTiers` chain
   * topology. Old players ignore this field.
   */
  tier?: QualityTier;
  /** v15 (additive): force the classical depth convention on every device — the
   *  escape hatch for content with hand-written classical depth maths baked into
   *  its shader text. Absent / `'auto'` ⇒ each device decides (reversed-Z
   *  wherever `EXT_clip_control` exists). There is no `'reversed'` force. */
  depthMode?: 'auto' | 'classical';
  /**
   * Baked scroll-drive: the player maps the element's viewport-scroll
   * progress (0..1) onto the listed targets ('time' | 'camera' |
   * 'uniform:<name>'; default ['time']). Host override: the `drive`
   * attribute (`scroll` force-enables; `off` vetoes) + per-field
   * `scroll-*` attributes. Absent ⇒ off.
   */
  scroll?: {
    target?: string[];
    range?: 'cover' | 'contain' | 'page';
    rangeStart?: number;
    rangeEnd?: number;
    duration?: number;
    azimuth?: number;
    elevation?: number;
    dolly?: number;
    smoothing?: number;
    fps?: number;
  };
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

/** A `// {json}`-decorated uniform's parsed schema. */
export interface ControlSchema {
  name: string;
  /** GLSL type string — 'float' | 'int' | 'bool' | 'vec2'..'vec4' | 'ivec2'.. | 'sampler2D'. */
  type: string;
  min?: number | number[];
  max?: number | number[];
  step?: number | number[];
  isColour?: boolean;
  unit?: number;
  defaultValue: ZedControlValue;
  defaultSrc?: string;
}

/** The resolved live value of a control and which source produced it. */
export interface ResolvedControlValue {
  value: ZedControlValue;
  fromKind: 'static' | 'timeline' | 'script' | 'default';
}

/** One exposed control, as delivered in the `zed-load` event. */
export interface ResolvedControl {
  nodeId: string;
  name: string;
  schema: ControlSchema;
  resolved: ResolvedControlValue | undefined;
  /** Display label override — set for subgraph PROMOTED controls (the
   *  promotion's label / external name). `name` stays the real uniform, so
   *  `setControl(nodeId, name, …)` round-trips unchanged. */
  label?: string;
}

// ---------------------------------------------------------------------------
// Shader diagnostics (`zed-compile`)
// ---------------------------------------------------------------------------

export interface ShaderDiagnostic {
  sourceId: number;
  fileRef: { kind: string; name: string };
  /** 1-based line in the originating buffer. */
  line: number;
  column?: number;
  severity: 'error' | 'warning';
  message: string;
  /** The original log line, for fallback / debugging. */
  raw: string;
  origin?: 'compile' | 'runtime';
}

// ---------------------------------------------------------------------------
// Host API contract (api.json → `player.api`)
// ---------------------------------------------------------------------------

export interface DataChannelDescriptor {
  channel: string;
  shape: 'timeseries' | 'categorical' | 'geo';
  feedMode: 'simulate' | 'host';
  valueRange: [number, number];
  labels: string[];
  seriesCount?: number;
  capacity?: number;
  windowSeconds?: number;
  categoryCount?: number;
  historyRows?: number;
  intervalMsHint?: number;
  description?: string;
}

/**
 * Where a `param` entry routes its read/write. Mirrors
 * `contract/types.ts` `BindingTarget`; kept structural so a host can inspect
 * `entry.target.kind` without importing the source tree.
 */
export type BindingTarget =
  | { kind: 'uniform'; nodeId: string; uniform: string }
  | { kind: 'variant'; nodeId: string }
  | {
      kind: 'material';
      nodeId: string;
      material: string;
      field: 'baseColor' | 'metallic' | 'roughness' | 'emissive';
    }
  | { kind: 'texture'; nodeId: string; material: string; slot: string }
  | { kind: 'camera'; nodeId: string; field: string }
  | { kind: 'light'; nodeId: string; index: number; field: 'intensity' | 'color' }
  | {
      kind: 'nodePose';
      nodeId: string;
      node: string;
      axis?: [number, number, number];
      angleRange?: [number, number];
    };

/**
 * Where an `action` entry routes. Mirrors `contract/types.ts` `ActionTarget`:
 * `preset` replays param sets, `script` invokes a script node's `@action`, and
 * `animation` triggers a glTF clip.
 */
export type ActionTarget =
  | { kind: 'animation'; nodeId: string; clip?: string }
  | { kind: 'preset'; sets: { entry: string; value: number | number[] | string }[] }
  | { kind: 'script'; nodeId: string; action: string };

export interface ApiParamEntry {
  entry: 'param';
  name: string;
  doc?: string;
  signature: ControlSchema;
  /** Enum options (string values validated against this list). */
  options?: string[];
  target: BindingTarget;
  readable?: boolean;
  writable?: boolean;
}

export interface ApiActionEntry {
  entry: 'action';
  name: string;
  doc?: string;
  params: ControlSchema[];
  returns?: string;
  target: ActionTarget;
}

export type ApiEntry = ApiParamEntry | ApiActionEntry;

export interface ApiContract {
  version: 1;
  title?: string;
  entries: ApiEntry[];
  data?: DataChannelDescriptor[];
}

/**
 * The runtime API surface built from the bundle's `api.json`: a `param`
 * entry named `opacity` becomes `setOpacity(value)` / `getOpacity()`; an
 * `action` entry keeps its own name and returns `Promise<unknown>` (actions
 * settle at the next frame boundary — a `script` action resolves with its
 * return value). Method names are contract-defined, so this is a string-keyed
 * record — generate a demo-specific interface with the export dialog's
 * "Download api.d.ts" for full static typing.
 */
export type ZedPlayerApiSurface = Record<string, (...args: unknown[]) => unknown>;

// ---------------------------------------------------------------------------
// Live-data channel handles (`player.data(channelId)`)
// ---------------------------------------------------------------------------

export interface DataSample {
  series: number;
  value: number;
  /** Sample timestamp, seconds. */
  t: number;
}

export interface GeoSample {
  series: number;
  lon: number;
  lat: number;
  alt: number;
  t: number;
}

/**
 * Push handle for one named data channel. Grabbing a handle flips the
 * channel to host feed mode (the built-in simulator stops).
 */
export interface DataChannelHandle {
  /** Timeseries: append one sample. */
  append(s: DataSample): void;
  appendBatch(samples: ReadonlyArray<DataSample>): void;
  clear(): void;
  /** Categorical: replace the current row snapshot. */
  setRow(values: ArrayLike<number>): void;
  /** Categorical: tween factor 0..1 between the last two rows. */
  mix(factor: number): void;
  /** Geo: replace per-series positions. */
  setPositions(samples: ReadonlyArray<GeoSample>): void;
}

// ---------------------------------------------------------------------------
// Event details
// ---------------------------------------------------------------------------

export interface ZedLoadingDetail {
  phase: ZedLoadPhase;
  /** Weighted overall progress 0..1. */
  fraction: number;
  loaded: number;
  total: number;
}

export interface ZedReadyDetail {
  manifest?: BundleManifest | null;
  /** Present (true) on inline-shader players instead of a manifest. */
  inline?: true;
}

export interface ZedLoadDetail {
  manifest?: BundleManifest | null;
  inline?: true;
  controls: ResolvedControl[];
}

export interface ZedErrorDetail {
  message: string;
  /** The bundle `src` URL, or `'inline-shader'`. */
  source: string;
}

export interface ZedPlayDetail {
  playhead: number;
}

export interface ZedCompileDetail {
  ok: boolean;
  diagnostics: ShaderDiagnostic[];
}

export interface ZedControlChangeDetail {
  name: string;
  value: ZedControlValue;
  source: 'api' | 'user';
}

export interface ZedViewChangeDetail {
  view: ZedPlayerView;
}

export interface ZedChromeChangeDetail {
  chrome: ZedPlayerChrome;
  visible: boolean;
}

export interface ZedApiReadyDetail {
  contract: ApiContract | null;
  api: ZedPlayerApiSurface;
}

export interface ZedQualityChangeDetail {
  /** The new adaptive render-scale multiplier (0.25..1). */
  scale: number;
  reason: 'over-budget' | 'headroom';
  /** The measured FPS (EMA) that triggered the step. */
  fps: number;
}

/** Detail of the `zed-scroll` event — one per painted scroll frame. */
export interface ZedScrollDetail {
  /** Applied progress, 0..1 (post range-remap, post smoothing). */
  progress: number;
  /** Driver kinds applied this frame: 'time' | 'camera' | 'uniform'. */
  applied: string[];
}

/** Detail of the `zed-signal` event — one per drained signal, post-frame. */
export interface ZedSignalDetail {
  name: string;
  payload?: unknown;
  /** Who emitted it: a script node, the host (`player.emit`), or the engine. */
  origin: 'script' | 'host' | 'engine';
}

export interface ZedPanelReadyDetail {
  controls: ResolvedControl[];
  dataChannels: DataChannelDescriptor[];
}

export interface ZedPanelErrorDetail {
  message: string;
}

/** Every event a `<zed-player>` dispatches (bubbles + composed). */
export interface ZedPlayerEventMap {
  'zed-loading': CustomEvent<ZedLoadingDetail>;
  'zed-ready': CustomEvent<ZedReadyDetail>;
  'zed-load': CustomEvent<ZedLoadDetail>;
  'zed-claim': CustomEvent<Record<string, never>>;
  'zed-release': CustomEvent<Record<string, never>>;
  'zed-error': CustomEvent<ZedErrorDetail>;
  'zed-play': CustomEvent<ZedPlayDetail>;
  'zed-pause': CustomEvent<ZedPlayDetail>;
  'zed-compile': CustomEvent<ZedCompileDetail>;
  'zed-control-change': CustomEvent<ZedControlChangeDetail>;
  'zed-view-change': CustomEvent<ZedViewChangeDetail>;
  'zed-chrome-change': CustomEvent<ZedChromeChangeDetail>;
  'zed-api-ready': CustomEvent<ZedApiReadyDetail>;
  'zed-quality-change': CustomEvent<ZedQualityChangeDetail>;
  'zed-scroll': CustomEvent<ZedScrollDetail>;
  'zed-signal': CustomEvent<ZedSignalDetail>;
}

export interface ZedPanelEventMap {
  'zed-panel-ready': CustomEvent<ZedPanelReadyDetail>;
  'zed-panel-error': CustomEvent<ZedPanelErrorDetail>;
}

// ---------------------------------------------------------------------------
// <zed-player>
// ---------------------------------------------------------------------------

/**
 * The `<zed-player>` custom element.
 *
 * Attributes (all reactive via `attributeChangedCallback`):
 * - `src` — bundle URL (`.zedp`). Append `?v=<content-hash>` to opt into the
 *   persistent repeat-visit cache. Omit `src` and place a
 *   `<script type="x-shader/x-fragment">` child for inline-shader mode.
 * - `mode` — `hero | minimal | controls | full` (default `minimal`;
 *   `controls` mounts the auto controls panel, `full` the transport toolbar).
 * - `autoplay`, `loop`, `muted` — boolean presence attributes.
 * - `pause-when-offscreen` — set `"false"` to keep rendering offscreen.
 * - `poster` — poster image URL (overrides the bundle thumbnail).
 * - `keyboard` — enable UI keyboard shortcuts. Space / ←/→ yield to the
 *   content when it declares keyboard consumption (`manifest.input` includes
 *   `keyboard`/`all`, or the `input` attribute does); `f`/`m` always act.
 * - `chrome` — `visible | hidden | auto`.
 * - `loader` — `auto | visible | hidden` (loader overlay; `auto` hides it
 *   for `hero` mode only; `zed-loading` events fire regardless).
 * - `orbit` — absent = inherit the baked camera flag; `off`/`false` disable;
 *   any other value force-enables left-drag orbit + wheel dolly.
 * - `render` — `on-demand` for render-when-dirty; `continuous`/`auto` for
 *   the free-running loop (default: the bundle manifest, else auto).
 * - `fps` — on-demand `tick()` step rate (default 60).
 * - `mouse` — `off`/`false` stops cursor-driven frames.
 * - `input` — space-separated channel allowlist (`wheel keyboard …`),
 *   or `all` / `off` (on-demand players default to all-off).
 * - `quality` — `off` vetoes the bundle's adaptive-quality opt-in;
 *   `adaptive` force-enables it (e.g. for un-baked bundles).
 * - `drive` — `scroll` enables scroll-driven progress (`off`/`none` vetoes a
 *   bundle's baked manifest.scroll). Activation-read.
 * - `scroll-target` — list of `time` (default), `camera`, `uniform:<name>`.
 *   Activation-read.
 * - `scroll-range` — `cover` (default) | `contain` | `page`, with optional
 *   insets: `"cover 10% 90%"`. Live.
 * - `scroll-duration` — seconds the time target spans (default: timeline
 *   duration for keyframed demos, else 10). Live.
 * - `scroll-azimuth`, `scroll-elevation` — camera sweep in degrees over the
 *   full range (defaults 180 / 0). Live.
 * - `scroll-dolly` — camera radius factor at progress 1 (default 1). Live.
 * - `scroll-smoothing` — easing time-constant in seconds (default 0 = 1:1;
 *   forced off under prefers-reduced-motion). Live.
 * - `scroll-fps` — max scroll applies/second (trailing apply guaranteed). Live.
 * - `view`, `editable`, `recompile-debounce` — inline-shader mode only.
 * - `aspect-ratio` — reserved; layout is CSS-driven (`style="aspect-ratio:…"`).
 * - `tier` — force the quality tier (`lite` | `balanced` | `high`), both
 *   directions past the device probe (precedence host attr > manifest.tier >
 *   probe). Activation-read (not live; no mid-session tier switch). Invalid
 *   values are ignored with a one-shot console warning.
 * - `depth-mode` — `auto` (default) | `classical`. Forces the classical depth
 *   convention instead of the reversed floating-point depth buffer the engine
 *   uses wherever `EXT_clip_control` exists (precedence host attr >
 *   manifest.depthMode > auto). The escape hatch for content with hand-written
 *   classical depth maths baked into its shader text; there is no `reversed`
 *   force. Activation-read (the mode is fixed for a GL context's lifetime).
 *   Invalid values are ignored with a one-shot console warning.
 */
export declare class ZedPlayer extends HTMLElement {
  /** The applied bundle's manifest (null until `zed-load`). */
  manifest: BundleManifest | null;
  /** Exposed controls (populated on activation). */
  controls: ResolvedControl[];
  /** True while this element holds the single engine claim. */
  isActive: boolean;
  readonly isPlaying: boolean;
  /** The resolved quality tier for this activation (host attr > manifest >
   *  device probe). Reflects the engine default ('high') before activation. */
  readonly tier: QualityTier;
  /** The depth convention resolved for this device — `'reversed'` wherever
   *  `EXT_clip_control` is available and nothing forced the fallback, else
   *  `'classical'`. Read-only and diagnostic: authored semantics are classical
   *  in both modes and the engine translates at the GL boundary. `'classical'`
   *  before activation. */
  readonly depthMode: DepthMode;
  /**
   * The contract-defined host API (see `ZedPlayerApiSurface`), or null when
   * the bundle ships no `api.json`. Available after `zed-api-ready`.
   */
  readonly api: ZedPlayerApiSurface | null;

  /** Claim the engine (if needed) and start playback. */
  play(): Promise<void>;
  pause(): void;
  /** Release the engine claim (another poster on the page may take it). */
  release(): void;
  /** Seek the timeline, clamped to `[0, duration]`. */
  seek(seconds: number): void;

  /** Write one exposed control by uniform name. Fires `zed-control-change`. */
  setControl(name: string, value: ZedControlValue): void;
  getControl(name: string): ZedControlValue | null;

  /**
   * Set (or, when `active` matches the node's authored `enabled`, clear) a
   * transient runtime activation override for a node — never persisted.
   * No-op (with a one-shot console warning) on an unclaimed player.
   */
  setNodeActive(id: string, active: boolean): void;

  /**
   * Route a `mode:'select'` sampler input port to a candidate index at runtime
   * (which converging producer's texture the port samples). Transient — never
   * persisted; the effective index is `override ?? node default ?? 0`, clamped.
   * Pass `index === null` to clear the override (revert to the persisted
   * default). No-op (with a one-shot console warning) on an unclaimed player.
   */
  setInputSelector(nodeId: string, slot: string, index: number | null): void;

  /**
   * Broadcast a host signal onto the engine's frame-scoped bus. Scripts observe
   * it next frame (`ctx.signals.peek/take`); it is echoed back as a `zed-signal`
   * event (origin `'host'`). No-op (with a one-shot console warning) on an
   * unclaimed player.
   */
  emit(name: string, payload?: unknown): void;

  /** Push handle for a named live-data channel (flips it to host feed). */
  data(channelId: string): DataChannelHandle;
  /** The bundle's declared data channels (from `api.json`). */
  dataChannels(): DataChannelDescriptor[];

  /** On-demand mode: paint one frame now. */
  invalidate(): void;
  /** On-demand mode: stage the clock at `seconds` (then `invalidate()`). */
  setTime(seconds: number): void;
  /** On-demand mode: advance by `dt` (default `1/fps`) and paint. */
  tick(dt?: number): void;
  /** On-demand mode: set the `tick()` step rate. */
  setFps(fps: number): void;

  /** Inline-shader mode: replace the fragment source (debounced recompile). */
  setShaderSource(source: string): void;
  getShaderSource(): string;
  /** Inline-shader mode: switch the run/code layout. */
  setView(view: ZedPlayerView): void;
  setChromeVisible(visible: boolean): void;

  addEventListener<K extends keyof ZedPlayerEventMap>(
    type: K,
    listener: (this: ZedPlayer, ev: ZedPlayerEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<K extends keyof ZedPlayerEventMap>(
    type: K,
    listener: (this: ZedPlayer, ev: ZedPlayerEventMap[K]) => void,
    options?: boolean | EventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void;
}

// ---------------------------------------------------------------------------
// <zed-player-controls>
// ---------------------------------------------------------------------------

/**
 * External transport / controls bound to a `<zed-player>` via `for="<id>"`.
 * Dispatches no events of its own; it listens to the target player and
 * writes back through `target.setControl(...)`.
 */
export declare class ZedPlayerControls extends HTMLElement {}

// ---------------------------------------------------------------------------
// <zed-panel> / <zed-view>
// ---------------------------------------------------------------------------

export type ViewBinding =
  | string
  | HTMLCanvasElement
  | { el: string | HTMLCanvasElement; aspect?: number | 'fill' };

export interface PanelMountOpts {
  views: Record<string, ViewBinding>;
}

/**
 * A multi-view dashboard driven by ONE engine: every named view renders into
 * a region of a hidden canvas and fans out to its own host `<canvas>`.
 */
export declare class ZedPanel {
  private constructor();
  static mount(src: string, opts: PanelMountOpts): Promise<ZedPanel>;
  data(channelId: string): DataChannelHandle;
  dataChannels(): DataChannelDescriptor[];
  hostTakeover(channelId: string): boolean;
  /** Broadcast the cross-chart highlight (`null` clears). */
  highlight(series: number | null): void;
  controls(): ResolvedControl[];
  setControl(nodeId: string, name: string, value: ZedControlValue): void;
  destroy(): void;
}

/** Declarative `<zed-panel src="…">` wrapper around `ZedPanel.mount`. */
export declare class ZedPanelElement extends HTMLElement {
  /** Resolves once the panel has mounted (null before connect). */
  ready: Promise<ZedPanel> | null;
  data(channelId: string): DataChannelHandle | null;
  dataChannels(): DataChannelDescriptor[];
  hostTakeover(channelId: string): boolean;
  highlight(series: number | null): void;
  controls(): ResolvedControl[];
  setControl(nodeId: string, name: string, value: ZedControlValue): void;

  addEventListener<K extends keyof ZedPanelEventMap>(
    type: K,
    listener: (this: ZedPanelElement, ev: ZedPanelEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<K extends keyof ZedPanelEventMap>(
    type: K,
    listener: (this: ZedPanelElement, ev: ZedPanelEventMap[K]) => void,
    options?: boolean | EventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void;
}

/** One named view slot inside a `<zed-panel>` (attributes: `view`, `aspect`). */
export declare class ZedViewElement extends HTMLElement {
  readonly view: string;
  readonly aspect: number | 'fill' | undefined;
  getCanvas(): HTMLCanvasElement;
}

/** Idempotently register all four custom elements (importing the module
 *  entry already does this — call only if you bypassed the entry). */
export declare function bootstrapEmbed(): void;

// ---------------------------------------------------------------------------
// Global registrations
// ---------------------------------------------------------------------------

declare global {
  interface HTMLElementTagNameMap {
    'zed-player': ZedPlayer;
    'zed-player-controls': ZedPlayerControls;
    'zed-panel': ZedPanelElement;
    'zed-view': ZedViewElement;
  }

  /** `zed-*` events bubble + composed, so delegated listeners are typed too. */
  interface GlobalEventHandlersEventMap {
    'zed-loading': CustomEvent<ZedLoadingDetail>;
    'zed-ready': CustomEvent<ZedReadyDetail>;
    'zed-load': CustomEvent<ZedLoadDetail>;
    'zed-claim': CustomEvent<Record<string, never>>;
    'zed-release': CustomEvent<Record<string, never>>;
    'zed-error': CustomEvent<ZedErrorDetail>;
    'zed-play': CustomEvent<ZedPlayDetail>;
    'zed-pause': CustomEvent<ZedPlayDetail>;
    'zed-compile': CustomEvent<ZedCompileDetail>;
    'zed-control-change': CustomEvent<ZedControlChangeDetail>;
    'zed-view-change': CustomEvent<ZedViewChangeDetail>;
    'zed-chrome-change': CustomEvent<ZedChromeChangeDetail>;
    'zed-api-ready': CustomEvent<ZedApiReadyDetail>;
    'zed-quality-change': CustomEvent<ZedQualityChangeDetail>;
    'zed-scroll': CustomEvent<ZedScrollDetail>;
    'zed-signal': CustomEvent<ZedSignalDetail>;
    'zed-panel-ready': CustomEvent<ZedPanelReadyDetail>;
    'zed-panel-error': CustomEvent<ZedPanelErrorDetail>;
  }
}
