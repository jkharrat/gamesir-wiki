/**
 * Shape of data/controllers.json, and the checker that holds it to that shape.
 *
 * The wiki's premise is that every figure is either sourced or visibly absent.
 * A misspelled field silently breaks both halves of that: the value stops
 * being read, so the page prints "Not documented" for something that is in
 * fact documented, and nobody finds out because the build still succeeds.
 *
 * So the field list below is exhaustive and unknown keys are an error rather
 * than a warning. Adding a field to the data means adding it here too, which
 * is the point — the schema is the record of what a controller record may say.
 *
 * Three states are distinguished deliberately:
 *
 *   required           the key must be present and must not be null
 *   nullable           the key must be present, but null means "not documented"
 *   optional           the key may be absent entirely
 *
 * Nullable is the normal case for a specification value, because "nobody has
 * published this" is a fact the site renders rather than a hole to hide.
 * Booleans are never nullable: a null would render as a confident "No", so an
 * unknown yes/no has to be resolved before it can be published.
 */

/* ------------------------------------------------------------- field types */

const str = (o = {}) => ({ kind: "string", ...o });
const num = (o = {}) => ({ kind: "number", ...o });
const bool = (o = {}) => ({ kind: "boolean", ...o });
const url = (o = {}) => ({ kind: "url", ...o });
const date = (o = {}) => ({ kind: "date", ...o });
const oneOf = (values, o = {}) => ({ kind: "enum", values, ...o });
const obj = (fields, o = {}) => ({ kind: "object", fields, ...o });
const arr = (of, o = {}) => ({ kind: "array", of, ...o });

/* ----------------------------------------------------------------- schemas */

/** A single documented problem. The source is what separates a fix from a rumour. */
const ISSUE = obj({
  symptom: str(),
  cause: str(),
  fix: str(),
  sourceUrl: url(),
});

const FAQ = obj({
  q: str(),
  a: str(),
  sourceUrl: url(),
});

const SOURCE = obj({
  label: str(),
  url: url(),
});

/** One row of the latency table. A mode nobody measured is a null, not a zero. */
const LATENCY = obj({
  mode: str(),
  button: str({ nullable: true }),
  stick: str({ nullable: true }),
  polling: str({ nullable: true }),
});

/**
 * Curated abbreviations for the comparison table, used where the full prose
 * value is too long for a cell. Every one is optional: without it the build
 * condenses the full value instead, which is usually good enough.
 */
const SHORT = obj({
  msrp: str({ nullable: true, optional: true }),
  platforms: str({ nullable: true, optional: true }),
  sticks: str({ nullable: true, optional: true }),
  triggers: str({ nullable: true, optional: true }),
  dpad: str({ nullable: true, optional: true }),
  polling: str({ nullable: true, optional: true }),
  resolution: str({ nullable: true, optional: true }),
  centerError: str({ nullable: true, optional: true }),
  claimedLife: str({ nullable: true, optional: true }),
  software: str({ nullable: true, optional: true }),
  weight: str({ nullable: true, optional: true }),
});

