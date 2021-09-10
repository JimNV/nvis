'use strict';

var nvis = new function () {
    let _renderer = undefined;
    let _streams = [];

    let ui = {
        windows: {

        }
    }

    let _init = function () {
        _renderer = new NvisRenderer();
        _renderer.start();
    }


    let _toggleAutomaticLayout = function () {
        console.log(document.getElementById("bAutomaticLayout").checked);
        //    _windows.toggleAutomaticLayout();
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

        let _init = function () {
            //     let br = document.createElement("br");

            //     for (let key of Object.keys(_object))
            //     {
            //         let type = _object[key].type;

            //         let label = document.createElement("label");
            //         label.setAttribute("for", key);
            //         label.innerHTML = _object[key].name;

            //         let el = document.createElement("input");

            //         el.setAttribute("id", key);

            //         if (type == "bool")
            //         {
            //             el.setAttribute("type", "checkbox");
            //             el.checked = _object[key].value;
            //             el.setAttribute("onclick", "renderer.shaderUI(" + key + ")");
            //             el.innerHTML = object[key].name;

            //         }
            //         else if (type == "float")
            //         {

            //         }
            //         _dom.appendChild(el);
            //         _dom.appendChild(label);
            //         _dom.appendChild(br);
            // }
        }

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

        _init();

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


    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////


    function NvisShader(glContext, json) {
        let _glContext = glContext;
        let _name = (json === undefined ? "Stream" : json.name);
        let _fileName = (json === undefined ? undefined : json.filename);
        let _numInputs = (json === undefined ? undefined : json.inputs);
        let _ui = undefined;
        let _source = undefined;

        let _vertexShader = _glContext.createShader(_glContext.VERTEX_SHADER);
        let _fragmentShader = _glContext.createShader(_glContext.FRAGMENT_SHADER);
        let _shaderProgram = _glContext.createProgram();

        let _bVertexReady = false;
        let _bFragmentReady = false;

        let _fragmentSource = "";
        let _vertexSource = `attribute vec2 aVertexPosition;
attribute vec2 aTextureCoord;
varying highp vec2 vTextureCoord;
void main()
{
    gl_Position = vec4(aVertexPosition, 0.0, 1.0);
    vTextureCoord = aTextureCoord;
}`;
        let _defaultFragmentSource = `varying highp vec2 vTextureCoord;
uniform sampler2D uSampler;
void main()
{
    if (vTextureCoord.x < 0.0 || vTextureCoord.x > 1.0 || vTextureCoord.y < 0.0 || vTextureCoord.y > 1.0)
        gl_FragColor = vec4(0.5, 0.1, 0.1, 1.0);
    else
        gl_FragColor = texture2D(uSampler, vTextureCoord);
}`;

        let _init = function () {
            _bVertexReady = _compile(_vertexShader, _vertexSource);
            if (_fileName === undefined) {
                _bFragmentReady = _compile(_fragmentShader, _defaultFragmentSource);
                _attach();
            }
            else {
                _load(_fileName);
                _ui = new NvisShaderUI(json.ui);
            }
        }

        let _compile = function (shader, source) {
            _source = source;
            _glContext.shaderSource(shader, _source);
            _glContext.compileShader(shader);

            if (!_glContext.getShaderParameter(shader, _glContext.COMPILE_STATUS)) {
                alert("WebGL: " + _glContext.getShaderInfoLog(shader));
                return false;
            }

            return true;
        }

        let _attach = function () {
            //if (_isReady()) {
                console.log("Attaching shader: " + _fileName);
                _glContext.attachShader(_shaderProgram, _vertexShader);
                _glContext.attachShader(_shaderProgram, _fragmentShader);
                _glContext.linkProgram(_shaderProgram);

                if (!_glContext.getProgramParameter(_shaderProgram, _glContext.LINK_STATUS)) {
                    alert("Could not initialize shader!");
                }
            //}
        }

        let _load = function (fileName) {
            _bFragmentReady = false;

            let xhr = new XMLHttpRequest();
            xhr.open("GET", fileName);
            xhr.setRequestHeader("Cache-Control", "no-cache, no-store, max-age=0");
            xhr.onload = function (event)
            {
                if (this.status == 200 && this.responseText !== null) {
                    console.log("=====  Shader loaded (" + fileName + ")");
                    _fragmentSource = this.responseText;
                    _bFragmentReady = _compile(_fragmentShader, _fragmentSource);
                    _attach();
                }
            }
            xhr.send();
        }

        let _getProgram = function () {
            return _shaderProgram;
        }

        let _isReady = function () {
            return _bVertexReady && _bFragmentReady;
        }

        let _setUniforms = function () {
            if (_ui !== undefined) {
                _ui.setUniforms(_glContext, _shaderProgram);
            }
        }

        let _getUI = function (streamId) {
            return (_ui !== undefined ? _ui.getDOM(streamId) : undefined);
        }

        let _getName = function () {
            return _name;
        }

        let _updateParameter = function (elementId) {
            _ui.update(elementId);
        }

        let _getNumInputs = function () {
            return _numInputs;
        }

        _init();

        return {
            load: _load,
            getProgram: _getProgram,
            isReady: _isReady,
            setUniforms: _setUniforms,
            getUI: _getUI,
            getName: _getName,
            updateParameter: _updateParameter,
            getNumInputs: _getNumInputs,
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

    function NvisStream(glContext) {
        let _glContext = glContext;
        let _fileName = undefined;

        let _dimensions = undefined;

        let _bFileStream = false;
        let _fileNames = [];

        let _textures = [];

        let _shader = undefined;
        let _inputStreams = [];

        //  used for non file streams
        let _outputTexture = undefined;
        let _frameBuffer = undefined;

        let _numTextures = 1;
        let _currentTexture = 0;

        const TextureFormat = {
            level: 0,
            internalFormat: _glContext.RGBA,
            width: 1,
            height: 1,
            border: 0,
            srcFormat: _glContext.RGBA,
            srcType: _glContext.UNSIGNED_BYTE,
            pixel: new Uint8Array([0, 0, 255, 255]),
        }

        let _init = function () {
            //_bFileStream = (_fileNames !== undefined);

            return;

            if (_bFileStream) {
                _fileName = _fileNames[0];
                let numFilesLoaded = 0;
                for (let fileId = 0; fileId < _fileNames.length; fileId++) {
                    _addTexture(_fileNames[fileId]);

                    let texture = _glContext.createTexture();
                    _textures.push(texture);

                    const image = new Image();
                    image.src = _fileNames[fileId];
                    console.log("Loading " + image.src);
                    image.onload = function () {

                        _glContext.bindTexture(_glContext.TEXTURE_2D, texture);
                        _glContext.texImage2D(_glContext.TEXTURE_2D, TextureFormat.level, TextureFormat.internalFormat, TextureFormat.srcFormat, TextureFormat.srcType, image);

                        _glContext.texParameteri(_glContext.TEXTURE_2D, _glContext.TEXTURE_WRAP_S, _glContext.CLAMP_TO_EDGE);
                        _glContext.texParameteri(_glContext.TEXTURE_2D, _glContext.TEXTURE_WRAP_T, _glContext.CLAMP_TO_EDGE);
                        _glContext.texParameteri(_glContext.TEXTURE_2D, _glContext.TEXTURE_MIN_FILTER, _glContext.NEAREST);
                        _glContext.texParameteri(_glContext.TEXTURE_2D, _glContext.TEXTURE_MAG_FILTER, _glContext.NEAREST);

                        numFilesLoaded++;

                        if (numFilesLoaded == _fileNames.length) {
                            _dimensions = { w: image.width, h: image.height };
                            callback(_dimensions);
                        }
                    }
                }
            }
            else {
                _textures.push(_glContext.createTexture());
            }
        }

        let _setupTexture = function (texture, image) {
            _glContext.bindTexture(_glContext.TEXTURE_2D, texture);
            _glContext.texImage2D(_glContext.TEXTURE_2D, TextureFormat.level, TextureFormat.internalFormat, TextureFormat.srcFormat, TextureFormat.srcType, image);

            _glContext.texParameteri(_glContext.TEXTURE_2D, _glContext.TEXTURE_WRAP_S, _glContext.CLAMP_TO_EDGE);
            _glContext.texParameteri(_glContext.TEXTURE_2D, _glContext.TEXTURE_WRAP_T, _glContext.CLAMP_TO_EDGE);
            _glContext.texParameteri(_glContext.TEXTURE_2D, _glContext.TEXTURE_MIN_FILTER, _glContext.NEAREST);
            _glContext.texParameteri(_glContext.TEXTURE_2D, _glContext.TEXTURE_MAG_FILTER, _glContext.NEAREST);

            _glContext.bindTexture(_glContext.TEXTURE_2D, null);  //  TODO: Chrome requirement?

            //  TODO: bind framebuffer to non-filestreams
            // _frameBuffer = _glContext.createFramebuffer();
            // _glContext.bindFramebuffer(_glContext.FRAMEBUFFER, _frameBuffer);
            // _glContext.framebufferTexture2D(_glContext.FRAMEBUFFER, _glContext.COLOR_ATTACHMENT0, _glContext.TEXTURE_2D, texture, 0);
        }

        let _setupOutputTexture = function (dimensions) {
            _outputTexture = _glContext.createTexture();
            _glContext.bindTexture(_glContext.TEXTURE_2D, _outputTexture);
            _glContext.texImage2D(_glContext.TEXTURE_2D, TextureFormat.level, TextureFormat.internalFormat, dimensions.w, dimensions.h, 0, TextureFormat.srcFormat, TextureFormat.srcType, null);

            _glContext.texParameteri(_glContext.TEXTURE_2D, _glContext.TEXTURE_WRAP_S, _glContext.CLAMP_TO_EDGE);
            _glContext.texParameteri(_glContext.TEXTURE_2D, _glContext.TEXTURE_WRAP_T, _glContext.CLAMP_TO_EDGE);
            _glContext.texParameteri(_glContext.TEXTURE_2D, _glContext.TEXTURE_MIN_FILTER, _glContext.NEAREST);
            _glContext.texParameteri(_glContext.TEXTURE_2D, _glContext.TEXTURE_MAG_FILTER, _glContext.NEAREST);

            _frameBuffer = _glContext.createFramebuffer();
            _glContext.bindFramebuffer(_glContext.FRAMEBUFFER, _frameBuffer);

            let attachmentPoint = _glContext.COLOR_ATTACHMENT0;
            _glContext.framebufferTexture2D(_glContext.FRAMEBUFFER, attachmentPoint, _glContext.TEXTURE_2D, _outputTexture, TextureFormat.level);

            _glContext.bindFramebuffer(_glContext.FRAMEBUFFER, null);
        }

        let _load = function (fileNames, callback) {
            _bFileStream = true;

            let numFilesLoaded = 0;
            for (let fileId = 0; fileId < fileNames.length; fileId++) {
                let texture = _glContext.createTexture();
                _textures.push(texture);
                _fileNames.push(fileNames[fileId]);

                const image = new Image();
                image.src = fileNames[fileId];

                image.onload = function () {
                    numFilesLoaded++;
                    _setupTexture(texture, image);

                    if (numFilesLoaded == fileNames.length) {
                        _dimensions = { w: image.width, h: image.height };
                        callback(_dimensions);
                    }
                }
            }
        }

        let _drop = function (files, callback) {
            _bFileStream = true;

            let numFilesLoaded = 0;
            for (let fileId = 0; fileId < files.length; fileId++) {
                if (!files[fileId].type.match(/image.*/)) {
                    continue;
                }

                _fileNames.push(files[fileId].name);

                let texture = _glContext.createTexture();
                _textures.push(texture);

                let file = files[fileId];

                if (file.type.match(/image.*/)) {
                    let reader = new FileReader();

                    reader.onload = function (event) {

                        const image = new Image();
                        image.src = event.target.result;

                        image.onload = function () {

                            _setupTexture(texture, image);
                            numFilesLoaded++;

                            if (numFilesLoaded == files.length) {
                                _dimensions = { w: image.width, h: image.height };
                                callback(_dimensions);
                            }
                        }

                    }

                    reader.readAsDataURL(file);
                }
            }
        }

        let _getShader = function () {
            if (_shader !== undefined && _shader.isReady()) {
                return _shader;
            }
            return undefined;
        }

        let _setShader = function (shader) {
            _shader = shader;
        }

        let _getDimensions = function () {
            return _dimensions;
        }

        let _addInputStream = function (stream) {
            if (_dimensions === undefined) {
                _dimensions = stream.getDimensions();
            }
            _inputStreams.push(stream);
        }

        let _getInputStream = function (inputStreamId) {
            return _inputStreams[inputStreamId];
        }

        let _setInputStream = function (inputStreamId, stream) {
            _inputStreams[inputStreamId] = stream;
        }

        let _isFileStream = function () {
            return _bFileStream;
        }

        let _getTexture = function (index) {
            index = index % _textures.length;  // TODO: solve elsewhere
            return _textures[index];
        }

        let _getFileName = function () {
            return (_bFileStream ? _fileNames[0] : _shader.getName());
        }

        let _setFileName = function (fileName) {
            _fileName = fileName;
        }

        let _getNumImages = function () {
            return _textures.length;
        }

        let _getUI = function (streamId, streams) {
            //  streamId is needed since the stream itself does not know its id
            let ui = document.createDocumentFragment();

            let span = document.createElement("span");
            span.innerHTML = ("- stream " + (streamId + 1) + ": " + _getFileName());
            ui.appendChild(span);
            ui.appendChild(document.createElement("br"));

            if (!_bFileStream) {
                for (let inputId = 0; inputId < _shader.getNumInputs(); inputId++) {
                    let eId = ("input-" + streamId + "-" + inputId);
                    let label = document.createElement("label");
                    label.setAttribute("for", eId);
                    label.innerHTML = ("Input " + (inputId + 1) + ":");

                    let sEl = document.createElement("select");
                    sEl.id = eId;
                    sEl.setAttribute("onchange", "nvis.streamUpdateInput(" + streamId + ", " + inputId + ")");
                    for (let i = 0; i < streams.length; i++) {
                        if (i != streamId) {
                            let sOp = document.createElement("option");
                            sOp.innerHTML = streams[i].getFileName();
                            if (inputId == i) {
                                sOp.setAttribute("selected", true);
                            }
                            sEl.appendChild(sOp);
                        }
                    }
                    ui.appendChild(label);
                    ui.appendChild(sEl);
                    ui.appendChild(document.createElement("br"));
                }
                if (_shader !== undefined && _shader.isReady()) {
                    ui.appendChild(_shader.getUI(streamId));
                }
            }

            return ui;
            //return _shader.getUI(streamId);
        }

        _init();

        return {
            load: _load,
            drop: _drop,
            getDimensions: _getDimensions,
            getTexture: _getTexture,
            setupOutputTexture: _setupOutputTexture,
            isFileStream: _isFileStream,
            getShader: _getShader,
            setShader: _setShader,
            addInputStream: _addInputStream,
            getInputStream: _getInputStream,
            setInputStream: _setInputStream,
            getFileName: _getFileName,
            setFileName: _setFileName,
            getNumImages: _getNumImages,
            getUI: _getUI,
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

    function NvisWindows(glContext, canvas) {
        let _glContext = glContext;
        let _canvas = canvas;

        let _pxDimensions = undefined;
        let _windows = [];

        let _textureCoordinates = new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0]);

        let _layout = {
            bAutomatic: false,
            w: 1, h: 1,
            border: 50,
        }

        let _zoomSettings = {
            lowFactor: Math.pow(Math.E, Math.log(2) / 8.0),
            highFactor: Math.pow(Math.E, Math.log(2) / 4.0),
            level: 1.0,
            aspectRatio: 1.0,
            position: { x: 0.0, y: 0.0 },  //  mouse position at zoom (pixels)
            offset: { x: 0.0, y: 0.0 },
        }

        let _insideWindow = function (position) {
            return !(position.x < _layout.border || position.x > _canvas.width + _layout.border || position.y < _layout.border || position.y > _canvas.height + _layout.border);
        }

        let _getWindowId = function (position) {
            if (!_insideWindow(position)) {
                return undefined;
            }

            let xx = (position.x - _layout.border) / _canvas.width;
            let yy = (position.y - _layout.border) / _canvas.height;

            let w = _layout.w;
            let h = _layout.h;

            let windowId = Math.trunc(yy * h) * w + Math.trunc(xx * w);

            if (windowId >= _windows.length) {
                return undefined;
            }

            return windowId;
        }

        let _getWindow = function (windowId) {
            return _windows[windowId];
        }

        let _getNumWindows = function () {
            return _windows.length;
        }

        let _getOffset = function (position) {
            if (!_insideWindow(position)) {
                return undefined;
            }

            let w = _layout.w;
            let h = _layout.h;

            let xx = (position.x - _layout.border) % (_canvas.width / w);
            let yy = (position.y - _layout.border) % (_canvas.height / h);

            return { x: xx / _pxDimensions.w, y: yy / _pxDimensions.h };
        }

        let _add = function (stream) {
            if (stream === undefined) {
                return undefined;
            }

            let win = new NvisWindow(_glContext, _canvas);
            win.updateTextureCoordinates(_textureCoordinates);
            win.setStream(stream);

            _windows.push(win);
            _adjust();

            return win;
        }

        let _delete = function (position) {
            let windowId = _getWindowId(position);
            if (_windows.length > 1 && windowId !== undefined) {
                _windows.splice(windowId, 1);
                _adjust();
            }
        }

        let _resize = function () {
            for (let windowId = 0; windowId < _windows.length; windowId++) {
                let position = { x: (windowId % w) * size.w, y: Math.trunc(windowId / w) * size.h };
                _windows[windowId].resize(position, size);
            }
        }

        let _inc = function () {
            if (!_layout.bAutomatic) {
                _layout.w = Math.min(_layout.w + 1, _windows.length);
            }
            _adjust();
        }

        let _dec = function () {
            if (!_layout.bAutomatic) {
                _layout.w = Math.max(_layout.w - 1, 1);
            }
            _adjust();
        }

        let _setStream = function (windowId, stream) {
            if (stream !== undefined) {
                _windows[windowId].setStream(stream);
            }
        }

        let _updateTextureCoordinates = function () {
            console.log("-----------------  _updateTextureCoordinates()  -----------------");
            console.log("     zoom level: " + _zoomSettings.level);
            console.log("     aspect ratio: " + _zoomSettings.aspectRatio);
            console.log("     offset: " + _zoomSettings.offset.x + ", " + _zoomSettings.offset.y);
            console.log("     position: " + _zoomSettings.position.x + ", " + _zoomSettings.position.y);

            //  top-left
            _textureCoordinates[0] = 0.0;
            _textureCoordinates[1] = 0.0;

            //  top-right
            _textureCoordinates[2] = 1.0;
            _textureCoordinates[3] = 0.0;

            //  bottom-left
            _textureCoordinates[4] = 0.0;
            _textureCoordinates[5] = 1.0;

            //  bottom-right
            _textureCoordinates[6] = 1.0;
            _textureCoordinates[7] = 1.0;

            //  zoom
            let xx = 1.0 / _zoomSettings.level;
            let yy = 1.0 / _zoomSettings.level;

            // _textureCoordinates[0] = 0.0;
            // _textureCoordinates[1] = 0.0;
            _textureCoordinates[2] = xx;
            // _textureCoordinates[3] = 0.0;
            // _textureCoordinates[4] = 0.0;
            _textureCoordinates[5] = yy;
            _textureCoordinates[6] = xx;
            _textureCoordinates[7] = yy;

            //  aspect ratio
            if (_zoomSettings.aspectRatio < 1.0) {
                _textureCoordinates[5] = _zoomSettings.aspectRatio / _zoomSettings.level;
                _textureCoordinates[7] = _zoomSettings.aspectRatio / _zoomSettings.level;
            }
            else {
                _textureCoordinates[2] = _zoomSettings.aspectRatio * _zoomSettings.level;
                _textureCoordinates[6] = _zoomSettings.aspectRatio * _zoomSettings.level;
            }

            //  offsets
            for (let i = 0; i < 8; i += 2) {
                _textureCoordinates[i] += _zoomSettings.offset.x;
                _textureCoordinates[i + 1] += _zoomSettings.offset.y;
            }

            // for (let i = 0; i < 8; i++)
            // {
            // 	_textureCoordinates[i] = _clamp(_textureCoordinates[i], 0.0, 1.0);
            // }

            //  update windows with new coordinates
            for (let windowId = 0; windowId < _windows.length; windowId++) {
                _windows[windowId].updateTextureCoordinates(_textureCoordinates);
            }
        }

        let _adjust = function () {
            if (_windows.length == 0) {
                return;
            }

            //  first, determine layout width/height
            if (_layout.bAutomatic) {
                let canvasAspect = _canvas.height / _canvas.width;
                _layout.w = Math.round(Math.sqrt(Math.pow(2, Math.ceil(Math.log2(_windows.length / canvasAspect)))));
            }
            _layout.w = Math.max(Math.min(_layout.w, _windows.length), 1);
            _layout.h = Math.ceil(_windows.length / _layout.w);

            let w = _layout.w;
            let h = _layout.h;

            //  next, determine canvas dimensions and border
            _canvas.style.border = _layout.border + "px solid black";
            let pageWidth = (window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth);
            let pageHeight = (window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight);
            let width = pageWidth - 2 * _layout.border;
            let height = pageHeight - 2 * _layout.border;
            let dw = (width % w);
            let dh = (height % _layout.h);

            _canvas.width = (width - dw);
            _canvas.height = (height - dh);
            _canvas.style.borderRight = (_layout.border + dw) + "px solid black";
            _canvas.style.borderBottom = (_layout.border + dh) + "px solid black";

            //  clear canvas
            _glContext.viewport(0, 0, _canvas.width, _canvas.height);
            _glContext.clearColor(1.0, 0.8, 0.8, 1.0);
            _glContext.clear(_glContext.COLOR_BUFFER_BIT);

            //  lastly, determine window dimensions
            let winDimensions = { w: 1.0 / w, h: 1.0 / h };

            //  use actual canvas border values
            let tw = _canvas.width;
            let th = _canvas.height;
            _pxDimensions = { w: tw / w, h: th / h };
            _zoomSettings.aspectRatio = _pxDimensions.h / _pxDimensions.w;

            for (let windowId = 0; windowId < _windows.length; windowId++) {
                let position = {
                    x: (windowId % w) * winDimensions.w,
                    y: Math.trunc(windowId / w) * winDimensions.h
                };
                _windows[windowId].resize(position, winDimensions);
            }

            //  update texture coordinates to reflect changes
            _updateTextureCoordinates();
        }

        let _translate = function (x, y)  //  pixels
        {
            _zoomSettings.offset = {
                x: _zoomSettings.offset.x + x / (_pxDimensions.w * _zoomSettings.level),
                y: _zoomSettings.offset.y + y / (_pxDimensions.h * _zoomSettings.level)
            };

            _updateTextureCoordinates();
        }

        let _zoom = function (direction, position, bHigh = false) {
            let pos = _getOffset(position);
            if (pos !== undefined) {
                let factor = (bHigh ? _zoomSettings.highFactor : _zoomSettings.lowFactor);
                _zoomSettings.level *= (direction > 0 ? factor : 1.0 / factor);
                _zoomSettings.position = pos;

                _updateTextureCoordinates();
            }

            return _zoomSettings.level;
        }

        let _incStream = function (position, streams) {
            let windowId = _getWindowId(position);
            if (windowId !== undefined) {
                let streamId = streams.findIndex(element => element == _windows[windowId].getStream());
                let nextStreamId = (streamId + 1) % streams.length;
                _windows[windowId].setStream(streams[nextStreamId]);
            }
        }

        let _decStream = function (position, streams) {
            let windowId = _getWindowId(position);
            if (windowId !== undefined) {
                let streamId = streams.findIndex(element => element == _windows[windowId].getStream());
                let nextStreamId = (streamId + streams.length - 1) % streams.length;
                _windows[windowId].setStream(streams[nextStreamId]);
            }
        }

        let _render = function (frameId) {
            for (let windowId = 0; windowId < _windows.length; windowId++) {
                _windows[windowId].render(frameId);
            }
        }

        return {
            getWindowId: _getWindowId,
            getWindow: _getWindow,
            getNumWindows: _getNumWindows,
            add: _add,
            delete: _delete,
            resize: _resize,
            inc: _inc,
            dec: _dec,
            setStream: _setStream,
            adjust: _adjust,
            translate: _translate,
            zoom: _zoom,
            incStream: _incStream,
            decStream: _decStream,
            render: _render,
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

            this.stream = undefined;

            this.position = { x: 0, y: 0 };
            this.dimensions = { w: 0, h: 0 };

            this.vertexPositions = new Float32Array([-1.0, 1.0, 1.0, 1.0, -1.0, -1.0, 1.0, -1.0]);
            this.vertexPositionBuffer = glContext.createBuffer();
            this.textureCoordinateBuffer = glContext.createBuffer();

            this.overlay = new NvisOverlay();

            this.canvas.parentNode.insertBefore(this.overlay.getNode(), this.canvas.nextSibling);

            this.resize({ x: 0.0, y: 0.0 }, { w: 1.0, h: 1.0 });

            this.TextureUnits = [
                this.glContext.TEXTURE0,
                this.glContext.TEXTURE1,
                this.glContext.TEXTURE2,
                this.glContext.TEXTURE3,
                this.glContext.TEXTURE4,
                this.glContext.TEXTURE5,
                this.glContext.TEXTURE6,
                this.glContext.TEXTURE7,
            ];
        }


        resize(winPos, winDim) {
            if (this.stream === undefined) {
                return;
            }
            else if (this.stream.getDimensions() === undefined) {
                return;
            }

            let gl = this.glContext;

            //  incoming position/size is in third quadrant [0, 1]
            this.position = winPos;
            this.dimensions = winDim;

            let x = _clamp(2.0 * winPos.x - 1.0, -1.0, 1.0);
            let y = _clamp(1.0 - 2.0 * winPos.y, -1.0, 1.0);
            let width = 2.0 * this.dimensions.w;
            let height = 2.0 * this.dimensions.h;

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
            this.overlay.resize({ x: this.position.x * 100, y: this.position.y * 100 }, this.dimensions);
        }

        getStream() {
            return this.stream;
        }

        setStream = function (stream) {
            this.stream = stream;
        }

        render(frameId) {
            let gl = this.glContext;
            let shader = this.stream.getShader();

            if (this.stream !== undefined && shader !== undefined) {

                let shaderProgram = shader.getProgram();
                gl.useProgram(shaderProgram);

                gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);

                let aVertexPosition = gl.getAttribLocation(shaderProgram, "aVertexPosition");
                gl.vertexAttribPointer(aVertexPosition, 2, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(aVertexPosition);

                // tell webgl how to pull out the texture coordinates from buffer
                let aTextureCoord = gl.getAttribLocation(shaderProgram, 'aTextureCoord');
                gl.bindBuffer(gl.ARRAY_BUFFER, this.textureCoordinateBuffer);
                gl.vertexAttribPointer(aTextureCoord, 2, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(aTextureCoord);

                if (this.stream.isFileStream()) {
                    // Tell WebGL we want to affect texture unit 0
                    gl.activeTexture(gl.TEXTURE0);

                    // Bind the texture to texture unit 0
                    gl.bindTexture(gl.TEXTURE_2D, this.stream.getTexture(frameId));

                    // Tell the shader we bound the texture to texture unit 0
                    let uSampler = gl.getUniformLocation(shaderProgram, 'uSampler');
                    gl.uniform1i(uSampler, 0);
                }
                else {
                    for (let inputId = 0; inputId < this.stream.getShader().getNumInputs(); inputId++) {
                        let activeTexture = this.TextureUnits[inputId];
                        gl.activeTexture(activeTexture);
                        gl.bindTexture(gl.TEXTURE_2D, this.stream.getInputStream(inputId).getTexture(frameId));
                        gl.uniform1i(gl.getUniformLocation(shaderProgram, ('uTexture' + inputId)), inputId);
                    }

                    shader.setUniforms();
                }

                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

            }
        }

        updateTextureCoordinates(textureCoordinates) {
            let gl = this.glContext;
            gl.bindBuffer(gl.ARRAY_BUFFER, this.textureCoordinateBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, textureCoordinates, gl.STATIC_DRAW);
        }
    }

    function cNvisWindow(glContext, canvas) {
        let _glContext = glContext;
        let _canvas = canvas;

        let _stream = undefined;

        let _position = { x: 0, y: 0 };
        let _dimensions = { w: 0, h: 0 };

        let _vertexPositions = new Float32Array([-1.0, 1.0, 1.0, 1.0, -1.0, -1.0, 1.0, -1.0]);
        let _vertexPositionBuffer = _glContext.createBuffer();
        let _textureCoordinateBuffer = glContext.createBuffer();

        let _overlay = new NvisOverlay();

        let _init = function () {
            _canvas.parentNode.insertBefore(_overlay.getNode(), _canvas.nextSibling);

            _resize({ x: 0.0, y: 0.0 }, { w: 1.0, h: 1.0 });
        }

        let _resize = function (winPos, winDim) {
            if (_stream === undefined) {
                return;
            }
            else if (_stream.getDimensions() === undefined) {
                return;
            }

            //  incoming position/size is in third quadrant [0, 1]
            _position = winPos;
            _dimensions = winDim;

            let x = _clamp(2.0 * winPos.x - 1.0, -1.0, 1.0);
            let y = _clamp(1.0 - 2.0 * winPos.y, -1.0, 1.0);
            let width = 2.0 * _dimensions.w;
            let height = 2.0 * _dimensions.h;

            let xx = _clamp(x + width, -1.0, 1.0);
            let yy = _clamp(y - height, -1.0, 1.0);

            _vertexPositions[0] = x;
            _vertexPositions[1] = y;
            _vertexPositions[2] = xx;
            _vertexPositions[3] = y;
            _vertexPositions[4] = x;
            _vertexPositions[5] = yy;
            _vertexPositions[6] = xx;
            _vertexPositions[7] = yy;

            _glContext.bindBuffer(_glContext.ARRAY_BUFFER, _vertexPositionBuffer);
            _glContext.bufferData(_glContext.ARRAY_BUFFER, _vertexPositions, _glContext.STATIC_DRAW);

            //  TODO: fix overlay...
            _overlay.resize({ x: _position.x * 100, y: _position.y * 100 }, _dimensions);
        }

        let _getStream = function () {
            return _stream;
        }

        let _setStream = function (stream) {
            _stream = stream;
        }

        let _render = function (frameId) {
            let shader = _stream.getShader();
            if (_stream !== undefined && shader !== undefined) {

                //  debug
                if (!shader.isReady())
                    return;

                let shaderProgram = shader.getProgram();
                _glContext.useProgram(shaderProgram);

                _glContext.bindBuffer(_glContext.ARRAY_BUFFER, _vertexPositionBuffer);

                let aVertexPosition = _glContext.getAttribLocation(shaderProgram, "aVertexPosition");
                _glContext.vertexAttribPointer(aVertexPosition, 2, _glContext.FLOAT, false, 0, 0);
                _glContext.enableVertexAttribArray(aVertexPosition);

                // tell webgl how to pull out the texture coordinates from buffer
                let aTextureCoord = _glContext.getAttribLocation(shaderProgram, 'aTextureCoord');
                _glContext.bindBuffer(_glContext.ARRAY_BUFFER, _textureCoordinateBuffer);
                _glContext.vertexAttribPointer(aTextureCoord, 2, _glContext.FLOAT, false, 0, 0);
                _glContext.enableVertexAttribArray(aTextureCoord);

                if (_stream.isFileStream()) {
                    // Tell WebGL we want to affect texture unit 0
                    _glContext.activeTexture(_glContext.TEXTURE0);

                    // Bind the texture to texture unit 0
                    _glContext.bindTexture(_glContext.TEXTURE_2D, _stream.getTexture(frameId));

                    // Tell the shader we bound the texture to texture unit 0
                    let uSampler = _glContext.getUniformLocation(shaderProgram, 'uSampler');
                    _glContext.uniform1i(uSampler, 0);
                }
                else {
                    const textures = [_glContext.TEXTURE0, _glContext.TEXTURE1, _glContext.TEXTURE2, _glContext.TEXTURE3];
                    for (let inputId = 0; inputId < _stream.getShader().getNumInputs(); inputId++) {
                        let activeTexture = textures[inputId];
                        _glContext.activeTexture(activeTexture);
                        _glContext.bindTexture(_glContext.TEXTURE_2D, _stream.getInputStream(inputId).getTexture(frameId));
                        _glContext.uniform1i(_glContext.getUniformLocation(shaderProgram, ('uTexture' + inputId)), inputId);
                    }

                    shader.setUniforms();
                }

                _glContext.drawArrays(_glContext.TRIANGLE_STRIP, 0, 4);

            }
        }

        let _updateTextureCoordinates = function (textureCoordinates) {
            _glContext.bindBuffer(_glContext.ARRAY_BUFFER, _textureCoordinateBuffer);
            _glContext.bufferData(_glContext.ARRAY_BUFFER, textureCoordinates, _glContext.STATIC_DRAW);
        }

        _init();

        return {
            getStream: _getStream,
            setStream: _setStream,
            resize: _resize,
            render: _render,
            updateTextureCoordinates: _updateTextureCoordinates,
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

        let _defaultShader = {};

        let _input = {
            mouse: {
                position: { x: 0, y: 0 },
                previousPosition: { x: 0, y: 0 },
                clickPosition: { x: 0, y: 0 },
                down: false,
            },
            keyboard: {
                shift: false,
            }
        }

        let _settings = {
            layout: {
                // automatic: true,
                border: 50,
                // w: 1,
                // h: 1,
            },
        }

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

            _glContext = _canvas.getContext("webgl");
            if (_glContext === null) {
                alert("Unable to initialize WebGL!");
                return;
            }

            _windows = new NvisWindows(_glContext, _canvas);

            _defaultShader = new NvisShader(_glContext);

            window.onresize = _windows.adjust;

            _canvas.onclick = _onClick;
            _canvas.onmousedown = _onMouseDown;
            _canvas.onmousemove = _onMouseMove;
            _canvas.onmouseup = _onMouseUp;
            _canvas.onwheel = _onWheel;

            document.body.onpaste = _onFileDrop;
            document.body.ondrop = _onFileDrop;
            document.body.ondragenter = _onFileDragEnter;
            document.body.ondragover = _onFileDragOver;
            document.body.ondragleave = _onFileDragLeave;

            document.body.onkeypress = _onKeyPress;
            document.body.onkeydown = _onKeyDown;
            document.body.onkeyup = _onKeyUp;
        };

        let _getContext = function () {
            return _glContext;
        }

        var _onWheel = function (event) {
            event.preventDefault();
            let level = _windows.zoom(-Math.sign(event.deltaY), _input.mouse.position, _input.keyboard.shift);
            _popupInfo("zoom = " + level.toFixed(2) + "x (" + (level * 100.0).toFixed(1) + "%)");
        }

        let _updateUiPopup = function () {
            //  clear all children
            _uiPopup.textContent = '';

            _uiPopup.innerHTML = "<b>NVIS Online<br/><br/>";

            _uiPopup.innerHTML += "Streams<br/>";
            for (let streamId = 0; streamId < _streams.length; streamId++) {
                let ui = _streams[streamId].getUI(streamId, _streams);
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
                let windowStream = _windows.getWindow(windowId).getStream();
                for (let streamId = 0; streamId < _streams.length; streamId++) {
                    let fileName = _streams[streamId].getFileName();
                    options += "<option";
                    if (_streams[streamId] == windowStream) {
                        options += " selected";
                    }
                    options += (">" + fileName + "</option>");
                }
                let select = ("<select id=\"windowStream-" + windowId + "\"");
                select += (" onchange=\"nvis.setWindowStream(" + windowId + ")\"");
                select += (" id=\"windowStream\">" + options + "</select>");
                _uiPopup.innerHTML += select;
                _uiPopup.innerHTML += "<br/>";
            }
            _uiPopup.innerHTML += "<hr>";
            _uiPopup.innerHTML += "<br/>";
            _uiPopup.innerHTML += "<input id=\"bAutomaticLayout\" type=\"checkbox\" onclick=\"_toggleAutomaticLayout()\"> Automatic window layout";
            _uiPopup.innerHTML += "<br/>";

            let w = window.getComputedStyle(_uiPopup).getPropertyValue("width");
            let h = window.getComputedStyle(_uiPopup).getPropertyValue("height");
            let x = Math.trunc((_canvas.width - w.substring(0, w.indexOf('px'))) / 2);
            let y = Math.trunc((_canvas.height - h.substring(0, h.indexOf('px'))) / 2);
            _uiPopup.style.left = (x + "px");
            _uiPopup.style.top = (y + "px");

        }


        let _onKeyPress = function (event) {
            event = event || window.event;

            switch (event.key) {
                case '1': case '2': case '3': case '4': case '5': case '6': case '7': case '8': case '9':
                    _windows.setStream(_windows.getWindowId(_input.mouse.position), _streams[parseInt(event.key) - 1]);
                    break;
                case ' ':
                    _animation.toggleActive();
                    break;
                case 'a':
                    _windows.adjust();
                    break;
                case 'p':
                    _animation.togglePingPong();
                    break;
                case 'd':
                    _windows.delete(_input.mouse.position);
                    break;
                case 'o':
                    document.getElementById("fileInput").click();
                    break;
                case 'D':
                    if (_streams.length > 1) {
                        _renderer.loadShader("glsl/difference.json", true);
                    }
                    break;
                case 'w':
                    _windows.add(_streams[0]);
                    break;
                case '+':
                    _windows.inc();
                    break;
                case '-':
                    _windows.dec();
                    break;
                default:
                    console.log("KEYPRESS   key: '" + event.key + "', keyCode: " + event.keyCode);
                    break;
            }
        }

        let _onKeyDown = function (event) {
            event = event || window.event;
            let keyCode = event.keyCode || event.which;

            // if (keyCode != 116)  //  F5
            //     event.preventDefault();

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
                    _input.keyboard.shift = true;
                    break;
                case 37:  //  ArrowLeft
                    _animation.dec();
                    break;
                case 38:  //  ArrowUp
                    _windows.incStream(_input.mouse.position, _streams);
                    break;
                case 39:  //  ArrowRight
                    _animation.inc();
                    break;
                case 40:  //  ArrowDown
                    _windows.decStream(_input.mouse.position, _streams);
                    break;
                case 72:  // 'h'
                    _helpPopup.style.display = "block";
                    break;
                default:
                    console.log("KEYDOWN   key: '" + event.key + "', keyCode: " + keyCode);
                    break;
            }
        }

        let _onKeyUp = function (event) {
            event = event || window.event;
            let keyCode = event.keyCode || event.which;

            switch (keyCode) {
                case 16:  //  Shift
                    _input.keyboard.shift = false;
                    break;
                case 37:  //  ArrowLeft
                    break;
                case 38:  //  ArrowUp
                    break;
                case 39:  //  ArrowRight
                    break;
                case 40:  //  ArrowDown
                    break;
                case 72:  // 'h'
                    _helpPopup.style.display = "none";
                    break;
                default:
                    //console.log("KEYUP   key: '" + event.key + "', keyCode: " + keyCode);
                    break;
            }
        }

        let _fadeInfoPopup = function () {
            let opacity = parseFloat(document.getElementById("infoPopup").style.opacity);
            if (opacity > 0.0) {
                document.getElementById("infoPopup").style.opacity = opacity - 0.02;
                setTimeout(_fadeInfoPopup, 25);
            }
        }

        let _popupInfo = function (text) {
            _infoPopup.innerHTML = text;
            let currentOpacity = document.getElementById("infoPopup").style.opacity;
            document.getElementById("infoPopup").style.opacity = 1.0;
            if (currentOpacity == 0.0) {
                _fadeInfoPopup();
            }
        }

        let _onClick = function (event) {
            console.log("_canvas.onclick()");
        }

        let _onMouseDown = function (event) {
            _input.mouse.down = true;
            _input.mouse.clickPosition = { x: event.clientX, y: event.clientY };
        }

        let _onMouseMove = function (event) {
            _input.mouse.previousPosition = _input.mouse.position;
            _input.mouse.position = { x: event.clientX, y: event.clientY };
            if (_input.mouse.down) {
                _windows.translate(_input.mouse.previousPosition.x - _input.mouse.position.x, _input.mouse.previousPosition.y - _input.mouse.position.y);
            }
        }

        let _onMouseUp = function (event) {
            _input.mouse.down = false;
        }

        let _streamUpdateParameter = function (streamId, elementId) {
            //alert("update: " + streamId + ", " + elementId);
            _streams[streamId].getShader().updateParameter(elementId);
        }

        let _streamUpdateInput = function (streamId, inputId) {
            //alert("update: " + streamId + ", " + inputId);
            let elementId = ("input-" + streamId + "-" + inputId);
            let inputStreamId = document.getElementById(elementId).selectedIndex;
            _streams[streamId].setInputStream(inputId, _streams[inputStreamId]);
        }

        let _setWindowStream = function (windowId) {
            let elementId = ("windowStream-" + windowId);
            let newStreamId = document.getElementById(elementId).selectedIndex;
            _windows.getWindow(windowId).setStream(_streams[newStreamId]);
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

            if (files[0].type.match(/image.*/)) {
                files.sort(function (a, b) { return a.name.localeCompare(b.name); });
                let newStream = NvisStream(_glContext);
                newStream.drop(files, _newStreamCallback);
                newStream.setShader(_defaultShader);
                _streams.push(newStream);
                _animation.numFrames = newStream.getNumImages();  //  TODO: check
                _addWindow(newStream);
                _windows.adjust();
            }
            document.getElementById("fileInput").value = "";  //  force onchange event if same files

            return;
            for (let i = 0; i < files.length; i++) {
                let file = files[i];

                if (file.type.match(/image.*/)) {
                    let reader = new FileReader();

                    reader.onload = function (event) {
                        let stream = _addStream(event.target.result);
                        stream.setFileName(file.name);
                        stream.setShader(_defaultShader);
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
                        let lcJsonObject = {};
                        for (let key of Object.keys(jsonObject)) {
                            lcJsonObject[key.toLowerCase()] = jsonObject[key];
                        }
                        console.log("JSON filename: " + lcJsonObject.filename);

                        let shader = _addShader(lcJsonObject);
                    }

                    reader.readAsText(file);
                }
                else if (file.name.match(/.exr$/)) {
                    console.log("EXR file...");
                }
            }

            _canvas.style.border = _settings.layout.border + "px solid black";
        }

        let _onFileDragEnter = function (event) {
            _canvas.style.border = _settings.layout.border + "px solid green";
            event.preventDefault();
        }

        let _onFileDragOver = function (event) {
            event.preventDefault();
        }

        let _onFileDragLeave = function (event) {
            _canvas.style.border = _settings.layout.border + "px solid black";
            event.preventDefault();
        }

        let _renderFrameBuffers = function () {
            //  TODO: enable hierarchical rendering


        }

        let _render = function () {
            _glContext.clearColor(0.2, 0.2, 0.2, 1.0);
            _glContext.clear(_glContext.COLOR_BUFFER_BIT);

            //_renderFrameBuffers();
            _windows.render(_animation.frameId);

            _animation.update();
        }

        let _loadShader = function (jsonFileName, bStream = true, bWindow = true) {
            let xhr = new XMLHttpRequest();
            xhr.open("GET", jsonFileName);
            xhr.setRequestHeader("Cache-Control", "no-cache, no-store, max-age=0");
            xhr.onload = function () {
                if (this.status == 200 && this.responseText !== null) {
                    let jsonObject = JSON.parse(this.responseText);
                    console.log("=====  Shader JSON loaded (" + jsonFileName + ")");
                    //  convert top-level keys to lowercase
                    let lcJsonObject = {};
                    for (let key of Object.keys(jsonObject)) {
                        lcJsonObject[key.toLowerCase()] = jsonObject[key];
                    }

                    let newShader = new NvisShader(_glContext, lcJsonObject);

                    if (bStream && _streams.length >= newShader.getNumInputs()) {
                        _shaders.push(newShader);
                        let newStream = new NvisStream(_glContext);
                        // newStream.setupOutputTexture(_streams[0].getDimensions());
                        _streams.push(newStream);
                        newStream.setShader(newShader);
                        for (let inputId = 0; inputId < newShader.getNumInputs(); inputId++) {
                            newStream.addInputStream(_streams[inputId]);
                        }
                        if (bWindow) {
                            _addWindow(newStream);
                            _windows.adjust();
                        }
                    }
                }
            };
            xhr.send();
        }

        let _newStreamCallback = function (pxDimensions) {
            console.log("_newStreamCallback(" + pxDimensions.w + ", " + pxDimensions.h + ")");
            _windows.adjust();
        }

        let _loadStream = function (fileNames) {
            //let newStream = new NvisStream(_glContext, fileNames, _newStreamCallback);
            let newStream = new NvisStream(_glContext);

            newStream.load(fileNames, _newStreamCallback);

            _animation.numFrames = newStream.getNumImages();

            if (fileNames !== undefined) {
                newStream.setShader(_defaultShader);
            }
            _streams.push(newStream);
            _windows.adjust();

            return newStream;
        }

        let _addWindow = function (stream) {
            _windows.add(stream);
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
            addWindow: _addWindow,
            loadStream: _loadStream,
            loadShader: _loadShader,
            render: _render,
            streamUpdateParameter: _streamUpdateParameter,
            streamUpdateInput: _streamUpdateInput,
            setWindowStream: _setWindowStream,
            getNumStreams: _getNumStreams,
            start: _start,
        }
    }

    //  API
    let _stream = function (fileNames, bWindow = true) {
        let stream = _renderer.loadStream(Array.isArray(fileNames) ? fileNames : [fileNames]);
        if (bWindow) {
            _renderer.addWindow(stream);
        }
    }

    let _shader = function (fileName, bStream = true, bWindow = true) {
        if (_renderer.getNumStreams() > 1) {
            _renderer.loadShader(fileName, bStream, bWindow);
        }
    }

    let _streamUpdateParameter = function (streamId, elementId) {
        //alert("update: " + streamId + ", " + elementId);
        _streams[streamId].getShader().updateParameter(elementId);
    }

    let _streamUpdateInput = function (streamId, inputId) {
        //alert("update: " + streamId + ", " + inputId);
        let elementId = ("input-" + streamId + "-" + inputId);
        let inputStreamId = document.getElementById(elementId).selectedIndex;
        _streams[streamId].setInputStream(inputId, _streams[inputStreamId]);
    }

    let _setWindowStream = function (windowId) {
        _renderer.setWindowStream(windowId);
        // let elementId = ("windowStream-" + windowId);
        // let newStreamId = document.getElementById(elementId).selectedIndex;
        // _windows.getWindow(windowId).setStream(_streams[newStreamId]);
    }

    return {
        init: _init,
        stream: _stream,
        shader: _shader,
        //  below need to be visible to handle UI events
        streamUpdateParameter: _streamUpdateParameter,
        streamUpdateInput: _streamUpdateInput,
        setWindowStream: _setWindowStream,
    }
}
