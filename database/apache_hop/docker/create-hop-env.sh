#!/bin/bash

set -euo pipefail

HOP_ENV_FILE="${HOP_ENVIRONMENT_CONFIG_FILE_NAME_PATHS:-/tmp/latteshub-hop-env.json}"

"${DEPLOYMENT_PATH}/hop-conf.sh" \
  --config-file="${HOP_ENV_FILE}" \
  --config-file-set-variables="DB_HOST=${DB_HOST},DB_PORT=${DB_PORT},DB_NAME=${DB_NAME},DB_USER=${DB_USER},DB_PASSWORD=${DB_PASSWORD},DB_SSLMODE=${DB_SSLMODE:-disable}"