const CONTROLLER = obj({
  // Identity. `id` becomes the page filename, so it is the one field with a
  // format rule rather than just a type.
  id: str({ slug: true }),
  name: str(),
  fullName: str(),
  tagline: str(),

  // Drives the card tint and the badge, so a typo here is visible as a
  // silently unstyled card rather than as an error.
  category: oneOf(["Multi-platform", "Xbox-style"]),
  tier: oneOf(["mid-range", "high-end", "flagship"]),

  releaseYear: num({ nullable: true, min: 2000, max: 2100 }),
  msrp: str({ nullable: true }),
  platforms: arr(str()),

  connectivity: obj({
    wired: bool(),
    dongle24g: bool(),
    bluetooth: bool(),
    notes: str({ nullable: true }),
  }),

  sticks: obj({
    tech: str({ nullable: true }),
    resolution: str({ nullable: true }),
    durability: str({ nullable: true }),
    driftResistant: bool(),
    measuredCenterError: str({ nullable: true }),
    measuredResolution: str({ nullable: true }),
    measuredNotes: str({ nullable: true }),
  }),

  triggers: obj({
    tech: str({ nullable: true }),
    triggerStops: bool(),
    notes: str({ nullable: true }),
  }),

  dpad: str({ nullable: true }),
  faceButtons: str({ nullable: true }),

  pollingRate: obj({
    pc: str({ nullable: true }),
    xbox: str({ nullable: true }),
    notes: str({ nullable: true }),
  }),

  battery: obj({
    capacity: str({ nullable: true }),
    claimedLife: str({ nullable: true }),
    notes: str({ nullable: true }),
  }),

  weight: str({ nullable: true }),
  dimensions: str({ nullable: true }),

  extraButtons: obj({
    backButtons: num({ nullable: true, min: 0, max: 12 }),
    extraBumpers: num({ nullable: true, min: 0, max: 12 }),
    remappable: bool(),
    notes: str({ nullable: true }),
  }),

  gyro: obj({
    present: bool(),
    notes: str({ nullable: true }),
  }),

  audioJack: bool(),
  rumble: str({ nullable: true }),

  faceplates: obj({
    swappable: bool(),
    notes: str({ nullable: true }),
  }),

  software: str({ nullable: true }),
  notableFeatures: arr(str()),
  measuredLatency: arr(LATENCY),
  knownIssues: arr(ISSUE),
  faq: arr(FAQ),

  // A controller article with no sources is the one thing this wiki is for
  // not being, so an empty list is an error rather than an empty section.
  sources: arr(SOURCE, { minItems: 1 }),

  short: SHORT,
});

const ROOT = obj({
  meta: obj({
    updated: date(),
    disclaimer: str(),
    sourceNotes: arr(str()),
  }),
  controllers: arr(CONTROLLER, { minItems: 1 }),
});

/* --------------------------------------------------------------- the check */

/**
 * Edit distance, used only to turn "unknown field" into "did you mean". Capped
 * loosely by the caller: a suggestion is offered when the distance is small
 * relative to the name, so `measuredCentreError` finds its match but an
 * entirely new field name is reported as new rather than mistaken for a typo.
 */
function distance(a, b) {
  const rows = [];
  for (let i = 0; i <= a.length; i++) rows[i] = [i];
  for (let j = 0; j <= b.length; j++) rows[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      rows[i][j] =
        a[i - 1] === b[j - 1]
          ? rows[i - 1][j - 1]
          : 1 + Math.min(rows[i - 1][j], rows[i][j - 1], rows[i - 1][j - 1]);
    }
  }
  return rows[a.length][b.length];
}

/** The closest allowed sibling key, when there is one close enough to mean it. */
function nearest(key, allowed) {
  const lower = key.toLowerCase();
  let best = null;
  let bestAt = Infinity;

  for (const candidate of allowed) {
    const d = distance(lower, candidate.toLowerCase());
    if (d < bestAt) {
      best = candidate;
      bestAt = d;
    }
  }

  // A third of the name may differ and still be a plausible slip; beyond that
  // it is more likely a field somebody meant to add.
  return bestAt <= Math.max(2, Math.ceil(key.length / 3)) ? best : null;
}

const typeName = (v) =>
  v === null ? "null" : Array.isArray(v) ? "an array" : `a ${typeof v}`;

