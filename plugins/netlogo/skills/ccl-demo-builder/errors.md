# CCL Demo Builder - Known Errors Catalog

Growing catalog of errors encountered during demo builds. Organized by category.
**Updated after each demo build with new findings.**

---

## NetLogo Language Errors

### Operator Precedence with `with` Clause
- **Symptom**: Incorrect agent filtering; `tanks-on p with [condition]` doesn't filter as expected
- **Cause**: NetLogo binds `with` to `p` instead of the result of `tanks-on p`. The reporter call needs explicit grouping.
- **Fix**: Wrap the reporter call in parentheses: `(tanks-on p) with [condition]`
- **Source**: Battle City (commit 5adb28a)

### Breed Context: `create-` vs `hatch-`
- **Symptom**: Runtime error using `create-explosions` (or any `create-<breed>`) inside a turtle procedure
- **Cause**: `create-<breed>` is observer-only. Inside a turtle context, you must use `hatch-<breed>`.
- **Fix**: Replace `create-<breed> N [...]` with `hatch-<breed> N [...]` when called from turtle code
- **Source**: Battle City (commit a905b89)

### Variable Name Conflicts with Built-in Primitives
- **Symptom**: Unexpected behavior or errors when using `dx`, `dy` as local variable names
- **Cause**: `dx` and `dy` are reserved NetLogo primitives (heading-based deltas). Naming local variables the same causes shadowing/collision.
- **Fix**: Use domain-specific names like `map-x`, `map-y`, `col-idx`, `row-idx`
- **Known conflicts**: `dx`, `dy`, `dt`, `distance`, `heading`, `color`, `size`, `label`
- **Source**: Battle City (commit 7320a55)

### No `lower-case` Primitive in NetLogo 7
- **Symptom**: Runtime error "Unknown primitive: lower-case"
- **Cause**: NetLogo 7 does not have a built-in `lower-case` string primitive
- **Fix**: Use case-insensitive matching with `position`, or check multiple case variants. Better yet, use `llm:choose` for constrained responses to avoid parsing entirely.
- **Source**: Battle City (commit f0c0b5a)

### Coordinate System / Y-axis Inversion
- **Symptom**: Agents spawn at wrong locations; map renders upside down
- **Cause**: Row 0 in a string list maps to the top of the visual grid (positive y), not the bottom. Using `row-idx - offset` inverts the mapping.
- **Fix**: Use `offset - row-idx` for y-coordinate: Row 0 = max y (top), last row = min y (bottom)
- **Source**: Battle City (commit f0c0b5a)

---

## nlogox XML Errors

### View Widget Attribute Names
- **Symptom**: View widget rejected or world wrapping settings ignored
- **Cause**: Using `wrappingAllowedInX`/`wrappingAllowedInY` (wrong) instead of correct attribute names
- **Fix**: Use `wrappingAllowedX="false"` and `wrappingAllowedY="false"` (no "In")
- **Source**: Battle City (commit f3a61aa)

### View `updateMode` Must Be Integer
- **Symptom**: View refresh behavior incorrect or validation error
- **Cause**: Using string value `updateMode="TickBased"` instead of numeric code
- **Fix**: Use `updateMode="1"` for tick-based updates (0 = continuous)
- **Source**: Battle City (commit 4ce4265)

### Missing Required View Attributes
- **Symptom**: Tick counter not displayed; widget validation errors on load
- **Cause**: Missing `showTickCounter` and `tickCounterLabel` attributes in `<view>` element
- **Fix**: Add `showTickCounter="true"` and `tickCounterLabel="ticks"` to the view widget
- **Source**: Battle City (commit ec72fb0)

### Plot Widget Format (NetLogo 7.0.3)
- **Symptom**: Plots don't render; model fails to load
- **Cause**: Using NetLogo 6.x plot format instead of 7.0.3 XML format
- **Fix**: Correct 7.0.3 format requires:
  - Plot-level `<setup>` and `<update>` elements (can be empty)
  - Each `<pen>` needs `<setup>` and `<update>` child elements
  - Pen update code goes in `<update>plot value</update>`, not as inline text
  - All pens need `legend="true"` attribute
  - Pen `interval` must be float: `"1.0"` not `"1"`
