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

### Favicon and share previews

[assets/favicon.svg](assets/favicon.svg) is an SVG recreation of the supplied green face reference, not a copy of the original image file. It is linked as the browser-tab icon. To use an exact original image instead, save that image into the assets folder and update the icon link and MIME type in [index.html](index.html). Browsers may cache old favicons; a reload or newly opened tab may be needed.

Page title, meta description, Open Graph title/description/type, and Twitter card metadata are generated from `name`, `title`, and `tagline` in [resume.json](resume.json). Run `node update-resume-snapshot.js` after edits; `--check` checks both the resume snapshot and metadata freshness. Do not hand-edit the generated metadata block.

Optional `site` fields in resume data:

- `url`: absolute HTTP(S) URL of the published website; empty until configured.
- `shareImage`: absolute HTTP(S) URL of a publicly accessible preview image; empty until configured. A 1200×630 PNG or JPEG is recommended because many social platforms do not accept SVG preview images.
- `shareImageAlt`: accessible description of the preview image.

Open Graph and Twitter image tags use `site.shareImage` when configured. Otherwise, setting `site.url` enables image tags pointing to the generated [assets/og-preview.png](assets/og-preview.png) under that public site. Use the full published project URL, preferably ending in `/` (or an explicit HTML entry URL). If neither URL is configured, image tags are omitted rather than inventing a public address. A favicon is not automatically a social preview image. Preview crawlers read the initial HTML without running JavaScript; they need a public hosted URL, not a local file or localhost address. Actual card appearance depends on the platform and its cache.

### Share my run

After reaching the present checkpoint, choose **Share my run** inside its card to view a 1200×630 pixel-art canvas with unique roles viewed, secrets found, and blocks walked. Name/title come from resume data; counters are a snapshot of the current in-memory run. Download PNG saves the image as **career-run.png**. Copy image and Share image depend on browser API support, user activation, secure context, and permissions; rejected requests show a message and keep Download PNG available. This includes `file://`, where clipboard/share support varies. No upload, tracking, or storage is added.

Opening Share my run is an optional branch and does not immediately trigger the shepherd finale on closing it. Reopen the present card to continue that sequence if it has not run. Resume and contact access remain independent of sharing.

[share-card.js](share-card.js) is a runtime file shared with the optional Node asset generator. It uses an original compact uppercase bitmap alphabet and geometric pixel art, without remote fonts or images. Long text is truncated; accents are normalized, and unsupported characters use a question-mark glyph. The ordinary plain resume retains the original text.

[assets/og-preview.png](assets/og-preview.png) is a real pre-rendered PNG using the same style but showing profile information rather than visitor statistics. Run `node update-resume-snapshot.js` after data edits to refresh it; `--check` verifies its freshness along with the other generated assets. A public social preview still needs the site URL configured and the image deployed.

### Mobile home-screen support

[manifest.json](manifest.json) provides a resume-data-derived name and description, relative start URL and scope, standalone display preference, and the existing green theme. The relative paths support static hosts that publish under a project subfolder.

The HTML links a 180×180 Apple touch icon, plus the manifest references 192×192 and 512×512 opaque PNG icons. These are padded recreations of the current green-face favicon design and live under [assets/icons](assets/icons). They use `purpose: any`; no maskable-icon compatibility is claimed.

[home-screen-assets.js](home-screen-assets.js) is an optional Node maintenance helper used by [update-resume-snapshot.js](update-resume-snapshot.js). Running `node update-resume-snapshot.js` refreshes the manifest and icons alongside the resume snapshot and metadata. The `--check` mode detects missing or stale generated files. No extra packages are needed.

To verify on a phone, publish the files over HTTPS and use the browser's **Add to Home Screen** command (on iOS, typically Safari's Share menu). Check the title, icon, and launched page. Browser installation prompts and standalone behavior vary; a manifest alone does not guarantee automatic install prompts. Local `file://` browsing still works for the resume/game but is not a home-screen installation target. There is no service worker, offline caching, or offline guarantee.

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
	Purpose: SVG/PNG artwork and generated images. Not every stored asset is referenced by the current renderer; see the asset-usage table below.

6. [assets/avatar](assets/avatar)
	Purpose: avatar sprites.
	Contributes:
	- idle sprite
	- walk-up, walk-down, walk-left, walk-right sprites

7. [assets/decor](assets/decor)
	Purpose: used decorative images plus retained legacy artwork.
	Contributes:
	- cloud SVGs for the moving sky background
	- torch SVGs for visited-checkpoint markers
	- retained tree and fence SVGs that are not currently loaded by the world renderer

