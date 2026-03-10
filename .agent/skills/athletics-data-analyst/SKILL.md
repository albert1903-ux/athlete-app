---
name: athletics-data-analyst
description: A domain-specific skill to teach the AI about track and field data. Understands how to treat "marcas" (results) and how to identify outliers.
---

# Athletics Data Analyst Skill

As an AI agent working on this athlete tracking app, you must understand the rules of track and field (atletismo) to properly analyze, sort, and display data.

## 1. Metric Types: Time vs Distance/Height
- **Rule**: You must always know whether a "prueba" (event) is time-based or distance-based. This affects sorting, ranking, and spider charts.
- **Time-Based (Lower is Better)**:
  - Any sprint or run: `60m`, `100m`, `200m`, `400m`, `800m`, `1000m`, `1500m`, `3000m`, etc.
  - Hurdles (Vallas): `60m vallas`, `110m vallas`, `400m vallas`, etc.
  - Relays (Relevos): `4x100m`, `4x400m`, etc.
  - Walks (Marcha): `3km marcha`, `5km marcha`, etc.
- **Distance/Height-Based (Higher is Better)**:
  - Jumps: `Longitud` (Long Jump), `Altura` (High Jump), `Triple salto` (Triple Jump), `Pértiga` / `Perxa` (Pole Vault).
  - Throws: `Peso` / `Pes` (Shot Put), `Disco` (Discus), `Jabalina` (Javelin), `Martillo` (Hammer), `Vortex`.

## 2. Categories (Categorías)
- **Rule**: Understand the standard categories, which are usually based on age.
- **Common Order (Youngest to Oldest)**: `SUB8`, `SUB10`, `SUB12`, `SUB14`, `SUB16`, `SUB18`, `SUB20`, `SUB23`, `ABS` (Absoluto / Senior), `Master`.
- **Handling**: When sorting categories for UI display, sort them by age logically (e.g., `SUB10` before `SUB12`), not purely alphabetically.

## 3. Data Integrity & Outliers
- **Rule**: Be vigilant about parsing errors from imported PDFs or manual entries.
- **Missing Decimals**: If a `60m` time is listed as `8` instead of `8.52`, it might be an outlier or parsing error if the rest of the field is around `8.50`. However, a time of `8` flat is valid if entered as such.
- **Rank Gaps**: If the 1st place in a `1000m` is `2:15` and 2nd place is `3:05`, flag this as a potential error in the source data.
- **Hurdle Heights**: Be aware that hurdle height matters. Example: `60m vallas (0.50)` is different from `60m vallas (0.76)`. Ensure `prueba_id`s map to the exact right event and height specification.

## Verification
When building UI components or processing data:
- [ ] Confirm you are sorting results correctly based on the metric type (time = Ascending, height/distance = Descending).
- [ ] Verify you are using domain-appropriate units (`s`, `m`).