```xml
<plot display="Scores">
  <setup></setup>
  <update></update>
  <pen display="Score" color="-2674135" legend="true" interval="1.0" mode="0">
    <setup></setup>
    <update>plot score</update>
  </pen>
</plot>
```
- **Source**: Battle City (commit fd5e30f)

### Chooser Widget Format (NetLogo 7.0.3)
- **Symptom**: Chooser doesn't render or shows wrong values
- **Cause**: Using `<option>"value"</option>` instead of 7.0.3 `<choice>` format
- **Fix**: Use `<choice type="string" value="My Value"></choice>` (self-closing, no quotes in value)
```xml
<chooser variable="stage">
  <choice type="string" value="1: Solo Navigation"></choice>
  <choice type="string" value="2: Team Battle"></choice>
</chooser>
```
- **Source**: Battle City (commit fd5e30f)

### Numeric Attributes Must Be Floats
- **Symptom**: Subtle rendering issues or validation errors
- **Cause**: `patchSize`, `frameRate`, and pen `interval` expect float strings
- **Fix**: Use `"17.0"` not `"17"`, `"30.0"` not `"30"`, `"1.0"` not `"1"`
- **Source**: Battle City (commit fd5e30f)

### Button Missing `disableUntilTicks` Attribute
- **Symptom**: Model fails to load with error "keynotfound disableUntilTicks"
- **Cause**: The `<button>` element in .nlogox requires `disableUntilTicks` as a mandatory attribute. Omitting it causes a key-not-found error at load time.
- **Fix**: Add `disableUntilTicks="false"` to every `<button>` element:
```xml
<button x="10" y="10" width="100" height="40"
        disableUntilTicks="false" kind="Observer" display="Setup" forever="false">setup</button>
```
- **Source**: Social Deduction Game

### Plot Attribute Names Are CamelCase
- **Symptom**: Model fails to load with error "keynotfound xMin" (or similar)
- **Cause**: Plot attributes use camelCase (`xMin`, `xMax`, `yMin`, `yMax`, `autoPlotX`, `autoPlotY`), not lowercase. Also requires `legend="false"` attribute.
- **Fix**: Use exact attribute names from reference:
```xml
<plot x="355" y="565" width="270" height="200"
      display="My Plot" xAxis="X" yAxis="Y"
      autoPlotX="true" autoPlotY="true" legend="false"
      xMin="0.0" xMax="10.0" yMin="0.0" yMax="5.0">
```
- **Wrong**: `xmin`, `xmax`, `ymin`, `ymax`, `autoPlotOn`
- **Source**: Social Deduction Game

### Monitor Missing `fontSize` Attribute
- **Symptom**: Model fails to load with error "keynotfound fontSize"
- **Cause**: The `<monitor>` element in .nlogox requires `fontSize` as a mandatory attribute. Also use `precision="17"` (the NetLogo default) rather than `"0"` or `"1"`.
- **Fix**: Add `fontSize="11"` and `precision="17"` to every `<monitor>` element:
```xml
<monitor x="10" y="450" width="110" height="40"
         fontSize="11" display="Round" precision="17">current-round</monitor>
```
- **Source**: Social Deduction Game

### Arena Map String Length Must Match Grid Size
- **Symptom**: Map rendering errors, patches at wrong positions
- **Cause**: Map row strings not exactly matching grid width (e.g., 31 chars for a 31-wide grid)
- **Fix**: Audit every row string to be exactly the correct length. Off-by-one causes cascade of misaligned patches.
- **Source**: Battle City (commit 87b3004)

---

## LLM Extension Errors

### History Cleared Every Tick Causes Amnesia
- **Symptom**: Agents can't learn from past actions; repeat failed moves; no navigation memory
- **Cause**: Calling `llm:clear-history` every tick erases all conversation context. The LLM starts fresh each turn with no memory of prior decisions or outcomes.
- **Fix**: Remove per-tick `llm:clear-history`. Let history accumulate. Add explicit feedback about action outcomes:
  - `last-move-failed?` boolean
  - List of open/blocked directions
  - Previous action and its result
- **Design guidance**: See History Management Design section in SKILL.md
- **Source**: Battle City (commit c55ce67)

---

## Adding New Errors

After each demo build, append new errors to the appropriate category above using this format:

```
### Short Descriptive Title
- **Symptom**: What error message or behavior you observe
- **Cause**: Why the error happens (root cause)
- **Fix**: How to resolve it (with code example if helpful)
- **Source**: Demo name (commit hash)
```
