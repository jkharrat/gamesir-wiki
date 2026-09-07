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

/**
 * A control the reader can hover or focus. The name and description ride along
 * as data attributes so the page's readout can name the part without a second
 * copy of the text living elsewhere in the markup.
 */
const hotspot = ({ id, label, desc }, inner) =>
  `<g class="d-hot" data-part="${esc(id)}" data-name="${esc(label)}" data-desc="${esc(
    desc
  )}" tabindex="0" role="img" aria-label="${esc(
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
  // GameSir publishes no dimensions for the 8K, so its shell is drawn at the
  // G7 Pro's — the model it is a revision of — rather than at a size nobody
  // has stated. Everything else about the layout is its own.
  "g7-pro-8k": { family: "xbox", centre: "xbox", mode: "M", gyro: true, shellFrom: "g7-pro" },
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

/* ------------------------------------------------ documented control styles */

/**
 * Some of what a control looks like is recorded in the data, just in prose: a
 * fenced D-pad has a raised ring around it, a membrane pad is one moulded
 * piece where a micro-switch pad is four separate keys, an illuminated one
 * glows. These read that prose so a drawing follows the record rather than a
 * second opinion kept in this file.
 *
 * A record that says the switch type is *not* documented gets the neutral
 * shape, even though the sentence saying so also names a switch type. That
 * sentence is the wiki declining to make the claim, and a diagram that drew
 * the type anyway would be making it on the wiki's behalf.
 */
const undocumented = (v) => /not (?:officially )?documented|treat .* as not/i.test(String(v));

export function dpadStyle(c) {
  const v = String(c.dpad ?? "");
  const known = has(c.dpad) && !undocumented(v);

  return {
    fenced: known && /fenced/i.test(v),
    keys: !known
      ? null
      : /membrane|rubber.?dome/i.test(v)
      ? "membrane"
      : /micro.?switch|mechanical|tactile/i.test(v)
      ? "segmented"
      : null,
    lit: known && /rgb|illuminat/i.test(v),
  };
}

const faceStyle = (c) => {
  const v = String(c.faceButtons ?? "");
  return {
    blank: /no printed symbols|unlettered/i.test(v),
    lit: /rgb|illuminat|led-lit|led lit/i.test(v),
  };
};

const stickStyle = (c) => ({
  glideRing: /glide ring/i.test(String(c.sticks?.tech ?? "")),
});

/** First clause of a prose field, for a readout line that has to stay short. */
const brief = (v, max = 96) => {
  if (!v) return null;
  let s = String(v).split(/\.\s+/)[0].replace(/\.$/, "");
  if (s.length > max) s = s.slice(0, max - 1).replace(/[\s,;:—-]+$/, "") + "\u2026";
  return s;
};

const has = (v) => v !== null && v !== undefined && v !== "" && v !== false;

/**
 * Label and explanation for every control a diagram might draw. Specifics come
 * from the model's own record where the data has them, so a readout says
 * "Hall Effect analog" rather than "analog" when that is documented.
 */
function partInfo(c) {
  const info = buildPartInfo(c);
  // The key ties a hotspot to its highlight, so it is stamped onto each entry
  // rather than tracked separately in two places.
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

/* --------------------------------------------------------- shell geometry */

/**
 * Every view is drawn in a 400 x 280 space at two units per millimetre, with
 * the shell's top edge on a fixed line so the shoulder row lines up from one
 * model to the next. A model's published width and height therefore decide
 * how large it draws: the T7 Pro's 145 x 93 mm shell is visibly the smallest
 * in this range and the Tarantula Pro's 158 x 100 mm the largest, which is a
 * figure the specification table already carries.
 *
 * The contour is not a per-model claim. Nobody publishes a shell profile, so
 * each family has one outline, held in fractions of the shell's own width and
 * height, and a model deforms it to its own proportions rather than being
 * given a silhouette somebody drew from memory.
 */
const UNITS_PER_MM = 2;

/** The line every view puts the top edge on. Triggers sit above it. */
const TOP_EDGE = 56;

/**
 * Used for a record with no dimensions and no documented sibling to borrow
 * from — the generic reference pad on the home page, mainly. The middle of
 * the range, so it is not quietly a copy of one particular model.
 */
const TYPICAL_MM = { width: 154, height: 103, depth: 60 };

/**
 * Published dimensions by model id, so a model GameSir has not measured in
 * public can borrow a named sibling's shell instead of a guess. The build
 * registers the data file once before it renders anything.
 */
let PUBLISHED_MM = new Map();

export function useDimensions(controllers = []) {
  PUBLISHED_MM = new Map(
    controllers.filter((c) => c?.dimensionsMm).map((c) => [c.id, c.dimensionsMm])
  );
}

function shellSize(c) {
  if (c.dimensionsMm) return { mm: c.dimensionsMm, borrowed: null };
  const from = layoutOf(c).shellFrom;
  const sibling = from ? PUBLISHED_MM.get(from) : null;
  if (sibling) return { mm: sibling, borrowed: from };
  return { mm: TYPICAL_MM, borrowed: null };
}

/**
 * The frame a view is drawn against. `at(u, v)` turns shell-relative
 * coordinates — u across from the centre line, v down from the top edge — into
 * the drawing's own, so a control keeps its place on the shell whatever size
 * that shell is.
 */
function shellBox(c) {
  const L = layoutOf(c);
  const { mm, borrowed } = shellSize(c);
  const w = mm.width * UNITS_PER_MM;
  const h = mm.height * UNITS_PER_MM;

  return {
    family: L.family === "symmetric" ? "symmetric" : "offset",
    mm,
    borrowed,
    w,
    h,
    halfW: w / 2,
    top: TOP_EDGE,
    // Controls are sized against the shell they sit on rather than in fixed
    // units. A stick well is much the same size on every pad in this range, but
    // drawing one at a fixed size on a shell 10% shorter crowds it into its
    // neighbours — and the whole point of scaling the shell is that a compact
    // model reads as compact, which a full-size cluster on it would undo.
    scale: h / 206,
    at: (u, v) => [200 + (u * w) / 2, TOP_EDGE + v * h],
  };
}

/**
 * The left half of a shell in fractions of its width and height: u = -1 is the
 * left edge, v = 1 the bottom of the grip. The numbers look measured rather
 * than round because they are — this is the outline the module has drawn since
 * the diagrams existed, made resizable.
 */
const OUTLINE = {
  top: [
    { c1: [-0.133, 0], c2: [-0.291, -0.019], to: [-0.461, 0] },
    { c1: [-0.63, 0.019], c2: [-0.788, 0.076], to: [-0.897, 0.19] },
  ],
  side: [
    { c1: [-0.982, 0.286], c2: [-1.012, 0.4], to: [-0.994, 0.514] },
    { c1: [-0.976, 0.657], c2: [-0.909, 0.81], to: [-0.776, 0.905] },
  ],
  gripTip: { c1: [-0.667, 0.981], c2: [-0.521, 1], to: [-0.412, 0.943] },
  gripInner: { c1: [-0.327, 0.9], c2: [-0.291, 0.838], to: [-0.267, 0.743] },
  // Where the families genuinely differ: an offset-stick pad has a deep notch
  // between the grips, and a symmetric one fills it with the sticks.
  notch: {
    offset: [
      { c1: [-0.248, 0.712], c2: [-0.206, 0.674], to: [-0.121, 0.665] },
      { c1: [-0.079, 0.66], c2: [-0.036, 0.66], to: [0, 0.66] },
    ],
    symmetric: [{ c1: [-0.242, 0.726], c2: [-0.182, 0.7], to: [-0.085, 0.695] }],
  },
};

/** Where the bottom edge of the shell runs between the grips. */
const notchDepth = (box) => OUTLINE.notch[box.family].at(-1).to[1];

const halfOutline = (box) => [
  ...OUTLINE.top,
  ...OUTLINE.side,
  OUTLINE.gripTip,
  OUTLINE.gripInner,
  ...OUTLINE.notch[box.family],
];

const xy = ([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`;

