# -----------------------------------------------------------------------------
# Estágio 1: Build (Instalação de dependências)
# -----------------------------------------------------------------------------

FROM python:3.11-slim as builder

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .


RUN pip_no_cache_dir=1 pip install --upgrade pip \
    && pip_no_cache_dir=1 pip install gunicorn pytest-cov \
    && pip_no_cache_dir=1 pip install -r requirements.txt

# -----------------------------------------------------------------------------
# Estágio 2: Final (Imagem de produção)
# -----------------------------------------------------------------------------
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends postgresql-client \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

COPY . .

EXPOSE 8000

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "core.wsgi:application"]