8. [assets/icons](assets/icons)
	Purpose: badge and role/skill icons.
	Contributes:
	- stage badges
	- modal icons
	- skill chips and fact chips

9. [resume-validator.js](resume-validator.js)
   Purpose: shared validation rules used by both the browser and the optional Node CLI. This is a runtime website file; load it before the main script.

10. [validate-resume.js](validate-resume.js)
	Purpose: optional dependency-free Node maintenance tool. It reads resume data, reports validation errors, and returns an exit status. It is not needed by the website and is not a test file.

11. [resume-renderer.js](resume-renderer.js)
	Purpose: shared semantic HTML renderer used in the browser and by the snapshot command. Escapes text and filters unsafe link schemes. This is a runtime file, loaded before the main script.

12. [update-resume-snapshot.js](update-resume-snapshot.js)
	Purpose: optional dependency-free Node maintenance command that refreshes the generated HTML resume from JSON or checks that it is current. Not required on the server or by visitors.

## Resume shortcuts and exploration progress

If you focus or interact with the plain resume while data is loading, it stays in plain mode when loading finishes. Focused resume content is refreshed only after choosing Return to Exploration, so a focused link is not replaced during reading. Retry remains focusable with a loading label and duplicate requests are ignored. Load failures do not steal focus from a reader already using the plain resume.

Discovery toasts are queued in arrival order, each shown for four seconds with a short blank interval for separate polite announcements. Duplicate active or queued messages are ignored. The queue is in memory only and does not move focus.

- **View Resume / Skip Tour** switches to the semantic, scrollable plain resume, showing all roles, achievements, skills, education, certifications, and contact actions without walking. **Return to Exploration** restores the existing game position. **Jump to role** still opens any individual role card immediately.
- **Download PDF** stays visible but greyed and disabled when `contact.resumePdf` is empty. Set a valid relative path or HTTP(S) URL to enable it. Disabled actions keep their normal label without additional status wording.
- XP measures unique roles viewed. Opening a role through exploration or direct navigation counts once; opening the full resume counts all roles as viewed.
- Hearts visualize the proportion of distinct core competency entries shown. The accompanying count is exact. A role's skills contribute only when they match entries in `coreCompetencies`; the skills landmark or full resume shows all competencies.
- The secret counter records unique easter eggs opened. Repeat opens do not increase it.
- **Revisit checkpoint** jumps to a previously viewed role. Direct resume navigation is always available, even before any checkpoint is viewed.
- On reaching the final path node, the finale includes roles viewed, secrets found, and blocks traveled on foot. Forward and backward walking count; revisit jumps do not.
- Progress lives only in JavaScript memory and resets on page reload. There is no localStorage or backend persistence, and progress never gates resume or contact access.

## Rendering and asset performance

### What is rendered with SVGs versus CSS?

The world uses a mixed rendering approach. The presence of an SVG in the assets folder does **not** mean it is automatically displayed. HTML or JavaScript must reference that file explicitly.

| Element / asset | Current use | Where to change its appearance |
| --- | --- | --- |
| [assets/avatar](assets/avatar) | Idle and directional player sprites are loaded as images. | Edit the referenced SVGs. |
| [assets/decor/cloud.svg](assets/decor/cloud.svg) | Used for all five drifting clouds in the sky. | Edit the SVG; positions and drift are in [style.css](style.css). |
| [assets/decor/torch.svg](assets/decor/torch.svg) | Used for visited role-checkpoint markers. | Edit the SVG for those markers only. |
| [assets/decor/tree.svg](assets/decor/tree.svg) | Retained legacy artwork; not referenced by the current renderer. | Current oak/birch trees are leaf/trunk DOM elements from `createDecorNode()` in [script.js](script.js), styled in [style.css](style.css). |
| [assets/decor/fence.svg](assets/decor/fence.svg) | Retained legacy artwork; not referenced by the current renderer. | Current fences are CSS shapes in [style.css](style.css). |
| [assets/tiles](assets/tiles) | Retained legacy terrain SVGs; not loaded as the current map textures. | Grass, dirt, stone, paths, water, and other biome surfaces use CSS backgrounds and gradients in [style.css](style.css). |
| [assets/icons](assets/icons) | Referenced role/skill/modal icons and secret-item images are loaded as images; generated home-screen PNGs are used separately. | Edit the referenced image, or change the data-driven `icon` basename. Unreferenced icons do not appear automatically. |