function checkField(spec, value, at, errors) {
  const add = (msg) => errors.push({ at, msg });

  if (value === null) {
    if (!spec.nullable) {
      add(
        spec.kind === "boolean"
          ? "must be true or false — an unknown yes/no would publish as a confident \"No\""
          : "must not be null"
      );
    }
    return;
  }

  switch (spec.kind) {
    case "string":
      if (typeof value !== "string") return add(`must be a string, got ${typeName(value)}`);
      if (!value.trim()) return add("is empty — use null for a value nobody has published");
      if (spec.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
        add(`"${value}" is not URL-safe — use lowercase letters, digits and single hyphens`);
      }
      return;

    case "number":
      if (typeof value !== "number" || !Number.isFinite(value)) {
        return add(`must be a number, got ${typeName(value)}`);
      }
      if (spec.min !== undefined && value < spec.min) add(`${value} is below the expected minimum ${spec.min}`);
      if (spec.max !== undefined && value > spec.max) add(`${value} is above the expected maximum ${spec.max}`);
      return;

    case "boolean":
      if (typeof value !== "boolean") add(`must be true or false, got ${typeName(value)}`);
      return;

    case "enum":
      if (!spec.values.includes(value)) {
        const hint = nearest(String(value), spec.values);
        add(
          `"${value}" is not one of: ${spec.values.join(", ")}` +
            (hint ? ` — did you mean "${hint}"?` : "")
        );
      }
      return;

    case "url":
      if (typeof value !== "string") return add(`must be a URL string, got ${typeName(value)}`);
      try {
        const parsed = new URL(value);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          add(`"${value}" is not an http(s) URL`);
        }
      } catch {
        add(`"${value}" is not a valid URL`);
      }
      return;

    case "date":
      if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return add(`must be a YYYY-MM-DD date, got ${JSON.stringify(value)}`);
      }
      if (Number.isNaN(Date.parse(value))) add(`"${value}" is not a real date`);
      return;

    case "array":
      if (!Array.isArray(value)) return add(`must be an array, got ${typeName(value)}`);
      if (spec.minItems && value.length < spec.minItems) {
        add(`needs at least ${spec.minItems} entr${spec.minItems === 1 ? "y" : "ies"}, has ${value.length}`);
      }
      value.forEach((item, i) => checkField(spec.of, item, `${at}[${i}]`, errors));
      return;

    case "object": {
      if (typeof value !== "object" || Array.isArray(value)) {
        return add(`must be an object, got ${typeName(value)}`);
      }

      const allowed = Object.keys(spec.fields);

      for (const key of Object.keys(value)) {
        if (allowed.includes(key)) continue;
        const hint = nearest(key, allowed);
        errors.push({
          at: at ? `${at}.${key}` : key,
          msg: hint
            ? `unknown field — did you mean "${hint}"?`
            : `unknown field — add it to src/schema.mjs if it is meant to exist`,
        });
      }

      for (const [key, field] of Object.entries(spec.fields)) {
        const path = at ? `${at}.${key}` : key;
        if (!(key in value)) {
          if (!field.optional) errors.push({ at: path, msg: "is missing" });
          continue;
        }
        checkField(field, value[key], path, errors);
      }
      return;
    }
  }
}

/**
 * Checks the whole data file and throws once with every problem listed, rather
 * than stopping at the first. A contributor fixing five typos should learn
 * about all five in one run.
 *
 * Paths are reported by controller id rather than array index, because the
 * build sorts controllers by name and the index in the file is not what
 * somebody looking for the record would search for.
 */
export function validate(data) {
  const errors = [];

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new Error("data/controllers.json must contain a JSON object");
  }

  checkField(ROOT, data, "", errors);

  if (Array.isArray(data.controllers)) {
    // An id that is itself the problem stays reported by index, so the path
    // does not read as `G7 SE!.id`.
    const idAt = new Map(
      data.controllers.map((c, i) => [
        i,
        typeof c?.id === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(c.id) ? c.id : null,
      ])
    );

    // One pass, so `controllers[1]` cannot claim an error belonging to
    // `controllers[10]` the way a prefix match would.
    for (const err of errors) {
      err.at = err.at.replace(
        /^controllers\[(\d+)\]/,
        (whole, n) => idAt.get(Number(n)) ?? whole
      );
    }

    // Uniqueness is invisible to the shape check, which sees one record at a
    // time. Reported by index, because with a duplicate the id names both.
    const seen = new Map();
    for (const [i, id] of idAt) {
      if (id === null) continue;
      if (seen.has(id)) {
        errors.push({
          at: `controllers[${i}].id`,
          msg: `"${id}" is already used by controllers[${seen.get(id)}] — ids become page filenames and must be unique`,
        });
      } else {
        seen.set(id, i);
      }
    }
  }

  if (!errors.length) return;

  const width = Math.min(48, Math.max(...errors.map((e) => e.at.length)));
  const lines = errors.map((e) => `  ${e.at.padEnd(width)}  ${e.msg}`);

  throw new Error(
    `data/controllers.json is not valid (${errors.length} problem${
      errors.length === 1 ? "" : "s"
    }):\n${lines.join("\n")}\n\n` +
      "Nothing was written. Fix the data, or update src/schema.mjs if the shape\n" +
      "itself is meant to change."
  );
}
