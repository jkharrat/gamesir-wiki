/**
 * Vector diagram library for the GameSir wiki.
 *
 * Everything here is original line art, drawn from primitives so it themes
 * with the rest of the site: shapes take their colours from CSS custom
 * properties rather than baked hex values, which is also why the diagrams are
 * inlined into the pages instead of loaded as images. No GameSir photography,
 * renders or marketing assets are reproduced.
 *
 * The controller views are schematics, not scale drawings. They show which
 * controls exist on a model and where they sit relative to each other; they do
 * not claim to reproduce its exact contours. Which controls get drawn comes
 * from data/controllers.json — the same source as the specification tables —
 * plus the small LAYOUT table below for the handful of facts that the data
 * records only in prose.
 */

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/* -------------------------------------------------------------- primitives */

const rect = (x, y, w, h, r, cls, extra = "") =>
  `<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"${extra}/>`;

const circle = (cx, cy, r, cls, extra = "") =>
  `<circle class="${cls}" cx="${cx}" cy="${cy}" r="${r}"${extra}/>`;

const path = (d, cls, extra = "") => `<path class="${cls}" d="${d}"${extra}/>`;

const text = (x, y, s, cls = "d-label", extra = "") =>
  `<text class="${cls}" x="${x}" y="${y}"${extra}>${esc(s)}</text>`;

/** Rounded plus sign, drawn as one path so the D-pad has no internal seams. */
const plusPath = (cx, cy, arm, width) => {
  const h = width / 2;
  return (
    `M ${cx - h} ${cy - arm} H ${cx + h} V ${cy - h} H ${cx + arm} V ${cy + h} ` +
    `H ${cx + h} V ${cy + arm} H ${cx - h} V ${cy + h} H ${cx - arm} V ${cy - h} H ${cx - h} Z`
  );
};

/** A control the reader can hover, focus or read from the legend. */
const hotspot = ({ id, label, desc }, inner) =>
  `<g class="d-hot" data-part="${esc(id)}" tabindex="0" role="img" aria-label="${esc(
    `${label}. ${desc}`
  )}"><title>${esc(label)}</title>${inner}</g>`;

