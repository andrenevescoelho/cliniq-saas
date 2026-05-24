#!/bin/sh
set -e

create_db_if_not_exists() {
  db_name="$1"
  exists=$(psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${db_name}'")

  if [ "$exists" != "1" ]; then
    echo "Creating database ${db_name}..."
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres -c "CREATE DATABASE \"${db_name}\";"
  else
    echo "Database ${db_name} already exists, skipping."
  fi
}

create_db_if_not_exists "${N8N_POSTGRES_DB:-n8n_db}"
create_db_if_not_exists "${EVOLUTION_POSTGRES_DB:-evolution_db}"
