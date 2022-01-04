# SPDX-FileCopyrightText: Copyright (c) 2021 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
# SPDX-License-Identifier: BSD-3-Clause
# 
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are met:
#
# 1. Redistributions of source code must retain the above copyright notice, this
# list of conditions and the following disclaimer.
#
# 2. Redistributions in binary form must reproduce the above copyright notice,
# this list of conditions and the following disclaimer in the documentation
# and/or other materials provided with the distribution.
#
# 3. Neither the name of the copyright holder nor the names of its
# contributors may be used to endorse or promote products derived from
# this software without specific prior written permission.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
# AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
# IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
# DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
# FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
# DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
# SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
# CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
# OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
# OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
#

import argparse
import glob
from http.server import HTTPServer, SimpleHTTPRequestHandler
import json
import os
import re
import subprocess
import sys
import webbrowser


HTML = """
<!DOCTYPE html>
<html lang="en">
<head>
    <title>nvis</title>
    <script type="text/javascript" src="nvis.js"></script>
</head>
<body>
    <script>
        nvis.config("nvis_config.json");
    </script>
</body>
</html>
"""


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('dirs', type=str, nargs='+')
    parser.add_argument('-p', '--port', type=int, default='8000')
    parser.add_argument('-v', '--verbose', action='store_true')
    args = parser.parse_args()
    return args


def get_streams(output_dir):
    files = glob.glob(os.path.join(output_dir, '*'))
    # pylint: disable=W1401
    stream_paths = set([re.sub('_[0-9]{5}\.png', '', f)  # noqa
                        for f in files
                        if re.search('_[0-9]{5}\.png', f)])
    streams = []
    for stream_path in stream_paths:
        stream_type = os.path.split(stream_path)[1]
        stream_name = "/".join([output_dir, stream_type])
        stream_files = glob.glob(os.path.join(
            output_dir, f'{stream_type}_*png'))

        stream_files.sort()
        streams.append(
            {"name": stream_name,
             "window": True,
             "images": stream_files}
        )

        print(f"Add {stream_path}: {len(stream_files)} images")

    return streams


def main(args):
    # Get image paths.
    streams = []
    for d in args.dirs:
        streams += (get_streams(d))

    # Setup nvis config and html files.
    nvis_config = {
        "name": "Pytorch output images",
        "streams": streams,
    }
    with open('nvis_config.json', 'w') as f:
        f.write(json.dumps(nvis_config))
    with open('index.html', 'w') as f:
        f.write(HTML)

    # Start http server.
    http_server_command = ['python', '-m', 'http.server',
                           '--bind', 'localhost', repr(args.port)]
    if args.verbose:
        server_process = subprocess.Popen(http_server_command)
    else:
        server_process = subprocess.Popen(
            http_server_command, stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)

    # Open browser.
    url = f'http://localhost:{args.port}/'
    if sys.platform == 'win32':
        os.startfile(url)
    else:
        try:
            subprocess.Popen(['xdg-open', url])
        except OSError:
            print(f'Please open a browser on: {url}')

    # Stay here until interrupted.
    try:
        while True:
            pass
    except:
        pass
    finally:
        server_process.kill()


if __name__ == "__main__":
    args = parse_args()
    main(args)