/** Wraps a finished drawing. `label` names the whole figure for assistive tech. */
const svg = (viewBox, body, { label = null, cls = "" } = {}) =>
  `<svg class="diagram ${cls}" viewBox="${viewBox}" ${
    label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true" focusable="false"'
  } xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

/* ------------------------------------------------------------------- icons */

/**
 * 24 x 24 stroke icons, sized and coloured by CSS. Used to give specification
 * rows, table headings and platform lists a glyph, so a block of figures can
 * be scanned by shape before it is read.
 */
const ICONS = {
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  tag: '<path d="M11.6 3H4v7.6l9.4 9.4 7.6-7.6L11.6 3z"/><circle cx="8" cy="8" r="1.5"/>',
  weight: '<path d="M8.2 7a3.8 3.8 0 0 1 7.6 0"/><path d="M6.6 7h10.8l2.6 13.5H4L6.6 7z"/>',
  ruler: '<rect x="2.5" y="8.5" width="19" height="7" rx="1.6"/><path d="M7 8.5v3.2M11 8.5v4.4M15 8.5v3.2M19 8.5v4.4"/>',
  gamepad:
    '<path d="M7.6 5.5h8.8a5.6 5.6 0 0 1 5.5 6.6l-1 5.2a3 3 0 0 1-5.4 1.2l-1.2-1.6H9.7l-1.2 1.6a3 3 0 0 1-5.4-1.2l-1-5.2A5.6 5.6 0 0 1 7.6 5.5z"/><path d="M8.4 10.4H5.6M7 9v2.8"/><circle cx="16.4" cy="9.8" r="1.15"/><circle cx="18.8" cy="12.6" r="1.15"/>',
  app: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9h18"/><path d="M6.6 6.5h.01M9.4 6.5h.01"/>',
  stick: '<circle cx="12" cy="7.4" r="3.6"/><path d="M12 11v4.4"/><ellipse cx="12" cy="18" rx="6.6" ry="3"/>',
  chip: '<rect x="7" y="7" width="10" height="10" rx="2"/><path d="M10 3.2v3.8M14 3.2v3.8M10 17v3.8M14 17v3.8M3.2 10H7M3.2 14H7M17 10h3.8M17 14h3.8"/>',
  steps: '<path d="M3 20.5h4.4V16h4.4v-4.4h4.4V7.2H21"/>',
  target:
    '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.1"/><path d="M12 1.6v3M12 19.4v3M1.6 12h3M19.4 12h3"/>',
  trigger: '<path d="M4.6 4.8c5.4.4 9.2 4.2 9.2 9.4v5.4"/><path d="M11 19.6h6.6"/><path d="M16.6 7.2l3.4 3.2-3.4 3.2"/>',
  dpad: '<path d="M9.4 3.4h5.2v6h6v5.2h-6v6H9.4v-6h-6V9.4h6z"/>',
  buttons:
    '<circle cx="12" cy="5.6" r="2.3"/><circle cx="12" cy="18.4" r="2.3"/><circle cx="5.6" cy="12" r="2.3"/><circle cx="18.4" cy="12" r="2.3"/>',
  paddle: '<rect x="8.4" y="2.8" width="7.2" height="14.4" rx="3.6" transform="rotate(-11 12 10)"/><path d="M6.6 20.6h10.8"/>',
  bumper: '<path d="M2.8 15.4C4.4 9.6 7.8 6.6 12 6.6s7.6 3 9.2 8.8"/><rect x="7" y="13" width="10" height="5.4" rx="2.7"/>',
  usb: '<rect x="7.6" y="4" width="8.8" height="9.4" rx="2.6"/><path d="M12 13.4v7.2M10.2 4V2.4M13.8 4V2.4"/>',
  bolt: '<path d="M13.6 2.4 5.2 13.6h5.4L9.6 21.6 18.8 10h-5.6z"/>',
  wifi: '<path d="M3.8 9.4a12.2 12.2 0 0 1 16.4 0M7.2 13a7.6 7.6 0 0 1 9.6 0"/><circle cx="12" cy="17.6" r="1.6"/>',
  bluetooth: '<path d="M8 7.2 16 17l-4 3.4V3.6L16 7 8 16.8"/>',
  cable: '<path d="M3.6 20.4c4.2 0 5.2-3.2 5.2-6.4S9.8 7.6 14 7.6h6.4"/><path d="M17.4 4.6l3 3-3 3"/>',
  headset:
    '<path d="M4 14.4V12a8 8 0 0 1 16 0v2.4"/><rect x="2" y="13.4" width="4.6" height="7.2" rx="2.1"/><rect x="17.4" y="13.4" width="4.6" height="7.2" rx="2.1"/>',
  gyro:
    '<circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="9" ry="4"/><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(60 12 12)"/>',
  rumble:
    '<rect x="8.6" y="6.8" width="6.8" height="10.4" rx="3.4"/><path d="M4.8 8.4C3.4 10 3.4 14 4.8 15.6M19.2 8.4c1.4 1.6 1.4 5.6 0 7.2M2 5.8C.7 8.6.7 15.4 2 18.2M22 5.8c1.3 2.8 1.3 9.6 0 12.4"/>',
  battery: '<rect x="2.5" y="7" width="16" height="10" rx="2.4"/><path d="M21 10.6v2.8"/><path d="M6 10.2v3.6M9.6 10.2v3.6"/>',
  plate: '<rect x="2.6" y="6" width="14.4" height="12.4" rx="2.6"/><path d="M6.8 6V4.6a1 1 0 0 1 1-1h12.6a1 1 0 0 1 1 1v11.4a1 1 0 0 1-1 1H19"/>',
  shield: '<path d="M12 2.5 4.5 5.4v6.2c0 4.9 3.1 8.4 7.5 9.9 4.4-1.5 7.5-5 7.5-9.9V5.4L12 2.5z"/><path d="M8.8 12l2.4 2.4 4-4.4"/>',
  led:
    '<circle cx="12" cy="12" r="3.2"/><path d="M12 4V1.9M12 22.1V20M4 12H1.9M22.1 12H20M6.4 6.4 4.9 4.9M19.1 19.1l-1.5-1.5M17.6 6.4l1.5-1.5M4.9 19.1l1.5-1.5"/>',
  monitor: '<rect x="2.5" y="4" width="19" height="12.6" rx="2.2"/><path d="M8.6 20.6h6.8M12 16.6v4"/>',
  console: '<rect x="3.4" y="3.4" width="17.2" height="17.2" rx="3.4"/><circle cx="12" cy="12" r="4.6"/>',
  handheld:
    '<rect x="7.4" y="3.6" width="9.2" height="16.8" rx="1.6"/><rect x="2.6" y="3.6" width="4.8" height="16.8" rx="2.2"/><rect x="16.6" y="3.6" width="4.8" height="16.8" rx="2.2"/>',
  phone: '<rect x="6" y="2.5" width="12" height="19" rx="2.6"/><path d="M10.4 18.8h3.2"/>',
  store: '<rect x="3" y="3.4" width="18" height="17.2" rx="3.2"/><path d="M9.6 8.4v7.2l6-3.6-6-3.6z"/>',
  window: '<rect x="3" y="4" width="18" height="16" rx="2.4"/><path d="M3 9.4h18M12 9.4V20"/>',
  swap: '<path d="M4 8.4h13M14 5.2l3.2 3.2L14 11.6"/><path d="M20 15.6H7M10 12.4l-3.2 3.2L10 18.8"/>',
  lock: '<rect x="4.6" y="10.4" width="14.8" height="10.2" rx="2.6"/><path d="M8.2 10.4V7.8a3.8 3.8 0 0 1 7.6 0v2.6"/>',
  ruler2: '<path d="M3 21 21 3"/><path d="M3 21v-6M3 21h6"/><path d="M21 3v6M21 3h-6"/>',
};

/** One inline icon. `cls` lets a caller size it differently in place. */
export function icon(name, cls = "spec-icon") {
  const d = ICONS[name];
  if (!d) return "";
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;
}

/**
 * Platform glyphs. Deliberately generic hardware shapes — a monitor, a console
 * box, a handheld, a phone — rather than imitations of anyone's logo.
 */
const PLATFORM_ICONS = [
  { test: /xbox/i, icon: "console" },
  { test: /playstation|\bps[45]\b/i, icon: "console" },
  { test: /switch/i, icon: "handheld" },
  { test: /steam/i, icon: "store" },
  { test: /android/i, icon: "phone" },
  { test: /ios|iphone|ipad/i, icon: "phone" },
  { test: /pc|windows/i, icon: "monitor" },
];

export const platformIcon = (name) =>
  icon(PLATFORM_ICONS.find((p) => p.test.test(String(name)))?.icon ?? "gamepad");

/* ------------------------------------------------------- controller layout */

/**
 * Per-model layout facts. Everything here is stated somewhere in
 * data/controllers.json, but only inside prose fields that cannot be read
 * mechanically — the centre-button names, whether the rear paddles have
 * mechanical latches, whether there is a physical mode switch. Values the JSON
 * holds as structured fields (rear button count, extra bumpers, trigger stops,
 * audio jack, faceplates, connection modes) are read from the data instead of
 * being repeated here.
 */
const LAYOUT = {
  // View / Xbox / Menu / Share, plus an M button and a mic-mute button below
  // (extraButtons.notes: "a front 'M' (Mode) button below the d-pad and a
  // dedicated mic mute button"). The SE is the model with quick-latches.
  "g7-se": { family: "xbox", centre: "xbox", mode: "M", micMute: true, latches: true },
  // Same face as the SE. Its notes record the latches as specifically absent,
  // which is worth showing rather than omitting.
  "g7-he": { family: "xbox", centre: "xbox", mode: "M", micMute: true, latches: false },
  "g7-pro": { family: "xbox", centre: "xbox", mode: "Mode", gyro: true },
  "g7-pro-8k": { family: "xbox", centre: "xbox", mode: "M", gyro: true },
  kaleid: { family: "xbox", centre: "xbox", mode: "M", rgb: "Two customisable RGB strips" },
  "t7-pro": { family: "xbox", centre: "xbox", mode: "M", rgb: "RGB-illuminated D-pad and ABXY" },
  // Multiplatform, so the guide button is a Home button and the shoulder row
  // carries a physical trigger gear. Four on-board profiles are shown by
  // "four illuminated segments in the center of the controller".
  "cyclone-2": {
    family: "xbox",
    centre: "home",
    mode: "M",
    profiles: 4,
    rgb: "RGB strip in each grip and around the centre button",
    gyro: true,
  },
  // Xbox-style offset sticks with Nintendo-style centre row, a three-position
  // rear mode switch, and detachable ABXY caps for layout swapping.
  "super-nova": {
    family: "xbox",
    centre: "nintendo",
    mode: "M",
    modeSwitch: true,
    faceSwap: "detach",
    rgb: "Thin RGB strips on the front",
    gyro: true,
  },
  // Symmetric sticks, D-pad upper-left, and the motorised gear that rotates the
  // face-button cluster between Xbox and Nintendo positions.
  "tarantula-pro": {
    family: "symmetric",
    centre: "home",
    faceSwap: "gear",
    latches: true,
    extraFront: true,
    blankCaps: true,
    rgb: "RGB strip, RGB Home indicator and illuminated face buttons",
    gyro: true,
  },
};

const layoutOf = (c) => LAYOUT[c.id] ?? { family: "xbox", centre: "xbox", mode: "M" };

/** The layout facts above, for callers that need to pick a matching close-up. */
export const layoutInfo = (c) => ({ ...layoutOf(c) });

/** First clause of a prose field, for a legend line that has to stay short. */
const brief = (v, max = 96) => {
  if (!v) return null;
  let s = String(v).split(/\.\s+/)[0].replace(/\.$/, "");
  if (s.length > max) s = s.slice(0, max - 1).replace(/[\s,;:—-]+$/, "") + "\u2026";
  return s;
};

const has = (v) => v !== null && v !== undefined && v !== "" && v !== false;

/**
 * Label and explanation for every control a diagram might draw. Specifics come
 * from the model's own record where the data has them, so a legend line says
 * "Hall Effect analog" rather than "analog" when that is documented.
 */
function partInfo(c) {
  const info = buildPartInfo(c);
  // The key is what the legend and the drawing agree on, so it is stamped onto
  // each entry rather than tracked separately in two places.
  for (const [id, part] of Object.entries(info)) part.id = id;
  return info;
}

function buildPartInfo(c) {
  const L = layoutOf(c);
  const s = c.sticks ?? {};
  const t = c.triggers ?? {};
  const eb = c.extraButtons ?? {};
  const conn = c.connectivity ?? {};

  const stickTech = c.short?.sticks ?? s.tech;
  const trigTech = c.short?.triggers ?? brief(t.tech, 60);
  const dpadText = c.short?.dpad ?? brief(c.dpad, 80);
  const faceText = brief(c.faceButtons, 80);

  const guide =
    L.centre === "xbox"
      ? {
          label: "Xbox guide button",
          desc: "Powers the controller and opens the Xbox dashboard. Its indicator also reports connection state, the active profile slot and whether a mode switch succeeded.",
        }
      : {
          label: "Home button",
          desc: "Powers the controller and opens the connected platform's home screen. The surrounding indicator reports pairing and connection state.",
        };

  const wiredOnly = conn.wired && !conn.dongle24g && !conn.bluetooth;

  return {
    ls: {
      label: "Left stick",
      desc: `Movement axis, and a digital click (LS/L3) when pressed.${
        stickTech ? ` Sensor: ${stickTech}.` : ""
      }`,
    },
    rs: {
      label: "Right stick",
      desc: `Camera and aim axis, with a click (RS/R3). Same sensor assembly as the left stick.${
        s.measuredCenterError ? ` Measured centre error: ${s.measuredCenterError}.` : ""
      }`,
    },
    dpad: {
      label: "D-pad",
      desc: `Eight-way directional pad, used for menus and weapon or item wheels.${
        dpadText ? ` ${dpadText}.` : ""
      }`,
    },
    face: {
      label: "ABXY face buttons",
      desc: `The four primary action buttons.${faceText ? ` ${faceText}.` : ""}`,
    },
    lb: {
      label: "Left bumper (LB)",
      desc: "Digital shoulder button above the left trigger. Reported as LB on Xbox and L1 elsewhere.",
    },
    rb: {
      label: "Right bumper (RB)",
      desc: "Digital shoulder button above the right trigger. Reported as RB on Xbox and R1 elsewhere.",
    },
    lt: {
      label: "Left trigger (LT)",
      desc: `Analog trigger reporting how far it is pulled, not just whether it is pressed.${
        trigTech ? ` ${trigTech}.` : ""
      }`,
    },
    rt: {
      label: "Right trigger (RT)",
      desc: `Analog trigger, normally fire or accelerate.${
        t.triggerStops
          ? " This model has trigger stops, so the travel can be shortened to a micro-switch click."
          : ""
      }`,
    },
    l5: {
      label: "Mini bumper (L5)",
      desc: "Extra digital input inboard of LB. Ships as a null input and does nothing until it is mapped.",
    },
    r5: {
      label: "Mini bumper (R5)",
      desc: "Extra digital input inboard of RB, mapped the same way as L5.",
    },
    view: {
      label: L.centre === "nintendo" ? "View / Minus" : "View button",
      desc: "Opens in-game maps and menus. It is also the first button in most of this family's calibration and reset combinations, so its position matters more than its everyday use.",
    },
    menu: {
      label: L.centre === "nintendo" ? "Menu / Plus" : "Menu button",
      desc: "Pause and start. Held with View and the guide button it enters the calibration and reset sequences documented on this page.",
    },
    guide,
    share: {
      label: L.centre === "nintendo" ? "Screenshot button" : "Share button",
      desc:
        L.centre === "nintendo"
          ? "Captures a screenshot on platforms that support it."
          : "Captures a screenshot or a clip. Also used in the combinations that switch the controller between GIP and XInput.",
    },
    mode: {
      label: L.mode === "Mode" ? "Mode button" : `${L.mode ?? "M"} (Mode) button`,
      desc: "The on-controller modifier. Held with another control it remaps the rear buttons, switches profile, toggles hair triggers and changes vibration strength without any software running.",
    },
    micMute: {
      label: "Microphone mute",
      desc: "Mutes a headset plugged into the 3.5 mm jack, independently of the console's own mute.",
    },
    jack: {
      label: "3.5 mm headset jack",
      desc: "Passes game audio and microphone through the controller. On several models in this range it stops working above a 250 Hz report rate, which is by design rather than a fault.",
    },
    usbc: {
      label: "USB-C port",
      desc: wiredOnly
        ? "Data and power. This model is wired-only, so the cable is the connection rather than a charging option."
        : "Data and charging. Also the connection to use when a wireless mode is misbehaving, since it bypasses pairing entirely.",
    },
    l4: {
      label: "Rear button L4",
      desc: `Remappable paddle reached by the middle finger.${
        eb.remappable ? " Ships as a null input, so it does nothing until it is assigned." : ""
      }`,
    },
    r4: {
      label: "Rear button R4",
      desc: "Remappable paddle on the right grip, assigned the same way as L4.",
    },
    latch: {
      label: L.latches === false ? "No back-button latches" : "Back-button latches",
      desc:
        L.latches === false
          ? "Unlike the G7 SE, this model has no mechanical lock for the rear paddles — they are always live. GameSir's own manual page still claims otherwise, which is a documentation error rather than a hardware difference."
          : "Sliders that mechanically disable the rear paddles, so a grip that keeps catching them can be locked out without unmapping anything.",
    },
    modeSwitch: {
      label: "Connection switch",
      desc: "Three-position slider selecting 2.4 GHz, off, or Bluetooth. Because it is mechanical, the controller stays in the selected mode across a power cycle.",
    },
    gear: {
      label: "Trigger stop switches",
      desc: `Physical switches that shorten the trigger from full analog travel to a short click.${
        t.notes ? ` ${brief(t.notes, 120)}.` : ""
      }`,
    },
    profiles: {
      label: "Profile indicator",
      desc: `${L.profiles ?? 4} illuminated segments showing which on-board profile is active. Profiles are stored in the controller, so they survive without the software running.`,
    },
    rgb: { label: "RGB lighting", desc: `${L.rgb ?? "Addressable lighting"}.` },
    faceplate: {
      label: "Magnetic faceplate",
      desc: `The front plate lifts off for replacement or painting.${
        c.faceplates?.swappable
          ? " Calibrate with it installed: GameSir documents that calibrating without the plate produces wrong stick range values."
          : ""
      }`,
    },
    faceSwap: {
      label: L.faceSwap === "gear" ? "Rotating face-button gear" : "Detachable face buttons",
      desc:
        L.faceSwap === "gear"
          ? "A motorised internal gear physically rotates the ABXY cluster between the Xbox and Nintendo arrangements, visible through a window in the shell."
          : "The ABXY caps pull off so the cluster can be rearranged by hand between the Xbox and Nintendo layouts. Swapping the reported values is a separate firmware toggle.",
    },
    extraFront: {
      label: "Extra front controls (C1–C4, T1–T3)",
      desc: "Additional remappable inputs around the centre panel. Each can be assigned a single button or a sequence of up to twelve.",
    },
    grip: {
      label: "Grip",
      desc: has(c.weight)
        ? `Textured grip. Documented weight for the whole controller: ${c.short?.weight ?? c.weight}.`
        : "Textured grip housing the rumble motor.",
    },
  };
}

/* -------------------------------------------------------- controller views */

/**
 * Body outlines, drawn in a 400 x 280 space and symmetric about x = 200.
 *
 * Two are needed because the two families are genuinely different shapes: an
 * offset-stick pad has a deep notch between the grips, while a symmetric one
 * fills that area with the sticks and so cannot.
 */
const BODY_TOP =
  "M 200 64 C 178 64 152 60 124 64 C 96 68 70 80 52 104 C 38 124 33 148 36 172 " +
  "C 39 202 50 234 72 254 C 90 270 114 274 132 262 C 146 253 152 240 156 220 ";

const BODY_TAIL =
  "C 248 240 254 253 268 262 C 286 274 310 270 328 254 C 350 234 361 202 364 172 " +
  "C 367 148 362 124 348 104 C 330 80 304 68 276 64 C 248 60 222 64 200 64 Z";

/* Deep notch between the grips: the sticks sit above it, offset from each other. */
const OFFSET_BODY =
  BODY_TOP +
  "C 159 206 166 198 180 196 C 187 195 194 195 200 195 " +
  "C 206 195 213 195 220 196 C 234 198 241 206 244 220 " +
  BODY_TAIL;

/* Shallower notch: a symmetric pad puts both sticks in that space instead. */
const SYMMETRIC_BODY =
  BODY_TOP +
  "C 160 210 170 204 186 203 L 214 203 C 230 204 240 210 244 220 " +
  BODY_TAIL;

const bodyPath = (c) => (layoutOf(c).family === "symmetric" ? SYMMETRIC_BODY : OFFSET_BODY);

/**
 * Shoulder row, shared by the front and back views. Drawn before the body so
 * the body overlaps its lower edge and the parts read as attached to it rather
 * than floating above it.
 */
const shoulderRow = (info, add, { mini }) => {
  add(info.lt, rect(76, 18, 68, 30, 15, "d-part") + text(110, 33, "LT"));
  add(info.rt, rect(256, 18, 68, 30, 15, "d-part") + text(290, 33, "RT"));
  add(info.lb, rect(66, 44, 86, 28, 14, "d-part-2") + text(105, 57, "LB"));
  add(info.rb, rect(248, 44, 86, 28, 14, "d-part-2") + text(295, 57, "RB"));
  if (mini) {
    // Top-edge extras sit inboard of the bumpers. They are raised enough that
    // their labels clear the body edge that crops their lower half.
    add(info.l5, rect(155, 38, 26, 26, 12, "d-part-2") + text(168, 48, "L5", "d-label d-label-xs"));
    add(info.r5, rect(219, 38, 26, 26, 12, "d-part-2") + text(232, 48, "R5", "d-label d-label-xs"));
  }
};

/** View glyph: the two overlapping panes Microsoft's layout uses. */
const viewGlyph = (cx, cy) =>
  `<g class="d-glyph"><rect x="${cx - 6}" y="${cy - 4.5}" width="7.5" height="6" rx="1.2"/><rect x="${
    cx - 1.5
  }" y="${cy - 1.5}" width="7.5" height="6" rx="1.2"/></g>`;