/** Mirrors a point about the centre line, which every shell is symmetric on. */
const flipX = ([x, y]) => [400 - x, y];

const bezierAt = (p0, p1, p2, p3, t) => {
  const u = 1 - t;
  const f = (a, b, c, d) => u ** 3 * a + 3 * u * u * t * b + 3 * u * t * t * c + t ** 3 * d;
  return [f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])];
};

const bezierTangent = (p0, p1, p2, p3, t) => {
  const u = 1 - t;
  const f = (a, b, c, d) => 3 * (u * u * (b - a) + 2 * u * t * (c - b) + t * t * (d - c));
  return [f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])];
};

/** The shell outline: the half above, then the same segments mirrored back. */
function shellPath(box) {
  const p = (uv) => xy(box.at(uv[0], uv[1]));
  const flip = (uv) => [-uv[0], uv[1]];
  const segs = halfOutline(box);

  let d = `M ${p([0, 0])}`;
  for (const s of segs) d += ` C ${p(s.c1)} ${p(s.c2)} ${p(s.to)}`;

  // The symmetric family's notch stops short of the centre line, so its two
  // halves are joined across it instead of meeting at a point.
  if (box.family === "symmetric") d += ` L ${p(flip(segs.at(-1).to))}`;

  const back = [...segs].reverse();
  back.forEach((s, i) => {
    const from = i + 1 < back.length ? back[i + 1].to : [0, 0];
    d += ` C ${p(flip(s.c2))} ${p(flip(s.c1))} ${p(flip(from))}`;
  });

  return `${d} Z`;
}

/** The outline as a polygon, which is what the containment check tests against. */
function shellPolygon(box, steps = 12) {
  const left = [box.at(0, 0)];
  let from = [0, 0];

  for (const s of halfOutline(box)) {
    const p0 = box.at(...from);
    const c1 = box.at(...s.c1);
    const c2 = box.at(...s.c2);
    const p1 = box.at(...s.to);
    for (let i = 1; i <= steps; i++) left.push(bezierAt(p0, c1, c2, p1, i / steps));
    from = s.to;
  }

  return [...left, ...left.map(flipX).reverse()];
}

/**
 * A stretch of an outline, sampled with the inward normal at each point. The
 * shoulder row, the lighting channels and the grip texture are all built from
 * this rather than from fixed rectangles and arcs, which is what keeps them on
 * the shell they belong to when that shell changes size.
 */
function sampleEdge(at, segs, startUV, steps = 24) {
  const out = [];
  let from = startUV;

  segs.forEach((s, n) => {
    const p0 = at(...from);
    const c1 = at(...s.c1);
    const c2 = at(...s.c2);
    const p1 = at(...s.to);

    for (let i = n === 0 ? 0 : 1; i <= steps; i++) {
      const t = i / steps;
      const [x, y] = bezierAt(p0, c1, c2, p1, t);
      const [dx, dy] = bezierTangent(p0, c1, c2, p1, t);
      const len = Math.hypot(dx, dy) || 1;
      out.push({ x, y, nx: dy / len, ny: -dx / len });
    }
    from = s.to;
  });

  // Cumulative length, so "a third of the way along the edge" means the same
  // thing on every shell rather than depending on where the curve was cut.
  let run = 0;
  out[0].at = 0;
  for (let i = 1; i < out.length; i++) {
    run += Math.hypot(out[i].x - out[i - 1].x, out[i].y - out[i - 1].y);
    out[i].at = run;
  }
  for (const s of out) s.at /= run || 1;

  return out;
}

const topEdge = (box) => sampleEdge(box.at, OUTLINE.top, [0, 0]);
const sideEdge = (box) => sampleEdge(box.at, OUTLINE.side, OUTLINE.top.at(-1).to);

/** The points between two fractions along a sampled edge, ends included. */
function edgeSpan(edge, from, to, steps = 18) {
  const at = (f) => {
    const i = Math.max(1, edge.findIndex((s) => s.at >= f));
    const a = edge[i - 1];
    const b = edge[i];
    const k = (f - a.at) / (b.at - a.at || 1);
    const mix = (p, q) => p + (q - p) * k;
    return { x: mix(a.x, b.x), y: mix(a.y, b.y), nx: mix(a.nx, b.nx), ny: mix(a.ny, b.ny) };
  };

  return Array.from({ length: steps + 1 }, (_, i) => at(from + ((to - from) * i) / steps));
}

const mirrorSpan = (span) =>
  span.map((s) => ({ x: 400 - s.x, y: s.y, nx: -s.nx, ny: s.ny }));

const spanOffset = (s, off) => [s.x + s.nx * off, s.y + s.ny * off];

/**
 * A part moulded into the edge: the ribbon between two offsets measured along
 * the inward normal. Negative is outboard, so a trigger is the same call as a
 * bumper with its offsets on the far side of the edge. The ends taper on a
 * quarter circle, which is what stops the shoulder row reading as four pills
 * laid on top of the drawing.
 */
function edgeBand(span, inner, outer) {
  const mid = (inner + outer) / 2;
  const half = (outer - inner) / 2;
  const lip = (i) => {
    const f = i / (span.length - 1);
    const e = Math.min(f, 1 - f) / 0.1;
    return e >= 1 ? 1 : Math.sqrt(1 - (1 - e) ** 2);
  };
  const side = (k) => span.map((s, i) => spanOffset(s, mid + half * lip(i) * k));

  return `M ${[...side(-1), ...side(1).reverse()].map(xy).join(" L ")} Z`;
}