Environmental torches, lanterns, campfires, bushes, flowers, farms, and most other scenery are also CSS-drawn. Editing the checkpoint torch SVG does not alter CSS environmental torches. Trees have separate oak/birch styling and leaf animation; these are independent of the legacy tree SVG.

To switch trees or fences to their retained SVG artwork, update `createDecorNode()` in [script.js](script.js) to create an image referencing the desired SVG, then adjust the corresponding `.decor-*` rules in [style.css](style.css) so the old CSS background, border, or generated parts do not obscure it. Keep images decorative (`alt=""`) and retain the existing placement and reduced-motion behavior. This requires an explicit renderer change; replacing an unused file alone has no effect.

This documentation update does not switch the rendering approach or delete any retained assets. Legacy tree/fence/terrain artwork is not required by the current runtime renderer, but may be kept for future art changes.

The renderer caches only currently visible tiles by world coordinate, lights by coordinate, and entities by stable ID. Movement reuses overlapping DOM nodes, creates entering tiles, removes departing nodes, and updates positions, fog, button states, and visited markers. Cached entities keep their sprite structure while their position or direction changes. No full-world DOM cache is retained.

All five avatar SVGs are requested and decoded at startup where supported, without blocking resume access if an image fails. Resize events are coalesced into animation frames; a resize during movement is applied after the camera completes. The former scroll listener was removed because header collapse is already handled by explicit exploration actions.

These optimizations require no packages or build step and do not change resume data or path geometry.

## Audio and interaction feedback

Each successful walking step plays a short procedural footfall; the shepherd's animated portal entry also plays a walking cadence. Idle daylight gameplay has soft, periodic synthesized bird chirps. Chirps stop immediately on movement, dialogs, plain-resume viewing, nighttime, tab hiding, mute, or zero volume, and resume after at least one second of idle daytime. No recordings, external audio assets, or automatic pre-gesture playback are used. Blocked movement and checkpoint jumps do not pretend to be walked steps.

If audio is not heard after interacting, check the shared mute and volume controls, tab/site sound permission, OS volume mixer, selected output device, and device volume. UI cues use a higher master gain while ambience remains quieter; audio still requires a user gesture.

### Present checkpoint and Next Opportunity

The final present tile sits exactly two grid blocks from the nearest edge of the three-by-three Next Opportunity portal. This changes landmark placement, not the resume path. After walking to the present tile and closing its card, the shepherd enters the portal and a congratulations/contact popup opens once per page session. Reduced-motion users receive the popup without the travel animation.

Edit `present.candidateTitle` and `present.candidateMessage` in [resume.json](resume.json) to change that popup. Omit or clear `candidateTitle` to disable the sequence. Contact actions remain available independently of completing the journey.

Audio begins only after an interaction, never on page load. The shared volume defaults to 35%; **Mute** controls both ambience and all short cues. Setting volume to zero also suppresses cues. Step, modal open/close, first-time role discovery, and secret discovery sounds are optional enhancements; unsupported or unavailable browser audio does not block navigation.

Blocked movement displays a brief directional hint without camera shake. Buttons have subtle hover/press brightness feedback, and dialogs enter/exit with short easing. Reduced-motion preferences disable the dialog animations; closing still restores focus and keeps background controls isolated until the dialog has closed.

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
- replace referenced cloud/checkpoint-torch art in [assets/decor](assets/decor); tree and fence SVG edits do not affect the CSS-drawn scenery until explicitly wired into the renderer
- replace icons in [assets/icons](assets/icons)

If the replacement keeps the same filenames **and the files are already referenced**, no code change may be needed.
If the filenames change, also update the references in [script.js](script.js) or [index.html](index.html).

For secret artwork, set `easterEggs[].icon` in [resume.json](resume.json) to the SVG basename in [assets/icons](assets/icons), without the extension. The same image is used on the secret tile and Hidden Discovery popup. If the icon is omitted, the generic marker is retained. Existing secret artwork includes diamond, emerald, gold-chest, silver-armour, golden-apple, and cave. The retained gold-coin icon appears only if an entry explicitly selects it.

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

### Optional updates, projects, and references

The optional `patchNotes`, `projects`, and `testimonials` arrays in [resume.json](resume.json) are empty by default. Supply only real updates/projects and approved quotations; no sample personal content is included. Empty arrays add no visible selector, chests, or reference dialogue.

| Array | Required entry fields | Optional fields |
| --- | --- | --- |
| `patchNotes` | unique non-empty `id`, `version`, `date`, `title`, and `notes` text array | — |
| `projects` | unique non-empty `id`, `title`, `summary`, absolute HTTP(S) `link`, and `tags` text array | `stageId` |
| `testimonials` | unique non-empty `id`, `quote`, `author` | `role`, absolute HTTP(S) `sourceUrl`, `stageId` |