/** Menu glyph: three stacked lines. */
const menuGlyph = (cx, cy) =>
  `<g class="d-glyph d-glyph-stroke"><path d="M${cx - 5} ${cy - 3.5}h10M${cx - 5} ${cy}h10M${
    cx - 5
  } ${cy + 3.5}h10"/></g>`;

const plusGlyph = (cx, cy) =>
  `<g class="d-glyph d-glyph-stroke"><path d="M${cx - 4.5} ${cy}h9M${cx} ${cy - 4.5}v9"/></g>`;

const minusGlyph = (cx, cy) =>
  `<g class="d-glyph d-glyph-stroke"><path d="M${cx - 4.5} ${cy}h9"/></g>`;

const shareGlyph = (cx, cy) =>
  `<g class="d-glyph d-glyph-stroke"><rect x="${cx - 5}" y="${
    cy - 3.6
  }" width="10" height="7.2" rx="1.4"/><path d="M${cx - 1.8} ${cy - 3.6}v-1.6h3.6v1.6"/></g>`;

/** Guide button: ring, inner dot and the indicator ring that reports state. */
const guideGlyph = (cx, cy, r) =>
  circle(cx, cy, r, "d-guide") +
  circle(cx, cy, r - 4.5, "d-guide-ring") +
  circle(cx, cy, 4.6, "d-accent-fill");

/**
 * ABXY cluster. Colour follows the long-standing convention for each letter.
 * `blank` leaves the caps unlettered, for the models whose caps carry no
 * printed symbol and signal the active layout by colour alone.
 */
const faceCluster = (cx, cy, spread, r, order, { blank = false } = {}) => {
  const at = [
    [cx, cy - spread],
    [cx + spread, cy],
    [cx, cy + spread],
    [cx - spread, cy],
  ];
  return order
    .map(([letter, tint], i) => {
      const [x, y] = at[i];
      return (
        circle(x, y, r, `d-btn d-btn-${tint}`) +
        (blank ? "" : text(x, y + 0.5, letter, "d-btn-letter"))
      );
    })
    .join("");
};

const XBOX_ORDER = [
  ["Y", "warn"],
  ["B", "bad"],
  ["A", "good"],
  ["X", "info"],
];
const NINTENDO_ORDER = [
  ["X", "info"],
  ["A", "good"],
  ["B", "bad"],
  ["Y", "warn"],
];