/** A line following the outline at a fixed distance inside it. */
const edgeLine = (span, offset) =>
  `M ${span.map((s) => xy(spanOffset(s, offset))).join(" L ")}`;

/**
 * A ribbon's space, as several boxes along it rather than one around the whole
 * thing. One box round a curved band would claim most of the shoulder as
 * occupied and report every button under it as a collision; in chunks it
 * describes where the part actually is.
 */
function bandBoxes(span, inner, outer, chunks = 6) {
  const per = Math.max(1, Math.floor((span.length - 1) / chunks));
  const out = [];

  for (let i = 0; i < span.length - 1; i += per) {
    const slice = span.slice(i, Math.min(i + per + 1, span.length));
    const pts = slice.flatMap((s) => [spanOffset(s, inner), spanOffset(s, outer)]);
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const mid = slice[Math.floor(slice.length / 2)];
    out.push({
      anchor: [mid.x, mid.y],
      hit: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)],
      shape: "rect",
    });
  }

  return out;
}

/**
 * Bumper, trigger and — on the models whose record documents them — the mini
 * bumper, all placed by fraction along the shell's own top edge rather than by
 * coordinate. A narrower shell gets a proportionally narrower shoulder row,
 * which is what keeps the row in place on the T7 Pro.
 *
 * The mini bumpers sit immediately inboard of the bumper, where the hardware
 * has them, and stay clear of the centre of the edge, which belongs to the
 * USB-C port.
 */
const SHOULDER = {
  // Offsets straddle the edge, because that is where these parts are: a bumper
  // is on the top face, wrapping over the edge, and a trigger is behind it. The
  // inboard end of each runs under the shell, which is drawn between the two
  // so the trigger emerges from behind it rather than hovering over the
  // drawing the way a floating rectangle does.
  // The trigger's own label goes near its outer end rather than in the middle
  // of it, which is behind the bumper.
  trigger: { from: 0.34, to: 0.84, inner: 16, outer: -44, cls: "d-part", labelAt: -31 },
  bumper: { from: 0.3, to: 0.85, inner: 8, outer: -16, cls: "d-part-2" },
  // Inboard of the bumper but clear of the middle of the edge, which is where
  // the USB-C port is. The old drawing put those two on top of each other.
  mini: { from: 0.15, to: 0.27, inner: 6, outer: -14, cls: "d-part-2" },
};

