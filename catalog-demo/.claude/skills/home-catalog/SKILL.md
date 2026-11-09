---
name: home-catalog
description: Manage a home inventory catalog stored as an Obsidian-compatible Markdown vault in ./catalog/. Use when the user asks to add, find, move, or organize physical items and containers (rooms, shelves, boxes), e.g. «додай», «де лежить», «перенеси», «що є в».
---

<!--
  Adapted from the home-catalog skill of the author's nanoclaw fork
  (container/skills/home-catalog/SKILL.md). NanoClaw: MIT License, (c) 2026 Gavriel,
  https://github.com/nanocoai/nanoclaw
  Changes for plain Claude Code on a laptop: vault path /workspace/catalog/ -> ./catalog/,
  no Bash except `mv` for moves (Write/Glob/Grep instead of mkdir/find/openssl),
  Telegram/container-only photo tools (send_photo, /workspace/media) removed.
-->

# Home Catalog

A file-based home inventory system. Containers are **folders**, items are **Markdown files** with YAML front matter. The vault is fully compatible with Obsidian.

## Vault location

The vault is the folder **`catalog/`** next to this project's `CLAUDE.md` (i.e. `./catalog/` relative to the working directory). All paths below are relative to the working directory and start with `catalog/`.

Always verify the vault exists before operating:

```
Glob: pattern="catalog/_container.md"
```

If it doesn't exist, initialize it (see [Init vault](#init-vault) below).

---

## Data model

### Container (folder)

A physical location that holds other containers or items.  
Represented as a **folder** with a `_container.md` metadata file inside.

Examples: House, Room, Closet, Shelf, Box, Drawer, Bag.

### Item (Markdown file)

A single physical object.  
Represented as a **`{Title}.md`** file inside a container folder.

Examples: Laptop, Jacket, Passport, Power Bank.

### Stock Item (Markdown file with quantity)

A bulk/fungible item tracked by count.  
Same as an item but with `type: stock_item`, `quantity`, and optional `unit`.

Examples: AA Batteries, Zip Ties, Screws M4x20.

---

## Front matter templates

Use these templates **exactly**. IDs are 8 lowercase hex characters: make one up yourself (random-looking, e.g. `7c41e09a`) and check it is unique with `Grep: pattern="id: \"7c41e09a\"" path="catalog"`.

Timestamps are ISO-8601 UTC. Use today's date from your context; if you don't know the exact time, use `T12:00:00Z`.

### Container (`_container.md`)

```yaml
---
type: container
id: "GENERATE_HEX_8"
title: "Container Name"
container_kind: "room"
tags: []
created_at: "2026-02-17T12:00:00Z"
updated_at: "2026-02-17T12:00:00Z"
---
Optional notes about this container.
```

Valid `container_kind` values: `house`, `room`, `closet`, `shelf`, `box`, `drawer`, `bag`, `cabinet`, `garage`, `storage`, `other`.

### Item (`{Title}.md`)

```yaml
---
type: item
id: "GENERATE_HEX_8"
title: "Item Name"
tags: []
photos: []
props: {}
created_at: "2026-02-17T12:00:00Z"
updated_at: "2026-02-17T12:00:00Z"
---
Optional notes about this item.
```

### Stock Item (`{Title}.md`)

```yaml
---
type: stock_item
id: "GENERATE_HEX_8"
title: "Item Name"
quantity: 10
unit: "pcs"
tags: []
photos: []
props: {}
created_at: "2026-02-17T12:00:00Z"
updated_at: "2026-02-17T12:00:00Z"
---
Optional notes.
```

Valid `unit` values: `pcs`, `kg`, `g`, `m`, `cm`, `l`, `ml`, `boxes`, `packs`, `pairs`, `sets`.

### The `props` field

Use `props` for structured metadata. Always populate the **recommended props** for the item's category. If the user doesn't provide a value, ask once or omit — never invent values.

#### Recommended props by category

**Books / printed media** (tags include `книга`, `book`, `журнал`):

```yaml
props:
  author: "Author Name"
  language: "uk"           # uk, en, etc.
  price_uah: 500
  price_date: "2026-02-18" # when the price was recorded
```

**Electronics / tech** (tags include `техніка`, `electronics`, `периферія`, `gaming`):

```yaml
props:
  brand: "Samsung"
  model: "Odyssey G95"
  serial: "XAW10012345678" # if known
  price_uah: 15000
  price_date: "2026-02-18"
  warranty_until: "2027-02-18" # if known
```

**General items** (clothing, household, tools, etc.):

```yaml
props:
  brand: "Nike"            # if applicable
  color: "black"           # if visible / relevant
  material: "leather"      # if relevant
  price_uah: 2000
  price_date: "2026-02-18"
```

**Stock items** (batteries, consumables):

```yaml
props:
  brand: "Duracell"
  price_uah: 120           # price per unit/pack
  price_date: "2026-02-18"
```

#### Props conventions

- `price_uah` — price in Ukrainian hryvnia (integer, no decimals). Always record if the user mentions price.
- `price_date` — ISO date (YYYY-MM-DD) when price was recorded. Set to today if user gives a price without specifying date.
- When the user says "коштує X грн" / "ціна X" / "за X гривень" — always save as `price_uah` + `price_date`.
- If the user provides price in another currency, store it as `price_usd`, `price_eur`, etc. with the same `price_date`.
- Props not in the recommended list can still be added freely (e.g., `subtitle`, `edition`, `size`).

---

## Operations

### Init vault

Run once to set up the root container: write `catalog/_container.md` (the Write tool creates the folder):

