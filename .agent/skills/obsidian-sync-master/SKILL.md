---
name: obsidian-sync-master
description: A skill to ensure the Obsidian knowledge base for this project stays updated automatically when making significant architecture, data or troubleshooting changes.
---

# Obsidian Sync Master Skill

As an AI agent working on this athlete tracking app, you must follow these rules to maintain the Obsidian vault's integrity as a "single source of truth" for the project.

## 1. Project Map Updates (`docs/Project_Map.md`)
- **Rule**: Whenever you create a new significant component (e.g., a new Skill, a new Custom Hook, a new Page, a new Supabase Table), you MUST propose an update to the Project Map.
- **Why**: The Project Map provides a bird's-eye view of the architecture. If it falls out of sync, it loses its value.
- **Action**: Use the `view_file` tool to inspect the current map, and then use `replace_file_content` to add the new elements in the appropriate section (e.g., `## Custom Hooks`, `## AI Agent Skills`).

## 2. Troubleshooting & Errors (`docs/Resolución_de_Errores.md`)
- **Rule**: If you spend time debugging a complex issue (e.g., a Supabase JSON serialization error, a weird React hydration bug, a build error), document the solution.
- **Why**: Prevent solving the same problem twice. The user relies on this vault to remember how tricky issues were fixed.
- **Action**: Add a new entry detailing: 1. the error message or symptom, 2. the root cause, and 3. the definitive fix.

## 3. Terminology (`docs/Terminología.md`)
- **Rule**: If a new domain concept is introduced (e.g., a specific athletic category like `Vortex`, or a specific architectural layer like `Custom Hooks`), ensure it is added to the terminology glossary.
- **Why**: Helps onboard future developers and assists AI agents in understanding domain-specific language.

## Verification
Before creating a PR or finishing a significant architectural task:
- [ ] Check if you added new tables, hooks, or skills. If yes, did you update `docs/Project_Map.md`?
- [ ] Check if you resolved a gnarly bug. If yes, did you update `docs/Resolución_de_Errores.md`?