function shoulderRow(box, info, { mini }) {
  const edge = topEdge(box);
  const behind = [];
  const front = [];

  const piece = (into, part, spec, label, cls, right) => {
    if (!part) return;
    const [inner, outer] = [spec.inner * box.scale, spec.outer * box.scale];
    const span = right
      ? mirrorSpan(edgeSpan(edge, spec.from, spec.to))
      : edgeSpan(edge, spec.from, spec.to);
    const [lx, ly] = spanOffset(
      span[Math.floor(span.length / 2)],
      (spec.labelAt ?? (inner + outer) / 2) * (spec.labelAt ? box.scale : 1)
    );

    into.push({
      part,
      markup: path(edgeBand(span, inner, outer), spec.cls) + text(lx, ly, label, cls),
      boxes: bandBoxes(span, inner, outer),
      edge: true,
      group: "shoulder",
      behind: into === behind,
    });
  };

  piece(behind, info.lt, SHOULDER.trigger, "LT", "d-label", false);
  piece(behind, info.rt, SHOULDER.trigger, "RT", "d-label", true);
  piece(front, info.lb, SHOULDER.bumper, "LB", "d-label d-label-sm", false);
  piece(front, info.rb, SHOULDER.bumper, "RB", "d-label d-label-sm", true);

  if (mini) {
    piece(front, info.l5, SHOULDER.mini, "L5", "d-label d-label-xs", false);
    piece(front, info.r5, SHOULDER.mini, "R5", "d-label d-label-xs", true);
  }

  return { behind, front };
}

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
const faceCluster = (cx, cy, spread, r, order, { blank = false, lit = false } = {}) => {
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
        // An illuminated cap sits in its own halo, which is the difference you
        // see on the models whose caps are lit from behind.
        (lit ? circle(x, y, r + 3.2, `d-lit d-lit-${tint}`) : "") +
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

/**
 * Stick well. The glide ring is drawn only for the models whose own record
 * documents one, since it is a visible band around the cap rather than a
 * detail of the sensor underneath.
 */
const stickWell = (cx, cy, label, r = 28, { glideRing = false } = {}) =>
  circle(cx, cy, r, "d-recess") +
  (glideRing ? circle(cx, cy, r - 4.5, "d-glide-ring") : "") +
  circle(cx, cy, r - 9, "d-part") +
  circle(cx, cy, r - 17, "d-part-inset") +
  text(cx, cy + 0.5, label, "d-label d-label-sm");

/** Direction arrows, scaled to whichever pad shape they are sitting on. */
const dpadArrows = (cx, cy, arm) => {
  const [d, s, t] = [arm * 0.71, arm * 0.145, arm * 0.19].map((n) => Number(n.toFixed(2)));
  return (
    `<g class="d-glyph d-glyph-stroke"><path d="M${cx} ${cy - d}l-${s} ${t}h${s * 2}z` +
    `M${cx} ${cy + d}l-${s} -${t}h${s * 2}z` +
    `M${cx - d} ${cy}l${t} -${s}v${s * 2}z` +
    `M${cx + d} ${cy}l-${t} -${s}v${s * 2}z"/></g>`
  );
};

/**
 * D-pad, in whichever of the three shapes this range uses. A micro-switch pad
 * is four separate keys with a gap at the middle; a membrane pad is one
 * moulded piece with a domed centre; a fenced pad adds the raised ring. Which
 * one a model gets comes from `dpadStyle`, so the drawing cannot contradict
 * the switch type the specification table prints.
 */
const dpadShape = (cx, cy, arm = 19, { fenced = false, keys = null, lit = false } = {}) => {
  const fence = fenced ? circle(cx, cy, arm * 1.3, "d-fence") : "";
  const glow = lit ? circle(cx, cy, arm * 1.12, "d-lit") : "";

  if (keys === "segmented") {
    const key = (dx, dy) => {
      const long = arm * 0.84;
      const across = arm * 0.72;
      const [w, h] = dx ? [long, across] : [across, long];
      return rect(
        cx + dx * arm * 0.53 - w / 2,
        cy + dy * arm * 0.53 - h / 2,
        w,
        h,
        Math.min(w, h) * 0.3,
        "d-part"
      );
    };
    return (
      fence +
      glow +
      key(0, -1) +
      key(1, 0) +
      key(0, 1) +
      key(-1, 0) +
      circle(cx, cy, arm * 0.2, "d-part-inset") +
      dpadArrows(cx, cy, arm)
    );
  }

  if (keys === "membrane") {
    return (
      fence +
      glow +
      path(plusPath(cx, cy, arm, arm * 0.88), "d-part") +
      circle(cx, cy, arm * 0.34, "d-part-inset") +
      dpadArrows(cx, cy, arm)
    );
  }

  return fence + glow + path(plusPath(cx, cy, arm, arm * 0.78), "d-part") + dpadArrows(cx, cy, arm);
};

/* -------------------------------------------------------- controller views */

/**
 * Collects a view as placements rather than as a string of markup, so the
 * build can check the arithmetic that positioned each part before the drawing
 * is published. See `checkControllerViews`.
 */
function viewParts(box) {
  const parts = [];

  /**
   * The space one shape occupies. Every placement declares which shape it is,
   * because the containment check probes the outline of that shape: the
   * corners of a square drawn round a diamond of face buttons are empty air,
   * and testing them would report a cluster as hanging off the shell.
   */
  const spaceAt = (u, v, size, shape = "rect") => {
    const [x, y] = box.at(u, v);
    const [w, h] = (Array.isArray(size) ? size : [size, size]).map((n) => n * box.scale);
    return { anchor: [x, y], hit: [x - w / 2, y - h / 2, x + w / 2, y + h / 2], shape };
  };

  /**
   * `u` and `v` are shell-relative and `size` is in reference units, which the
   * shell's own scale is applied to. The draw callback is handed that scale as
   * its third argument so the shape it draws matches the space reserved for it.
   */
  const put = (part, u, v, size, draw, opts = {}) => {
    if (!part) return;
    const { shape, ...rest } = opts;
    const [x, y] = box.at(u, v);
    parts.push({
      part,
      markup: draw(x, y, box.scale),
      boxes: [spaceAt(u, v, size, shape)],
      ...rest,
    });
  };

  /**
   * Several shapes under one name — the extra front controls, which the data
   * documents as a set rather than individually. One hotspot, so the readout
   * describes the set, but every shape in it is placed and checked.
   */
  const group = (part, spots, draw, opts = {}) => {
    if (!part) return;
    parts.push({
      part,
      markup: draw(
        spots.map((s) => ({ ...s, at: box.at(s.u, s.v) })),
        box.scale
      ),
      boxes: spots.map((s) => spaceAt(s.u, s.v, s.size, s.shape)),
      ...opts,
    });
  };

  /** Markup that is not a control: lighting, seams, texture. */
  const mark = (part, markup) => {
    if (part) parts.push({ part, markup, boxes: [], loose: true });
  };

  /**
   * The four caps of an ABXY cluster, each as its own space. A cluster is a
   * diamond of buttons with empty air at the corners, and treating it as one
   * square is what would have the right stick colliding with the A button it
   * is comfortably clear of.
   */
  const capSpots = (u, v, spread, r) => {
    const du = (spread * box.scale) / box.halfW;
    const dv = (spread * box.scale) / box.h;
    return [
      { u, v: v - dv, size: r * 2, shape: "circle" },
      { u: u + du, v, size: r * 2, shape: "circle" },
      { u, v: v + dv, size: r * 2, shape: "circle" },
      { u: u - du, v, size: r * 2, shape: "circle" },
    ];
  };

  return { parts, put, group, mark, capSpots };
}

const render = (list) =>
  list.map((e) => (e.part ? hotspot(e.part, e.markup) : e.markup)).join("");

/** A shell for the figures that are about the hardware in general. */
const genericShell = () => shellBox({ id: "generic-pad" });

/** The same shell scaled about its own centre, for the faceplate seam. */
const insetShell = (box, k) => ({
  ...box,
  w: box.w * k,
  h: box.h * k,
  halfW: box.halfW * k,
  at: (u, v) => [200 + (u * box.w * k) / 2, box.top + (box.h * (1 - k)) / 2 + v * box.h * k],
});

/**
 * Lighting channels, set into the grips a fixed distance inside the outline so
 * they follow the shell instead of being two arcs that happened to fit one
 * size of it. Only along the grip, because that is where the models that have
 * them put them.
 */
const lightingChannels = (box) => {
  const span = edgeSpan(sideEdge(box), 0.46, 0.94);
  const inset = 10 * box.scale;
  return path(edgeLine(span, inset), "d-rgb") + path(edgeLine(mirrorSpan(span), inset), "d-rgb");
};

/** Front view. */
function frontView(c) {
  const L = layoutOf(c);
  const box = shellBox(c);
  const info = partInfo(c);
  const eb = c.extraButtons ?? {};
  const dpad = dpadStyle(c);
  const face = faceStyle(c);
  const stick = stickStyle(c);
  const { parts, put, group, mark, capSpots } = viewParts(box);

  const { behind, front } = shoulderRow(box, info, { mini: (eb.extraBumpers ?? 0) >= 2 });

  // The plate is the whole front, so the seam is an inset of the outline
  // rather than an arc across the middle.
  const seam = c.faceplates?.swappable
    ? [{ part: info.faceplate, markup: path(shellPath(insetShell(box, 0.93)), "d-seam"), loose: true }]
    : [];

  if (box.family === "symmetric") {
    // Tarantula Pro: D-pad and face cluster mirrored across the upper face,
    // sticks side by side below them, and a centre panel carrying the gear
    // window, the Home key and the extra front controls.
    put(info.dpad, -0.57, 0.28, 46, (x, y, s) => dpadShape(x, y, 23 * s, dpad), {
      shape: "diamond",
    });
    group(info.face, capSpots(0.57, 0.28, 27, 12), (spots, s) => {
      const [x, y] = box.at(0.57, 0.28);
      return faceCluster(x, y, 27 * s, 12 * s, XBOX_ORDER, {
        blank: L.blankCaps || face.blank,
        lit: face.lit,
      });
    });
    put(info.ls, -0.364, 0.581, 50, (x, y, s) => stickWell(x, y, "LS", 25 * s, stick), {
      shape: "circle",
    });
    put(info.rs, 0.364, 0.581, 50, (x, y, s) => stickWell(x, y, "RS", 25 * s, stick), {
      shape: "circle",
    });

    put(info.view, -0.3, 0.17, 20, (x, y, s) => circle(x, y, 10 * s, "d-btn-sm") + viewGlyph(x, y), {
      shape: "circle",
    });
    put(info.menu, 0.3, 0.17, 20, (x, y, s) => circle(x, y, 10 * s, "d-btn-sm") + menuGlyph(x, y), {
      shape: "circle",
    });

    if (L.faceSwap === "gear") {
      // Teeth around a hub, not spokes through a filled centre: a red dot here
      // would read as a second Home key beside the real one.
      put(info.faceSwap, 0, 0.29, [42, 34], (x, y, s) =>
        rect(x - 21 * s, y - 17 * s, 42 * s, 34 * s, 8, "d-window") +
        circle(x, y, 13 * s, "d-gear") +
        circle(x, y, 4.5 * s, "d-part-inset") +
        path(
          Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4;
            const [dx, dy] = [Math.cos(a), Math.sin(a)];
            return `M${(x + dx * 8 * s).toFixed(1)} ${(y + dy * 8 * s).toFixed(1)}L${(
              x +
              dx * 12 * s
            ).toFixed(1)} ${(y + dy * 12 * s).toFixed(1)}`;
          }).join(""),
          "d-ink"
        )
      );
    }

    // Home sits low between the sticks, the only part of the centre column the
    // panel above it leaves free.
    put(info.guide, 0, 0.53, 24, (x, y, s) => guideGlyph(x, y, 12 * s), { shape: "circle" });

    if (L.extraFront) {
      // Two keys above the centre panel, two below, and an actuator either
      // side of it — the arrangement hands-on coverage describes.
      group(
        info.extraFront,
        [
          { u: -0.105, v: 0.125, size: 15, shape: "circle", label: "C1" },
          { u: 0.105, v: 0.125, size: 15, shape: "circle", label: "C2" },
          { u: -0.105, v: 0.45, size: 15, shape: "circle", label: "C3" },
          { u: 0.105, v: 0.45, size: 15, shape: "circle", label: "C4" },
          { u: -0.245, v: 0.29, size: [12, 22], label: "T1" },
          { u: 0.245, v: 0.29, size: [12, 22], label: "T2" },
        ],
        (spots, s) =>
          spots
            .map(({ at: [x, y], label, shape }) =>
              shape === "circle"
                ? circle(x, y, 7.5 * s, "d-btn-sm") + text(x, y + 0.4, label, "d-label d-label-xs")
                : rect(x - 6 * s, y - 11 * s, 12 * s, 22 * s, 6, "d-btn-sm") +
                  text(x, y - 16 * s, label, "d-label d-label-xs")
            )
            .join("")
      );
    }
  } else {
    // Offset layout: left stick high, D-pad low on the left, ABXY high on the
    // right, right stick below it.
    put(info.ls, -0.545, 0.29, 56, (x, y, s) => stickWell(x, y, "LS", 28 * s, stick), {
      shape: "circle",
    });
    group(info.face, capSpots(0.582, 0.29, 29, 11.5), (spots, s) => {
      const [x, y] = box.at(0.582, 0.29);
      return faceCluster(x, y, 29 * s, 11.5 * s, L.centre === "nintendo" ? NINTENDO_ORDER : XBOX_ORDER, {
        blank: L.blankCaps || face.blank,
        lit: face.lit,
      });
    });
    put(
      info.dpad,
      -0.364,
      0.571,
      dpad.fenced ? 55 : 42,
      (x, y, s) => dpadShape(x, y, 21 * s, dpad),
      { shape: dpad.fenced ? "circle" : "diamond" }
    );
    put(info.rs, 0.352, 0.581, 56, (x, y, s) => stickWell(x, y, "RS", 28 * s, stick), {
      shape: "circle",
    });

    put(
      info.view,
      -0.255,
      0.229,
      21,
      (x, y, s) =>
        circle(x, y, 10.5 * s, "d-btn-sm") +
        (L.centre === "nintendo" ? minusGlyph(x, y) : viewGlyph(x, y)),
      { shape: "circle" }
    );
    put(
      info.menu,
      0.255,
      0.229,
      21,
      (x, y, s) =>
        circle(x, y, 10.5 * s, "d-btn-sm") +
        (L.centre === "nintendo" ? plusGlyph(x, y) : menuGlyph(x, y)),
      { shape: "circle" }
    );
    put(info.guide, 0, 0.124, 32, (x, y, s) => guideGlyph(x, y, 16 * s), { shape: "circle" });

    if (L.profiles) {
      put(info.profiles, 0, 0.314, [38, 12], (x, y, s) =>
        rect(x - 19 * s, y - 6 * s, 38 * s, 12 * s, 6, "d-part-inset") +
        Array.from({ length: L.profiles }, (_, i) =>
          rect(
            x + (i * 7.5 - 14.5) * s,
            y - 3 * s,
            4.5 * s,
            6 * s,
            2.2,
            i === 0 ? "d-accent-fill" : "d-dim-fill"
          )
        ).join("")
      );
    } else {
      put(info.share, 0, 0.314, 17, (x, y, s) => circle(x, y, 8.5 * s, "d-btn-sm") + shareGlyph(x, y), {
        shape: "circle",
      });
    }

    // The button faces of this range only ever carry an "M", whatever the
    // manual calls it, so the circle is labelled M and the readout spells it
    // out. On the two models with a mute key beside it, the pair sits low on
    // the face, which is where the SE's and HE's notes put the M button:
    // below the D-pad row rather than in the centre column.
    if (L.mode) {
      const paired = L.micMute;
      put(
        info.mode,
        paired ? -0.105 : 0,
        paired ? 0.5 : 0.43,
        paired ? 17 : 19,
        (x, y, s) =>
          circle(x, y, (paired ? 8.5 : 9.5) * s, "d-btn-sm") +
          text(x, y + 0.4, "M", "d-label d-label-xs"),
        { shape: "circle" }
      );

      if (paired) {
        put(
          info.micMute,
          0.105,
          0.5,
          17,
          (x, y, s) =>
            circle(x, y, 8.5 * s, "d-btn-sm") +
            `<g class="d-glyph d-glyph-stroke"><path d="M${x - 3} ${
              y - 3.5
            }a3 3 0 0 1 6 0v3a3 3 0 0 1-6 0zM${x - 5.5} ${y - 0.5}a5.5 5.5 0 0 0 11 0M${x} ${
              y + 5
            }v1.5"/></g>`,
          { shape: "circle" }
        );
      }
    }

    if (L.faceSwap === "detach") {
      // Ring around the cluster the caps come off, kept inside the shell: the
      // readout explains the swap, so it does not need an arrow pointing off
      // the edge of the drawing to say so.
      mark(
        info.faceSwap,
        (() => {
          const [x, y] = box.at(0.582, 0.29);
          return circle(x, y, 42 * box.scale, "d-swap-ring");
        })()
      );
    }
  }

  if (L.rgb) mark(info.rgb, lightingChannels(box));

  // The jack is on the bottom edge between the grips, as it is on the
  // hardware, rather than out on the face where it used to be drawn.
  if (c.audioJack) {
    put(
      info.jack,
      0,
      notchDepth(box),
      [22, 13],
      (x, y, s) =>
        rect(x - 11 * s, y - 13 * s, 22 * s, 13 * s, 5, "d-port") +
        circle(x, y - 6.5 * s, 3.4 * s, "d-part-inset"),
      { edge: true }
    );
  }

  const drawn = [
    ...behind,
    { markup: path(shellPath(box), "d-body") },
    ...seam,
    ...front,
    ...parts,
  ];

  return {
    svg: svg("0 0 400 280", render(drawn), {
      label: `${c.name} front layout diagram: sticks, D-pad, ABXY buttons, bumpers, triggers and centre buttons`,
      cls: "diagram-controller",
    }),
    geometry: { polygon: shellPolygon(box), parts: [...behind, ...front, ...parts] },
  };
}

