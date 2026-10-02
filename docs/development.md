# Development and validation

[Project overview](../README.md) · [Architecture](architecture.md) · [Portuguese guide](README.pt.md)

## Clean checkout

Use Node.js 22.12+ in the Node 22 line, or Node 24, and npm:

```sh
npm ci --ignore-scripts
npm run check
npm run build
npm test
```

`check` runs strict TypeScript checking. `build` bundles source into `extension/`, copies options HTML/CSS and dependency licences, and generates the manifest. `test` compiles actual core/adapter modules into ignored `tests/compiled/` and runs Node regression tests using jsdom for the adapter. The runner fails when no test files exist.

Build does not generate a mocked settings page. Browser checks use the actual extension options page, avoiding duplicate UI and simulated storage APIs. `tests/fixture.html` is the source-controlled synthetic customer DOM contract.

## Test coverage

Eleven Node regression tests cover international/national numbers, missing country, invalid numbers, template expansion, missing/unknown variables, Unicode URL round trips, corrupt text, configuration defaults/migration/limits, oversized images, total storage budget, legacy image references, and defensive customer extraction. Adapter cases include missing/duplicated/loading/unrelated fields, hidden duplicates, current primary value, no alternate fallback, and changed values/nodes.

Image core tests check signature/format rejection and references, not full browser decoding. The tiny signature fixture is not claimed as a decodable PNG.

## Browser validation

Prerequisites: Python 3 and Playwright Python, with its bundled Chromium installed. No npm Playwright dependency or external personal browser profile is needed.

```sh
python -m pip install playwright==1.61.0
python -m playwright install chromium
npm run build
npm run test:browser
```

On Linux, install browser system dependencies with `python -m playwright install --with-deps chromium`. If Python is not named `python`, set the `PYTHON` environment variable to its executable before running the npm command.

The runner loads the actual built Manifest V3 extension in a disposable persistent Chromium profile. It intercepts Zappy with `tests/fixture.html` and intercepts all WhatsApp handoffs. Checks cover injection, normalized recipient, rendered template URL, changed-phone draft invalidation, immediate pre-launch recipient recheck, real options saves, stale-tab conflict blocking, removal/undo, and invalid-save preservation. No message is sent. Temporary profile is removed afterwards.

Synthetic checks validate the expected DOM contract, not live Zappy compatibility. Image clipboard/paste, truly simultaneous saves, responsive/accessibility behavior, WhatsApp account availability, Web/Desktop routing, and delivery are not covered by this replacement suite.

## CI and historical evidence

[Checks workflow](../.github/workflows/check.yml) runs install, type checking, build, and Node tests on push/PR with Node 24. Browser validation remains an explicit local check; Python/browser setup is not added to core CI.

Original tests were not recoverable from inspected Git history, branches, reflog, unreachable commit trees, or available local artifacts. `.gitignore` excluded generated test modules, not test sources. The suite here is a focused replacement, not a restoration of the historical 40–42 tests.

[`VALIDATION.txt`](../VALIDATION.txt) preserves older notes and records current validation separately. Historical number-only image URLs and caption-copy controls describe superseded behavior.

## Documentation assets

[`customer-panel.png`](assets/customer-panel.png) uses actual extension UI against a synthetic page. [`settings.png`](assets/settings.png) shows actual options with demonstration values. Captures use fictitious names, reserved fictional numbers and `example.com`; no real customers or personal profile.

For replacement captures, use isolated profiles, intercept outbound handoffs, and inspect full images for private data. Text-only templates launch directly; do not invent an extension preview step in demonstrations.
