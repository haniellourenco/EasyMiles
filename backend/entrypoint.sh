#!/bin/sh

set -e

echo "Applying database migrations..."
python manage.py migrate --noinput

echo "Starting Gunicorn server..."
exec gunicorn --bind 0.0.0.0:8000 core.wsgi:application