/** Back view: ports, rear paddles and whatever switches the model documents. */
function backView(c) {
  const L = layoutOf(c);
  const box = shellBox(c);
  const info = partInfo(c);
  const eb = c.extraButtons ?? {};
  const { parts, put, mark } = viewParts(box);

  const { behind, front } = shoulderRow(box, info, { mini: (eb.extraBumpers ?? 0) >= 2 });

  put(
    info.usbc,
    0,
    0.015,
    [36, 15],
    (x, y) =>
      rect(x - 18, y - 7.5, 36, 15, 7.5, "d-port") +
      rect(x - 12, y - 3, 24, 6, 3, "d-part-inset") +
      text(x, y + 20, "USB-C", "d-label d-label-xs"),
    { edge: true }
  );

  if (c.triggers?.triggerStops === true) {
    // The switch is on the back of each shoulder, so it follows the shell out
    // to where the trigger it shortens actually is.
    put(info.gear, -0.55, 0.19, [34, 15], (x, y) =>
      rect(x - 17, y - 7.5, 34, 15, 7.5, "d-part-2") +
      rect(x - 14, y - 4.5, 12, 9, 4.5, "d-accent-fill") +
      text(x, y + 20, "stop", "d-label d-label-xs")
    );
    put(info.gear, 0.55, 0.19, [34, 15], (x, y) =>
      rect(x - 17, y - 7.5, 34, 15, 7.5, "d-part-2") +
      rect(x + 2, y - 4.5, 12, 9, 4.5, "d-accent-fill") +
      text(x, y + 20, "stop", "d-label d-label-xs")
    );
  }

  const paddles = eb.backButtons ?? 0;
  const paddle = (part, u, label, tilt) =>
    put(part, u, 0.79, [26, 50], (x, y) =>
      `<g transform="rotate(${tilt} ${x} ${y})">${rect(x - 13, y - 25, 26, 50, 13, "d-part-2")}</g>` +
      text(x, y, label, "d-label d-label-sm")
    );

  if (paddles >= 1) paddle(info.l4, -0.645, "L4", -15);
  if (paddles >= 2) paddle(info.r4, 0.645, "R4", 15);

  // The latch slides inboard of the paddle it locks, which is the only place
  // on the grip it can be without fouling the paddle's travel.
  const latch = (u, sign) =>
    L.latches === true
      ? (x, y) =>
          rect(x - 6.5, y - 13, 13, 26, 6, "d-part-inset") +
          rect(x - 4, y - 10, 8, 9, 4, "d-accent-fill") +
          text(x + sign * 2, y + 23, "lock", "d-label d-label-xs")
      : (x, y) =>
          rect(x - 6.5, y - 13, 13, 26, 6, "d-absent") +
          path(`M ${x - 6.5} ${y + 13} L ${x + 6.5} ${y - 13}`, "d-slash-line") +
          text(x + sign * 2, y + 23, "no lock", "d-label d-label-xs d-dim-text");

  if (L.latches === true || L.latches === false) {
    put(info.latch, -0.43, 0.735, [13, 26], latch(-0.43, -1));
    put(info.latch, 0.43, 0.735, [13, 26], latch(0.43, 1));
  }

  if (L.modeSwitch) {
    put(info.modeSwitch, 0, 0.45, [48, 16], (x, y) =>
      rect(x - 24, y - 8, 48, 16, 8, "d-part-inset") +
      rect(x - 21, y - 5, 13, 10, 5, "d-accent-fill") +
      text(x, y + 20, "2.4G / OFF / BT", "d-label d-label-xs")
    );
  }

  // Contour lines down the inside of both grips, following the shell rather
  // than four arcs that only ever fitted one size of it.
  const grip = edgeSpan(sideEdge(box), 0.62, 0.98);
  mark(
    info.grip,
    [
      path(edgeLine(grip, 12), "d-texture"),
      path(edgeLine(grip, 26), "d-texture"),
      path(edgeLine(mirrorSpan(grip), 12), "d-texture"),
      path(edgeLine(mirrorSpan(grip), 26), "d-texture"),
    ].join("")
  );

  const drawn = [...behind, { markup: path(shellPath(box), "d-body") }, ...front, ...parts];

  return {
    svg: svg("0 0 400 280", render(drawn), {
      label: `${c.name} back layout diagram: USB-C port, rear buttons and rear switches`,
      cls: "diagram-controller",
    }),
    geometry: { polygon: shellPolygon(box), parts: [...behind, ...front, ...parts] },
  };
}

