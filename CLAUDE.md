# CLAUDE.md

## Project Overview

A lightweight, dependency-free Python calculator for occupancy-aware single-EV (extracellular vesicle) droplet assay design and reporting. Implements Poisson probability metrics for analyzing droplet microfluidics experiments. Designed to support a review manuscript with reproducible anchor values.

## Repository Structure

```
single_ev_droplet_calculator/   # Main package
├── __init__.py                 # Public API exports
├── core.py                     # Core mathematical functions and dataclasses
└── cli.py                      # CLI with subcommands (summary, compare, plan)
tests/
└── test_core.py                # Unit tests validating against manuscript values
scripts/
└── reproduce_anchor_table.py   # Generates CSV of anchor values for manuscript
examples/
└── example_inputs.json         # Example input parameters
pyproject.toml                  # Build config and metadata (setuptools)
CITATION.cff                    # Citation metadata
```

## Tech Stack

- **Language:** Python 3.10+ (uses `from __future__ import annotations`)
- **Dependencies:** None — stdlib only (`math`, `statistics`, `dataclasses`, `argparse`, `json`)
- **Build system:** setuptools (>=64) + wheel, configured via `pyproject.toml`
- **Testing:** `unittest` (stdlib)
- **CI/CD:** None configured

## Common Commands

```bash
# Install in editable mode for development
python3 -m pip install -e .

# Run all tests
python3 -m unittest discover -s tests -v

# Run CLI
evdroplet summary --lambda 0.10
evdroplet compare --lambda-a 0.10 --lambda-b 0.20
evdroplet plan --target-single-events 10000 --lambda 0.10 --q-qc 0.6 --q-identity 0.7

# Reproduce manuscript anchor table
python3 scripts/reproduce_anchor_table.py
```

## Architecture & Key Concepts

### core.py — Mathematical Engine

All core logic lives in pure functions with no side effects:

- `occupancy_metrics(lambda_value)` — Poisson occupancy: P_empty, P_single, P_multi≥2, purity
- `lambda_from_empty_fraction(f_empty)` — Inverse lambda estimation from observed empty fraction
- `wilson_interval(k_success, n_total, confidence)` — Wilson binomial confidence interval
- `lambda_confidence_interval_from_empty_counts()` — CI propagation for lambda estimates
- `expected_interpretable_single_events()` — Forward planning (droplets → expected events)
- `required_droplets_for_target_events()` — Inverse planning (target events → required droplets)
- `compare_operating_points(lambda_a, lambda_b)` — Compare two lambda values
- `dual_single_pair_probability()` / `dual_any_multi_probability()` — Dual-entity pair occupancy

Data containers are frozen (immutable) dataclasses: `OccupancyMetrics`, `WilsonInterval`, `ComparisonMetrics`.

### cli.py — Command-Line Interface

Three subcommands (`summary`, `compare`, `plan`) with text and JSON (`--json`) output formats. Registered as `evdroplet` entry point in `pyproject.toml`.

### Input Validation

Private helpers `_validate_lambda()` and `_validate_fraction()` raise `ValueError` on invalid inputs. Tests verify these raise correctly.

## Code Conventions

- **Pure functions** — no classes for logic, no side effects
- **Frozen dataclasses** — all data containers use `@dataclass(frozen=True)`
- **Type hints everywhere** — all parameters and return types annotated
- **snake_case** — functions, variables, and parameters
- **Underscore prefix** — private helpers (`_validate_lambda`, `_validate_fraction`, `_fmt`)
- **Math-domain naming** — parameters match mathematical notation (lambda_value, p_empty, q_qc)
- **No external dependencies** — intentional for scientific reproducibility and portability

## Testing

Tests use `unittest.TestCase` and validate core calculations against known manuscript anchor values at lambda=0.10 and lambda=0.20. Key test areas:

- Anchor value precision (6+ decimal places)
- Ratio comparisons between operating points
- Planning calculations (forward and inverse)
- Lambda estimation from empty fractions
- Confidence interval bounds
- Invalid input rejection (`ValueError`)

Run with: `python3 -m unittest discover -s tests -v`

## Development Guidelines

- Keep the project dependency-free (stdlib only)
- All new math functions should be pure functions returning frozen dataclasses where appropriate
- Validate inputs with the existing `_validate_*` helpers
- Add tests that check against known analytical values, not just smoke tests
- Maintain backward compatibility of the public API exported from `__init__.py`
- The CLI entry point is `evdroplet` — add new subcommands following the existing pattern in `cli.py`