const stickWell = (cx, cy, label, r = 28) =>
  circle(cx, cy, r, "d-recess") +
  circle(cx, cy, r - 9, "d-part") +
  circle(cx, cy, r - 17, "d-part-inset") +
  text(cx, cy + 0.5, label, "d-label d-label-sm");

const dpadShape = (cx, cy, arm = 19) =>
  path(plusPath(cx, cy, arm, arm * 0.78), "d-part") +
  `<g class="d-glyph d-glyph-stroke"><path d="M${cx} ${cy - arm + 6}l-3 4h6zM${cx} ${
    cy + arm - 6
  }l-3-4h6zM${cx - arm + 6} ${cy}l4-3v6zM${cx + arm - 6} ${cy}l-4-3v6z"/></g>`;

/**
 * Front view. Returns the drawing plus the legend entries for what it drew, so
 * the two can never drift apart.
 */
function frontView(c) {
  const L = layoutOf(c);
  const info = partInfo(c);
  const eb = c.extraButtons ?? {};
  const parts = [];
  const out = [];
  const add = (p, inner) => {
    if (!p) return;
    parts.push(p);
    out.push(hotspot(p, inner));
  };

  shoulderRow(info, add, { mini: (eb.extraBumpers ?? 0) >= 2 });

  out.push(path(bodyPath(c), "d-body"));
  // The plate is the whole front, so the seam is an inset of the outline
  // rather than an arc across the middle. Scaled about the body's own centre.
  if (c.faceplates?.swappable) {
    add(info.faceplate, path(bodyPath(c), "d-seam", ' transform="translate(14,11.7) scale(0.93)"'));
  }

  if (L.family === "symmetric") {
    // Tarantula Pro: D-pad and face cluster mirrored across the upper face,
    // sticks side by side below them, and a centre panel carrying the gear
    // window, the Home key and the extra front controls.
    add(info.dpad, dpadShape(100, 112, 23));
    add(info.face, faceCluster(300, 112, 27, 12, XBOX_ORDER, { blank: L.blankCaps }));
    add(info.ls, stickWell(140, 186, "LS", 25));
    add(info.rs, stickWell(260, 186, "RS", 25));

    add(info.view, circle(152, 74, 10, "d-btn-sm") + viewGlyph(152, 74));
    add(info.menu, circle(248, 74, 10, "d-btn-sm") + menuGlyph(248, 74));
    if (L.faceSwap === "gear") {
      // Teeth around a hub, not spokes through a filled centre: a red dot here
      // would read as a second Home key beside the real one.
      add(
        info.faceSwap,
        rect(178, 104, 44, 36, 8, "d-window") +
          circle(200, 122, 13, "d-gear") +
          circle(200, 122, 4.5, "d-part-inset") +
          path(
            Array.from({ length: 8 }, (_, i) => {
              const a = (i * Math.PI) / 4;
              const [dx, dy] = [Math.cos(a), Math.sin(a)];
              return `M${(200 + dx * 8).toFixed(1)} ${(122 + dy * 8).toFixed(1)}L${(
                200 + dx * 12
              ).toFixed(1)} ${(122 + dy * 12).toFixed(1)}`;
            }).join(""),
            "d-ink"
          )
      );
    }
    // Home sits low between the sticks, the only part of the centre column the
    // panel above it leaves free.
    add(info.guide, guideGlyph(200, 176, 12));
    if (L.extraFront) {
      // Two keys above the centre panel, two below, and an actuator either
      // side of it — the arrangement hands-on coverage describes.
      add(
        info.extraFront,
        [
          [184, 92, "C1"],
          [216, 92, "C2"],
          [184, 152, "C3"],
          [216, 152, "C4"],
        ]
          .map(
            ([x, y, n]) =>
              circle(x, y, 7.5, "d-btn-sm") + text(x, y + 0.4, n, "d-label d-label-xs")
          )
          .join("") +
          [
            [166, 122, "T1"],
            [234, 122, "T2"],
          ]
            .map(
              ([x, y, n]) =>
                rect(x - 6, y - 11, 12, 22, 6, "d-btn-sm") +
                text(x, y - 16, n, "d-label d-label-xs")
            )
            .join("")
      );
    }
  } else {
    // Offset layout: left stick high, D-pad low left, face cluster high right,
    // right stick low right.
    add(info.ls, stickWell(110, 120, "LS"));
    add(
      info.face,
      faceCluster(296, 120, 30, 12.5, L.centre === "nintendo" ? NINTENDO_ORDER : XBOX_ORDER)
    );
    add(info.dpad, dpadShape(140, 184, 21));
    add(info.rs, stickWell(258, 186, "RS"));

    add(
      info.view,
      circle(158, 112, 10.5, "d-btn-sm") +
        (L.centre === "nintendo" ? minusGlyph(158, 112) : viewGlyph(158, 112))
    );
    add(
      info.menu,
      circle(238, 112, 10.5, "d-btn-sm") +
        (L.centre === "nintendo" ? plusGlyph(238, 112) : menuGlyph(238, 112))
    );
    add(info.guide, guideGlyph(200, 90, 16));

    if (L.profiles) {
      add(
        info.profiles,
        rect(181, 124, 38, 12, 6, "d-part-inset") +
          Array.from({ length: L.profiles }, (_, i) =>
            rect(185.5 + i * 7.5, 127, 4.5, 6, 2.2, i === 0 ? "d-accent-fill" : "d-dim-fill")
          ).join("")
      );
    } else {
      add(info.share, circle(200, 130, 8.5, "d-btn-sm") + shareGlyph(200, 130));
    }

    // The button faces of this range only ever carry an "M", whatever the
    // manual calls it, so the circle is labelled M and the legend spells it out.
    if (L.mode) {
      const mx = L.micMute ? 184 : 200;
      add(info.mode, circle(mx, 152, 9.5, "d-btn-sm") + text(mx, 152.4, "M", "d-label d-label-xs"));
      if (L.micMute) {
        add(
          info.micMute,
          circle(216, 152, 9.5, "d-btn-sm") +
            `<g class="d-glyph d-glyph-stroke"><path d="M213 148.5a3 3 0 0 1 6 0v3a3 3 0 0 1-6 0zM210.5 151.5a5.5 5.5 0 0 0 11 0M216 157v1.5"/></g>`
        );
      }
    }

    if (L.faceSwap === "detach") {
      add(
        info.faceSwap,
        circle(296, 120, 41, "d-swap-ring") +
          `<g class="d-glyph d-glyph-stroke"><path d="M332 160h8M336 157l4 3-4 3"/></g>`
      );
    }
  }

  if (L.rgb) {
    add(
      info.rgb,
      path("M 58 150 C 54 178 60 208 72 232", "d-rgb") +
        path("M 342 150 C 346 178 340 208 328 232", "d-rgb")
    );
  }

  // Bottom edge, between the grips: the jack, and the mute key that sits
  // beside it on the models documented as having one.
  if (c.audioJack) {
    add(info.jack, rect(189, 184, 22, 13, 5, "d-port") + circle(200, 190.5, 3.4, "d-part-inset"));
  }

  return {
    svg: svg("0 0 400 280", out.join(""), {
      label: `${c.name} front layout diagram: sticks, D-pad, ABXY buttons, bumpers, triggers and centre buttons`,
      cls: "diagram-controller",
    }),
    parts: orderLegend(parts),
  };
}

/**
 * Legend order. Drawing order is dictated by what has to sit on top of what,
 * which is not the order anyone reads a controller in — hands first, then the
 * centre row, then the edges.
 */
const LEGEND_ORDER = [
  "ls", "rs", "dpad", "face", "faceSwap", "lb", "rb", "lt", "rt", "gear", "l5", "r5",
  "view", "menu", "guide", "share", "profiles", "mode", "micMute", "extraFront",
  "l4", "r4", "latch", "usbc", "jack", "modeSwitch", "rgb", "faceplate", "grip",
];

const orderLegend = (parts) => {
  const rank = (p) => {
    const i = LEGEND_ORDER.indexOf(p.id);
    return i === -1 ? LEGEND_ORDER.length : i;
  };
  return parts.slice().sort((a, b) => rank(a) - rank(b));
};