/**
 * The top edge, seen from above: the shell's own width, and its published
 * depth for how thick it draws. The port is on that edge between the two
 * triggers, where the hardware has it — the older drawing put it in front of
 * the bumpers, on a face that from this angle is not visible at all.
 */
const TOP_OUTLINE = {
  start: [-0.807, 0.875],
  corner: { c1: [-0.928, 0.839], c2: [-1, 0.696], to: [-0.952, 0.518] },
  back: { c1: [-0.867, 0.25], c2: [-0.651, 0.054], to: [-0.41, 0] },
  front: { c1: [0.41, 1], c2: [-0.41, 1] },
  // The back edge again, walked outward from the centre line: the flat middle
  // of it, then the same curve as `back` in the other direction. The shoulder
  // row is laid along this the way the front view lays it along the shell.
  edge: [
    { c1: [-0.137, 0], c2: [-0.273, 0], to: [-0.41, 0] },
    { c1: [-0.651, 0.054], c2: [-0.867, 0.25], to: [-0.952, 0.518] },
  ],
};

function topShell(box) {
  const thick = box.mm.depth * UNITS_PER_MM;
  const at = (u, v) => [200 + u * box.halfW, 30 + v * thick];
  const p = (uv) => xy(at(uv[0], uv[1]));
  const flip = (uv) => [-uv[0], uv[1]];
  const { start, corner, back, front } = TOP_OUTLINE;

  const d =
    `M ${p(start)}` +
    ` C ${p(corner.c1)} ${p(corner.c2)} ${p(corner.to)}` +
    ` C ${p(back.c1)} ${p(back.c2)} ${p(back.to)}` +
    ` L ${p(flip(back.to))}` +
    ` C ${p(flip(back.c2))} ${p(flip(back.c1))} ${p(flip(corner.to))}` +
    ` C ${p(flip(corner.c2))} ${p(flip(corner.c1))} ${p(flip(start))}` +
    ` C ${p(front.c1)} ${p(front.c2)} ${p(start)} Z`;

  return { path: d, at, thick };
}

