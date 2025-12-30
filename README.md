# Screenshot → Structured Data

Generic **screenshot-to-structured-rows** web app:
- Upload up to **50 images**
- Provide a **prompt** + comma-separated **fields**
- Each image is processed **independently** and may yield **0..N rows**
- Preview results and download CSV:
  - with `source_image` provenance column
  - without `source_image`

See `IMPLEMENTATION_GUIDE.md` for the full design, API contract, and “designed to add later” roadmap.

---

## ### Local development

### Backend (FastAPI)

In one terminal:

```bash
cd /home/emma/aiagentprojects/screenshottostructureddata
uv sync
uv run python -m uvicorn backend.app.main:app --reload --reload-dir backend --port 8000
```

Health check:

```bash
curl http://127.0.0.1:8000/health
```

### Frontend (Next.js)

In another terminal:

```bash
cd /home/emma/aiagentprojects/screenshottostructureddata/frontend
npm run dev -- --port 3000
```

Open:
- `http://localhost:3000`

### Backend URL (optional)

The frontend defaults to `http://127.0.0.1:8000`. To override:

```bash
export NEXT_PUBLIC_BACKEND_URL="http://127.0.0.1:8000"
```

---

## ### Notes

- **Anonymous BYOK**: the API key is stored only in the browser, sent per request via `X-API-Key`, and is not persisted server-side.