/** Back view: ports, rear paddles and whatever switches the model documents. */
function backView(c) {
  const L = layoutOf(c);
  const info = partInfo(c);
  const eb = c.extraButtons ?? {};
  const parts = [];
  const out = [];
  const add = (p, inner) => {
    if (!p) return;
    parts.push(p);
    out.push(hotspot(p, inner));
  };

  shoulderRow(info, add, { mini: (eb.extraBumpers ?? 0) >= 2 });
  out.push(path(bodyPath(c), "d-body"));

  add(
    info.usbc,
    rect(182, 59, 36, 15, 7.5, "d-port") +
      rect(188, 63.5, 24, 6, 3, "d-part-inset") +
      text(200, 86, "USB-C", "d-label d-label-xs")
  );

  if (c.triggers?.triggerStops === true) {
    add(
      info.gear,
      rect(84, 92, 34, 15, 7.5, "d-part-2") +
        rect(87, 95, 12, 9, 4.5, "d-accent-fill") +
        text(101, 119, "stop", "d-label d-label-xs") +
        rect(282, 92, 34, 15, 7.5, "d-part-2") +
        rect(301, 95, 12, 9, 4.5, "d-accent-fill") +
        text(299, 119, "stop", "d-label d-label-xs")
    );
  }

  const paddles = eb.backButtons ?? 0;
  if (paddles >= 1) {
    add(
      info.l4,
      `<g transform="rotate(-15 100 226)">${rect(87, 201, 26, 50, 13, "d-part-2")}</g>` +
        text(100, 226, "L4", "d-label d-label-sm")
    );
  }
  if (paddles >= 2) {
    add(
      info.r4,
      `<g transform="rotate(15 300 226)">${rect(287, 201, 26, 50, 13, "d-part-2")}</g>` +
        text(300, 226, "R4", "d-label d-label-sm")
    );
  }

  if (L.latches === true) {
    add(
      info.latch,
      rect(122, 204, 13, 26, 6, "d-part-inset") +
        rect(124.5, 207, 8, 9, 4, "d-accent-fill") +
        text(128, 240, "lock", "d-label d-label-xs") +
        rect(265, 204, 13, 26, 6, "d-part-inset") +
        rect(267.5, 207, 8, 9, 4, "d-accent-fill") +
        text(272, 240, "lock", "d-label d-label-xs")
    );
  } else if (L.latches === false) {
    add(
      info.latch,
      rect(122, 204, 13, 26, 6, "d-absent") +
        rect(265, 204, 13, 26, 6, "d-absent") +
        path("M 122 230 L 135 204 M 265 230 L 278 204", "d-slash-line") +
        text(128, 240, "no lock", "d-label d-label-xs d-dim-text") +
        text(272, 240, "no lock", "d-label d-label-xs d-dim-text")
    );
  }

  if (L.modeSwitch) {
    add(
      info.modeSwitch,
      rect(176, 140, 48, 16, 8, "d-part-inset") +
        rect(179, 143, 13, 10, 5, "d-accent-fill") +
        text(200, 166, "2.4G / OFF / BT", "d-label d-label-xs")
    );
  }

  add(
    info.grip,
    path(
      "M 62 200 C 66 226 76 250 92 264 M 76 194 C 80 220 90 244 106 258 " +
        "M 338 200 C 334 226 324 250 308 264 M 324 194 C 320 220 310 244 294 258",
      "d-texture"
    )
  );

  return {
    svg: svg("0 0 400 280", out.join(""), {
      label: `${c.name} back layout diagram: USB-C port, rear buttons and rear switches`,
      cls: "diagram-controller",
    }),
    parts: orderLegend(parts),
  };
}

/** Top view: the shoulder row and the port edge, seen from above. */
function topView(c) {
  const info = partInfo(c);
  const eb = c.extraButtons ?? {};
  const mini = (eb.extraBumpers ?? 0) >= 2;
  const parts = [];
  const out = [];
  const add = (p, inner) => {
    if (!p) return;
    parts.push(p);
    out.push(hotspot(p, inner));
  };

  add(info.lt, `<g transform="rotate(-8 110 58)">${rect(72, 44, 76, 30, 15, "d-part")}</g>` + text(110, 59, "LT"));
  add(info.rt, `<g transform="rotate(8 290 58)">${rect(252, 44, 76, 30, 15, "d-part")}</g>` + text(290, 59, "RT"));

  out.push(
    path(
      "M 66 138 C 46 134 34 118 42 98 C 56 68 92 46 132 40 L 268 40 " +
        "C 308 46 344 68 358 98 C 366 118 354 134 334 138 C 268 152 132 152 66 138 Z",
      "d-body"
    )
  );

  add(info.lb, `<g transform="rotate(-5 132 96)">${rect(94, 83, 76, 26, 13, "d-part-2")}</g>` + text(132, 97, "LB"));
  add(info.rb, `<g transform="rotate(5 268 96)">${rect(230, 83, 76, 26, 13, "d-part-2")}</g>` + text(268, 97, "RB"));

  if (mini) {
    add(info.l5, rect(168, 82, 25, 21, 9, "d-part-2") + text(180.5, 93, "L5", "d-label d-label-xs"));
    add(info.r5, rect(207, 82, 25, 21, 9, "d-part-2") + text(219.5, 93, "R5", "d-label d-label-xs"));
  }

  add(
    info.usbc,
    rect(184, mini ? 112 : 104, 32, 16, 8, "d-port") +
      rect(190, mini ? 116 : 108, 20, 8, 4, "d-part-inset") +
      text(200, mini ? 138 : 130, "USB-C", "d-label d-label-xs")
  );

  return {
    svg: svg("0 0 400 170", out.join(""), {
      label: `${c.name} top edge diagram: bumpers, triggers and the USB-C port`,
      cls: "diagram-controller is-top",
    }),
    parts: orderLegend(parts),
  };
}

/** All three views of one controller, each with its own legend. */
export function controllerViews(c) {
  return [
    { id: "front", label: "Front", ...frontView(c) },
    { id: "back", label: "Back", ...backView(c) },
    { id: "top", label: "Top edge", ...topView(c) },
  ];
}

/**
 * Reduced outline for the controller cards and the model switcher: silhouette,
 * stick wells and button positions only, at a size where detail would turn to
 * mud anyway.
 */
export function silhouette(c) {
  const symmetric = layoutOf(c).family === "symmetric";
  const body =
    rect(68, 42, 84, 26, 13, "s-shoulder") +
    rect(248, 42, 84, 26, 13, "s-shoulder") +
    path(bodyPath(c), "s-body") +
    (symmetric
      ? path(plusPath(112, 106, 18, 14), "s-part") +
        circle(288, 106, 26, "s-ring") +
        circle(148, 178, 24, "s-ring") +
        circle(252, 178, 24, "s-ring")
      : circle(110, 120, 26, "s-ring") +
        circle(296, 120, 28, "s-ring") +
        path(plusPath(142, 188, 18, 14), "s-part") +
        circle(258, 186, 24, "s-ring")) +
    circle(200, symmetric ? 150 : 90, 12, "s-part");

  return svg("0 0 400 280", body, { cls: "diagram-silhouette" });
}

/* --------------------------------------------------- component close-ups -- */

/** Frame used by the small component figures, so they share a visual weight. */
const panel = (w, h) => rect(1, 1, w - 2, h - 2, 12, "d-panel");

/**
 * Stick sensing, in cross-section. The point of the drawing is the contact
 * gap: magnetic sensors read the stick's position without touching anything,
 * which is why they do not wear the way a potentiometer does.
 */
export function stickSensorFigure(kind) {
  const magnetic = kind !== "pot";
  const label = kind === "tmr" ? "TMR" : kind === "hall" ? "Hall Effect" : "Potentiometer";

  const body =
    panel(240, 170) +
    // Stick shaft and cap, kept clear of the title above it
    path("M 120 40 L 120 84", "d-ink-thick") +
    path("M 100 36 C 100 28 140 28 140 36 C 140 46 100 46 100 36 Z", "d-part") +
    // Gimbal
    path("M 86 84 C 86 68 154 68 154 84", "d-ink") +
    circle(120, 88, 7, "d-part-2") +
    // Sensor board
    rect(60, 124, 120, 18, 4, "d-part-2") +
    text(120, 133.5, "sensor board", "d-label d-label-xs") +
    (magnetic
      ? // Magnet on the shaft, sensor beneath it, and the gap between them
        // bracketed, since the gap is the whole point of the drawing.
        rect(102, 94, 36, 12, 3, "d-accent-fill") +
        text(120, 100, "magnet", "d-label d-label-xs d-on-accent") +
        rect(104, 112, 32, 10, 3, "d-part") +
        path("M 141 106 L 149 106 M 141 112 L 149 112 M 145 106 L 145 112", "d-accent-stroke") +
        path("M 174 102 L 150 109", "d-leader") +
        text(196, 99, "no contact", "d-label d-label-xs d-accent-text") +
        path("M 60 152 h 120", "d-good-stroke") +
        text(120, 160, "nothing rubs \u2014 no wear path", "d-label d-label-xs")
      : // Wiper dragging on a resistive track. The track sits on the board, so
        // its label goes out to the left rather than on top of the board's.
        path("M 120 96 L 120 116 L 138 118", "d-ink-thick") +
        rect(96, 118, 68, 8, 2, "d-warn-fill") +
        path("M 66 108 L 96 119", "d-leader") +
        text(60, 104, "resistive track", "d-label d-label-xs") +
        circle(138, 118, 4, "d-accent-fill") +
        path("M 176 106 L 144 116", "d-leader") +
        text(196, 102, "wiper", "d-label d-label-xs d-accent-text") +
        path("M 60 152 h 120", "d-warn-stroke") +
        text(120, 160, "contact point wears with use", "d-label d-label-xs")) +
    text(120, 18, label, "d-title");

  return svg("0 0 240 170", body, {
    label: magnetic
      ? `${label} stick cross-section: a magnet on the stick shaft is read by a sensor below it with no physical contact`
      : "Potentiometer stick cross-section: a wiper drags along a resistive track, which wears at the contact point",
  });
}

