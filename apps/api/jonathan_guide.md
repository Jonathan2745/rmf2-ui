## Guide for myself (Jonathan)

### Usage commands (in /apps/api)

#### Running the backend service

1. uv run fastapi dev main.py --host 0.0.0.0 --port 8000 (local)
2. uv run fastapi dev main.py --host 0.0.0.0 --port 8000 (prod)

---

### Personal Notes

frontend calls:
fetch("http://localhost:8000/${whatever route you need}")
