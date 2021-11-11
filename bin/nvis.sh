#!/bin/bash
PORT=80
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
NVIS_DIR=${SCRIPT_DIR%/*}
SERVER=http.server
#SERVER=RangeHTTPServer

PYTHON_VERSION=`python --version`
echo [nvis]  Starting HTTP server on port ${PORT} in ${NVIS_DIR}
PYTHON_MAJOR=${PYTHON_VERSION%%.*}
PYTHON_MAJOR=${PYTHON_MAJOR//[!0-9]}
if [[ $PYTHON_MAJOR -lt 3 ]]; then
    cd ${NVIS_DIR}
    python -m SimpleHTTPServer ${PORT}
else
    python -m http.server --bind localhost ${PORT} -d ${NVIS_DIR}/
fi