IDs must be unique within their own array. A supplied `stageId` must match an existing stage. Omit optional URLs rather than using empty placeholders. The shared browser/CLI validator checks these rules.

When populated, **More resume content** opens any item directly without exploration. Game Updates also has a button in the workshop card. Project entries create collision-safe chests near the projects region or their associated role; exceptionally crowded maps may have fewer world chests, but all projects remain directly accessible. References are attached to existing villagers, placed beside the route and kept stationary for reliable interaction. Adjacent villagers expose keyboard/touch-friendly **Read reference** dialogue buttons. `stageId` biases reference placement toward that checkpoint.

All populated sections also appear in plain resume, print output, and the generated non-JavaScript snapshot. After edits, run `node update-resume-snapshot.js`, then `node validate-resume.js` and `node update-resume-snapshot.js --check`. No content changes the linear route, and reference/project access is never gated by progress.

### Discovery facts and recognition

- `recognition` in [resume.json](resume.json) is an array of text entries shown by the awards landmark.
- `easterEggs` in [resume.json](resume.json) is an array of objects with `name` and `fact` text. Edit these to change hidden discovery content; an empty array removes the discoveries.
- Both fields are optional and default to empty arrays. No personal discovery facts or recognition statements need to be edited in JavaScript.

### Optional role regions and atmosphere

Supplemental light halos scale from 1.5 to 4 tiles wide as daylight fades, with zero opacity at noon and stronger opacity at night. The original torch artwork and checkpoint beams remain visible as navigation cues. Cloud parallax is synchronized after walking, checkpoint revisits, and redraws; reduced-motion mode keeps the cloud layer stationary and uses stable daylight without supplemental halos.

Each stage may include `region` with `decor` (an array of supported decoration names), `density` (0–0.5), and `radius` (1–20 world blocks). These settings cluster decorations near that stage's checkpoint without changing its path or resume content. Omit `region` to retain normal biome decoration.

Supported region decorations: farm, wheat, hay, lantern, redstone, cobble, torch, rock, flower, tallgrass, mushroom, bush, tree-oak, tree-birch, and campfire. Roads remain clear and river tiles retain water-appropriate decoration.

The repeating day/night cycle uses 30 seconds of daytime followed by 12 seconds of nighttime, with brief fades around each boundary. The sun stays fixed in position and fades at night; clouds continue drifting and have subtle movement-linked parallax. Terrain is shaded separately from the avatar and controls; torches, lanterns, campfires, and checkpoint beacons cast stronger soft light at night. Ambient leaves switch to fireflies at night, with limited simultaneous particles. Reduced-motion users receive stable daylight without these animations or particles. No storage or additional assets are required.

### Data validation and loading

The site validates resume data before generating the world using [resume-validator.js](resume-validator.js). Each stage needs a unique, non-empty `id` and text values for `company`, `role`, `startDate`, and `endDate`. Both `achievements` and `skills` are required arrays of text; empty arrays are valid.

The path must begin with one `start` node, finish with one `present` node, use integer coordinates without repeats, and move exactly one orthogonal block between successive nodes. Each stage must appear exactly once in the path with its matching `stageId`.

The loader retains fetch → XMLHttpRequest → iframe fallbacks, with an eight-second timeout per attempt. A visible loading panel becomes a clear error message if loading or validation fails. Fix the reported issue and choose **Retry loading**; no page reload is required.

### Standalone validation command

With Node.js available, run `node validate-resume.js` from the project folder. No package installation or build step is needed. The default data path is resolved beside the CLI, so calling it by absolute path also works from other folders.

To validate another data file, run `node validate-resume.js path/to/resume.json`. Relative data paths are resolved from your terminal's current folder.

- Exit status **0**: validation passed, with stage and path-node totals.
- Exit status **1**: invalid JSON, unreadable file, invalid arguments, or structural errors. Structural failures report a numbered error list.
- Validation is read-only; it does not rewrite resume data or add hooks or CI configuration.
- Browser and CLI use the same rules, including optional region and discovery fields. The CLI can be connected to a hook or CI later if desired.

### Update resume text only

Edit [resume.json](resume.json), then run `node update-resume-snapshot.js` to refresh the generated fallback in [index.html](index.html). Resume data remains the only authored source of personal content; do not hand-edit the generated snapshot.

### Plain resume, non-JavaScript fallback, and printing

