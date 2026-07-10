# My Minecraft Universe

Minecraft-inspired static resume website built with plain HTML, CSS, and vanilla JavaScript.

## Copyright Disclaimer

This project is a personal, fan-inspired web experience.

I do not own any copyright, trademark, or other intellectual property rights related to Minecraft, Mojang, or Microsoft. Minecraft and all related names, assets, and marks are the property of their respective owners.

The site behaves like a small exploration game:

- the player walks through a career path in order
- each role opens as a checkpoint modal
- supporting regions, landmarks, easter eggs, and guidance are generated around the path
- all resume-specific content comes from one data file: [resume.json](resume.json)

## How To Run

You can run the project in either of these ways:

1. Open [index.html](index.html) directly in a browser.
2. Serve the folder from any static host such as GitHub Pages.

The project supports direct `file:///` loading. The loader in [script.js](script.js) tries `fetch`, then falls back to `XMLHttpRequest`, then an iframe-based loader so the site can still work when opened locally.

## Project Structure

These are the files and folders that make the website work:

1. [index.html](index.html)
	Purpose: main page structure.
	Contributes:
	- app shell and layout containers
	- map viewport
	- avatar button
	- movement hotbar
	- onboarding dialog
	- info modal
	- shepherd guidance popup
	- audio controls

2. [style.css](style.css)
	Purpose: all visuals and responsive behavior.
	Contributes:
	- Minecraft-inspired UI styling
	- biome and tile appearance
	- landmark and stage highlighting
	- avatar, mobs, particles, and decorative objects
	- responsive layout for desktop and mobile
	- animation timing and motion rules

3. [script.js](script.js)
	Purpose: all site behavior and game logic.
	Contributes:
	- loading and validating resume data
	- path expansion and movement logic
	- visible-window rendering around the player
	- stage, landmark, and easter egg interactions
	- modal content creation
	- shepherd guidance updates
	- ambient audio and particle behavior
	- world generation around the resume path

4. [resume.json](resume.json)
	Purpose: source of truth for resume and timeline content.
	Contributes:
	- hero text
	- contact links
	- role/job checkpoints
	- movement path
	- skills, certifications, education
	- present/finale content

5. [assets](assets)
	Purpose: custom SVG graphics used by the site.

6. [assets/avatar](assets/avatar)
	Purpose: avatar sprites.
	Contributes:
	- idle sprite
	- walk-up, walk-down, walk-left, walk-right sprites

7. [assets/decor](assets/decor)
	Purpose: decorative world elements.
	Contributes:
	- clouds
	- torches
	- visual environmental assets used in the map

8. [assets/icons](assets/icons)
	Purpose: badge and role/skill icons.
	Contributes:
	- stage badges
	- modal icons
	- skill chips and fact chips

## Which File To Update For Common Changes

Use this section as the fastest way to know where to edit.

### 1. Resume content changed

Update [resume.json](resume.json).

Examples:

- new job title
- updated company name
- new achievements
- skill changes
- education changes
- certification changes
- contact link changes
- new current-role summary

In most resume-only updates, you should not need to edit [index.html](index.html), [style.css](style.css), or [script.js](script.js).

### 2. Add, remove, or reorder jobs/roles

Update both of these parts inside [resume.json](resume.json):

1. `stages`
2. `path`

Important rules:

- every stage node in `path` must reference a real `stageId`
- every `stageId` in `path` must exist in `stages`
- the path must stay linear and orthogonally contiguous
- movement supports previous/next progression only
- do not create diagonal jumps in the path

Good path movement:

- `(3, 4)` to `(4, 4)`
- `(4, 4)` to `(4, 5)`

Bad path movement:

- `(3, 4)` to `(4, 5)`

### 3. Change the opening name/title/tagline text

Update [resume.json](resume.json):

- `name`
- `title`
- `tagline`

### 4. Change the final call-to-action content

Update [resume.json](resume.json) under `present`.

Typical fields:

- `title`
- `headline`
- `message`
- `icon`

### 5. Update contact links

Update [resume.json](resume.json) under `contact`.

Typical fields:

- `email`
- `phone`
- `linkedin`
- `resumePdf`

