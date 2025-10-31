FROM ubuntu:24.04

ENV DEBIAN_FRONTEND="noninteractive"
RUN apt-get update \
    && apt-get install -y \
    build-essential \
    git \
    python3 \
    && rm -rf /var/lib/apt/lists/*
# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app
COPY pyproject.toml uv.lock /app/
RUN uv sync --locked --no-dev
COPY . /app

CMD ["/app/.venv/bin/python", "/app/main.py"]
