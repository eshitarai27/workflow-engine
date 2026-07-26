# Contributing

## Setup

```bash
python -m venv .venv
.venv/Scripts/activate   # or source .venv/bin/activate on macOS/Linux
pip install -r requirements-dev.txt
pytest -v
```

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Project layout

See [`docs/architecture.md`](docs/architecture.md) for the full picture. In short: `src/models` holds the domain types, `src/compiler` and `src/planner` turn a workflow definition into a runnable plan, `src/engine` runs it, `src/plugins` is where node actions live, and `src/api` exposes all of it over REST.

## Adding a plugin

1. Create `src/plugins/your_plugin.py` with a class extending `Plugin` (see any existing plugin for the shape: `metadata`, `validate`, `execute`).
2. Register it in `build_default_registry` in `src/plugins/registry.py`.
3. Add a test in `tests/test_plugins.py`.

Nothing else needs to change. The engine only ever calls `plugin.execute(config, context)`.

## Tests

Run `pytest -v` before opening a PR. The suite covers the compiler, planner, engine, plugins, event bus, storage, scheduler, and the REST API end to end. New behavior should come with a test that would fail without it.

## Commit messages

Plain, short, present tense. Explain why a change exists if it isn't obvious from the diff.

## Reporting issues

Open a GitHub issue with what you expected, what happened instead, and the workflow definition (or a minimal one) that reproduces it.