/** The three sensing technologies, for the comparison page's stick-sensor note. */
export function sensorCompareFigures() {
  return [
    { kind: "pot", svg: stickSensorFigure("pot") },
    { kind: "hall", svg: stickSensorFigure("hall") },
    { kind: "tmr", svg: stickSensorFigure("tmr") },
  ];
}

/**
 * What "drift" usually is on a magnetic stick. Three states of the same stick
 * at rest, which is the distinction the troubleshooting page turns on.
 */
export function deadzoneFigure() {
  const dial = (cx, title, sub, extra) =>
    circle(cx, 74, 44, "d-recess") +
    circle(cx, 74, 44, "d-ring") +
    extra +
    text(cx, 138, title, "d-title") +
    text(cx, 152, sub, "d-label d-label-xs");

  const body =
    panel(560, 170) +
    dial(
      96,
      "Centre error",
      "reported as slight input",
      circle(96 + 7, 74 - 5, 5.5, "d-accent-fill") +
        path(`M 96 74 L ${96 + 7} ${74 - 5}`, "d-accent-stroke") +
        circle(96, 74, 2, "d-dim-fill")
    ) +
    dial(
      280,
      "Inner deadzone",
      "error hidden, precision lost",
      circle(280, 74, 16, "d-deadzone") +
        circle(280 + 7, 74 - 5, 5.5, "d-dim-fill") +
        circle(280, 74, 2, "d-dim-fill")
    ) +
    dial(
      464,
      "Anti-deadzone",
      "movement sent while centred",
      circle(464, 74, 16, "d-antideadzone") +
        [0, 60, 120, 180, 240, 300]
          .map((a) => {
            const r = (a * Math.PI) / 180;
            return path(
              `M ${(464 + Math.cos(r) * 6).toFixed(1)} ${(74 + Math.sin(r) * 6).toFixed(1)} L ${(
                464 +
                Math.cos(r) * 19
              ).toFixed(1)} ${(74 + Math.sin(r) * 19).toFixed(1)}`,
              "d-accent-stroke"
            );
          })
          .join("") +
        circle(464, 74, 4, "d-accent-fill")
    ) +
    text(280, 22, "One stick at rest, three configurations", "d-title");

  return svg("0 0 560 170", body, {
    label:
      "Three diagrams of a stick at rest: a small centre error reported as input, an inner deadzone that hides it, and an anti-deadzone that reports movement while the stick is centred",
  });
}

/** Trigger travel, with and without a stop. */
export function triggerFigure(hasStops) {
  const body =
    panel(240, 170) +
    // Housing and pivot
    path("M 40 122 C 40 74 66 44 104 36", "d-ink") +
    circle(44, 126, 6, "d-part-2") +
    // Trigger blade at rest
    path("M 52 122 C 60 84 84 58 118 48 L 130 66 C 100 76 80 98 74 128 Z", "d-part") +
    // Travel arc
    path("M 138 58 A 84 84 0 0 1 158 112", "d-travel") +
    text(178, 60, "full pull", "d-label d-label-xs") +
    (hasStops
      ? path("M 148 86 l 16 6", "d-accent-stroke") +
        text(186, 92, "stop", "d-label d-label-xs d-accent-text") +
        rect(150, 128, 46, 16, 8, "d-part-2") +
        rect(152.5, 131, 16, 10, 5, "d-accent-fill") +
        text(173, 158, "gear / stop switch", "d-label d-label-xs")
      : text(120, 158, "full analog travel, no stop", "d-label d-label-xs")) +
    text(120, 20, hasStops ? "Trigger with stops" : "Analog trigger", "d-title");

  return svg("0 0 240 170", body, {
    label: hasStops
      ? "Trigger cross-section showing full analog travel and the shortened travel selected by a trigger stop"
      : "Trigger cross-section showing full analog travel",
  });
}

/** D-pad close-up. `fenced` draws the raised ring some models have. */
export function dpadFigure({ fenced = false, switchType = null } = {}) {
  const cx = 84;
  const cy = 80;
  const body =
    panel(200, 170) +
    (fenced ? circle(cx, cy, 46, "d-ring") : "") +
    path(plusPath(cx, cy, 34, 26), "d-part") +
    `<g class="d-glyph d-glyph-stroke"><path d="M${cx} ${cy - 24}l-5 6h10zM${cx} ${
      cy + 24
    }l-5-6h10zM${cx - 24} ${cy}l6-5v10zM${cx + 24} ${cy}l-6-5v10z"/></g>` +
    // Diagonal pairs, which is what "eight-way" actually means
    [45, 135, 225, 315]
      .map((a) => {
        const r = (a * Math.PI) / 180;
        return path(
          `M ${(cx + Math.cos(r) * 40).toFixed(1)} ${(cy + Math.sin(r) * 40).toFixed(1)} l ${(
            Math.cos(r) * 10
          ).toFixed(1)} ${(Math.sin(r) * 10).toFixed(1)}`,
          "d-dim-stroke"
        );
      })
      .join("") +
    text(cx, 140, "eight directions", "d-label d-label-xs") +
    text(cx, 154, "four switches, diagonals from pairs", "d-label d-label-xs") +
    (switchType ? text(cx, 22, switchType, "d-title") : text(cx, 22, "D-pad", "d-title"));

  return svg("0 0 200 170", body, {
    label:
      "D-pad diagram: a four-arm cross where each arm has its own switch and the diagonals come from pressing two arms together",
  });
}

/** ABXY cluster, optionally showing the alternate Nintendo arrangement. */
export function faceButtonFigure({ swap = false } = {}) {
  const cluster = (cx, order, caption) =>
    faceCluster(cx, 74, 34, 15, order) + text(cx, 132, caption, "d-label d-label-xs");

  const body = swap
    ? panel(320, 170) +
      cluster(88, XBOX_ORDER, "Xbox positions") +
      cluster(232, NINTENDO_ORDER, "Nintendo positions") +
      `<g class="d-glyph d-glyph-stroke"><path d="M148 68h24M168 64l5 4-5 4M172 84h-24M152 80l-5 4 5 4"/></g>` +
      text(160, 22, "Two layouts", "d-title")
    : panel(200, 170) +
      cluster(100, XBOX_ORDER, "south = A, east = B") +
      text(100, 22, "ABXY cluster", "d-title") +
      text(100, 148, "labels follow the Xbox convention", "d-label d-label-xs");

  return svg(swap ? "0 0 320 170" : "0 0 200 170", body, {
    label: swap
      ? "Two ABXY diagrams side by side: the Xbox arrangement with A at the bottom, and the Nintendo arrangement with A on the right"
      : "ABXY cluster with A at the bottom, B on the right, X on the left and Y at the top",
  });
}

/** Bumpers and triggers together, since the two are constantly confused. */
export function shoulderFigure({ mini = false } = {}) {
  const body =
    panel(320, 170) +
    path("M 24 128 C 40 74 96 44 160 44 C 224 44 280 74 296 128", "d-ink") +
    rect(40, 96, 92, 26, 13, "d-part-2") +
    text(86, 110, "LB", "d-label") +
    rect(188, 96, 92, 26, 13, "d-part-2") +
    text(234, 110, "RB", "d-label") +
    `<g transform="rotate(-9 88 62)">${rect(46, 48, 84, 28, 14, "d-part")}</g>` +
    text(88, 63, "LT", "d-label") +
    `<g transform="rotate(9 232 62)">${rect(190, 48, 84, 28, 14, "d-part")}</g>` +
    text(232, 63, "RT", "d-label") +
    (mini
      ? rect(136, 98, 22, 22, 9, "d-part-2") +
        text(147, 109, "L5", "d-label d-label-xs") +
        rect(162, 98, 22, 22, 9, "d-part-2") +
        text(173, 109, "R5", "d-label d-label-xs")
      : "") +
    text(160, 146, "bumpers are digital \u00b7 triggers are analog", "d-label d-label-xs") +
    text(160, 22, "Shoulder row", "d-title");

  return svg("0 0 320 170", body, {
    label:
      "Shoulder row diagram: the digital LB and RB bumpers on the top face, with the analog LT and RT triggers behind them" +
      (mini ? ", plus the L5 and R5 mini bumpers inboard of the bumpers" : ""),
  });
}

