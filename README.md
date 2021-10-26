# *nvis*

*nvis* is an image stream viewer, with the goal to facilitate image and image stream comparisons. Streams can be of browser-compatible images, or EXR images.  Shaders can be added that have image streams as input (or not).  These can implement any type of function, and the accompanying JSON user interface description allows for interactive adjustment of shader parameters.

**Author:** Jim Nilsson (jnilsson@nvidia.com)

**Copyright:** See below

## Prerequisites

Python - a version that supports `http.server`

## Installation

1. Clone the repository to your favorite location:  `git clone https://github.com/JimNV/nvis-online.git`

2. Start a Python `http.server` by running the start script: `<nvis-location>/bin/nvis.{sh|bat}`

3. Browse to `localhost`.  Tested with Chrome and Firefox.

## Details

A minimal HTML file (e.g., `index.html`) to start *nvis* is the following:

```
<!DOCTYPE html>
<head>
    <title><i>nvis</i></title>
    <script type="text/javascript" src="js/nvis.js"></script>
</head>
<body>
</body>
</html>
```

To create a static *nvis* page with streams and shaders, insert API commands within a `<script>` element within the `<body>` element:

```
<body>
  <script>
    nvis.zoom(2.0);
    nvis.stream([ "ref/image.0000.png", "ref/image.0001.png", "ref/image.0002.png", "ref/image.0003.png" ]);
    nvis.stream([ "test/image.0000.png", "test/image.0001.png", "test/image.0002.png", "test/image.0003.png" ]);
    nvis.shader("glsl/difference.json", [ 0, 1 ], true);
  </script>
</body>
```

## Copyright

**Copyright 2021 NVIDIA Corporation**

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
