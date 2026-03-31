# Book of Business

Local-first desktop app for industries, companies, and contacts. Data is plain JSON in a folder you choose, so you can sync it with iCloud Drive, OneDrive, or any backup tool.

## Run in development

```bash
npm install
npm run dev
```

## Build a desktop installer

```bash
npm run build
```

Artifacts land in `release/`.

## Library folder layout

```
your-folder/
  manifest.json
  industries/<id>.json
  companies/<id>.json
  contacts/<id>.json
```

Pick a folder inside a cloud-synced directory if you want the same library on multiple machines.