/** Rear paddles, with the latch when a model has one. */
export function rearButtonFigure({ count = 2, latches = null } = {}) {
  const grip = (mirror) =>
    `<g${mirror ? ' transform="translate(320,0) scale(-1,1)"' : ""}>` +
    path("M 40 24 C 76 24 104 44 112 82 C 118 116 104 146 76 150 C 48 154 28 132 22 100 C 16 68 20 38 40 24 Z", "d-body") +
    `<g transform="rotate(-12 66 92)">${rect(52, 62, 28, 60, 14, "d-part-2")}</g>` +
    (latches === true
      ? rect(94, 74, 13, 28, 6, "d-part-inset") + rect(96.5, 77, 8, 10, 4, "d-accent-fill")
      : latches === false
      ? rect(94, 74, 13, 28, 6, "d-absent") + path("M 94 102 L 107 74", "d-slash-line")
      : "") +
    "</g>";

  const body =
    panel(320, 170) +
    grip(false) +
    grip(true) +
    text(66, 96, "L4", "d-label") +
    text(254, 96, "R4", "d-label") +
    text(160, 22, count >= 2 ? "Rear buttons" : "Rear button", "d-title") +
    text(
      160,
      160,
      latches === false
        ? "no mechanical lock on this model"
        : latches === true
        ? "sliders lock the paddles out mechanically"
        : "reached by the middle fingers",
      "d-label d-label-xs"
    );

  return svg("0 0 320 170", body, {
    label:
      "Back of both grips with the L4 and R4 remappable paddles highlighted" +
      (latches === true ? ", each with its mechanical lock slider" : ""),
  });
}

/** Centre cluster close-up. The buttons every documented button combo uses. */
export function centreButtonFigure({ variant = "xbox", mode = "M" } = {}) {
  const nintendo = variant === "nintendo";
  const guideLabel = variant === "xbox" ? "Guide" : "Home";

  const body =
    panel(320, 170) +
    circle(160, 58, 19, "d-guide") +
    circle(160, 58, 14.5, "d-guide-ring") +
    circle(160, 58, 5, "d-accent-fill") +
    text(160, 30, guideLabel, "d-label d-label-xs") +
    circle(104, 88, 13, "d-btn-sm") +
    (nintendo ? minusGlyph(104, 88) : viewGlyph(104, 88)) +
    text(104, 112, nintendo ? "Minus" : "View", "d-label d-label-xs") +
    circle(216, 88, 13, "d-btn-sm") +
    (nintendo ? plusGlyph(216, 88) : menuGlyph(216, 88)) +
    text(216, 112, nintendo ? "Plus" : "Menu", "d-label d-label-xs") +
    circle(160, 100, 11, "d-btn-sm") +
    shareGlyph(160, 100) +
    text(160, 122, nintendo ? "Screenshot" : "Share", "d-label d-label-xs") +
    circle(160, 138, 11, "d-btn-sm") +
    text(160, 138.5, mode, "d-label d-label-xs") +
    text(160, 160, `${mode} is the modifier every combination starts from`, "d-label d-label-xs");

  return svg("0 0 320 170", body, {
    label: `Centre button cluster: the ${guideLabel} button above, ${
      nintendo ? "Minus and Plus" : "View and Menu"
    } either side, ${nintendo ? "Screenshot" : "Share"} below, and the ${mode} modifier at the bottom`,
  });
}

