from __future__ import annotations

import logging
import os


def configure_logging() -> None:
    """
    Configure app logging once at startup.
    Keeps logs simple/parseable for local dev + Fly.io.
    """
    level_name = os.getenv("LOG_LEVEL", "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)

    root = logging.getLogger()
    root.setLevel(level)

    # Avoid duplicate handlers if reloaded by uvicorn.
    if root.handlers:
        return

    handler = logging.StreamHandler()
    handler.setLevel(level)

    class _DefaultRequestIdFilter(logging.Filter):
        def filter(self, record: logging.LogRecord) -> bool:
            # Ensure our formatter always has request_id, even for logs from other libs.
            if not hasattr(record, "request_id"):
                record.request_id = "-"  # type: ignore[attr-defined]
            return True

    handler.addFilter(_DefaultRequestIdFilter())

    fmt = (
        "%(asctime)s %(levelname)s "
        "[%(name)s] "
        "request_id=%(request_id)s "
        "%(message)s"
    )
    handler.setFormatter(logging.Formatter(fmt=fmt))
    root.addHandler(handler)


class RequestIdAdapter(logging.LoggerAdapter):
    def process(self, msg, kwargs):
        extra = kwargs.get("extra") or {}
        extra.setdefault("request_id", getattr(self, "request_id", "-"))
        kwargs["extra"] = extra
        return msg, kwargs


