#!/bin/bash
PORT=80
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
NVIS_DIR=${SCRIPT_DIR%/*}

#PYTHON_VERSION=`python --version`
echo [Nvis]  Starting HTTP server on port ${PORT} in ${NVIS_DIR}
python -m http.server --bind localhost ${PORT} -d ${NVIS_DIR}/