The plain resume is present directly in [index.html](index.html) between the `RESUME-SNAPSHOT:START` and `RESUME-SNAPSHOT:END` comments. It is generated from JSON, not a separate hand-maintained resume. JavaScript refreshes it from current data when loading succeeds. If JavaScript is disabled or loading fails, the saved snapshot remains readable and game overlays stay hidden.

After any resume data edit, run `node update-resume-snapshot.js`. Before publishing, run `node update-resume-snapshot.js --check`; it exits 1 when the HTML snapshot is stale, data is invalid, or the markers are missing. The command resolves files beside itself and works independently of your terminal's working folder.

No build or Node process is required to open or host the resulting website. Include the refreshed HTML when publishing. With JavaScript disabled, the saved HTML reflects the last snapshot refresh, not any unprocessed JSON edits.

Use **Print Resume** in plain mode, or your browser's Print command from either mode. Print styles show only the linear resume and hide the map, HUD, overlays, buttons, and other game chrome. Browser print options still control browser-added headers, footers, paper size, and PDF saving.

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
6. [resume-validator.js](resume-validator.js), loaded before [script.js](script.js)
7. [resume-renderer.js](resume-renderer.js), also loaded before [script.js](script.js)
8. [manifest.json](manifest.json); its PNG icons are included under [assets](assets).
9. [share-card.js](share-card.js), loaded before [script.js](script.js); [assets/og-preview.png](assets/og-preview.png) is included under assets.

[README.md](README.md) is useful for maintenance but is not required for the site to run.

[validate-resume.js](validate-resume.js) is optional maintenance tooling; exclude it from a runtime-only website deployment. Keep [resume-validator.js](resume-validator.js), which the browser requires.

[update-resume-snapshot.js](update-resume-snapshot.js) is optional maintenance tooling too. Keep the generated snapshot in [index.html](index.html) and the runtime [resume-renderer.js](resume-renderer.js).

[home-screen-assets.js](home-screen-assets.js) is maintenance-only and can also be excluded from runtime deployment. Keep the generated manifest and PNG icons; visitors do not run the generator.

## Files Not Required For Runtime

Do not include test files or test procedures when preparing a runtime-only deployment package.

This project currently runs from the files listed in the previous section.

## Before Publishing

### Automated smoke checks and GitHub Actions

Run `node smoke-test.js` with Node.js 24 from the project folder. No package installation, build, server, or browser is required. Running the script by absolute path also works from other working directories.

[smoke-test.js](smoke-test.js) checks:

- resume structure using the shared validator;
- snapshot, metadata, manifest, icons, and preview-image freshness via the existing `--check` command;
- required HTML hooks, duplicate IDs, and runtime script order;
- referenced local HTML/CSS assets, directional sprites, and content icons;
- manifest scope and PNG dimensions;
- JavaScript syntax without executing the game;
- in-memory invalid-data cases and renderer escaping/link safety.

Exit status **0** means all checks passed; **1** means one or more groups failed. Failures name the affected group and report the reason. Negative fixtures exist only in memory and never rewrite your resume. These are static smoke checks, not a full HTML parser, browser accessibility audit, audio playback test, or mobile installation test.

If generated files are stale, run `node update-resume-snapshot.js`, review the output changes, then rerun `node smoke-test.js`. The checks themselves do not regenerate or fix files.

[.github/workflows/ci.yml](.github/workflows/ci.yml) runs the same command on pushes, pull requests, and manual dispatch with Node.js 24 on Ubuntu. It requests read-only repository access and does not deploy or push changes. Its first actual GitHub execution can be verified only after the workflow is published.

To use CI in the repository, include the smoke script and its maintenance dependencies: [validate-resume.js](validate-resume.js), [update-resume-snapshot.js](update-resume-snapshot.js), and [home-screen-assets.js](home-screen-assets.js), alongside the runtime files. For a runtime-only website package, exclude the smoke script, workflow, and maintenance scripts; retain generated HTML/manifest/images and all runtime scripts. CI configuration is separate from what visitors need to run the website.

### Publication checklist

1. Review [resume.json](resume.json) carefully.
2. Confirm all links in `contact` are correct.
3. Confirm the `path` remains linear and contiguous.
4. Confirm each `stageId` used in `path` exists in `stages`.
5. Confirm asset file names still match the references used by the code.
6. Open [index.html](index.html) once locally and verify the basic journey still works.

## Maintenance Summary

If the resume changes, start with [resume.json](resume.json).

Only edit [script.js](script.js), [style.css](style.css), or [index.html](index.html) when the behavior, layout, visuals, or generated world rules need to change.