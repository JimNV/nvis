//  Copyright 2021 NVIDIA Corporation
//
//  Redistribution and use in source and binary forms, with or without modification, are permitted provided
//  that the following conditions are met:
//
//  1. Redistributions of source code must retain the above copyright notice,
//     this list of conditions and the following disclaimer.
//  2. Redistributions in binary form must reproduce the above copyright notice,
//     this list of conditions and the following disclaimer in the documentation and/or
//     other materials provided with the distribution.
//  3. Neither the name of the copyright holder nor the names of its contributors may be
//     used to endorse or promote products derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES,
//  INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
//  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY,
//  OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
//  OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
//  OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
//  POSSIBILITY OF SUCH DAMAGE.

'use strict';

var nvis = new function () {
    let _renderer = undefined;
    let _streams = [];

    let _settings = [
        {
            "type": "title",
            "text": "Windows"
        },
        {
            "id": "bAutomaticLayout",
            "type": "bool",
            "name": "Automatic layout",
            "value": true
        },
        {
            "id": "layoutWidth",
            "type": "int",
            "name": "Automatic layout",
            "value": 2,
            "min": 1
        }
    ];

    let _state = {
        layout: {
            border: 50,
            bAutomatic: true,
            dimensions: {
                w: 1,
                h: 1
            },
            automaticDimensions: {
                w: 1,
                h: 1
            },
            getDimensions: function () {
                return (_state.layout.bAutomatic ? _state.layout.automaticDimensions : _state.layout.dimensions);
            }
        },
        zoom: {
            LowFactor: Math.pow(Math.E, Math.log(2) / 8.0),
            HighFactor: Math.pow(Math.E, Math.log(2) / 4.0),
            level: 1.0,
            winAspectRatio: 1.0,
            mouseWinCoords: {  //  mouse position at zoom [0, 1]
                x: 0.0,
                y: 0.0
            },
            streamOffset: {  //  top-left relative stream offset [0, 1]
                x: 0.0,
                y: 0.0
            },
        },
        input: {
            mouse: {
                canvasCoords: { x: 0, y: 0 },
                previousCanvasCoords: { x: 0, y: 0 },
                clickPosition: { x: 0, y: 0 },
                down: false
            },
            keyboard: {
                shift: false
            }
        }
    }

    let _init = function () {
        _renderer = new NvisRenderer();
        _renderer.start();
    }


    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////

    let _clamp = function (value, min = 0.0, max = 1.0) {
        return Math.max(Math.min(value, max), min);
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////

    function NvisShaderUI(object) {
        let _object = object;
        let _dom = document.createDocumentFragment();

        let _get = function (key) {
            return _object[key].value;
        }

        let _update = function (elementId) {
            //_object[key].value = value;
            let key = elementId.replace(/\-.*$/, "");
            let element = document.getElementById(elementId);
            let type = _object[key].type;
            _object[key].value = (type == "bool" ? element.checked : (type == "dropdown" ? element.selectedIndex : element.value));

            let elementValue = document.getElementById(elementId + "-Value");
            if (elementValue !== null) {
                elementValue.innerHTML = element.value;
            }

            console.log(key + ": " + _object[key].value);
        }

        let _setUniforms = function (glContext, shaderProgram) {
            for (let key of Object.keys(object)) {
                let type = _object[key].type;
                let uniform = glContext.getUniformLocation(shaderProgram, key);

                if (uniform === undefined) {
                    continue;
                }

                if (type == "bool") {
                    glContext.uniform1i(uniform, (_object[key].value ? 1 : 0));
                }

                if (type == "float") {
                    glContext.uniform1f(uniform, _object[key].value);
                }

                if (type == "dropdown") {
                    glContext.uniform1i(uniform, _object[key].value);
                }
            }
        }

        let _getDOM = function (streamId) {
            _dom = document.createDocumentFragment();

            let table = document.createElement("table");
            table.style.marginLeft = "50px";

            for (let key of Object.keys(_object)) {
                let label = document.createElement("label");
                label.setAttribute("for", key);
                label.innerHTML = _object[key].name;

                let elementId = (key + "-" + streamId);  //  need uniqueness

                let callbackString = "nvis.streamUpdateParameter(" + streamId + ", \"" + elementId + "\")";

                let row = document.createElement("tr");

                let el = undefined;
                let type = _object[key].type;
                if (type == "bool" || type == "float") {
                    el = document.createElement("input");
                    el.setAttribute("id", elementId);

                    if (type == "bool") {
                        el.setAttribute("type", "checkbox");
                        if (_object[key].value) {
                            el.setAttribute("checked", true);
                        }
                        else {
                            el.removeAttribute("checked");
                        }
                        el.setAttribute("onclick", callbackString);
                    }
                    else if (type == "float") {
                        el.setAttribute("type", "range");
                        el.setAttribute("min", (_object[key].min ? _object[key].min : 0.0));
                        el.setAttribute("max", (_object[key].max ? _object[key].max : 1.0));
                        el.setAttribute("value", (_object[key].value ? _object[key].value : 0.0));
                        el.setAttribute("step", (_object[key].step ? _object[key].step : 0.1));
                        el.setAttribute("oninput", callbackString);
                        let oEl = document.createElement("span");
                        oEl.id = (elementId + "-Value");
                        oEl.innerHTML = (oEl.innerHTML == "" ? _object[key].value : oEl.innerHTML);
                        //console.log("oEL: '" + oEl.innerHTML + "'");
                        label.innerHTML += " (" + oEl.outerHTML + ")";
                    }
                }
                else if (type == "dropdown") {
                    el = document.createElement("select");
                    el.setAttribute("id", elementId);
                    el.setAttribute("onchange", callbackString);
                    for (let optionId = 0; optionId < _object[key].alternatives.length; optionId++) {
                        let oEl = document.createElement("option");
                        if (_object[key].value == optionId) {
                            oEl.setAttribute("selected", true);
                        }
                        //oEl.setAttribute("value", _object[key].alternatives[optionId].value);
                        oEl.innerHTML = _object[key].alternatives[optionId];
                        el.appendChild(oEl);
                    }
                }

                if (el !== undefined) {
                    if (type == "bool") {
                        let cell = document.createElement("td");
                        cell.setAttribute("multicolumn", 2);
                        cell.innerHTML = el.outerHTML + label.outerHTML;

                        row.appendChild(cell);
                    }
                    else {
                        let elCell = document.createElement("td");
                        elCell.innerHTML = el.outerHTML;
                        let labelCell = document.createElement("td");
                        labelCell.innerHTML = label.outerHTML;

                        row.appendChild(labelCell);
                        row.appendChild(elCell);
                    }

                    table.appendChild(row);
                }
            }

            _dom.appendChild(table);

            return _dom;
        }

        let _toFragment = function () {

        }

        return {
            get: _get,
            update: _update,
            setUniforms: _setUniforms,
            getDOM: _getDOM,
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////

    class NvisDraw {

        constructor(glContext, mode = "lines") {
            this.glContext = glContext;

            //  TODO: make dynamic, or as input to constructor
            const MaxVertices = 1024;

            this.mode = this.glContext.LINES;

            switch (mode) {
                case "points":
                    this.mode = this.glContext.POINTS;
                    break;
                case "linestrip":
                    this.mode = this.glContext.LINE_STRIP;
                    break;
                case "lineloop":
                    this.mode = this.glContext.LINE_LOOP;
                    break;
                case "triangles":
                    this.mode = this.glContext.TRIANGLES;
                    break;
                case "trianglestrip":
                    this.mode = this.glContext.TRIANGLE_STRIP;
                    break;
                case "trianglefan":
                    this.mode = this.glContext.TRIANGLE_FAN;
                    break;
                case "lines":
                default:
                    this.mode = this.glContext.LINES;
                    break;
            }

            this.pointSize = 1.0;

            this.vertexPositionBuffer = this.glContext.createBuffer();
            this.colorValueBuffer = this.glContext.createBuffer();

            this.numVertices = 0;
            this.vertexPositions = new Float32Array(MaxVertices * 2);
            this.vertexColors = new Float32Array(MaxVertices * 4);

            // const [minSize, maxSize] = glContext.getParameter(glContext.ALIASED_POINT_SIZE_RANGE);
            // const [minSize, maxSize] = glContext.getParameter(glContext.ALIASED_LINE_WIDTH_RANGE);

            this.vertexSource = `#version 300 es
            precision highp float;
            in vec2 aVertexPosition;
            in vec4 aVertexColor;
            out vec4 vColor;
            uniform float uPointSize;
            void main()
            {
                vColor = aVertexColor;
                gl_PointSize = uPointSize;
                gl_Position = vec4(aVertexPosition, 0.0, 1.0);
            }`;
            this.fragmentSource = `#version 300 es
            precision highp float;
            in vec4 vColor;
            out vec4 color;
            void main()
            {
                color = vColor;
            }`;

            this.vertexShader = this.glContext.createShader(this.glContext.VERTEX_SHADER);
            this.fragmentShader = this.glContext.createShader(this.glContext.FRAGMENT_SHADER);
            this.shaderProgram = this.glContext.createProgram();

            this.glContext.shaderSource(this.vertexShader, this.vertexSource);
            this.glContext.compileShader(this.vertexShader);
            if (!this.glContext.getShaderParameter(this.vertexShader, this.glContext.COMPILE_STATUS)) {
                alert("WebGL: " + this.glContext.getShaderInfoLog(this.vertexShader));
            }
            this.glContext.shaderSource(this.fragmentShader, this.fragmentSource);
            this.glContext.compileShader(this.fragmentShader);
            if (!this.glContext.getShaderParameter(this.fragmentShader, this.glContext.COMPILE_STATUS)) {
                alert("WebGL: " + this.glContext.getShaderInfoLog(this.fragmentShader));
            }

            this.glContext.attachShader(this.shaderProgram, this.vertexShader);
            this.glContext.attachShader(this.shaderProgram, this.fragmentShader);
            this.glContext.linkProgram(this.shaderProgram);

            if (!this.glContext.getProgramParameter(this.shaderProgram, this.glContext.LINK_STATUS)) {
                alert("Could not initialize shader!");
            }
        }


        clear() {
            this.numVertices = 0;
        }


        setPointSize(size) {
            this.pointSize = size;
        }


        addVertex(position, color = { r: 1.0, g: 1.0, b: 1.0, a: 1.0 }) {
            let vp = this.numVertices * 2;
            let cp = this.numVertices * 4;
            this.vertexPositions[vp] = position.x * 2.0 - 1.0;
            this.vertexPositions[vp + 1] = -position.y * 2.0 + 1.0;
            this.vertexColors[cp] = color.r
            this.vertexColors[cp + 1] = color.g;
            this.vertexColors[cp + 2] = color.b;
            this.vertexColors[cp + 3] = (color.a === undefined ? 1.0 : color.a);
            this.numVertices++;
        }


        addSegmentLine(v0, v1, segments, colors, bInterpolated = false) {
            let dx = (v1.x - v0.x) / segments;
            let dy = (v1.y - v0.y) / segments;
            let v = v0;

            let color = 0;
            for (let i = 0; i < segments; i++) {
                this.addVertex(v, colors[color]);
                v = { x: v.x + dx, y: v.y + dy };
                if (i > 0 || i < segments - 1) {
                    if (bInterpolated) {
                        color = 1 - color;
                    }
                    this.addVertex(v, colors[color]);
                    if (!bInterpolated) {
                        color = 1 - color;
                    }
                }
            }
        }


        render() {
            if (this.numVertices == 0) {
                return;
            }

            let gl = this.glContext;

            gl.useProgram(this.shaderProgram);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.vertexPositions, gl.STATIC_DRAW);
            let aVertexPosition = gl.getAttribLocation(this.shaderProgram, 'aVertexPosition');
            gl.vertexAttribPointer(aVertexPosition, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(aVertexPosition);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.colorValueBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.vertexColors, gl.STATIC_DRAW);
            let aVertexColor = gl.getAttribLocation(this.shaderProgram, 'aVertexColor');
            gl.vertexAttribPointer(aVertexColor, 4, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(aVertexColor);

            if (this.mode == gl.POINTS) {
                gl.uniform1f(gl.getUniformLocation(this.shaderProgram, "uPointSize"), this.pointSize);
            }

            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

            gl.drawArrays(this.mode, 0, this.numVertices);
        }
    }


    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////


    class NvisGridDrawer extends NvisDraw {

        constructor(glContext) {
            super(glContext, "lines");

            this.color = { r: 0.8, g: 0.8, b: 0.8, a: 1.0 };
            this.offset = { x: 0.0, y: 0.0 };  //  pixels
            this.pixelSize = { w: 0.0, w: 0.0 };
        }

        update(windowId, offset, pixelSize, alpha = 1.0) {
            //  only update if there's a change
            if (this.offset.x == offset.x && this.offset.y == offset.y && this.pixelSize.w == pixelSize.w) {
                return;
            }

            let layoutDims = _state.layout.getDimensions();
            let dim = { w: 1.0 / layoutDims.w, h: 1.0 / layoutDims.h };
            let winOffset = { x: (windowId % layoutDims.w) * dim.w, y: Math.floor(windowId / layoutDims.w) * dim.h };

            // console.log("NvisGridDrawer():  offset = " + JSON.stringify(offset) + ", pixelSize = " + JSON.stringify(pixelSize));
            // console.log("NvisGridDrawer():  dim = " + JSON.stringify(dim) + ", alpha = " + alpha);

            this.offset = offset;
            this.pixelSize = pixelSize;

            this.clear();

            let value = 0.6;
            this.color.r = value;
            this.color.g = value;
            this.color.b = value;
            this.color.a = alpha;

            let x = winOffset.x + offset.x;
            let y = winOffset.y + offset.y;
            while (x < winOffset.x + dim.w) {
                this.addVertex({ x: x, y: winOffset.y }, this.color);
                this.addVertex({ x: x, y: winOffset.y + dim.h }, this.color);
                x += pixelSize.w;
            }
            while (y < winOffset.y + dim.h) {
                this.addVertex({ x: winOffset.x, y: y }, this.color);
                this.addVertex({ x: winOffset.x + dim.w, y: y }, this.color);
                y += pixelSize.h;
            }
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////


    class NvisPixelDrawer {

        constructor(glContext) {
            this.area = new NvisDraw(glContext, "trianglestrip");
            this.border = new NvisDraw(glContext, "lines");

            this.areaColor = { r: 0.8, g: 0.8, b: 0.0, a: 0.5 };
            this.activeAreaColor = { r: 0.8, g: 0.8, b: 0.0, a: 0.1 };
            this.borderColors = [{ r: 1.0, g: 1.0, b: 1.0, a: 1.0 }, { r: 0.0, g: 0.0, b: 0.0, a: 1.0 }];

            this.offset = { x: 0.0, y: 0.0 };  //  pixels
            this.pixelSize = { w: 0.0, h: 0.0 };
        }


        update(windowId, offset, pixelSize, bActiveWindow = false) {
            //  only update if there's a change
            if (this.offset.x == offset.x && this.offset.y == offset.y && this.pixelSize.w == pixelSize.w) {
                return;
            }

            this.offset = offset;
            this.pixelSize = pixelSize;

            this.area.clear();

            let segments = 7;
            let x = this.offset.x;
            let y = this.offset.y;
            let x2 = x + pixelSize.w;
            let y2 = y + pixelSize.h;

            let v0 = { x: x, y: y };
            let v1 = { x: x, y: y2 };
            let v2 = { x: x2, y: y };
            let v3 = { x: x2, y: y2 };

            let areaColor = (bActiveWindow ? this.activeAreaColor : this.areaColor);
            this.area.addVertex(v0, areaColor);
            this.area.addVertex(v1, areaColor);
            this.area.addVertex(v2, areaColor);
            this.area.addVertex(v3, areaColor);

            if (bActiveWindow) {
                this.border.clear();

                this.border.addSegmentLine(v0, v1, segments, this.borderColors);
                this.border.addSegmentLine(v1, v3, segments, this.borderColors);
                this.border.addSegmentLine(v3, v2, segments, this.borderColors);
                this.border.addSegmentLine(v2, v0, segments, this.borderColors);
            }
        }

        render(bActiveWindow = false) {
            if (bActiveWindow) {
                this.area.render();
                this.border.render();
            } else {
                this.area.render();
            }
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////


    class NvisShader {

        constructor(glContext, parameters = {}) { // jsonText = "{}", newStreamCallback) {

            this.glContext = glContext;
            this.json = parameters.json;
            this.callback = parameters.callback;
            this.fragmentSource = parameters.source;

            this.jsonObject = {};
            this.name = undefined;
            this.fileName = undefined;
            this.numInputs = undefined;

            let gl = this.glContext;
            this.vertexShader = gl.createShader(gl.VERTEX_SHADER);
            this.fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
            this.shaderProgram = gl.createProgram();

            this.bVertexReady = false;
            this.bFragmentReady = false;

            this.vertexSource = `#version 300 es
            precision highp float;
            in vec2 aVertexPosition;
            in vec2 aTextureCoord;
            out vec2 vTextureCoord;
            void main()
            {
                gl_Position = vec4(aVertexPosition, 0.0, 1.0);
                vTextureCoord = aTextureCoord;
            }`;

            this.bVertexReady = this.compile(this.vertexShader, this.vertexSource);

            if (this.json !== undefined) {
                this.jsonObject = JSON.parse(this.json);

                //  convert top-level keys to lowercase
                let config = {};
                for (let key of Object.keys(this.jsonObject)) {
                    config[key.toLowerCase()] = this.jsonObject[key];
                }

                this.name = config.name;
                this.fileName = config.filename;
                this.numInputs = config.inputs;

                // this.name = (config === undefined ? "Stream" : config.name);
                // this.fileName = (config === undefined ? undefined : config.filename);
                // this.numInputs = (config === undefined ? undefined : config.inputs);

                this.loadFragmentSource(this.fileName);
            } else {
                this.bFragmentReady = this.compile(this.fragmentShader, this.fragmentSource);
                this.attach();
            }

        }

        compile(shader, source) {
            this.source = source;

            let gl = this.glContext;
            gl.shaderSource(shader, this.source);
            gl.compileShader(shader);

            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                alert("WebGL: " + gl.getShaderInfoLog(shader));
                return false;
            }

            return true;
        }

        attach() {
            let gl = this.glContext;

            gl.attachShader(this.shaderProgram, this.vertexShader);
            gl.attachShader(this.shaderProgram, this.fragmentShader);
            gl.linkProgram(this.shaderProgram);

            if (!gl.getProgramParameter(this.shaderProgram, gl.LINK_STATUS)) {
                alert("Could not initialize shader!");
            }
            if (this.callback !== undefined) {
                this.callback();
            }
        }

        loadFragmentSource(fileName) {
            let self = this;

            this.bFragmentReady = false;

            let xhr = new XMLHttpRequest();
            xhr.open("GET", fileName);
            xhr.setRequestHeader("Cache-Control", "no-cache, no-store, max-age=0");
            xhr.onload = function (event) {
                if (this.status == 200 && this.responseText !== null) {
                    console.log("=====  Shader loaded (" + fileName + ")");
                    self.fragmentSource = this.responseText;
                    self.bFragmentReady = self.compile(self.fragmentShader, self.fragmentSource);
                    self.attach();
                }
            }
            xhr.send();
        }

        getProgram() {
            return this.shaderProgram;
        }

        isReady() {
            return this.bVertexReady && this.bFragmentReady;
        }

        getName() {
            return this.name;
        }

        getNumInputs() {
            return this.numInputs;
        }
    }


    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////


    class NvisShaders {

        constructor(glContext) {

            this.glContext = glContext;

            this.textureShader = undefined;
            this.streamShader = undefined;
            this.shaders = [];

            this.textureFragmentSource = `#version 300 es
            precision highp float;
            in vec2 vTextureCoord;
            uniform sampler2D uSampler;
            out vec4 color;

            void main()
            {
                if (vTextureCoord.x < 0.0 || vTextureCoord.x > 1.0 || vTextureCoord.y < 0.0 || vTextureCoord.y > 1.0) {
                    color = vec4(0.1, 0.1, 0.1, 1.0);
                    return;
                }
                color = texture(uSampler, vTextureCoord);
            }`;

            this.streamFragmentSource = `#version 300 es
            precision highp float;
            in vec2 vTextureCoord;
            uniform sampler2D uSampler;
            uniform vec2 uDimensions;
            out vec4 color;

            float modi(float a, float b) {
                return floor(a - floor((a + 0.5) / b) * b);
            }

            void main()
            {
                vec4 c = texture(uSampler, vTextureCoord);

                float xx = (vTextureCoord.x * uDimensions.x) / 16.0;
                float yy = (vTextureCoord.y * uDimensions.y) / 16.0;
                color = vec4(c.r, c.g, c.b, 1.0);

                if (false) {  //  TODO: handle tonemapping
                    float invGamma = 1.0 / 2.2;
                    float exposure = 2.0;

                    color.r = exposure * pow(color.r, invGamma);
                    color.g = exposure * pow(color.g, invGamma);
                    color.b = exposure * pow(color.b, invGamma);
                }

                if (c.a < 1.0)
                {
                    vec4 gridColor = vec4(0.6, 0.6, 0.6, 1.0);
                    if (modi(xx, 2.0) == 0.0 ^^ modi(yy, 2.0) == 0.0)
                        gridColor = vec4(0.5, 0.5, 0.5, 1.0);
                    

                        color = gridColor + vec4(color.rgb * color.a, 1.0);
                }
            }`;

            this.textureShader = new NvisShader(glContext, { source: this.textureFragmentSource });
            this.streamShader = new NvisShader(glContext, { source: this.streamFragmentSource });
        }


        new(json = "{}") {
            this.shaders.push(new NvisShader(this.glContext, { json: json }));
        }


        load(jsonFileName, callback) {
            let self = this;

            let xhr = new XMLHttpRequest();

            xhr.open("GET", jsonFileName);
            xhr.setRequestHeader("Cache-Control", "no-cache, no-store, max-age=0");
            xhr.onload = function () {
                if (this.status == 200 && this.responseText !== null) {
                    //  set position of shader, filled in later
                    self.shaders.push(new NvisShader(self.glContext, { json: this.responseText, callback: callback }));
                }
            };

            xhr.send();
        }

    }


    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////

    const s_length_base = [  //  31
        3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31,
        35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0
    ];
    const s_length_extra = [  //  32
        0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1,
        1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4,
        4, 4, 5, 5, 5, 5, 0, 0, 0
    ];
    const s_dist_base = [  //  32
        1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33,
        49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537,
        2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577, 0, 0
    ];
    const s_dist_extra = [  //  19
        0, 0, 0, 0, 1, 1, 2, 2, 3, 3,
        4, 4, 5, 5, 6, 6, 7, 7, 8, 8,
        9, 9, 10, 10, 11, 11, 12, 12, 13, 13
    ];
    const s_length_dezigzag = [  //  3
        16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15
    ];
    const s_min_table_sizes = [257, 1, 4];

    // const s_tdefl_len_sym = [ 257, 258, 259, 260, 261, 262, 263, 264, 265, 265, 266, 266, 267, 267, 268, 268, 269, 269, 269, 269, 270, 270, 270, 270, 271, 271, 271, 271, 272, 272, 272, 272, 273, 273, 273, 273, 273, 273, 273, 273, 274, 274, 274, 274, 274, 274, 274, 274, 275, 275, 275, 275, 275, 275, 275, 275, 276, 276, 276, 276, 276, 276, 276, 276, 277, 277, 277, 277, 277, 277, 277, 277, 277, 277, 277, 277, 277, 277, 277, 277, 278, 278, 278, 278, 278, 278, 278, 278, 278, 278, 278, 278, 278, 278, 278, 278, 279, 279, 279, 279, 279, 279, 279, 279, 279, 279, 279, 279, 279, 279, 279, 279, 280, 280, 280, 280, 280, 280, 280, 280, 280, 280, 280, 280, 280, 280, 280, 280, 281, 281, 281, 281, 281, 281, 281, 281, 281, 281, 281, 281, 281, 281, 281, 281, 281, 281, 281, 281, 281, 281, 281, 281, 281, 281, 281, 281, 281, 281, 281, 281, 282, 282, 282, 282, 282, 282, 282, 282, 282, 282, 282, 282, 282, 282, 282, 282, 282, 282, 282, 282, 282, 282, 282, 282, 282, 282, 282, 282, 282, 282, 282, 282, 283, 283, 283, 283, 283, 283, 283, 283, 283, 283, 283, 283, 283, 283, 283, 283, 283, 283, 283, 283, 283, 283, 283, 283, 283, 283, 283, 283, 283, 283, 283, 283, 284, 284, 284, 284, 284, 284, 284, 284, 284, 284, 284, 284, 284, 284, 284, 284, 284, 284, 284, 284, 284, 284, 284, 284, 284, 284, 284, 284, 284, 284, 284, 285 ];
    // const s_tdefl_len_extra = [ 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 0 ];
    // const s_tdefl_small_dist_sym = [ 0, 1, 2, 3, 4, 4, 5, 5, 6, 6, 6, 6, 7, 7, 7, 7, 8, 8, 8, 8, 8, 8, 8, 8, 9, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17 ];
    // const s_tdefl_small_dist_extra = [ 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7 ];
    // const s_tdefl_large_dist_sym = [ 0, 0, 18, 19, 20, 20, 21, 21, 22, 22, 22, 22, 23, 23, 23, 23, 24, 24, 24, 24, 24, 24, 24, 24, 25, 25, 25, 25, 25, 25, 25, 25, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29 ];
    // const s_tdefl_large_dist_extra = [ 0, 0, 8, 8, 9, 9, 9, 9, 10, 10, 10, 10, 10, 10, 10, 10, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13 ];
    // const s_tdefl_packed_code_size_syms_swizzle = [ 16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15 ];
    // const mz_bitmasks = [ 0x0000, 0x0001, 0x0003, 0x0007, 0x000F, 0x001F, 0x003F, 0x007F, 0x00FF, 0x01FF, 0x03FF, 0x07FF, 0x0FFF, 0x1FFF, 0x3FFF, 0x7FFF, 0xFFFF ];
    // const s_tdefl_num_probes = [ 0, 1, 6, 32, 16, 32, 128, 256, 512, 768, 1500 ];


    const TINFL_MAX_HUFF_TABLES = 3;
    const TINFL_MAX_HUFF_SYMBOLS_0 = 288;
    const TINFL_MAX_HUFF_SYMBOLS_1 = 32;
    const TINFL_MAX_HUFF_SYMBOLS_2 = 19;
    const TINFL_FAST_LOOKUP_BITS = 10;
    const TINFL_FAST_LOOKUP_SIZE = 1 << TINFL_FAST_LOOKUP_BITS;


    //     // TINFL_HUFF_BITBUF_FILL() is only used rarely, when the number of bytes
    // // remaining in the input buffer falls below 2.
    // // It reads just enough bytes from the input stream that are needed to decode
    // // the next Huffman code (and absolutely no more). It works by trying to fully
    // // decode a
    // // Huffman code by using whatever bits are currently present in the bit buffer.
    // // If this fails, it reads another byte, and tries again until it succeeds or
    // // until the
    // // bit buffer contains >=15 bits (deflate's max. Huffman code size).
    // #define TINFL_HUFF_BITBUF_FILL(state_index, pHuff)                     \
    // do {                                                                 \
    //   temp = (pHuff)->m_look_up[bit_buf & (TINFL_FAST_LOOKUP_SIZE - 1)]; \
    //   if (temp >= 0) {                                                   \
    //     code_len = temp >> 9;                                            \
    //     if ((code_len) && (num_bits >= code_len)) break;                 \
    //   } else if (num_bits > TINFL_FAST_LOOKUP_BITS) {                    \
    //     code_len = TINFL_FAST_LOOKUP_BITS;                               \
    //     do {                                                             \
    //       temp = (pHuff)->m_tree[~temp + ((bit_buf >> code_len++) & 1)]; \
    //     } while ((temp < 0) && (num_bits >= (code_len + 1)));            \
    //     if (temp >= 0) break;                                            \
    //   }                                                                  \
    //   TINFL_GET_BYTE(state_index, c);                                    \
    //   bit_buf |= (((tinfl_bit_buf_t)c) << num_bits);                     \
    //   num_bits += 8;                                                     \
    // } while (num_bits < 15);

    // // TINFL_HUFF_DECODE() decodes the next Huffman coded symbol. It's more complex
    // // than you would initially expect because the zlib API expects the decompressor
    // // to never read
    // // beyond the final byte of the deflate stream. (In other words, when this macro
    // // wants to read another byte from the input, it REALLY needs another byte in
    // // order to fully
    // // decode the next Huffman code.) Handling this properly is particularly
    // // important on raw deflate (non-zlib) streams, which aren't followed by a byte
    // // aligned adler-32.
    // // The slow path is only executed at the very end of the input buffer.
    // #define TINFL_HUFF_DECODE(state_index, sym, pHuff)                             \
    // do {                                                                         \
    //   int temp;                                                                  \
    //   mz_uint code_len, c;                                                       \
    //   if (num_bits < 15) {                                                       \
    //     if ((pIn_buf_end - pIn_buf_cur) < 2) {                                   \
    //       TINFL_HUFF_BITBUF_FILL(state_index, pHuff);                            \
    //     } else {                                                                 \
    //       bit_buf |= (((tinfl_bit_buf_t)pIn_buf_cur[0]) << num_bits) |           \
    //                  (((tinfl_bit_buf_t)pIn_buf_cur[1]) << (num_bits + 8));      \
    //       pIn_buf_cur += 2;                                                      \
    //       num_bits += 16;                                                        \
    //     }                                                                        \
    //   }                                                                          \
    //   if ((temp = (pHuff)->m_look_up[bit_buf & (TINFL_FAST_LOOKUP_SIZE - 1)]) >= \
    //       0)                                                                     \
    //     code_len = temp >> 9, temp &= 511;                                       \
    //   else {                                                                     \
    //     code_len = TINFL_FAST_LOOKUP_BITS;                                       \
    //     do {                                                                     \
    //       temp = (pHuff)->m_tree[~temp + ((bit_buf >> code_len++) & 1)];         \
    //     } while (temp < 0);                                                      \
    //   }                                                                          \
    //   sym = temp;                                                                \
    //   bit_buf >>= code_len;                                                      \
    //   num_bits -= code_len;                                                      \
    // }                                                                            \
    // MZ_MACRO_END

    //     struct tinfl_decompressor {
    //         mz_uint32 m_state;
    //         mz_uint32 m_num_bits;
    //         mz_uint32 m_zhdr0;
    //         mz_uint32 m_zhdr1;
    //         mz_uint32 m_z_adler32;
    //         mz_uint32 m_final;
    //         mz_uint32 m_type;
    //         mz_uint32 m_check_adler32;
    //         mz_uint32 m_dist;
    //         mz_uint32 m_counter;
    //         mz_uint32 m_num_extra;
    //         mz_uint32 m_table_sizes[TINFL_MAX_HUFF_TABLES];
    //         tinfl_bit_buf_t m_bit_buf;
    //         size_t m_dist_from_out_buf_start;
    //         tinfl_huff_table m_tables[TINFL_MAX_HUFF_TABLES];
    //         mz_uint8 m_raw_header[4];
    //         mz_uint8 m_len_codes[TINFL_MAX_HUFF_SYMBOLS_0 + TINFL_MAX_HUFF_SYMBOLS_1 + 137];
    //       };

    //     tinfl_status tinfl_decompress(tinfl_decompressor *r,
    //                                 const mz_uint8 *pIn_buf_next,
    //                                 size_t *pIn_buf_size,
    //                                 mz_uint8 *pOut_buf_start,
    //                                 mz_uint8 *pOut_buf_next,
    //                                 size_t *pOut_buf_size,
    //                                 const mz_uint32 decomp_flags) {

    //         tinfl_status status = TINFL_STATUS_FAILED;
    //         mz_uint32 num_bits, dist, counter, num_extra;
    //         tinfl_bit_buf_t bit_buf;

    //         const mz_uint8 *pIn_buf_cur = pIn_buf_next;
    //         const mz_uint8 *pIn_buf_end = pIn_buf_next + * pIn_buf_size;
    //         const mz_uint8 *pOut_buf_cur = pOut_buf_next;
    //         const mz_uint8 *pOut_buf_end = pOut_buf_next + * pOut_buf_size;

    //         size_t out_buf_size_mask = (decomp_flags & TINFL_FLAG_USING_NON_WRAPPING_OUTPUT_BUF) ? (size_t) - 1 : ((pOut_buf_next - pOut_buf_start) + * pOut_buf_size) - 1;

    //         size_t dist_from_out_buf_start;

    //         // Ensure the output buffer's size is a power of 2, unless the output buffer
    //         // is large enough to hold the entire output file (in which case it doesn't
    //         // matter).
    //         if (((out_buf_size_mask + 1) & out_buf_size_mask) || (pOut_buf_next < pOut_buf_start)) {
    //             *pIn_buf_size = 0;
    //             *pOut_buf_size = 0;
    //             return TINFL_STATUS_BAD_PARAM;
    //         }

    //         num_bits = r->m_num_bits;
    //         bit_buf = r->m_bit_buf;
    //         dist = r->m_dist;
    //         counter = r->m_counter;
    //         num_extra = r->m_num_extra;
    //         dist_from_out_buf_start = r->m_dist_from_out_buf_start;
    //         TINFL_CR_BEGIN

    //         bit_buf = 0;
    //         num_bits = 0;
    //         dist = 0;
    //         counter = 0;
    //         num_extra = 0;
    //         r->m_zhdr0 = 0;
    //         r->m_zhdr1 = 0;
    //         r->m_z_adler32 = 1;
    //         r->m_check_adler32 = 1;

    //         if (decomp_flags & TINFL_FLAG_PARSE_ZLIB_HEADER) {
    //             TINFL_GET_BYTE(1, r->m_zhdr0);
    //             TINFL_GET_BYTE(2, r->m_zhdr1);
    //             counter = (((r->m_zhdr0 * 256 + r->m_zhdr1) % 31 != 0) || (r->m_zhdr1 & 32) || ((r->m_zhdr0 & 15) != 8));
    //             if (!(decomp_flags & TINFL_FLAG_USING_NON_WRAPPING_OUTPUT_BUF)) {
    //                 counter |= (((1U << (8U + (r->m_zhdr0 >> 4))) > 32768U) || ((out_buf_size_mask + 1) < (size_t)(1ULL << (8U + (r->m_zhdr0 >> 4)))));
    //             }
    //             if (counter) {
    //                 TINFL_CR_RETURN_FOREVER(36, TINFL_STATUS_FAILED);
    //             }
    //         }

    //     do {
    //         TINFL_GET_BITS(3, r->m_final, 3);
    //         r->m_type = r->m_final >> 1;
    //         if (r->m_type == 0) {
    //             TINFL_SKIP_BITS(5, num_bits & 7);
    //             for (counter = 0; counter < 4; ++counter) {
    //                 if (num_bits)
    //                     TINFL_GET_BITS(6, r->m_raw_header[counter], 8);
    //                 else
    //                     TINFL_GET_BYTE(7, r->m_raw_header[counter]);
    //             }
    //             if ((counter = (r->m_raw_header[0] | (r->m_raw_header[1] << 8))) !=
    //                 (mz_uint)(0xFFFF ^
    //                     (r->m_raw_header[2] | (r->m_raw_header[3] << 8)))) {
    //                 TINFL_CR_RETURN_FOREVER(39, TINFL_STATUS_FAILED);
    //             }
    //             while ((counter) && (num_bits)) {
    //                 TINFL_GET_BITS(51, dist, 8);
    //                 while (pOut_buf_cur >= pOut_buf_end) {
    //                     TINFL_CR_RETURN(52, TINFL_STATUS_HAS_MORE_OUTPUT);
    //                 }
    //                 *pOut_buf_cur++ = (mz_uint8)dist;
    //                 counter--;
    //             }
    //             while (counter) {
    //                 size_t n;
    //                 while (pOut_buf_cur >= pOut_buf_end) {
    //                     TINFL_CR_RETURN(9, TINFL_STATUS_HAS_MORE_OUTPUT);
    //                 }
    //                 while (pIn_buf_cur >= pIn_buf_end) {
    //                     if (decomp_flags & TINFL_FLAG_HAS_MORE_INPUT) {
    //                         TINFL_CR_RETURN(38, TINFL_STATUS_NEEDS_MORE_INPUT);
    //                     } else {
    //                         TINFL_CR_RETURN_FOREVER(40, TINFL_STATUS_FAILED);
    //                     }
    //                 }
    //                 n = MZ_MIN(MZ_MIN((size_t)(pOut_buf_end - pOut_buf_cur), (size_t)(pIn_buf_end - pIn_buf_cur)), counter);
    //                 TINFL_MEMCPY(pOut_buf_cur, pIn_buf_cur, n);
    //                 pIn_buf_cur += n;
    //                 pOut_buf_cur += n;
    //                 counter -= (mz_uint)n;
    //             }
    //         } else if (r->m_type == 3) {
    //             TINFL_CR_RETURN_FOREVER(10, TINFL_STATUS_FAILED);
    //         } else {
    //             if (r->m_type == 1) {
    //                 mz_uint8 * p = r->m_tables[0].m_code_size;
    //                 mz_uint i;
    //                 r->m_table_sizes[0] = 288;
    //                 r->m_table_sizes[1] = 32;
    //                 TINFL_MEMSET(r->m_tables[1].m_code_size, 5, 32);
    //                 for (i = 0; i <= 143; ++i) * p++ = 8;
    //                 for (; i <= 255; ++i) * p++ = 9;
    //                 for (; i <= 279; ++i) * p++ = 7;
    //                 for (; i <= 287; ++i) * p++ = 8;
    //             } else {
    //                 for (counter = 0; counter < 3; counter++) {
    //                     TINFL_GET_BITS(11, r->m_table_sizes[counter], "\05\05\04"[counter]);
    //                     r->m_table_sizes[counter] += s_min_table_sizes[counter];
    //                 }
    //                 MZ_CLEAR_OBJ(r->m_tables[2].m_code_size);
    //                 for (counter = 0; counter < r->m_table_sizes[2]; counter++) {
    //                     mz_uint s;
    //                     TINFL_GET_BITS(14, s, 3);
    //                     r->m_tables[2].m_code_size[s_length_dezigzag[counter]] = (mz_uint8)s;
    //                 }
    //                 r->m_table_sizes[2] = 19;
    //             }
    //             for (; (int)r->m_type >= 0; r->m_type--) {
    //                 int tree_next, tree_cur;
    //                 tinfl_huff_table * pTable;
    //                 mz_uint i, j, used_syms, total, sym_index, next_code[17], total_syms[16];
    //                 pTable = & r->m_tables[r->m_type];
    //                 MZ_CLEAR_OBJ(total_syms);
    //                 MZ_CLEAR_OBJ(pTable->m_look_up);
    //                 MZ_CLEAR_OBJ(pTable->m_tree);
    //                 for (i = 0; i < r->m_table_sizes[r->m_type]; ++i)
    //                     total_syms[pTable->m_code_size[i]]++;
    //                 used_syms = 0, total = 0;
    //                 next_code[0] = next_code[1] = 0;
    //                 for (i = 1; i <= 15; ++i) {
    //                     used_syms += total_syms[i];
    //                     next_code[i + 1] = (total = ((total + total_syms[i]) << 1));
    //                 }
    //                 if ((65536 != total) && (used_syms > 1)) {
    //                     TINFL_CR_RETURN_FOREVER(35, TINFL_STATUS_FAILED);
    //                 }
    //                 for (tree_next = -1, sym_index = 0; sym_index < r->m_table_sizes[r->m_type]; ++sym_index) {
    //                     mz_uint rev_code = 0, l, cur_code, code_size = pTable->m_code_size[sym_index];
    //                     if (!code_size)
    //                         continue;
    //                     cur_code = next_code[code_size]++;
    //                     for (l = code_size; l > 0; l--, cur_code >>= 1)
    //                         rev_code = (rev_code << 1) | (cur_code & 1);
    //                     if (code_size <= TINFL_FAST_LOOKUP_BITS) {
    //                         mz_int16 k = (mz_int16)((code_size << 9) | sym_index);
    //                         while (rev_code < TINFL_FAST_LOOKUP_SIZE) {
    //                             pTable->m_look_up[rev_code] = k;
    //                             rev_code += (1 << code_size);
    //                         }
    //                         continue;
    //                     }
    //                     if (0 == (tree_cur = pTable->m_look_up[rev_code & (TINFL_FAST_LOOKUP_SIZE - 1)])) {
    //                         pTable->m_look_up[rev_code & (TINFL_FAST_LOOKUP_SIZE - 1)] = (mz_int16)tree_next;
    //                         tree_cur = tree_next;
    //                         tree_next -= 2;
    //                     }
    //                     rev_code >>= (TINFL_FAST_LOOKUP_BITS - 1);
    //                     for (j = code_size; j > (TINFL_FAST_LOOKUP_BITS + 1); j--) {
    //                         tree_cur -= ((rev_code >>= 1) & 1);
    //                         if (!pTable->m_tree[-tree_cur - 1]) {
    //                             pTable->m_tree[-tree_cur - 1] = (mz_int16)tree_next;
    //                             tree_cur = tree_next;
    //                             tree_next -= 2;
    //                         } else
    //                             tree_cur = pTable->m_tree[-tree_cur - 1];
    //                     }
    //                     tree_cur -= ((rev_code >>= 1) & 1);
    //                     pTable->m_tree[-tree_cur - 1] = (mz_int16)sym_index;
    //                 }
    //                 if (r->m_type == 2) {
    //                     for (counter = 0; counter < (r->m_table_sizes[0] + r->m_table_sizes[1]);) {
    //                         mz_uint s;
    //                         TINFL_HUFF_DECODE(16, dist, &r->m_tables[2]);
    //                         if (dist < 16) {
    //                             r->m_len_codes[counter++] = (mz_uint8)dist;
    //                             continue;
    //                         }
    //                         if ((dist == 16) && (!counter)) {
    //                             TINFL_CR_RETURN_FOREVER(17, TINFL_STATUS_FAILED);
    //                         }
    //                         num_extra = "\02\03\07"[dist - 16];
    //                         TINFL_GET_BITS(18, s, num_extra);
    //                         s += "\03\03\013"[dist - 16];
    //                         TINFL_MEMSET(r->m_len_codes + counter, (dist == 16) ? r->m_len_codes[counter - 1] : 0, s);
    //                         counter += s;
    //                     }
    //                     if ((r->m_table_sizes[0] + r->m_table_sizes[1]) != counter) {
    //                         TINFL_CR_RETURN_FOREVER(21, TINFL_STATUS_FAILED);
    //                     }
    //                     TINFL_MEMCPY(r->m_tables[0].m_code_size, r->m_len_codes, r->m_table_sizes[0]);
    //                     TINFL_MEMCPY(r->m_tables[1].m_code_size, r->m_len_codes + r->m_table_sizes[0], r->m_table_sizes[1]);
    //                 }
    //             }
    //             for (;;) {
    //                 mz_uint8 *pSrc;
    //                 for (;;) {
    //                     if (((pIn_buf_end - pIn_buf_cur) < 4) || ((pOut_buf_end - pOut_buf_cur) < 2)) {
    //                         TINFL_HUFF_DECODE(23, counter, & r->m_tables[0]);
    //                         if (counter >= 256)
    //                             break;
    //                         while (pOut_buf_cur >= pOut_buf_end) {
    //                             TINFL_CR_RETURN(24, TINFL_STATUS_HAS_MORE_OUTPUT);
    //                         }
    //                         *pOut_buf_cur++ = (mz_uint8)counter;
    //                     } else {
    //                         int sym2;
    //                         mz_uint code_len;
    // #if TINFL_USE_64BIT_BITBUF
    //                         if (num_bits < 30) {
    //                             bit_buf |= (((tinfl_bit_buf_t)MZ_READ_LE32(pIn_buf_cur)) << num_bits);
    //                             pIn_buf_cur += 4;
    //                             num_bits += 32;
    //                         }
    // #else
    //                         if (num_bits < 15) {
    //                             bit_buf |= (((tinfl_bit_buf_t)MZ_READ_LE16(pIn_buf_cur)) << num_bits);
    //                             pIn_buf_cur += 2;
    //                             num_bits += 16;
    //                         }
    // #endif
    //                         if ((sym2 = r->m_tables[0].m_look_up[bit_buf & (TINFL_FAST_LOOKUP_SIZE - 1)]) >= 0)
    //                             code_len = sym2 >> 9;
    //                         else {
    //                             code_len = TINFL_FAST_LOOKUP_BITS;
    //                             do {
    //                                 sym2 = r->m_tables[0].m_tree[~sym2 + ((bit_buf >> code_len++) & 1)];
    //                             } while (sym2 < 0);
    //                         }
    //                         counter = sym2;
    //                         bit_buf >>= code_len;
    //                         num_bits -= code_len;
    //                         if (counter & 256)
    //                             break;

    // #if!TINFL_USE_64BIT_BITBUF
    //                         if (num_bits < 15) {
    //                             bit_buf |= (((tinfl_bit_buf_t)MZ_READ_LE16(pIn_buf_cur)) << num_bits);
    //                             pIn_buf_cur += 2;
    //                             num_bits += 16;
    //                         }
    // #endif
    //                         if ((sym2 = r->m_tables[0].m_look_up[bit_buf & (TINFL_FAST_LOOKUP_SIZE - 1)]) >= 0)
    //                             code_len = sym2 >> 9;
    //                         else {
    //                             code_len = TINFL_FAST_LOOKUP_BITS;
    //                             do {
    //                                 sym2 = r->m_tables[0].m_tree[~sym2 + ((bit_buf >> code_len++) & 1)];
    //                             } while (sym2 < 0);
    //                         }
    //                         bit_buf >>= code_len;
    //                         num_bits -= code_len;

    //                         pOut_buf_cur[0] = (mz_uint8)counter;
    //                         if (sym2 & 256) {
    //                             pOut_buf_cur++;
    //                             counter = sym2;
    //                             break;
    //                         }
    //                         pOut_buf_cur[1] = (mz_uint8)sym2;
    //                         pOut_buf_cur += 2;
    //                     }
    //                 }
    //                 if ((counter &= 511) == 256)
    //                     break;

    //                 num_extra = s_length_extra[counter - 257];
    //                 counter = s_length_base[counter - 257];
    //                 if (num_extra) {
    //                     mz_uint extra_bits;
    //                     TINFL_GET_BITS(25, extra_bits, num_extra);
    //                     counter += extra_bits;
    //                 }

    //                 TINFL_HUFF_DECODE(26, dist, & r->m_tables[1]);
    //                 num_extra = s_dist_extra[dist];
    //                 dist = s_dist_base[dist];
    //                 if (num_extra) {
    //                     mz_uint extra_bits;
    //                     TINFL_GET_BITS(27, extra_bits, num_extra);
    //                     dist += extra_bits;
    //                 }

    //                 dist_from_out_buf_start = pOut_buf_cur - pOut_buf_start;
    //                 if ((dist > dist_from_out_buf_start) && (decomp_flags & TINFL_FLAG_USING_NON_WRAPPING_OUTPUT_BUF)) {
    //                     TINFL_CR_RETURN_FOREVER(37, TINFL_STATUS_FAILED);
    //                 }

    //                 pSrc = pOut_buf_start + ((dist_from_out_buf_start - dist) & out_buf_size_mask);

    //                 if ((MZ_MAX(pOut_buf_cur, pSrc) + counter) > pOut_buf_end) {
    //                     while (counter--) {
    //                         while (pOut_buf_cur >= pOut_buf_end) {
    //                             TINFL_CR_RETURN(53, TINFL_STATUS_HAS_MORE_OUTPUT);
    //                         }
    //                         *pOut_buf_cur++ = pOut_buf_start[(dist_from_out_buf_start++ - dist) & out_buf_size_mask];
    //                     }
    //                     continue;
    //                 }
    // #if MINIZ_USE_UNALIGNED_LOADS_AND_STORES
    //                 else if ((counter >= 9) && (counter <= dist)) {
    //                     const mz_uint8 * pSrc_end = pSrc + (counter & ~7);
    //                     do {
    //                         ((mz_uint32 *)pOut_buf_cur)[0] = ((const mz_uint32 *)pSrc)[0];
    //                         ((mz_uint32 *)pOut_buf_cur)[1] = ((const mz_uint32 *)pSrc)[1];
    //                         pOut_buf_cur += 8;
    //                     } while ((pSrc += 8) < pSrc_end);
    //                     if ((counter &= 7) < 3) {
    //                         if (counter) {
    //                             pOut_buf_cur[0] = pSrc[0];
    //                             if (counter > 1)
    //                                 pOut_buf_cur[1] = pSrc[1];
    //                             pOut_buf_cur += counter;
    //                         }
    //                         continue;
    //                     }
    //                 }
    // #endif
    //                 do {
    //                     pOut_buf_cur[0] = pSrc[0];
    //                     pOut_buf_cur[1] = pSrc[1];
    //                     pOut_buf_cur[2] = pSrc[2];
    //                     pOut_buf_cur += 3;
    //                     pSrc += 3;
    //                 } while ((int)(counter -= 3) > 2);

    //                 if ((int)counter > 0) {
    //                     pOut_buf_cur[0] = pSrc[0];
    //                     if ((int)counter > 1) pOut_buf_cur[1] = pSrc[1];
    //                     pOut_buf_cur += counter;
    //                 }
    //             }
    //         }
    //     } while (!(r->m_final & 1));

    //     if (decomp_flags & TINFL_FLAG_PARSE_ZLIB_HEADER) {
    //     TINFL_SKIP_BITS(32, num_bits & 7);
    //     for (counter = 0; counter < 4; ++counter) {
    //         mz_uint s;
    //         if (num_bits)
    //             TINFL_GET_BITS(41, s, 8);
    //         else
    //             TINFL_GET_BYTE(42, s);
    //         r->m_z_adler32 = (r->m_z_adler32 << 8) | s;
    //     }
    // }
    // TINFL_CR_RETURN_FOREVER(34, TINFL_STATUS_DONE);
    // TINFL_CR_FINISH

    // common_exit:
    // r->m_num_bits = num_bits;
    // r->m_bit_buf = bit_buf;
    // r->m_dist = dist;
    // r->m_counter = counter;
    // r->m_num_extra = num_extra;
    // r->m_dist_from_out_buf_start = dist_from_out_buf_start;
    // * pIn_buf_size = pIn_buf_cur - pIn_buf_next;
    // * pOut_buf_size = pOut_buf_cur - pOut_buf_next;
    // if ((decomp_flags & (TINFL_FLAG_PARSE_ZLIB_HEADER | TINFL_FLAG_COMPUTE_ADLER32)) && (status >= 0)) {
    //     const mz_uint8 *ptr = pOut_buf_next;
    //     size_t buf_len = * pOut_buf_size;
    //     mz_uint32 i;
    //     mz_uint32 s1 = r->m_check_adler32 & 0xffff;
    //     mz_uint32s2 = r->m_check_adler32 >> 16;
    //     size_t block_len = buf_len % 5552;
    //     while (buf_len) {
    //         for (i = 0; i + 7 < block_len; i += 8, ptr += 8) {
    //             s1 += ptr[0], s2 += s1;
    //             s1 += ptr[1], s2 += s1;
    //             s1 += ptr[2], s2 += s1;
    //             s1 += ptr[3], s2 += s1;
    //             s1 += ptr[4], s2 += s1;
    //             s1 += ptr[5], s2 += s1;
    //             s1 += ptr[6], s2 += s1;
    //             s1 += ptr[7], s2 += s1;
    //         }
    //         for (; i < block_len; ++i) s1 += * ptr++, s2 += s1;
    //         s1 %= 65521U, s2 %= 65521U;
    //         buf_len -= block_len;
    //         block_len = 5552;
    //     }
    //     r->m_check_adler32 = (s2 << 16) + s1;
    //     if ((status == TINFL_STATUS_DONE) && (decomp_flags & TINFL_FLAG_PARSE_ZLIB_HEADER) && (r->m_check_adler32 != r->m_z_adler32))
    //         status = TINFL_STATUS_ADLER32_MISMATCH;
    // }
    // return status;
    // }

    class NvisDeflate {

        constructor(bufferView, offset, length) {
            this.bufferView = bufferView;
            this.offset = offset;
            this.length = length;


        }

        getByte() {
            let value = this.bufferView.getUint8(this.offset);
            this.offset++;
            return value;
        }
    }


    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////


    class NvisBitBuffer {

        constructor(buffer, params = { offset: 0, littleEndian: true }) {
            this.buffer = buffer;  //  i.e., ArrayBuffer
            this.bitSize = buffer.byteLength * 8;

            this.bitPointer = 0;  //  within current byte, not total
            this.bytePointer = 0;
            this.offset = (params === undefined || params.offset === undefined ? 0 : params.offset);
            this.littleEndian = (params === undefined || params.littleEndian === undefined ? true : params.littleEndian);

            this.view = new DataView(this.buffer, params.offset);
        }

        consume(buffer, length) {
            for (let i = 0; i < length; i++) {
                this.writeUint8(buffer.readUint8());
            }
        }

        copy(buffer, offset = 0, length = buffer.buffer.byteLength) {
            for (let i = 0; i < length; i++) {
                this.setUint8(offset + i, buffer.getUint8(i));
            }
        }

        byteAlign() {
            if (this.bitPointer > 0) {
                this.bitPointer = 0;
                this.bytePointer++;
            }
        }

        remainingBits() {
            return this.bitSize - (this.bytePointer * 8 + this.bitPointer);
        }

        readBits(numBits, peek = false) {
            let value = 0;
            let n = numBits;

            let bytePointer = this.bytePointer;
            let bitPointer = this.bitPointer;

            //  buffer size is in integer bytes
            let remainingBits = this.remainingBits();
            if (n > remainingBits) {
                n = remainingBits;
            }

            //  leading bits, first byte
            let nextBitPointer = bitPointer + n;
            let msb = Math.min(nextBitPointer - 1, 7);
            value = NvisBitBuffer.bits(this.view.getUint8(bytePointer, this.littleEndian), msb, bitPointer);
            n -= (msb - bitPointer + 1);
            bitPointer = nextBitPointer;
            if (nextBitPointer > 7) {
                bitPointer = 0;
                bytePointer++;
            }

            //  whole bytes
            while (n > 8) {
                value |= (this.view.getUint8(bytePointer, this.littleEndian) << (numBits - n));
                bytePointer++;
                n -= 8;
            }

            //  remaining bits, last byte
            if (n > 0) {
                value |= ((this.view.getUint8(bytePointer, this.littleEndian) & ((1 << n) - 1)) << (numBits - n));
                bitPointer += n;
            }

            if (!peek) {
                this.bytePointer = bytePointer;
                this.bitPointer = bitPointer;
            }

            return value;
        }

        seek(byte, bit = 0) {
            this.bytePointer = byte;
            this.bitPointer = bit;
        }

        skip(bytes = 1, bits = 0) {
            this.bitPointer += (bytes * 8 + bits);
            this.bytePointer += Math.floor(this.bitPointer / 8);
            this.bitPointer %= 8;
        }

        // helpers

        static bits(value, msb, lsb) {
            return (value & ((1 << (msb + 1)) - 1)) >> lsb;
        }

        static halfBytes2Float32(bytes) {
            var sign = ((bytes & 0x8000) ? -1 : 1);
            var exponent = ((bytes >> 10) & 0x1F) - 15;
            var significand = bytes & ((1 << 10) - 1);

            if (exponent == 16) {
                return sign * ((significand) ? Number.NaN : Number.POSITIVE_INFINITY);
            }

            if (exponent == -16) {
                if (significand == 0) {
                    return sign * 0.0;
                }
                exponent = -16;
                significand /= (1 << 22);
            } else {
                significand = (significand | (1 << 10)) / (1 << 10);
            }

            return sign * significand * Math.pow(2, exponent);
        }

        static floatBytes2Float32(bytes) {
            var sign = (bytes & 0x80000000) ? -1 : 1;
            var exponent = ((bytes >> 23) & 0xFF) - 127;
            var significand = (bytes & ~(-1 << 23));

            if (exponent == 128) {
                return sign * ((significand) ? Number.NaN : Number.POSITIVE_INFINITY);
            }

            if (exponent == -127) {
                if (significand == 0) {
                    return sign * 0.0;
                }
                exponent = -126;
                significand /= (1 << 22);
            } else {
                significand = (significand | (1 << 23)) / (1 << 23);
            }

            return sign * significand * Math.pow(2, exponent);
        }

        //  functions below only work on byte boundary
        //  read/write functions respects current byte pointers
        //  get/set functions need byte buffer offsets

        peekUint8(bytePointer = this.bytePointer) {
            return this.view.getUint8(bytePointer);
        }

        readUint8() {
            return this.view.getUint8(this.bytePointer++);
        }

        writeUint8(value) {
            this.view.setUint8(this.bytePointer++, value);
        }

        getUint8(byteIndex) {
            return this.view.getUint8(byteIndex);
        }

        setUint8(byteIndex, value) {
            this.view.setUint8(byteIndex, value);
        }

        /////////

        peekUint16(bytePointer = this.bytePointer) {
            return this.view.getUint16(bytePointer, this.littleEndian);
        }

        readUint16() {
            let value = this.view.getUint16(this.bytePointer, this.littleEndian);
            this.bytePointer += 2;
            return value;
        }

        writeUint16(value) {
            this.view.setUint16(this.bytePointer, value, this.littleEndian);
            this.bytePointer += 2;
        }

        getUint16(byteIndex) {
            return this.view.getUint16(byteIndex, this.littleEndian);
        }

        setUint16(byteIndex, value) {
            this.view.setUint16(byteIndex, value, this.littleEndian);
        }

        /////////

        readUint32() {
            let value = this.view.getUint32(this.bytePointer, this.littleEndian);
            this.bytePointer += 4;
            return value;
        }

        readInt32() {
            let value = this.view.getInt32(this.bytePointer, this.littleEndian);
            this.bytePointer += 4;
            return value;
        }

        readUint64() {
            let value = this.view.getBigUint64(this.bytePointer, this.littleEndian);
            this.bytePointer += 8;
            return value;
        }


        /////////

        readFloat32() {
            let value = this.view.getFloat32(this.bytePointer, this.littleEndian);
            this.bytePointer += 4;
            return value;
        }

        writeFloat32(value) {
            this.view.setFloat32(this.bytePointer, value, this.littleEndian);
            this.bytePointer += 4;
        }

        setFloat32(byteIndex, value) {
            this.view.setFloat32(byteIndex, value, this.litleEndian);
        }

        //////////

        readFloat16(location = this.bytePointer) {
            let value = NvisBitBuffer.halfBytes2Float32(this.view.getUint16(location, this.littleEndian));
            this.bytePointer += 2;
            return value;
        }

        getFloat16(byteIndex) {
            let value = this.view.getUint16(byteIndex, this.littleEndian);
            return NvisBitBuffer.halfBytes2Float32(value);
        }

        //////////

        readString() {
            let c = '';
            let s = "";
            while ((c = this.readUint8()) != 0) {
                s += String.fromCharCode(c);
            }
            return s;
        }

    }


    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////

    class NvisDeompress {

        constructor() {

        }

    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////


    const EXR_UINT = 0;
    const EXR_HALF = 1;
    const EXR_FLOAT = 2;

    const EXR_NO_COMPRESSION = 0;
    const EXR_RLE_COMPRESSION = 1;
    const EXR_ZIPS_COMPRESSION = 2;
    const EXR_ZIP_COMPRESSION = 3;
    const EXR_PIZ_COMPRESSION = 4;
    const EXR_PXR24_COMPRESSION = 5;
    const EXR_B44_COMPRESSION = 6;
    const EXR_B44A_COMPRESSION = 7;

    const EXR_NO_COMPRESSION_SCANLINES = 1;
    const EXR_RLE_COMPRESSION_SCANLINES = 1;
    const EXR_ZIPS_COMPRESSION_SCANLINES = 1;
    const EXR_ZIP_COMPRESSION_SCANLINES = 16;
    const EXR_PIZ_COMPRESSION_SCANLINES = 32;
    const EXR_PXR24_COMPRESSION_SCANLINES = 16;
    const EXR_B44_COMPRESSION_SCANLINES = 32;
    const EXR_B44A_COMPRESSION_SCANLINES = 32;

    class NvisEXRFile {

        constructor(fileName, buffer) {
            this.fileName = fileName;
            this.buffer = new NvisBitBuffer(buffer);

            let b = this.buffer;

            let magicNumber = b.readInt32();  //  should be decimal 20000630
            let versionField = b.readInt32();
            let version = {
                version: (versionField & 0xf),
                singleTile: (((versionField >> (9 - 1)) & 1) == 1),
                longNames: (((versionField >> (10 - 1)) & 1) == 1),
                nonImage: (((versionField >> (11 - 1)) & 1) == 1),
                multiPart: (((versionField >> (12 - 1)) & 1) == 1),
            }
            // console.log("Magic number: " + magicNumber);
            // console.log("Version field: " + JSON.stringify(version));            

            //  attributes
            this.attributes = {};
            while (b.peekUint8() != 0) {
                let attrib = this.readAttribute();
                this.attributes[attrib.name] = attrib;
            }
            b.skip();

            //console.log(JSON.stringify(this.attributes));

            //  offset table
            this.scanLinesPerChunk = EXR_NO_COMPRESSION_SCANLINES;
            this.offsetTable = [];
            let dataWindowBox = this.attributes.dataWindow.values;
            let numOffsets = dataWindowBox.yMax - dataWindowBox.yMin + 1;
            let compression = this.attributes["compression"].value;

            switch (compression) {
                case EXR_ZIP_COMPRESSION:
                    this.scanLinesPerChunk = EXR_ZIP_COMPRESSION_SCANLINES;
                    break;
                case EXR_PIZ_COMPRESSION:
                    this.scanLinesPerChunk = EXR_PIZ_COMPRESSION_SCANLINES;
                    break;
                case EXR_PXR24_COMPRESSION:
                    this.scanLinesPerChunk = EXR_PXR24_COMPRESSION_SCANLINES;
                    break;
                case EXR_B44_COMPRESSION:
                    this.scanLinesPerChunk = EXR_B44_COMPRESSION_SCANLINES;
                    break;
                case EXR_NO_COMPRESSION:
                default:
                    break;
            }

            if (compression != EXR_NO_COMPRESSION) {
                numOffsets = Math.floor(numOffsets / this.scanLinesPerChunk) + (numOffsets % this.scanLinesPerChunk > 0 ? 1 : 0);
            }
            for (let i = 0; i < numOffsets; i++) {
                let offset = b.readUint64();
                this.offsetTable.push({ offset: offset });
                if (i > 0) {
                    this.offsetTable[i - 1].size = offset - this.offsetTable[i - 1].offset;
                }
            }
            if (numOffsets > 1) {
                this.offsetTable[numOffsets - 1].size = (b.bitSize >> 3) - Number(this.offsetTable[numOffsets - 1].offset);
            }

            //  pixels
            this.pixelSize = 0;
            this.channelOffsets = [];
            for (let c = 0; c < this.attributes.channels.values.length; c++) {
                let channel = this.attributes.channels.values[c];

                this.channelOffsets.push(this.pixelSize);

                switch (channel.pixelType) {
                    case EXR_UINT:
                        this.pixelSize += 4;
                        break;
                    case EXR_HALF:
                        this.pixelSize += 2;
                        break;
                    case EXR_FLOAT:
                    default:
                        this.pixelSize += 4;
                        break;
                }
            }

            this.dimensions = { w: 0, h: 0 };
            let dataDimensions = this.attributes.dataWindow.values;
            this.dimensions.w = (dataDimensions.xMax - dataDimensions.xMin + 1);
            this.dimensions.h = (dataDimensions.yMax - dataDimensions.yMin + 1);
            let outputSize = this.dimensions.w * this.dimensions.h * this.pixelSize;

            this.outputBuffer = new NvisBitBuffer(new ArrayBuffer(outputSize));
            // console.log("Total output buffer size: " + outputSize);

            let channelValues = this.attributes.channels.values;

            if (compression == EXR_NO_COMPRESSION) {

                for (let scanLine = 0; scanLine < numOffsets; scanLine++) {
                    // let scanLineLoc = this.outputBuffer.bytePointer;
                    b.seek(Number(this.offsetTable[scanLine].offset));

                    //  not really needed, but we have to consume them fom the input stream
                    let storedScanLine = b.readUint32();
                    let storedDataSize = b.readUint32();

                    // this.outputBuffer.copy(b, 0, this.dimensions.w * this.pixelSize);
                    // this.outputBuffer.bytePointer += this.dimensions.w * this.pixelSize;
                    // continue;

                    for (let channelId = 0; channelId < channelValues.length; channelId++) {
                        // let channelOffset = this.channelOffsets[channelId];
                        let channel = channelValues[channelId];

                        //  TODO: fix more efficient copy method
                        for (let x = 0; x < this.dimensions.w; x++) {
                            //  here, we don't parse float values
                            if (channel.pixelType == EXR_UINT || channel.pixelType == EXR_FLOAT) {
                                // this.outputBuffer.setUint32(scanLineLoc + x * this.pixelSize + channelOffset, b.readUint32());
                                this.outputBuffer.writeUint16(b.readUint16());
                            } else if (channel.pixelType == EXR_HALF) {
                                //this.outputBuffer.setUint16(scanLineLoc + x * this.pixelSize + channelOffset, b.readUint16());
                                this.outputBuffer.writeUint16(b.readUint16());
                            }
                        }
                    }
                }

                return;
            }

            //  Huffman
            this.huffman = {
                tableSizes: new Array(TINFL_MAX_HUFF_TABLES).fill(0),
                lengthCodes: new Array(TINFL_MAX_HUFF_SYMBOLS_0 + TINFL_MAX_HUFF_SYMBOLS_1 + 137).fill(0),
                tables: []
            }
            for (let i = 0; i < TINFL_MAX_HUFF_TABLES; i++) {
                this.huffman.tables.push({
                    codeSize: new Array(TINFL_MAX_HUFF_SYMBOLS_0).fill(0),
                    lookUp: new Array(TINFL_FAST_LOOKUP_SIZE).fill(0),
                    tree: new Array(TINFL_MAX_HUFF_SYMBOLS_0 * 2).fill(0)
                });
            }

            //  compressed data handled below
            for (let sl = 0; sl < numOffsets; sl++) {
                b.seek(Number(this.offsetTable[sl].offset));

                //  not really needed, but we have to consume them fom the input stream
                let storedScanLine = b.readUint32();
                let storedDataSize = b.readUint32();

                //console.log("   scanLine: " + scanLine + ", dataSize: " + dataSize);

                let z = {};

                //  https://datatracker.ietf.org/doc/html/rfc1950

                // let atBit = (b.bytePointer * 8 + b.bitPointer);
                // console.log("at bit: " + atBit);

                let CMF = b.readUint8();
                let FLG = b.readUint8();
                // console.log("CMF: " + CMF + ", FLG: " + FLG + ", next: 0x" + b.peekUint8().toString(16));
                z.cmf = {};
                z.cmf.cm = NvisBitBuffer.bits(CMF, 3, 0);  //  compression method, should be = 8
                z.cmf.info = NvisBitBuffer.bits(CMF, 7, 4);  //   base-2 logarithm of the LZ77 window size, minus eight (CINFO=7 indicates a 32K window size)
                z.flg = {};
                z.flg.fcheck = NvisBitBuffer.bits(FLG, 4, 0);  //  to make (CMF * 256 + FLG % 31) == 0
                z.flg.fdict = NvisBitBuffer.bits(FLG, 5, 5);  //  
                z.flg.flevel = NvisBitBuffer.bits(FLG, 7, 6);  //  0: fastest, 1: fast, 2: default, 3: maximum/slowest 
                z.dictId = (z.flg.fdict == 1 ? b.readUint32() : undefined);

                //  https://datatracker.ietf.org/doc/html/rfc1951                

                let bFinalBlock = false;
                do {

                    bFinalBlock = (b.readBits(1) == 1);
                    let blockType = b.readBits(2);

                    if (blockType == 0) {
                        //  no compression
                        b.byteAlign();

                        let len = (b.readBits(8) | (b.readBits(8) << 8));
                        let nlen = (0xFFFF ^ (b.readBits(8) | (b.readBits(8) << 8)));
                        if (len != nlen) {
                            //  error
                            console.log("ERROR: Raw block header LEN/NLEN mismatch!");
                        }

                        this.outputBuffer.consume(b, len);
                        continue;
                    }

                    if (blockType == 3) {
                        //  reserved (error)
                        console.log("ERROR: Reserved block type (3)");
                    }

                    let counter = 0;

                    if (blockType == 1 || blockType == 2) {
                        //  compression with Huffman codes

                        for (let i = 0; i < TINFL_MAX_HUFF_TABLES; i++) {
                            this.huffman.tables[i].codeSize.fill(0);
                            this.huffman.tables[i].lookUp.fill(0);
                            this.huffman.tables[i].tree.fill(0);
                        }

                        if (blockType == 1) {
                            //  compression with fixed Huffman codes
                            //  TODO: this
                            console.log("TODO: handle blocks compressed with fixed Huffman codes");
                        } else {
                            //  compression with dynamic Huffman codes
                            this.huffman.tableSizes = [
                                b.readBits(5) + s_min_table_sizes[0],
                                b.readBits(5) + s_min_table_sizes[1],
                                b.readBits(4) + s_min_table_sizes[2]
                            ];
                            for (let i = 0; i < this.huffman.tableSizes[2]; i++) {
                                this.huffman.tables[2].codeSize[s_length_dezigzag[i]] = b.readBits(3);
                            }
                            this.huffman.tableSizes[2] = 19;
                        }

                        let nextCode = new Array(17);
                        let totalSymbols = new Array(16);
                        for (let iType = blockType; iType >= 0; iType--)  //  [(2,) 1, 0]
                        {
                            let curHuffmanTable = this.huffman.tables[iType];

                            totalSymbols.fill(0);
                            for (let i = 0; i < this.huffman.tableSizes[iType]; i++) {
                                totalSymbols[curHuffmanTable.codeSize[i]]++;
                            }

                            let total = 0;
                            let usedSymbols = 0;
                            nextCode[0] = 0;
                            nextCode[1] = 0;
                            for (let i = 1; i <= 15; i++) {
                                usedSymbols += totalSymbols[i];
                                total = ((total + totalSymbols[i]) << 1);
                                nextCode[i + 1] = total;
                            }

                            if ((total != 65536) && (usedSymbols > 1)) {
                                //  error
                                console.log("ERROR: Huffman table generation (1)");
                            }

                            let treeNext = -1;
                            for (let symbolIndex = 0; symbolIndex < this.huffman.tableSizes[iType]; symbolIndex++) {

                                let codeSize = curHuffmanTable.codeSize[symbolIndex];
                                if (codeSize == 0) {
                                    continue;
                                }

                                let currentCode = nextCode[codeSize]++;

                                let reverseCode = 0;
                                for (let l = codeSize; l > 0; l--) {
                                    reverseCode = (reverseCode << 1) | (currentCode & 1);
                                    currentCode >>= 1;
                                }

                                if (codeSize <= TINFL_FAST_LOOKUP_BITS) {
                                    let k = ((codeSize << 9) | symbolIndex);
                                    while (reverseCode < TINFL_FAST_LOOKUP_SIZE) {
                                        curHuffmanTable.lookUp[reverseCode] = k;
                                        reverseCode += (1 << codeSize);
                                    }
                                    continue;
                                }

                                let treeCurrent = curHuffmanTable.lookUp[reverseCode & (TINFL_FAST_LOOKUP_SIZE - 1)];
                                if (treeCurrent == 0) {
                                    curHuffmanTable.lookUp[reverseCode & (TINFL_FAST_LOOKUP_SIZE - 1)] = treeNext;
                                    treeCurrent = treeNext;
                                    treeNext -= 2;
                                }

                                reverseCode >>= (TINFL_FAST_LOOKUP_BITS - 1);
                                for (let j = codeSize; j > (TINFL_FAST_LOOKUP_BITS + 1); j--) {
                                    treeCurrent -= ((reverseCode >>= 1) & 1);
                                    if (!curHuffmanTable.tree[-treeCurrent - 1]) {
                                        curHuffmanTable.tree[-treeCurrent - 1] = treeNext;
                                        treeCurrent = treeNext;
                                        treeNext -= 2;
                                    } else {
                                        treeCurrent = curHuffmanTable.tree[-treeCurrent - 1];
                                    }
                                }
                                treeCurrent -= ((reverseCode >>= 1) & 1);
                                curHuffmanTable.tree[-treeCurrent - 1] = symbolIndex;
                            }

                            if (iType == 2) {

                                let distance = 0;

                                for (counter = 0; counter < (this.huffman.tableSizes[0] + this.huffman.tableSizes[1]);) {

                                    distance = this.huffmanDecode(b, 2);

                                    if (distance < 16) {
                                        this.huffman.lengthCodes[counter++] = distance;
                                        continue;
                                    }
                                    if ((distance == 16) && (!counter)) {
                                        //  Error, TODO: handle
                                        console.log("ERROR: Huffman table generation (2)")
                                    }

                                    let numExtra = [2, 3, 7][distance - 16];
                                    let s = b.readBits(numExtra);
                                    s += [3, 3, 11][distance - 16];

                                    for (let i = 0; i < s; i++) {
                                        this.huffman.lengthCodes[counter + i] = (distance == 16 ? this.huffman.lengthCodes[counter - 1] : 0);
                                    }
                                    counter += s;
                                }
                                if ((this.huffman.tableSizes[0] + this.huffman.tableSizes[1]) != counter) {
                                    //TINFL_CR_RETURN_FOREVER(21, TINFL_STATUS_FAILED);
                                    //  Error, TODO: handle
                                    console.log("ERROR: Huffman table generation (3)")
                                }

                                this.huffman.tables[0].codeSize = this.huffman.lengthCodes.slice(0, this.huffman.tableSizes[0]);
                                this.huffman.tables[1].codeSize = this.huffman.lengthCodes.slice(this.huffman.tableSizes[0], this.huffman.tableSizes[0] + this.huffman.tableSizes[1]);
                            }

                        }

                    }

                    for (; ;) {
                        for (; ;) {
                            if ((b.remainingBits() < 32 || this.outputBuffer.remainingBits() < 16)) {
                                //  TODO: this path not tested
                                counter = this.huffmanDecode(b, 0);
                                if (counter >= 256)
                                    break;
                                if (this.outputBuffer.bytePointer >= this.outputBuffer.buffer.byteLength) {
                                    //  error: TODO: handle
                                    console.log("Attempting to write outside output buffer!");
                                }
                                this.outputBuffer.writeUint8(counter);
                            } else {

                                let sym2 = this.huffmanDecode(b, 0, true);

                                counter = sym2;

                                if (counter & 256)
                                    break;

                                sym2 = this.huffmanDecode(b, 0, true);

                                this.outputBuffer.writeUint8(counter & 255);
                                if (sym2 & 256) {
                                    counter = sym2;
                                    break;
                                }
                                this.outputBuffer.writeUint8(sym2 & 255);
                            }
                        }

                        if ((counter &= 511) == 256) {
                            break;
                        }

                        let numExtra = s_length_extra[counter - 257];
                        counter = s_length_base[counter - 257];
                        if (numExtra) {
                            let extraBits = b.readBits(numExtra);
                            counter += extraBits;
                        }

                        let dist = this.huffmanDecode(b, 1);
                        numExtra = s_dist_extra[dist];
                        dist = s_dist_base[dist];
                        if (numExtra > 0) {
                            let extraBits = b.readBits(numExtra);
                            dist += extraBits;
                        }

                        let dist_from_out_buf_start = this.outputBuffer.bytePointer;
                        // dist_from_out_buf_start = pOut_buf_cur - pOut_buf_start;
                        // if ((dist > dist_from_out_buf_start) && (decomp_flags & TINFL_FLAG_USING_NON_WRAPPING_OUTPUT_BUF)) {
                        //     TINFL_CR_RETURN_FOREVER(37, TINFL_STATUS_FAILED);
                        // }

                        let byteIndex = (dist_from_out_buf_start - dist);
                        //                         pSrc = pOut_buf_start + ((dist_from_out_buf_start - dist) & out_buf_size_mask);

                        if (Math.max(this.outputBuffer.bytePointer, byteIndex) > this.outputBuffer.buffer.byteLength - 1) {
                            while (counter--) {
                                this.outputBuffer.writeUint8(this.outputBuffer.peekUint8(dist_from_out_buf_start - dist));
                                dist_from_out_buf_start++;
                            }
                            continue;
                        }

                        if (b.remainingBits() == 0) {
                            console.log("DONE!");
                        }
                        //                         if ((MZ_MAX(pOut_buf_cur, pSrc) + counter) > pOut_buf_end) {
                        //                             while (counter--) {
                        //                                 while (pOut_buf_cur >= pOut_buf_end) {
                        //                                     TINFL_CR_RETURN(53, TINFL_STATUS_HAS_MORE_OUTPUT);
                        //                                 }
                        //                                 *pOut_buf_cur++ = pOut_buf_start[(dist_from_out_buf_start++ - dist) & out_buf_size_mask];
                        //                             }
                        //                             continue;
                        //                         }

                        // #if MINIZ_USE_UNALIGNED_LOADS_AND_STORES
                        //                         else if ((counter >= 9) && (counter <= dist)) {
                        //                             const mz_uint8 * pSrc_end = pSrc + (counter & ~7);
                        //                             do {
                        //                                 ((mz_uint32 *)pOut_buf_cur)[0] = ((const mz_uint32 *)pSrc)[0];
                        //                                 ((mz_uint32 *)pOut_buf_cur)[1] = ((const mz_uint32 *)pSrc)[1];
                        //                                 pOut_buf_cur += 8;
                        //                             } while ((pSrc += 8) < pSrc_end);
                        //                             if ((counter &= 7) < 3) {
                        //                                 if (counter) {
                        //                                     pOut_buf_cur[0] = pSrc[0];
                        //                                     if (counter > 1)
                        //                                         pOut_buf_cur[1] = pSrc[1];
                        //                                     pOut_buf_cur += counter;
                        //                                 }
                        //                                 continue;
                        //                             }
                        //                         }
                        // #endif
                        do {
                            this.outputBuffer.writeUint8(this.outputBuffer.peekUint8(byteIndex + 0));
                            this.outputBuffer.writeUint8(this.outputBuffer.peekUint8(byteIndex + 1));
                            this.outputBuffer.writeUint8(this.outputBuffer.peekUint8(byteIndex + 2));
                            byteIndex += 3;
                            // pOut_buf_cur[0] = pSrc[0];
                            // pOut_buf_cur[1] = pSrc[1];
                            // pOut_buf_cur[2] = pSrc[2];
                            // pOut_buf_cur += 3;
                            // pSrc += 3;
                            // } while ((int)(counter -= 3) > 2);
                        } while ((counter -= 3) > 2);

                        if (counter > 0) {
                            this.outputBuffer.writeUint8(this.outputBuffer.peekUint8(byteIndex));
                            if (counter > 1) {
                                this.outputBuffer.writeUint8(this.outputBuffer.peekUint8(byteIndex + 1));
                            }
                        }
                        // if ((int)counter > 0) {
                        //     pOut_buf_cur[0] = pSrc[0];
                        //     if ((int)counter > 1)
                        //         pOut_buf_cur[1] = pSrc[1];
                        //     pOut_buf_cur += counter;
                        // }
                    }


                    // let s = "";
                    // s += scanLine + ", " + dataSize;
                    // s += ", z: " + JSON.stringify(z);
                    // // for (let i = 0; i < 10; i++)
                    // //     s += ", 0x" + b.readUint8().toString(16);
                    // console.log(s);
                    // console.log("bFinalBlock: " + bFinalBlock + ", blockType: " + blockType);

                } while (!bFinalBlock);

            }

            //  EXR postprocess for ZIP and RLE
            let numChunks = this.dimensions.h / this.scanLinesPerChunk;
            let chunkSize = this.scanLinesPerChunk * this.dimensions.w * this.pixelSize;
            let halfChunkSize = Math.floor((chunkSize + 1) / 2);
            let tmpBuffer = new NvisBitBuffer(new ArrayBuffer(chunkSize));

            for (let chunkId = 0; chunkId < numChunks; chunkId++) {

                //  predictor
                let chunkIndex = chunkId * chunkSize;
                for (let i = chunkIndex + 1; i < chunkIndex + chunkSize; i++) {
                    let d = this.outputBuffer.getUint8(i - 1) + this.outputBuffer.getUint8(i) - 128;
                    this.outputBuffer.setUint8(i, d);
                }

                //  swizzle
                let srcIndex = chunkIndex;
                for (let i = 0; i < chunkSize; i += 2) {
                    let value1 = this.outputBuffer.getUint8(srcIndex);
                    let value2 = this.outputBuffer.getUint8(srcIndex + halfChunkSize);
                    tmpBuffer.setUint8(i, value1);
                    tmpBuffer.setUint8(i + 1, value2);
                    srcIndex++;
                }

                this.outputBuffer.copy(tmpBuffer, chunkIndex);
            }

        }

        huffmanDecode(bitBuffer, tableId, bTest = false) {
            let huffmanTable = this.huffman.tables[tableId];
            let codeLength = 0;

            let remainingBits = bitBuffer.remainingBits();

            //  TODO: is this path necessary?
            if (false && remainingBits < 16) {

                do {
                    let lookupIndex = bitBuffer.readBits(TINFL_FAST_LOOKUP_BITS, true);
                    let temp = huffmanTable.lookUp[lookupIndex];

                    if (temp >= 0) {
                        codeLength = temp >> 9;
                        if (codeLength > 0 && (numBits >= codeLength)) {
                            break;
                        }
                    } else if (numBits > TINFL_FAST_LOOKUP_BITS) {
                        codeLength = TINFL_FAST_LOOKUP_BITS;
                        do {
                            temp = huffmanTable.tree[~temp + ((lBitBuffer >> codeLength++) & 1)];
                        } while ((temp < 0) && (numBits >= (codeLength + 1)));
                        if (temp >= 0) {
                            break;
                        }
                    }
                    let c = b.getUint8();
                    lBitBuffer |= (c << numBits);
                    numBits += 8;
                } while (numBits < 15);
            }

            // if ((bitBuffer.bytePointer * 8 + bitBuffer.bitPointer) - 6664 == 9196)
            //     console.log("Here... " + ((bitBuffer.bytePointer * 8 + bitBuffer.bitPointer) - 6664));
            let lookupIndex = bitBuffer.readBits(TINFL_FAST_LOOKUP_BITS, true);
            let temp = huffmanTable.lookUp[lookupIndex];
            if (temp >= 0) {
                codeLength = temp >> 9;
                if (!bTest)
                    temp &= 511;
            } else {
                codeLength = TINFL_FAST_LOOKUP_BITS;
                lookupIndex = bitBuffer.readBits(15, true);
                do {
                    temp = huffmanTable.tree[~temp + ((lookupIndex >> codeLength++) & 1)];
                } while (temp < 0);
            }

            let distance = temp;
            bitBuffer.skip(0, codeLength);

            return distance;
        }

        readAttribute() {
            let b = this.buffer;

            let attrib = {};
            attrib.name = b.readString();
            attrib.type = b.readString();
            attrib.size = b.readInt32();

            //  https://openexr.readthedocs.io/en/latest/OpenEXRFileLayout.html

            if (attrib.type == "box2i") {
                attrib.values = {
                    xMin: b.readInt32(),
                    yMin: b.readInt32(),
                    xMax: b.readInt32(),
                    yMax: b.readInt32()
                }
            }

            if (attrib.type == "box2f") {
                attrib.values = {
                    xMin: b.readFloat32(),
                    yMin: b.readFloat32(),
                    xMax: b.readFloat32(),
                    yMax: b.readFloat32()
                }
            }

            if (attrib.type == "chlist") {
                attrib.values = [];
                while (b.peekUint8() != 0) {
                    let name = b.readString();
                    let pixelType = b.readInt32();
                    let pLinear = b.readUint8();
                    b.skip(3);  //  reserved
                    let xSampling = b.readInt32();
                    let ySampling = b.readInt32();
                    let attribValue = {
                        name: name,
                        pixelType: pixelType,
                        pLinear: pLinear,
                        xSampling: xSampling,
                        ySampling: ySampling
                    }
                    attrib.values.push(attribValue);
                }
                b.skip();
            }

            if (attrib.type == "chromaticities") {
            }

            if (attrib.type == "compression") {
                attrib.value = b.readUint8();
            }

            if (attrib.type == "double") {
            }
            if (attrib.type == "envmap") {
            }

            if (attrib.type == "float") {
                attrib.value = b.readFloat32();
            }

            if (attrib.type == "int") {
                attrib.value = b.readUint32();
            }

            if (attrib.type == "keycode") {
            }

            if (attrib.type == "lineOrder") {
                attrib.value = b.readUint8();
            }

            if (attrib.type == "m33f") {
            }
            if (attrib.type == "m44f") {
            }
            if (attrib.type == "preview") {
            }
            if (attrib.type == "rational") {
            }
            if (attrib.type == "string") {
            }
            if (attrib.type == "stringvector") {
            }
            if (attrib.type == "tiledesc") {
            }
            if (attrib.type == "timecode") {
            }

            if (attrib.type == "v2i") {
                attrib.values = {
                    x: b.readInt32(),
                    y: b.readInt32()
                }
            }

            if (attrib.type == "v2f") {
                attrib.values = {
                    x: b.readFloat32(),
                    y: b.readFloat32()
                }
            }

            if (attrib.type == "v3i") {
            }
            if (attrib.type == "v3f") {
            }

            return attrib;
        }

        toFloatArray() {
            let data = new Float32Array(new ArrayBuffer(this.dimensions.w * this.dimensions.h * 4 * 4));  //  w x h x RGBA x float

            const ChannelMap = { "R": 0, "G": 1, "B": 2, "A": 3 };
            let channels = this.attributes.channels.values;

            const dstChannels = 4;
            for (let y = 0; y < this.dimensions.h; y++) {
                for (let x = 0; x < this.dimensions.w; x++) {
                    let dstLoc = (y * this.dimensions.w + x) * dstChannels;
                    for (let channelId = 0; channelId < channels.length; channelId++) {
                        let channel = channels[channelId];
                        let channelOffset = this.channelOffsets[channelId];
                        let channelSize = (channel.pixelType == EXR_HALF ? 2 : 4);
                        let srcLoc = (y * this.pixelSize + channelOffset) * this.dimensions.w + x * channelSize;

                        let value = 0;
                        value = this.outputBuffer.getFloat16(srcLoc);
                        data[dstLoc + ChannelMap[channel.name]] = value;
                    }
                    data[dstLoc + ChannelMap["A"]] = 1.0;  //  alpha
                }
            }

            return data;
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////


    function NvisFileName(fileName) {
        let _fileName = fileName;
        let _directory = "";
        let _name = "";
        let _extension = "";

        let _isNumbered = false;
        let _number = 0;
        let _numberWidth = 4;

        let _init = function () {

        }

        let _zeroPad = function (value, width) {
            let pad = "000000000000000";
            return (pad + value).slice(-width);
        }

        let _toString = function () {
            let string = _directory + "/" + _name;
            if (_isNumbered) {
                string += ("." + _zeroPad(_number, _numberWidth));
            }
            string += ("." + _extension);

            return string;
        }

        _init();

        return {
            toString: _toString,
        }
    }


    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////


    class NvisStream {

        constructor(glContext, shaderId = -1) {
            this.glContext = glContext;

            this.dimensions = undefined;

            this.fileNames = [];

            this.textures = [];

            this.bFloat = undefined;

            this.shaderId = shaderId;  //  = -1 for file streams
            this.inputStreamIds = [];
            this.shaderJSONObject = undefined;
            this.bUIReady = false;

            //  TODO: to be used for shader streams, plus to read back stream data
            this.outputTexture = undefined;
            this.frameBuffer = undefined;

            this.numTextures = 1;
            this.currentTexture = 0;

            this.defaultUI = `{
                "uTonemapper": {
                    "type": "dropdown",
                    "value": 0,
                    "alternatives" : [
                        "None",
                        "Gamma Correction",
                        "Clamp",
                        "Log",
                        "Reinhard",
                        John Hable",
                        "Uncharted2",
                        "ACES"
                    ]
                },
                "uWhiteScale": {
                    "name": "Linear White",
                    "type": "float",
                    "value": 11.2,
                    "min": 0.001,
                    "max": 100.0,
                    "step": 0.01,
                    "condition": "uToneMapper==6"
                }
            }`;
        }


        getPixelValue(pxCoord) {
            let gl = this.glContext;

            gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
            // const format = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_FORMAT);
            // const type = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_TYPE);

            let numChannels = 4;  //  TODO: handle different formats
            let data = undefined;

            if (this.bFloat) {
                data = new Float32Array(1 * 1 * numChannels);
            } else {
                data = new Uint8Array(1 * 1 * numChannels);
            }
            gl.readPixels(pxCoord.x, pxCoord.y, 1, 1, gl.RGBA, (this.bFloat ? gl.FLOAT : gl.UNSIGNED_BYTE), data);

            gl.bindFramebuffer(gl.FRAMEBUFFER, null);

            return { r: data[0], g: data[1], b: data[2], a: data[3] };
        }


        setUniforms(shader) {

            let gl = this.glContext;

            //  lazily get the UI JSON from the shader
            if (!this.bUIReady) {
                let json = shader.json;
                if (json === undefined) {
                    return;
                }
                this.shaderJSONObject = JSON.parse(json);
                this.bUIReady = true;
            }

            let uiObject = this.shaderJSONObject.UI;
            if (uiObject === undefined) {
                return;
            }

            for (let key of Object.keys(uiObject)) {
                let type = uiObject[key].type;
                let uniform = gl.getUniformLocation(shader.getProgram(), key);

                if (uniform === undefined) {
                    continue;
                }

                if (type == "bool") {
                    gl.uniform1i(uniform, (uiObject[key].value ? 1 : 0));
                }

                if (type == "float") {
                    gl.uniform1f(uniform, uiObject[key].value);
                }

                if (type == "dropdown") {
                    gl.uniform1i(uniform, uiObject[key].value);
                }
            }
        }


        uiUpdate(elementId) {
            //_object[key].value = value;
            let key = elementId.replace(/\-.*$/, "");
            let element = document.getElementById(elementId);
            let object = this.shaderJSONObject.UI[key];
            let type = object.type;
            object.value = (type == "bool" ? element.checked : (type == "dropdown" ? element.selectedIndex : element.value));

            let elementValue = document.getElementById(elementId + "-Value");
            if (elementValue !== null) {
                elementValue.innerHTML = element.value;
            }

            console.log(key + ": " + object.value);
        }


        setupTexture(texture, image, bFloat = false, dimensions = { w: 0, h: 0 }) {

            let gl = this.glContext;

            this.bFloat = bFloat;

            gl.bindTexture(gl.TEXTURE_2D, texture);

            if (bFloat) {
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, dimensions.w, dimensions.h, 0, gl.RGBA, gl.FLOAT, image);
            } else {
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            }

            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

            gl.bindTexture(gl.TEXTURE_2D, null);  //  TODO: Chrome requirement?
        }


        setDimensions(dimensions, bFloat) {

            let gl = this.glContext;

            this.dimensions = dimensions;

            this.outputTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, this.outputTexture);

            if (bFloat) {
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, dimensions.w, dimensions.h, 0, gl.RGBA, gl.FLOAT, null);
            } else {
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, dimensions.w, dimensions.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            }

            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

            this.frameBuffer = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);

            let attachmentPoint = gl.COLOR_ATTACHMENT0;
            gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, this.outputTexture, 0);

            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }


        load(fileNames, callback) {

            let gl = this.glContext;
            let numFilesLoaded = 0;
            let self = this;

            for (let fileId = 0; fileId < fileNames.length; fileId++) {

                // if (!files[fileId].type.match(/image.*/) && !files[0].name.match(/.exr$/)) {
                //     continue;
                // }                

                let texture = gl.createTexture();
                this.textures.push(texture);

                let fileName = fileNames[fileId];
                this.fileNames.push(fileName);

                if (fileName.match(/.exr$/)) {

                    let xhr = new XMLHttpRequest();
                    xhr.open("GET", fileName);
                    xhr.setRequestHeader("Cache-Control", "no-cache, no-store, max-age=0");
                    xhr.responseType = "arraybuffer";
                    xhr.onload = function () {
                        if (this.status == 200 && this.response !== null) {
                            numFilesLoaded++;

                            let file = new NvisEXRFile(fileName, this.response);

                            self.setupTexture(texture, file.toFloatArray(), true, file.dimensions);
                            //self.setupTexture(texture, new Float32Array(file.outputBuffer.buffer, 0, file.bitSize / (8 * 4)), true, file.dimensions);

                            if (numFilesLoaded == fileNames.length) {
                                self.setDimensions(file.dimensions, true);
                                callback(file.dimensions);
                            }
                        }
                    };
                    xhr.send();

                } else {

                    const image = new Image();
                    image.src = fileNames[fileId];

                    image.onload = function () {
                        numFilesLoaded++;
                        self.setupTexture(texture, image);

                        if (numFilesLoaded == fileNames.length) {
                            self.setDimensions({ w: image.width, h: image.height }, false);
                            callback(self.dimensions);
                        }
                    }

                }
            }
        }


        drop(files, callback) {

            //  TODO: combine with this.load()

            let gl = this.glContext;
            let numFilesLoaded = 0;
            let self = this;

            for (let fileId = 0; fileId < files.length; fileId++) {
                if (!files[fileId].type.match(/image.*/) && !files[0].name.match(/.exr$/)) {
                    continue;
                }

                this.fileNames.push(files[fileId].name);

                let texture = gl.createTexture();
                this.textures.push(texture);

                let file = files[fileId];

                if (file.type.match(/image.*/)) {
                    let reader = new FileReader();

                    reader.onload = function (event) {

                        const image = new Image();
                        image.src = event.target.result;

                        image.onload = function () {

                            self.setupTexture(texture, image);
                            numFilesLoaded++;

                            if (numFilesLoaded == files.length) {
                                self.setDimensions({ w: image.width, h: image.height }, false);
                                callback({ w: image.width, h: image.height });
                            }
                        }

                    }

                    reader.readAsDataURL(file);
                } else if (files[0].name.match(/.exr$/)) {
                    let reader = new FileReader();

                    reader.onload = function (event) {

                        let file = new NvisEXRFile(files[0].name, reader.result);

                        let image = new ArrayBuffer(new Float32Array(file.width * file.height * 4 * file.numChannels));

                        // for (let y = 0; y < file.dimensions.h; y++) {
                        //     for (let x = 0; x < file.dimensions.w; x++) {

                        //     }
                        // }

                        self.setupTexture(texture, image, true);
                        numFilesLoaded++;

                        if (numFilesLoaded == files.length) {
                            self.setDimensions({ w: image.width, h: image.height }, true);
                            callback({ w: image.width, h: image.height });
                        }

                    }

                    reader.readAsArrayBuffer(file);
                }
            }
        }


        getShaderId() {
            return this.shaderId;
        }


        setShaderId(shaderId) {
            this.shaderId = shaderId;
        }


        getDimensions() {
            return this.dimensions;
        }


        getInputStreamId(inputId) {
            return this.inputStreamIds[inputId];
        }

        setInputStreamId(inputId, streamId) {
            this.inputStreamIds[inputId] = streamId;
        }


        setInputStreamIds(streamIds) {
            this.inputStreamIds = streamIds;
        }


        getTexture(index) {

            if (this.shaderId != -1) {
                return this.outputTexture;
            }

            index = index % this.textures.length;  // TODO: solve elsewhere
            return this.textures[index];
        }


        getFileName() {
            //  TODO: fix
            //  TODO: remove bFileStream, use shaderId instead
            return (this.fileNames.length > 0 ? this.fileNames[0] : "Shader");
        }


        setFileName(fileName) {
            this.fileName = fileName;
        }


        getNumImages = function () {
            return this.textures.length;
        }


        buildShaderUI(object, streamId) {
            let dom = document.createDocumentFragment();

            let table = document.createElement("table");
            table.style.marginLeft = "50px";

            for (let key of Object.keys(object)) {
                let label = document.createElement("label");
                label.setAttribute("for", key);
                label.innerHTML = object[key].name;

                let elementId = (key + "-" + streamId);  //  need uniqueness

                let callbackString = "nvis.streamUpdateParameter(" + streamId + ", \"" + elementId + "\")";

                let row = document.createElement("tr");

                let el = undefined;
                let type = object[key].type;
                if (type == "bool" || type == "float") {
                    el = document.createElement("input");
                    el.setAttribute("id", elementId);

                    if (type == "bool") {
                        el.setAttribute("type", "checkbox");
                        if (object[key].value) {
                            el.setAttribute("checked", true);
                        }
                        else {
                            el.removeAttribute("checked");
                        }
                        el.setAttribute("onclick", callbackString);
                    }
                    else if (type == "float") {
                        el.setAttribute("type", "range");
                        el.setAttribute("min", (object[key].min ? object[key].min : 0.0));
                        el.setAttribute("max", (object[key].max ? object[key].max : 1.0));
                        el.setAttribute("value", (object[key].value ? object[key].value : 0.0));
                        el.setAttribute("step", (object[key].step ? object[key].step : 0.1));
                        el.setAttribute("oninput", callbackString);
                        let oEl = document.createElement("span");
                        oEl.id = (elementId + "-Value");
                        oEl.innerHTML = (oEl.innerHTML == "" ? object[key].value : oEl.innerHTML);

                        label.innerHTML += " (" + oEl.outerHTML + ")";
                    }
                }
                else if (type == "dropdown") {
                    el = document.createElement("select");
                    el.setAttribute("id", elementId);
                    el.setAttribute("onchange", callbackString);
                    for (let optionId = 0; optionId < object[key].alternatives.length; optionId++) {
                        let oEl = document.createElement("option");
                        if (object[key].value == optionId) {
                            oEl.setAttribute("selected", true);
                        }
                        oEl.innerHTML = object[key].alternatives[optionId];
                        el.appendChild(oEl);
                    }
                }

                if (el !== undefined) {
                    if (type == "bool") {
                        let cell = document.createElement("td");
                        cell.setAttribute("multicolumn", 2);
                        cell.innerHTML = el.outerHTML + label.outerHTML;

                        row.appendChild(cell);
                    }
                    else {
                        let elCell = document.createElement("td");
                        elCell.innerHTML = el.outerHTML;
                        let labelCell = document.createElement("td");
                        labelCell.innerHTML = label.outerHTML;

                        row.appendChild(labelCell);
                        row.appendChild(elCell);
                    }

                    table.appendChild(row);
                }
            }

            dom.appendChild(table);

            return dom;
        }


        getUI(streamId, streams, shaders) {

            //  streamId is needed since the stream itself does not know its id
            let ui = document.createDocumentFragment();

            let span = document.createElement("span");
            span.innerHTML = ("- stream " + (streamId + 1) + ": " + this.getFileName());
            ui.appendChild(span);
            ui.appendChild(document.createElement("br"));

            if (this.shaderId != -1) {

                let shader = shaders.shaders[this.shaderId];

                for (let inputId = 0; inputId < shader.getNumInputs(); inputId++) {
                    let eId = ("input-" + streamId + "-" + inputId);
                    let label = document.createElement("label");
                    label.setAttribute("for", eId);
                    label.innerHTML = ("Input " + (inputId + 1) + ":");

                    let sEl = document.createElement("select");
                    sEl.id = eId;
                    sEl.setAttribute("onchange", "nvis.streamUpdateInput(" + streamId + ", " + inputId + ")");
                    for (let otherStreamId = 0; otherStreamId < streams.length; otherStreamId++) {
                        if (otherStreamId != streamId) {
                            let sOp = document.createElement("option");
                            sOp.innerHTML = streams[otherStreamId].getFileName();
                            if (this.inputStreamIds[inputId] == otherStreamId) {
                                sOp.setAttribute("selected", true);
                            }
                            sEl.appendChild(sOp);
                        }
                    }
                    ui.appendChild(label);
                    ui.appendChild(sEl);
                    ui.appendChild(document.createElement("br"));
                }
                if (shader !== undefined && shader.isReady()) {
                    //ui.appendChild(shader.getUI(streamId));
                    ui.appendChild(this.buildShaderUI(this.shaderJSONObject.UI, streamId));
                }
            }

            return ui;
        }

    }


    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////

    class NvisOverlay {

        constructor() {
            this.position = { x: 10, y: 10 };
            this.size = { w: 120, h: 25 };
            this.text = "";
            this.overlay = document.createElement("div");;

            this.overlay.style.display = "none";
            this.overlay.style.position = "absolute";
            this.overlay.style.color = "white";
            this.overlay.style.font = "20px Consolas";
            this.overlay.style.backgroundColor = "green";
            // this.overlay.style.left = _canvas.offsetLeft;
            // this.overlay.style.top = (_canvas.height + _canvas.offsetTop) + "px";
            this.overlay.style.left = this.position.x + "px";
            this.overlay.style.top = this.position.y + "px";
            // this.overlay.style.width = _canvas.width + "px";
            // this.overlay.style.height = "50px";
            this.overlay.style.width = this.size.w + "px";
            this.overlay.style.height = this.size.h + "px";

            this.#setText("Testing...");
        }

        #setText(text) {
            this.text = text;
            this.overlay.innerHTML = text;
        }

        getNode() {
            return this.overlay;
        }

        resize(position, dimensions) {
            //console.log("overlay resize: " + position.x + ", " + position.y);
            this.overlay.style.left = position.x + "px";
            this.overlay.style.top = position.y + "px";
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////

    function NvisCanvas(glContext) {

    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////


    class NvisWindows {

        constructor(glContext, canvas) {
            this.glContext = glContext;
            this.canvas = canvas;

            this.streamPxDimensions = undefined;
            this.winPxDimensions = undefined;
            this.windows = [];

            this.boundAdjust = this.adjust.bind(this);

            this.textureCoordinates = new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0]);
        }

        insideWindow(canvasPxCoords) {
            return !(canvasPxCoords.x < 0 || canvasPxCoords.x >= this.canvas.width || canvasPxCoords.y < 0 || canvasPxCoords.y >= this.canvas.height);
        }


        setStreamPxDimensions(pxDimensions) {
            if (this.streamPxDimensions !== undefined && pxDimensions.w != this.streamPxDimensions.w && pxDimensions.h != this.streamPxDimensions.h) {
                alert("New stream size mismatch!");
            }
            this.streamPxDimensions = pxDimensions;
        }


        getWindowId(canvasPxCoords) {
            if (!this.insideWindow(canvasPxCoords)) {
                return undefined;
            }


            let xx = canvasPxCoords.x / this.canvas.width;
            let yy = canvasPxCoords.y / this.canvas.height;

            let layoutDims = _state.layout.getDimensions();
            let w = layoutDims.w;
            let h = layoutDims.h;

            let windowId = Math.trunc(yy * h) * w + Math.trunc(xx * w);

            if (windowId >= this.windows.length) {
                return undefined;
            }

            return windowId;
        }


        getWindow(windowId) {
            return this.windows[windowId];
        }


        getNumWindows() {
            return this.windows.length;
        }


        getWindowCoordinates(canvasPxCoords, bToPixels = false) {

            if (!this.insideWindow(canvasPxCoords)) {
                return undefined;
            }

            let layoutDims = _state.layout.getDimensions();

            let coords = {
                x: canvasPxCoords.x % (this.canvas.width / layoutDims.w),
                y: canvasPxCoords.y % (this.canvas.height / layoutDims.h)
            }

            if (!bToPixels) {
                coords = {
                    x: coords.x / this.winPxDimensions.w,
                    y: coords.y / this.winPxDimensions.h
                }
            }

            return coords;
        }

        getStreamCoordinates(canvasPxCoords, bToPixels = false) {

            if (!this.insideWindow(canvasPxCoords)) {
                return undefined;
            }

            let wpc = this.getWindowCoordinates(canvasPxCoords, true);
            let z = _state.zoom.level;
            let ox = _state.zoom.streamOffset.x;
            let oy = _state.zoom.streamOffset.y;
            let ww = this.winPxDimensions.w;
            let wh = this.winPxDimensions.h;
            let sw = this.streamPxDimensions.w;
            let sh = this.streamPxDimensions.h;

            let bx = Math.max(ww - sw * z, 0.0) / 2.0;
            let by = Math.max(wh - sh * z, 0.0) / 2.0;
            let xx = (wpc.x - bx) / z;
            let yy = (wpc.y - by) / z;

            if (ww < sw * z) {
                xx += ox * sw;
            }
            if (wh < sh * z) {
                yy += oy * sh;
            }

            let coords = {
                x: xx,
                y: yy
            };

            if (xx < 0.0 || xx >= sw) {
                // coords.x = undefined;
                return undefined;
            } else if (!bToPixels) {
                coords.x = coords.x / sw;
            }
            if (yy < 0.0 || yy >= sh) {
                // coords.y = undefined;
                return undefined;
            } else if (!bToPixels) {
                coords.y = coords.y / sh;
            }
            // console.log("NvisWindows.getStreamPixelCoordinates(): " + JSON.stringify(coords));

            return coords;
        }


        add(streamId = 0) {
            let win = new NvisWindow(this.glContext, this.canvas);

            win.updateTextureCoordinates(this.textureCoordinates);
            win.setStreamId(streamId);

            this.windows.push(win);
            this.adjust();

            return win;
        }


        delete(canvasPxCoords) {
            let windowId = this.getWindowId(canvasPxCoords);
            if (this.windows.length > 1 && windowId !== undefined) {
                this.windows.splice(windowId, 1);
                this.adjust();
            }
        }


        resize() {
            for (let windowId = 0; windowId < this.windows.length; windowId++) {
                let position = { x: (windowId % w) * size.w, y: Math.trunc(windowId / w) * size.h };
                this.windows[windowId].resize(position, size);
            }
        }


        inc() {
            let layout = _state.layout;
            if (!layout.bAutomatic) {
                layout.dimensions.w = Math.min(layout.dimensions.w + 1, this.windows.length);
            }
            this.adjust();
        }


        dec() {
            let layout = _state.layout;
            if (!layout.bAutomatic) {
                layout.dimensions.w = Math.max(layout.dimensions.w - 1, 1);
            }
            this.adjust();
        }


        setWindowStreamId(windowId, streamId) {
            this.windows[windowId].setStreamId(streamId);
        }


        debugZoom(title) {
            console.log("---------------------  " + title + "  ---------------------");
            console.log("     zoom level: " + _state.zoom.level);
            console.log("     win aspect ratio: " + _state.zoom.winAspectRatio);
            console.log("     stream rel offset: " + JSON.stringify(_state.zoom.streamOffset));
            console.log("     mouseWinCoords: " + JSON.stringify(_state.zoom.mouseWinCoords));
            console.log("     win dim (px): " + JSON.stringify(this.winPxDimensions));
            console.log("     stream dim (px): " + JSON.stringify(this.streamPxDimensions));
        }


        updateTextureCoordinates() {
            if (this.streamPxDimensions === undefined) {
                return;
            }

            //  top-left
            this.textureCoordinates[0] = 0.0;
            this.textureCoordinates[1] = 0.0;
            //  top-right
            this.textureCoordinates[2] = 1.0;
            this.textureCoordinates[3] = 0.0;
            //  bottom-left
            this.textureCoordinates[4] = 0.0;
            this.textureCoordinates[5] = 1.0;
            //  bottom-right
            this.textureCoordinates[6] = 1.0;
            this.textureCoordinates[7] = 1.0;

            //  zoom
            let zw = _state.zoom.level * this.streamPxDimensions.w;
            let zh = _state.zoom.level * this.streamPxDimensions.h;
            let tx = this.winPxDimensions.w / zw;
            let ty = this.winPxDimensions.h / zh;

            this.textureCoordinates[2] = tx;  //  top-right, X
            this.textureCoordinates[5] = ty;  //  bottom-left, Y
            this.textureCoordinates[6] = tx;  //  bottom-right, X
            this.textureCoordinates[7] = ty;  //  bottom-right, Y

            //  offsets
            if (zw < this.winPxDimensions.w) {
                _state.zoom.streamOffset.x = (1.0 - tx) / 2.0;
            } else {
                _state.zoom.streamOffset.x = Math.min(Math.max(_state.zoom.streamOffset.x, 0.0), 1.0 - tx);
            }
            if (zh < this.winPxDimensions.h) {
                _state.zoom.streamOffset.y = (1.0 - ty) / 2.0;
            } else {
                _state.zoom.streamOffset.y = Math.min(Math.max(_state.zoom.streamOffset.y, 0.0), 1.0 - ty);
            }

            for (let i = 0; i < 8; i += 2) {
                this.textureCoordinates[i] += _state.zoom.streamOffset.x;
                this.textureCoordinates[i + 1] += _state.zoom.streamOffset.y;
            }

            // this.debugZoom("updateTextureCoordinates()");

            //  update windows with new coordinates
            for (let windowId = 0; windowId < this.windows.length; windowId++) {
                this.windows[windowId].updateTextureCoordinates(this.textureCoordinates);
            }
        }


        adjust() {
            if (this.windows.length == 0) {
                return;
            }

            let layout = _state.layout;

            //  first, determine layout width/height
            if (layout.bAutomatic) {
                let canvasAspect = this.canvas.height / this.canvas.width;
                layout.automaticDimensions.w = Math.round(Math.sqrt(Math.pow(2, Math.ceil(Math.log2(this.windows.length / canvasAspect)))));
                layout.automaticDimensions.w = Math.max(Math.min(layout.automaticDimensions.w, this.windows.length), 1);
                layout.automaticDimensions.h = Math.ceil(this.windows.length / layout.automaticDimensions.w);
            } else {
                layout.dimensions.w = Math.max(Math.min(layout.dimensions.w, this.windows.length), 1);
                layout.dimensions.h = Math.ceil(this.windows.length / layout.dimensions.w);
            }


            let layoutDims = layout.getDimensions();
            let w = layoutDims.w;
            let h = layoutDims.h;

            //  next, determine canvas dimensions and border
            this.canvas.style.border = layout.border + "px solid black";
            let pageWidth = (window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth);
            let pageHeight = (window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight);
            let width = pageWidth - 2 * layout.border;
            let height = pageHeight - 2 * layout.border;
            let dw = (width % w);
            let dh = (height % h);

            this.canvas.width = (width - dw);
            this.canvas.height = (height - dh);
            this.canvas.style.borderRight = (layout.border + dw) + "px solid black";
            this.canvas.style.borderBottom = (layout.border + dh) + "px solid black";

            //  set viewport to match canvas size
            this.glContext.viewport(0, 0, this.canvas.width, this.canvas.height);

            //  lastly, determine window dimensions
            let winDimensions = { w: 1.0 / w, h: 1.0 / h };

            //  use actual canvas border values
            let tw = this.canvas.width;
            let th = this.canvas.height;
            this.winPxDimensions = { w: tw / w, h: th / h };
            _state.zoom.winAspectRatio = this.winPxDimensions.h / this.winPxDimensions.w;

            for (let windowId = 0; windowId < this.windows.length; windowId++) {
                let position = {
                    x: (windowId % w) * winDimensions.w,
                    y: Math.trunc(windowId / w) * winDimensions.h
                };
                this.windows[windowId].resize(position, winDimensions);
            }

            //  update texture coordinates to reflect changes
            this.updateTextureCoordinates();
        }


        translate(canvasOffset, bPixels = true) {
            //  bPixels: x and y are in pixels
            if (bPixels) {
                canvasOffset = {
                    x: canvasOffset.x / (this.streamPxDimensions.w * _state.zoom.level),
                    y: canvasOffset.y / (this.streamPxDimensions.h * _state.zoom.level)
                }
            }

            _state.zoom.streamOffset.x += canvasOffset.x;
            _state.zoom.streamOffset.y += canvasOffset.y;

            this.updateTextureCoordinates();
        }


        zoom(direction, canvasPxCoords, bHigh = false) {
            let winRelCoords = this.getWindowCoordinates(canvasPxCoords);
            if (winRelCoords !== undefined) {

                let oldStreamCoords = this.getStreamCoordinates(canvasPxCoords);

                let factor = (bHigh ? _state.zoom.HighFactor : _state.zoom.LowFactor);
                _state.zoom.level *= (direction > 0 ? factor : 1.0 / factor);
                _state.zoom.level = Math.min(Math.max(_state.zoom.level, 1.0), 256.0);  //  TODO: is this what we want?
                _state.zoom.mouseWinCoords = winRelCoords;

                let newStreamCoords = this.getStreamCoordinates(canvasPxCoords);

                if (oldStreamCoords !== undefined && newStreamCoords !== undefined) {
                    if (oldStreamCoords.x !== undefined && newStreamCoords.x !== undefined) {
                        _state.zoom.streamOffset.x += (oldStreamCoords.x - newStreamCoords.x);
                    }
                    if (oldStreamCoords.y !== undefined && newStreamCoords.y !== undefined) {
                        _state.zoom.streamOffset.y += (oldStreamCoords.y - newStreamCoords.y);
                    }
                }

                this.updateTextureCoordinates();
            }

            return _state.zoom.level;
        }


        incStream(canvasPxCoords, streams) {
            let windowId = this.getWindowId(canvasPxCoords);
            if (windowId !== undefined) {
                let streamId = this.windows[windowId].getStreamId();
                let nextStreamId = (streamId + 1) % streams.length;
                this.windows[windowId].setStreamId(nextStreamId);
            }
        }


        decStream(canvasPxCoords, streams) {
            let windowId = this.getWindowId(canvasPxCoords);
            if (windowId !== undefined) {
                let streamId = this.windows[windowId].getStreamId();
                let nextStreamId = (streamId + streams.length - 1) % streams.length;
                this.windows[windowId].setStreamId(nextStreamId);
            }
        }


        render(frameId, streams, shaders) {
            for (let windowId = 0; windowId < this.windows.length; windowId++) {
                this.windows[windowId].render(windowId, frameId, streams, shaders);
            }

            if (_state.zoom.level >= 8.0) {
                let canvasCoords = _state.input.mouse.canvasCoords;
                let activeWindowId = this.getWindowId(canvasCoords);

                let layoutDims = _state.layout.getDimensions();
                let winDim = { w: this.canvas.width / layoutDims.w, h: this.canvas.height / layoutDims.h };
                let z = _state.zoom.level;
                let ww = winDim.w;
                let wh = winDim.h;

                let pixelSize = {
                    w: z / (ww * layoutDims.w),
                    h: z / (wh * layoutDims.h)
                }

                let layout = _state.layout.getDimensions();
                let wc = this.getWindowCoordinates(_state.input.mouse.canvasCoords);

                if (wc === undefined) {
                    return;
                }


                for (let windowId = 0; windowId < this.windows.length; windowId++) {
                    let window = this.windows[windowId];
                    let stream = streams[window.getStreamId()];
                    let streamDim = stream.getDimensions();

                    if (streamDim === undefined) {
                        continue;
                    }

                    let sw = streamDim.w;
                    let sh = streamDim.h;
                    let isw = 1.0 / sw;
                    let ish = 1.0 / sh;

                    let p = window.position;

                    let streamOffset = {
                        x: (isw - (_state.zoom.streamOffset.x % isw)) * (sw * pixelSize.w),
                        y: (ish - (_state.zoom.streamOffset.y % ish)) * (sh * pixelSize.h)
                    };
                    let offset = { x: p.x + wc.x / layout.w, y: p.y + wc.y / layout.h };

                    offset = {
                        x: offset.x - (offset.x - streamOffset.x - p.x + pixelSize.w) % pixelSize.w,
                        y: offset.y - (offset.y - streamOffset.y - p.y + pixelSize.h) % pixelSize.h
                    };

                    if (activeWindowId !== undefined) {
                        window.pixelDrawer.update(windowId, offset, pixelSize, windowId == activeWindowId);
                        window.pixelDrawer.render(windowId == activeWindowId);
                    }
                }
            }
        }

    }


    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////


    class NvisWindow {

        constructor(glContext, canvas) {
            this.glContext = glContext;
            this.canvas = canvas;

            this.streamId = undefined;

            this.gridDrawer = new NvisGridDrawer(this.glContext);
            this.pixelDrawer = new NvisPixelDrawer(this.glContext);

            this.position = { x: 0, y: 0 };
            this.dimensions = { w: 0, h: 0 };

            let gl = this.glContext;

            this.vertexPositions = new Float32Array([-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0]);
            this.vertexPositionBuffer = gl.createBuffer();
            this.textureCoordinateBuffer = gl.createBuffer();

            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.vertexPositions, gl.STATIC_DRAW);

            //  TODO: only one of each of these needed (for shader streams), move elsewhere

            let fullVertexPositions = new Float32Array([-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0]);
            this.fullVertexPositionBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.fullVertexPositionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, fullVertexPositions, gl.STATIC_DRAW);

            let fullTextureCoordinates = new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0]);
            this.fullTextureCoordinateBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.fullTextureCoordinateBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, fullTextureCoordinates, gl.STATIC_DRAW);

            this.overlay = new NvisOverlay();

            //this.canvas.parentNode.insertBefore(this.overlay.getNode(), this.canvas.nextSibling);

            this.resize({ x: 0.0, y: 0.0 }, { w: 1.0, h: 1.0 });

            this.TextureUnits = [
                gl.TEXTURE0,
                gl.TEXTURE1,
                gl.TEXTURE2,
                gl.TEXTURE3,
                gl.TEXTURE4,
                gl.TEXTURE5,
                gl.TEXTURE6,
                gl.TEXTURE7,
            ];
        }


        resize(position, dimensions) {
            this.position = position;
            this.dimensions = dimensions;

            if (this.streamId === undefined) {
                return;
            }
            // else if (this.stream.getDimensions() === undefined) {
            //     //  TODO: is this needed?
            //     return;
            // }

            let gl = this.glContext;

            let x = _clamp(2.0 * position.x - 1.0, -1.0, 1.0);
            let y = _clamp(1.0 - 2.0 * position.y, -1.0, 1.0);
            let width = 2.0 * dimensions.w;
            let height = 2.0 * dimensions.h;

            let xx = _clamp(x + width, -1.0, 1.0);
            let yy = _clamp(y - height, -1.0, 1.0);

            this.vertexPositions[0] = x;
            this.vertexPositions[1] = y;
            this.vertexPositions[2] = xx;
            this.vertexPositions[3] = y;
            this.vertexPositions[4] = x;
            this.vertexPositions[5] = yy;
            this.vertexPositions[6] = xx;
            this.vertexPositions[7] = yy;

            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.vertexPositions, gl.STATIC_DRAW);

            //  TODO: fix overlay...
            this.overlay.resize({ x: position.x * 100, y: position.y * 100 }, dimensions);
        }


        getStreamId() {
            return this.streamId;
        }


        setStreamId(streamId) {
            this.streamId = streamId;
        }


        render(windowId, frameId, streams, shaders) {
            let gl = this.glContext;

            //  below, a lot of checks are needed due to asynch file/shader loading
            let stream = streams[this.streamId];
            if (stream === undefined) {
                return;
            }
            let streamDim = stream.getDimensions();
            let shaderId = stream.getShaderId();
            let bStreamDimKnown = false;
            if (streamDim === undefined) {
                if (shaderId != -1) {
                    //  dimensions unknown for a shader stream -> check inputs
                    let shader = shaders.shaders[shaderId];
                    if (shader !== undefined && shader.getNumInputs() != 0) {
                        let inputStream = streams[stream.getInputStreamId(0)];
                        if (inputStream !== undefined && inputStream.getDimensions() !== undefined) {
                            streamDim = inputStream.getDimensions();
                            stream.setDimensions(streamDim, inputStream.bFloat);
                            bStreamDimKnown = true;
                        }
                    }
                }
                if (!bStreamDimKnown) {
                    return;
                }
            }

            let shader = undefined;
            if (stream.shaderId == -1) {
                shader = shaders.streamShader;
            } else {
                shader = shaders.shaders[shaderId];
            }
            if (shader === undefined || !shader.isReady()) {
                return;
            }

            //  first, render shader streams to textures
            let shaderProgram = shader.getProgram();

            gl.useProgram(shaderProgram);

            let aVertexPosition = gl.getAttribLocation(shaderProgram, "aVertexPosition");
            gl.bindBuffer(gl.ARRAY_BUFFER, this.fullVertexPositionBuffer);
            gl.vertexAttribPointer(aVertexPosition, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(aVertexPosition);

            let aTextureCoord = gl.getAttribLocation(shaderProgram, 'aTextureCoord');
            gl.bindBuffer(gl.ARRAY_BUFFER, this.fullTextureCoordinateBuffer);
            gl.vertexAttribPointer(aTextureCoord, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(aTextureCoord);

            gl.bindFramebuffer(gl.FRAMEBUFFER, stream.frameBuffer);

            gl.bindTexture(gl.TEXTURE_2D, stream.outputTexture);
            if (shaderId == -1) {
                gl.bindTexture(gl.TEXTURE_2D, stream.getTexture(frameId));
            } else {
                for (let inputId = 0; inputId < shader.getNumInputs(); inputId++) {
                    let activeTexture = this.TextureUnits[inputId];
                    gl.activeTexture(activeTexture);
                    gl.bindTexture(gl.TEXTURE_2D, streams[stream.getInputStreamId(inputId)].getTexture(frameId));
                    gl.uniform1i(gl.getUniformLocation(shaderProgram, ('uTexture' + inputId)), inputId);
                }
            }
            gl.viewport(0, 0, streamDim.w, streamDim.h);

            stream.setUniforms(shader);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

            gl.bindFramebuffer(gl.FRAMEBUFFER, null);


            //  next, render windows
            gl.viewport(0, 0, this.canvas.width, this.canvas.height);

            //let shaderProgram = shaders[0].getProgram();
            shaderProgram = shaders.textureShader.getProgram();
            gl.useProgram(shaderProgram);

            aVertexPosition = gl.getAttribLocation(shaderProgram, "aVertexPosition");
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);
            gl.vertexAttribPointer(aVertexPosition, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(aVertexPosition);

            aTextureCoord = gl.getAttribLocation(shaderProgram, 'aTextureCoord');
            gl.bindBuffer(gl.ARRAY_BUFFER, this.textureCoordinateBuffer);
            gl.vertexAttribPointer(aTextureCoord, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(aTextureCoord);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, stream.outputTexture);

            let uSampler = gl.getUniformLocation(shaderProgram, 'uSampler');
            gl.uniform1i(uSampler, 0);

            gl.uniform2f(gl.getUniformLocation(shaderProgram, "uDimensions"), streamDim.w, streamDim.h);

            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);


            //  TODO: move elsewhere?
            let layout = _state.layout;
            let layoutDims = layout.getDimensions();
            let winDim = { w: this.canvas.width / layoutDims.w, h: this.canvas.height / layoutDims.h };

            let z = _state.zoom.level;
            let sw = streamDim.w;
            let sh = streamDim.h;
            let ww = winDim.w;
            let wh = winDim.h;

            let pixelSize = {
                w: z / (ww * layoutDims.w),
                h: z / (wh * layoutDims.h)
            }
            let isw = 1.0 / sw;
            let ish = 1.0 / sh;
            let offset = {
                x: (isw - (_state.zoom.streamOffset.x % isw)) * (sw * pixelSize.w),
                y: (ish - (_state.zoom.streamOffset.y % ish)) * (sh * pixelSize.h),
            }

            if (z > 10.0) {
                let alpha = Math.min(1.0, (z - 16.0) / 16.0);

                this.gridDrawer.update(windowId, offset, pixelSize, alpha);
                this.gridDrawer.render();
            }

        }


        updateTextureCoordinates(textureCoordinates) {
            let gl = this.glContext;
            gl.bindBuffer(gl.ARRAY_BUFFER, this.textureCoordinateBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, textureCoordinates, gl.STATIC_DRAW);
        }

    }


    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////


    function NvisRenderer() {
        let _glContext = undefined;

        let _canvas = undefined;
        let _helpPopup = undefined;
        let _uiPopup = undefined;
        let _infoPopup = undefined;
        let _fileInput = undefined;

        let _windows = undefined;
        let _shaders = [];

        let _uiHtml = "";

        let _animation = {
            active: false,
            fps: 24,
            pingPong: true,
            direction: 1,
            frameId: 0,
            numFrames: 1,  //  TODO: fix this!
            minFrameId: 0,
            maxFrameId: 0,

            toggleActive: function () {
                this.active = !this.active;
            },

            togglePingPong: function () {
                this.pingPong = !this.pingPong;
            },

            inc: function () {
                this.frameId = (this.frameId + 1) % this.numFrames;
                console.log("frameId: " + this.frameId);
            },

            dec: function () {
                this.frameId = (this.frameId + this.numFrames - 1) % this.numFrames;
                console.log("frameId: " + this.frameId);
            },

            update: function () {
                if (this.active) {
                    this.frameId += this.direction;
                    this.frameId = Math.max(this.frameId, 0);
                    this.frameId = Math.min(this.frameId, this.numFrames - 1);

                    if (this.pingPong) {
                        if (this.frameId == 0 || this.frameId == this.numFrames - 1) {
                            this.direction = -this.direction;
                        }
                    }
                    else {
                        this.frameId %= this.numFrames;
                    }
                }
            }
        };

        let _init = function () {
            document.body.style.width = "100%";
            document.body.style.height = "100%";
            document.body.style.margin = "0px";
            document.body.style.padding = "0px";

            _canvas = document.createElement("canvas");
            _canvas.style.margin = "0px";
            _canvas.style.padding = "0px";
            _canvas.style.display = "block";
            document.body.appendChild(_canvas);

            _helpPopup = document.createElement("div");
            _helpPopup.style.font = "20px Arial";
            _helpPopup.style.color = "black";
            _helpPopup.style.backgroundColor = "#f0f0f0";
            _helpPopup.style.margin = "0px";
            _helpPopup.style.padding = "20px";
            _helpPopup.style.border = "3px solid #808080";
            _helpPopup.style.borderRadius = "15px";
            _helpPopup.style.position = "absolute";
            _helpPopup.style.display = "none";
            _helpPopup.style.left = "20px";
            _helpPopup.style.top = "20px";
            // _helpPopup.style.width = "300px";
            // _helpPopup.style.height = "300px";

            _helpPopup.innerHTML = "<b>Nvis Online</b><br/>";
            _helpPopup.innerHTML += "<br/>";
            _helpPopup.innerHTML += "Drag-and-drop files to this window...<br/>";
            _helpPopup.innerHTML += "<br/>";
            _helpPopup.innerHTML += "h - display this text<br/>";
            _helpPopup.innerHTML += "d - delete window under cursor<br/>";
            _helpPopup.innerHTML += "w - add window<br/>";
            _helpPopup.innerHTML += "+ - increase number of window columns<br/>";
            _helpPopup.innerHTML += "- - decrease number of window columns<br/>";
            _helpPopup.innerHTML += "Up/Down - change stream for window under cursor<br/>";
            _helpPopup.innerHTML += "<br/>";
            _helpPopup.innerHTML += "<br/>";
            _helpPopup.innerHTML += "<br/>";

            _infoPopup = document.createElement("div");
            _infoPopup.id = "infoPopup";
            _infoPopup.style.width = "100%";
            _infoPopup.style.textAlign = "right";
            _infoPopup.style.font = "42px Arial";
            _infoPopup.style.color = "white";
            _infoPopup.style.opacity = 0.0;
            _infoPopup.style.position = "absolute";
            _infoPopup.style.left = "-50px";
            _infoPopup.style.top = "5px";
            _infoPopup.style.textShadow = "5px 5px 10px black";

            _uiPopup = document.createElement("div");
            _uiPopup.id = "uiPopup";
            _uiPopup.style.font = "20px Arial";
            _uiPopup.style.color = "black";
            _uiPopup.style.backgroundColor = "#f0f0f0";
            _uiPopup.style.margin = "0px";
            _uiPopup.style.padding = "20px";
            _uiPopup.style.border = "3px solid #808080";
            _uiPopup.style.borderRadius = "15px";
            _uiPopup.style.position = "absolute";
            _uiPopup.style.display = "none";
            _uiPopup.style.left = "20px";
            _uiPopup.style.top = "20px";

            _fileInput = document.createElement("input");
            _fileInput.id = "fileInput";
            _fileInput.setAttribute("type", "file");
            _fileInput.setAttribute("multiple", true);
            _fileInput.setAttribute("accept", ".png")
            _fileInput.style.display = "none";
            _fileInput.onchange = _onFileDrop;
            // _fileInput.style.position = "absolute";
            // _fileInput.style.left = "0px";
            // _fileInput.style.top = "0px";
            // _fileInput.style.width = "100%";
            // _fileInput.style.height = "100%";
            // _fileInput.style.backgroundColor = "#20802080";

            // _fileInput.ondrop = _onFileDrop;
            // _fileInput.ondragenter = _onFileDragEnter;
            // _fileInput.ondragover = _onFileDragOver;
            // _fileInput.ondragleave = _onFileDragLeave;
            // _fileInput.onclick = undefined;

            document.body.appendChild(_uiPopup);
            document.body.appendChild(_helpPopup);
            document.body.appendChild(_fileInput);
            document.body.appendChild(_infoPopup);

            _glContext = _canvas.getContext("webgl2");
            if (_glContext === null) {
                alert("Unable to initialize WebGL!");
                return;
            }

            //  extensions
            //  TODO: not needed in WebGL 2.0?
            // _glContext.getExtension('OES_texture_float');
            _glContext.getExtension("EXT_color_buffer_float")

            _windows = new NvisWindows(_glContext, _canvas);

            _shaders = new NvisShaders(_glContext);

            window.addEventListener("resize", _windows.boundAdjust);

            _canvas.addEventListener("click", _onClick);
            _canvas.addEventListener("mousedown", _onMouseDown);
            _canvas.addEventListener("mousemove", _onMouseMove);
            _canvas.addEventListener("mouseup", _onMouseUp);
            _canvas.addEventListener("mouseleave", _onMouseUp);
            _canvas.addEventListener("wheel", _onWheel);

            //  TODO: change to addEventListener
            document.body.onpaste = _onFileDrop;
            document.body.ondrop = _onFileDrop;
            document.body.ondragenter = _onFileDragEnter;
            document.body.ondragover = _onFileDragOver;
            document.body.ondragleave = _onFileDragLeave;

            document.body.onkeydown = _onKeyDown;
            document.body.onkeyup = _onKeyUp;
        };

        let _getContext = function () {
            return _glContext;
        }

        var _onWheel = function (event) {
            event.preventDefault();
            let level = _windows.zoom(-Math.sign(event.deltaY), _state.input.mouse.canvasCoords, _state.input.keyboard.shift);
            _popupInfo("zoom = " + level.toFixed(1) + "x");
        }

        let _updateUiPopup = function () {
            //  clear all children
            _uiPopup.textContent = '';

            _uiPopup.innerHTML = "<b>NVIS Online<br/><br/>";

            _uiPopup.innerHTML += "Streams<br/>";
            for (let streamId = 0; streamId < _streams.length; streamId++) {
                let ui = _streams[streamId].getUI(streamId, _streams, _shaders);
                _uiPopup.appendChild(ui);
            }
            for (let shaderId = 0; shaderId < _shaders.length; shaderId++) {
                let ui = document.createElement("p");
                ui.innerHTML = "Shader: " + _shaders[shaderId].name;
                _uiPopup.appendChild(ui);
            }
            _uiPopup.innerHTML += "<br/>";
            _uiPopup.innerHTML += "<br/>";

            _uiPopup.innerHTML += "Windows<br/>";
            for (let windowId = 0; windowId < _windows.getNumWindows(); windowId++) {
                //let w = _windows.getWindow(i);
                let label = "- window " + (windowId + 1) + ": ";
                // _uiPopup.innerHTML += selector;
                _uiPopup.innerHTML += "<label for=\"windowStream\">" + label + "</label>";
                let options = "";
                let windowStreamId = _windows.getWindow(windowId).getStreamId();
                for (let streamId = 0; streamId < _streams.length; streamId++) {
                    let fileName = _streams[streamId].getFileName();
                    options += "<option";
                    if (streamId == windowStreamId) {
                        options += " selected";
                    }
                    options += (">" + fileName + "</option>");
                }
                let select = ("<select id=\"windowStream-" + windowId + "\"");
                select += (" onchange=\"nvis.setWindowStreamId(" + windowId + ")\"");
                select += (" id=\"windowStream\">" + options + "</select>");
                _uiPopup.innerHTML += select;
                _uiPopup.innerHTML += "<br/>";
            }
            _uiPopup.innerHTML += "<hr>";
            _uiPopup.innerHTML += "<br/>";
            _uiPopup.innerHTML += "<input id=\"bAutomaticLayout\" " + (_state.layout.bAutomatic ? "checked " : "") + "type=\"checkbox\" onclick=\"nvis.toggleAutomaticLayout()\"> Automatic window layout";
            _uiPopup.innerHTML += "<br/>";

            //  center popup
            let w = window.getComputedStyle(_uiPopup).getPropertyValue("width");
            let h = window.getComputedStyle(_uiPopup).getPropertyValue("height");
            let x = Math.trunc((_canvas.width - w.substring(0, w.indexOf('px'))) / 2);
            let y = Math.trunc((_canvas.height - h.substring(0, h.indexOf('px'))) / 2);
            _uiPopup.style.left = (x + "px");
            _uiPopup.style.top = (y + "px");

        }

        let _onKeyDown = function (event) {
            event = event || window.event;
            let keyCode = event.keyCode || event.which;
            let key = event.key;

            // if (keyCode != 116)  //  F5
            //     event.preventDefault();

            //  TODO: only rely on 'key', should work

            switch (keyCode) {
                case 9:  //  Tab
                    event.preventDefault();
                    if (_uiPopup.style.display == "none") {
                        _uiPopup.style.display = "block";
                        _updateUiPopup();
                    }
                    else {
                        _uiPopup.style.display = "none";
                    }
                    //				_uiPopup.style.display = (_uiPopup.style.display == "none" ? "block" : "none");
                    // 	for (let i = 0; i < _windows.length; i++)
                    // 	{
                    // 		_windows[i].showInfo();
                    // 	}
                    break;
                case 16:  //  Shift
                    _state.input.keyboard.shift = true;
                    break;
                case 37:  //  ArrowLeft
                    _animation.dec();
                    break;
                case 38:  //  ArrowUp
                    _windows.incStream(_state.input.mouse.canvasCoords, _streams);
                    break;
                case 39:  //  ArrowRight
                    _animation.inc();
                    break;
                case 40:  //  ArrowDown
                    _windows.decStream(_state.input.mouse.canvasCoords, _streams);
                    break;
                default:
                    switch (key) {
                        case '1': case '2': case '3': case '4': case '5': case '6': case '7': case '8': case '9':
                            let streamId = parseInt(key) - 1;
                            if (streamId < _streams.length) {
                                _windows.setWindowStreamId(_windows.getWindowId(_state.input.mouse.canvasCoords), streamId);
                            }
                            break;
                        case ' ':
                            _animation.toggleActive();
                            break;
                        case 'a':
                            _state.layout.bAutomatic = !_state.layout.bAutomatic;
                            _popupInfo("Automatic window placement: " + (_state.layout.bAutomatic ? "on" : "off"));
                            _windows.adjust();
                            break;
                        case 'p':
                            _animation.togglePingPong();
                            break;
                        case 'd':
                            _windows.delete(_state.input.mouse.canvasCoords);
                            break;
                        case 'o':
                            document.getElementById("fileInput").click();
                            break;
                        case 'D':
                            if (_streams.length > 1) {
                                _renderer.loadShader("glsl/difference.json");
                            }
                            break;
                        case 'w':
                            _windows.add();
                            break;
                        case 'h':
                            _helpPopup.style.display = "block";
                            break;
                        case '+':
                            _state.layout.bAutomatic = false;
                            _windows.inc();
                            break;
                        case '-':
                            _state.layout.bAutomatic = false;
                            _windows.dec();
                            break;
                        default:
                            console.log("KEYDOWN   key: '" + key + "', keyCode: " + keyCode);
                            break;
                    }
                    break;
            }
        }

        let _onKeyUp = function (event) {
            event = event || window.event;
            let keyCode = event.keyCode || event.which;
            let key = event.key;

            switch (keyCode) {
                case 16:  //  Shift
                    _state.input.keyboard.shift = false;
                    break;
                // case 37:  //  ArrowLeft
                //     break;
                // case 38:  //  ArrowUp
                //     break;
                // case 39:  //  ArrowRight
                //     break;
                // case 40:  //  ArrowDown
                //     break;
                default:
                    switch (key) {
                        case 'h':
                            _helpPopup.style.display = "none";
                            break;
                        default:
                            // console.log("KEYUP   key: '" + key + "', keyCode: " + keyCode);
                            break;
                    }
                    break;
            }
        }

        let _fadeInfoPopup = function () {
            let opacity = parseFloat(document.getElementById("infoPopup").style.opacity);
            if (opacity > 0.0) {
                document.getElementById("infoPopup").style.opacity = opacity - 0.02;
                setTimeout(_fadeInfoPopup, 25);
            }
            if (opacity == 0.0) {
                document.getElementById("infoPopup").style.display = "none";
            }
        }

        let _popupInfo = function (text) {
            _infoPopup.innerHTML = text;
            let currentOpacity = document.getElementById("infoPopup").style.opacity;
            document.getElementById("infoPopup").style.opacity = 1.0;
            document.getElementById("infoPopup").style.display = "block";
            if (currentOpacity == 0.0) {
                _fadeInfoPopup();
            }
        }

        let _onClick = function (event) {

            let cc = _state.input.mouse.canvasCoords;
            let windowId = _windows.getWindowId(cc);

            if (windowId === undefined) {
                return;
            }

            let streamId = _windows.windows[windowId].getStreamId();
            let pCoord = _windows.getStreamCoordinates(cc, true);

            if (pCoord === undefined) {
                return;
            }

            let loc = { x: Math.floor(pCoord.x), y: Math.floor(pCoord.y) };
            let color = _streams[streamId].getPixelValue(loc);

            console.log("_canvas.onclick(" + JSON.stringify(loc) + "): " + JSON.stringify(color));
        }

        let _onMouseDown = function (event) {
            _state.input.mouse.down = true;
            _state.input.mouse.clickPosition = { x: event.clientX, y: event.clientY };
        }

        let _onMouseMove = function (event) {
            _state.input.mouse.previousCanvasCoords = _state.input.mouse.canvasCoords;
            _state.input.mouse.canvasCoords = {
                x: event.clientX - _state.layout.border,
                y: event.clientY - _state.layout.border
            };

            if (_state.input.mouse.down) {
                let canvasOffset = {
                    x: _state.input.mouse.previousCanvasCoords.x - _state.input.mouse.canvasCoords.x,
                    y: _state.input.mouse.previousCanvasCoords.y - _state.input.mouse.canvasCoords.y
                }
                _windows.translate(canvasOffset);
            }
        }

        let _onMouseUp = function (event) {
            _state.input.mouse.down = false;
        }

        // let _streamUpdateParameter = function (streamId, elementId) {
        //     //alert("update: " + streamId + ", " + elementId);
        //     _streams[streamId].getShader().updateParameter(elementId);
        // }

        // let _streamUpdateInput = function (streamId, inputId) {
        //     //alert("update: " + streamId + ", " + inputId);
        //     let elementId = ("input-" + streamId + "-" + inputId);
        //     let inputStreamId = document.getElementById(elementId).selectedIndex;
        //     _streams[streamId].setInputStream(inputId, inputStreamId);
        // }

        let _setWindowStreamId = function (windowId) {
            let elementId = ("windowStream-" + windowId);
            let newStreamId = document.getElementById(elementId).selectedIndex;
            _windows.getWindow(windowId).setStreamId(newStreamId);
        }

        let _onFileDrop = function (event) {
            event.stopPropagation();
            event.preventDefault();

            // if (event.clipboardData !== undefined)
            // {
            //     let items = (event.clipboardData || event.originalEvent.clipboardData).items;
            //     let blob = items[0].getAsFile();
            //     console.log("asdf");
            //     return;
            // }

            //  first try file input
            let files = Array.from(document.getElementById("fileInput").files);
            if (files.length == 0) {
                //  next, paste event
                if (event.clipboardData !== undefined) {
                    let items = (event.clipboardData || event.originalEvent.clipboardData).items;
                    for (let i = 0; i < items.length; i++) {
                        if (items[i].kind == "file") {
                            files.push(items[i].getAsFile());
                        }
                    }
                }
                else {
                    //  finally, a drop
                    files = Array.from(event.dataTransfer.files);
                }
            }

            if (files.length == 0) {
                return;
            }

            if (files[0].type.match(/image.*/) || files[0].name.match(/.exr$/)) {
                files.sort(function (a, b) {
                    return a.name.localeCompare(b.name);
                });
                let newStream = new NvisStream(_glContext);
                newStream.drop(files, _newStreamCallback);
                _streams.push(newStream);
                _animation.numFrames = newStream.getNumImages();  //  TODO: check
                _addWindow(_streams.length - 1);
                _windows.adjust();
            }

            document.getElementById("fileInput").value = "";  //  force onchange event if same files

            _canvas.style.border = _state.layout.border + "px solid black";

            return;
            for (let i = 0; i < files.length; i++) {
                let file = files[i];

                if (file.type.match(/image.*/)) {
                    let reader = new FileReader();

                    reader.onload = function (event) {
                        let stream = _addStream(event.target.result);
                        stream.setFileName(file.name);
                        _windows.add(stream);
                    }

                    reader.readAsDataURL(file);
                }
                else if (file.type.match(/application\/json/)) {
                    let reader = new FileReader();

                    reader.onload = function (event) {

                        //console.log("JSON source: " + event.target.result);
                        let jsonObject = JSON.parse(event.target.result);

                        //  convert top-level keys to lowercase
                        let config = {};
                        for (let key of Object.keys(jsonObject)) {
                            config[key.toLowerCase()] = jsonObject[key];
                        }
                        console.log("JSON filename: " + config.filename);

                        let shader = _addShader(config);
                    }

                    reader.readAsText(file);
                }
                else if (file.name.match(/.exr$/)) {
                    console.log("EXR file...");
                }
            }

        }

        let _onFileDragEnter = function (event) {
            _canvas.style.border = _state.layout.border + "px solid green";
            event.preventDefault();
        }

        let _onFileDragOver = function (event) {
            event.preventDefault();
        }

        let _onFileDragLeave = function (event) {
            _canvas.style.border = _state.layout.border + "px solid black";
            event.preventDefault();
        }

        let _renderFrameBuffers = function () {
            //  TODO: enable hierarchical rendering


        }

        let _render = function () {
            let gl = _glContext;
            gl.clearColor(0.2, 0.2, 0.2, 1.0);
            gl.clear(_glContext.COLOR_BUFFER_BIT);

            //_renderFrameBuffers();
            _windows.render(_animation.frameId, _streams, _shaders);

            _animation.update();
        }

        let _shaderLoaded = function () {
            //_shaders[shaderId] = shader;
            _windows.adjust();  //  TODO: is this needed?
        }

        let _loadShader = function (jsonFileName) {
            _shaders.load(jsonFileName, function () { _shaderLoaded(); });
            return;
            let xhr = new XMLHttpRequest();
            xhr.open("GET", jsonFileName);
            xhr.setRequestHeader("Cache-Control", "no-cache, no-store, max-age=0");
            xhr.onload = function () {
                if (this.status == 200 && this.responseText !== null) {
                    //  set position of shader, filled in later
                    let shaderId = _shaders.length;
                    _shaders.push(undefined);
                    let newShader = new NvisShader(_glContext, { json: this.responseText, callback: function () { _shaderLoaded(shaderId, newShader); } });
                }
            };
            xhr.send();
        }

        let _newStreamCallback = function (streamPxDimensions) {
            // console.log("_newStreamCallback(" + streamPxDimensions.w + ", " + streamPxDimensions.h + ")");
            _windows.setStreamPxDimensions(streamPxDimensions);
            _windows.adjust();
        }

        let _loadStream = function (fileNames) {
            //let newStream = new NvisStream(_glContext, fileNames, _newStreamCallback);
            let newStream = new NvisStream(_glContext);

            newStream.load(fileNames, _newStreamCallback);

            //  TODO: fix this
            _animation.numFrames = newStream.getNumImages();

            _streams.push(newStream);
            _windows.adjust();

            return newStream;
        }

        let _addShaderStream = function (shaderId) {
            let newStream = new NvisStream(_glContext, shaderId);

            _streams.push(newStream);
            _windows.adjust();

            return newStream;
        }

        let _addWindow = function (streamId) {
            _windows.add(streamId);
        }

        let _getNumStreams = function () {
            return _streams.length;
        }

        let _start = function () {
            _animate();
        }

        let _animate = function () {
            // TODO: fix this...
            let fps = 60;

            setTimeout(() => {
                requestAnimationFrame(_animate);
            }, 1000 / fps);
            //requestAnimationFrame(animate);
            _render();
        }

        _init();

        return {
            getContext: _getContext,
            addShaderStream: _addShaderStream,
            addWindow: _addWindow,
            loadStream: _loadStream,
            loadShader: _loadShader,
            render: _render,
            // streamUpdateParameter: _streamUpdateParameter,
            // streamUpdateInput: _streamUpdateInput,
            setWindowStreamId: _setWindowStreamId,
            getNumStreams: _getNumStreams,
            start: _start,
        }
    }

    //  API
    let _stream = function (fileNames) {
        return _renderer.loadStream(Array.isArray(fileNames) ? fileNames : [fileNames]);
    }

    let _shader = function (fileName) {
        _renderer.loadShader(fileName);
    }

    let _config = function (fileName) {
        let xhr = new XMLHttpRequest();
        xhr.open("GET", fileName);
        xhr.setRequestHeader("Cache-Control", "no-cache, no-store, max-age=0");
        xhr.onload = function () {
            if (this.status == 200 && this.responseText !== null) {
                let jsonObject = JSON.parse(this.responseText);
                console.log("=====  Config JSON loaded (" + fileName + ")");
                //  convert top-level keys to lowercase
                let config = {};
                for (let key of Object.keys(jsonObject)) {
                    config[key.toLowerCase()] = jsonObject[key];
                }

                //  Zoom
                let zoom = config.zoom;
                if (zoom !== undefined) {
                    _state.zoom.level = zoom;
                }

                //  streams
                let streams = config.streams;
                if (config.streams !== undefined) {
                    for (let objectId = 0; objectId < streams.length; objectId++) {
                        let newStream = undefined;
                        let files = streams[objectId].files;
                        let shaderId = streams[objectId].shader;
                        if (files !== undefined) {
                            newStream = _stream(files);
                        } else if (shaderId !== undefined) {
                            newStream = _renderer.addShaderStream(shaderId);
                            let inputStreamIds = streams[objectId].inputs;
                            if (inputStreamIds !== undefined) {
                                newStream.setInputStreamIds(inputStreamIds);
                            }
                        }
                        if (newStream !== undefined && streams[objectId].window) {
                            _renderer.addWindow(_streams.length - 1);
                        }
                    }
                }

                //  shaders
                let shaders = config.shaders;
                if (shaders !== undefined) {
                    for (let shaderId = 0; shaderId < shaders.length; shaderId++) {
                        _shader(shaders[shaderId]);
                    }
                }

            }
        };
        xhr.send();
    }

    let _streamUpdateParameter = function (streamId, elementId) {
        console.log("update: " + streamId + ", " + elementId);
        _streams[streamId].uiUpdate(elementId);
    }

    let _streamUpdateInput = function (streamId, inputId) {
        console.log("update: " + streamId + ", " + inputId);
        let elementId = ("input-" + streamId + "-" + inputId);
        let inputStreamId = document.getElementById(elementId).selectedIndex;
        _streams[streamId].setInputStreamId(inputId, inputStreamId);
    }

    let _setWindowStreamId = function (windowId) {
        _renderer.setWindowStreamId(windowId);
        // let elementId = ("windowStream-" + windowId);
        // let newStreamId = document.getElementById(elementId).selectedIndex;
        // _windows.getWindow(windowId).setStream(_streams[newStreamId]);
    }

    let _toggleAutomaticLayout = function () {
        console.log(document.getElementById("bAutomaticLayout").checked);
        //_windows.adjust();
        //    _windows.toggleAutomaticLayout();
    }


    return {
        init: _init,
        stream: _stream,
        shader: _shader,
        config: _config,
        //  below need to be visible to handle UI events
        streamUpdateParameter: _streamUpdateParameter,
        streamUpdateInput: _streamUpdateInput,
        setWindowStreamId: _setWindowStreamId,
        toggleAutomaticLayout: _toggleAutomaticLayout
    }
}
