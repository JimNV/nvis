# *nvis* Reference Manual

**Author:** Jim Nilsson (jnilsson@nvidia.com)

**Copyright:** See below

- - -

**Keyboard commands**

```
Tab - open *nvis* UI, to manipulate settings, streams, and shaders
'h' - hold to show the list of keyboard shortcut commands
'o' - open file input dialog
```

*nvis* is an image stream viewer, with the goal to facilitate image and image stream comparisons. Streams can be of browser-compatible images, or EXR images.  Shaders can be added that have image streams as input (or not).  These can implement any type of function, and the accompanying JSON user interface description allows for interactive adjustment of shader parameters.


**API**

```
nvis.zoom(<value>) - Set zoom level to <value> (default: 1.0)

nvis.config()

nvis.stream()

nvis.shader()

nvis.generator()

nvis.video()
```

**Config**

Example:
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


- - -

**Copyright 2021 NVIDIA Corporation**

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
