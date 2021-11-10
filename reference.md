# *nvis* Reference Manual

**Author:** Jim Nilsson (jnilsson@nvidia.com)

**Copyright:** See below

## Keyboard commands

```
Tab - open user interface, to manipulate settings, streams, and shaders
'h' - hold to show the list of keyboard shortcut commands
'o' - open file input dialog
```

## API

A normal and minimal landing page that invokes *nvis* is the following:
```<!DOCTYPE html>
<html lang="en">
<head>
    <title>nvis</title>
    <meta charset="utf-8" />
    <script type="text/javascript" src="js/nvis.js"></script>
</head>
<body>
    <script>
        [API command]
        ...
    </script>
</body>
</html>
```
Each API command is one of the following:
```
nvis.zoom(<value>) - Set zoom level to <value> (default: 1.0)
    Example:  nvis.zoom(2.0);  //  Set zoom level to 2.0

nvis.config(<filename>) - Load config file named <filename>
    Example:  nvis.config("test.json");  //  Load config file named "test.json"

nvis.stream(<filename> | "[" <filename>+ "]", window = true) - Load stream of single or multiple image files
    Examples:  nvis.stream("image.png");  //  Load image "image.png" to single stream, and open a window for it
               nvis.stream([ "ref/img.0000.exr", "ref/img.0001.exr", "ref/img.0002.exr" ], false);  //  Load three EXR images to stream, and do not open a window for it

nvis.shader(<filename>, "[" <input stream id]>+ "]", window = true)

nvis.generator(<filename>, <width>, <height>, window = true)

nvis.video(<filename>)

nvis.annotation(<window id>, <parameter object>) - Add annotation to a stream window
    Examples:  nvis.annotation(0, "arrow", { position: { x: 1, y: 1 }, color: { r: 1.0, g: 0.5, b: 0.2 }, size: 10, rotation: 330, zoom: true })
               nvis.annotation(0, "circle", { position: { x: 10, y: 10 }, radius: 5, width: 1 });

```

## Configuration

Example configuration file, e.g., `test.json`:
```
{
    "name": "Example configuration",
    "shaders": [
        "glsl/difference.json"
    ],
    "streams": [
        {
            "name": "Reference stream",
            "window": true,
            "images": [
                "images/triangle.0000.png",
                "images/triangle.0001.png",
                "images/triangle.0002.png",
                "images/triangle.0003.png",
                "images/triangle.0004.png",
                "images/triangle.0005.png",
                "images/triangle.0006.png",
                "images/triangle.0007.png",
                "images/triangle.0008.png"
            ]
        },
        {
            "name": "Test stream",
            "window": true,
            "images": [
                "images/triangle.0001.png",
                "images/triangle.0002.png",
                "images/triangle.0003.png",
                "images/triangle.0004.png",
                "images/triangle.0005.png",
                "images/triangle.0006.png",
                "images/triangle.0007.png",
                "images/triangle.0008.png",
                "images/triangle.0009.png"
            ]
        },
        {
            "window": true,
            "name": "Difference stream",
            "shader": 0,
            "inputs": [
                0,
                1
            ]
        }
    ]
}
```


## Copyright

**Copyright 2021 NVIDIA Corporation**

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
