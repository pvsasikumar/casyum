# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Event-wise Rule Books

Each event document in Firestore can carry its own Rule Book reference:

- `ruleBookUrl` — absolute URL or public path to the PDF (e.g. `/rulebooks/hackathon-rulebook.pdf`)
- `ruleBookFileName` — display name (e.g. `hackathon-rulebook.pdf`)
- `ruleBookVersion` — optional version string (e.g. `1.0`)
- `ruleBookUpdatedAt` — ISO timestamp of the last update
- `ruleBookUpdatedBy` — name of the admin who updated it

Admin can manage the Rule Book in **Event Management → Add/Edit Event → Event Rule Book (PDF)**: upload a PDF directly (only when Firebase Storage is configured), paste a URL/path, and View/Remove the current PDF. PDF-only validation is enforced. A `[ Rule Book ]` button appears on the public event details page, the participant's "My Registrations" cards, and the coordinator's assigned-event cards, and opens the event's own PDF in a new tab. The button is hidden when no Rule Book is attached.

### Public `public/rulebooks/` limitation

Files placed in `public/rulebooks/` are served by the static build **as-is**. They are baked into the deployed bundle, so replacing or adding a PDF there requires a rebuild and redeploy — it will not go live automatically. The Firestore event reference stays correct because the UI always reads the current `ruleBookUrl` from the event document.

Preferred workflow when Firebase Storage is **not** configured:

1. Place the PDF in `public/rulebooks/` with the name shown in the admin form (e.g. `public/rulebooks/hackathon-rulebook.pdf`).
2. In the admin form, use the automatically suggested path `/rulebooks/hackathon-rulebook.pdf` (or paste your own URL) and save the event.

If `VITE_FIREBASE_STORAGE_BUCKET` is later configured, the admin form will offer direct Firebase Storage uploads and the stored `ruleBookUrl` will point to the upload instead.