```yaml
---
type: container
id: "GENERATE_HEX_8"
title: "Home"
container_kind: "house"
tags: []
created_at: "CURRENT_ISO_TIMESTAMP"
updated_at: "CURRENT_ISO_TIMESTAMP"
---
Root container for the home inventory.
```

### Create container

Write `catalog/Path/To/New Container/_container.md` with the container front matter template. The Write tool creates the folder automatically — no `mkdir` needed.

### Create item

Write `{Title}.md` inside the target container folder using the item template.

The filename must match the `title` field (replace characters unsafe for filenames: `/ \ : * ? " < > |` with `-`).

**Always** populate `props` with the recommended attributes for the item's category (see [Recommended props by category](#recommended-props-by-category)). Fill in what you know from the user's message; for missing values like `price_uah`, ask the user once. If they don't provide it, omit the field — don't leave empty placeholders.

### Create stock item

Same as create item, but use the stock item template with `type: stock_item`, `quantity`, and `unit`.

### Find item

Search by title:

```
Grep: pattern="title: \"search term\"" path="catalog" glob="*.md"
```

Search by tag:

```
Grep: pattern="search_tag" path="catalog" glob="*.md"
```

Search by prop value:

```
Grep: pattern="serial: \"XAW100\"" path="catalog" glob="*.md"
```

Find all stock items:

```
Grep: pattern="type: stock_item" path="catalog" glob="*.md"
```

### Locate item

To find where an item is, use Grep to find the file, then derive the container chain from the file path:

```
Grep: pattern="title: \"Nintendo Switch\"" path="catalog" glob="*.md" output_mode="files_with_matches"
```

The path segments between `catalog/` and the filename give the container chain.  
Example: `catalog/Living Room/Shelf A/Nintendo Switch.md` means the item is in **Home > Living Room > Shelf A**.

### List contents

List everything in a container:

```
Glob: pattern="catalog/Living Room/*.md"
```

List sub-containers only:

```
Glob: pattern="catalog/Living Room/*/_container.md"
```

List items only: take the `*.md` list above and leave out `_container.md`.

### Move item or container

1. Move the file or folder with the Bash tool and the `mv` command (the only shell command this skill uses; do not use PowerShell `Move-Item`). Quote paths, keep both inside `catalog/`:

```bash
mv "catalog/Old Path/Item.md" "catalog/New Path/Item.md"
```

For containers (folders), move the entire directory:

```bash
mv "catalog/Old Path/Box" "catalog/New Path/Box"
```

2. Update `updated_at` in the moved file's front matter to the current ISO timestamp (Edit tool).

**Important**: the `id` field must NOT change on move. IDs are path-independent.

### Update metadata

Use the Edit tool to modify YAML front matter fields. Always update `updated_at` to the current timestamp when changing any field.

Example — add a tag:

```
Edit: change `tags: [electronics]` to `tags: [electronics, gaming]` in the file, and update `updated_at`.
```

### Adjust stock quantity

1. Read the current file to get the `quantity` value.
2. Calculate the new quantity: `current + delta`.
3. Validate: new quantity must be >= 0. If it would go negative, report an error instead of writing.
4. Edit the `quantity` field and update `updated_at`.

Example — use 4 batteries:

```
Read the file, see quantity: 24.
Edit: change `quantity: 24` to `quantity: 20`, update `updated_at`.
```

### Attach photo link (URL)

For external photo links (Google Photos, etc.), edit the `photos` array to append the URL:

```
Edit: change `photos: []` to `photos: ["https://photos.google.com/..."]`
```

Or append to an existing list:

```
Edit: change `photos: ["url1"]` to `photos: ["url1", "https://new-photo-url"]`
```

(In this laptop version there is no messaging channel, so there is no sending or receiving of photos. Local photo files, if any, live in `_photos/` — see below.)

---

## Photo storage conventions

- Photos live in `_photos/` subdirectory inside the container folder where the item resides.
- Photo filenames should be descriptive, matching the item name.
- The `photos` field in front matter uses relative paths from the container folder.
- Multiple photos per item are supported: `photos: ["_photos/Item.jpg", "_photos/Item 2.jpg"]`
- To display a photo inline in Obsidian, add `![[_photos/Item Name.jpg]]` in the note body.

---

## Safety rules

1. **Stay in the vault**: never write, edit or move files outside `catalog/`. Do not read files outside this project folder.
2. **Preserve IDs**: never change the `id` field of any entity. IDs survive moves and renames.
3. **Update timestamps**: always set `updated_at` to the current ISO-8601 UTC timestamp when modifying any file.
4. **Validate parents**: before creating an item, verify the target container folder and its `_container.md` exist.
5. **Non-negative stock**: never write a `quantity` less than 0. Report an error if an adjustment would go negative.
6. **Readable filenames**: use the item's title as the filename. Replace unsafe characters (`/ \ : * ? " < > |`) with `-`.
7. **One `_container.md` per folder**: every container folder must have exactly one `_container.md`. Never create items named `_container.md`.

---

## Conversation patterns

When the user says things like:

| User says | Action |
|-----------|--------|
| "add X to Y" / "put X in Y" | Create item X in container Y |
| "where is X?" / "find X" | Grep for X, return location chain |
| "what's in Y?" / "show Y" | List contents of container Y |
| "move X to Y" | Move item/container X into container Y |
| "how many X?" | Find stock item X, return quantity |
| "used N of X" / "took N X" | Adjust quantity by -N |
| "bought N X" / "added N X" | Adjust quantity by +N |
| "new room/shelf/box Y" | Create container Y |
| "init catalog" / "set up inventory" | Init the vault if not already done |

Always confirm the action taken and show the resulting location or updated state. Answer in the user's language.