/** Top view: the shoulder row and the port edge, seen from above. */
function topView(c) {
  const box = shellBox(c);
  const info = partInfo(c);
  const eb = c.extraButtons ?? {};
  const mini = (eb.extraBumpers ?? 0) >= 2;
  const shell = topShell(box);
  const edge = sampleEdge(shell.at, TOP_OUTLINE.edge, [0, 0]);

  const behind = [];
  const parts = [];

  const piece = (into, part, spec, label, cls, right) => {
    if (!part) return;
    const span = right
      ? mirrorSpan(edgeSpan(edge, spec.from, spec.to))
      : edgeSpan(edge, spec.from, spec.to);
    const [lx, ly] = spanOffset(
      span[Math.floor(span.length / 2)],
      spec.labelAt ?? (spec.inner + spec.outer) / 2
    );

    into.push({
      part,
      markup: path(edgeBand(span, spec.inner, spec.outer), spec.cls) + text(lx, ly, label, cls),
      boxes: bandBoxes(span, spec.inner, spec.outer),
      edge: true,
      group: "shoulder",
      behind: into === behind,
    });
  };

  // Seen from above, the trigger straddles the back edge, the bumper sits in
  // front of it and the port is on the edge between the two triggers — which
  // is where the hardware puts it.
  const TOP_ROW = {
    trigger: { from: 0.3, to: 0.82, inner: 18, outer: -22, cls: "d-part", labelAt: -14 },
    bumper: { from: 0.3, to: 0.82, inner: 26, outer: 52, cls: "d-part-2" },
    mini: { from: 0.11, to: 0.24, inner: 28, outer: 50, cls: "d-part-2" },
  };

  piece(behind, info.lt, TOP_ROW.trigger, "LT", "d-label", false);
  piece(behind, info.rt, TOP_ROW.trigger, "RT", "d-label", true);
  piece(parts, info.lb, TOP_ROW.bumper, "LB", "d-label", false);
  piece(parts, info.rb, TOP_ROW.bumper, "RB", "d-label", true);

  if (mini) {
    piece(parts, info.l5, TOP_ROW.mini, "L5", "d-label d-label-xs", false);
    piece(parts, info.r5, TOP_ROW.mini, "R5", "d-label d-label-xs", true);
  }

  const [px, py] = shell.at(0, 0);
  parts.push({
    part: info.usbc,
    markup:
      rect(px - 16, py - 8, 32, 16, 8, "d-port") +
      rect(px - 10, py - 4, 20, 8, 4, "d-part-inset") +
      text(px, py + 20, "USB-C", "d-label d-label-xs"),
    boxes: [{ anchor: [px, py], hit: [px - 16, py - 8, px + 16, py + 8], shape: "rect" }],
    edge: true,
  });

  const drawn = [...behind, { markup: path(shell.path, "d-body") }, ...parts];

  return {
    svg: svg("0 0 400 170", render(drawn), {
      label: `${c.name} top edge diagram: bumpers, triggers and the USB-C port`,
      cls: "diagram-controller is-top",
    }),
    geometry: { polygon: null, parts: [...behind, ...parts] },
  };
}

/**
 * What the drawing of this model does and does not claim, for the note under
 * it. The shell is at the model's own published proportions, which is worth
 * saying because the old note said the opposite; the contour is not, which is
 * worth saying because a reader could otherwise take a schematic for a
 * tracing.
 */
export function shellNote(c) {
  const box = shellBox(c);
  const { width, height } = box.mm;
  const scaled = `Drawn at this model's published ${width} \u00d7 ${height} mm proportions`;

  if (!box.borrowed) {
    return `${scaled}; the contours are schematic and no GameSir artwork is reproduced.`;
  }

  const from = PUBLISHED_MM.get(box.borrowed);
  return (
    `Nobody has published this model's dimensions, so the shell is drawn at the ` +
    `${from.width} \u00d7 ${from.height} mm of the model it is a revision of. ` +
    `The contours are schematic and no GameSir artwork is reproduced.`
  );
}

/** All three views of one controller. */
export function controllerViews(c) {
  return [
    { id: "front", label: "Front", ...frontView(c) },
    { id: "back", label: "Back", ...backView(c) },
    { id: "top", label: "Top edge", ...topView(c) },
  ];
}

/* ------------------------------------------------------------- self-check */

/**
 * How far two placed shapes overlap, in units, measured on the shapes rather
 * than on boxes around them. A round button beside a round stick well clears
 * it by millimetres while their boxes overlap at the corner, and a check that
 * could not tell the difference would either cry wolf or have to be turned
 * down until it caught nothing.
 */
function shapeOverlap(a, b) {
  const round = (s) => s.shape === "circle" || s.shape === "diamond";
  const mid = ({ hit }) => [(hit[0] + hit[2]) / 2, (hit[1] + hit[3]) / 2];
  const radius = ({ hit }) => Math.min(hit[2] - hit[0], hit[3] - hit[1]) / 2;

  if (round(a) && round(b)) {
    const [ax, ay] = mid(a);
    const [bx, by] = mid(b);
    return radius(a) + radius(b) - Math.hypot(ax - bx, ay - by);
  }

  if (round(a) || round(b)) {
    const [disc, box] = round(a) ? [a, b] : [b, a];
    const [cx, cy] = mid(disc);
    const near = [
      Math.min(Math.max(cx, box.hit[0]), box.hit[2]),
      Math.min(Math.max(cy, box.hit[1]), box.hit[3]),
    ];
    return radius(disc) - Math.hypot(cx - near[0], cy - near[1]);
  }

  const w = Math.min(a.hit[2], b.hit[2]) - Math.max(a.hit[0], b.hit[0]);
  const h = Math.min(a.hit[3], b.hit[3]) - Math.max(a.hit[1], b.hit[1]);
  return Math.min(w, h);
}