/** Which connection paths a model actually has, as three labelled lanes. */
export function connectionFigure(c) {
  const conn = c.connectivity ?? {};
  const lane = (y, on, title, glyph) =>
    rect(8, y, 304, 34, 10, on ? "d-lane on" : "d-lane") +
    `<g class="d-lane-icon" transform="translate(22,${y + 9})">${glyph}</g>` +
    text(58, y + 18, title, on ? "d-label d-label-left" : "d-label d-label-left d-dim-text", 'text-anchor="start"') +
    text(
      304,
      y + 18,
      on ? "supported" : "not on this model",
      on ? "d-label d-label-xs d-good-text" : "d-label d-label-xs d-dim-text",
      'text-anchor="end"'
    );

  // Hidden from assistive tech: the figure's own label already names each lane.
  const g = (name) =>
    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name]}</svg>`;

  const body =
    panel(320, 148) +
    lane(14, !!conn.wired, "USB-C cable", g("cable")) +
    lane(56, !!conn.dongle24g, "2.4 GHz dongle", g("wifi")) +
    lane(98, !!conn.bluetooth, "Bluetooth", g("bluetooth"));

  return svg("0 0 320 148", body, {
    label: `Connection modes for the ${c.name}: cable ${
      conn.wired ? "supported" : "not supported"
    }, 2.4 GHz dongle ${conn.dongle24g ? "supported" : "not supported"}, Bluetooth ${
      conn.bluetooth ? "supported" : "not supported"
    }`,
  });
}

/** USB-C port and the 3.5 mm jack, drawn at the size you actually see them. */
export function portFigure({ audioJack = false } = {}) {
  const body =
    panel(240, 130) +
    rect(38, 46, 76, 30, 15, "d-port") +
    rect(48, 55, 56, 12, 6, "d-part-inset") +
    text(76, 96, "USB-C", "d-label") +
    text(76, 112, "reversible, data + power", "d-label d-label-xs") +
    (audioJack
      ? circle(176, 61, 21, "d-port") +
        circle(176, 61, 9, "d-part-inset") +
        text(176, 96, "3.5 mm", "d-label") +
        text(176, 112, "headset audio and mic", "d-label d-label-xs")
      : circle(176, 61, 21, "d-absent") +
        path("M 161 76 L 191 46", "d-slash-line") +
        text(176, 96, "no 3.5 mm", "d-label d-dim-text") +
        text(176, 112, "audio goes through the host", "d-label d-label-xs"));

  return svg("0 0 240 130", body, {
    label: audioJack
      ? "The USB-C port and the 3.5 mm headset jack"
      : "The USB-C port; this model has no 3.5 mm headset jack",
  });
}

/** What the indicator is telling you. Patterns, not model-specific claims. */
export function indicatorFigure() {
  const state = (cx, cls, caption, sub) =>
    circle(cx, 62, 22, "d-guide") +
    circle(cx, 62, 17, "d-guide-ring") +
    circle(cx, 62, 8, cls) +
    text(cx, 104, caption, "d-title") +
    text(cx, 118, sub, "d-label d-label-xs");

  const body =
    panel(480, 140) +
    state(64, "d-good-fill", "Solid", "connected") +
    state(202, "d-half-fill", "Slow blink", "in a setting mode") +
    state(340, "d-accent-fill", "Double blink", "mode change refused") +
    state(444, "d-bad-fill", "Red", "low battery") +
    text(240, 22, "Indicator patterns", "d-title");

  return svg("0 0 480 140", body, {
    label:
      "Four indicator states: solid for a connected controller, a slow blink for a setting mode, a double blink for a refused mode change, and red for low battery",
  });
}

/** Gyro axes. */
export function gyroFigure() {
  const body =
    panel(200, 150) +
    `<g transform="translate(100,74)">` +
    `<ellipse class="d-ring" cx="0" cy="0" rx="52" ry="20"/>` +
    `<ellipse class="d-ring" cx="0" cy="0" rx="52" ry="20" transform="rotate(60)"/>` +
    `<ellipse class="d-accent-ring" cx="0" cy="0" rx="52" ry="20" transform="rotate(120)"/>` +
    circle(0, 0, 13, "d-part") +
    `</g>` +
    text(100, 22, "Gyro", "d-title") +
    text(100, 126, "motion mapped to a stick or the mouse", "d-label d-label-xs");

  return svg("0 0 200 150", body, { label: "Three intersecting rings representing the gyroscope's axes of rotation" });
}

/**
 * Rumble motor positions. Whether the triggers have their own motors comes
 * from the model's documented `rumble` description rather than being assumed.
 */
export function rumbleFigure(rumbleText) {
  const inTriggers = /trigger/i.test(String(rumbleText));
  // The body path is drawn in a 400 x 280 space; the transform places it and
  // then scales it, so these offsets stay in the panel's own coordinates.
  const at = (x, y) => [(x * 0.5 + 20).toFixed(1), (y * 0.5 + 8).toFixed(1)];
  const [lgx, lgy] = at(96, 234);
  const [rgx, rgy] = at(304, 234);
  const [ltx, lty] = at(100, 96);
  const [rtx, rty] = at(300, 96);

  const body =
    panel(240, 170) +
    `<g transform="translate(20,8) scale(0.5)">${path(OFFSET_BODY, "d-body")}</g>` +
    circle(lgx, lgy, 11, "d-accent-fill") +
    circle(rgx, rgy, 11, "d-accent-fill") +
    (inTriggers
      ? circle(ltx, lty, 9, "d-accent-fill") + circle(rtx, rty, 9, "d-accent-fill")
      : "") +
    text(120, 160, inTriggers ? "one per grip, one per trigger" : "one in each grip", "d-label d-label-xs") +
    text(120, 12, inTriggers ? "Four motors" : "Two motors", "d-title");

  return svg("0 0 240 170", body, {
    label: inTriggers
      ? "Motor positions: one in each grip and one behind each trigger"
      : "Motor positions: one in each grip",
  });
}

/** Faceplate lifting away from the shell. */
export function faceplateFigure() {
  const body =
    panel(240, 160) +
    `<g transform="translate(22,34) scale(0.46)">${path(OFFSET_BODY, "d-body")}</g>` +
    `<g transform="translate(42,2) scale(0.46)">${path(OFFSET_BODY, "d-plate")}</g>` +
    `<g class="d-glyph d-glyph-stroke"><path d="M204 86V58M199 66l5-6 5 6"/></g>` +
    text(120, 18, "Magnetic faceplate", "d-title") +
    text(120, 148, "calibrate with the plate installed", "d-label d-label-xs");

  return svg("0 0 240 160", body, {
    label: "The magnetic faceplate lifting away from the controller shell",
  });
}

/** The mapping gesture: hold the modifier, press the target. */
export function mappingFigure({ mode = "M" } = {}) {
  const step = (cx, n, glyph, caption) =>
    circle(cx, 34, 13, "d-step") +
    text(cx, 34.5, String(n), "d-label d-label-xs") +
    glyph +
    text(cx, 122, caption, "d-label d-label-xs");

  const body =
    panel(400, 150) +
    step(
      64,
      1,
      circle(64, 78, 17, "d-btn-sm") + text(64, 78.5, mode, "d-label d-label-xs"),
      `hold ${mode}`
    ) +
    step(
      184,
      2,
      `<g transform="rotate(-12 184 78)">${rect(172, 58, 24, 42, 12, "d-part-2")}</g>` +
        text(184, 79, "L4", "d-label d-label-xs"),
      "and the rear button"
    ) +
    step(
      312,
      3,
      faceCluster(312, 78, 22, 10, XBOX_ORDER),
      "then press what it should do"
    ) +
    `<g class="d-glyph d-glyph-stroke"><path d="M108 78h32M136 74l5 4-5 4M232 78h32M260 74l5 4-5 4"/></g>` +
    text(200, 142, "repeat and press the rear button again to clear it", "d-label d-label-xs");

  return svg("0 0 400 150", body, {
    label: `Three steps for mapping a rear button: hold ${mode}, press the rear button, then press the control it should copy`,
  });
}

/* ------------------------------------------------------- standalone assets */

/**
 * Palette for the SVG files written to docs/assets/gamesir/. Inline diagrams
 * inherit the page's custom properties; a standalone file has none to inherit,
 * so it carries its own copy and follows the operating system's dark mode.
 */
const STANDALONE_STYLE = `
  <style>
    :root { color-scheme: dark light; }
    svg { --ink:#f2f3f5; --muted:#a6aab3; --dim:#71757e; --line:#34343e;
          --s1:#121216; --s2:#17171d; --s3:#1e1e25; --inset:#0e0e12;
          --brand:#e5343c; --good:#35d07f; --warn:#ffc247; --bad:#ff6b6b; --info:#64a8ff; }
    @media (prefers-color-scheme: light) {
      svg { --ink:#16171a; --muted:#585d66; --dim:#80858d; --line:#cdced5;
            --s1:#fff; --s2:#fbfbfc; --s3:#f1f1f4; --inset:#f4f4f7;
            --brand:#d6272e; --good:#0f7a44; --warn:#8a5a00; --bad:#c02626; --info:#175fd0; }
    }
  </style>`;

/**
 * Wraps a diagram as a standalone file. The class rules live in the site
 * stylesheet for inline use, so they are restated here against the palette
 * above rather than duplicated by hand in two places.
 */
export function standaloneSvg(markup, { title, width = 800 }) {
  const rules = `
    .d-canvas{fill:var(--s1)}
    .d-body{fill:var(--s2);stroke:var(--line);stroke-width:2}
    .d-panel{fill:none;stroke:var(--line);stroke-width:1;stroke-dasharray:3 4}
    .d-part{fill:var(--s3);stroke:var(--line);stroke-width:1.4}
    .d-part-2{fill:var(--inset);stroke:var(--line);stroke-width:1.4}
    .d-part-inset{fill:var(--inset);stroke:var(--line);stroke-width:1}
    .d-recess{fill:var(--inset);stroke:var(--line);stroke-width:1.4}
    .d-port{fill:var(--inset);stroke:var(--muted);stroke-width:1.4}
    .d-plate{fill:var(--s3);stroke:var(--brand);stroke-width:1.6;opacity:.9}
    .d-btn,.d-btn-sm,.d-step{fill:var(--s3);stroke:var(--muted);stroke-width:1.3}
    .d-btn-good{fill:color-mix(in srgb,var(--good) 22%,transparent);stroke:var(--good)}
    .d-btn-bad{fill:color-mix(in srgb,var(--bad) 22%,transparent);stroke:var(--bad)}
    .d-btn-info{fill:color-mix(in srgb,var(--info) 22%,transparent);stroke:var(--info)}
    .d-btn-warn{fill:color-mix(in srgb,var(--warn) 22%,transparent);stroke:var(--warn)}
    .d-btn-letter{fill:var(--ink);font:700 12px system-ui,sans-serif;text-anchor:middle;dominant-baseline:central}
    .d-guide{fill:var(--s3);stroke:var(--muted);stroke-width:1.4}
    .d-guide-ring{fill:none;stroke:var(--line);stroke-width:1.2}
    .d-window{fill:var(--inset);stroke:var(--muted);stroke-width:1.2;stroke-dasharray:4 3}
    .d-gear{fill:var(--s3);stroke:var(--brand);stroke-width:1.4}
    .d-ring,.d-accent-ring{fill:none;stroke:var(--line);stroke-width:1.4}
    .d-accent-ring{stroke:var(--brand)}
    .d-swap-ring{fill:none;stroke:var(--brand);stroke-width:1.4;stroke-dasharray:5 4}
    .d-seam{fill:none;stroke:var(--line);stroke-width:1.2;stroke-dasharray:5 5}
    .d-rgb{fill:none;stroke:var(--brand);stroke-width:3.4;stroke-linecap:round;opacity:.75}
    .d-texture{fill:none;stroke:var(--line);stroke-width:1.6;stroke-linecap:round}
    .d-ink{fill:none;stroke:var(--muted);stroke-width:1.6}
    .d-ink-thick{fill:none;stroke:var(--muted);stroke-width:3.4;stroke-linecap:round}
    .d-leader,.d-dim-stroke{fill:none;stroke:var(--dim);stroke-width:1.1}
    .d-travel{fill:none;stroke:var(--muted);stroke-width:1.4;stroke-dasharray:5 4}
    .d-accent-stroke{fill:none;stroke:var(--brand);stroke-width:1.8;stroke-linecap:round}
    .d-good-stroke{fill:none;stroke:var(--good);stroke-width:1.8}
    .d-warn-stroke{fill:none;stroke:var(--warn);stroke-width:1.8}
    .d-accent-fill{fill:var(--brand);stroke:none}
    .d-good-fill{fill:var(--good);stroke:none}
    .d-warn-fill{fill:var(--warn);stroke:none}
    .d-bad-fill{fill:var(--bad);stroke:none}
    .d-half-fill{fill:var(--muted);stroke:none}
    .d-dim-fill{fill:var(--dim);stroke:none}
    .d-deadzone{fill:color-mix(in srgb,var(--info) 26%,transparent);stroke:var(--info);stroke-width:1.2}
    .d-antideadzone{fill:color-mix(in srgb,var(--brand) 20%,transparent);stroke:var(--brand);stroke-width:1.2}
    .d-absent{fill:none;stroke:var(--dim);stroke-width:1.2;stroke-dasharray:4 3}
    .d-slash,.d-slash-line{fill:none;stroke:var(--bad);stroke-width:1.8;stroke-linecap:round}
    .d-lane{fill:var(--inset);stroke:var(--line);stroke-width:1.2}
    .d-lane.on{fill:color-mix(in srgb,var(--good) 12%,transparent);stroke:var(--good)}
    .d-lane-icon{color:var(--muted)}
    .d-glyph{fill:var(--muted);stroke:none}
    .d-glyph-stroke{fill:none;stroke:var(--muted);stroke-width:1.4;stroke-linecap:round}
    .d-label{fill:var(--muted);font:600 10px system-ui,sans-serif;text-anchor:middle;dominant-baseline:central}
    .d-label-sm{font-size:9px}
    .d-label-xs{font-size:8px;fill:var(--dim)}
    .d-label-left{text-anchor:start}
    .d-title{fill:var(--ink);font:700 10px system-ui,sans-serif;text-anchor:middle;dominant-baseline:central;letter-spacing:.04em;text-transform:uppercase}
    .d-accent-text{fill:var(--brand)}
    .d-good-text{fill:var(--good)}
    .d-dim-text{fill:var(--dim)}
    .d-on-accent{fill:#fff}
  `;

  const vb = /viewBox="([^"]+)"/.exec(markup)?.[1] ?? "0 0 400 300";
  const [vx, vy, w, h] = vb.split(/\s+/).map(Number);
  const inner = markup.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${width}" height="${Math.round(
    (width * h) / w
  )}" role="img" aria-label="${esc(title)}">
  <title>${esc(title)}</title>
  <desc>Original schematic diagram from the community-maintained GameSir Wiki. Not GameSir product photography.</desc>
${STANDALONE_STYLE}
  <style>${rules}</style>
  <rect class="d-canvas" x="${vx}" y="${vy}" width="${w}" height="${h}"/>
  ${inner}
</svg>
`;
}
