#!/bin/sh

set -e

echo "Waiting for PostgreSQL database at $POSTGRES_HOST:$POSTGRES_PORT..."
while ! nc -z $POSTGRES_HOST $POSTGRES_PORT; do
  sleep 0.5
done
echo "PostgreSQL is online and reachable."

# Apply database migrations
echo "Applying database migrations..."
python manage.py makemigrations users links analytics --noinput || true
python manage.py migrate --noinput

# Collect static files
echo "Collecting static assets..."
python manage.py collectstatic --noinput || true

exec "$@"