/** Points to test for containment, following the shape rather than its box. */
function probes({ hit, shape }) {
  const [x0, y0, x1, y1] = hit;
  const [cx, cy] = [(x0 + x1) / 2, (y0 + y1) / 2];

  if (shape === "circle") {
    const r = (x1 - x0) / 2;
    return Array.from({ length: 8 }, (_, i) => {
      const a = (i * Math.PI) / 4;
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    });
  }
  if (shape === "diamond") {
    return [
      [cx, y0],
      [x1, cy],
      [cx, y1],
      [x0, cy],
    ];
  }
  return [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ];
}

const inShell = (poly, [x, y]) => {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < xi + ((y - yi) * (xj - xi)) / (yj - yi)) hit = !hit;
  }
  return hit;
};

const distanceToShell = (poly, [x, y]) =>
  Math.min(...poly.map(([px, py]) => Math.hypot(px - x, py - y)));

/**
 * What the build checks before it publishes a diagram: that every control is
 * on the shell, that the parts belonging to an edge are actually on one, and
 * that no two controls are drawn on top of each other.
 *
 * Placement is arithmetic on a model's own dimensions now, so a slip in that
 * arithmetic moves a part quietly instead of failing. This is the check that
 * would have caught the 3.5 mm jack the drawings used to put out on the middle
 * of the face, and the mini bumpers they put where the USB-C port goes.
 */
export function checkControllerViews(c) {
  const problems = [];
  const say = (view, msg) => problems.push(`${c.id} ${view}: ${msg}`);

  for (const view of controllerViews(c)) {
    const { polygon, parts } = view.geometry;
    const solid = parts.filter((p) => !p.loose);

    if (polygon) {
      for (const p of solid) {
        for (const space of p.boxes) {
          if (p.edge) {
            const gap = distanceToShell(polygon, space.anchor);
            if (gap > 22) {
              say(view.id, `${p.part.label} belongs on an edge but is ${Math.round(gap)} units from one`);
            }
          } else if (!probes(space).every((pt) => inShell(polygon, pt))) {
            say(view.id, `${p.part.label} is drawn off the shell`);
          }
        }
      }
    }

    for (let i = 0; i < solid.length; i++) {
      for (let j = i + 1; j < solid.length; j++) {
        const a = solid[i];
        const b = solid[j];
        // The shoulder row is layered on purpose: a trigger sits behind the
        // bumper in front of it, so those pairs are not a collision. Nor is a
        // part that runs under the shell and one drawn on top of it, since the
        // shell is drawn between the two and nothing of the first shows.
        if (a.part === b.part || (a.group && a.group === b.group)) continue;
        if (!!a.behind !== !!b.behind) continue;

        for (const x of a.boxes) {
          for (const y of b.boxes) {
            if (shapeOverlap(x, y) > 1) {
              say(view.id, `${a.part.label} and ${b.part.label} are drawn on top of each other`);
            }
          }
        }
      }
    }
  }

  return problems;
}

/**
 * Reduced outline for the controller cards and the model switcher: silhouette,
 * stick wells and button positions only, at a size where detail would turn to
 * mud anyway. Drawn from the same geometry as the full views, so a card is
 * that model's shell at that model's proportions.
 */
export function silhouette(c) {
  const box = shellBox(c);
  const symmetric = box.family === "symmetric";
  const edge = topEdge(box);
  const shoulder = (right) => {
    const span = right
      ? mirrorSpan(edgeSpan(edge, SHOULDER.bumper.from, SHOULDER.bumper.to))
      : edgeSpan(edge, SHOULDER.bumper.from, SHOULDER.bumper.to);
    return path(edgeBand(span, -6, 20), "s-shoulder");
  };
  const at = (u, v) => box.at(u, v);

  const cluster = symmetric
    ? path(plusPath(...at(-0.606, 0.229), 18, 14), "s-part") +
      circle(...at(0.606, 0.229), 26, "s-ring") +
      circle(...at(-0.364, 0.581), 23, "s-ring") +
      circle(...at(0.364, 0.581), 23, "s-ring")
    : circle(...at(-0.545, 0.32), 26, "s-ring") +
      circle(...at(0.582, 0.32), 28, "s-ring") +
      path(plusPath(...at(-0.364, 0.58), 18, 14), "s-part") +
      circle(...at(0.352, 0.6), 24, "s-ring");

  const body =
    shoulder(false) +
    shoulder(true) +
    path(shellPath(box), "s-body") +
    cluster +
    circle(...at(0, symmetric ? 0.53 : 0.13), 12, "s-part");

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

/**
 * D-pad close-up, drawn in the same shape the model's own layout diagram
 * uses — the two figures sit on the same page, so a fenced pad in one and a
 * bare cross in the other would read as two different D-pads.
 */
export function dpadFigure({ fenced = false, keys = null, switchType = null } = {}) {
  const cx = 84;
  const cy = 80;
  const body =
    panel(200, 170) +
    dpadShape(cx, cy, 34, { fenced, keys }) +
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
  // The shell is drawn in the 400 x 280 space and scaled into the panel, so
  // the motor positions are taken in shell coordinates and put through the
  // same transform rather than being measured off the scaled drawing.
  const box = genericShell();
  const at = (u, v) => box.at(u, v).map((n, i) => (n * 0.5 + (i ? 8 : 20)).toFixed(1));
  const [lgx, lgy] = at(-0.6, 0.83);
  const [rgx, rgy] = at(0.6, 0.83);
  const [ltx, lty] = at(-0.63, 0.14);
  const [rtx, rty] = at(0.63, 0.14);

  const body =
    panel(240, 170) +
    `<g transform="translate(20,8) scale(0.5)">${path(shellPath(box), "d-body")}</g>` +
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
    `<g transform="translate(30,34) scale(0.46)">${path(shellPath(genericShell()), "d-body")}</g>` +
    `<g transform="translate(50,2) scale(0.46)">${path(shellPath(genericShell()), "d-plate")}</g>` +
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
    .d-fence{fill:var(--inset);stroke:var(--line);stroke-width:1.4}
    .d-glide-ring{fill:none;stroke:var(--dim);stroke-width:1.6;opacity:.7}
    .d-lit{fill:color-mix(in srgb,var(--brand) 26%,transparent);stroke:none;opacity:.55}
    .d-lit-good{fill:color-mix(in srgb,var(--good) 26%,transparent)}
    .d-lit-bad{fill:color-mix(in srgb,var(--bad) 26%,transparent)}
    .d-lit-info{fill:color-mix(in srgb,var(--info) 26%,transparent)}
    .d-lit-warn{fill:color-mix(in srgb,var(--warn) 26%,transparent)}
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
