### Refactor plan for `hx-optimistic.js`

- **Goals**: smaller surface area, fewer branches, no DOM side-effects during config, single interpolation path, unified snapshot/revert, clearer event routing.

- **Key issues today**:
  - **Duplication**: `renderTemplate` vs `evaluateValue`; multiple target-resolution branches; repeated class toggling; dual snapshot stores (WeakMap + dataset). Prefer the weakmap.
  - **Hidden side-effects**: `enhanceConfig` mutates `data-optimistic` and may set `hx-target`.
  - **Concurrency semantics**: tokens stored in `dataset` but not enforced on revert.
  - **Cleanup spread**: `precisionCleanup` and `revertOptimistic` partially overlap.

- **Architecture simplification**:
  - **Config lifecycle**: introduce `configCache` (WeakMap). Parse once from `data-optimistic`; normalize with defaults; do not rewrite `dataset`. Back-compat mapper: map `optimisticTemplate`→`template`, `errorTemplate`→`errorTemplate`, `errorTarget`→`errorMode`. no backwards compat needed bc this library is not released yet.
  - **Target resolution**: single `resolveTarget(sourceElt, evt, isError)` that handles `this`, `closest`, and selectors without mutating attributes.
  - **Interpolation**: one `interpolate(str, ctx)` used by both templates and values; supports `this.value`, `this.dataset.*`, and `data.*` for error context. Remove `evaluateValue` and route all through `interpolate`.
  - **Snapshot store**: single WeakMap `snapshots` for all cases; store `{innerHTML, className, textContent?, sourceElt, config, token}`. Drop dataset-based snapshots to reduce code and DOM churn.
  - **State classes**: `setState(target, state)` toggles `hx-optimistic`, `hx-optimistic-error`, `hx-optimistic-reverting` centrally.
  - **Tokens**: WeakMap `tokens` keyed by target; increment on `beforeRequest`; include in snapshot; check in error/revert to avoid stale reverts.

- **Event routing (single switch → small table)**:
  - Map events to handlers: `beforeRequest`→apply optimistic; `responseError|swapError|timeout|sendError`→error; `afterSwap`→cleanup.
  - Determine `isError` once; resolve `source` and `target` via `resolveTarget` for both success and error paths.

- **Apply path**:
  - `applyOptimistic(target, source, config, token)`:
    - snapshot into WeakMap
    - render `config.template` via `interpolate` or apply `config.values`
    - `setState(target, 'optimistic')`

- **Error path**:
  - `handleError(target, source, evt)`:
    - read `config` from cache or snapshot
    - if token mismatch, abort
    - `setState(target, 'error')`
    - render `config.errorTemplate` or `config.errorMessage` with `data` context; support `errorMode: 'append'|'replace'|'none'`
    - schedule `revert(target, token)` after `config.revertDelay`

- **Revert/Cleanup**:
  - `revert(target, token)` restores from snapshot, respects token, removes appended error nodes (mark them with `data-hx-optimistic-error="1"`), calls `htmx.process(target)` after restore.
  - `cleanup(target)` used by `afterSwap` and `revert`; removes optimistic classes and deletes snapshot/token entries.

- **Config normalization defaults**:
  - Inputs/textarea: default `values: { textContent: "${this.value}" }` plus add `optimistic-pending` class on target.
  - Button: default loading text via `config.loadingText || 'Loading...'`.
  - Others: default to class add only.
  - Defaults set in-memory; do not mutate `data-optimistic` or `hx-target`.

- **API/behavior compatibility**:
  - Continue reading `data-optimistic` JSON and simple string forms.
  - Support existing keys (`optimisticTemplate`, `errorTemplate`, `errorTarget`) via normalization mapper.

- **Build/distribution**:
  - Single source at repo root; postbuild copy to `demo/public/` or make demo import from root. Add a tiny build (e.g., `esbuild`/`tsup`) to minify and generate `.min.js`.

- **Estimated impact**:
  - Remove duplicated branches and dataset snapshot path; expect ~25–35% LOC reduction and fewer DOM writes.
  - Clearer flow: parse → resolve → snapshot → apply → error/revert/cleanup.

- **Implementation steps**:
  1) Add `configCache`, `snapshots`, `tokens`, and `interpolate`, `resolveTarget`, `setState`, `cleanup` utilities.
  2) Replace `renderTemplate`/`evaluateValue` with `interpolate` across code.
  3) Migrate snapshot storage to WeakMap only; delete dataset snapshot code paths.
  4) Rework `enhanceConfig` into `normalizeConfig` that returns a config without mutating DOM; call it at use sites.
  5) Consolidate event switch into a small dispatcher using the utilities.
  6) Unify error UI (`errorMode`) and token-checked revert.
  7) Remove duplicate file in `demo/public/` and wire a copy step.