Note: do not document personal values in this README. Keep those values only in [resume.json](resume.json) or another private workflow if needed.

### 6. Change map visuals, colors, tile look, spacing, or animations

Update [style.css](style.css).

Examples:

- stronger landmark highlighting
- different world colors
- hotbar design changes
- guidance popup styling
- motion tuning
- mobile layout tuning

### 7. Change movement, modal behavior, world generation, guidance, or audio logic

Update [script.js](script.js).

Examples:

- change how the player moves
- change which landmarks are generated
- modify the shepherd guidance rules
- change how stages open
- adjust sound behavior
- change particle behavior

### 8. Change page layout or add/remove UI blocks

Update [index.html](index.html), and usually also [style.css](style.css).

Examples:

- add a new HUD area
- add a new panel or overlay
- remove audio controls
- move the guidance popup

### 9. Change icons or sprites

Update files inside [assets](assets).

Typical cases:

- replace avatar sprite art in [assets/avatar](assets/avatar)
- replace decor art in [assets/decor](assets/decor)
- replace icons in [assets/icons](assets/icons)

If the replacement keeps the same filenames, no code change may be needed.
If the filenames change, also update the references in [script.js](script.js) or [index.html](index.html).

## Resume Data Guide

### Top-level fields in [resume.json](resume.json)

1. `name`
	Displayed in the top header.

2. `title`
	Displayed as the main role headline in the header and finale context.

3. `tagline`
	Short supporting summary shown near the top of the site.

4. `contact`
	Used for final modal actions such as email, phone, LinkedIn, and resume link.

5. `path`
	Defines the timeline route the player walks.

6. `stages`
	Defines all role/job checkpoint content.

7. `coreCompetencies`
	Used in landmark/finale content and chip sections.

8. `certifications`
	Used in landmark/finale content.

9. `education`
	Used in landmark/finale content.

10. `present`
	 Used for the last stage/finale content.

### Path node types

The `path` array uses nodes with a `type`.

Supported types currently used by the site:

1. `start`
	Starting location.

2. `walk`
	Regular travel tile.

3. `stage`
	Role/job checkpoint tile.
	Must include:
	- `stageId`
	- optional `icon`

4. `present`
	Final destination / current stage tile.

### Stage object structure

Each item in `stages` should include:

- `id`
- `company`
- `role`
- `startDate`
- `endDate`
- `achievements` array
- `skills` array
- optional `icon`

## Safe Update Workflows

### Update resume text only

Edit [resume.json](resume.json) only.

### Add a new role

1. Add a new object to `stages` in [resume.json](resume.json).
2. Add a matching `stage` node in `path`.
3. Insert enough `walk` nodes so the route stays orthogonally connected.
4. Keep the final `present` node at the end of the route.

### Remove a role

1. Remove the matching stage object from `stages`.
2. Remove or reroute the matching stage node in `path`.
3. Make sure the remaining path is still continuous.

### Reorder the journey

1. Reorder stage positions in `path`.
2. Keep each stage's `stageId` correct.
3. Verify the route still moves one orthogonal step at a time.

## Deployment Files

If you want to publish only the files required to run the website, these are the runtime files to include:

1. [index.html](index.html)
2. [style.css](style.css)
3. [script.js](script.js)
4. [resume.json](resume.json)
5. everything inside [assets](assets)

[README.md](README.md) is useful for maintenance but is not required for the site to run.

## Files Not Required For Runtime

Do not include test files or test procedures when preparing a runtime-only deployment package.

This project currently runs from the files listed in the previous section.

## Before Publishing

1. Review [resume.json](resume.json) carefully.
2. Confirm all links in `contact` are correct.
3. Confirm the `path` remains linear and contiguous.
4. Confirm each `stageId` used in `path` exists in `stages`.
5. Confirm asset file names still match the references used by the code.
6. Open [index.html](index.html) once locally and verify the basic journey still works.

## Maintenance Summary

If the resume changes, start with [resume.json](resume.json).

Only edit [script.js](script.js), [style.css](style.css), or [index.html](index.html) when the behavior, layout, visuals, or generated world rules need to change.