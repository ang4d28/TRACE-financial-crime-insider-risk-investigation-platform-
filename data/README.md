# Synthetic data

Labeled TRACE dataset: legitimate activity plus circular-ring, structuring, and insider cases.

Requires a migrated Postgres database (see the root README).

```bash
cd data
# from repo root, with backend venv active:
python scripts/generate_data.py
```

The script wipes existing TRACE tables, inserts rows through the SQLAlchemy models, then prints legit vs suspicious counts.
