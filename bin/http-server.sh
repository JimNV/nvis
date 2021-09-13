#!/bin/bash
PORT=80
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
SCRIPT_DIR=${SCRIPT_DIR%/*}
echo "Starting HTTP server on port ${PORT} in ${SCRIPT_DIR}"
python -m http.server --bind localhost ${PORT} -d ${SCRIPT_DIR}/
