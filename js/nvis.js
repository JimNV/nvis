/*
 * SPDX-FileCopyrightText: Copyright (c) 2021 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 * list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation
 * and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

//--------|---------|---------|---------|---------|---------|---------|---------|

'use strict';

var nvis = new function () {
    let _renderer = undefined;

    let _state = {
        ui: {
            tabId: 'tabSettings',
            position: { x: 50, y: 50 },
            clickPosition: undefined,
            mouseDown: false,
            previousPosition: { x: 50, y: 50 },
            selectedStreamId: -1
        },
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
            MinLevel: 0.125,
            MaxLevel: 256.0,
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
                streamCoords: undefined,
                clickPosition: { x: 0, y: 0 },
                down: false,
                showInfo: false
            },
            keyboard: {
                shift: false,
                shiftDown: false,  //  records shift state for fileInput event
                control: false
            }
        },
        animation: {
            active: false,
            performance: false,
            fps: 60,
            pingPong: true,
            direction: 1,
            frameId: 0,
            numFrames: 1,  //  TODO: fix this!
            minFrameId: 0,
            maxFrameId: 0,
            time: 0,

            setNumFrames: function (numFrames) {
                this.numFrames = numFrames;
                this.minFrameId = 0;
                this.maxFrameId = numFrames - 1;
            },

            toggleActive: function () {
                this.active = !this.active;
            },

            togglePingPong: function () {
                this.pingPong = !this.pingPong;
            },

            inc: function () {
                // this.frameId = (this.frameId + 1) % this.numFrames;
                this.frameId++;
                if (this.frameId > this.maxFrameId) {
                    this.frameId = this.minFrameId;
                }
                document.getElementById('settings-frameId').value = (this.frameId + 1);
                document.getElementById('settings-frameId-value').innerHTML = (this.frameId + 1);
            },

            dec: function () {
                // this.frameId = (this.frameId + this.numFrames - 1) % this.numFrames;
                this.frameId--;
                if (this.frameId < this.minFrameId) {
                    this.frameId = this.maxFrameId;
                }
                document.getElementById('settings-frameId').value = (this.frameId + 1);
                document.getElementById('settings-frameId-value').innerHTML = (this.frameId + 1);
            },

            update: function () {
                if (this.active) {
                    if (this.pingPong) {
                        this.frameId += this.direction;
                        this.frameId = Math.max(this.frameId, this.minFrameId);
                        this.frameId = Math.min(this.frameId, this.maxFrameId);
                        if (this.frameId == this.minFrameId || this.frameId == this.maxFrameId) {
                            this.direction = -this.direction;
                        }
                    } else {
                        this.frameId += this.direction;
                        if (this.direction > 0 && this.frameId > this.maxFrameId) {
                            this.frameId = this.minFrameId;
                        }
                        if (this.direction < 0 && this.frameId < this.minFrameId) {
                            this.frameId = this.maxFrameId;
                        }
                    }
                    document.getElementById('settings-frameId').value = (this.frameId + 1);
                    document.getElementById('settings-frameId-value').innerHTML = (this.frameId + 1);
                }
            }
        }
    }

    let _settings = {
        title: 'Settings',
        bAutomaticLayout: {
            name: 'Automatic layout',
            type: 'bool',
            value: _state.layout.bAutomatic
        },
        layoutWidth: {
            name: 'Layout width',
            type: 'int',
            value: _state.layout.dimensions.w,
            min: 1,
            max: '#windows',
            condition: '!bAutomaticLayout'
        },
        bLockTranslation: {
            name: 'Lock translation',
            type: 'bool',
            value: false
        },
        bDrawGrid: {
            name: 'Draw grid when zooming',
            type: 'bool',
            value: true
        },
        bDrawPixel: {
            name: 'Draw pixel marker when zooming',
            type: 'bool',
            value: true
        },
        bAlphaCheckerboard: {
            name: 'Show alpha with checkboard',
            type: 'bool',
            value: true
        },
        canvasBorder: {
            name: 'Border width',
            type: 'int',
            value: _state.layout.border,
            min: 0,
            max: 200,
            step: 1
        },
        pixelValueDecimals: {
            name: 'Pixel value decimals',
            type: 'int',
            value: 3,
            min: 0,
            max: 16,
            step: 1
        },
        clearAll: {
            name: 'Clear all streams and windows',
            type: 'button',
            value: 'Clear all'
        },
        Animation: {
            type: 'ruler'
        },
        bPerformance: {
            name: 'Performance info',
            type: 'bool',
            value: _state.animation.performance
        },
        bAnimate: {
            name: 'Animate',
            type: 'bool',
            value: _state.animation.active
        },
        bPingPong: {
            name: 'Ping-pong',
            type: 'bool',
            value: _state.animation.pingPong,
            condition: 'bAnimate'
        },
        direction: {
            name: 'Direction',
            type: 'dropdown',
            value: 0,
            alternatives: [
                'Forward',
                'Backward'
            ],
            condition: 'bAnimate & !bPingPong'
        },
        fps: {
            name: 'Frames per second',
            type: 'int',
            value: _state.animation.fps,
            min: 1,
            max: 60,  //  TODO: maximize according to browser and screen capability
            step: 1,
            condition: 'bAnimate'
        },
        frameId: {
            name: 'Frame',
            type: 'int',
            value: 1,
            min: 1,
            max: '#frames',
            step: 1
        },
        minFrameId: {
            name: 'Min frame',
            type: 'int',
            value: 1,
            min: 1,
            max: '#frames',
            step: 1,
        },
        maxFrameId: {
            name: 'Max frame',
            type: 'int',
            value: '#frames',
            min: 1,
            max: '#frames',
            step: 1,
        },
        Tonemapping: {
            type: 'ruler'
        },
        bGlobalTonemapping: {
            name: 'Global tonemapping',
            type: 'bool',
            value: false
        },
        tonemapper: {
            name: 'Tonemapper',
            type: 'dropdown',
            value: 0,
            alternatives: [
                'Gamma correction'
            ],
            condition: 'bGlobalTonemapping'
        },
        gamma: {
            name: 'Gamma',
            type: 'float',
            min: 0.1,
            max: 4.0,
            value: 2.2,
            step: 0.1,
            condition: 'bGlobalTonemapping & tonemapper == 0'
        },
        exposure: {
            name: 'Exposure',
            type: 'float',
            min: 0.1,
            max: 10.0,
            value: 1.0,
            step: 0.1,
            condition: 'bGlobalTonemapping & tonemapper == 0'
        },
        Video: {
            type: 'ruler'
        },
        videoFPS: {
            name: 'Video decoding FPS',
            type: 'int',
            value: 30,
            min: 1,
            max: 240,
            step: 1
        },
        videoMaxFrames: {
            name: 'Video decoding max frames',
            type: 'int',
            value: 30,
            min: 1,
            max: 300,
            step: 1
        }
    };


    function addStylesheetRules(rules) {
        let styleElement = document.createElement('style');
        document.head.appendChild(styleElement);
        styleElement.sheet.insertRule(rules, styleElement.sheet.cssRules.length);
    }

    function addStyles() {

        addStylesheetRules(`body {
            width: 100%;
            height: 100%;
            margin: 0px;
            padding: 0px;
            font: 20px Arial;
            overflow: hidden;
            user-select: none;
        }`);
        addStylesheetRules(`div#welcome {
            position: absolute;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }`);
        addStylesheetRules(`div#welcome img {
            width: 20%;
        }`);
        addStylesheetRules(`div#welcome div {
            font: 24px Consolas;
            color: white;
            margin: 40px;
        }`);

        addStylesheetRules(`div.title {
            font-weight: bold;
            padding-bottom: 10px;
        }`);

        addStylesheetRules(`canvas {
            margin: 0px;
            padding: 0px;
            display: block;
            background-color: black;
        }`);

        addStylesheetRules(`input[type=file] {
            display: none;
        }`);

        addStylesheetRules(`.helpPopup {
            color: black;
            background-color: #f0f0f0;
            border: 3px solid #808080;
            border-radius: 15px;
            position: absolute;
            display: none;
            margin: 0px;
            padding: 20px;
            left: 20px;
            top: 20px;
        }`);

        //  UI popup
        addStylesheetRules(`.uiPopup {
            user-select: false;
            color: black;
            background-color: white;
            border: 5px solid #808080;
            border-radius: 10px;
            position: absolute;
            display: none;
            margin: 0px;
            padding: 20px;
            left: 20px;
            top: 20px;
        }`);
        addStylesheetRules(`.uiPopup div.titleBar {
            display: flex;
            margin-bottom: 15px;
        }`);
        addStylesheetRules(`.uiPopup span.title {
            margin-right: 15px;
        }`);
        addStylesheetRules(`.uiPopup div.titleBarBar {
            flex-grow: 1;
            background: repeating-linear-gradient(
                135deg,
                white,
                white 10px,
                #808080 10px,
                #808080 20px
            );
        }`);
        addStylesheetRules(`.uiPopup div.uiTitle:hover{
            color: blue;
        }`);
        addStylesheetRules(`.uiPopup div.uiBody {
            margin-left: 50px;
        }`);
        // addStylesheetRules(`.uiPopup table {
        //     margin-left: 50px;
        // }`);
        addStylesheetRules(`.uiPopup select {
            font: 20px Arial;
        }`);
        addStylesheetRules(`.uiPopup label {
            margin-left: 5px;
        }`);
        addStylesheetRules(`.uiPopup button {
            font: 20px Arial;
        }`);
        addStylesheetRules(`.uiPopup button#shaderCreate {
            margin-left: 5px;
        }`);
        addStylesheetRules(`.uiPopup button#graphCreate {
            margin-left: 5px;
        }`);
        addStylesheetRules(`.uiPopup input[type=range] {
            width: 300px;
        }`);

        //  UI tabs
        addStylesheetRules(`div.tabs {
            overflow: hidden;
            border: 0px solid #808080;
            background-color: white;
        }`);
        addStylesheetRules(`div.tabs button {
            background-color: inherit;
            float: left;
            border: 1px solid #e0e0e0;
            border-radius: 15px 15px 0px 0px;
            outline: none;
            cursor: pointer;
            padding: 6px 18px;
            transition: 0.3s;
            font-size: 17px;
        }`);
        addStylesheetRules(`div.tabs button:hover {
            background-color: #d0d0d0;
        }`);
        addStylesheetRules(`div.tabs button {
            border-bottom: 1px solid #808080;
            border-radius: 15px 15px 0px 0px;
        }`);
        addStylesheetRules(`div.tabs button.active {
            border-bottom: 1px solid #f0f0f0;
            border-top: 1px solid #808080;
            border-left: 1px solid #808080;
            border-right: 1px solid #808080;
            border-radius: 15px 15px 0px 0px;
        }`);
        addStylesheetRules(`div.tabContent {
            display: none;
            padding: 6px 12px;
            border: 1px solid #808080;
            border-top: none;
        }`);

        //  info popup
        addStylesheetRules(`.infoPopup {
            width: 100%;
            text-align: right;
            font: 42px Arial;
            color: white;
            opacity: 0.0;
            position: absolute;
            left: -50px;
            top: 5px;
            text-shadow: 5px 5px 10px black;
        }`);

        //  performance info
        addStylesheetRules(`#performanceInfo {
            font: 16px Arial;
            color: white;
            opacity: 1.0;
            position: absolute;
            left: 0px;
            top: 0px;
            text-shadow: 5px 5px 10px black;
        }`);

        //  pixel info overlay
        addStylesheetRules(`div.overlay {
            display: none;
            padding: 10px;
            margin: 20px;
            position: absolute;
            color: white;
            border-radius: 10px;
            border: 1px solid #606060;
            background-color: #303030;
            font: 16px Consolas;
            left: 10px;
            top: 10px;
        }`);
        addStylesheetRules(`div.overlay span {
            display: inline-block;
            padding: 0px;
            margin: 0px 15px 0px 15px;
            width: 15px;
            height: 15px;
            border: 0px solid #f0f0f0;
        }`);

    };

    //  API handling

    let _apiClear = function () {
        return _apiCommand({ command: 'clear', argument: undefined });
    }

    let _apiZoom = function (level) {
        return _apiCommand({ command: 'zoom', argument: level })
    }

    let _apiPosition = function (x, y) {
        return _apiCommand({ command: 'position', argument: { x: x, y: y } })
    }

    let _apiTranslate = function (x, y) {
        return _apiCommand({ command: 'translate', argument: { x: x, y: y } })
    }

    let _apiAnnotation = function (target, id, type, parameters) {
        return _apiCommand({ command: 'annotation', argument: { target: target, id: id, type: type, parameters: parameters } });
    }

    let _apiStream = function (images, bWindow = true) {
        images = (Array.isArray(images) ? images : [images]);
        return _apiCommand({ command: 'stream', argument: { name: images[0], images: images, window: bWindow } });
    }

    let _apiVideo = function (fileName, bWindow = true) {
        return _apiCommand({ command: 'video', argument: { name: fileName, fileName: fileName, window: bWindow } });
    }

    let _apiShaders = function (fileNames) {
        fileNames = (Array.isArray(fileNames) ? fileNames : [fileNames]);
        for (let i = 0; i < fileNames.length; i++) {
            _apiCommand({ command: 'loadShader', argument: fileNames[i] });
        }
    }

    let _apiShader = function (fileNameOrId, inputs = undefined, parameters = {}, bWindow = true) {
        if (typeof fileNameOrId == 'string') {
            return _apiCommand({ command: 'shader', argument: { fileName: fileNameOrId, parameters: parameters, inputs: inputs, window: bWindow } });
        } else if (typeof fileNameOrId == 'number') {
            return _apiCommand({ command: 'shader', argument: { shaderId: fileNameOrId, parameters: parameters, inputs: inputs, window: bWindow } });
        }
    }

    let _apiGraphs = function (fileNames) {
        fileNames = (Array.isArray(fileNames) ? fileNames : [fileNames]);
        for (let i = 0; i < fileNames.length; i++) {
            _apiCommand({ command: 'loadShaderGraphDescription', argument: fileNames[i] });
        }
    }

    let _apiGraph = function (fileNameOrId, inputs = undefined, parameters = {}, bWindow = true) {
        if (typeof fileNameOrId == 'string') {
            return _apiCommand({ command: 'shaderGraph', argument: { fileName: fileNameOrId, parameters: parameters, inputs: inputs, window: bWindow } });
        } else if (typeof fileNameOrId == 'number') {
            return _apiCommand({ command: 'shaderGraph', argument: { shaderGraphDescriptionId: fileNameOrId, parameters: parameters, inputs: inputs, window: bWindow } });
        }
    }

    let _apiGenerator = function (fileNameOrId, parameters = {}, bWindow = true) {
        // return _apiCommand({ command: 'generator', argument: { fileName: fileName, width: width, height: height, window: bWindow } });
        if (typeof fileNameOrId == 'string') {
            return _apiCommand({ command: 'generator', argument: { fileName: fileNameOrId, parameters: parameters, window: bWindow } });
        } else if (typeof fileNameOrId == 'number') {
            return _apiCommand({ command: 'generator', argument: { shaderId: fileNameOrId, parameters: parameters, window: bWindow } });
        }
    }

    let _apiWindow = function (streamId = 0) {
        return _apiCommand({ command: 'window', argument: streamId });
    }

    let _parseConfig = function (jsonObject) {

        //  TODO: complete all API commands

        //  convert top-level keys to lowercase
        let config = {};
        for (let key of Object.keys(jsonObject)) {
            config[key.toLowerCase()] = jsonObject[key];
        }

        //  Zoom
        let zoom = config.zoom;
        if (zoom !== undefined) {
            _apiCommand({ command: 'zoom', argument: zoom });
        }

        //  shaders
        let shaders = config.shaders;
        if (shaders !== undefined) {
            for (let i = 0; i < shaders.length; i++) {
                _apiCommand({ command: 'loadShader', argument: shaders[i] });
            }
        }

        //  streams
        let streams = config.streams;
        if (streams !== undefined) {
            for (let i = 0; i < streams.length; i++) {
                _apiCommand({ command: 'stream', argument: streams[i] });
            }
        }

        //  windows
        let streamIds = config.windows;
        if (streamIds !== undefined) {
            for (let i = 0; i < streamIds.length; i++) {
                _apiCommand({ command: 'window', argument: streamIds[i] });
            }
        }
    }

    let _apiConfig = function (fileName) {
        let xhr = new XMLHttpRequest();
        xhr.open('GET', fileName);
        xhr.setRequestHeader('Cache-Control', 'no-cache, no-store, max-age=0');
        xhr.onload = function () {
            if (this.status == 200 && this.responseText !== null) {
                let jsonObject = JSON.parse(this.responseText);
                console.log('=====  Config JSON loaded (' + fileName + ')');
                _parseConfig(jsonObject);
            }
        };
        xhr.send();
    }


    let _executeAPICommand = function (apiCommand) {
        let command = apiCommand.command;
        let argument = apiCommand.argument;

        if (command == 'clear') {

            _state.zoom.level = 1.0;
            _renderer.streams = [];
            _renderer.windows.clear();
            return true;

        } else if (command == 'zoom') {

            _state.zoom.level = Math.min(Math.max(argument, _state.zoom.MinLevel), _state.zoom.MaxLevel);
            _renderer.windows.updateTextureCoordinates();
            return _state.zoom.level;

        } else if (command == 'position') {

            if (_renderer.windows !== undefined) {
                _renderer.windows.position({
                    x: argument.x * _state.zoom.level,
                    y: argument.y * _state.zoom.level
                });
            }
            return true;

        } else if (command == 'translate') {

            if (_renderer.windows !== undefined) {
                _renderer.windows.translate({
                    x: argument.x * _state.zoom.level,
                    y: argument.y * _state.zoom.level
                });
            }
            return true;

        } else if (command == 'annotation') {

            if (argument.target == 'stream') {
                if (argument.id < _renderer.streams.length) {
                    _renderer.streams[argument.id].annotations.add(argument.type, argument.parameters);
                }
            } else if (argument.target == 'window') {
                if (argument.id < _renderer.windows.windows.length) {
                    _renderer.windows.windows[argument.id].annotations.add(argument.type, argument.parameters);
                }
            }

        } else if (command == 'video') {

            let fileName = argument.fileName;
            let videoParser = new NvisVideoParser((fileName, frames) => _renderer.setupVideo(fileName, frames));
            videoParser.fromFile(argument.fileName);
            // console.log('#frames: ' + frames.length);

        } else if (command == 'stream') {

            let streamId = undefined;
            if (argument.images !== undefined) {
                streamId = _renderer.loadStream(Array.isArray(argument.images) ? argument.images : [argument.images]);
            } else if (argument.shader !== undefined) {
                let shaderId = argument.shader;
                let newStream = _renderer.addShaderStream(shaderId);
                let inputStreamIds = argument.inputs;
                if (inputStreamIds === undefined) {
                    //  no inputs => generator => fetch dimensions from config
                    let dimensions = { w: argument.width, h: argument.height };
                    newStream.setDimensions(dimensions);
                    if (_renderer.windows.streamPxDimensions === undefined) {
                        _renderer.windows.streamPxDimensions = dimensions;
                    }
                } else {
                    newStream.setInputStreamIds(inputStreamIds);
                }
                // } else if (argument.generator !== undefined) {
                //     let shaderId = _renderer.loadShader(argument.generator);
                //     let newStream = _renderer.addShaderStream(shaderId);
                //     let dimensions = { w: argument.width, h: argument.height };
                //     newStream.setDimensions(dimensions);
                //     if (_renderer.windows.streamPxDimensions === undefined) {
                //         _renderer.windows.streamPxDimensions = dimensions;
                //     }
            }
            if (argument.window || _renderer.windows.windows.length == 0) {
                _renderer.addWindow(_renderer.streams.length - 1);
            }
            return streamId;

        } else if (command == 'loadShader') {

            let shaderId = _renderer.loadShader(argument);
            return shaderId;

        } else if (command == 'loadShaderGraphDescription') {

            _renderer.loadShaderGraphDescription(argument);

        } else if (command == 'shaderGraph') {

            let shaderGraphId = _renderer.shaderGraphs.length;
            let shaderGraphDescriptionId = argument.shaderGraphDescriptionId;

            if (_renderer.shaderGraphDescriptions[shaderGraphDescriptionId] === undefined) {
                //  shader graph description not loaded yet --> queue shader graph
                // console.log('queueing shader graph: ' + JSON.stringify(argument));
                argument.shaderGraphId = shaderGraphId;
                _renderer.shaderGraphQueue.push(argument);
            } else {
                _renderer.parseShaderGraph(shaderGraphId, argument);
            }

        } else if (command == 'shader') {

            let shaderId = argument.shaderId;
            if (shaderId === undefined) {
                shaderId = _renderer.loadShader(argument.fileName);
            }
            let newStream = _renderer.addShaderStream(shaderId);
            newStream.bFloat = (argument.parameters['float'] === undefined ? true : argument.parameters['float']);
            delete argument.parameters['float'];
            if (argument.inputs !== undefined) {
                let inputStreamIds = argument.inputs;
                if (inputStreamIds !== undefined) {
                    newStream.setInputStreamIds(inputStreamIds);
                }
            }
            if (argument.parameters !== undefined) {
                for (let key of Object.keys(argument.parameters)) {
                    // console.log('key: ' + key);
                    newStream.apiParameters[key] = argument.parameters[key];
                }
            }
            if (argument.window) {
                _renderer.addWindow(_renderer.streams.length - 1);
            }
            return shaderId;

        } else if (command == 'generator') {

            let shaderId = argument.shaderId;
            if (shaderId === undefined) {
                shaderId = _renderer.loadShader(argument.fileName);
            }
            let newStream = _renderer.addShaderStream(shaderId);
            newStream.bFloat = (argument.parameters.float === undefined ? true : argument.parameters.float);
            let dimensions = { w: argument.parameters.width, h: argument.parameters.height };
            newStream.setDimensions(dimensions);
            if (_renderer.windows.streamPxDimensions === undefined) {
                _renderer.windows.streamPxDimensions = dimensions;
            }
            if (argument.window) {
                _renderer.addWindow(_renderer.streams.length - 1);
            }
            return shaderId;

        } else if (command == 'window') {

            let streamId = argument;
            if (streamId >= 0 && streamId < _renderer.streams.length) {
                _renderer.addWindow(streamId);
            }

        }
    }

    //  for async handling of API commands (renderer might not be initialized at API command issue)
    let _APIQueue = [];

    let _consumeAPICommands = function () {
        while (_APIQueue.length > 0) {
            let command = _APIQueue.shift();
            _executeAPICommand(command);
            // if (!_executeAPICommand(command)) {
                // _APIQueue.unshift(command);
            // }
        }
    }

    let _apiCommand = function (apiCommand) {
        console.log('API: ' + JSON.stringify(apiCommand));
        if (_renderer === undefined) {
            _APIQueue.push(apiCommand);
        } else {
            //  consume prior commands (if any)
            _consumeAPICommands();
            return _executeAPICommand(apiCommand);
        }
    }

    let _init = function () {
        addStyles();
        _renderer = new NvisRenderer();
        _renderer.start();
        _consumeAPICommands();
    }

    window.onload = _init;

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

    let VideoToFramesMethod = {
        fps: 0,
        totalFrames: 1
    };

    class NvisVideoParser {

        static canvas = document.createElement('canvas');
        static context = NvisVideoParser.canvas.getContext('2d');

        constructor(callback, amount = 10, type = VideoToFramesMethod.fps) {
            this.frames = [];
            this.amount = amount;
            this.type = type;
            this.duration = undefined;
            this.dimensions = undefined;
            this.callback = callback;

            this.video = document.createElement('video');
            this.video.preload = 'auto';
        }

        getVideoFrame(video, context, time) {
            let self = this;
            return new Promise((resolve, reject) => {
                let eventCallback = function (event) {
                    video.removeEventListener('seeked', eventCallback);
                    self.storeFrame(video, context, resolve);
                };
                video.addEventListener('seeked', eventCallback);
                video.currentTime = time.toString();
                _renderer.popupInfo('Decoding video: ' + (self.frames.length + 1) + ' frames (' + video.currentTime.toFixed(1) + 's)')
            });
        }

        storeFrame(video, context, resolve) {
            context.drawImage(this.video, 0, 0, this.video.videoWidth, this.video.videoHeight);
            resolve(context.getImageData(0, 0, this.video.videoWidth, this.video.videoHeight));
        }


        fromFile(fileName) {
            let self = this;
            this.fileName = fileName;

            let xhr = new XMLHttpRequest();
            xhr.open('GET', fileName);
            xhr.responseType = 'blob';
            xhr.setRequestHeader('Cache-Control', 'no-cache, no-store, max-age=0');
            xhr.onload = function () {
                if (this.status == 200 && this.response !== null) {
                    self.fromBlob(this.response, fileName);
                }
            }
            xhr.send();
        }

        // fromFile2(fileName) {
        //     let self = this;
        //     this.fileName = fileName;

        //     this.video.addEventListener('loadeddata', async function() {
        //         self.dimensions = {
        //             w: self.video.videoWidth,
        //             h: self.video.videoHeight
        //         };
        //         NvisVideoParser.canvas.width = self.video.videoWidth;
        //         NvisVideoParser.canvas.height = self.video.videoHeight;

        //         self.duration = self.video.duration;
        //         let totalFrames = self.amount;
        //         if (self.type === VideoToFramesMethod.fps) {
        //             totalFrames = self.duration * self.amount;
        //         }
        //         for (let time = 0; time < self.duration; time += self.duration / totalFrames) {
        //             let frame = await self.getVideoFrame(self.video, NvisVideoParser.context, time);
        //             self.frames.push(frame);
        //         }
        //         console.log('#frames: ' + self.frames.length);

        //         self.callback(self.frames);
        //         //resolve(frames);
        //     });

        //     this.video.src = this.fileName;
        //     this.video.load();
        // }


        fromBlob(videoFile, fileName = '') {
            let self = this;

            // if (!(videoFile instanceof Blob))
            //     throw new Error('`videoFile` must be a Blob or File object.'); // The `File` prototype extends the `Blob` prototype, so `instanceof Blob` works for both.
            // if (!(this.video instanceof HTMLVideoElement))
            //     throw new Error('`video` must be a <video> element.');

            const newObjectUrl = URL.createObjectURL(videoFile);

            // URLs created by `URL.createObjectURL` always use the `blob:` URI scheme: https://w3c.github.io/FileAPI/#dfn-createObjectURL
            const oldObjectUrl = this.video.currentSrc;
            if (oldObjectUrl && oldObjectUrl.startsWith('blob:')) {
                // It is very important to revoke the previous ObjectURL to prevent memory leaks. Un-set the `src` first.
                // See https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL

                this.video.src = '';
                URL.revokeObjectURL(oldObjectUrl);
            }

            this.video.addEventListener('loadeddata', async function () {
                self.dimensions = {
                    w: self.video.videoWidth,
                    h: self.video.videoHeight
                };
                NvisVideoParser.canvas.width = self.video.videoWidth;
                NvisVideoParser.canvas.height = self.video.videoHeight;

                self.duration = self.video.duration;
                let totalFrames = self.amount;
                if (self.type === VideoToFramesMethod.fps) {
                    totalFrames = self.duration * self.amount;
                }
                let frameRate = _settings.videoFPS.value;
                totalFrames = self.duration * frameRate;  //  TODO: figure out frame rate of video (assuming 30 FPS for now)
                let frameTime = 1.0 / frameRate;
                let numFrames = 0;
                for (let time = 0; time < self.duration && numFrames < _settings.videoMaxFrames.value; time += frameTime) {
                    let frame = await self.getVideoFrame(self.video, NvisVideoParser.context, time);
                    self.frames.push(frame);
                    numFrames++;
                }
                // console.log('#frames: ' + self.frames.length);

                let name = (videoFile.name === undefined ? fileName : videoFile.name);
                self.callback(name, self.frames);
                //resolve(frames);
            });

            // Then set the new URL:
            this.video.src = newObjectUrl;

            // And load it:
            this.video.load(); // https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/load
        }
    }


    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////


    class NvisDraw {

        constructor(glContext, mode = 'lines') {
            this.glContext = glContext;

            let gl = this.glContext;

            //  TODO: make dynamic, or as input to constructor
            const MaxVertices = 1024;

            this.mode = gl.LINES;

            switch (mode) {
                case 'points':
                    this.mode = gl.POINTS;
                    break;
                case 'linestrip':
                    this.mode = gl.LINE_STRIP;
                    break;
                case 'lineloop':
                    this.mode = gl.LINE_LOOP;
                    break;
                case 'triangles':
                    this.mode = gl.TRIANGLES;
                    break;
                case 'trianglestrip':
                    this.mode = gl.TRIANGLE_STRIP;
                    break;
                case 'texturequad':
                    this.mode = gl.TRIANGLE_STRIP;
                    break;
                case 'trianglefan':
                    this.mode = gl.TRIANGLE_FAN;
                    break;
                case 'widelineloop':  //  our own, used for wide lines
                    this.mode = gl.TRIANGLE_STRIP;
                    break;
                case 'lines':
                default:
                    this.mode = gl.LINES;
                    break;
            }

            this.pointSize = 1.0;

            this.vertexPositionBuffer = gl.createBuffer();
            this.colorValueBuffer = gl.createBuffer();

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

            this.vertexSourceTexture = `#version 300 es
            precision highp float;
            in vec2 aVertexPosition;
            in vec2 aTextureCoord;
            out vec2 vTextureCoord;
            void main()
            {
                gl_Position = vec4(aVertexPosition, 0.0, 1.0);
                vTextureCoord = aTextureCoord;
            }`;

            this.fragmentSourceTexture = `#version 300 es
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

            this.vertexShader = gl.createShader(gl.VERTEX_SHADER);
            this.fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
            this.shaderProgram = gl.createProgram();

            gl.shaderSource(this.vertexShader, this.vertexSource);
            gl.compileShader(this.vertexShader);
            if (!gl.getShaderParameter(this.vertexShader, gl.COMPILE_STATUS)) {
                alert('WebGL: ' + gl.getShaderInfoLog(this.vertexShader));
            }
            gl.shaderSource(this.fragmentShader, this.fragmentSource);
            gl.compileShader(this.fragmentShader);
            if (!gl.getShaderParameter(this.fragmentShader, gl.COMPILE_STATUS)) {
                alert('WebGL: ' + gl.getShaderInfoLog(this.fragmentShader));
            }

            gl.attachShader(this.shaderProgram, this.vertexShader);
            gl.attachShader(this.shaderProgram, this.fragmentShader);
            gl.linkProgram(this.shaderProgram);

            if (!gl.getProgramParameter(this.shaderProgram, gl.LINK_STATUS)) {
                alert('WebGL: ' + gl.getProgramInfoLog(this.shaderProgram));
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
                gl.uniform1f(gl.getUniformLocation(this.shaderProgram, 'uPointSize'), this.pointSize);
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

    class NvisQuadDraw {

        constructor(glContext) {
            this.glContext = glContext;

            let gl = this.glContext;

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

            this.fragmentSource = `#version 300 es
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

            this.vertexPositions = new Float32Array([-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0]);
            this.vertexPositionBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.vertexPositions, gl.STATIC_DRAW);

            this.textureCoordinates = new Float32Array([0.5, 0.5, 1.0, 0.5, 0.5, 1.0, 1.0, 1.0]);
            this.textureCoordinateBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.textureCoordinateBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.textureCoordinates, gl.STATIC_DRAW);

            this.vertexShader = gl.createShader(gl.VERTEX_SHADER);
            this.fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
            this.shaderProgram = gl.createProgram();

            gl.shaderSource(this.vertexShader, this.vertexSource);
            gl.compileShader(this.vertexShader);
            if (!gl.getShaderParameter(this.vertexShader, gl.COMPILE_STATUS)) {
                alert('WebGL: ' + gl.getShaderInfoLog(this.vertexShader));
            }

            gl.shaderSource(this.fragmentShader, this.fragmentSource);
            gl.compileShader(this.fragmentShader);
            if (!gl.getShaderParameter(this.fragmentShader, gl.COMPILE_STATUS)) {
                alert('WebGL: ' + gl.getShaderInfoLog(this.fragmentShader));
            }

            gl.attachShader(this.shaderProgram, this.vertexShader);
            gl.attachShader(this.shaderProgram, this.fragmentShader);
            gl.linkProgram(this.shaderProgram);

            if (!gl.getProgramParameter(this.shaderProgram, gl.LINK_STATUS)) {
                alert('WebGL: ' + gl.getProgramInfoLog(this.shaderProgram));
            }
        }


        resize(stream, window, destination) {
            let gl = this.glContext;

            for (let i = 0; i < 8; i++) {
                this.vertexPositions[i] = window.vertexPositions[i] + 0.1;
            }

            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.vertexPositions, gl.STATIC_DRAW);

            let streamDim = stream.dimensions;

            let dw = destination.x / streamDim.w;
            let dh = destination.y / streamDim.h;

            //  top-left
            this.textureCoordinates[0] = dw;
            this.textureCoordinates[1] = dh;
            //  top-right
            this.textureCoordinates[2] = 1.0;
            this.textureCoordinates[3] = dh;
            //  bottom-left
            this.textureCoordinates[4] = dw;
            this.textureCoordinates[5] = 1.0;
            //  bottom-right
            this.textureCoordinates[6] = 1.0;
            this.textureCoordinates[7] = 1.0;

            gl.bindBuffer(gl.ARRAY_BUFFER, this.textureCoordinateBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.textureCoordinates, gl.STATIC_DRAW);
        }


        render(stream) {
            let gl = this.glContext;

            gl.useProgram(this.shaderProgram);

            let aVertexPosition = gl.getAttribLocation(this.shaderProgram, 'aVertexPosition');
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);
            gl.vertexAttribPointer(aVertexPosition, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(aVertexPosition);

            let aTextureCoord = gl.getAttribLocation(this.shaderProgram, 'aTextureCoord');
            gl.bindBuffer(gl.ARRAY_BUFFER, this.textureCoordinateBuffer);
            gl.vertexAttribPointer(aTextureCoord, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(aTextureCoord);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, stream.outputTexture);

            let uSampler = gl.getUniformLocation(this.shaderProgram, 'uSampler');
            gl.uniform1i(uSampler, 0);

            // gl.enable(gl.BLEND);
            // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }
    }


    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////


    class NvisSegmentDrawer extends NvisDraw {

        constructor(glContext) {
            super(glContext, 'trianglestrip');

            this.color = { r: 0.8, g: 0.8, b: 0.8, a: 1.0 };

        }

        addVertex(position, color = { r: 1.0, g: 1.0, b: 1.0, a: 1.0 }) {
            super.addVertex(position, color);
        }

    }


    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////


    class NvisGridDrawer extends NvisDraw {

        constructor(glContext) {
            super(glContext, 'lines');

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

            // console.log('NvisGridDrawer():  offset = ' + JSON.stringify(offset) + ', pixelSize = ' + JSON.stringify(pixelSize));
            // console.log('NvisGridDrawer():  dim = ' + JSON.stringify(dim) + ', alpha = ' + alpha);

            this.offset = offset;
            this.pixelSize = pixelSize;

            this.clear();

            // let value = 0.6;
            this.color.r = alpha;
            this.color.g = alpha;
            this.color.b = alpha;
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
            this.area = new NvisDraw(glContext, 'trianglestrip');
            this.border = new NvisDraw(glContext, 'lines');

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

    class NvisBoundingBox {

        constructor(x, y, width, height) {
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
        }

        inside(point) {
            return (point.x >= this.x && point.x <= this.x + this.width && point.y >= this.y && point.y <= this.y + this.height);
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////


    class NvisAnnotation extends NvisDraw {

        constructor(glContext, type, parameters = {}) {
            if (type == 'arrow') {
                super(glContext, 'trianglefan');
            } else if (type == 'circle') {
                super(glContext, 'trianglestrip');
            } else if (type == 'rectangle') {
                super(glContext, 'trianglestrip');
            } else if (type == 'inset') {
                super(glContext, 'trianglestrip');
                this.quadDrawer = new NvisQuadDraw(glContext);
            }

            this.type = type;

            this.position = parameters.position;
            this.color = (parameters.color === undefined ? new NvisColor({ r: 1.0, g: 0 - 0, b: 0.0 }) : new NvisColor(parameters.color));

            this.size = (parameters.size === undefined ? 25.0 : parameters.size);
            this.rotation = (parameters.rotation === undefined ? 0 : parameters.rotation);
            this.dimensions = (parameters.dimensions === undefined ? { w: 50, h: 40 } : parameters.dimensions);
            this.radius = (parameters.radius === undefined ? 10.0 : parameters.radius);
            this.width = (parameters.width === undefined ? 5.0 : parameters.width);
            this.zoom = (parameters.zoom === undefined ? true : parameters.zoom);
            this.source = parameters.source;
            this.destination = parameters.destination;
        }


        description() {
            let desc = this.type;
            if (this.type == 'arrow') {
                desc += ' with size ' + this.size + ' and rotation ' + this.rotation;
                desc += ' at (' + this.position.x + ', ' + this.position.y + ')';
            } else if (this.type == 'circle') {
                desc += ' with radius ' + this.radius;
                desc += ' at (' + this.position.x + ', ' + this.position.y + ')';
            } else if (this.type == 'rectangle') {
                desc += ' with dims ' + this.dimensions.w + 'x' + this.dimensions.h;
                desc += ' at (' + this.dimensions.x + ', ' + this.dimensions.y + ')';
            } else if (this.type == 'inset') {
                desc += ' with source (' + this.source.x + ', ' + this.source.y + ') dims (' + this.source.w + ',' + this.source.h + ')';
            }
            return desc;
        }


        //  TODO: optimize...
        pixelSize(canvas) {
            let layout = _state.layout;
            let z = _state.zoom.level;
            let layoutDims = layout.getDimensions();
            let winDim = { w: canvas.width / layoutDims.w, h: canvas.height / layoutDims.h };

            let pixelSize = {
                w: z / (winDim.w * layoutDims.w),
                h: z / (winDim.h * layoutDims.h)
            }

            return pixelSize;
        }


        streamPxToTextureCoords(pos, canvas, stream) {
            //  TODO: optimize...
            let layout = _state.layout;
            let layoutDims = layout.getDimensions();
            let winDim = { w: canvas.width / layoutDims.w, h: canvas.height / layoutDims.h };

            let z = _state.zoom.level;
            let sd = stream.getDimensions();
            let ww = winDim.w;
            let wh = winDim.h;

            let so = _state.zoom.streamOffset;

            let pixelSize = {
                w: z / (ww * layoutDims.w),
                h: z / (wh * layoutDims.h)
            }

            let offset = {
                x: (pos.x - so.x * sd.w + 0.5) * pixelSize.w,
                y: (pos.y - so.y * sd.h + 0.5) * pixelSize.h,
            }

            return { pixelSize: pixelSize, offset: offset };
        }


        rotate(point, alphaDegrees) {
            let alpha = -alphaDegrees * (Math.PI / 180);
            let cosAlpha = Math.cos(alpha);
            let sinAlpha = Math.sin(alpha);
            return { x: point.x * cosAlpha - point.y * sinAlpha, y: point.x * sinAlpha + point.y * cosAlpha };
        }


        update(canvas, stream, window, boundingBox) {
            let ar = (canvas.width / canvas.height);

            this.clear();

            if (this.type == 'arrow') {

                let p = this.streamPxToTextureCoords(this.position, canvas, stream);
                let ps = p.pixelSize;
                let o = p.offset;
                o.x += boundingBox.x;
                o.y += boundingBox.y;

                if (!boundingBox.inside(o)) {
                    return;
                }

                let s = this.size * (ps.w / 3.0);
                if (!this.zoom) {
                    s /= _state.zoom.level;
                }

                let r0 = this.rotate({ x: s, y: s }, this.rotation);
                let r1 = this.rotate({ x: s, y: s * 0.5 }, this.rotation);
                let r2 = this.rotate({ x: s * 3.0, y: s * 0.5 }, this.rotation);
                let r3 = this.rotate({ x: s * 3.0, y: -s * 0.5 }, this.rotation);
                let r4 = this.rotate({ x: s, y: -s * 0.5 }, this.rotation);
                let r5 = this.rotate({ x: s, y: -s }, this.rotation);
                this.addVertex(o, this.color);
                this.addVertex({ x: o.x + r0.x, y: o.y + r0.y * ar }, this.color);
                this.addVertex({ x: o.x + r1.x, y: o.y + r1.y * ar }, this.color);
                this.addVertex({ x: o.x + r2.x, y: o.y + r2.y * ar }, this.color);
                this.addVertex({ x: o.x + r3.x, y: o.y + r3.y * ar }, this.color);
                this.addVertex({ x: o.x + r4.x, y: o.y + r4.y * ar }, this.color);
                this.addVertex({ x: o.x + r5.x, y: o.y + r5.y * ar }, this.color);

            } else if (this.type == 'circle') {

                let p = this.streamPxToTextureCoords(this.position, canvas, stream);
                let ps = p.pixelSize;
                let o = p.offset;
                o.x += boundingBox.x;
                o.y += boundingBox.y;

                if (!boundingBox.inside(o)) {
                    return;
                }

                let r = this.radius;
                let w = (this.radius + this.width);

                r *= ps.w;
                w *= ps.w;

                if (!this.zoom) {
                    r /= _state.zoom.level;
                    w /= _state.zoom.level;
                }

                let steps = 30;
                let alphaStep = 360 / steps;
                let ss = { x: 1.0, y: 0 };
                for (let i = 0; i < steps; i++) {
                    let rv = this.rotate(ss, i * alphaStep);
                    rv.y = ar * rv.y;
                    let p0 = { x: o.x + r * rv.x, y: o.y + r * rv.y };
                    let p1 = { x: o.x + w * rv.x, y: o.y + w * rv.y };
                    this.addVertex(p0, this.color);
                    this.addVertex(p1, this.color);
                }
                this.addVertex({ x: o.x + r, y: o.y }, this.color)
                this.addVertex({ x: o.x + w, y: o.y }, this.color)

            } else if (this.type == 'rectangle') {

                let p = this.streamPxToTextureCoords({ x: this.dimensions.x + (this.dimensions.w - 1) / 2.0, y: this.dimensions.y + (this.dimensions.h - 1) / 2.0 }, canvas, stream);
                let o = p.offset;
                let ps = p.pixelSize;

                o.x += boundingBox.x;
                o.y += boundingBox.y;

                if (!boundingBox.inside(o)) {
                    return;
                }

                let d = { w: this.dimensions.w / 2.0, h: this.dimensions.h / 2.0 };
                let dw = d.w * ps.w;
                let dh = d.h * ps.h;
                let hw = ps.w * this.width / 2.0;

                if (!this.zoom) {
                    dw /= _state.zoom.level;
                    dh /= _state.zoom.level;
                    hw /= _state.zoom.level;
                }

                let r = [];
                r.push({ x: -dw - hw, y: -dh - hw });  //  1
                r.push({ x: -dw + hw, y: -dh + hw });  //  2
                r.push({ x: dw + hw, y: -dh - hw });  //  3
                r.push({ x: dw - hw, y: -dh + hw });  //  4
                r.push({ x: dw + hw, y: dh + hw });  //  5
                r.push({ x: dw - hw, y: dh - hw });  //  6
                r.push({ x: -dw - hw, y: dh + hw });  //  7
                r.push({ x: -dw + hw, y: dh - hw });  //  8
                r.push({ x: -dw - hw, y: -dh - hw });  //  9
                r.push({ x: -dw + hw, y: -dh + hw });  //  10

                for (let i = 0; i < r.length; i++) {
                    this.addVertex({ x: o.x + r[i].x, y: o.y + r[i].y }, this.color);
                }

            } else if (this.type == 'inset') {

                let w = window;

                let bNeg = {
                    x: this.destination.x < 0 || Object.is(this.destination.x, -0),
                    y: this.destination.y < 0 || Object.is(this.destination.y, -0),
                }
                let pos = {
                    x: (bNeg.x ? stream.dimensions.w + this.destination.x - this.destination.w : this.destination.x),
                    y: (bNeg.y ? stream.dimensions.h + this.destination.y - this.destination.h : this.destination.y)
                };

                let p = this.streamPxToTextureCoords({ x: pos.x + (this.destination.w - 1) / 2.0, y: pos.y + (this.destination.h - 1) / 2.0 }, canvas, stream);
                let o = p.offset;
                let ps = p.pixelSize;

                o.x += boundingBox.x;
                o.y += boundingBox.y;

                if (!boundingBox.inside(o)) {
                    return;
                }

                let d = { w: this.destination.w / 2.0, h: this.destination.h / 2.0 };
                let dw = d.w * ps.w;
                let dh = d.h * ps.h;
                let hw = ps.w * this.width / 2.0;

                if (!this.zoom) {
                    dw /= _state.zoom.level;
                    dh /= _state.zoom.level;
                    hw /= _state.zoom.level;
                }

                let r = [];
                r.push(this.rotate({ x: -dw - hw, y: -dh - hw }, this.rotation));  //  1
                r.push(this.rotate({ x: -dw + hw, y: -dh + hw }, this.rotation));  //  2
                r.push(this.rotate({ x: dw + hw, y: -dh - hw }, this.rotation));  //  3
                r.push(this.rotate({ x: dw - hw, y: -dh + hw }, this.rotation));  //  4
                r.push(this.rotate({ x: dw + hw, y: dh + hw }, this.rotation));  //  5
                r.push(this.rotate({ x: dw - hw, y: dh - hw }, this.rotation));  //  6
                r.push(this.rotate({ x: -dw - hw, y: dh + hw }, this.rotation));  //  7
                r.push(this.rotate({ x: -dw + hw, y: dh - hw }, this.rotation));  //  8
                r.push(this.rotate({ x: -dw - hw, y: -dh - hw }, this.rotation));  //  9
                r.push(this.rotate({ x: -dw + hw, y: -dh + hw }, this.rotation));  //  10

                for (let i = 0; i < r.length; i++) {
                    this.addVertex({ x: o.x + r[i].x, y: o.y + r[i].y }, this.color);
                }

            }

        }

    }


    class NvisAnnotations {

        constructor(glContext) {
            this.glContext = glContext;

            this.annotations = [];
        }

        add(type, parameters) {
            let annotation = new NvisAnnotation(this.glContext, type, parameters);
            this.annotations.push(annotation);
        }

        update(canvas, stream, window, boundingBox) {
            for (let annotationId = 0; annotationId < this.annotations.length; annotationId++) {
                this.annotations[annotationId].update(canvas, stream, window, boundingBox);
            }
        }

        render(canvas, stream, window, boundingBox) {
            this.update(canvas, stream, window, boundingBox);
            for (let annotationId = 0; annotationId < this.annotations.length; annotationId++) {
                let annotation = this.annotations[annotationId];
                annotation.render();
                if (annotation.quadDrawer !== undefined) {
                    annotation.quadDrawer.resize(stream, window, annotation.destination);
                    annotation.quadDrawer.render(stream);
                }
            }
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////


    class NvisShader {

        constructor(glContext, parameters = {}) {

            this.glContext = glContext;
            this.json = parameters.json;
            this.callback = parameters.callback;
            this.fragmentSource = parameters.source;

            this.jsonObject = {};
            this.name = undefined;
            this.fileName = undefined;
            this.numInputs = undefined;
            this.bHidden = (parameters.hidden === undefined ? false : parameters.hidden);

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
                this.numInputs = (config.inputs === undefined ? 0 : config.inputs);

                // this.name = (config === undefined ? 'Stream' : config.name);
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
                alert('WebGL: ' + gl.getShaderInfoLog(shader));
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
                alert('Could not initialize shader!');
            }
            if (this.callback !== undefined) {
                this.callback();
            }
        }

        loadFragmentSource(fileName) {
            let self = this;

            this.bFragmentReady = false;

            let xhr = new XMLHttpRequest();
            xhr.open('GET', fileName);
            xhr.responseType = 'text';
            xhr.setRequestHeader('Cache-Control', 'no-cache, no-store, max-age=0');
            xhr.onload = function (event) {
                if (this.status == 200 && this.responseText !== null) {
                    console.log('=====  Shader loaded (' + fileName + ')');
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
            uniform bool uAlphaCheckerboard;
            out vec4 color;

            float modi(float a, float b) {
                return floor(a - floor((a + 0.5) / b) * b);
            }

            void main()
            {
                if (vTextureCoord.x < 0.0 || vTextureCoord.x > 1.0 || vTextureCoord.y < 0.0 || vTextureCoord.y > 1.0) {
                    color = vec4(0.1, 0.1, 0.1, 1.0);
                    return;
                }

                const float GridSize = 16.0;

                vec4 c = texture(uSampler, vTextureCoord);
                color = vec4(c.r, c.g, c.b, 1.0);

                //  gray checkerboard for background
                if (uAlphaCheckerboard && c.a < 1.0)
                {
                    vec2 dimensions = vec2(textureSize(uSampler, 0));
                    vec2 pos = (vTextureCoord * dimensions) / GridSize;
                    float xx = pos.x;
                    float yy = pos.y;
                    vec4 gridColor = vec4(0.6, 0.6, 0.6, 1.0);
                    if (modi(pos.x, 2.0) == 0.0 ^^ modi(pos.y, 2.0) == 0.0) {
                        gridColor = vec4(0.5, 0.5, 0.5, 1.0);
                    }

                    color = gridColor + vec4(color.rgb * color.a, 1.0);
                }
            }`;

            this.streamFragmentSource = `#version 300 es
            precision highp float;
            in vec2 vTextureCoord;
            uniform sampler2D uSampler;
            uniform int uTonemapper;
            uniform float uGamma;
            uniform float uExposure;
            out vec4 color;

            void main()
            {
                color = texture(uSampler, vTextureCoord);

                if (uTonemapper == 0) {
                    float invGamma = 1.0 / uGamma;
                    float exposure = uExposure;
                    color.r = exposure * pow(color.r, invGamma);
                    color.g = exposure * pow(color.g, invGamma);
                    color.b = exposure * pow(color.b, invGamma);
                }

            }`;

            this.textureShader = new NvisShader(glContext, { source: this.textureFragmentSource });
            this.streamShader = new NvisShader(glContext, { source: this.streamFragmentSource });
        }


        new(json = '{}') {
            this.shaders.push(new NvisShader(this.glContext, { json: json }));
        }


        clear() {
            this.shaders = [];
        }

        load(jsonFileName, callback, bHidden = false) {
            let self = this;

            let xhr = new XMLHttpRequest();

            let shaderId = this.shaders.length;
            this.shaders.push(undefined);

            xhr.open('GET', jsonFileName);
            xhr.setRequestHeader('Cache-Control', 'no-cache, no-store, max-age=0');
            xhr.onload = function () {
                if (this.status == 200 && this.responseText !== null) {
                    //  set position of shader, filled in later
                    self.shaders[shaderId] = new NvisShader(self.glContext, {
                        json: this.responseText,
                        callback: callback,
                        hidden: bHidden
                    });
                }
            };
            xhr.send();

            return shaderId;
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
    //                     TINFL_GET_BITS(11, r->m_table_sizes[counter], '\05\05\04'[counter]);
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
    //                         num_extra = '\02\03\07'[dist - 16];
    //                         TINFL_GET_BITS(18, s, num_extra);
    //                         s += '\03\03\013'[dist - 16];
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

    class NvisZlib {

        static deflate(input) {

            let output = new NvisBitBuffer(new ArrayBuffer(input.length * 2));  //  twice the input size should be enough

            const cm = 8;
            const WindowSize = 0x8000;
            const cinfo = Math.LOG2E * Math.log(WindowSize) - 8;
            const cmf = (cinfo << 4) | cm;

            output.writeUint8(cmf);

            const fdict = 0;
            const flevel = 0; //  fastest, TODO: handle Huffman (fixed and dynamic)
            let flags = (flevel << 6) | (fdict << 5);
            const fcheck = 31 - (cmf * 256 + flags) % 31;
            flags |= fcheck;

            output.writeUint8(flags);

            let inputLength = input.length;
            for (let position = 0; position < inputLength;) {
                let blockArray = input.subarray(position, position + 0xffff);
                position += blockArray.length;

                this.deflateBlock(output, blockArray, (position === inputLength));
            }

            //  Adler-32 checksum
            let adler = this.adler32(input);

            output.writeUint8(adler >> 24) & 0xff;
            output.writeUint8(adler >> 16) & 0xff;
            output.writeUint8(adler >>  8) & 0xff;
            output.writeUint8(adler >>  0) & 0xff;

            output.shrinkWrap();

            return output;
        };

        static deflateBlock(output, vBlock, isFinalBlock) {
            //  header
            let bfinal = (isFinalBlock ? 1 : 0);
            let btype = 0;  //  none (so far), TODO: fixed Huffman (1), dynamic Huffman (2)
            output.writeUint8(bfinal | (btype << 1));

            //  length
            let len = vBlock.length;
            let nlen = (~len + 0x10000) & 0xffff;
            output.writeUint16(len);
            output.writeUint16(nlen);

            //  copy data
            output.copyArray(vBlock, 0, vBlock.length);
        }


        static adler32(array, adler = 1) {
            var s1 = adler & 0xffff;
            var s2 = (adler >>> 16) & 0xffff;
            let i = 0;

            const DefaultLength = 1024;

            let length = array.length;
            while (length > 0) {
                let tlen = (length > DefaultLength ? DefaultLength : length);
                length -= tlen;
                do {
                    s1 += array[i++];
                    s2 += s1;
                } while (--tlen);

                s1 %= 65521;
                s2 %= 65521;
            }

            return ((s2 << 16) | s1) >>> 0;
        };

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

        shrinkWrap() {
            let size = this.bytePointer + (this.bitPointer > 0 ? 1 : 0);
            let newView = new Uint8Array(new ArrayBuffer(size));

            for (let i = 0; i < size; i++) {
                newView[i] = this.view.getUint8(i);
            }

            this.bitSize = size * 8;
            this.buffer = newView.buffer;
        }

        consume(buffer, length) {
            for (let i = 0; i < length; i++) {
                this.writeUint8(buffer.readUint8());
            }
        }

        copyArray(array, offset = 0, length = array.length) {
            for (let i = 0; i < length; i++) {
                this.writeUint8(array[offset + i]);
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

        getInt8(byteIndex) {
            return this.view.getInt8(byteIndex);
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

        writeUint32(value) {
            this.view.setUint32(this.bytePointer, value, this.littleEndian);
            this.bytePointer += 4;
        }

        writeInt32(value) {
            this.view.setInt32(this.bytePointer, value, this.littleEndian);
            this.bytePointer += 4;
        }

        readInt32() {
            let value = this.view.getInt32(this.bytePointer, this.littleEndian);
            this.bytePointer += 4;
            return value;
        }

        getUint32(byteIndex) {
            return this.view.getUint32(byteIndex, this.littleEndian);
        }

        setUint32(byteIndex, value) {
            this.view.setUint32(byteIndex, value, this.littleEndian);
        }

        /////////

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

        getFloat32(byteIndex) {
            return this.view.getFloat32(byteIndex, this.littleEndian);
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
            let s = '';
            while ((c = this.readUint8()) != 0) {
                s += String.fromCharCode(c);
            }
            return s;
        }

        writeString(string) {
            for (let i = 0; i < string.length; i++) {
                this.writeUint8(string.charCodeAt(i));
            }
        }

        readLine() {
            let c = String.fromCharCode(this.readUint8());
            let s = '';
            while (c != '\n' && c != '\r') {
                s += c;
                c = String.fromCharCode(this.readUint8());
            }
            return s;
        }
    }


    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////


    class NvisPFMFile {

        //  http://netpbm.sourceforge.net/doc/pfm.html

        constructor(fileName, buffer) {
            this.fileName = fileName;
            this.buffer = new NvisBitBuffer(buffer);

            this.bSuccess = true;
            this.type = this.buffer.readLine();
            const vDims = this.buffer.readLine().split(' ');
            this.dimensions = { w: parseInt(vDims[0]), h: parseInt(vDims[1]) };
            this.scaleEndianess = parseFloat(this.buffer.readLine());
            this.littleEndian = (this.scaleEndianess < 0.0);
            this.buffer.littleEndian = this.littleEndian;

            const dstChannels = 4;
            this.data = new Float32Array(new ArrayBuffer(this.dimensions.w * this.dimensions.h * dstChannels * 4));

            if (this.type == 'PF') {
                //  color
                for (let y = 0; y < this.dimensions.h; y++) {
                    for (let x = 0; x < this.dimensions.w; x++) {
                        let dstLoc = ((this.dimensions.h - y - 1) * this.dimensions.w + x) * dstChannels;
                        this.data[dstLoc + 0] = this.buffer.readFloat32();
                        this.data[dstLoc + 1] = this.buffer.readFloat32();
                        this.data[dstLoc + 2] = this.buffer.readFloat32();
                        this.data[dstLoc + 3] = 1.0;
                    }
                }
            } else if (this.type == 'PF4') {
                //  color
                for (let y = 0; y < this.dimensions.h; y++) {
                    for (let x = 0; x < this.dimensions.w; x++) {
                        let dstLoc = ((this.dimensions.h - y - 1) * this.dimensions.w + x) * dstChannels;
                        this.data[dstLoc + 0] = this.buffer.readFloat32();
                        this.data[dstLoc + 1] = this.buffer.readFloat32();
                        this.data[dstLoc + 2] = this.buffer.readFloat32();
                        this.data[dstLoc + 3] = this.buffer.readFloat32();
                    }
                }
            } else {
                // grayscale
                for (let y = 0; y < this.dimensions.h; y++) {
                    for (let x = 0; x < this.dimensions.w; x++) {
                        let dstLoc = ((this.dimensions.h - y - 1) * this.dimensions.w + x) * dstChannels;
                        let color = this.buffer.readFloat32();
                        this.data[dstLoc + 0] = color;
                        this.data[dstLoc + 1] = color;
                        this.data[dstLoc + 2] = color;
                        this.data[dstLoc + 3] = 1.0;
                    }
                }
            }
        }

        toFloatArray() {
            return this.data;
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

            this.bSuccess = true;
            let b = this.buffer;

            const bDebug = false;

            let magicNumber = b.readInt32();  //  should be decimal 20000630
            let versionField = b.readInt32();
            let version = {
                version: (versionField & 0xf),
                singleTile: (((versionField >> (9 - 1)) & 1) == 1),
                longNames: (((versionField >> (10 - 1)) & 1) == 1),
                nonImage: (((versionField >> (11 - 1)) & 1) == 1),
                multiPart: (((versionField >> (12 - 1)) & 1) == 1),
            }
            if (bDebug) {
                console.log('Magic number: ' + magicNumber);
                console.log('Version field: ' + JSON.stringify(version));
            }

            //  attributes
            this.attributes = {};
            while (b.peekUint8() != 0) {
                let attrib = this.readAttribute();
                this.attributes[attrib.name] = attrib;
            }
            b.skip();

            if (bDebug) {
                console.log(JSON.stringify(this.attributes));
            }

            //  offset table
            this.scanLinesPerChunk = EXR_NO_COMPRESSION_SCANLINES;
            this.offsetTable = [];
            let dataWindowBox = this.attributes.dataWindow.values;
            let numOffsets = dataWindowBox.yMax - dataWindowBox.yMin + 1;
            let compression = this.attributes['compression'].value;

            //  TODO: implement missing compression methods
            if (compression != EXR_NO_COMPRESSION && compression != EXR_ZIP_COMPRESSION) {
                alert('EXR compression method not implemented!');
                this.bSuccess = false;
                return;
            }

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
            // console.log('Total output buffer size: ' + outputSize);

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

            if (compression == EXR_ZIP_COMPRESSION) {
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

                    //console.log('   scanLine: ' + scanLine + ', dataSize: ' + dataSize);

                    let z = {};

                    //  https://datatracker.ietf.org/doc/html/rfc1950

                    // let atBit = (b.bytePointer * 8 + b.bitPointer);
                    // console.log('at bit: ' + atBit);

                    let CMF = b.readUint8();
                    let FLG = b.readUint8();
                    //console.log('CMF: ' + CMF + ', FLG: ' + FLG + ', next: 0x' + b.peekUint8().toString(16));
                    z.cmf = {};
                    z.cmf.cm = NvisBitBuffer.bits(CMF, 3, 0);  //  compression method, should be = 8
                    z.cmf.info = NvisBitBuffer.bits(CMF, 7, 4);  //   base-2 logarithm of the LZ77 window size, minus eight (CINFO=7 indicates a 32K window size)
                    z.flg = {};
                    z.flg.fcheck = NvisBitBuffer.bits(FLG, 4, 0);  //  to make (CMF * 256 + FLG % 31) == 0
                    z.flg.fdict = NvisBitBuffer.bits(FLG, 5, 5);  //
                    z.flg.flevel = NvisBitBuffer.bits(FLG, 7, 6);  //  0: fastest, 1: fast, 2: default, 3: maximum/slowest
                    z.dictId = (z.flg.fdict == 1 ? b.readUint32() : undefined);

                    if (bDebug) {
                        console.log(JSON.stringify(z));
                    }

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
                                console.log('ERROR: Raw block header LEN/NLEN mismatch!');
                            }

                            this.outputBuffer.consume(b, len);
                            continue;
                        }

                        if (blockType == 3) {
                            //  reserved (error)
                            console.log('ERROR: Reserved block type (3)');
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
                                console.log('TODO: handle blocks compressed with fixed Huffman codes');
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
                                    console.log('ERROR: Huffman table generation (1)');
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
                                            console.log('ERROR: Huffman table generation (2)')
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
                                        console.log('ERROR: Huffman table generation (3)')
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
                                        console.log('Attempting to write outside output buffer!');
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
                                if (bDebug) {
                                    console.log('DONE!');
                                }
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


                        // let s = '';
                        // s += scanLine + ', ' + dataSize;
                        // s += ', z: ' + JSON.stringify(z);
                        // // for (let i = 0; i < 10; i++)
                        // //     s += ', 0x' + b.readUint8().toString(16);
                        // console.log(s);
                        // console.log('bFinalBlock: ' + bFinalBlock + ', blockType: ' + blockType);

                    } while (!bFinalBlock);

                }

                //  EXR postprocess for ZIP and RLE
                let numChunks = Math.round(this.dimensions.h / this.scanLinesPerChunk);
                let trailingScanLines = this.dimensions.h % this.scanLinesPerChunk;
                let trailingChunkSize = trailingScanLines * this.dimensions.w * this.pixelSize;
                let baseChunkSize = this.scanLinesPerChunk * this.dimensions.w * this.pixelSize;
                //let baseHalfChunkSize = Math.floor((baseChunkSize + 1) / 2);
                let tmpBuffer = new NvisBitBuffer(new ArrayBuffer(baseChunkSize));

                for (let chunkId = 0; chunkId < numChunks; chunkId++) {

                    //  predictor
                    let chunkIndex = chunkId * baseChunkSize;

                    let chunkSize = (chunkId == numChunks - 1 && trailingChunkSize > 0 ? trailingChunkSize : baseChunkSize);
                    let halfChunkSize = Math.floor((chunkSize + 1) / 2);

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

                    this.outputBuffer.copy(tmpBuffer, chunkIndex, chunkSize);
                }
                return;
            }

            if (compression == EXR_PIZ_COMPRESSION) {
                //  Copyright (c) 2004, Industrial Light & Magic, a division of Lucas Digital Ltd. LLC)
                //  (3-clause BSD license)



                return;
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

            if (attrib.type == 'box2i') {
                attrib.values = {
                    xMin: b.readInt32(),
                    yMin: b.readInt32(),
                    xMax: b.readInt32(),
                    yMax: b.readInt32()
                }
            }

            if (attrib.type == 'box2f') {
                attrib.values = {
                    xMin: b.readFloat32(),
                    yMin: b.readFloat32(),
                    xMax: b.readFloat32(),
                    yMax: b.readFloat32()
                }
            }

            if (attrib.type == 'chlist') {
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

            if (attrib.type == 'chromaticities') {
                attrib.values = {
                    redX: b.readFloat32(),
                    redY: b.readFloat32(),
                    greenX: b.readFloat32(),
                    greenY: b.readFloat32(),
                    blueX: b.readFloat32(),
                    blueY: b.readFloat32(),
                    whiteX: b.readFloat32(),
                    whiteY: b.readFloat32(),
                };
            }

            if (attrib.type == 'compression') {
                attrib.value = b.readUint8();
            }

            if (attrib.type == 'double') {
            }
            if (attrib.type == 'envmap') {
            }

            if (attrib.type == 'float') {
                attrib.value = b.readFloat32();
            }

            if (attrib.type == 'int') {
                attrib.value = b.readUint32();
            }

            if (attrib.type == 'keycode') {
            }

            if (attrib.type == 'lineOrder') {
                attrib.value = b.readUint8();
            }

            if (attrib.type == 'm33f') {
            }
            if (attrib.type == 'm44f') {
                attrib.values = [];
                for (let y = 0; y < 4; y++) {
                    for (let x = 0; x < 4; x++) {
                        attrib.values.push(b.readFloat32());
                    }
                }
            }
            if (attrib.type == 'preview') {
            }
            if (attrib.type == 'rational') {
            }
            if (attrib.type == 'string') {
            }
            if (attrib.type == 'stringvector') {
            }
            if (attrib.type == 'tiledesc') {
            }
            if (attrib.type == 'timecode') {
            }

            if (attrib.type == 'v2i') {
                attrib.values = {
                    x: b.readInt32(),
                    y: b.readInt32()
                }
            }

            if (attrib.type == 'v2f') {
                attrib.values = {
                    x: b.readFloat32(),
                    y: b.readFloat32()
                }
            }

            if (attrib.type == 'v3i') {
            }
            if (attrib.type == 'v3f') {
            }

            return attrib;
        }

        toFloatArray() {
            let data = new Float32Array(new ArrayBuffer(this.dimensions.w * this.dimensions.h * 4 * 4));  //  w x h x RGBA x float

            const ChannelMap = {
                'R': 0,
                'G': 1,
                'B': 2,
                'A': 3
            };
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
                        if (channel.pixelType == EXR_UINT) {
                            value = this.outputBuffer.getUint32();
                        } else if (channel.pixelType == EXR_HALF) {
                            value = this.outputBuffer.getFloat16(srcLoc);
                        } else {
                            value = this.outputBuffer.getFloat32(srcLoc);
                        }
                        data[dstLoc + ChannelMap[channel.name]] = value;
                    }
                    data[dstLoc + ChannelMap['A']] = 1.0;  //  alpha
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
        let _directory = '';
        let _name = '';
        let _extension = '';

        let _isNumbered = false;
        let _number = 0;
        let _numberWidth = 4;

        let _init = function () {

        }

        let _zeroPad = function (value, width) {
            let pad = '000000000000000';
            return (pad + value).slice(-width);
        }

        let _toString = function () {
            let string = _directory + '/' + _name;
            if (_isNumbered) {
                string += ('.' + _zeroPad(_number, _numberWidth));
            }
            string += ('.' + _extension);

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


    class NvisUI {

        constructor(id, object, renderer) {
            this.id = id;
            this.object = object;
            this.renderer = renderer;
            this.build();
        }

        createCallbackString(uniqueId, elementId, rowId, bAllConditionsMet, bUpdateUI = true) {
            let callbackString = 'nvis.uiUpdateParameter("' + uniqueId + '", "' + elementId + '", "' + rowId + '", ' + bAllConditionsMet + ', ' + bUpdateUI + ')';
            return callbackString;
        }

        createConfirmCallbackString(uniqueId, elementId, rowId, bAllConditionsMet, bUpdateUI = true) {
            let callbackString = 'if (confirm("Are you sure?")) ' + this.createCallbackString(uniqueId, elementId, rowId, bAllConditionsMet, bUpdateUI);
            return callbackString;
        }

        build() {
            let object = this.object;
            let uniqueId = this.id;

            this.dom = document.createDocumentFragment();

            let table = document.createElement('table');
            //table.className = 'uiTable';

            for (let key of Object.keys(object)) {

                let bConditionMet = true;
                let bAllConditionsMet = true;

                let bConditionNegated = false;
                let conditionVariable = '';
                let conditionValue = '';

                let conditionString = object[key].condition;
                if (conditionString !== undefined) {
                    conditionString = conditionString.replace(/\s+/g, '');
                    let conditionStrings = conditionString.split('&');
                    for (let i = 0; i < conditionStrings.length; i++) {
                        let condition = conditionStrings[i];

                        let equalPosition = condition.lastIndexOf('=');
                        if (equalPosition != -1) {
                            //  numeric conditional
                            bConditionNegated = (condition[equalPosition - 1] == '!');
                            conditionVariable = condition.substring(0, equalPosition - 1);
                            conditionValue = condition.substring(equalPosition + 1);
                            let conditionValues = conditionValue.split(',');
                            bConditionMet = conditionValues.includes(object[conditionVariable].value.toString())
                            bConditionMet = (bConditionNegated ? !bConditionMet : bConditionMet);
                        } else {
                            //  boolean conditional
                            bConditionNegated = (condition[0] == '!');
                            conditionVariable = condition.substring(bConditionNegated ? 1 : 0);
                            bConditionMet = (!bConditionNegated && object[conditionVariable].value) || (bConditionNegated && !object[conditionVariable].value);
                        }
                        bAllConditionsMet &&= bConditionMet;
                    }
                }

                let label = document.createElement('label');
                label.setAttribute('for', key);
                label.innerHTML = object[key].name;

                let elementId = (uniqueId + '-' + key);  //  need uniqueness
                let rowId = elementId + '-row';

                let row = document.createElement('tr');
                row.setAttribute('id', rowId);
                row.style.display = (bAllConditionsMet ? '' : 'none');

                let el = undefined;
                let type = object[key].type;
                let value = object[key].value;

                if (type == 'ruler') {
                    el = document.createElement('hr');
                }
                if (type == 'bool' || type == 'int' || type == 'float') {
                    el = document.createElement('input');
                    el.setAttribute('id', elementId);

                    if (type == 'bool') {

                        el.setAttribute('type', 'checkbox');
                        el.checked = value;
                        if (value) {
                            el.setAttribute('checked', true);
                        }
                        el.addEventListener('change', (event) => {
                            nvis.uiUpdateParameter(uniqueId, elementId, rowId, bAllConditionsMet, true);
                        }, true);

                    } else if (type == 'int') {

                        el.setAttribute('type', 'range');

                        let minValue = object[key].min;
                        if (minValue === undefined) {
                            minValue = 0;  //  TODO: needed?
                        }
                        el.setAttribute('min', minValue);

                        let maxValue = object[key].max;
                        if (maxValue === undefined) {
                            maxValue = 1;  //  TODO: needed?
                        } else if (maxValue == '#windows' && this.renderer.windows !== undefined) {
                            maxValue = this.renderer.windows.windows.length;
                        } else if (maxValue == '#frames') {
                            maxValue = _state.animation.numFrames;
                        }
                        el.setAttribute('max', maxValue);

                        if (value === undefined) {
                            value = 0;
                        } else if (value == '#frames') {
                            value = _state.animation.numFrames;
                        }
                        value = Math.min(Math.max(value, minValue), maxValue);

                        el.setAttribute('value', value);

                        el.setAttribute('step', (object[key].step ? object[key].step : 1));
                        el.addEventListener('input', (event) => {
                            nvis.uiUpdateParameter(uniqueId, elementId, rowId, bAllConditionsMet, false);
                        }, true);
                        let oEl = document.createElement('span');
                        oEl.id = (elementId + '-value');
                        oEl.innerHTML = (oEl.innerHTML == '' ? value : oEl.innerHTML);

                        label.innerHTML += ' (' + oEl.outerHTML + ')';

                    } else if (type == 'float') {

                        el.setAttribute('type', 'range');
                        el.setAttribute('min', (object[key].min ? object[key].min : 0.0));
                        el.setAttribute('max', (object[key].max ? object[key].max : 1.0));
                        el.setAttribute('value', (value ? value : 0.0));
                        el.setAttribute('step', (object[key].step ? object[key].step : 0.1));
                        el.addEventListener('input', (event) => {
                            nvis.uiUpdateParameter(uniqueId, elementId, rowId, bAllConditionsMet, false);
                        }, true);
                        let oEl = document.createElement('span');
                        oEl.id = (elementId + '-value');
                        oEl.innerHTML = (oEl.innerHTML == '' ? value : oEl.innerHTML);

                        label.innerHTML += ' (' + oEl.outerHTML + ')';
                    }
                } else if (type == 'dropdown') {

                    el = document.createElement('select');
                    el.setAttribute('id', elementId);
                    el.addEventListener('change', (event) => {
                        nvis.uiUpdateParameter(uniqueId, elementId, rowId, bAllConditionsMet, false);
                    }, true);
                    for (let optionId = 0; optionId < object[key].alternatives.length; optionId++) {
                        let oEl = document.createElement('option');
                        if (value == optionId) {
                            oEl.setAttribute('selected', true);
                        }
                        oEl.innerHTML = object[key].alternatives[optionId];
                        el.appendChild(oEl);
                    }

                } else if (type == 'button') {

                    el = document.createElement('button');
                    el.setAttribute('id', elementId);
                    el.innerHTML = value;
                    el.addEventListener('click', (event) => {
                        if (confirm('Are you sure?')) {
                            nvis.uiUpdateParameter(uniqueId, elementId, rowId, bAllConditionsMet, false);
                        }
                    }, true);

                }

                if (el !== undefined) {
                    if (type == 'ruler') {
                        let cell = document.createElement('td');
                        cell.setAttribute('colspan', 2);
                        cell.appendChild(el);
                        row.appendChild(cell);
                    } else if (type == 'bool' || type == 'button') {
                        let cell = document.createElement('td');
                        cell.setAttribute('colspan', 2);

                        cell.appendChild(el);
                        cell.appendChild(label);

                        row.appendChild(cell);
                    } else {
                        let elCell = document.createElement('td');
                        elCell.appendChild(el);
                        let labelCell = document.createElement('td');
                        labelCell.appendChild(label);

                        row.appendChild(elCell);
                        row.appendChild(labelCell);
                    }

                    table.appendChild(row);
                }
            }

            this.dom.appendChild(table);
        }
    }


    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////


    class NvisColor {

        constructor(r, g = 0.0, b = 0.0, a = undefined) {
            if (r instanceof Object) {
                this.r = r.r;
                this.g = r.g;
                this.b = r.b;
                this.a = r.a;
            } else {
                this.r = r;
                this.g = g;
                this.b = b;
                this.a = a;
            }
        }

        getChannel(c) {
            if (c == 0) {
                return this.r;
            } else if (c == 1) {
                return this.g;
            } else if (c == 2) {
                return this.b;
            } else if (c == 3) {
                return this.a;
            }
            return undefined;
        }

        setChannel(c, v) {
            if (c == 0) {
                this.r = v;
            } else if (c == 1) {
                this.g = v;
            } else if (c == 2) {
                this.b = v;
            } else if (c == 3) {
                this.a = v;
            }
        }

        toUniform() {
            let uniform = [this.r, this.g, this.b];
            if (this.a !== undefined) {
                uniform.push(this.a);
            }
            return uniform;
        }

        fromObject(color, integer = false) {
            this.r = color.r;
            this.g = color.g;
            this.b = color.b;
            this.a = color.a;
        }

        fromCSS(cssColor) {
            let pPos = cssColor.indexOf("(");
            let type = cssColor.substr(0, pPos);
            let values = cssColor.slice(pPos + 1, -1).split(',').map(Number);
            this.r = values[0] / 255.0;
            this.g = values[1] / 255.0;
            this.b = values[2] / 255.0;
            this.a = (type == 'rgba' ? values[3] / 255.0 : undefined);
        }

        toCSS() {
            return 'rgb' + (this.a === undefined ? '' : 'a') + '(' + Math.round(this.r * 255.0) + ',' + Math.round(this.g * 255.0) + ',' + Math.round(this.b * 255.0) + (this.a === undefined ? '' : (',' + Math.round(this.a * 255.0))) + ')';
        }
    }


    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////


    class NvisShaderGraph {

        constructor() {
            this.id = -1;
            this.descriptionId = -1;
            this.arguments = undefined;
            this.json = undefined;
            this.streamIds = [];  //  participating streams
            this.inputStreamIds = [];  //  external inputs
            this.streamIdOffset = 0;  //  to know shader graphs "internal" stream id
            // this.bInput = false;
            // this.bOutput = false;
            this.outputStreamId = -1;
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
            this.shaderGraphId = -1;
            // this.shaderGraph = {
            //     id: -1,
            //     json: undefined,
            //     streamIds: [],
            //     inputStreams: [],
            //     bInput: false,
            //     bOutput: false
            // };

            this.inputStreamIds = [];
            this.shaderJSONObject = undefined;
            this.bUIReady = false;

            this.outputTexture = undefined;
            this.frameBuffer = undefined;

            let gl = this.glContext;

            let fullVertexPositions = new Float32Array([-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0]);
            this.fullVertexPositionBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.fullVertexPositionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, fullVertexPositions, gl.STATIC_DRAW);

            let fullTextureCoordinates = new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0]);
            this.fullTextureCoordinateBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.fullTextureCoordinateBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, fullTextureCoordinates, gl.STATIC_DRAW);

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

            // let gl = this.glContext;
            // this.outputTexture = gl.createTexture();
            // this.frameBuffer = gl.createFramebuffer();
            // gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
            // gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.outputTexture, 0);

            this.numTextures = 1;
            this.currentTexture = 0;

            this.startTime = Date.now();

            this.apiParameters = {};

            this.annotations = new NvisAnnotations(this.glContext);


            //  TODO: implement this
            this.defaultUI = `{
                'uTonemapper': {
                    'type': 'dropdown',
                    'value': 0,
                    'alternatives' : [
                        'None',
                        'Gamma Correction',
                        'Clamp',
                        'Log',
                        'Reinhard',
                        John Hable',
                        'Uncharted2',
                        'ACES'
                    ]
                },
                'uGamma' : {
                    'type': 'float',
                    'type': 'float',
                    'value': 2.2,
                    'min': 1.0,
                    'max': 5.0,
                    'step': 0.01,
                    'condition': 'uToneMapper==1'
                },
                'uExposure' : {
                    'type': 'float',
                    'type': 'float',
                    'value': 1.0,
                    'min': 0.0,
                    'max': 100.0,
                    'step': 0.1,
                    'condition': 'uToneMapper==1'
                },
                'uWhiteScale': {
                    'name': 'Linear White',
                    'type': 'float',
                    'value': 11.2,
                    'min': 0.001,
                    'max': 100.0,
                    'step': 0.01,
                    'condition': 'uToneMapper==6'
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


        setUniforms(shader, shaderGraphs) {

            let gl = this.glContext;

            if (this.shaderGraphId == -1 && this.shaderJSONObject === undefined) {
                return;
            }

            if (this.shaderGraphId != -1 && shaderGraphs[this.shaderGraphId].json === undefined) {
                return;
            }

            let uiObject = (this.shaderGraphId == -1 ? this.shaderJSONObject.UI : shaderGraphs[this.shaderGraphId].json.UI);
            if (uiObject === undefined) {
                return;
            }

            //  common uniforms
            let uniform = gl.getUniformLocation(shader.getProgram(), 'uDimensions');  //  TODO: not needed
            if (uniform !== null) {
                gl.uniform2f(uniform, this.dimensions.w, this.dimensions.h);
            }
            uniform = gl.getUniformLocation(shader.getProgram(), 'uTime');
            if (uniform !== null) {
                gl.uniform1f(uniform, (Date.now() - this.startTime) / 1000.0);
            }
            uniform = gl.getUniformLocation(shader.getProgram(), 'uMouse');
            if (uniform !== null && _state.input.mouse.streamCoords !== undefined) {
                gl.uniform4f(uniform, _state.input.mouse.streamCoords.x, _state.input.mouse.streamCoords.y, (_state.input.mouse.down ? 1.0 : 0.0), 0.0);
            }

            for (let key of Object.keys(uiObject)) {
                let type = uiObject[key].type;
                let uniform = gl.getUniformLocation(shader.getProgram(), key);

                if (uniform === null) {
                    continue;
                }

                if (type == 'bool') {
                    gl.uniform1i(uniform, (uiObject[key].value ? 1 : 0));
                }

                if (type == 'int') {
                    gl.uniform1i(uniform, uiObject[key].value);
                }

                if (type == 'float') {
                    gl.uniform1f(uniform, uiObject[key].value);
                }

                if (type == 'dropdown') {
                    gl.uniform1i(uniform, uiObject[key].value);
                }

                if (type == 'color') {
                    let color = new NvisColor();
                    color.fromCSS(uiObject[key].value);
                    if (color.bAlpha) {
                        gl.uniform4fv(uniform, color.toUniform());
                    } else {
                        gl.uniform3fv(uniform, color.toUniform());
                    }
                }
            }
        }


        uiUpdate(elementId, shaderGraphs) {
            //_object[key].value = value;
            let key = elementId.replace(/\-.*$/, '');
            let element = document.getElementById(elementId);
            let object = (this.shaderGraphId == -1 ? this.shaderJSONObject.UI[key] : shaderGraphs[this.shaderGraphId].json.UI[key]);
            let type = object.type;

            if (type == 'bool') {
                object.value = element.checked;
            } else if (type == 'dropdown') {
                object.value = element.selectedIndex;
            } else if (type == 'color') {
                let color = new NvisColor();
                color.fromCSS(object.value);

                color.setChannel(parseInt(elementId.substr(-1)), element.value);
                object.value = color.toCSS();

                let colorValue = document.getElementById(elementId.substr(0, elementId.length - 2) + '-color');
                if (colorValue !== null) {
                    colorValue.style.backgroundColor = object.value;
                }
            } else {
                object.value = element.value;
            }

            let elementValue = document.getElementById(elementId + '-value');
            if (elementValue !== null) {
                elementValue.innerHTML = element.value;
            }

            // console.log('uiUpdate(' + elementId + '): ' + key + ': ' + object.value);
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


        setDimensions(dimensions) {

            let gl = this.glContext;

            // this.bFloat = bFloat;
            this.dimensions = dimensions;

            this.outputTexture = gl.createTexture();

            // this.setupTexture(this.outputTexture, null, bFloat, dimensions);

            gl.bindTexture(gl.TEXTURE_2D, this.outputTexture);

            if (this.bFloat) {
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
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.outputTexture, 0);

            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }


        load(fileNames, windows) {

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

                console.log('loading file: ' + fileName);

                if (fileName.match(/.exr$/) || fileName.match(/.pfm$/)) {

                    let xhr = new XMLHttpRequest();
                    // let url = browser.runtime.getURL('/' + fileName);
                    xhr.open('GET', fileName);
                    // xhr.open(url);
                    xhr.setRequestHeader('Cache-Control', 'no-cache, no-store, max-age=0');
                    xhr.responseType = 'arraybuffer';
                    xhr.onload = function () {
                        // console.log("xhr.onload()");
                        if (this.status == 200 && this.response !== null) {
                            numFilesLoaded++;

                            let file = undefined;

                            if (fileName.match(/.exr$/)) {
                                file = new NvisEXRFile(fileName, this.response);
                            } else if (fileName.match(/.pfm$/)) {
                                file = new NvisPFMFile(fileName, this.response);
                            }

                            if (file.bSuccess) {
                                self.setupTexture(texture, file.toFloatArray(), true, file.dimensions);

                                if (numFilesLoaded == fileNames.length) {
                                    self.setDimensions(file.dimensions);
                                    //callback(file.dimensions);
                                    windows.setStreamPxDimensions(file.dimensions);
                                    windows.adjust();
                                }
                            }
                        } else {
                            console.log('status: ' + this.status + ', response: ' + this.response);
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
                            let dimensions = { w: image.width, h: image.height };
                            self.setDimensions(dimensions);
                            //callback(self.dimensions);
                            windows.setStreamPxDimensions(dimensions);
                            windows.adjust();
                        }
                    }

                }
            }
        }


        drop(files, windows) {

            //  TODO: combine with this.load()

            let gl = this.glContext;
            let numFilesLoaded = 0;
            let self = this;

            for (let fileId = 0; fileId < files.length; fileId++) {
                if (!files[fileId].type.match(/image.*/) && !files[fileId].type.match(/video.*/) && !files[0].name.match(/.exr$/) && !files[0].name.match(/.pfm$/)) {
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
                                let dimensions = { w: image.width, h: image.height };
                                self.setDimensions(dimensions);
                                windows.setStreamPxDimensions(dimensions);
                                windows.adjust();
                            }
                        }

                    }

                    reader.readAsDataURL(file);
                }

                if (file.type.match(/video.*/)) {
                    let reader = new FileReader();
                    reader.onload = function (event) {
                        let v = event.target.result;
                        console.log('Video loaded: ' + JSON.stringify(v));
                    }
                    reader.readAsDataURL(file);
                }

                if (files[0].name.match(/.exr$/)) {
                    let reader = new FileReader();

                    reader.onload = function (event) {

                        //  TODO: allow streams of EXRs
                        let file = new NvisEXRFile(files[0].name, reader.result);

                        if (file.bSuccess) {
                            self.setupTexture(texture, file.toFloatArray(), true, file.dimensions);
                            numFilesLoaded++;

                            if (numFilesLoaded == files.length) {
                                self.setDimensions(file.dimensions);
                                windows.setStreamPxDimensions(file.dimensions);
                                windows.adjust();
                            }
                        }

                    }

                    reader.readAsArrayBuffer(file);
                }

                if (files[0].name.match(/.pfm$/)) {
                    let reader = new FileReader();

                    reader.onload = function (event) {

                        //  TODO: allow streams of EXRs
                        let file = new NvisPFMFile(files[0].name, reader.result);

                        if (file.bSuccess) {
                            self.setupTexture(texture, file.toFloatArray(), true, file.dimensions);
                            numFilesLoaded++;

                            if (numFilesLoaded == files.length) {
                                self.setDimensions(file.dimensions);
                                windows.setStreamPxDimensions(file.dimensions);
                                windows.adjust();
                            }
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
            // if (this.shaderGraph.id == -1) {
                return this.inputStreamIds[inputId];
            // } else {
            //     return this.shaderGraph.inputStreams[inputId];
            // }
        }

        setInputStreamId(inputId, streamId) {
            // if (this.shaderGraph.id == -1) {
                this.inputStreamIds[inputId] = streamId;
            // } else {
            //     this.shaderGraph.inputStreams[inputId] = streamId;
            // }
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


        getName(shaderGraphs) {
            //  TODO: fix
            let name = '';
            if (this.fileNames.length > 0) {
                name += this.fileNames[0];
                if (this.fileNames.length > 1) {
                    name += (' (' + this.fileNames.length + ')');
                }
            // } else if (this.shaderGraphId != -1 && this.shaderGraph.bOutput) {
            } else if (this.shaderGraphId != -1) {
                name = shaderGraphs[this.shaderGraphId].json.name;
            } else if (this.bUIReady) {
                name = this.shaderJSONObject.name;
            }

            return name;
        }


        setFileName(fileName) {
            this.fileName = fileName;
        }


        getNumImages = function () {
            return this.textures.length;
        }


        createCallbackString(streamId, elementId, rowId, bAllConditionsMet, bUpdateUI = true) {
            let callbackString = 'document.getElementById("' + rowId + '").style.display="' + (bAllConditionsMet ? '' : 'none') + '"';
            callbackString += '; nvis.uiStreamUpdateParameter(' + streamId + ', "' + elementId + '", ' + bUpdateUI + ')';
            //console.log(callbackString);
            return callbackString;
        }

        //  TODO: temporary duplicate from NvisWindows class, make static elsewhere
        findStreamDimensions(streamId, streams, shaders) {

            //  for shader streams, we need to find dimensions by recursively searching inputs
            let stream = streams[streamId];

            if (stream === undefined) {
                return undefined;
            }

            let dimensions = stream.getDimensions();
            if (dimensions !== undefined) {
                return dimensions;
            }

            let shaderId = stream.shaderId;
            if (shaderId == -1) {
                //  dimensions not known yet
                return undefined;
            }

            let shader = shaders.shaders[shaderId];
            if (shader === undefined) {
                //  shader not known yet
                return undefined;
            }

            //  deduce dimensions based on inputs
            //  input order is priority order
            for (let inputId = 0; inputId < shader.getNumInputs(); inputId++) {
                let inputStreamId = stream.getInputStreamId(inputId);
                let inputDimensions = this.findStreamDimensions(inputStreamId, streams, shaders);
                if (inputDimensions === undefined) {
                    return undefined;
                }
                stream.setDimensions(inputDimensions);
                return inputDimensions;
            }

            return undefined;
        }

        render(frameId, shaders, streams, shaderGraphs, streamId) {

            let shader = undefined;
            if (this.shaderId == -1) {
                shader = shaders.streamShader;
            } else {
                shader = shaders.shaders[this.shaderId];
            }
            if (shader === undefined || !shader.isReady()) {
                return;
            }
            let streamDims = this.getDimensions();
            if (streamDims === undefined) {
                streamDims = this.findStreamDimensions(streamId, streams, shaders);
                if (streamDims === undefined) {
                    return;
                }
                this.setDimensions(streamDims);
            }

            this.prepareUI(shader);

            //  render stream to texture
            let shaderProgram = shader.getProgram();

            let gl = this.glContext;

            gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);

            gl.useProgram(shaderProgram);

            let aVertexPosition = gl.getAttribLocation(shaderProgram, 'aVertexPosition');
            gl.bindBuffer(gl.ARRAY_BUFFER, this.fullVertexPositionBuffer);
            gl.vertexAttribPointer(aVertexPosition, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(aVertexPosition);

            let aTextureCoord = gl.getAttribLocation(shaderProgram, 'aTextureCoord');
            gl.bindBuffer(gl.ARRAY_BUFFER, this.fullTextureCoordinateBuffer);
            gl.vertexAttribPointer(aTextureCoord, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(aTextureCoord);

            let inputStreamIds = [];

            if (this.shaderId == -1) {

                gl.bindTexture(gl.TEXTURE_2D, this.getTexture(frameId));

            } else if (this.shaderGraphId != -1) {

                let shaderGraph = shaderGraphs[this.shaderGraphId];

                let inputStreamId = -1;
                for (let inputId = 0; inputId < shader.getNumInputs(); inputId++) {
                    if (this.inputStreamIds[inputId] < shaderGraph.inputStreamIds.length) {
                        inputStreamId = shaderGraph.inputStreamIds[this.inputStreamIds[inputId]];
                    } else {
                        // inputStreamId = this.inputStreamIds[inputId + shaderGraph.streamIdOffset];
                        inputStreamId = this.inputStreamIds[inputId];
                    }

                    inputStreamIds.push(inputStreamId);

                    let activeTexture = this.TextureUnits[inputId];
                    gl.activeTexture(activeTexture);

                    let stream = streams[inputStreamId];
                    if (stream === undefined) {
                        console.log('XXX streamId: ' + inputStreamId + '  ' + shaderGraph.streamIdOffset);
                        continue;
                    }

                    gl.bindTexture(gl.TEXTURE_2D, streams[inputStreamId].getTexture(frameId));
                    gl.uniform1i(gl.getUniformLocation(shaderProgram, ('uTexture' + inputId)), inputId);
                }

            } else {

                for (let inputId = 0; inputId < shader.getNumInputs(); inputId++) {
                    let activeTexture = this.TextureUnits[inputId];
                    gl.activeTexture(activeTexture);

                    let inputStreamId = this.getInputStreamId(inputId);

                    inputStreamIds.push(inputStreamId);

                    gl.bindTexture(gl.TEXTURE_2D, streams[inputStreamId].getTexture(frameId));
                    gl.uniform1i(gl.getUniformLocation(shaderProgram, ('uTexture' + inputId)), inputId);
                }

            }

            // console.log('NvisStream.render()  stream ' + streamId + ' (' + this.shaderId + '): ' + JSON.stringify(inputStreamIds));

            let uTonemapper = gl.getUniformLocation(shaderProgram, 'uTonemapper');
            if (_settings.bGlobalTonemapping.value) {
                gl.uniform1i(uTonemapper, _settings.tonemapper.value);
                if (_settings.tonemapper.value == 0) {
                    let uGamma = gl.getUniformLocation(shaderProgram, 'uGamma');
                    gl.uniform1f(uGamma, _settings.gamma.value);
                    let uExposure = gl.getUniformLocation(shaderProgram, 'uExposure');
                    gl.uniform1f(uExposure, _settings.exposure.value);
                }
            } else {
                gl.uniform1i(uTonemapper, -1);
            }

            gl.viewport(0, 0, streamDims.w, streamDims.h);

            gl.enable(gl.BLEND);
            // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.blendFunc(gl.ONE, gl.ZERO);

            this.setUniforms(shader, shaderGraphs);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }


        buildShaderUI(object, streamId) {
            let dom = document.createDocumentFragment();

            let table = document.createElement('table');
            table.className = 'uiTable';

            for (let key of Object.keys(object)) {

                let bConditionMet = true;
                let bAllConditionsMet = true;

                let bConditionNegated = false;
                let conditionVariable = '';
                let conditionValue = '';

                let conditionString = object[key].condition;
                if (conditionString !== undefined) {
                    conditionString = conditionString.replace(/\s+/g, '');
                    let conditionStrings = conditionString.split('&');
                    for (let i = 0; i < conditionStrings.length; i++) {
                        let condition = conditionStrings[i];

                        let equalPosition = condition.lastIndexOf('=');
                        if (equalPosition != -1) {
                            //  numeric conditional
                            bConditionNegated = (condition[equalPosition - 1] == '!');
                            conditionVariable = condition.substring(0, equalPosition - 1);
                            conditionValue = condition.substring(equalPosition + 1);
                            let conditionValues = conditionValue.split(',');
                            bConditionMet = conditionValues.includes(object[conditionVariable].value.toString())
                            bConditionMet = (bConditionNegated ? !bConditionMet : bConditionMet);
                        } else {
                            //  boolean conditional
                            bConditionNegated = (condition[0] == '!');
                            conditionVariable = condition.substring(bConditionNegated ? 1 : 0);
                            bConditionMet = (!bConditionNegated && object[conditionVariable].value) || (bConditionNegated && !object[conditionVariable].value);
                        }

                        bAllConditionsMet &&= bConditionMet;
                    }
                }

                let label = document.createElement('label');
                label.setAttribute('for', key);
                label.innerHTML = object[key].name;

                let elementId = (key + '-' + streamId);  //  need uniqueness
                let rowId = elementId + '-row';

                let row = document.createElement('tr');
                row.setAttribute('id', rowId);
                row.style.display = (bAllConditionsMet ? '' : 'none');

                let el = undefined;
                let type = object[key].type;
                if (type == 'bool' || type == 'int' || type == 'float') {
                    el = document.createElement('input');
                    el.setAttribute('id', elementId);

                    if (type == 'bool') {
                        el.setAttribute('type', 'checkbox');
                        el.addEventListener('change', (ev) => {
                            nvis.uiStreamUpdateParameter(streamId, elementId, true);
                        }, true);
                        if (object[key].value) {
                            el.setAttribute('checked', true);
                        } else {
                            el.removeAttribute('checked');
                        }
                    } else if (type == 'int') {
                        el.setAttribute('type', 'range');
                        el.setAttribute('min', (object[key].min ? object[key].min : 0));
                        el.setAttribute('max', (object[key].max ? object[key].max : 1));
                        el.setAttribute('value', (object[key].value ? object[key].value : 0));
                        el.setAttribute('step', (object[key].step ? object[key].step : 1));
                        el.addEventListener('input', (ev) => {
                            nvis.uiStreamUpdateParameter(streamId, elementId, false);
                        }, true);
                        let oEl = document.createElement('span');
                        oEl.id = (elementId + '-value');
                        oEl.innerHTML = (oEl.innerHTML == '' ? object[key].value : oEl.innerHTML);

                        label.innerHTML += ' (' + oEl.outerHTML + ')';
                    } else if (type == 'float') {
                        el.setAttribute('type', 'range');
                        el.setAttribute('min', (object[key].min ? object[key].min : 0.0));
                        el.setAttribute('max', (object[key].max ? object[key].max : 1.0));
                        el.setAttribute('value', (object[key].value ? object[key].value : 0.0));
                        el.setAttribute('step', (object[key].step ? object[key].step : 'any'));
                        el.addEventListener('input', (ev) => {
                            nvis.uiStreamUpdateParameter(streamId, elementId, false);
                        }, true);
                        let oEl = document.createElement('span');
                        oEl.id = (elementId + '-value');
                        oEl.innerHTML = (oEl.innerHTML == '' ? object[key].value : oEl.innerHTML);

                        label.innerHTML += ' (' + oEl.outerHTML + ')';
                    }
                } else if (type == 'dropdown') {
                    el = document.createElement('select');
                    el.setAttribute('id', elementId);
                    el.addEventListener('change', (ev) => {
                        nvis.uiStreamUpdateParameter(streamId, elementId, true);
                    }, true);
                    for (let optionId = 0; optionId < object[key].alternatives.length; optionId++) {
                        let oEl = document.createElement('option');
                        if (object[key].value == optionId) {
                            oEl.setAttribute('selected', true);
                        }
                        oEl.innerHTML = object[key].alternatives[optionId];
                        el.appendChild(oEl);
                    }
                } else if (type == 'color') {
                    el = document.createElement('div');
                    el.setAttribute('id', elementId);

                    const channels = ['R', 'G', 'B', 'A'];
                    let color = new NvisColor();
                    color.fromCSS(object[key].value);

                    let labelDiv = document.createElement('div');

                    let cSpan = document.createElement('span');
                    cSpan.id = elementId + '-color';
                    cSpan.style.backgroundColor = color.toCSS();
                    cSpan.style.padding = '20px';

                    labelDiv.appendChild(cSpan);
                    labelDiv.appendChild(label);
                    label = labelDiv;

                    for (let c = 0; c < (color.bAlpha ? 4 : 3); c++) {

                        let value = color.getChannel(c);
                        let channelId = elementId + '-' + c;

                        let cLabel = document.createElement('label');
                        cLabel.innerHTML = channels[c] + ': ';
                        cLabel.setAttribute('for', channelId);
                        let cInput = document.createElement('input');
                        cInput.id = channelId;
                        cInput.setAttribute('type', 'range');
                        cInput.setAttribute('min', 0);
                        cInput.setAttribute('max', 255);
                        cInput.setAttribute('value', value);
                        cInput.setAttribute('step', 1);
                        cInput.addEventListener('input', () => {
                            // console.log(channels[c] + ' = ' + document.getElementById(channelId).value);
                            nvis.uiStreamUpdateParameter(streamId, channelId, false);
                        }, true);

                        let cValue = document.createElement('span');
                        cValue.id = (channelId + '-value');
                        cValue.innerHTML = value;

                        let cDiv = document.createElement('div');
                        cDiv.appendChild(cLabel);
                        cDiv.appendChild(cInput);
                        cDiv.appendChild(cValue);

                        el.appendChild(cDiv);
                    }
                }

                if (el !== undefined) {
                    if (type == 'bool') {
                        let cell = document.createElement('td');
                        cell.setAttribute('multicolumn', 2);
                        cell.appendChild(el);
                        cell.appendChild(label);
                        row.appendChild(cell);
                    } else if (type == 'dropdown') {
                        label.innerHTML += ': ';
                        let cell = document.createElement('td');
                        cell.setAttribute('multicolumn', 2);
                        cell.appendChild(label);
                        cell.appendChild(el);
                        row.appendChild(cell);
                    } else if (type == 'color') {
                        let elCell = document.createElement('td');
                        let labelCell = document.createElement('td');
                        elCell.appendChild(el);
                        labelCell.appendChild(label);
                        row.appendChild(elCell);
                        row.appendChild(labelCell);
                    } else {
                        let elCell = document.createElement('td');
                        let labelCell = document.createElement('td');
                        elCell.appendChild(el);
                        labelCell.appendChild(label);
                        row.appendChild(elCell);
                        row.appendChild(labelCell);
                    }

                    table.appendChild(row);
                }
            }

            dom.appendChild(table);

            return dom;
        }


        prepareUI(shader) {
            //  lazily get the UI JSON from the shader
            if (!this.bUIReady) {

                if (this.shaderGraphId != -1) {
                    this.bUIReady = true;
                    return;
                }

                let json = shader.json;
                if (json === undefined) {
                    return;
                }
                this.shaderJSONObject = JSON.parse(json);

                //  set default UI parameters from API call
                for (let key of Object.keys(this.apiParameters)) {
                    if (this.shaderJSONObject.UI[key] !== undefined) {
                        this.shaderJSONObject.UI[key].value = this.apiParameters[key];
                    }
                }

                this.bUIReady = true;
            }
        }


        getUI(streamId, streams, shaders, shaderGraphs) {

            let bShaderGraphUI = false;
            if (this.shaderGraphId != -1) {
                if (shaderGraphs[this.shaderGraphId].outputStreamId != streamId) {
                    return undefined;
                }
                bShaderGraphUI = true;
            }

            //  streamId is needed since the stream itself does not know its id
            let ui = document.createElement('div');
            ui.id = 'ui';

            let fileName = streams[streamId].getName(shaderGraphs);
            let arrowRight = '&#9658;';
            let arrowDown = '&#9660;';

            let uiTitle = document.createElement('div');
            uiTitle.className = 'uiTitle';
            uiTitle.id = 'streamTitleUI-' + streamId;
            uiTitle.innerHTML = (_state.ui.selectedStreamId == streamId ? arrowDown : arrowRight)
            uiTitle.innerHTML += (' stream ' + (streamId + 1) + ': ' + fileName);
            if (_state.ui.selectedStreamId == streamId) {
                uiTitle.innerHTML = uiTitle.innerHTML.bold();
            }

            uiTitle.addEventListener('click', () => {

                _state.ui.selectedStreamId = (streamId == _state.ui.selectedStreamId ? -1 : streamId);

                for (let id = 0; id < streams.length; id++) {

                    if (streams[id].shaderGraphId != -1) {
                        if (id != shaderGraphs[streams[id].shaderGraphId].outputStreamId) {
                            //  don't include non-outputs of shader graphs
                            continue;
                        }
                    }

                    let streamTitle = document.getElementById('streamTitleUI-' + id);
                    streamTitle.innerHTML = (_state.ui.selectedStreamId == id ? arrowDown : arrowRight)
                    streamTitle.innerHTML += (' stream ' + (id + 1) + ': ' + streams[id].getName(shaderGraphs));
                    if (_state.ui.selectedStreamId == id) {
                        streamTitle.innerHTML = streamTitle.innerHTML.bold();
                    }

                    let streamBody = document.getElementById('streamBodyUI-' + id);
                    if (streamBody !== null) {
                        streamBody.style.display = (_state.ui.selectedStreamId == id ? 'block' : 'none');
                    }
                }
            })

            ui.appendChild(uiTitle);

            let uiBody = document.createElement('div');
            uiBody.id = 'streamBodyUI-' + streamId;
            uiBody.className = 'uiBody';
            uiBody.style.display = (streamId == _state.ui.selectedStreamId ? 'block' : 'none');

            if (this.shaderId != -1) {

                let shader = shaders.shaders[this.shaderId];
                let shaderGraph = shaderGraphs[this.shaderGraphId];
                let numInputs = (shaderGraph === undefined ? this.inputStreamIds.length : shaderGraph.inputStreamIds.length);

                // console.log('stream ' + streamId + ': ' + numInputs);
     
                for (let inputId = 0; inputId < numInputs; inputId++) {
                    let eId = ('input-' + streamId + '-' + inputId);
                    let label = document.createElement('label');
                    label.setAttribute('for', eId);
                    label.innerHTML = ('Input ' + (inputId + 1) + ': ');

                    let sEl = document.createElement('select');
                    sEl.id = eId;
                    sEl.addEventListener('change', () => {
                        nvis.uiStreamUpdateInput(streamId, inputId);
                    });

                    for (let otherStreamId = 0; otherStreamId < streams.length; otherStreamId++) {

                        //  don't allow direct feedback for streams
                        if (otherStreamId == streamId) {
                            continue;
                        }

                        let otherStream = streams[otherStreamId];

                        //  don't allow direct feedback for shader graphs
                        if (this.shaderGraphId != -1 && otherStream.shaderGraphId == this.shaderGraphId) {
                            continue;
                        }
                        //  skip non-outputs from shader graphs
                        if (otherStream.shaderGraphId != -1 && shaderGraphs[otherStream.shaderGraphId].outputStreamId != otherStreamId) {
                            continue;
                        }

                        //  lazily fill UI components
                        if (!otherStream.bUIReady && otherStream.shaderId != -1) {
                            let otherShader = shaders.shaders[otherStream.shaderId];
                            otherStream.prepareUI(otherShader);
                        }

                        // console.log('Checking  ' + otherStreamId);
                        let sOp = document.createElement('option');
                        sOp.innerHTML = (otherStreamId + 1) + ': ' + otherStream.getName(shaderGraphs);
                        sOp.value = otherStreamId;
                        if (this.shaderGraphId != -1) {
                            // console.log('Here... 1: ' + shaderGraphs[otherStream.shaderGraphId].inputStreamIds[inputId] + ', ' + otherStreamId);
                            if (shaderGraphs[this.shaderGraphId].inputStreamIds[inputId] == otherStreamId) {
                                sOp.setAttribute('selected', true);
                            }
                        } else {
                            // console.log('Here... 2');
                            if (this.inputStreamIds[inputId] == otherStreamId) {
                                sOp.setAttribute('selected', true);
                            }
                        }
                        sEl.appendChild(sOp);


                        // let bValidStream = (otherStream.shaderGraphId == -1);
                        // let bValidShaderGraph = (otherStream.shaderGraphId != -1 && shaderGraphs[otherStream.shaderGraphId].outputStreamId == otherStreamId);

                        // // bValidStream = (otherShaderGraph === undefined || otherShaderGraph.outputStreamId == otherStreamId);
                        // // bValidStream &&= bValidShaderGraph;

                        // // if (shaderGraph !== undefined) {

                        // //     bValidStream &&= (otherStream.shaderGraphId == -1 || otherStreamId == shaderGraph.outputStreamId);

                        // // console.log('id: ' + otherStreamId + ', stream: ' + bValidStream + ', graph: ' + bValidShaderGraph)
                        // if (bValidStream || bValidShaderGraph) {

                        //     if (!otherStream.bUIReady && otherStream.shaderId != -1) {
                        //         let otherShader = shaders.shaders[otherStream.shaderId];
                        //         otherStream.prepareUI(otherShader);
                        //     }

                        //     let sOp = document.createElement('option');
                        //     sOp.innerHTML = otherStream.getName(shaderGraphs) + ' ' + otherStreamId;
                        //     sOp.value = otherStreamId;

                        //     let sourceId = (bValidStream ? this.inputStreamIds[inputId] : shaderGraphs[otherStream.shaderGraphId].inputStreamIds[inputId]);
                        //     // if (this.inputStreamIds[inputId] == otherStreamId) {
                        //     if (sourceId == otherStreamId) {
                        //         sOp.setAttribute('selected', true);
                        //     }
                        //     sEl.appendChild(sOp);
                        // }

                        // } else {

                        //     if (bValidStream) {

                        //         if (!otherStream.bUIReady && otherStream.shaderId != -1) {
                        //             let otherShader = shaders.shaders[otherStream.shaderId];
                        //             otherStream.prepareUI(otherShader);
                        //         }

                        //         let sOp = document.createElement('option');
                        //         sOp.innerHTML = otherStream.getName(shaderGraphs) + ' ' + otherStreamId;
                        //         sOp.value = otherStreamId;
                        //         if (this.inputStreamIds[inputId] == otherStreamId) {
                        //             sOp.setAttribute('selected', true);
                        //         }
                        //         sEl.appendChild(sOp);
                        //     }

                        // }
                    }

                    let inputDiv = document.createElement('div');
                    inputDiv.appendChild(label);
                    inputDiv.appendChild(sEl);

                    uiBody.appendChild(inputDiv);
                }

                if (shader !== undefined && shader.isReady()) {

                    let shaderUI = undefined;
                    if (bShaderGraphUI) {
                        shaderUI = this.buildShaderUI(shaderGraph.json.UI, streamId);
                    } else {
                        shaderUI = this.buildShaderUI(this.shaderJSONObject.UI, streamId);
                    }

                    uiBody.appendChild(shaderUI);
                }

            }

            let deleteButton = document.createElement('button');
            deleteButton.innerHTML = 'Delete';
            deleteButton.addEventListener('click', () => {
                if (confirm('Are you sure?')) {
                    nvis.uiDeleteStream(streamId);
                }
            });
            uiBody.appendChild(deleteButton);

            ui.appendChild(uiBody);

            return ui;
        }

    }


    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////

    class NvisOverlay {

        constructor(canvas) {
            this.canvas = canvas;
            this.position = { x: 10, y: 10 };
            this.size = { w: 0, h: 0 };
            this.text = '';
            this.div = document.createElement('div');
            this.div.className = 'overlay';

            this.windowId = undefined;
            this.coordinates = undefined;
            this.frameId = undefined;

            // this.div.style.left = this.position.x + 'px';
            // this.div.style.top = this.position.y + 'px';
            // this.div.style.width = this.size.w + 'px';
            // this.div.style.height = this.size.h + 'px';
        }

        show() {
            this.div.style.display = 'block';
        }

        hide() {
            this.div.style.display = 'none';
        }

        update(windowId, coordinates, color, bFloat) {
            if (this.windowId == windowId && this.coordinates.x == coordinates.x && this.coordinates.y == coordinates.y && this.frameId == _state.animation.frameId) {
                return;
            }

            // console.log('windowId: ' + windowId + ', coords: ' + JSON.stringify(coordinates) + ', color: ' + JSON.stringify(color) + ', frameId: ' + _state.animation.frameId);

            this.windowId = windowId;
            this.coordinates = coordinates;
            this.color = color;
            this.frameId = _state.animation.frameId;

            this.text = '';
            if (coordinates === undefined) {
                this.text += 'N/A';  //  TODO: should not happen, checked before call
            } else {
                let factor = (bFloat ? 255.0 : 1.0);
                let r = color.r * factor;
                let g = color.g * factor;;
                let b = color.b * factor;;
                let a = color.a * factor;
                let decimals = _settings.pixelValueDecimals.value;
                this.text += 'position: ' + Math.floor(coordinates.x) + ', ' + Math.floor(coordinates.y) + '<br/>';
                this.text += '<span style=\'background-color: rgb(' + r + ',0,0)\'></span>R: ' + (bFloat ? color.r.toFixed(decimals) : color.r) + '<br/>';
                this.text += '<span style=\'background-color: rgb(0,' + g + ',0)\'></span>G: ' + (bFloat ? color.g.toFixed(decimals) : color.g) + '<br/>';
                this.text += '<span style=\'background-color: rgb(0,0,' + b + ')\'></span>B: ' + (bFloat ? color.b.toFixed(decimals) : color.b) + '<br/>';
                this.text += '<span style=\'background-color: rgb(' + a + ',' + a + ',' + a + ')\'></span>A: ' + (bFloat ? color.a.toFixed(decimals) : color.a);
            }
            this.div.innerHTML = this.text;

            //  TODO: below can be used for fixed placement
            // let w = window.getComputedStyle(this.div).getPropertyValue('width');
            // let h = window.getComputedStyle(this.div).getPropertyValue('height');
            // this.size = { w: Math.floor(w.substring(0, w.indexOf('px'))), h: Math.floor(h.substring(0, h.indexOf('px'))) };

            let cCoords = _state.input.mouse.canvasCoords;
            let layoutDims = _state.layout.getDimensions();
            let winPxDims = { w: this.canvas.width / layoutDims.w, h: this.canvas.height / layoutDims.h };
            let topLeftWinCoords = { x: cCoords.x % winPxDims.w, y: cCoords.y % winPxDims.h };
            let winPos = { x: windowId % layoutDims.w, y: Math.floor(windowId / layoutDims.w) };
            let winCoords = { x: topLeftWinCoords.x + winPos.x * winPxDims.w, y: topLeftWinCoords.y + winPos.y * winPxDims.h };

            let left = _state.layout.border + winCoords.x;
            let top = _state.layout.border + winCoords.y;
            this.position = { x: left, y: top };
            this.div.style.left = left + 'px';
            this.div.style.top = top + 'px';
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////

    class NvisWelcome {

        constructor(windows) {
            this.windows = windows;

            let logo = document.createElement('img');
            logo.src = `data:image/png;base64,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vLDwG/eE8/s3BCkeAAAACXBIWXMAAAsSAAALEgHS3X78AAAJqmlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4NCjx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IlhNUCB0b29sa2l0IDMuMC0yOCwgZnJhbWV3b3JrIDEuNiI+DQogIDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyIgeG1sbnM6aVg9Imh0dHA6Ly9ucy5hZG9iZS5jb20vaVgvMS4wLyI+DQogICAgPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9InV1aWQ6YmYzYmQ3MzQtMWMwMS0xMWRiLWI3NjgtODFhYWFlOGRiMzE0IiB4bWxuczpleGlmPSJodHRwOi8vbnMuYWRvYmUuY29tL2V4aWYvMS4wLyI+DQogICAgICA8ZXhpZjpDb2xvclNwYWNlPjE8L2V4aWY6Q29sb3JTcGFjZT4NCiAgICAgIDxleGlmOlBpeGVsWERpbWVuc2lvbj43MDA8L2V4aWY6UGl4ZWxYRGltZW5zaW9uPg0KICAgICAgPGV4aWY6UGl4ZWxZRGltZW5zaW9uPjUyMDwvZXhpZjpQaXhlbFlEaW1lbnNpb24+DQogICAgPC9yZGY6RGVzY3JpcHRpb24+DQogICAgPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9InV1aWQ6YmYzYmQ3MzQtMWMwMS0xMWRiLWI3NjgtODFhYWFlOGRiMzE0IiB4bWxuczpwZGY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vcGRmLzEuMy8iPjwvcmRmOkRlc2NyaXB0aW9uPg0KICAgIDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSJ1dWlkOmJmM2JkNzM0LTFjMDEtMTFkYi1iNzY4LTgxYWFhZThkYjMxNCIgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIj4NCiAgICAgIDxwaG90b3Nob3A6SGlzdG9yeT48L3Bob3Rvc2hvcDpIaXN0b3J5Pg0KICAgIDwvcmRmOkRlc2NyaXB0aW9uPg0KICAgIDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSJ1dWlkOmJmM2JkNzM0LTFjMDEtMTFkYi1iNzY4LTgxYWFhZThkYjMxNCIgeG1sbnM6dGlmZj0iaHR0cDovL25zLmFkb2JlLmNvbS90aWZmLzEuMC8iPg0KICAgICAgPHRpZmY6T3JpZW50YXRpb24+MTwvdGlmZjpPcmllbnRhdGlvbj4NCiAgICAgIDx0aWZmOlhSZXNvbHV0aW9uPjcyLzE8L3RpZmY6WFJlc29sdXRpb24+DQogICAgICA8dGlmZjpZUmVzb2x1dGlvbj43Mi8xPC90aWZmOllSZXNvbHV0aW9uPg0KICAgICAgPHRpZmY6UmVzb2x1dGlvblVuaXQ+MjwvdGlmZjpSZXNvbHV0aW9uVW5pdD4NCiAgICA8L3JkZjpEZXNjcmlwdGlvbj4NCiAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0idXVpZDpiZjNiZDczNC0xYzAxLTExZGItYjc2OC04MWFhYWU4ZGIzMTQiIHhtbG5zOnhhcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyI+DQogICAgICA8eGFwOkNyZWF0ZURhdGU+MjAwNi0wNy0yNVQxMDoyMTowOC0wODowMDwveGFwOkNyZWF0ZURhdGU+DQogICAgICA8eGFwOk1vZGlmeURhdGU+MjAwNi0wNy0yNVQxMDoyMTowOC0wODowMDwveGFwOk1vZGlmeURhdGU+DQogICAgICA8eGFwOk1ldGFkYXRhRGF0ZT4yMDA2LTA3LTI1VDEwOjIxOjA4LTA4OjAwPC94YXA6TWV0YWRhdGFEYXRlPg0KICAgICAgPHhhcDpDcmVhdG9yVG9vbD5BZG9iZSBQaG90b3Nob3AgQ1MgV2luZG93czwveGFwOkNyZWF0b3JUb29sPg0KICAgIDwvcmRmOkRlc2NyaXB0aW9uPg0KICAgIDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSJ1dWlkOmJmM2JkNzM0LTFjMDEtMTFkYi1iNzY4LTgxYWFhZThkYjMxNCIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtbG5zOnhhcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIj4NCiAgICAgIDx4YXBNTTpEZXJpdmVkRnJvbSByZGY6cGFyc2VUeXBlPSJSZXNvdXJjZSI+DQogICAgICAgIDxzdFJlZjppbnN0YW5jZUlEPnV1aWQ6YmYzYmQ3MmUtMWMwMS0xMWRiLWI3NjgtODFhYWFlOGRiMzE0PC9zdFJlZjppbnN0YW5jZUlEPg0KICAgICAgICA8c3RSZWY6ZG9jdW1lbnRJRD5hZG9iZTpkb2NpZDpwaG90b3Nob3A6N2IzNjBmNzAtMWJmZS0xMWRiLWI3NjgtODFhYWFlOGRiMzE0PC9zdFJlZjpkb2N1bWVudElEPg0KICAgICAgPC94YXBNTTpEZXJpdmVkRnJvbT4NCiAgICAgIDx4YXBNTTpEb2N1bWVudElEPmFkb2JlOmRvY2lkOnBob3Rvc2hvcDpiZjNiZDczMy0xYzAxLTExZGItYjc2OC04MWFhYWU4ZGIzMTQ8L3hhcE1NOkRvY3VtZW50SUQ+DQogICAgPC9yZGY6RGVzY3JpcHRpb24+DQogICAgPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9InV1aWQ6YmYzYmQ3MzQtMWMwMS0xMWRiLWI3NjgtODFhYWFlOGRiMzE0IiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iPg0KICAgICAgPGRjOmZvcm1hdD5pbWFnZS9qcGVnPC9kYzpmb3JtYXQ+DQogICAgPC9yZGY6RGVzY3JpcHRpb24+DQogIDwvcmRmOlJERj4NCjwveDp4bXBtZXRhPg0KPD94cGFja2V0IGVuZD0iciI/PrOTEEQAAOuVSURBVHhe7L0HoGVVdf+/6zn3vjKVYZgBht57R5AiYBdbbLGXqDGmGEui0eRnNPmlGJOosSsqgoItNkAE6W3oQxs6DNN7eeXec3b7f9e+D4L5yd83w73zZuatD483991y7j777LPXd+299toypSQYhmEYhmF+H2rsX4ZhGIZhmP9fWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuWDQwDMMwDDMuZEpp7CHD7AB4EeSQ1o0kZBRBiFLhKRLHrI8Z5tnjnRBFMiKJWm2SomVbs0UxInT/2OvMjg6LBmaH4gu3HLt6aIEPIoQUZRAJoqGGYpBSjr2DYZgtxSTdllURIMmVU/ag2S969WHnN4uiEHbsHcyODosGZofiq3ecvGTNjbVPJBKUEEkpGbmNM0xXcMK6whVJFLIcrfyBM89413EXaRGlKMfewezo8Jgts0MRonYBYlgLY9CTRam8FIl/+Id/uvHTTKoBCV6LUFVGhoZIBvrcm7Hbj5kE8EgDs0Px+QXPXbzieqllUslFoZOQWRinmF9mGOZZ0Ff3V+WoyFbDa3Hg1Oe96+hf62TY/Zw8sGhgdii+ctvzFq+8VigZhBdSaFkk4RJ5SdyrMcyzxYowIlJplEjFaPIHTT/zj477FaQ57jVmksCigdmh+OIdpyxeeR38ngidQNNv0gdIBqH02BsYhtliGrExmtqFtEbIWtb7Tzv9ncdfJrwRPEExaWDRwOxQfOW25z2x6tokZVIeTVuKIkZvTTOkkbF3MAyzpdTQ4qXQbaGjFjbtO/W57zz213jE4XGTB77SzI5FUkmFoH2SNLYghVc61qLVeZFhmGdDkUTZht1QRgYZok9GpzKxHZlM8MVmJgMcBskwDNMFWDQwDMMwDDMuWDQwOyYU/cgwDMN0FRYNDMMwDMOMCxYNzI6J5FVBDMMw3YZFA8MwDMMw44JFA8MwDMMw44JFAzMZ4HbOMAzTBbgzZSYDnKeBYRimC7BoYBiGYRhmXLBoYHZMOE8DwzBM12HRwDAMwzDMuGDRwOyYcJ4GhmGYrsOigWEYhmGYccGigWEYhmGYccGigZkMcDtnGIbpAtyZMpMBztPAMAzTBVg0MAzDMAwzLlg0MDsmnKeBYRim67BoYBiGYRhmXLBoYHZMOE8DwzBM12HRwDAMwzDMuGDRwDAMwzDMuGDRwEwGuJ0zDMN0Ae5MmckA52lgGIbpAiwaGIZhGIYZFywamB0TztPAMAzTdVg0MAzDMAwzLlg0MDsmnKeBYRim67BoYBiGYRhmXLBoYBiGYRhmXLBoYLYuKf88jRTzM7EtkhMxihBTGHspRp9f6rwhjX0Wf+JdokrCd57Gk8GPfUTIIgSh0K5lEElGGVPUEm8Y+5wJ0eIHD/Dnk98jEg7yJPltY8/kxypI5RX9OCnxXTha/lEiaBkLlZpa9CVpQ8JX0jGDElFJn3QQDSlRhvwkDiXxPJ4sfGzUSiVr8R6RjJKGvguvcvAmwzDbNiwamK2Mox/ogmzsyQbDUspYq0YtrVMyaCF1pJdgrpOJso7KJRhrJfHbwwAr4ZVTohSCbC3EQZJempA/kYIaskVJsiMKrQZUNLDuRoonf7yRzshgYKuFNKRDygDLraxQhYMMEVIoCa1gYMuD1F6oGK2gH5PwG8eHVBDe4if6ItSmrnSrrUZdcEqnQlkjrA5GBzwOKrV91jpGSk1nCQESClU3y7YKUXmnZZASesdDLEHcpFTkKmIYhtlGkenpThbD9BgYx5QCeeqqsygSBjoTIAKyiIXDLQJQssCf0A
/kpUs01CjhnacE3x1P0YgE3HYY6iSCrFr1yk2tJVW94Zqlnw2u4dq+KIrZ0w9uNBpQGVG0GvXu/X2DgwMzrG3EANsNa034BOXgjQ2V27Rmw+LKbTAWh3ROx3WbVrfaG6QZGa1XrduwpFWtsxYWPt8yKDzKokSSiex9Ehr/QQ25oKXQ+ANlVaquvVU6xhAlaSN8Hc45ePpIqQq8ISaPoyWVoohUHUriKaoHhtmG8UqVIQYp9ph+xvuO/Q2aLo+RTR5YNDBblZDHFzqo/IiG/GGFhRPwxvEMLGo2sPkt5J7DUcfzsLtV3Lh2+MF1w/dtHF68Wi1ZP7RstFqyZtNDVRjGG2PSRpcv2ueTx+77nlIMSjEqRAPaQtNkBSy6y5JE5zmAp3Vy+EZ8fefrIFDyi/Skjp1bA5aejk0vE48O3dSu1w+1lm9sPbGp9dim0cc2jiyFnhjSw/gaH0RRmBhEu+11QcfMyoQexEhjDniojVBahHY+HN6gqHz4qoCXSXwwzLYOi4bJDIsGZuvylJEe62aeHGkQtRAFxAP+xlu8GNlULR8eWfvg8CUbh55YO7Jw3fADVVjvaNIBOsKYYHxoFw1dBfRgZOkD9IiSL573sVMO+EcNz923VFHS8Sn4IAXzO8xxpHkGGr2ARYdph+vfuRlyCITpFDFHUuARPfY0QwELT0/hDNBXdkqLn2XtWze1li1fd8fG9v2rhu5bs/HRIId9EhW9HbcZioZP4iAovYQuEoVJwslEsyqojxyDgSJYIVEPDLNNw6JhMsOigdm60FADRENEN0PGl9QDdThOhLWjDy9df/PSTfNXDN25ZvTR4XqNF0EnMuow5zDYWuuQyLpDA8AGw6G3VteOXg04aCKr+5I9/ua0/f/B0oHh2efBfugMGWLSHW1BRSB9gaPRHyHC8acnybTTbxyHxgMMSQ2aFsnjAHhfvk3wkaf1jngzJAm+lM4Bh0SR8HceFqnFxhG/csPI6kWrf7Vm08PL19+1rnrYGQp8xJk7b62qaQhFK+gQfIqGG/C9+F9UY0dnmG0VFg2TGRYNzFYlipGUmkLCzIuN9fLlG25cvP7qVevuvnfTlRQnKCEMrIjJh4ost0X/ZFLySguHVxUJhbzWQGnpyNYqQ9EPNLwfNZ6W4rQ9//nUff/aRi+l8bDOwuJpI4ZFGBjr2DrqoPOA7Db9AeNP0uXJng/3hFfoEp96Hx6NvaaSoncSnTESkiV4j/SBJh5g/aEb8H5NSiSrASIonPa6FUN3PbruqsdWXblm+IHk1tRQMkr6HBSK0+6IHtyQ+RMMs+3ComEyw6KB2ao83r5p2doFT6y5atnGG9eNLvJ5WUSIhTEVWiKsLEkH8rupZdIzcM0hFLIh11pFGmmgx2SxnwxF0JAgIco8NPCSff7mjP0+TRMAySQ9HESfjrQcIuha4R0Efnce0HGUhGePW4AWN9DIB2mCfNCYJxPwDvCkTKCi6M4tQ0f4n64ykSzoHAVvys/mvyEX6Pg4IU2zE/kZdLn4wGOjtyxbd/cT669fsvGG9a1HAk4Tr+Icx97DMNsuLBomMywamN8GzYEWAQaaZ0+W7KYUIVaGrCQsmgmwg/CM8aqHbYeRhbGjhZCwd1LQisE8ACCkI6MqdKxFvaZe9Pjaax5Y8bOlG24a9mvz1/SK5+/1ydP3+7iGYkCZRIBwyKGUalvr1JKoZSrwT5JpXfXAw2sue2D5L5euv3O9HxLGSeXH7suEeqepnBj6jEbVtjvhETgzhZekd7pMokWTNU/qLaFM8NBXPM3B9AoWDZMZFg3Mb0GpltAssitOrn6SZKLwAyEBiUBGjgwZSQvy9pXqDOw/HdiuJFaHdSs2zH945c8Wrb1yzcijdYrJZDHRGdTvGduLaIgUBalEjr9EVaL/pfEHEdeM3v7gkksWLv3RmtZCp1xQ1ksXIcdCnkuxwkfrA56mgQnUJT2fJ0GUpQsRvfaoaonKZphewaJhMsOigfktIq1i0DLpp6QAzfejjWh4riWZKTxPYw+kAIKojadsCvQ2JSrRWl3d/cjKS+579NJF7ua8irAjL2CzYbx9hDEL+aA9Y3sRDagGVBsJL7r/KBJirN+Vo0LYIOVwWvXg8t/cveQnSzdc3wqrY1O0R0WjLGOqvU/W9EUfhKxtogjPkEqPZ6XThiIzU7SKV2EwPYNFw2SGRQPzWyQxTOJA2GzGYIBg3cjut7OXS64xDaoHoWCTTAw2ajGa1i5Zf/3DKy97YOVv1rUfEQWsWYpOSYolJFTMskJGGkXvcXP7XaLBj4U7bkt0RAMqmQQZ/kc9U1XHGJqUEFM4L7QSJolYpWVPrLzz9o0XPrb06k2ji3OaBwq/8JGySFFaqHxuSjRQwzHU6L8LTRkjGKZHsGiYzLBoYH4LGPWnxhjyBARZMjyXyIbhhRCjE6IvjytsfGL1rTet+cqSFXcOtx+TljJDp2hcSErHHNBHaxczWTQQOe9hL9leRANJBfoXNUxQBAkqNz8bKRdF/juF4L1RZedKeFUvWnvlXUvPf2j1pRvaq6I1uBjaxhiLSBqkxqe0pCSXlEWb5yeYnsGiYTLDooH5bbLdSpQ/Ef2AQevodAe0ACEIVcASVw+vv2rBE997dM1Vm9rLVJ9vt0Rh6S0hkEqA71sUZPnwWfQm+BMKg/RE/rPXtmx7mZ7oAPOeUG1UMagjDctvoKtQi2NLLzsKLsbkdSxwJZwXshAtsenB1f+9cOl5Dy+7ugWloaI0VMmQDjJYK6xMMegnU04yTLdh0TCZYdHA/BbkpMpKKi9E6YOhfZaEj2LEi77HV/9m4YrvP7jiknWjq2Upk05RCzvSMNYJHRypBKng/ibnAgwXyQPYPnKm0cqgHvCw90sKt5tASMpBSaVCOTt0bsSnxmTQDaPcpLTyCA+lfaLaREdNf3UGKFzcdOvSL9y/+JIn1t3kdUi6xCnT/ppPSj2G6QUsGiYzLBqY3wbmiHZlghEzaBlBViuHblz42G9u33DuxpEV0dSeOgiphPaVL6AXlKN0jT5qmECpkw+UaZG8Z5IIQpicmTnm8fUc3o9/esn2M9KAmiBVgEekrGjfDVqUQqMy+GvsDVSLNAKRn02p7ixlCTQBlNVciEaZSsaVrbvuWHLuXYu+NxxWaiu8w0XofJZhug+LhskMi4YdnHx9O/mKYKJqurthR6Oh+QZa7IcnY8yTBrBL+c4fEaLfC7EuPHb/yp/euegHSzYtCKJFGRu2B7av6YlnDw0MxbHTc3LVfSsvumPxeQ+tvKIyQusiykCDE7jO0IFBGy1dgo6LIeTYVFlC40lbBRksawxm3LBomMywaNjxwRWmZZO4sXFn55sbz+Rhbk/bSkZL7q52eRrC1MI+tOrndy/+xpL1V25ytOUSpUa0MDn5WNs8k1A0qISLGek64pSVaKXWaFh/7X0ffXjlFevqpalohqCVHi60cCMUlQJ5SEM+SXqfjMr7d1QUuzp2RIb5fbBomMz8zxQqs0OSYo37WcF0KkFmIlbhyUV6MRiyNJkg7Ir6oasf+bd/v3rOj+96y90rL1pTDwdplC1gcBIUBbNNIinUAVcXqqGC+NNBDKTmznruqw7/2vvOuvFlh/7znHJWnxo2oeHapekTSVkfKGTSalEYCm51PpiCFQPDMOOCRcMOjlQqyXYIG4UYlckYWdLSyVSZVFvdEipWKd6/9qrzb3nVF684+teP/83a9oqRNOwNXHTthK9DHQS0Q9/Y4bZLdmiLOHZyVumS7mb6qYTYIFNjUO5+yry//rPnPvrmY362/4xjtahiKoJ2uoCUVHULzUAXBcWcONYMDMOMDxYNOzgxGtgPraaK2AcDQwsgY0WbS8tiyI1c8+iXvnjNwd+5/Xn3bvhZpUrnbaEgJGBDaqWiMQo/QniXRscOx2xj0GYTNK8EbeeDpFmnRLm5ptGkY5YCuPz7Tjv7jcdf9fbTfn3k7D8sWkY7a2yKZWrL4Kh5DCi/XYtChmG2HiwadnA6sxJjCyIUbRrZVmmD3/SDBW/9r6sOu+ihP1ujH6hp4+lk1WgjBtpLImoT4YGqFKMLpCC282aygzfylGQOTOoMGTiX1QPOWapKyFaSSmlZiLRf/1mvPfjbf3nWQ0fv/A4bC4pxoa03oQ6HG5pFIcMw44JFww5PO0ZKiQhDMpTq+9Zd8qO73vhPF8+5Y+V316c1USlX53zFohF9Q+gYYgnVEGVN0fZKGWXxIu9/tM0SKdW3VqnQUH3RGmENRTdCMvgYy5ia+R73KUWVSCTMKue96qivvu+U+0/d9c93ijOKWkova56eYBhmfLBo2MGRsaFloxYb7lr6jXOvPf68G15y5+r/doOFJKngdYjaS+2VkG2n2i0pgqmiSUJTWD7MTs5IHPHOscMx2xiRVtLGvLjFy9SWwtFiiojLZ6SKSjoZk6R9tAvKCaFanjJCuF3KPc/e93MfOO2+Mw78x7LYvV2OHY1hGOb/H15yud1R0a9oaKbBOMrDQPYA8q+TGwjWvaDJbAXrgKftBvHE/IfPuePxb6wPS/GJFJsJWkE71eMllFQE/CNzxsNkoT6i9Chcf8gpDmnqnVZ+4m1JZuWayNvV+ASlUKbMyXgPPOMkTYxQL2TrKEVUJyeBogPgMd4fYB6V0sr6uja6OHuvjx293weNgoeNMyy9qPChKo6uXn8Pfcv/gxJmxtQ9+s1s1BVVWOapvRtQQnxd8LXW+W+UQOM1FDjnrMpkLz3qTlYmQHcUpUbovI1md2ixq8/rXg0e5g/i+j35/q1MLn6CmEiWSiLjJvfgwoev+PWKD4628/7ntiZ5kZRKVsRaGh3qpDubkyqDi+Oiw7XQLCMnMbzkcjLDomE7g+ypU2TCpBfJkFUmGaGisOjyYWXpGdp6QK1o33vHY+fcvei8Ub8p6DbeSxY60vo8qUhrjB2xN8RUCFnD4uJ7sh6gkD2lYYAHoFpiapNFzeqhk486SY9SQVFABJBNMjC3svbRUsIFPJslRFJor7QtA2QEjiViaSwO0zAzpgzM7bezBwd2XrPpoeQHN4w8MNxeAYMd1agk2QFd8bv3YojB2EKHUKGQKE9/OXXqwB4NtdPUNGP64C5Nu+v0/v2mNPbcaXBfI/ohJVCLOI+OmMjCZ+w4tfI0j5Mf542ugwg5IRYlwMCf+LF0vTofkYHqYkKgb+8UCUqOxFcUVRDrN7iN1z3wbwuWnjOUoiJFQ9JN+iLKyhT0qQCZAbGRZVxKgTbaZCYrLBomMywatjPgsWrYV9qWGkbOCWmDhweIZyAdTBIlXMLVrYdvfPwf71x8roMlJFVBJpz2oJI03a3R93sRemyzsmeaRw6EVfhJEmIHZQhFFgGRrD/eAPvf6W+CL5SCGIKWiCFWISTas1HjD2mgJmIsRN+05m47Td131sD+hZm278BphZ0yY2B3q6dnPUHqBP79l25+3vJ1C7xcTweCZVfR47yVlair30Wnv8MPLUTFIcaKo6IkDREcVAsOQdM21vTP2mnuLuWxMwb23GX6kbMGDhswcwvRGBsxgIajmhYhwRTDzOIPHDtB6ORX87ZdqJR89M73TQjQZVKjEeGU0BDs2MgNpINvCdNc2Vo4f9Fn7lj03RHnbQ6H8JXSaHB1KAphdFlVTquolMRpjh2RmXywaJjMsGjYzhi7WmRyO/dpgDmWiaQDXNmV7sGrFv7jvSsuqEUNbxYue0oNikvQcNXJrtKoetAqmWjyNEfPgMWFQSLpgG+EgXryQUJ/Q6kjaKSfhAT0DMw1rfPUsMwoHoptvOjXs2YNHrjT1HmDxVFzZu07e/pB/WJXLfrRWsmdpxyIGkoCJ0jjGKQXoC9ofuZLC05dsupaWi0QG97Baa5zYVSkeYLfAb4dnV8MRtOcByoVFRUgNfAx2r/BJXyWRjhwo/hAYxIe5aQRFJjcfjtr9uCRu+70nJ2m7L9P/3P6G7OV6EcZcBghoJDwn6aC/S4mrJPFJYF6odmfgGuEa5KSCbTBWNYxNDYjlo3Ov+r+f1iw9JeyX6Cp0DiQcCS/PJ1aqa13Sureth9mW4ZFw2SGRcP2BpnemFJLwjAGC0sIqwTPcUQu+9Wtn7hv9Xl1w3l0/dAJSVplk6jxiZAvMswZTU/AU4Qh6wwF9IzohaKxAnK3Q0KBYZJgfgsh2zQkHigogIxr0uT7St1IYpeZh+4+/dTZAyfM7j9y1pS9ClHSELhswZoFj7PMBhiGjVSC99AMnWUf+K48s5DxX77txcvXXedlG250onF4fBHlS9Z47+8ikl330ASdyArQESEGyiZJCm7AMylZmhjBaURKoYlSQadB5eRroSU8byFqMWvqAfOmPRfd6B4zT55Z7p7LiutDOi1CGkFo5J4VT+E49qnv2/qMNQYU3tHsBJUTsiDPp9AVEZQyshCPDP/y8tv/bXl9tauFsjopXEZhTBGC83UqeD3NJIZFw2SGRcN2R0VTC5KiGRysjxQb/D3X3/PF+cu/pqWRJqJrJ6dawZTRtYXXLuEkJjjwyaCjV7Q1ogui2WObBRNJYf2piBJWMyi477mh+QQt4fFUkcSsxt5zp5w4b8apO087dPcpz1HZjqJ0NPSQVQBOQPpsfNEn5W4JZwTDhiNJEgR4Cs4yfvKhyTqLr9/23CdWza8DBUkqK0ItSmNSUEnRkMP/C/QGfkFFUaU9eXCAAwBjhdGU+oDmgCRMpnVUn/henAe+ld6L06RHqqmlFyh8Tq40tdhr71kv2mvuqQdPeQUMLc4ov9HjjBRtGg7V1uML8AwkMRpxuqrR+RMKoFPVudvHuaEyx7btQIGlsDcu/+L8+z+7pvWYtEWV8rCNVFJH2judmaywaJjMsGjY3iBB4KEMgizW1U9cs/BTdy7+ZtEv2rEZQit5YeCO08wE/m2EVAnvDKxmSiFkr1nD9sGh1KLHSR7JlKIr6dhgmjwXKmgd7bTBPXedefReO5+167RTZ5T7UBwjmWronzwogQ/k7ge+OPQCTRikvA9ToIj9TscU0WgFzJbOGgPVQeYNT+aERuLLt5/8xKpbkiqShliCTxxIKsGaP0OvJlMjiSpHTVA5lTIRdp1GYuiDMQjKY6GNhaud4GL7/N1jAxukFfAnzX6oqD2EBf402qB6XahR51rL5ojYc5dT9t/tD/bZ6fnTy/1p70loqZDUWNDk1ifG5FGvNGXUibfogOtEAZwQRc6KgjJz5I4hqDgcRm567B9veuRfRr0oGlOquInGqzoakJmUsGiYzLBo2N6g9XxxfX3/dff9xz1Lv9cuRtsJXryxPlhb+oS/yJtNIVqa76eAN7qh8+pELQr48fQy7MXY4XpFEn1CupigBkS/GZw37YQD5r5kjxnH71qeTI46WdyUXXYYsQiji/JQS5QoPuw/ee70JryKZ3KPlD/UMdIZ2PixR52VDGTgcbxv3H3aY8uvEYaWBJAFl8Ion+qG0L97pEHSPtGCVqPgexIFMLpYkWiIRVYSFN4IGeApPZKwVlEQRkcrUDkFlAlOhDQLueD4bXE6uEQ4IMRE8LIqA84ktUW/7Js7cNiBc15yyG6vndk4CN8wMUBioUCSpAMtquxcDJpdcTZniBxrGbQ1KIwC7INFxTgtVrqHLrvrA/evuNiWEKINqX/3ahRmMsCiYTLDomGCQR8OYwXzRDY9O7vketP6QLjJwZo+H50hI4Y7FQbLrCsen//wt2559GvrwwpTCun7RKgL7bs1WqxEf+1GyOahI8D/ScVEEXMoGFllYVG8KD26CRhJiIICtjPHPNJnFWVNyMYVTrqfaubuNfVFR8173X6zTlF55wsyV2NioFd85dYzF629AoaaPOmIf2ndRpCKQiAmhKTy3Ad9O7SRdwLXdPr0mc+d+Wd7zz1zZnkk5e3G/6i5JJXs5ENA0b2kApOIyUtsKacCKZWxvhkSBj22oXPscW9NESfK05bbUgXt7lzxg6sf+I+V1W0Qni6EJq5zrUGgzS8o+FSpGiIK6gNyyqMxSKuMrHxVslXZgWDRMJlh0TDBwJrkse7OhDdMKi1JJAOiJSmF2BaRpp+dqUbF6psf++ptD3yt5Ycq1Qqw6zSbr1TopC+goz17YNUMhAEZXDJ4OG4kmwvNYMtmhI7BG0ptYAVjiEUJ0aODtzKKQkeRauGbOw0esvvso47e44MzGjs1xFQLnZEnD/KiRBy0t9kHn0E0UKTfhIBq1Ib8etQArVT0uOKqsE3hIMfUHjOPP2afd+0364X9chp5+SQtagpYocQbIsq2ptWkluRCXjJKT1L8Z84AQeCJHqswXDNHa1+BQwstwkbxwIJHLrn6oU+INDga15iGqCvIRLq2pTU0Q+Zpz00KpKFJMUoYVaAJ/+6BHma7hEXDZIZFw0SD6pdVpKHgRiAD4HAD5kUBkZb454EIr8Ptyy+45J6/2hjW9FNAH3SCDamOKk805DGAbk2R42jajA0YaBrhQJFiHsMnz5faCtkx/CINADcUxS00mbhp5V4Hzj378Hl/sHPzeC0aEsayY85IFtFZULHzgoeesq2JhhQ7qbRyxZLpRWnwWPoyyiA1RF8UU9TAoXPecuSeb5szeIQNJeqJMkbis1qENKolrZFRUGadaswXGhcDByS52ePempon/Yvve/LK0d9xaf3I5fe8+8GVVztNNYynCojdSqQ+ygKCNhxDwvka1XAOTcGjo8kfZnYEWDRMZlg0TDAxjA0+Z5PsyKygd6bxXbIntUwPbfzNZXf99crRBVE0hGknV0pSE5Q/MYMPaiGtFt2cYyZ3VsM31hQ+mUPerBK1w/dIZbSr4UKqQgejY8PvdPCeZx867y1z+p5TiAYcTno7fmBIIgqHA1EkI56hgXdag9lbnhINQmoZJl400NXMNhVXCj+wozmSQ9JQTTb5StoUHcztoJ2x89Sjjtn9DQfPfU2/mCb8kJSDeIMXlVCl6ZS/85uGIVC7FMrx5IRFD6G0YHQJSZfGOKpQbtkIOlZJ3b3iW5ff9dGhtAoVjUttdcMFtFljrKd8UR61j+ZqYhrpzLAxOwYsGiYzLBq2BXygiQlDxmXs5oN33lo6uvDS+/7mwU2XjTpR0ii/CC0RGmSV8aNghDp5FXVUeO13JzzcbGDSyDnOhEgzJrSIAH5mtk4xUHpGLbyJdt7UFxyyx5sOn/MaFAb2xEgaRKA3QR3ABcaj37Jz+L8TW4ey9pBtTTSgMnG18gxUrsbO8AAl4sJjOeySNKLRp4IXvo5lKUQ1fdA2Ttjr/cft+qeDxRRJyzihKkTSrbwkVeWATQ2tQYosedr1ure0Ymzi4uM8Iq47rnMe2SLBkgfCRsTaS+7847tW/ig1yhFXNXBmyXrvbEmjCzTbRTGhdO2ZHQYWDZMZFg0TDI3Y5xuO8hOQN0YxZXUYuujeTyxcesGQ22T6rYcigLWOvihoUQAtmMzZD5SGeRcuRh9EkU3Rs4c0CIVZqLyhdrIwAYnC93xBkyGyjtPLXY7a8/VHz3v3THuAQu9BMyk0lg7POaWg6WRg2JSTFXoS2DcYubw4kn5CwBt663Jua9MT0F60nAInTwEo9JOfpKJJ2v4JT6DmyAxrmFdlvWqliDoKTaUPm/OO5+z94Tl9B8A0h9gP6aAUumtBaScSKh59NRz63oqwHAlJlYcy4hdlj05GK5zVqJINXGgPJWvtXat//Ivb/2JUrcH7C4MWLEPShrJURxpywtnxSMMOBIuGyQyLhgkmilGV+vI91wrCDqfhWx77ys2PfGaDXBfrprEtmF0ZC5pSpg2qnYoSdhduHwwwrh2su6GcyQrH6RzwWUJGLMB86UgKAE+oqqUa5VQZ186becqxe/3xgTu9uplgLaqsXYzQVd6HKYfx016OnWUc+OT/GDNqYjiLbCx73btse6Lht7RCB1y12hdS19l7x01ooBcgtDwsLVQgCS0KbFFeDOjmIbNfc9zef77zwMFKFDY7+h0gRfCeHlcnXbgcwYoy5WkmUeURDkqxnUJTQBrSclkoXTUsFv/6tj+9Z
9W17bDeNAROBdWvDbVSKZq9zgvCbE1YNExmWDRMNInGGLSyQdT3Lv/xdY/+y6NDC1KhcWFgUVSy0bmiEA6GHP10bJjUgmXuTIfDy0wRvj5NbnfrKsKwBRINklZwZIfY6un77XPkC3b+wsyBeaXop5TUtO+2jAl2TmlSCTTSQGalYxrpF4BNyw/H/oafGig3gGx2/u4R21wg5Nh8BAqB+qDbDdBAjooQVjmFNtn+zsISGm2ohDampk3IpFTB1TR2Y4w7pO8lJxz89r2nvVy6MsentmCqc/RhbyHNgH9QuKcqEH/TxtgUZUGxFXQWydB0RUS7vGnk25ff9M9D6QFlRdUujMWLDqdAiTiYHQUWDZMZFg1dZyQvr7dkRCkSABVMdoH2UEhFjpfvjOaTWaDOOGg46ovbN1/x4D/eu+QXMMTGFLR2sUuX5ZnyLtAGVil5CnikJfXwGylOglZxyKQaTlUixal6l5P2eNepe7+vrHft8UrJrvEMomHi8jR0iVZDmBFxxKxXPO+Av9p98MRszCHfaD90aYSPG7Qc7EgjdN8417xgdwJA894QHr307r+7Z+X5pGelDc6VUL24GUKO4VU1yg0hhOYYhRsL8GS2K1g0TGZYNHQdyjWsZCchE00D05ABenOYZHLGgtDQC3noPrRNbGzQa+c/9E+3LfrGhmqjavRL1a5dMKns1i6Cz5R3gfzcoBq2SCH6SPmaIkUwTPVuo01idnP/5+zz0YN3fV1D9mc32EyQDdpstrWRhm6RQp8tYl23rSiOnPf2k/b5y10aB9KSmdQQclikgfwuB7EQxLASpZwglVc7oW3lhLhvxc+vXPiR1a1FujFluN5UCKsMpQeF3NGyjxaPiDbtoLJ9a7lJCouGyQyLhu4D80wj0jRlkJc00AJ3mvL3dYKNJh8x0UbWUdUPrvv5RXf//aZqcR1H8RatYN/I44eZp3d0A1ze35l3gcaSaWratGuPN9jCtiu81c+2+zzv4I8evvNbyljSZ6AztKgnygRtPjuqaNBoSg26ED6hlcSmk8fOfffzj/zHfrET9dcJFzjnBifnHqo02s6c0VYHRcjrOiqly6UbH7jsgb+8d90lqTDKqZBqymGpcA/UkAw0spUX5jDbHSwaJjMsGroN9Zr53zQWqJg7cgptE2KEhAT681SurR+96N4/X7DiYtWXdy7IcYIw6bj7KEC923PA+Ir/lXehoKhF7ZRXeSNHPyR2aR50yqEfPGrnP0JJYHfyZowoWWcpp81qYzvgKdGwreRp6BK4KIGCJmnrToOzc8LEZkNPOWnP9x29z3sG1RzoQJp9Ii1I78ltcAKgmRHaAdNReKywbdm+beXXfnnzh0WfU0LXnrKEGV0oW6NxUdKRLo2oMVsTFg2Tme3DEmxH5JGEmETeF4qiFmhbCcgAeFckF+KAk/bSRz79X9cfvHD9RUWhYm06eRbwI6MIHh9Xkj7YHTpxDFppUgx5FaWm/EKiLZTv6JNazBQH/sFR5/75Gfccu9NbjRealvZB5XjohZBI4tAifWZCiTC5RjSUtK6RWnljLdvaIFf+5qFPfvf6F929+peVqr0clZreRosyJghqKFku0ELNJMrUOGb2u/78zPnTzB6pppzYfX1FUrWDqBCNkLNUMQyzHcGioctI8uOpK8xjDDmSADJcRRWsUMUDG6793NVH/GbR3w2FWFPkfLA65wf2g8EVKUmtLT5Iuyx3ixzHgOLkJZp5jwChaNjeUGaoOcVerzn8q3966j3Hz30Lenpa2ylJTgi8HI2RCvoFn4b32DnYdkQeT9lx0E7Trg4+UYyMVVBx0HQyaGfEEyN3/ej2sy+87SVPbFpYU2xtTVkcJgo1jGaUhAmQOdCl0jdi/xx91B+ddv3Ru7/F1KVvOwqQQZNPlbZdE8cMw2wdWDR0GXTpZKSp16YxBlpJLyufNrT16ovv/8A5N52+Kt0TorDKFaqs86yET97LIVlEYayLLibfxYV0MYVIygVFScageJR3werpM8TUFx30qXecNP+42e8pY6SdlFBgMyx1A3IB8kIrRykD8GEYJ24mE07sN0aphgjKUwJp2vIbjntQBqpO11ItXHXVd64/9dIH/mRYDjnKrDAx+NzYKPRCOLQ4uh1kS5R+etj1lYd+6xVH/dd0MyuOiobo1yI51xr7GMMw2wkc09Bt8vwEgN2nwX8VoRgWL73/mw+9kHwsERI6fS3q7LzTXkbwyMzYaDLeD51BigF/d8lOw7r8zrwLb9jtkqKEtAkiFZ04zUgZGLQWw0KUiTJAUEidppgGRRMr24lu2FEDIXEKOANagINGgnYl85WNdFlgoiVllU60wmVU7No86rQjPnrErNd1PriVQbPJATRUTmpUKFbevNN6mvTC9Xh06OorFn7i0TXX5cCLRkzd3DOF2TpwTMNkhl3ILQXGlOyQo/AF2Ncxs0+havid5yhoZeOy6pHv3f3n/3Xfyd4NC1157an3jxTBYGCrU4S/qKIw+cemJ5P1bP5loTi4BAnSgN9Jjh7Kg2PilzNa04aUJAxqcdiMl/3pSRe9fa/LG6VVlE+iSSv685fCcSWrIwbQw+MJRY4sylHS/PRENpPqyUUouZLHbL+npaxZ79YuwbfFO1DzFV52lHDKkeJp0OsyKtmAGcv6KOcoGjsCjka7bLiofNK4VPihOoOdgzHGpfHSBFg5qka6oOgWTT5srlhUNV3i/IMHKtGsDx3zyYN3+F9/PhsgekxOpEH5F3F18L35+uLK4HkdkglC4qcUy+Id37/j9T+87c2rxcIKdUJjSBRBkE+E6inFmk6jc2o4o1wt3QJNRtNEVy4Z7QZOpUXtpNzQdRD79Z32+iO+f8K8d+KyVaYtYjMkTQNzEKpRa28hXavcEBmG2QaZSGuwfWNpA2AfVYTMpr48Lx6TjjpM5ZJybe2vfezz37nmuAdWnG/StLFP9QwPSwkbaNooiIqqpKw/qgp9qfSQEaIt5tj9//DEH7z+hB/M6j9MqO1nWDiWkoIxUa2ewvJhKsnKUTVL1Lx3hfU61jZ5U/syyNKOQn4VcHZDhPaRMJeu3YQ6ouMUlIYxkVbAgWn3DhxaR6txuAgBRwZYQnLQK6OlbJfKlyZq65OKThlf9KumKlSCaUuaAkah/7SA91yTMSagLZ7O//pza3LL8h+e85sXzH/sM0bTQFGoxoa2UjKJfHzlQifWxXlXbZVhmBFKzQCUmFru9tJDv/ryw7/WPzzgbAttFe1TK9lWobZOq0Y5YbMrDMP8Hnh6YguBhVbSKTji8IDpAYBBq1RsRKVWh4d+teBD9y77ZdEsnK9pMUKPq9lRXsdgk/XONRq6qpMqIlxT72PhzfMO+tgpe/9NGRoSppe2KiYXcLsgkTtMLmvnz+wdk48MSSRpv+68wrBjnmWMdfWFu167aM1ltN005dqMMjQh4GhcwDmtKTqVGvzTLkZn9p/WmGQLDzccjzXwtMMnvol2hYAqBJAonnYIox8KVXmyTBAbqegsHdx27qagZUOnMCL2m3b2S4/6r1l980IcMqofzRbl9WnESLj31jlj82JckhS9BE1O0C1Dd4IPLWMbIfm1Q49/Z8GrNww/GkQrQrihQkPDiLZ2IoyN3TDbIjw9MZl5qi9mNg9aWUB595yQo/BX4cChU5Spv1atGx77wtcvPfneFb9UfXbU1VEWXRz+fSZ07DOq6aRLxlLAhI7KW1HFA6e85E9fctvpe3/KhqS0oygKvHtbMW2/n0AzLRRchx+UOiZFo9lU82RVYONh0GnTR5o+V7JoNgpHy1iTQ6emvVaxZYQ3jnJRQGUk2P5AiTEAKiJ56A5daINrGRPsWiQDqoUL3msZoUms8DI67z2OpmJZCKtzBGJSCl0m/aC7hEqsaLJkm1EMwIq0aUSEUjww8otv3HDS/MXnCDWIkkpVQVwVsj+JZhDKWpqDgh0f+1jPQOXTShwRkozG9OFK6pB27tv/3adcute0E43pp9CH2haoyahTgbuJYZhtER5p2FJoryFHSZIiTFYeDRdx/fC6H9z3xhXrbw9qlDaUroUyNkkHo2d6LMUVvh4GIWrT53xbNIIYTHNPP/yjJ+3+niRkcIWhEf0K7oFW1GVvP3qxRUWlIHz4wzSbP/a0r4SGvx9R+XnsBK8XOKvP33HMqtV3xzyLb5QMQcAuDjb3mVHMkLhSoTBqcKB/1kDfLKP7o5NRtKQMI+3164dXhLTJNuJwe/269asqtSILEQpxwB0iaZjCOBcaeWgi754gSF9QVdJa1qdG+Mlr3xbIVzhpE2jupd0Q4tDZr3/RUf8+zc+lKqTS4y04RfxslZbgKb90kp5ykwZcE3w/riz+aowmc9kjf3HjA19UDdR3guRFXVImCmZbhUcaJjMsGrYUGuKndL3Uz2lRC3/749+6buEn1vWvqoeV0dIkHVOtNExK3gQ5e7e9o5CiyqmEKbVCnQ6f85aXH/kfNhY2NcmA5LkKOHMUehFrTcGP28n4b51HGNAnkejBD84DdQ/LXWRz7hetWhCL1cvXLhhNy1asemRKOW2/nV88pZxbln0zpu6nxdQYQ0GTMWQaKYohJRokz9CSA7KddG1Cck8+H50IjdQ3Uo+sHXlkXfXA+mrh2tYDKzfdv2rt406N0gCHgvGjJkBWF7WqKMQFdG6mp3QD/pwoDRFTA9cYnn0IzlrSOMGJ/ubObz/8wl1nPEdG2jtKyjqlEgWMss5Rsb0EjVO1koS4KvKUk9dos6guqjKJS7lg9Td/cPMfeSt1mWieDcVltlVYNExmWDRsMZUIJW4b2Ix14ZHL7/vrOxb92BS6DqZseO9ox2trmykq50fgCivaTbiH5B0PS6u8cVNfccIX95/xBnwh5c4hcQOb4WDk8nyKiDB5NFg89sFtnlaAFMpTPC2xdu3wA6uG7t0w9Phjw7/etGn9UGutS6NS027hSSpw5m4fO+3AT1pKZjWidX+WA2jl+LRQGsfJbiz52PQMWVVZpEhjFfQn3ktRC7T+4mngzSQ28sO4pFqzsbVwyYarlq27ftWm+4fdugDfWCZtNeQY7qanC4UJFA0UoenzyAyaKAVnUNho0pBCzece/OGT9v3LPjEdikJrqDCfY0p7vLsIjXzQeFC+TqhShSugDF2NiCsl+lHgZf6mc658yfohXw6M5ngSZhuFRcNkhkXDFgJbDHsQhFu46vuX3/OppaOPqIGiFetpTtboF8u8U0AQmvYAJk+0M4/eO5wRyunDZ73mFUf/y6DYo2Pj8As3Nt3PtFsVShBS0OizQ6i12T4GgB8bvWnpmruWbbhh5fBta4YfaEeHCvVeGZqRwKlR/onOjlyoZJzvi/f62Kn7/l8NI5nrPOkRnfpxHNQDoO08Jcwo0VFNT9l1PBh7gR7j8/RHHkrIcxCdID7cMGJEJJtiEbVwolrTWvDYqiuXrbvjng0/oXiJnHYTH5W0TmEi76zohbGFJ0FDhZaR3Hola2dJfB004/SXHP7vc5pHUTtRPobOpqw9JIlaUkYQFAbqOdc9vtrnIZpk8GSoDa7jRrnigptf/+DQNbbH9wvzbGDRMJlh0fB7aOdMBZLGw/MaNUUdX4q4a9SGsPSah/7hxke+VmtRloN1PURx9l3y4MmGZSMVyX7RZQLkSqcoDOkSrZWEMMENTN1w2sPPff4x/3LQ7DfT5LocpS0R4cxJ1wkY7CUjeQKaVkWSiaWSktHECxRaSKdA50EBiygYrPhYcTqW46nK8nmxKs1BtOXQ4g33PLbuN4+s+/myDbe4zTQez9/rk6fv93GdDK5VEMHQKAUNtvS6U2uLuGLjjfct+8GDy3+1pvWY1y5SJi9R5hEe1EeMnRBOR+aZTHUWOskqHSmFBMqX4HND0vXWw06eoltirAfszDMO+fQxu7zTBovSeY3mYhWF6eAiQfNSxi8hq9z8e0lnJIyqSoe8S9pouP+6W79+5fC/h1o0S5FqihmShagc3V6WcpwzEwyLhskMi4bfA3lIoqBxAtVWqK5Yek87OCwcuvLKu/7isTV3F/0DTo44l0rTL+UIrGNXgOHFlelcHKU6ppigjD6xxvOVl0Vf8rUYlOVe08568RH/PL08lPwzmqvOeyOTe+31kwPvPcN5D+e946ri62kIGgZHkiygr8ZTgXblIn1AqiLZ7MPnd+Zq7UwNPN6ev2jV9Y+svAhCYdgP5fEZ42h1w+YZiYkSDTidEEJUOsm4wT12z+Kf3rf4+ys33eEGRKg1ST1BW4Vp2Vf7Vl65QZdVijISHtIBJSWliDf2EmPFaIVabUoUK4aT9/3w6Qf83zJZunrSR2dorzSqLB88uf69hsZ0NEQM2hDaOGV2UgrNYu0vF37mzif+o1X71ISioQkjtH0d7VimL2ZCYdEwmWHR8PtAJy4hHLyGg58HrYPacO1D/3Tpo/9G9lvXucuDYSRDgNtIm+7UJ+kDGDtSDP+jHvDtZHxo9Rr+6oshlal12j4fO2O/Dwsxg2It0edS8IRKXmWTXfV8rpqsZR5MgMrpdOg0vKCjiLoT/AmPO/coUcIi1DqUpBYkzLoYFesXr7v+3id+8MjSy9eVK8bOkiq8oDl56ZLwsBKbxYSJhujwRVQJkdZZ4CSquH54dM0Nj3914bILN6VlQTZcGjW4LKHQqca7UCxSCVQ9MNew4Aq2Ucne5t2qvdBWmUZ0bZSkqWJr96mnvPSEr8+TB2RNh0tHCZ9Ton1RU2op2Rz7ZO/AjUOLhNF40B0Zyo2toHeru5f98OJ73zqcmsG2Qp2aqChc0bHPMBMJi4bJDIuG30OKXkhDU7/5tljt7v7Bje9a3r51uEw6WLJHCd48lANsNSVrfmrA/VkCu4qLk2coqEsl65If01S9KOCCm1jv2rfXa0/83qzG0SYWUrXyZLrJGxNTaWFx8aNEg/7sHU/WTEoBbQl2D5IFT9Y51JIUVFYOgkwCsLUQo3HpE+uuWvD4jx9ccUWlN6oGpWJIrtAGRwj4LI6H88VvOlgXRAPqodcrXp9WD//z2EXR0mmKk/UD639y3aP/9sT626GbIBa0sFFBDrVw3rSQJSl42jj3wpIC6yna9Ds/AjmmJE2FyCCtKAqj3nH0z3edfqIWA4GWRtY5hANlhXLIza5nxES6lmoL1yvVNPgCxUkjNiJosXDNr/77zj8YDSjoKKUp6/3IBzMeWDRMZlg0jIPQJt9XqNtWnHfpfX+y3g8J1cixcq7UWoTS+zaZAKXq0L1EdvDXs6eO64MfCvyn/pT2SkhB92l14MyzXnH0V/riLihY6BjJ/G6ax1AoG+RM7nx72+fTF1IcAzr8KBUNbVP4AqFGQtB5gDuEoGCIhvySR5Zde+uGbyxb/cBwa6ktcFLaBXzYQwlpWCmZOoMrxlicfoDvjqN1hivGzUSJBtj6vH1U0OSi08oFhZ4UCk862pki32QrW4/Nf+Lf71n9/XXtdZALdGkkrlGANqKHOFEcpdfXyxtJebFxmaipRuFQDI2vbfW96Mh/P2a39zYp0rNExyCidZQgrNeG2kMTU8uhBTCU3hrP0NPR4rEXzRUj95533UlDvkJ5HZWexxomHhYNkxkWDb+P3I+35NpfLvjr21d+s1ai1E3fapFdC8ZTisVocQPBr6RR+qZK3RlezmH+dHE6ioFsCpxwCgmI/bV9/kGfOmmvjwbfWQRRpViSW0iWh8Z4ycPPZL+/1+DUabylk3mJwjYpxTKMUccWxUq4R9fecOcT5zy05tLRenWkc6EhBJroifQbZ0enCeOVl+LRwkWp6cwlJI9WT27rME4manoCUimvrsAZoMXglGhECCWoy5xV0uc5GuWTNBvCkjsf/86ty7453F7dCsNUS5GCZozyWscc29pD4MF7fFehKx+o8pVy7VQUqpKhCOLY3d7w8kPPNaTyGj5FSL5ejzSg3pKkXBwylaSKc2PqyOMcw+tjQh2t+d6NZy7Z9EBNS2nzx5gJhUXDZIZFw+/Bi5Hlo3f/9NYPrPDzhyvRaNLktYUVSAm6AVYtBlvHNro5A1MZVLei32F9taGwBhxZKQnPNUZV2OY0aV9z0k/3bJ4qSR9oDyvjbUFLOhy55qQd4FUXtCF0inmXxq6NffxOcvshQydh6fEvug9Z+TSS5Iy1rfsXLDr3rqXnbfJL6mRogURTFKM6ZmcRHU0SJU2fqzrRrk8EzW3T+dLjACVBYSObxwQGQoo4djflgX2Kb6BnA62PgBeN64ITznbRCW/bJt762DfuWPTFVe27cCGV6k8putCixJ29xBjta+tSu9EnfC2jU42mqmuXCmrYg1rtXB7zxpN/1S+nqVTR1ipZCvUOCoihKJwQ49gkBclF1B9dt/xYt5Kwm8TG7179/DXt+9s9jvlgxgOLhskMi4bfw1WL/vmKu/+tVa6lEdRI2yri35CU0dEHEzpD68rQZEXyGu5lt6ozUcQ43G48hAvuoVRM3/TpM//00AdtA1aXJpstvo1kiqhTNk05gowsLwXjPWl8en03w7Tnf/E91MWr6NOGxUvv/9WKDyxft7AVh1VJuQiBQS3Be7V4W8gyAz4sjaUoOlUa0MkHMhAReINEXZPpIG2xWUzYSAMFgdLQCh7j5FB0qhBSCo6WmZIB9JR/K6sGihKlWJliVI7eteLCGx/+j+XDd1NEZCyToI2vekcNHQYZmYT3qGtqWihXVjmw2xT+olOa3bf3y4/+yj79p9IHeqsZOjXlSeCKIrfVjiZAPVAAME3JoUZwcxmS7xfd8ee3rT4nv4GZSFg0TGYmnWgIuVPWiXanpJ+xTp62H8qhVzqbKpeSXa9W/OK2Dy5c+336WM+wsfQ0dkERgFQcWcQQjIJRQbFopJvWrtsE/+qkXf/o5Yd9vfd3J2wbOgGaIMhRFDD5URvj5IgRJvoyz8SjxvBDVo4cRdhFGinQrbjqhifOuXHJN9elh4u6c7StzcSNNGwBLtWUa2tUr7n+0S/c+PC3h+USlBiyq0Qz9InWL0QIUzLtglI+U60bo+pK0LSU8S76bo0jQWdKG1q1aJTNut3auTH7pcf8y/5T39bIWshJvDyqRJ+gveDbSZv/UaVblwvveevdT/wo2TbUD6pFqtCuRKOhKZMas7Vg0TCZ0Z/85CfHHk4OZKJVb9TGYVTQDZMJRFecEyUmRQPn2tfCroi3nn/12Us3Xo9OcuyTvcGpEBVtsKhhGFCeEKyhLIfoqT26cgPrrXWreO2JXz95r7+Tonoq4XGPoLA8CuhHBaUYqVfOFgvFwFMFrS+lzbVpzp6yQXiKwA/SrGg/eukDH/rRgrc+uPpyoYYl7bM5dsCtzD7TT99z5qkUWUgqMOUHMLZZ/mxLUGiBt8qgZqvk+/fc6YxD9n1hn2wsWXaDjQNSRUf7cRZROFtEVLKPlOoZl0LrpKDolK99tJYyeIwd8dlhRHJO9PWZqqobRVlVGx967NbBnco5A0fgRUNTBmXKZcDFD9FQtOdEcNDOZ29qLVoydHukaItkaKmzCrTYY+wNzFaA8q6TVyGmNfc6bu7bcK9x9U8eej34uM0BC4JeNtEEbi0ok4Bsw0LTxG0rDzCTw3L76nO+cOnpK92DdWcbol4Cv14amOYyBmO11kY4H42Bl0y5BOHWT5Ez3nvatUdOfYdNTsqeJ11QGraqSvAtJeWc7DxJkyRjY+zwLjTNytPmQ/TcoxuuuPCW13zl2oPmr/n2SCOGBixKrdyka1ebS4hw17MeDWWhdSHibLHfmXv8w4decvf+M09QzjcKoco6QZ7JhqNlvzSRg9ZS1RCWEkab5nTyvE9XkMKWaHWVt5QOEk1QjNglv7z9Y7+47wNeVjT2REG/pMLqoKC7JwodzCsO/8ZLD/unBsocm0GLRh+0VQ6vZRim90y+zl3Wksarsw9KQQqiobVMLjgrCjESR3+y4K0X3/muaCvKNKB6G0UIKCICZjg5EX3wKVBmJuFowWHVkGYXfei7Trtx3sBxeRgCNqa3E96ZSiuIBTrxrK5Ckl6qKkja
WUEmrQLqz0Jw3bfxV+fc8sJv3PSCe9b+rKbIBdg0Gj+n6I5Gb4dnNpNtqjBjGKrhmORopL0YUM1t8t9TY7o89I0nXv6a484fTDuJtrBKVr4t1ADkmEzKWKUtLah1wRhtOmEfXcHnCZ3UGfGCOlTCNMymeuimJ776y/ve77QThRaqwneXSiXae3RiiKrWUZwy56NnH/KfRosqThmuEq/DZJitxiQUDZLGMiMtY9QwdOhtaqGSTdY8svH2r1976j1rLqhpMNaXaaqL3XPlnoEC/V1wKUZrdUoaKqZsGhdiIxb7zzjpnc+9bBe9j0ietuGW5VawfiEUNICQcpYh2DNaDgevWMJi4PkkfFD1w+uvvWD+q8+7/uz7113mGiIa5b1TTvVJXUiJdzvSG8zvIQWanJDQh3DhZR+ur1AOZhtq4rCd3vie5z565n5/Zmq0iTLJYQWTHpt1lRfFmOjg9yefkz93B29aXlhJkbwtESxaXF35/nKq1+mWJedecNdrh8QayEaolOhcz/fRfma8NN7jlhHHzPmTFx/6hUJvkpI29mYYZusw6e42dHroGbNNC4JCzSgwOwl395ofXXDrWcvcglai3PcmlFJt1DCfPQYyIQVRFBTNLk0yhRje4Ads3zFz3/n6Yy6ZonYSoSWV8cKMuiFaAtdjdN5DAvWj4NCRL1yGhC8tfBxJRjw8dMN3bn7Zd2499f6NF0WlDZxSj5LXtNRee4fHdYFKs2mbGi7eFht5TG1qhxAECZpAOFV7GmCyUIeUfiOKqbY4a99/f+MJl86bso9qw0i3ymKkpF0stFao+pzvE/93C7oToo+4oiZSZkbRX4qq2iilbSd398qffefal46qTTkJl01xK4x4/W60cNpqT8nJ7Ylz3vWqA79SQKROTFAmw0xGJp1ocNAKIqq8DZJ3tEVDpZZf+fBnf3Tbaze69eiLg5cRfXez8pWl2LAeExK5d/Ay6xhC9NqJGWr28bu94xVHfLkUZaK+ka4RPL++YnBrTE+k5GMryRGoq5RgPyjgMcmNa+Wj353/wnOuP+2hkcvaRtfRUOy6SCqJ0oqy1EkUFM9e1sY653i4+PdAeSPxH13bWqbK4Ama3hnSyRhTJL1OK6uF2W/G895y4qVn7PPHzTStHkb9OhWtr/rIxEtBm0J2iZwrIdBMnZKqQQVrtUQTD2JCA4xBLBtdcP7NL13jVyRLYXBjH9vqSFcKWUmjKldBWp2w23tfddS5ZTUWfMMwTK+ZdKJBiz5XU9i1d0IXelNcdt51H7zysY9XcLG1SLUw8OqlbnmtmjlLdI+Jsg5KDLWqcoDSAmrfd+ZRH3rBAZ/XkVIq4qVAa9ZrdNwyil6nC8xIo/FtaBg0AgN1tb59629u/dTnLj984bqrgxF1EImWeEAtOJQnpcL7wldBqdpaF0JqOaGa3In/HvJljRBmKhUqlTKaFK1NgxRWkJxMM2hRTRI62Wlq9ov2+9yrTjlnRt/+lHdStymPBa0NoXiTscM9a2zCD1QgLiA0H40wSV3UVamlV1EUsnRJPLj29gtvf/WQWCL8hI0k0XaXsVTRlyUa6SieOXL2q15z2HmdVxmG6TU7rmhAh0yDtzBrlFgQwMjhbwlDaPFCkrZ8fOiq797wkoWtC4aNMhGONV4m22xEu0S/7IXvXoCVqVHX8Nm1l0XMEWdC9tVJFaIPT8Gl88PtftH/smO/cOzcjzRQ7ByDCYcO3bMUBV0oJYzq4vTEMGok0oCLww/MP07V0/c6ChL1tFnDqFp6xWP/50vXvfLy9f+OKpS6QilgXcjNjBQKl53dmn7wAo4WqLQFOvPNHzanXT0hR7zSAUaU9p5ALUEz4Tc9SJISVqUCz+MKomxkPmFT4XImS94xnhwzoCZfsyBxUinWuIpRyUDWBVCDoCEUehCovHT+E0K+rKgp+tX5oTrEKeAZafFAd16kk6L9H45svOIvzrx8n6lnO7TPZiun9oAtd5TKg+pHB2GSoSYepaWGvpl4yFPK4k0XFz9SVHRZTZVcA2XzqkpJllYsXj//W1e/9oF0fV4QnKdU0H5QoZRmBGXpfX3mupK0ywluEBpxsWLg6N3e+NqDzjOxCVFLbbIWOtJ2YZS+imGYrrLD3lToNhXMR0reBUm5FmKkuDNKu6CScVLeuuQ7F9701ic2LmjaQUrH32NigV6sEOjbRQ0nHZ1djKNlIVtplNYkuOZOA32vOOa7h+/8jkK0yE72mtgfAq25Jw8TNkxRwgh4u/B3IasqY+9cfcE3rj7jinv/ZdStI5XQY9ow+w0hm9Hb2tG2XDBEpAwMzBh+VJIqJFEHSAs8gl3T/UGV7ejbwjkVo6G4/pCaUo5QyEqAUdZGksKhS6uhQqCNvKRcWWQfZfA6Jg15tJ2A82+IXd583M9fdeB/QYBK1fSxHzpKGhEdnG5ILelHRcPohHbWvYEA2nEMvyFhpPGhAUd/xdDNP7nqjYtbN3hpDFqLz2kuURL6Z8JiHQ7d/VWvOubLukUqJjRJWzaNruue39cMM9nYcZU4bZeHbq5lrIZUgLHQ5IrSesCoqqse/ttf3P3OTcVi1dSj9VDOet9balgo+G3RUveLkqWytLI1CsMnrCrQy73+2N8cMetVJS1oxF/d6/WfCZVgDyBOKorygE215OkHE1Rrhb//Oze99Pu3vXmFX1wXwTbdZm4atSVISnAo6opyQtCiP8qh0VCxX3gbA+VcprEZDSFIGZiD8imMaFE1jGroHLLpEukAeMsJ0jCHr9LQBDnJnVyfcN8TLgHlPYAZzAfCbzSM7YSgooy2TOm5e7z/LUdfN91OS3okm+g+qWqtpQ+uWZZ1Sxobkuta+/Gh7b3ISzZGQ/IJ7aQUG+MT5974psWjtzsxQgMkKB5NVKFN9ecPTQCF6Dts2ttee+zXjZa1n4KCorB2K6hdhplk7LiiQVif2kYNkL2mva1hNyqYxiG18gd3vPr6x/6hLWNVywADtHVqAT4a3F7thLMiDHpRtarU15wialGExttOu2le3/GGvGgfYAq2RoFCgCX2vmErdK0enb6Vo3HNVY989ksXHfXIhovhybdjS8m+9iilEhr7UM9oxNQQsqGEhV5IggYURFupkYg/rFSFFXnXLggLCfslTaL4TFH5WMdI4wUmCYgJSksE4wXdgfPbJGINpWBxtNCgAXuoRknTTl7WDpZFuUDhf9sHWrS8bFO8YqoO2OmE95x84+6NYwotvMTloRSiEFshVmUfzQylHGDZFWyBRks7fZNmg66jSJZSKrsuPX7ejSevbD0u1EgSLQrrlDkJ2ASR4qZCiSNmv+OVh57biE5EyN+IBsEwTHfZGtZpQkB3oSVMBYRCIXUj6VZSreXDj5xz08tvX3yNVwJmSPjUVKo00tc9X3euRA27pijrbSPIoWjRFw+2q02z1Jx3nfGbueURmla7teEHqxKWYCus2qDskwYOdypjquGVL9x4zddveMHlD/6tHrAKFnujKCnTzyg65KR7Xj+RtmMmy+4DLkveb0NrmCgPqRADxeYFVUjbJ03phWp7pZTR1ppS0wpAWE18OCkTdGNaW1R0LDktx0DkRJbKyTw3Ae2jyQjCvhTyyfCM7QIp+rUsKIkDBZ2kmXaP955y63Ez3oMLE1xMaM7FAM66DRUkTaRhtu5QV1BrBjY4uUJKo6B6TeWiM1YM1fHcG05dtPEJGsITJNYSXp0glOoT2pmoj9v5dX9w1L/2FZTMVfU+gyrDTDZ22A2rosj764Ak4DEn3Vw+fNuPr3/5cr3CwnOq0AuWSkUfXR4Mb9KWUL0E1dyZlfCigmJAqbQ3U8pd33zM93ceOKaUMG8UkkjzEibPE3TG2HsG+aNwHyWlbdoUVt30+GevfeizbUU5/CkCxDcbjXaIqaqEKeHQUz7AnoLvzG6qpO0YUBOOwjqaTUkprWlOSTTVtJkDe+405YApzXmlgiCwgwMzB/p2StEOj2waHl1Z+3VRjKwYvWvX6afvOvW4Gc39pzbm0SQEbZiQaFwip6AYA0enVIzQltuHXUFZNcV+1gLSQVFdoWpUKi9f8pmrF/xzbKxv+WQbyjsdvGsUMPPdGURBW4Q+kFL5qENwqDeKD4k53EQ18S3T1Mz3nv7AND2FEo1Yp3vcbp+JFOuoCo1mjfM24roVn73k3g8HqMS8gSfTXXjDqsnMDrzLJToPnJyJctSL/juX/vCSe95SSTJ/cKwLq6AbpJTWllXdpmivXleD7KPIRytbVTJ6UMbWdDv9VcddsN/AGUJVIRS00QPuvJgn9c2IEL2eHoZVUUHE+9aef9ldH14zuko3Sh8rKWmfT3QINAyhIRugK2A0aI547HO9wdMERS1F1DBL0cRKDZbTZ0+fu+9Or505Ze+dZxw2Ve+loRyyuU/CmUBLDAj6/ZTkSF+59dTl6xa41MLpNQszs+/AOVNOmDHloH1nvKy/OWPAzKRFCTTe08mRsN2MtXkxrOMALk1SQ0IOVk40LK3Y9EouWHLOr+/9u41ibdLK+Xa/HazrIWjBrpBoVQvtXZ7XcZD2pTkISF5N6chgnnHr7D5w3BuOu2KqxYUbmLD6JG1ZK0kZVkHQ8epFf/ube/4z2LGFM0wXYdEwmdlxRQNOK5+ZV+m6Bz915YN/X9lUK9FAn0LRcUIV/THWAeaHrFRfFL3tXOqkaK3EaOhrTqFZicYerznmnH2nnC6io92qKOhbxljZToCez51xL0lBtPUTl9//2Rse/pYzQ0qX8NUKRYMdIQptGnArY4yFhdHIyzF7bAzQAcHMyWCml3sdMPd5h8x5yZyBE/vl7JjyWsR8KWmZJf6hP2HHxqwiDeE82WPBpH7tlhc/uuoK0aChCikoKlLn5Zoh+QE7MLv/qD1nPm//2afuNuWIQkwV0W4voiHPt9HSRpyLop3DaKsIJ6vCh2Qaj7SuueD6d2+ID1utQys0i64tY/DQB0rrVDrS1klr7V00xtCmWdZ5yjBOAmL35nPedNxPpshdJmzCB3Ujpaf9VWnPNR3Ltmz9fOGf3b7sm2NvYLoHi4bJzHYvGtA5lnDDcBYU8Ua2h3otOSJcKazZlEYuve9vbl/6eTherqbZ7F6frVRNF1qw+TKpRDkM0IMZZSp0+nDeAwpQiZ3Uzm96zs/n9Z1A/rHujtWKYoSSTMOW4AzhkArYzBwZqPJ4MfxujffgRcrvJ526o/rJlbf98+rWLbIQzknakYNe61p7cPBN6XqU+G6jfYpwWI0upQyUsMLRCEaeLqD1j8KUsb+edvDuf3DMHu+ZO3CswTsgajpLSDazer5y65mL1l6BsyYRQlGuuAoUXypDpFg92lUjJScG7S77zjl7vznPP2b6a6FFOrokxSgpjoL2+KAVGQqqKae97AxLdCpmG+wd8yDL4tGrfnjr+1aMPmqbsm552HXvq8Iq73EO9BYfhS2hl/O7nzWoBlxBHEumphQttLh5U059xXPOnxt2Q8Xj6knd8sIF0YdabdAW7xOjzn5y9zsXLPlBy4ygCUgoHErW3qgjXIU8IsFsESwaJjM7wEhDTNGjR8A/MRlNG/vAW4YfZjeGlT++5dUPrL5BFlPacdNgs6hHJdnvXgLPDNIEliZ6hbpVlDUKRinAOfQwYCn2a/WGEy7df+pp0tu8OXK3OlMaLIZKoCUCOS9FPjJ+oscXE5WIJcriTLxq0R/fsPCH7bBBFyIEC+WiTQ2v0UpNo7xdQcEZTZQxSEnvkrY0NT46TCGIsB9kxWkgwBkv9px26pG7v//w3c9WopkHG1DaOuuekqz1ZvZGzyAa6HtdreCVa+O1QmOhlBk69U3pm3Xg3Bcfv8eHZpX7Us5NMioC5da5PvEnDf2IClcvQfyorbA4d/MIuNBeoSHhwm0Sa7593VmLN95nGnmSS/SLBGMpXKXKUtfJ4UaxNO3fBSipVE69JSn/NTV37cq9d37hm477XgnFTHtq0JAZioGXExTbBImGIbH2Rze/4ZF1l7eD0gUuf6ooywWKxmw5LBomM9u/aAhkWOo8yUrdEgkIl0Lz0er2i29797Kh21Ufdflw89FzGQ2PusceRjLKeBrRj/Rl2X6Tj0rWuNaDDf38g7569Jy3U9B7amuFf7vUmebJZvKYyTOGdogwfSlpmsDP89u+DsbqtfWi8+efvaJ6iL4dT0eIBZhz9OmxrqgnpSN0hWzvfRDWwqykqk2OKUkXKhUITSP22+mlJ+z913tNPVmmIZWmjukDVBYe0PbldRCVEVPzs+PlmURDJ6EWpCSJFRrfIN2AGoNykz70C3XYnNcdNvt9+85+LtoR1Z9yud7QWvA6jcqTEIvWTozte0aofILUAOWDtGJTWvf9W1/y8Nr5+AvK1beNtt5aUbeN0T5vrTL2wWcJzG6kNJQ1Liu6kLKjD4Q4atc/eckh/9qXoFdoUa+mMQbhde/n256BWoiWWHvhDS9YtGFBKGPttUi+r5Dd3Otr8sGiYTKzjXWBWwDFwJNioI4ebiJlEW4+Ud1y/nUvXjF8n1OiXZFigHNL3hiMWI+RSUWvoBhgfWGuYGpifgZ/WhXOOvgzx859u6UYeEcbFnbvXhtzyqkHJ2AyJZw7/En+oIAikIW+c/WFX7z2qBXtR5xo4/l2bds+UaK/GF0tCi1NNzt2Q72yFlVIlYO/jsI0pLBRedTD8bu95f3PffBNR/5yn75TKOOS7M+KAXaZduKmfwPK3tCd9S9bBKrgtwg0dyOT8772HmqmCKmIdE1QT+WwjvNXXvDdBad9+4YXrQv3CL0pBUvlwTlEbXSQlPzKGtXbYaotAGIUtUobSNkRVN4UMeMNx/5qj4GT8xKYRtmHl1WrJWyRoi+6pRgydCvhGtH8DS4bvk7TiP/tS7/6m3v/3lNm6xGdk2d0r41vCRDPU8TM153w050HZknfHyQqZdC1WDEwzBay3YuGpGxQG2AYaaWe8i5U96754XnzX9NWq4LyphBGSbLOcCwq2+t1gyDJmmy2xFfCFkNDaKMsjQlX9oQ9/+yYOX9uaLehTh6cJvr1sY89e/KoBjx4/CgaUleRkmjT00K5WKhfLvzjH97+5hHRaqfRAvWlIyQCSkYzOihnHJBqgNL1d4mQg+uLog9yKZDhsKgPGN19p7zgjSde8vLDvr1zuZ+EmNDQOpRrCb04pSSSBT1FIx4U9ijIcncHqauERkAZqSExJSWl1nUyjrb5qCtIigB9qcSjI1d+9ucn/uL+j1VmtfO4O3KO5NjZuwvia+xo2xAO/h60cKiiFkWFcg5I/Y6TL9tj4IXGt6GSg4/NvrJqJxpPGvtMF0BNJkiFVMtkDK4SVEKw3jeTCjcu+s+blv6X1H0i0VxIUi09YeGRlCtMivY0vfOrj/pNmdKA6XdhiNQ0wzBbxHYvGuDc+DAAw0jzFMrcvfpbP7nz9WvqJyjsDp0YpYJMJcWbl8bCpW6MfaxnKPj3ysB+UzS30BYPPGxSOm7e28886N9yTKIWycZQppAHAboGDkXGn8Y0UC2w2DLS6noh1sUVX77p2BsXf5W2lQjtBuXZJd1C2SfhdtMu10KrtvcVLEHXMDh902qPeh/7zIAJ7bn9+7zq6O+884SLD5hyJq4WWTALoRBicIXWTg4FipvLvj1ehdesnKRwxC2EZMjToNRZqqNRUDsxBNhZmm73uB5alFLrSkJ3VlH6wXDt8i99/YqT71v7M1oDKoN3Wd1FyM9t734xKXqDM9CqEUQpVEsl1R+arz3xa/OmHllGmo9xvoJwDqQnu6eaURlQdzJ6KM1AcaJa16aknbTQtC+99y/uX/1LGmPTkFrl/7oWWxMS56IQsZgzePDrjv9p4UY1WlYxcQVimO2c7V40qCRKcqy9t/KGZV/477v/ZBS2EtYYro/PE+rR1t4nVQVpgm6PfaxnQKxQ5GPuVK2hvTO1V3tMO/2lh36mj5ZUkDVLcKPhwaIDxz9dQtLhcFxcUBpjwGkrnLLY+ER1yzeuPn7p0F3QKvD9ySSjL0eN0dpKbbUsrDBwpCWMe226N2OPaodc6rdT+mCtq+FT9v3r95224KgZb8Y1oJmiBFsGWzOC2qC0fUkUaZCepLUN+TSyqhk7VjdIsaCQT69h+7WCjkR9qVAriAFj+pIctTbFSljjYmqHqljmH/rBHa++/KG/HBXDKGC0NDERXdeuV7dIirJ65i28fPRQqk0p+oUZnqXmvfW5P53dONqEUsWmbaLVSQV10SVo39EcSKRxpfAo5FxhFPZYxgCZrH6y4O2L3c1JeIgYmiSYIKBsEkW2eNTPATPOeunhXylVUW1715Fhthe2f9EgWzA5+O/iBX9y8d1/2dIpwr1JFL8Q807KPu+2JHXhhdsK+xNJjQ4zwDZTwGWkDS3nzTz17BPPtXEqTVlQXkLpRMuLmrZI6N5IA4QCKiNvyETOtCLlMPrQI3d++frj146M4Cu1h5IIipZLCBtRipJWoKG3h2voYHlKo5WHh98tvOorRLu1ad9ZL3738+993r7/XCarg6K9wWG0k5fR6dSPkgaIGx1FqukzeQupRHtKoVvv5pg2LX+FfFNwzCkWNi/5pCkt+Mh1HHWxrKNVhUq1LiKsbt1WhS/EtQ/95wXXv3pV+/YkSy+CotzE2xaU5Vu0pBwWHpJP1QFSDBdxQNKmn3uc/ZyvNMxOQrSil9CFIW9o3hU0jVdBJZQ0gkMDfVKGBpRq0lVyNNa2zq/7yc1vaqfFJE8nrp9Ba0fTx72WgtFBHD7nLUfv/X5yNRiG2SK2e9GQhGmr+P273jN/1dcdOgY42VUBywR7oGhRRVDUn5H9pp0GyLL2GDh05FoVcGtDSgNi2iuP+MyuaRbVtDQ0xUqjpc2S9j7A2zbbLtLEfEdsUL9HNh4dIlQI1AJOjuZqaVpEeDF68cP/9M2Hnw8LIoshWGGKbcBHoB407W0hRQUNQZF+OWAzxIriQraoL/Wx4XG++N6cYxK2HscStirCnJcc9Pm3HH3xPHuwhReP4uKMsxSAzytUJ6UjXMGSFr5AzqA2KKwhX68xutU+IRZoiIf2ItEhKyuqEJrNgX5Cw5CVgbCKtBAzSEoyMeBr2RZBFwuHrvjmDS9bVF1DYxOhovmMJGrh25QipKKkXPTfhNEUIxQvIgdo+EqmQgVUJgRj1KNaiF3jse854yfNNJ1krNI0i9AlEiUxxYmjPmnri1yJbTSkGEvR13Tt2GfEitbDP7jlg65wE7YjBUVniujzXUaNql2k5ov2/+whAy+kZxiG2Xy2e9GAPuGuRd+695EfhRg7GzhYW0o4iRMEZd2lRRN1kUQjDr70qHNmNY8WonuxFHCPcdFg62CiI62OgEaxlGCnE3VG4QDDatWFt7/xxoc+S+ak91jTLqBCJIUtplK54Ua/Enva49/4nB+dvM+fQZ1AqkhZpvyeCWKzR1ACzdgboWtr+4fqFd+74tX3rf2e1/2oYxrIEbIU1tWFsAEaLqSeT3s9E5TRS5g8IYaCUQQuaTOahUgpDyxNt0e89thvTQ8D0gWfeh7T42NlqpG+kkbSUigfWffTXz/4ARKxE0SQXplNeYcRj6tJQ1xCnnHsv469zDDMZrLdiwbYrNkz9m0MtOAz0vpGeKt6SNLKvYkhBquVMfCcnThtn48cOvtVsD/wwMZeftZks4ujwb2DpYCFyFAmH9gt6ppbZuU3rz3rrvUXxaKkcMIeQ6GBTiSXl4xYMdqK/YU+ce5H3nfaVfsMHA/lpANFBOCdKcUQJ9Dn3DxoBMEEtCifRqJMVWPt+de/+6YV5zjjk2ibqMkY0cgVXVwDuTpRJMroRcNpCjWcUGqAlqFSv5QtIUMh4v4zX3bgLq+heBXTc3FjrLA0bZETcJahVuLGR7+0YdNjYy9vfSStwUaF0BBXmIICbvJP/OqWd469yjDMZrL9iwavdh08bebAoR17FJOpQseyThAKvp43SR0+9zWn7fchAz+UxEz3oHOLERZa5iEHyk3h6Cc1fZIr6ru/fs3RK+u7nSt9qMxW8Cw
pZ2I/LROxKbTFzs2dX3Hkl8868G9F3SQ1AR0jBeVzgnQSpcku8Nbhf+dp2Exo7oa2JRENWN1Q1F6m/tGL737/rUu/SVqN1IKTyoWg6CpQ/OnEgJql8RtUcuZ/8nNAMbgBQTN0jUvuee+di38cIODqno880fJa0+/RJGlbc4rMnDf9+MHGwNjLW50UKOkVreGAntKiUun6R/7xsU3zx15mGGYz2f5FA3WY8ZC5by6VUrKhqYcQeuI68TrVMOZTxIFnH3GOpmA7pWl3n+6VR0KFaPiXnb9ihIMJS2Dh/y539375yhOXjC4TsgHfmFaobwXPUjfaacRpFyuxa3OfNx9z8eEz39IQ/ZQzQJQxKS/bkZQN7bY0gcZ1c0E1a5maMDPDorB1pFkIUYv2b+7+yCPrbo/ao85TzFECpIkmLkDymfJzxCaaRksMf3v+mfMXf9cPbqJtojc/hmZzgTRpa0oabXPO8ml25gsO+LemnTP28lbHkKSCeKX1zW3hL1n47mvu/5oup4+9zDDMZrL9iwbllKiOnPeePmP8SB0iJRtwnTneiaCwQtXl6076YZEa6LiFpsUd9lnkG/h/UHAt4d5Cj5AdEyoH7qXHql9/97rn1w2vbaPValsFm2d7nwAThWgbSXto7DfztHefduceU46xsoLV8qKEUkiqohV5kfaJUsrHuPXm/mly/1mgKR7TV6PNsqDYzAIV6qVOzbYY+sH85y9v31/hFGWhZCvGIHtvjJ8ZNILfkZ8Dz20Qy75y7SvvG7nC29qNkJKoTc/FTWFgm1uQLsn5Qdl/xoGf3mvKKRMX0gBJJ2Ib/9tKhgUrv3fLkm/aKWLErR97lWGYzWQHEA2wSc1+MeWAXV7UV2p03vBoC9oWaWLwQe6604G79R1cSCu0cKkp1Aitp+gSeaFmB1p4jwO3xIoFK7/27WteuLHe1BqpU2g3mioEuHsOxm7svb0jDGofjpv93rcff0V/olHoZFSE3aLXIGzgq5dG0Qr+GKAunt2cwdZEixCMKb3zlIYgJUi0hpStgAq3rXOvP6ulay830FCLQgVMmEh9pvwcj1c3f/Wqkxe3bnAeL9imFQ1cF0pT1WOCpXtQCWv6jtnlLSfMfR/1MVsjHvd3k2SlGsYrccfi71604G0uNFI0Je5KhmG2iO1fNHgDF1ZLd/huHxDBRRosLqt6woyTko0VK++IDuZkhAa1pU+i2UVPy9NihDH3MiuIdP/Kn100/y9qcub91EYBpz/AhtHePKXUPQ+EjMXQ6Qf831cc/sUiKInSSFguS3s6wJyKSCIhlxOGVeqIYo19bJunckZY72WImtIi1UHootXJgQDDu0msOvfqU/KVhT10eoK2cASobjS6/zc/x5duOGFdeLxQqhGbMVJ+8FjFrVD70ukBUQYvpk3Z46WHfNGgIkULqmuiCLJ0or185JYr7/37nBa8nSgPXGvsZYZhNpPtXzTQTDMtEt9/6vPmDB6eojWUw6f34/LPgAx1VcoF6y+k8Q7KUIyiqC6mKbKi6dAF62ERaS+Bm1d/8Yd3vN8VMMpkmKtYw+dEdeiQjKy6t2iDUhcoJaFIcEyZaL6cwuOTeOeel5+593sMXHHoAxpRyPPqY7GoNLBPTYz+oMQZWy8M8n+z2e3cKq+i0AmaIUqqTBosQc1aT1uRjcq0JN7+k7vf2zLDeSqDIv5gGml2gLJ6Qdj5lPCoa2ox0M5fOaMnDdrg7/wtOb6FvgM1Totv6W0XLfzXbz5yFrUBPE/rKFoypyunMJh8VbqCjw1pKNEH6aVQGlmmUOL4lW4HVe0sd3n3c27SaCW0csZ0xp16Si1obxEaZsQp09mGJEZxCXBtHt34wHduf9Vy/bhUM0RblKYYnrDugWG2e7Z/0UA9k4L9EnL4hH3/UkbXroOmsPeJIaEjjemBJb+mXlxRal8qShetNw5GR7RkkWV1xU2fSTJ41XPPqZQi1BamIlkRi1Y9avuleMUhF+y3z5Fa9MVICyToItBOh508AdsUXat/WQbXFoXUsOD3LvrJg6t/7CHTKHMDQMPDO3TANYfMkDDWXbu/NGW+pvhGWlupvNA6idLRUtsgY1vlJB3DauMPb//jWxd/xuR5op6itYNCwo3nXSlMVblamDom1W+1rstXn/zzUgZqqDQRQNqh19hUSGEos1qieApaNhIbIslVrXsuuv2F64eXlmKgqteVDdF2dWPiVnMwzPbOdi8a0EcY0cpRb+Whc14/w+5tyrKmBHgTAxxufPnjay7f4B5H7VrVGbnunmuTApynCP9NRjhWA4N1acu696dL6zqVE1Y7nKATg4V66UHfPn6312kxNcYyRZWFQh6IgLtH3vaOSduLph2Aow+lEMqhi+/4xKJN19CyPulk0jG0aVBGUyhJEk520VyiXmnPT/jTaEzGC1cHQXk1odBkEQMUw/pv33jGgnXntVPDpeGxT/WMGILVtMN4MhXavDINykkOBT8sX3zE13brP9aKARoXwTspS0c3RfPvBBIFX+JQLp33nhFNaLl1bvF/3/JH691qkrN6uGFEopXAlHuj8ymGYTaX7V400DwlelF0Ssk2UvPwXd8aU4U+YuJQUYp22nTf8l94ql/0ZTWtEO8WsMroi8m7jSkWh+/5jtaQJge3x/gEwyBdGoGXW0bziqO/cfjcN6oUEm0brToFoJ26ckTettCuaLqkB0Ab1a7VwMHJn1XrxZLL7vnrSlYp7+KtVIMSMaJF5rGvjtXsDpQDFFqlmfcvGVWJ9nlPaR2N7QS1tHXrl36z75KhO6ugom4VvW8QtEqiHcsmyXPvjdDtWE3BjXjSvn959Ny3WlHTNlE00oA6CV0MBH5GUA7afawlodXyzMymtOxHd7zp8eH5QfRDXSVIbN/IkzW0RLXzIYZhNpeJ79yfJTSRWQ/k/pnCAo/b523oOqyesPFxKazMwex3PH5+S7TIfHRsfJfAwdAVw5Wivb+V3mf660uVtsKccSjgZMeGKAZj81VHfvXInd9sKVIjUvBdHmOI0UtJmYUS3OseWextANS/LUI1WiglI0V9imXDd1/+wF9RbAFpJlwduLqjOayhm5Y70cYeFD2hhTOiD38JP2LCDC/F7SvP+/YtZ6yN63CBmqpZitJTbEVvwbk2y4F2OxijtfYyJCs2HTbnjWce/PdGjGhR5rgih+qgrR963xxodxUaiukXjsI9R/zw9244+6GN16aiaMcRmtXxzeQDyQlctyfTnDAMs7ls96IBBoo6AgodTzGFmcVux8x9g68nbHg8wdOEiY3FspE7VozeSomc5ZbtA/W7ybsTkUkIFGDp5k45cM70XXo/+guLKKxVyfmT9//4kbu8VVOoo0yyyAGAcDeDzOBCwIvLURcTTJ6x6gEQBvCeSalZtDstTBWr+Y9+/sH1F9FyEfrSmoI86K0jqI1uQRF+OBo50yXKIDV++oN0Nyz591/e+0cb/BCEY1+zIeJI8tXW0MxQ695b3QwxRC9MFHvPOOrFh37OUkKsomqjiDJElTcXRWvIS356SaCbooQHgXN3UvzgtrMfW3+nbIgq1mVBeVGlbumSZEN+N4sGhtlCdoCRhhyElk1E0kEnc+p+H2+qKZ1Xtz46UdR9Uh790l2Pfx3+N/7oYkJInGekyPlgaJPIaKLaa/rL896ZvcXGZkwRTuXsaQdTjWfhAtNIux6QWKBfFNcf88BDfnWHhGI2lK5EO0E2tI3F39r7UvxqwSc2isdx7olSbeEa0VLMLoqGTi1Hjy9QUW3yyo/I6pcL33XJwg+N1MJARHgVYttLkdOo99woJlF42fapJUOzT+N+m/PKo34wU+5ECziSLSCqhEKhoi8E7ZTV8waakkEfIE0LNfOju9/44MZrdVOGEUFbZ9VttFQlLc3soP6oFU+YU8Ew2zvbvWhA70gGikRDBccXf8xuHDpn5mGdV7c+EpKB9iOIUuk7Hv4e9a5kObpmRMnN1TTYEGWL8igJe9x+H9gK+0AZ0Spi4aN7cPkvyB7Q6suNaD1P5gmQec0laQic7ATu+thrClHWIeiGqL3rb6ZQRaNLH8Wq9p033/9dF2qZ+lPCk5CNU8kB7xrWuQCvPcSRlKZs9Gu/e8MLb1783UoLXUbtbJGniuooi+aA771mS6Km9cQaDb7V0Dv/wSk/3Kmxr4RekbSOA7KFUqZA4BjIZqtzZGhPoYgSnHXSF9/9zjuWX9iyofZp0OqqRcnFVBpEOVCk6Apad7L9bJzGMNsa271ooMBtWCvaA6CpYVGtD3Holbt/q9aiCNNpG0Ij2mND6/1bYe0XvlDRXtXoNIMbDNct+lYyLs+3Zv2A39mOJDFKj8jibh4yL09AJ6ljE25vUGJqMWv/5nFKFuSL0pwBrX6MqSk0/dktZJRtU7cb4sHFP1e53D4PwueABjIV9OWoXvpGo+W2tqStaxfeqwr2ydSi1PDpA0REiBV82LoQ1zz+yUc2XivUCK1oIG3nAtXIZkKWD/a2pqucpwDoKZqLdwVaFS6D7lsycsOPb3v1I0NXjxpdULJuF02b2nYQ8PCTH6asHV2CpkVoYKkfl5yGOuoC3xkSHpqAa62hoWa8cK+/26dxMhSD0yQWqRFCXSmau8HtSYk7utcOR2j9CqrI0wautKwZoKIoN0PbDv3wnvdev+K7sYyqViVlzwhW5fhcPSQVJdswusbfXbwvGGay0Xsr2mNoaz9i7E+ckVHFrFm77Dt4ZpTrK0qPSPtBjI5GjT73f97WKyi+QgfncyRYJe5ZdAENUsMLJ4PqJHpzdFjoiKOK6Pi2pPrxwaf5rzQ9Ux467/VVVVPuJZygQqeIp9vBJ5rH6BJJajJdOK5oP7jySnxrQUmhe1+h3eFpNdYbYOWtmHXpne+BnKDsWsLLLVsyQ5M7MSYD1eFiWxsITiPQbJzFA7SYx4auv+DGNzy85gat+mjfkR6jVD/UYB1HDNpqKpX1Q61al3TdSRi1xZmH/82Re/9RSiMhtVXvd1UtRcNAOUSD6s7xv1keRdXWQ79e8Nf3Lf5xdFLUBrp1bCkPwzBdZbu/q8jBleT4dP5CTwEv3KjmWft/XKJTa5gY0O8Ka4UPo9SZ9xgarjcaJhbemUl26dDNj6y7gmyAdNlt84EMu9CqgXKjvJ1PbRY4rSetoFQKxsQcsuubmnZGiC7kwQscGK6ukTZv29wlVKIQdPhzsrp9yTfI/6SAs655tNs7TdVXizWr3KNXPPTpoNAc4dZuSShLkLGORqrgfTQ622Bq2zTUgHZz+9JzvnHVmev1YgnTqUYtxUX2loA7SgYdcT4mikqY1GgUbVrUbEshjp79R8ft9iElbJBK60baCtNkkNqh34madLgaTjELNO1+cfef37H0vEoNSSia6A2Jd8jnsU8xDNMttnvRMDbQkIca0LtKST1FSnr/ac+b2TjSU69KwYjWNPFoKwxLUh8Gp1ylRIPTAdrghof+FR6PzBtYS5ozGMs8RWvz0ANuPnmDYxwRZ0ZL8KCNBs0uh8x7CepAK/IBKbqA9kemaYqxzzxrgggFqi8JJ/RD638+FNbhC/JJbaPkEIutiK+gDEMhrnnoU8tbC7OlL7ZgICYmZZVLwdK+TxCYNFbkYixH1egvF779ZwvepZqpavcpJXy9Ve5e0/ZeNBvKt5WI1ns0qtDQAyG0Dp31lj84+jMNNLEUtG4K6c1WaA4OagmyvJBoiWEAsrgSrV/e82e3rvj2sBj2siF1G16C9wG+hFK937CNYSYZ271oyCMN1EOTbKAgfvgfip4J4rh9/0R6URSU7LaqKhro3fxOfHORyoZY0TQqiiRikPbhVVeuiffimynXsrAUKkijDkCpzTe6nVOgqENaoQArPnYFj9rjTRbfKWOIOP3O22CAOi92ARoKTg0cL+m0KbQWrvhvIXo+Fr0dAVOqpB5tk1G76r5P0IQ7Lv7Yi5uBocySVkEspAgFrGhSSI6qNRfc89r5i35MYzvBlbodKl9Qg94KW1BlCepwMrXQHk3Lpv7YHt572vNeeMR/KDdNqhG0RmgbGgAba9i9RNN4nRTDlJTBoXDx4nvff/0T34BcS1YH0aZOwEM1CGMTSj32KYZhusR2LxryKWSVAEOZTeWYMtCtY3Z/y66NI1JNnW9+amsQ80w2TU4oDaPhA7pacc3Cz8OcoxQ0CkKmPoaQ1+NRsTePvM1GFg25l6ahBBmFau/ed8ou/YeJAE9Q5q9CAZ6atekGOdoMhzXCKWluefxreSfRro1kdJ28CHcrYgsfQ2mEUf13LfvJHcu/mbYwGhEioRI6itrA5OEQq/1D51390ntWXdwyw7qwRhmlIhpYDD48PbqlN3RCgkKtlRXSUp2GetMBM5/7+uecOyCmkwL2/ZRiEQWh6YCeiwbcXlL5GPvQFlMj/uiWty5Y+Z1QhtiGr5CKQlNMZPRKGZQ8hx8zDNNNtp417RHw6UOO95NkJdB1Ue+VX7E2NU7Y470qGDj+xlDIP+1512O8qkyi7XPIcGsoB6Ft/x2Pn7fJPRhFBZOfKBudAmMf2FwSdEk+DgWi+SfXg5j+1H/s3u8rlNaUJDfXRVBd3IJDw6dTLfTIJiZotCVDtz609lLSL0ymCh7Xo6FlcCNobVc88IlhsWSLYlYCLYlJVpTD0YpFwzedc/WZj7dvFhVcbOGCS9K7mqw3rPhW8Oy1MFDhlBYJxtj34ZmZ5YzXnPD96Wk3GdvoPyj/p8ghBDQdQG/oMVFCOSvRliP/fe877xk6f6ii261AVfsQ2kkGaQvUjPdOlNvu7BnDbK9s96JhbDLityDpEODyRXH8vLfOmDIXPaynLZVgbrtnRZ8BdK+0x1406MEoriCIqh4JzdGFD18RxHpY2axwtiiuvgPOIKdOCjT4TRsJwoiTEPHi4N1ea5Qm8ZQMelVaBtm9yytFnzJCBrhy+F6XrLp36YUcnv4UyUYljRtJ1grV9OtG1t30wOc6O6NsFlH0S22zlzywYNkXzr/2tHV+eV2IRrJ9MM2JVhzKJsXCjCU37DUpyKhrF40eqOXolHL3V55w1RS1mxBtJRtCVjS+kKCQcaqSood6DMnhgDs7Xnrvh29cdN4QBLotVFZsqB4ag9G29tonUTaF6/1sCcNMNnaETv9Jrx3qAcZ47DecbAnTXfWfecA/w/VH1waDql3PXQ9ZCWFhLEatikXImwXkvM+XLPsbL0rZDta0AoVLbqluoO2W+2HDDeQBbVidJywkjJafEnc6eZ+/cLHUlCCQBIvJuyh1BRiO4OFNKnTPNO3h431LzluWHoQZwxcFmnahqL0UK5I12xw9b+elh4xLoSmqKKxval3f9NB3H0w3QMwlUbsgAs1NjeKd+Afm3kN40R+4Tvh/LHckfuk8UuZs9csH/89P7/lgq6BZIO1ENG0XgpGU/0DRDlF0Sv9bLT8LmqEBix8o2JFShsM247ZyoSyiDaIIhar98Fw5421HX7hf32Ey1EJBMaAIJWV4kmiDKBE+Qr+7Qk0NGPqABCpqiEQSPT3aWV35k7vffcOyr6T+gDtNxprmakg9k7aNqdaSKqqzczfDMN1lRxANvxOaiFCb0JUdtPMrdu47BMazXYUuJr3ZXHxq3/zwd6mPDVoLCiijDi4PO3SJgE72sF3f0ZTRR7JcUuHoXXS1HO1oIHN6KkgEeNXS3fXY9ygHhdRa+c6gMej9aM4WsAXTBJsHLJaShcprNmonjRWttOGym/7emzYuDWqOIhpjH9k+ReMzJlkYZhdH8+ATrYWJtLsT2qhY55ZdfPd7bn/iUx6it037nxnR84DHkdSOFC5ghC/JZZdw06Mtq6RD7Vql1LP6pr/6xIvnDh5L+qf3qxIsahRiAXVkUWNVcjm7puvjfAwMM7HssHdbSsNCTBMylKLvRYf8h0451w554BND21e3L/l6LeGIw66kEMnRVN1LM5w3shI7FQcePeeNAb5tzHEN3YOkAAkEWnKXHxmYtzsXnePEGge/E96vq2AupSph5CZh0HpntCuEpJQMCbVk4YovHfn1/Ce+5GJT6RFR08IZ2mUMKgt1CL9eeqP6qF4VNYakRkQsh8SyH9/y6tufOLftGy62i6ZTcWtUaCqEssbVKYaKEnII0Shlu4XChr5SyJZ7ycHn716eAK1DA3tbEquxeUBKoSGhKJ6GGEraHExBOAjOx8AwE8sOKxqMGCA3Hh6wSwfOfP6uU04srK56v2XwM2GtWFXfc9uy71AAW9BG0QLJzqB0V6ANqZXQPpy6zycsBdLRRs1dvLo4FE20K9oNieyiaKPs66rFtz7yPakLvGAUvGHys2EPO7mlJ5bs8289YNaTbFHl6KRtXQUa5E9GXPXAZ0fFRlobmeuENk7KolHo4eRpfQSso5GNGipPiyWjN37+0sMWrbtflgOdzNAp6CQiJRLtMSSnaQwswAxTWEBQI+3U1zfogzBJv/K4bxyy04sLSXMtOdFI7/uNWEentNQUd5s1AUTWTxa8k/MxMMzEssOKBrLHFDeWAwKDP+WAv1eJEtFPFDAVcCdveORfHNxK78h60PYUXZsDzsC06NmNffefdbrNQe9jRrwbKIpdoFlsSh8AjYD/cXAj5j/25SBaYWytHW3CAG97bAJ6MiGzKIDVhWuMilLaw9qFaDaEZTc88klKexxbeENugDB/UK/TovbawJG2ZIkLdfeqK8697jWjal3o2zhUDyehrSlgFLWWW2HkJlYoW2WlMNK64KKMZaPRqoaaYvAFh3zusFnvMmKYluxQCObW8ez7UZk6igJ6S3mv4o/uefNNq77L+RgYZmLZYUVDpLAoFyMN2sO4HTDt+ftMez7FnE0QdSW0smurR29b8i1RligVeZmma1Y9x8TR4DeOe+qen9K1p+WeqIOuQRsQkWqIlE8a1gVflWL/uvjAnSu+Q9GeQEYpCq3bIk78UEN3Z2d+L8pY72FOoRoKESlngDH4J8IHvn7hfy4evSOaZiIt5XMjpPuO9gqB2VPJy/YtT3z+Rze/ekgvg9RwQRQNVDPEVzDGVu1El7LHULJS6BRJQZsopbQiunZTli8+4h+Onft+yurlBqjUCupHaSp+jyGFUqNVhwiB0Drn+pMWLL+wLjznY2CYiWUr3P0TgzIypiEKn8aP8iamU/f9p1L1j7281SkouZ9HB3fNQ//WFiMwHjDp3e7qVBCjKcr9ppyy906nU4apvKVPV4gpadjACB+avkZ3dgpMflSL6x/491pszL08zYkQW3luYBvAJ1IDsF7WBNqmweUhhxCDl3CVf3P/x2pZQSXqnBpLkKKArHHJ+hG14Rf3/vnF9/yFaHqKJqXEBzicUskEWrbrTGkTXOsek4yss4rFaRS2obwo6p1ffvS/HDvnzwtRhZqW++Dq0jpf/OT9U3qLdIk20nTDZsk3rz/9wfXz8dUapeJ8DAwzoeywogEGzMoZ6OCcqmkBV5B7TjvmgHlnj7289UFnFyyM+Dr30D1LLqLxaj3aRVMAc4VONao+SdsRVift/7EkXY646xIyweF1PtIaCpxMTVM9UlfQPutaD93/xKV4NsdVDEdPK0InHdKXfQbVXddB0ZK/Mm8XpnDRkxYPrvrNgqX/nSfMDHx2ej/UVbAb/KLzr3/VjYu+7nRRQzJAdkToy5Img4Q3WiqIB+G2QkoGVxe6FEOt1GgOtuu2FuVLT/ybo2f9BW3H7UtjIGcqCEYUJOTlkGMf6xkxainVJr/4eze85vHhBbK/jF715X1WOR8Dw0wgO6xoyL0zGS+TrJANAXsdq1fO+0ppZ2jVRC+c4nQYbh8FdU69n7aA36StgKfmtLjykY/XML1xqqVNfgW8SfLRBcUCgET7FuRHmwMUQxAOXSqdsy8PmnrigQMvpMFyij4wRtECP4BOVpnCbcHxJU3EN2D1vIg6hRJ+KQU6NGrRLsTPHnr7iNqkgtZpgCzjNtesel4gVEWkkYIc1iBClBUEQJKoKh+lGin8rx983ya/lnQDLBzeYcSi6pof3PSHjw9drR
uwhrVt0Cg7hEaIFVQZzQUlVCRtWNLFyBd8iYIXHw1FPeI7KDPYQAXTKytZm6a1rhqaouxLD/vHY2f9RYH7gm6hTv1Rjmz49loWY2tFukIYFp7ae0DbTKhEEiQx1UmpJ0Zu/P4Nb3pi03xtlW9XRTOinBOVj4HCheRACo0UJboWukeVcKGJCqQYWHgDqMkoM3mpEcPsoOywoiGPno/R2ZNCK91oNE7c+09dq1Wa/qjXw9XD+dOLva8Ga/ToaF02YHrFcHvVzY9/IYcVFmTtoSYSej/tKVbOS3TVektcJyVK2lUI0GBA8/Qj/kpVJS24j97lJAA400Ir5wItYOsSytDQQ2vUz3/ksziJJEZQl7QD4bZF71XhM2ALUbUl7G3b1Tfc/w+0jtDYaIYXrv/1BTe8cXnrlpgGR0ZHbSmqEU2buPeYiuyfltYn2DpYuxRjGm4UBWU9oCkn16fFCw/7z2PnfkgLitzsNUEPJE3bdGhIeBmcpKytKhYPD93wg/mvX17dJMS0dts1+0XdEpQMfoKwkm5c9BZepugFOg7pRaNoKUgvA7cj4QcqD7VJ5d9hu1WG2XFFw1M8Lcm00sqesNt7Z/fv48IIhXpF0hYxdC9bwjOTPPx9g25aRdGOm657/N83xnXCWdo+IDmKboBDSXkbUFp6y9jHNgfqrYShqAIFnWB3bZ5x3B5vSSEZ3YSMoD6ZXDItAiWf7ha1S6kSjYa96dHPr5NPSAnfC0/33vXbTggulgW8eVG59h1Lvrhk9JZRtemOFedfcNsfrK6Xklkuh5olZTWkZFyu50sHq6gjTHSOecRvK3WzFK2ROtmGtk5H8cKDvn7snD9BOXy7OfaZXkIrd9Ec0eSll9GgFrwaXd664cLbX7PGLWkltNsNpdWhzmMwva+fZwJy2DsRTNUopkJu0fAPKrBGHwJIKOD/jlbAY27/zA7MDisaOrdx57GUGo87f86Qc0/Z7+/oIW1+6dB1ov+kYeUeE0Msmso7ST2L1auqx2954r9y9WvqLvOODjQCKnSgtftbErCZB2k7OQklbbPpW6cf8IlS9EtPS/1DFEFG7yONa0BBdAl09gX69DS63m+47N6/80IFV3fmhiaWbSQWEwZRK0p/ZRu21u5Xd/3tz+76yM9u+9hoHDZNEhO0U4kfEEHZQmhKC95blKUpAJqXoB1SmlGKVls0+wZi1W7ExiuO+t7xu/1RkQLcaluS+hz7WM9oUCCHyPk/4KlTLpA7ll38jRtfvK61HLcJqgO3iE6NWMHVF0lviZjuChD9jbKhldw0stHYBu4mpaa7fLmoYNTb0OOObuAVoMwOzA4rGjrO9NN1A042wZJEcfjub95/5+dQADbOXiltcrx6j1FGOF+rPJqfYN+tuOWxr7TkI3hOwGmRNbqd4GnII/c7m18i+ihNDtM+xThNKQoTZ+g9jp33btqNUNIehKgT6pnRNeO/LmFRfeROo9+3dy0974mhm3VRxEmXpuEZwQWPURilnKtcEo+uv/Teld+pivUN0R/qaJIoxTStg7a0sqairJq9RYuoIfQCHjSjankVlJpW1cO72N1eedT3D9v5DZKuJVx/j181TeX3Fp1lE9pRoIAfcc+q7/5swWvX602DdlB4lA66pRlDWxlHrXdrrPX83ShhfWx7n/qbzejaKMxwtZ7SaBKSbmqIMQpjofvraaObDLOjMWE34dbhqQEGQCFKuJkVuml18p7/ZyAZdEm1j1HVauwtPQZ2XdYx2BSdSnK4Xn75g5+XhQjRhqSlDLl8eE9MWxATQKFhUdN+RxAlnsZHU39K8ZT9Pzqjby6+WqYBnTTlbsBbKGCyS6RQe5Je1JZ0uOLuT9bS5W2XJphO4OeE065D8pQFOUc4WtMoW6nyNNY9MlD06dhwYUMQozS8RNEtvb8faU4e11/Rhg5QELhQccOsYp/XH3/h4Tu/tIS4JhGIYhiXoGB6P0MhvYaVjRAoxUULP3rBHW9tS1Vo0R4dahpUG1pqS5mcgESI4LsXjLOZJO1IiUcpnZuuZx8w84zBBoWr0pwFKasx3dDpbJ7qcxhmx2NHFg1ZJJAV/q1bmKzp0P4zX3jkvLfr1E/B2MF00YY+EzV6ahoEED4qlEG6pG3j2sfOXeduRQeeKDWk03idhgDy/kWby9gncATaK5zW7sEO6WqanH3MvPcWqT/GTbAQiiTDFhz9GZGoPitcTIWmkZRHN15y2/Ivp62wHGU7oWjS6pyqikWesXE1LYPVQtnSDtejwbQpFxTag7LCw+70vt5Uk8YRiuhCVHG6TWpmOfO1x357j4GTaOunzs1iKzSeIpWm9wGtsLPQJyNy+DcP/sl1j/9LMg1rSzeMemsO187rkLM+AtrlzUCPThBRDtLObCLtVA6+5aSfvuWYy0/f41ONtrCmD24H3Wu4zLk3xQMWDcwOzA4rGjr3LamGpw0V4jl0QFI2TPIn7vuRwmj01TEMboUlWxQESZvyoferjBKFFC74VrHhmtu+6MQm6o3y8AAKIhPKtNkxAVFCLKTgcnw57c0VpYEJasjgTtr3YzP6D9YlTXyEiK5Phi5mbKT4e6t1SjBCSqHsV9396dGq58Ps2wuUYFG2Skt2BX59Em1No9mxTpCNxkvlkwiJYm4UrmDv58K9HLWNcmhU2MaAF+tnNPd7zfE/32fKSUJt1LIkp1mpkGQnJFf53m8l7+0mseSHd7zuyge+UpRGx7ZwrbKUtWhJ00zKQmNTzaF157WfE4XTQy7F3Wac8I7n3b9780Qb0un7fvy9Z904ffrMwjZpQjBLcXQ2uL9wI3Q+xTA7Hjts4366VnjqYb6lRfQKVnmnYv+T9v6AbTeUXV9LSmOQHLxCQ3P/cPYT5TNAh94tKDzc1PDlaFQjoO9GaXx/EPNHv/34+mthw2Ua9MI6el+1BQ5nTvJcUjZnjXPU+BPfoIQMRjdq+/JD/la0RVI6wHmMptG9XJQKHXmgeNI8guGDU8Mi/XjJK+CjhlQ7aCHhE/5JwqWN9NfEMGHtHNVDuQQSrSTUJtBQPARCJ0kR7VgVbRKWxpYohqCLwTVo414p2jRL0by7D0VUEq2ujKVvVQN9OrSH951yytuf++u9+k7KC3WnwurpvMSGMjFQ2+mqlaaGgN+4pTZUORcJtYUUl5nHv3fDe+9feUnZlFXVSIYKHB3UA6qopfEoCFSRVk4o2vei1+AOxdmj9hyFfdA8WxSqUmLQiaOmvO2tR/98RtpZJNr5QgW1a+OoDx/78Av2+OCgKGl/0EJXUVKsMX0oax1cZFQ57n6aHxQyTtjqD4bpFpNOEeOEYVLRYSldnbTXR2Y192ho4b2DzZO2Rbc8zZtqCze9hk/Y8/qBQb3uns95GYR0En0MfePYjohdQScVTdxj+guOmvsGV9V04sm57h0fvSGlT87mDv6VsaJdbXzokTsf2niRlNZSVwlJRumsrZiaOmkkJoDeD/tvY+hES4bQjJMzKdrC+uisMaItK13o0Ap7DZ7whhMvmK5mUgRm720Z5W4y3oco47SSNumimY8lo7ece9kZi9ZdRpMPEXKdoh0B1FX+0ASAW74epvQpRYkSKtwpWlDarSNm/elrTviHQbtzSJWgjcQo5RbtACrUyfv//TvPuPnwGS9Uw6EJ1aX6IKLzChWaDbT5h4JVpA757Bhmu6bnRnFbI8aKZiz0iBZlEQdeefznqiFhLY3GwvCRcdOKdsCBZ0y2ted3uRbm0Y2X37HqOzFZrVqwsQ6WXXbPp/IJHid8yJcc/B8zGtPgRJIeGnutCyhIsE4UZILgElLGshldWP/z+z48EkZEqGVCxxoSXMxAjtfYx5geA/tLi4WC1WSqqxo2Wde+bWAPQ6VP2Ped7zrl8sEw1fh+tIet0A+Qt42rL2lLT2iGGMKD63/w7RvesDE8pkq0IhNpWy5oShk9TUaMfWyrE0Wc0hyg2SOIGm2qCqUrXn74f73sqP9bit00TkOivhyEF26iKFxKaP1xTnHom4751VuP/+ksc4CSo3VIkc6hhA6KwSmKgm2gVwmU0p5htm8mnWiAiUswpKIfnZf1Ys/+M4/c7Q24szvb5eFHWZckrf6CO6Fgw3uMFN4V6bL7PjqS1gpH/bfJUyWdV7uAhgBpwdObonc5Zc+Pm1hXrpCxMfbqs0fGvMNF1FrDTcy7AESl49Lq/svu+6tEPluKnibJpfGky7YWNMs8iaHU6LEIwqHKVaGKkubrlPL9Vd9J+773rAO+XogBTelAclbwnjdzYXFP1bXRMKMhGHHr0s/94ObXb0iPKz3gQ38VKLdVgrR0Uuvi6XOLWxkt7aZqWJqSCuTrWY1d/vD4Xx0z+91WDEZH05VoyjHfnjQuKNBF0PohJUdUrA+e9Yp3nX7DaXv/7S7lziWqPbkofbSiVqqKbR9iQfKaYbZvJp1oAIHGE/JNrwUcihcf/W99YS7snaH1iDqmvIUfvH0lfE6c0FPou0yxanT19Q/9g9C2rilJYDdFgxR9wtKpKnHK3h/aa8oZpgx6izJO/k4o4BT2INI+zhrKQEgILzwHW3XHyu/cteaHyZca3m6EdcrRIsxWgabbmjUNnoUpLpC9kw7KoXj1YZ9+2f6fbcLvRxOjESKDhiFl75MmRV9Q0vZYS/3j+974k3s/1MorTOs0LOyIKWBYKS5G66RN7eOErZIQyWhr26JCaXYrD3jXyb/ae/D4IhUhbaQs3xTp4SWlpBJKOpko/6lSjRD6IIvx2qCYfuY+n3j38bcfNO0Pi9iPSk5WtHBPWFHa/ljzSBuz3TPpREOM0kiNO18EFeMmo5sDYvbp+3+AJjBTgCtAq6eSiTSCSsav51BkXCiLvhsf/c8lrfm6bIZE45ljrz5raE/CgN6O0kvLlF56xDeLGKCXugWqCFqLkhCQo5iUMrQ4AP5aEiM+XHTvn6wOd6ZIwSEU8Ce3xnYGHXo/SLRNI41ojeLfAaFHrFY2iKlqxhue86Ojdv6giXD7PZz5IJxLPmvk3scQpAb+3+DWfOfG429ZeqHDX0Zo34dX0NaDE57ibfCYNPsErj7wsQW50DRi9/7j3nHKdbPtwSR10FnoqfXYnKGl3iNrYJJmqDrplUZzo/ye+KyNxUy762uO/fIbTvzxIbu8MLaF8VAZjTqMSMWripjtnkknGrJD4CgvgvbK9iUaXfTP3ec9++/8qpyZrlaplJTUNqKntbnD6CnoeUQVYuVCKX51z/9xYijPiXTRJc8KxOPEayHDrMaeJ+7+QYUv6xKBZqBpa0f08xANMUbvg/epocoQqg1hzYW3vMXplqbYNx+3QsQdk8F1aZYmhGEd+tymuPf0k9566i8OGDybRrFCnfcoaaPpQU/Q2HnckrTlm0Wl07Jq4bevP/bxDbdIGaWz0YWkWwY22Bsry9IUhqQnlVzbgbGPbXWMahYpHDXzbe85+fpBMZPidaSJQqNU1tJSikgbd6ClQ+znbUJl7T0NXdLaF3QsqUqxJawrRd/+05//h0f+6nWHnb9X/16qbttYCs3tn9numXSiAb4BTBo5vhH9gIFOsKoh3JTnHf3JPt2Pl1XKIQUSvpcKoefTEzGpQolG4UZr8fiGK25/7AKV0LN0zU3W0gRZS9peY8hRNv+RFxzw2XlzTx57+VlT2P4nk+JBl9CePehmoSHqqhooS3zrsuqhy+79OG0FTZkoeE53K4EbG/KtQK2nocP3eNXLj/3e3PJYuLzers0bXKNhdLZ9wI0AlZw/00vuW/3f37nm7BVucbBCOdsnXakFJYRQLqD1JFqGmQJlJRfKtKuhsY9tdYJqnb7/Z159xLcLB0Elo3Jo2hAFxrSkCFLWaNsy2rwUgrKlJ9E0qE/cr7TI1UrRFKbpksV7dExlcsfNfcM7TrrhjP3/b9NMd7SlNsNs30w60QCrRTc5/ARVGti87CMIK/YUB59y0N85CoCsjKcUSXjUxWH8Z0JleRJRHFlW1l32+Mc2yBXofbJq2JR7dedjld+zJaEOifYzxPmalGagJxOiKWP15gN+0mdL4Qe0VB49tqZukX42/3yjGDHoQvPICM1PUMdKX4p+tZ2qIvUFX81f9qVb1p4XpClohw1y1zqnghOj9A0iZ3PoLTtsO0f7odqG1s2BI9Sw0ci9rC2N/5tRfcaeH3nj0efPUnsk5ROeETPpYuX2TYt7aY1hfriZ0KRG5wdfHhMtu6WRejwT8gO87ulCR1GJ9Zc/8C8X3vEHG8UTeBO1Qe1w1WkaQkTIcugEylGBz+LvlG1v91K0KkGiFlUEaNmUoKhP/IMKgEaRWpPhj7TG04pC2f73HXT9aXu8EzcEJUjDRxKVxdDHm9RN0K2UK516EspRMlZ1+Ad/5L/xENqBqoY2y6ZTa6RdTt/7Yx8848qzBj+IFyx1LAZlqBXtVI7D6Kg6eTUolwb6Atyyee8uSReIYbYtJp1oeEZUOnGPD+497Xgtk5MUFB3TCO7vXuN9sIWkZd95dmRkdMMlt34k0QiId+1B6oFoKSZ1YLR/0OZDFuJJyKajs1O60WiceeC/CD9MayQtek+DbpG+gzJWdokkbBoMYtTTCn1/+e1/s2TkGupN0RdmQmgbA5uBmkZf3OvANzJJOySUIwMGDy2k1gUupaKE5aHoLyoxJe3yqud853kH/KshJTesKctU1+pZ4ZJldUghr7COtJiwrUUrQgMHoSs46QaF2aiWX3jzH1/z2EfHPrbVqR2JWugSkCJlykZ1URtES9TCxVCkUptUGdFf7PL+42/dfdcDjexPNGuYpQAJIcigzRYxOUekijRxEXBx8L19ev+zTvjoh0+/d+/+VzjncZmK1N8Q1jvvCsrxBeES27owKsmAEhaN0mVRwTDbFCwaxkDH24zm7CP+E/2qtY2QlNSUqK/XwBnx+DIl4NEkL0yhF64+7641P4rC2FImGgdA32VSaotURlo8uYU8bRmb0soeP+d9R817syerXQoK/BTJa/SqY2959oQypSF4b7agUMyqXHzxHR9aKx8X0jo/gteNhg2rZKd35mmLLcV5ml7zwUHl+lYBj9/asu2H5/Uf/Lpj//uwnd5UiEqlPuEGaJELFFyXSDC5ItLyQ7qASqa8jjc2ZR68o9g/KZa2r//W9S+6f+gHrYnrZmi6Azcy7DE8+Jzg2aDlGdpVtsBdV4taVi7Gfaac/P7T7pvbhGKYllKJasy3C/6hFcV5UfHmQbvq4kN5j3iZN+WiZd1p1gxz8FtP/tEfP/eqw2aepdOIF84WZawpVAJf1z+QvFOhtrpQVV1pOgrDbFuwaBiDfCYZd+078ayDP1qPtqXshwfV+52KKfck5UTCdaAwQpojcEZcft+nhsP6ICtJeX3hw8Efp0GPtPl7UuC8OgMMQFKSQAKPrS9eduR/7Wz31bFKqk0bZslAaYe7BCXqSXkPK5yB1utbYvHQbRdc+562WmuKPMZLbU9rWueOUna/HZKnNwmwRYh1Se3CJl3WOqLi5VG7vv6tJ1+z19SDC+lEpDmIgFYEaaq7lp8jD/Cjtbgwtv5ijATjDCOtzcIN53/76pct23Sfj+UEZkKE7adlULSYk2YnYkRp4cejwfU5F01Z4CSO2/Wt7zr+msHUTwtRcdsn0hk4wzg2XZe31N9MYqpQK5AlUlgcVMqcGZuWIkeZ6n2nnvb2Yy951SHfnmX3j77S2qI6pSxH24rmlgpHuahpjqRrIo9hugWLhjEsutekpKxO2ePvDpjx3CiGaif6ip7PTyhJOe6pX0uiNMq5OopyVXX/tQ9+0tMm3ngLDAJ6Moq/UrS3xObRGV94um4Y6wRNLP3U15/wFdWiuVld0jhsN5PPqBTQ+5WiwvFFo8CjYmDRyGWX3/eRUVHju1yNXrkhpCMfa3IY+F4QnZJFhcvb8h7C0ob4vL0//IeHfbNfz1RiikgWLSolr00Baxm7F6STZEVLZSJMMU3A0xVUbaGGlESDqn/+wPu/fdObK5uzr4Z6AtcM4PtxX2sFV1+HSLOAFMkocTO1cGOp6N5w2LmvO+Q7WngSrqlFL9FNR8uAqPA0Qwlhu9kNVJFAp+EWGimk0GZQKdXCzZxFcgVBcuwub/vL5933wgP+uU81KVOnrIJwuDWlbFBMUKBpH4bZ1mDR8CRJZneitKkJF9xU0pLS7/VcO0WC0UBmKmGvE7wLI6KslJXzF33+4fVX0pjlmBfufY0ubAunJ54aYADUFea9s41x8xpnvvSIT8YhUVc5rKt7c//OieaAd22aeAhhRIlmqx4yhZj/2Lcuu+fjFWRQTgSFdyrrnyxaN5kkeRqMof3A0EQa2hajs19/4i/OPODTRexPqFtc4yRsUUhlXGhLDQe7a9H7UkFhF0oYyh8OE5tg4xpeDG4Uyy689cXzl34pNMVw1ZLC4Y5S9YQtocTt0wkvoOEF1AapbkoAm3SaJgb+6IRrjt31LWTXKY91lKKfLDrFcgapOlthk6DfAlFLg4IS1UJ6jkRHsik2RWpShAPtB1b6ZAJlXKtP2uM9Hz1z+Qm7/0UzDuAWbBgUuE1SLE7FBxlmW4NFw5NISuhGXoD0s5pHvOiQT8NAk+zvMXAm0K1EVQf4bt4pCiiHd668EZfc8cejYmUQlKMHJt4WsPtb4rN1VAIePN020yAyvlaJE+b99bG7v60vULdedW9vZm31CHw5IwtDXV9MG4zSCc4UdMOiz9216ite1RQ+n9CLV71f2brjkmgDyLLqP2z6az74kocOmPEyEWmXVBoXp5kfyM6Af6wuYAALuLBdIibKfpZvGcomiZbVFiOPDf/mS1cee9/yK8jHrg38e9ssW5VOZrjzqa1PTCFSQSPstqEFqAo3l9XTd+s76H2n3bv3lOf6GJyk2BpYcP/k7U7ePt0gFAkRaXPNzXYeslagLJdZhdBvAkdDjwuNElNBaeSiC81GnF62+l6+73++//R7j539xjSCzkDSWopyY46jZJhtCxYNY3hymEbQW1Aufpmeu9eH95l57Nime71EJRhVKzTNDFt06UEUss/a4FKxvv3QlXd9VMHWQkF06KwD2xw6AwxP6YYOeA5/5Bi2YFPjpUf9884De6B/9N1bPYGeurAqQBhQyn2qX6NoitZpBR/sV7f82b1LvkWjOxBMsdRd+9pJRxRhsJx91mEff8OxXx9MgzrCXBe0wTTNtUGDQpZBLcBqwV51c6cy3C15Lgv3DUSJCtIvWPy18684a1VcrkqhvSgjWq0cbleyDHDbO5/a+lBUAf3QmVMLd6JRTt1vnyPff9wtA8UuNaSBSjaVIaKQsOV0X+ReMY9P5OAGWlm0+QuX8L2AduHCYSleoaVUS2paLJQgGRQFHhcpNmg9h0tNb7zYWe/66qPOf/Op1+wz50wpfQ2h0ln1wTDbEhN2M29z0KACTeybABvXTqJ80dFfnhtnBFo73jTK5kwuBn0P1L8PXZulpdXzsKSRViN29rZMchSdlxZ2yKQbV3773jWXCN0iNePgulTkNeE9KSdtRmlIEvgIufMMPF0rPPUQD5SrKU5CaBndgNvl1Yd8ayc9B1a9VrT3fyOVuqYZ1ViIkPCeze68KNEEHCV8XEE2ULonki/ooKEmYjFaxB8v/Ktr1/xXpeDkGekprN8JSIwIz69zUj60nnTQnj3bTTtPrkSbQBuDPQuaMgbBduABCUel8MB1hrvRVGITxnjf4uS3Pffc5877mAr9sDT4LF7sZMvARaATJwuI5/DxHLy4mdCCWXKQyQDSD01DeC8qLVqJwoBgUQc3yWU/vevNP7/7g6N90Ar0KbQXlBylLPGdAV+bn+0lOF20L5pXwB2c+vGbvPSkTGzg5gqesotVlImp8eL9P/L2vS/XRX8hCtzGUtAQowa4GajMnVsGkguPOsdGNW5+xkz6LPyBTswvaOYfugCokrzMmLKn4JoqjVs/l9ZEE1sHDpzyjqMve+Vh58xuHhiiq6H0DO051lnZhELRAlCoD9QwtRDtclNJqGJa6tG1folhnonN70V2UDTdk
tS9ZSiCelbjsFMP/rQNAu5BGx4Kug6LTpl8NlN0bW74mfBipA8dip/+yzv+eEhugmQxdiTm0Af0yU8tA0NPQX3T5ieBkbqIEQ5iRXGW1u0647gzD/1y04tCRa30sKtUX4yx9C2rTPA0QtsdUHwK+PdF7Tddfutf3bXyXIc610bHZCnJNOwgZa+MyRjVpD0JukPPjVa3kLYihzeJQhbSN4xvNFQTVymQkIippsTPLhWotH7lztzzA28+/aLZzRdQogRqGGSQ8mG6dl/jqLS/s2xBjSSVfNqgcWliKeAzJwtl8HDrJ5+7+KDbF1+o7UCauGUSNRqOVVqrGLySI1p6KCjpjRPtYEzQaF16JzPzdUf/9MQ9/zqkPOW3LSG1D95S0ANplZGj5rzjnaf++qUHfXpGnCaHo0q1LCjAKlB8JWo+qEprSAbK16ULSeNJECg8zcdsBfQnP/nJsYeTG8odLWu4FzSgCOUOH0WYnQcPXzt857rRe720UeHWJQsL0Df2OrA50ZAqlAHc7U3L19x95Lw304YYSmeVQBO0KG4ORsseBg2Adj43bmiKAieb4GVFj37WzBw4sLB9jy67XKqGaPjhtuhrogwquFA0DC2l6wZaNFxw2qL3o1GWR5+4fNpO06f0HVYEClFD3xclajeShkPR8KbNPK9bl527sfUYfZSUX/5X0j/bizoOikZlIF9ljJpW3OHSUKoxuJqU9lzLEAqh6l37jnj1kd8/Ybf3yNiQtPSGRohy7oTOqcL/zCLi2VPRIsBE+y9AKGsDq0YDD7gqph3d1Y/9n/++/U/TlMqnZrsapRyrEwT8dl9B1ajCoNHivilgRZN1AfVjai3MbHvw259z1V6DR0uXg3C7VT9dAh2OotBLuCUQPv8fe+8BIEdx5f9XdZrZoBxAAmWCEUKIZBMlRDAZieCATRQ++3xO4LN9d06A0+/vOxOMswEhBNjYRIloDBJCIpikAJIA5ZxW2qANMx3/31dv1B4rsTvbszs7Wx+WVnV1T8VX9V5VV1c7kP/KqOfQHuOPPeQ66Qebti3wpG/C+oGVYNFLMNQXQSxCGBFSvcaCoUwgnCS/RbcfUMBWRM2qd8WIEwZfQ40sd0VT/mijIQe6XfU6okmP+8lu8PA/7IaRgya+teyBrNlAK6V8J/IN06Ymg5aa+2VxkCEsBOHLECq0vml1heUM7TtBkhkBaLpZLVagk9z9bW21NBAzQyiEILANJ8TQ3vCH9B7f5G7bWPuPKKWMFk8YtL9tlR9mEWUioFuUwoF+k6b0MHRy/PdXzmoMto8eeH5k7KQpkzCgWWKymugtU/yCf9hKYqOBKrELGg2oYZgKKAHKNkki7Af1eCJjStPxIr/KMk8d+r3Lxk0fWDFKLUXMWGaWnqBHKSUafiR80kD4ZSIgGGoOYRQ6tNERbbuMZhJuDVY+uWDKW+vu9gwzExhB4Fam07QXWUJy0lZCejOCHoMEXkQvJtNzHAm9ajuuzBjHHXz9FSc81kNWGBGG5RAqteq5lED7pbaMwQBXHO3OkoX14BgVIwecN/Kg8xobN9U3vm85MCGQgSiyadIT1Ryoh5ToK+jZUdRBcq6Nhu5Mx8hYFwCjdno3mix4sgbU+9meiHZWBIM+deofU2im2cAw/VSFRc/c1cKComKLiiySYiFBTmQEf3//h+taFgjSg+odMHoWimYb4I86QfWooo3YQZhFUzdgORjqEW5ESzbOH3PHqP4TaFvnKMS4NvIcSY9FEhtCqm8NBLbVI9MS2SlDWmaYzry94dePLrrKFT0CGljb6km+HQmP1uV3M1JWJWwpNXVkuoEdGJWepO0LLYhgmB3e65irT5x9zuG3VGE8KgLDajBFWkRVIkyrLQWhSDDmNI3k6sszWqAbwiDA2BeGYxBarmxYWvvkb18+9oP62dBsFtLoB5Up00V1dWJ3Etj0tUkjNJ0oE0YZmpYRvunLxsrzx/7vxUf+stJPm7JKmFmMC+gTWSWHH4V+FKBRC9qJSzpUrWRMYIDSMrz66Ks//thnjn+ovznKDOlT94GU2QDN1HRhzqEWLNiVphFWcFgaTfHQRsMuoDGV5oXtTlYzGmKYErIC3fDIHhcfN+jLvWleNmh2W2gQxz10MfGDZsdM0YpIiWGcyDreE29fVx9ux1AS42/u9GhtPI3F+a/NmNKCoUTfMMLv1bSFiJoxBPv0J544uOK4KvUEW9J7krQZAP+k/aB3y7go4aaUnfbc0PMCHwaZId/e/MA9rxzXKBqE4ak16+hEMXIs3DorxI4qAUI/k6IPpaEUQjuNf5t9L6qyRdoaMPHQ7//7ia+Oqj7RFJlQWBE94OkJ+VQDTHqcRnNPkWnRRkaJIUVFEDUbRiqg7YhEk1HzzNL/vv/1K3aaDQ1+o0SkvqiwUn5zaNOoN/erjsc0PTNyIC4h7H3TcWzarq0ic8D1p79+4sFfTEW5d029ADZyaNpJrZVJjsgi80A9X8IIxo08L6JlPkFoRFEFWqYVhWP6f+b6018984gfOdlqemQk0Dx900adk8Uho8A0Ct9mXqNpJdpo+CdSrVOQtHMAvXpFXbCwDCuLbubisbcPlCdaAgM86LEopSbQi4qsqMx69L1NDIusFBkFm5uWPrv4e4GoN4wszBaeb6Bl0zRNUMADWpprDjz19YdISEstDTMqobWqo56f/8TfDq4e7YjKUAY+yiG5mRUvCJyU0dwSWmY2ZZJ6tCxYJ+jFzfXN7/z+pRGrWxa5hu8GWfq6cO5H3Qj6gJltB1EY0vOnIGwR/eTQUZWTv3DSq2eN+rEdpgV0SeBQhaNeaKjp0/aCwlU6BIYfPTvwkzNq6dm5rAxkNkoby3f+7b55E19e/rugusX0rLSRMmnDIgM2rWHZQZg2eDVmZ4DCksIMfBmFMF5c2SRG9z73m+cuGl59lC16RJFLD1UMWDaWCJ0oKLkROb35QR0ObJ4mI5K2NC0rG4gMjQskN3Z6c7mH6D9x+H9/5fSlw6tO7m8PCjLqR0K4rkWrWPhEoykm2mjIEZASdanVQT9jcC29iPYiwojEoOF+kJp04j0ps6c00StJ+kRdkdkZNFei36CNb71Qqg9KSf+dTfcsW7EgEBj5IbXU00S0c4Oh+pS2EZG1EVoW9Z70+WJRGQQ2tI4p08hvH7vPJ4/+Hb1oaroYACWoC4LQCaBeUiJwYX/Rzk+0xJK2s6HZk+2Zxrtnnfn2pmn0RkhgSL/bmQ208baPQaaZTovQFQf1GHvZSb+48uOPD7aHWrT4VcCGhGFA8yhw0xIcS9ATChpJS+kHYYaqNbn3+43IIzNZmC8v/9GD8yava3zPqhSRX5UOAwfCGWUCGdKbsrYrrRbaiKOTQHPwREvKqRZhiII644j/+dQxM/oGAyHMIXSu4bikeqm7MwxfmCU30xCiUg31qRu/SoamDA0RVlj8df7IkCa1TfQAIsxaoXFA6uAvnDL3k6N/NjA9ito/TTJ5pmPnLAiNppjwejrNPgnVa/FCZMMwtWzHI3957dqmiqYWKTF4CV1D2LSBrjQcP3Ad0wg9s9j9ETqT/zj13eGpMTQ2MbJmlILy8OkrV8noV1rehP4JoUu5vmnu/S9/qs7cEtjovHxHVPiZFjMtW2ihnW17phVl/ITsCRopmgYGTAjXDqMjB3z2/HE/72UMRd7IsjV8DL4N6cA8opcLILNKa6qnMzB6yNrhcP7w1plrts+CdiAf0hIYtoX0HmeRF67uC4wUg5D+IvpgEjU2WutGa1Yo0R69w0vjc1rCQMLkQidYtE+G6BEOPO2w/zlh5L9JUYWfJLUQlWxiA9oetqADF+wQmjsTvsymkaaQHoVhsGsaqGFKq+dKe0PzrL8tvGlV/TzDEdmMSNkIgF4g6hSCCK2NXiSRUZoqOWqB3YS6zzjCDC3p+X3soZ8c839jDvw07alC0/Vl+pjfD2BRNISb//7uLQs2TPMt2oRTWG5Fc8o3s+gOpCVCT1i0VjIKaGVSkh/f8+l5Fa3RHtbnjC8f/yIkuZPEQdMJ6JmGj4BGb+hI0Y1KMar/RUeP/DcbfbqI3FBIGxqhCq0FFgNaje+Fhp3YtPC+kL7511fP3ykb0HPDYghCD327RY9UEoLeNQjwfyjrDqw+7YoJL/S2hpqeHwaVXtRipYwwiCplhRV5nshEaiv/RMBoyffsVNoIaPV/xbubHrr3pU8urX9ZzSo30XMi4Xh+i2HCDQ28S3Lp2QpqwaSXzzCkhBLeO51jMYAwsGRkmaaJf2iqX+3i5UjaxyoIKhzTScPO9O3QD7IhRu1GOmNVC+fUUd//4tkrPj7yBlgW+JUhE+vxycgVhinTkU8rRjCehQAjRVGKNtiSgQnLgfaBgkFjNPhSvrzuv6e/ePWa2nmwMdxApFJ26DkIorOg7Ul8k7Y7gviFLYZFuxtlkWpPQm8eXD3+yglPjznwUhiMNMXQiQktNjTvZFQaPS88+s5Pn/TYwNQhZuTCJvVSrmvSe+ORZ1lki4c0VeoU/3O9mm6DNho+EsM0W9AC4QpD5+wjfzas5ycdGv7abuS3BE3CcMwII3H6QiTt5FBkbDPY7q3701sXudTh+/RRXZDktLBBkw2mL7ze0NcDUmOuOPHp3sEBlt0cBXaAnjlMRUGLEaBYRMZIbFqFdFiUjWiqG/G0RFVibcuy+984+5n3vrNTNCF7UjY5GOr6tKRcLcPI0o6E9OKoF4bNtB4vQpISm5ZPioCeHfkiCKVn236FHVaafkr4FhlJsiUQgR9EQZR1LKNSOnbknzTsui+NXzRx1I97GLSVoQULTbgiavPmXftCbVEAPeuhqExSvRiHWkhlIOhNRVLJQSoMPBT4+qYVf5hz8t/fv63e3BClaVJEBoZBb9i49M5vZxHR+7pkJHr0jqUHi54eZBlOtsfxB339C6c9foAYY9HuYJ6kZ3hl+zaBL0wY9lZQbXpidJ8LPn/KC0cd+CmnJUVrlCxTytCEkEWoZMv1jKSmAzUaoI2Gj4DeRxTV0qbRrYNhcJD+1InTemQPCSJPmtLAuCx0TVOGAX3Obp8D3eTA4CmyxMq6l597/8uBadHqiwj2Q2LGCqlnDN1p61oMQL1KSxxcNeaq8Q/3CqDDUm7o+lZWyt70iUoUSXL5jczQgjLNCnpiH4qmZmFW2i2O+/LGX/5x9vhV9c+IsIr2fFI7/mEQSXo0tOlbgpFtyEohHFRQ/qM2esZSCkh6Wk1b8JheZLqwHXwjm0GHHjhqkj8Q6Uh9rME8su/n//OsNReM+eMBqUOdkCbbhXSDoJYmmhO0RTFQp3UPWdoMPcRA1Jdke0HKucDUUx0zO3vld6e+fPwG991s4FVW9aLtuFDEpuN5LbYjvM5bompJS8KMguDZFgwdpDkVVveI+l95yrTzR/+v9HrRmxEGtGYqiuiN4nKFNo+G7QwpMVMwLvtagy8/+sHLj/9tX7Pa9iqkSx/M8CIy8mFYp6iBaDTJoI2GjwDqOAz9KPT8IIsuq9KU1WLA5898oCpMe5nIMtJeiF7d5aWCjlX0xgnNE7r0uPb1db9/a9M9UEgidLzk3stX+fA8mD8I0rPVZ5frDq467eqTn+lrWynLyAbCNeuyfujQzpGJ4cL6ESa9SeEKJ0r3SGH8mJVNjmu428IPp7924UMLPrM5s5K2vLJazIC2G5IGbWFAP1bmQmgEoVlyr5zRijal8lFlbhS4tDePbaRSQeRC/2HAKFvssf2v+tKZ737q+Kl9xVDadIMsQ5fWPkBNW30iYdCL+wkRRIJEWFTD9jRRivTww8ef4TtCZGCPvbft2d/NO2n28v/nOmFLmEnbws3Uw8DAsFXIDOQtoF07E0tPW/HD5lCtqJAOLBiz2hJDUkf8+/jnjuhziR3Yjm26EFoyeH1aJtJJC1k6AFjwvt8s1KdrIoPWftq+deyBV117/Cv9jQPTFqxUWv/keXY6Jbwm/SqmJjG00fBRSC/wLGkIy6Y92DA+k4F1UNUnPjn6pzAQQj9jGsLNooe3yfh3i74dkUEDLT+kt/idZ9770rrG1+n9ieRQ3axhpzIeRnMmXMhvb+jkg6smfOaElwanjuzhGNDQZoXw/dBMbsTpmGnXC6C97FTg+66XoRfvKxwXqszzop3CeHvHX3/7+qEvrPyfhmydMFtCnlagVYWwa2h7KyQqyvsGB+ncEoBetgnMMHQiadMAmB7+eMKjzf6q7NQpw67/2sQlnzl6+mDncENAJbeowTHkLQqVecbD/4gWLSYDzdkLGfioaBRaNoxkEFQEoQV7qynyn1v6n395c/L6pvfoAYZrOpYlsiJtGmnbCQL1fJzWdQY4dhZIEWK3RIUImtPSP6rff3zp9NkHWmNE5NMuZxACWwT0VS/856gFG2UKWUWV6HMgM2Rvo2Yh/kE0qMfYT0/8qylpZxXTTgdWxm0RlZWl0Rg0ZYF+e+IjCCPXoIXIsOibJL0FXwkVRe8rSjFj0XX/2DwtNA0/46TtUFhuC0bJRe5PMbCgRwOm7fpeyrB6Gj2/dMaiXnKgkdDbE+hsQ3RClqfGxjZUC3ItIzOAwjBFfbTpr/+4ZHnNP0TKMiTZLkZCcxy0834os0FgmijDVEjz5yIKDMcOM66MHJM+t+iLCmn1CEZ8fNR1xx96fUr0oXdGkAYaVCK1qBjxx7f3+vYEGRSdgkHrM41Awg7w0NaQzApRXWX3P3r4NceOnNJLDDV86GB6w552RrJopicKaNEGPTWg9ylgHGXUK5TJFHQkPBi4IWwSesHP8pWx64naD2tffuYfN9RmV9uVVc30DEKaRhBkUvSVdozdI99w8CP8MOPYsJUtWk3SGfiB45gpM9qZCg789Pi7R1ZfgCKlTVUiNE4viFrUsyraVxFmEe2lXbZmQ1ZEKc/PmpAsaQVhhrZ6E87apmUz375mY8ub2VCaKAYvrKwSzU1kbCWIfnuiO6ONho+Cn5Qb9H5EGGCwCOWE3tYWWctNZX/76kkbW+YLr8qQTfSA1Ubfn/tdkaDFT6aPJFki5UOzot06R37ppIWWk9CEgxIHaF/0t8iKChSKS9J3pKBoDNEUbX70rW8s3v6ocCKot6RWU6DTQaSGWeUFmSAKLNqKwJKRH4SO5XgypLc10mmzxQtgpsAWODA7fNwhnztm6NX9ncNpUoHeL6CFDr9/++xSMxpg50FoUGVpo2p4r1OPHzblyAMmOWFKvbmIKxg74+jDUvNhXNDHHfyQXrCgtR2oXyLwhJWMUUj7jiNkCjYMAiMyRY37xktv/39v7nycPngB68WDtqVPaeIWGQqYzKgJDN99ZSQ4sO1cpC2MjM55QhGZVKCH9Trj8hP/2DMaFQShZcHcsj3ae5w1YyhCCRMCeQyFT3uLliMu8kw1gxKhD5STjWm4yzbPeuT9SU1Z2nLVQk350rFl1vOl2UNGO3O/TAJtNHRntNFQIJFwZeBkzM3/+8yYnantaDM0O+hXGVBUGJaTfg1pJI4e2qrwghZatJ4EGHrSRgVKCUGve1mRdvoNOejwL31sXoSxP72e59MaOih8uyUQFUk9u8gZENRD2b7R/PSS/3pl3a+9lLCz6VBmIUUpgfGf70dBZDtZYabC4j5GhfniuiJt9R598KRjh101tOrUSvpes/jl/IkbdrxqWG7kCxODT9qFN4IaCSyM2qGbUXq07Fy9RkvvsKOscIP6hAc1BG4NpKppKl7SFD5AXdLre6hU+goh3aGsAdxMP1I1y4co5LqhwOkcgUoMz+3+9iFHHXTZuGFX9U0fFvpqJrnILyC4aoMLG9FQQpTRIk0YI7ZBr3JQ8QmrSWx6dfXvX1h8e1S9s5NsAIJE2hGokMCnXcZR3ihtWnlsohY9nJooVlNkYFY5sldTxRlj/98JQ//DoXU8jbSxFU3FZyw4ypFI0AQVTXZyPaI6+f1q+MIqgj2nXiWKDP/F1bc+9+H/JLpodp9oo6E7o42GgvHow0K2vTn7zrS5Z25vydgVWRnQ5+Zof5xAWPQRAJ9UDYbjlkPb+yUB+lCavIYWD2kmnxye49g9PtH/8rOPud0WthlZQRiZJg3XaZlkQgTCQ6y0dANdu2k1RsH8Dfc8t/DLTemwQtJb8hiUhpQuyjU9XC6yWEWhNGRa6fKsFYoDqw8bN+y6wwdfOnPpV1ZtnutGWVQEulo/8FFKGBejvGj2QsqANrYgw4te2wtFS0RuKlSeUiJzBFdMI/L4NX9cwkgWLhq70oyFiUhxCW4YhggQnTcZHfQJIYzTyUdIer5OH3iS5smDvjN62NkHV51oiRTsF/r2saCd+3BXccmtAYSB4NPnr4Tp08I4uEyUBrr7JZsfe/mDb29qWmk56UyYSU5S2gaVCKwBFDgwaVJGGWooO8PzwpRtZH0lxmFUFVUNrDj0gk/ceUD6GAcWKjRo5IowDY0lDB9D61yIZQaqkRY7wjyg94NgjaqNI2H02RLyiXZniTpZ/9jbn1227TnHTHuyI77ypo2G7ow2GgoFWsL06WGBLxbX/Okv868J6UNDGZpUpvWSsBVIodB4FAMpIx1GCTXmiFQPzWPQDtORRTvICs8VjinOPuJ/xw+7ERfUKBbDEfQoGGrmftdO0FsF3k7brJABvfuNQR/G3OtrXpu+5JOZRj806V3JrB+lUlbYaDim2wGvhkNwUdQoW/pOr48IM1A2A6sOyXpuo7vRF35kIKE+v1mSitLZbAZdsO2oLao9KwxsKPIoVY8mgDJDMZomDBFa8Uf7dFXC+KMqRPcc0EME6qdJ2dP2ACheNZlAKo4Ch30YoJxxEopUKPpXHDJqwHmjD75icI+TKmgxnkHb9SG5GD6TFodVCTsrsa0X9g5NNOAvDNRDJUDLGIVwDbHNnf/M/O+sqHtBmNXZbDad9igznUQQSctyYAKGEe1GTSVMRW2H0kM1QRv5bg+k2o6yE0b++/iRP3WsvqSfaK7Eo0/RouLQi5Xxzo+emuJDN0LTXqgnKh40/DDI0rYlkbWy/pVH3vvMVndD6IlKg6q9A9BGQ3dGGw2FgoYrPRlAK/t+FM1Z+/Pnl/yA3qELUkHk2Y5anaVaMPo+36VF3YkANUZTF/QSRYRhNHxovkEKL7LSfnjR6GkfH/ZZ6CeMhJWqIL2hftdeaEqbnhSj20JfTlqXtKgwt/hLHn3t39e7r7k07w2daldU+2626EJFOljaUDnosKBgcM75vHDEL48edW2ju37xuj+v2jZvQ+2ijL/TdqDUXTUHEAUhmQgoMSSfhrBQ56rDI42fG+NS8ZK25ZkGZSsAym5E2zJhsO65AXwti+oWRoZhimrRf0j/jx8+6JLh/Sb2tUc4SA793Fc9PDShSQ+eSWao/DrgWTssn9C3bNY3OFAevYxb//zyn721fKqbqpeO1eT5aRtVVmHiZlp32QnQGzMoG5SQQSt8qYAiJ0CLslxYWz593cztLaovPf7+EX0uglVu8ooiehioChA/pMkbZDGhBlZytAS+aViOBx1NnzyHsRvR9rQR2X8vrbhl1tKbhUPFWFElWpqFnUxz/wi00dCd0UZDgfii0Qqr1bMHU8gAo54nF//b25vuRefn0jpFwzDpm1K+G6UsKwxpBjYpcjpM0tNfjIahiaDHPAyTvSgdyCs+8cTo/ufKyPKh52njwaTw1XqrLDIng7SyVBqDEMqvd5PRNGPBV5ZsmR6YJE1BCMtCOuqrEEUkMkKDLDMyACIMxtIUc+idN/x/xh/+E/r4T9gojepAZNfVvr5l2yurWv6+o3bDjqaNodEkHbKB0M+imhyZCsNQGgHKT9DDdPq6JArWpUc8Jn9e0DLpW58BffbChA1gIH+hSJvpA3uNPajPqYN7n9av55HD0qPIlsoHKUPdmDRdoSwtmp0g4wEdftGXNNCYVG0R7UYhfXO5Rda+s+6Pc979RSZVk4UJa9I19QqlpApVlm3ulx0L1KEfuKTzkVz1XI/aE0rLFG7GrDCDowZefsm4PzphH3h6kZqsQX0bNDePYjRhqlJGaW/LMoWn
Gih71I2oz76gdrf4Hzy94D+X1j9npoMgKypkqiUjzKpsx1SjNhq6M9poKBB6xp+1JX2wKjCkjQ44Y2bvnvfJjU3zqI1HVsaXNDzwhUOKmxY3JAJUl41OQ80nU7wEdGeAIRhGltBn1WHq6lP/PqTyVGhtzwydpHrTENoOSg8RO0ob0hINkxb5NyEhQVjxzqapzy6+sclsEEEKV6RQ39ouGtB5gEb/XBQip+DPHfW90w79Cb2CYKh1B7JZihTUtRemoLCzom5z7eJtDe/v9NfszKytb9xSW/Fhw876xsY62pyYx+WqpmyfNGvgG5bRo3f1QdUVg6orBvSsHtAvGten10EDehzSwzzIguWAogh9tYiSFjSQoQCQql2dKNJEVp1oobEhbVtJVhzt1lxkLRe6wrBpHa4n3EUbH527/Oerdy4xKuzI82wJU8n2MlkbwmFbO1t8W73J0SnQi6YoO9OKYLxEkW0JmgmCASjlgFT/M4b/3/FDr4loDwaap6FCRTqpeJWtEJchAilTrUUmLHIbhIbpGbTNpfBl3cotf//ru1PcSGbETso6jKcQopgJ/arIQXssOtpo6M5oo6FQoA0MkfWbU3aalILSDDvF2gdeuW59/SyMZbNeynBoswHpO2HgJjXkj0LbdtCt+mQ3oLFCb1IfSh/jd0PhmJUyau5hVF3xiXkH9zjKpnFHMs/OA9pBgaLjUwgNxqmSdkYIZGBLWCjS2BKsfmje1Vsyc+l7OUWeaQgimtawjZwAoxQC2hFZnHfoz04c/q2UbwkLJo4RiKwZqqfd3KtRqkKyf9DNqrzQK7TUNdPolq5yc+C5AXrAgMEvcqPe8kSBwzCAmcCBkRmI+w26OYJ9loXhoh5GIUQowIAWtKj1kPToXQ2LEQWnIgpCaeZKsmg0BSL1fs3zr6z8yYqa15B8y+6TDescy/DdACZCRcrOup4XiHSFE1DJZXO/61hQqJKeSziB1+ykhGUaLU0w1Hoe1m/MOUfdPajiUPr0Bm2GTE0MRUu7cdOP0HOhMmx6ambCOIQJW+Q1Ip2H67oOjHMylKzt3oZZi25Zsvkur1pkGkWFaQnDD1A4EDR6apmT32KjjYbuTLF7rjKGXoYW9NBYqRPVaHpGQy845Zc9nYMCX9AnMNV0K9pWgjuroHv1XEkvbkg1kYtRBr1AiP60qpJWjjX7kawPmv76j0mbd/5DhIn1pIYJJak6bvwFGUl7XsGBTNr0dSvDiAJxgBz+5dOfPfWw75JSKjKmDKA0kK6IChh/Pql1U2bCZnocQBtgoRKQqAqa+zYaI+mjWw1pU2fLiGxodDMMzAgpV42Adrmk+9QyB5ozoAXrMAiQOzLK6FMQ9F1B6hzpa0jkQw8qzMikxRQI1Q5T9B0AaDVa/GpJWSGMVAQpQJrUEFlKyAtCddXrnUVvd8t3vPKnf1z+4BsXfLjzNd+poJWXfm2lHwUe1Zm0ZaPvRZaZrjRdyFMnWQwAMkyPh1BkDhlgmUzYs+KwCcd95bqPzxlUOQImFyxhWtLro9hRM1k0LHrNMkxTZRn0KiYsQJQzh1Z+QIKVxUAv6a7YPvOvr1/49ta7mtOm54rKCgdFZ0WVDpS22qwBFanRFBs905A0nrch+/7dr32ywd/s2FW+bBJemr4RSJs30EIE6HiUOUodOg03hDS9nwAytGhxtR3BTLHQxYRBH2v4pFMf/Jh5srBbPNqp0jQj2BroZ+zQSHCtA43cWQkiaIMWELq1ddsfWDZxe22NG7YYtgtVaUaOaYRh5EM7WTZSYYS+hOKnUTrpVBtjdRVYezl7xM2nH/o9M7LQkQaCv5hA5k5X6U7DqEWKdG7khqbJ6UbVqgUcsGR8FKDahzPyQmlYrgnrJWNhmBk4IrQDWyzfOXPu0l8vr/u7+mWpAEvOC8jslEYqjKDdIkfK0I+sMO0bmQBZgvrPiDH9LzpnzA8Gpk4gS64sUXNO6HfVIyqGshqQ/Ns0gUYGN8pC3Sh9I6BPadTLdS9/8PM3Vt2dNWk/t4heH+6QxQv7QM80dGfKtWl2GhjEDq4+7LPHP1RlpVp8WAx2OpVphg7nWYcQDZ7aF32z1haul+QDSPTL6uV8K4wq0AXXZlfPmPf51TsXo3dB92zSnK7tBxH0OjS2+kUy5HV/wDANu0/vfv/+ieWnjbqhwlAflDAtX3phRN96rMCYsKUizFiWQQlCsdCSt7Bzlu6XILxOhdes0EID6aPyqJlKQwaGFVrpSFj07TRYCFYWtpgnrCgtoirXsD9onDXtzbOnzpn0Yd2L6vclBH2RUkI0K4ww69CeAw4EIjSsFiNjOxXSEz39wReO+e3lJzw4oOIEspbKFDIY6InWvyhZMrs9WqlkmFEgTTcK/MiDXQHPjCne3jL1wbkX/mPlb3wjK0I0ZYTC8qHRdALaaEgYdOcyTB3eZ8IFo++ooj1rvKxnQFtalrQs2sEG/QX6CGgF6HX6pEBCYBBPQ2qM6S2M3zJBYBqOqPVX/2X+p1bVv2vIlDB8mmU3037g0wZziRHGRgNZLTSMMhG340dnHnrzv5++fNzAi2TWt9DPSS8bWX5zlWW3GOgY1VZQ9MifJiESTE/XJqJFE5KG3bT8ArqBvrAKhymy9NYGSpc+mV0h6I0ZQfPSViYwwqW1L933zvnT3jrz/foXwgoMBIv+eKgATGHASIBNBBPBC6AZLWEEpi08v+VjvS+ccsoLpw75gu05tNa2nOHGQtONykGtQD0wypq01blPq5bUR/cDo6lFNv954eVPvPOdtc2LfEvSnhYOPf1ySD40ms5BGw0JkxKWR1vy+p846AufOvoPVlgZRA76hyCIwigIabGeNE2aEggDaNncr9oPRu7oetRkRmTatMleEFZD+WwNlj7+9iVbs++pB+uN0ESWTKvF58lCWkqNn2hzKXpMYdHiyH7WoM8f+9g1Jzx8UOoI4dGOUIbt0icfaR2AeqxB39pxaVVEESlFDbov1PueJBj08id5WNJICdpJWZLZZ/rqMT/K2peRKyL/7W3PTX39gvvfmLis7llPGlEAo1E6XskpFVp3ikGym3KF5dPu1iKdiowg6hEMnHzU9M+d9PiBlYfL0IBhLYwMq9OyRFnY/2Ix7CIVwigILVgOqP1s5P5j40O3zx6ytOZRP7UjMlJ+CBGIAp+KLlALPDSaTkEbDQmDPkEtYbZEEI4b+MULj/ylFWVgJaAjMGnlHgwHtHiMxWm1ndKyyeB7FKtpVATZKhFJ2wlDmfExQjXkdm/jXXM+saFloTCrafxKD/sT7pZpkYaaMkWOYLwAH2cya5uODLOH97v8mlPfPOvwm3t4BwSG5wuXdsGCIUXfFDBpm2M/sU8/d3V4dQiAbaleu7DYvgwMx/NTUQAzi9RGi3Df3jb1Vy8f9ejCT61seBEDdiOAURFa6q0N2oCqxDBDy/NNkXZd048MiKgtmq0xAy765lnvHTfo8hSy6RsRv14SpelNlvIFTQXNhDYdV25YhwCWIM3/IePSWL3j7RkLP/3M4i9sD3fQ0trAEh5NMNi4LvFvKkxoAZBGUwDaaEgaWARRiqaWDcd1vRMP/sLHB06BgUAfXBSGDS1Asw7QqLQbNK0XTwjDsjEyTTm+aQWBhxFJCFUMy0SGTiBFk2yeNu/0jc2L6FmCxJAmsdXmlAt0ZTnr559jeou220kFkR/JKtxSZTpnjvrO1ya8dsxBV1YEvUVWVJoObkdaLTNNr9UVkS4m5KRC6KEPrXukbQygSU16gZS2PzKN2mjb35b/5PYXD/nz219e7y/zfD8MfSP06LVFyBmKMgwyRskplVD4lhP4Hq1m8DNNAys+duWpz3362IerwgF2VEGff6MnVNLzy3ibphyqsVAmYTGgYGDgGQZMhmxgyLqw9pkV/zPt7ZPf3jAjCKuNKGVGws946ZSZMmyvRY05RNYsz49zaboG+u2JhIE5YGLUjzEiPZb2aDNiM/Xk4s+/teFvmWx9qoL0AS1okKbvB6TUE5priKTpZgPHoWEowiS9Q1+piGgfRxu1LIRn9jTtycf99WP9LrRIuyfTNyPkXVnI7aWIA/7UhyFxSX24CSowMjBcRpS+Jba1fPj68tsXrrvPNVqEJV2XRlFJPaXt6m9PADICaKrAoE0IqJaykWiWUZ9VdXPfWPfLxTWPNtGLoml65dPIWKLCD1vIwFDVTfmmPb5tq5O2hd4XZB57KVNk06Zx4sj/PuWQm9Iwcqi1NHietO0qlX7kiLZhiEJHlUB5ws0EDrQQlcsgCD3PcN5aO/Wtdb/a3PQeioB6hgCNwww8J13pN2c8VGvKTnl+FmWGltUx20XvC/32RHdGGw0Jg4EBunt68d2rEPTmND2MsAM5bfVZy1Ys8IJa2vAgEqYpfT+iBxYJFT+tKBSmEVmh71m2wPiTVzvCg3aahlGBs8BKuRWXHvv/HXPAf6i3upJA7W9A4f/rK2SeyFpCzbjgz4ICc2lGGomgxxaGZwRbo8Vz3//l/JUPihS9C0B3JkEZGA1KqaAwaZtJFGRjZtP6jR8+t/nrtY3rWoJGw0J+TJiFJtoufcoU9Q4fO5ShZYT0HmYgHKtTX8jbG64lbFce3u/cMw//3rCep1D6aOa9ORtWW2pXLBG4ykSy0CJC9ilToPLZIlJGQ+4V5YfXfGbd5ve9qM5KRz4KJkQJoIACyG9AH3mnL6bifhYMWgZL+1l1Gtpo6M5oo6Gj8MXji699c8t9GClYlh0ZHjr3VORkjUANzQPLxpg7tCzqLmmPt6RaIdQ0Oh3DCr3QToXZjHDEoNM/fv0ne/1Y2H7Wt0yKMSsjtQ0ULZDkFxlyOhxpI3sAiUkoPbSPJL0FgPBhQ4jNmQVvrr5r4Zq/1jk18ENs9H4JPcc1jdA3DdGCBFkygqGlysTAeJSm7umlM/S8amKDBBjjMFI2ofjkqM4xGmgvKBpO74qHWxUSl5tCURMu7En2EUoA9+IXanrGsGlegbbIUok1ycsV4UZ3/j+W371kw6NZuS0poyopkE/YopQrWqkjYb6giEmh+SnDyFJ1hGT0hDCRpfRENCx78ISjv3v0QVNMSH3oSukgiJA+ulSey1nQkKRoMlHpgdqQFPZcBLm16PMZZDG00Asx0qkzNr7wwQ//sfIe2qWq66CNhu6MNho6CF80oY99etHX39j0lxbRYkNRyMjzc9/qQ3dLn1em960c38+mKiIakScBfQeSPnKDzsuwbLVdcLNwzEEfH3bOJ4/8VSVtvivD0EIvT82e1mPxMCjWUXQCGVHzqQlAE9L4BzofnSYlSriipUXsWLjqz0vW/nVd05ueRYVgoleyfN/1DWnT8BmpRAIMO1DfJaDJW6SZQ6INq6mwKNmGPGfodztnpiFnEPzTydDIEAmkEqQ36nANipYJaJKZ1G6ozAWy2KJs1qja6a1fsv7hhWv+uKXxfUl7VzpeSFv6lBYhv4ND7wAhJ5YtLEM9l8OBpYVy5/hZN22Zx4360umHfK9CDrZpQQ8MVZQEmYwRrNVy3f458iL6BK4yZ+kcBi2kmLIeqlx70ntlxf++9uHvG4KtZloGYadtylkA2mjozmijoYOg6VjqL9wZS77+5vrpvmyh3RtoR2HoSCuK6ItW0By22cPzPMPKJDWyDCNH0CugiN0OYEFIH/17NgsbJXVIn5M+fewDvcyB1JuRbmZzISa3RgGqeJcjAXzh0WMU0uKIFXGiw0HB0B4EmchbVfe3d9b/blnN8y0++iVT9bsEjB6MWIOI3kKBkQAzgj+KSM868EcfxUDXTLJ83vBOmmlAVfJ6eFKXVHlsyqi1LThVBoNa90oTKZRxGojz/sc4Qb20hGtXb1zw/Jr/rm/a6HpNlmUHwsMl5FBGaWFkcGfpAIVhRCnaHERmIVGeS9WRrjAzbtpMtYRRGLgiJcWRB5w5ftRPhvQ6jp/CR7xcI8SfahGWmoApSyh7ShhIDpuksOhpHV1AOYl/rP3DG2tu39q8OoCMw1e9SNmF0EZDd0YbDR0FugrYBxL9QzBz0fVvbnrQNfxUZGIAIiLbxPBaZtyQelB0oxhPJ7XQid/P8APh0PSxEwQBzTcYIgMdF0TDeh994cemjeg1jp5hGFZg+GZu6oOgRwKk5LhDSKpzbwqFQxvYIJ8UsPrmU25mHx2tEYVGTXbd4i1/XbTxoc073w2tLH9owzbIWMAPYHGocbs6kuJFKPCCHqLvJJ516J5GA83nFL9Tw0gR9gG9IakMGfYMA5iFJpQkZY02v1SZVfn1pbR8Keq89Stq/r5k/RNrdsxt8WtFqjKMmsmUpGcXasttBJ2hNyNKilCiBj1V/upd4ki4yKK0TeGpL55kB/U6/LRRPzvqgEvpo6iQI/qmNU1E0OZUVGmBmqiACCT2Ik9JEZCliFoMIbaSvilP2Q/81MrGp1/74Dcra+dmZCYroXzpVhtlgMLoOmijoTujjYaOwvOFrZ5oqq8VP7Xky2+ue9CPsmQuBAZUCw0sJfW8jkPqmVZDJQF990H16WrFNewGS62L9CPLsOyK0MtUi56fOu7hQ/ueie5cPYemeGEo7LIV/jnfoE7bDRQHQkJ3qoJnrYM/nzSrmsqFpRKFkYGRdcu2zNp/rL1z3eY3dzQtEhbZV2FoqC9HocACy1ATD4HPyx2gr9AFTxjaOUYDTR2wi2KCJYRcKD0QVcCHLAB0rOqOkKrC2575cOWm5xau/dOWpgWhLVqgdKE80rRgFGrVMFA9WRhJQeAgj6YN/UK/LSFMMmXSVoU0PDf0TQupNDw/qIhEpaw6Ydj3PzHyxiozJaOspO+n0+bHyD6VAKobRSSRYysM7K71LL/1BKLOiHrRR8qU/Yd/1+38xyvLfrh4+/Mh6pQe4oS2nZLSzrqNlqW+F9t10EZDd0YbDR1GC42xDHT+GCSbQZidufBr87c+mI2aHZvG+X5g2rbthRkoaKhp+jZiEoQ0dkfAth82BiEN0zHIBRj1QNGatMGUaZrehEP+b8Kwb9Gg0KDxn5KK3XZfyOnE9kLBUyzKjKHeBtmVNGeb4jf0KWYkmmMOIt+SbiR2uIuXbXnmvbWPbdo537OytPcwDWdpi7yI96PGL+gpjzx31P901poG2rKPP0SEuHluGn+ySQgHQ3BXip3RprW1c97f9OSG7W9u27kMucBlWgdLt1NLDGA3QMvgp6HwPYcWfMosSkWKTv5A0d6BvQtrz4VViuRFXjZIpSqPGXTZGUf9tKcYEmabHLtKGBnYwigGK0rR9tFkgzrIsdI7Cb75W3pk6dGUEE3CqNrhrZnz4Y/fXDvVsyKayoOooKKRdTRDNzRs0w8iuyR3/t4X2mjozmijoYPwBXoM9Jn0jDsIPNOwA+nNXvY/L614KONtSFcK34d2dyITRgXtraAmtBNAWsLNmDxyxSlqGx0WBnwYlNMCwoC0m5QpI8yecNCVZx95W1VUhbTBFyqdHj/TTxJb0ACUvEEbwlTYpS5odUNgQPUbpF1UitSDYBSApKVkKBCYFz59CROW15ZV22ctWzt7Vf0zLW6DGzSGBiws+hUFbMhzh97UOUaDwNAxkoaDVNAkEc2ZIF++GzVsrHtz2eaZa7e/WNOyoiXwSV9Ix7BDiAF9hArphOHg0UJC07TDEOZUQJaHKp5cvqhMSg7oDKTNiNK2mTGy4pC+k8497mf9nNG0xyd9IAMVlxVhCoUhDU9S9bnqWRStfJQoLpiEKDBZpgshqZ0Z27JLX1/1/95cfX8mEnbKdtHwIYr0wAJWliVFFtKQTtGWLbkfdRG00dCd0UZDB+HSs16bXi9TGgVK0gsb0mHv2Tt/8eI/7nDFBhPjLhqGoCdFC8TAM5l+JIjouXjgGxgH03OKAFrNM+3IzNiB7dE2lYElA7/SEV6zM7D/mM8f/kSf3v1Mw6F3yJXRoKwHDiwByBKghXDocKBz4IEj9Lr6l6wZlA69nBbC2JH0HUxbtGCcTUozNjJo1YBwjXBHy8qNdW9t2vnmuto3N9YtbgnrYO18clgn7dNAiaKazYrGTfXvrq97dXPDP7bVvb+meSldoxcojJCfT6gnDZEnTdqSQOkWy0aNh5ELi86QdhAEKHCTPmKOUkElqAcznfpe/p7ArIvCCnriEGRG9Bt/+uHfPqznJw3YxMhdaAUya9JkUirw6GsSyD6q0lDZp0wZkDtkvZxnGmr8VbPf+3/vbn2gUbZEMm2JwPQ9J0pFRjYLs9GxMzAgUDIoBk84punLrmQ3aKOhO6ONhs4mEAtqfvPXd77m2tAqlQZG1L5r0X5+GEA7tA0zPeJGryulZ5nS8syW3A+LQ4Xsfc7Rvzhm4DUptWCNFB5NehgW+jRavIY/B0pYKs0XhhY97+gUlJJmTa0eCDdt27lia82qhZv+fMABB/SpOLqPc8ygviPTRk8jhMFBL3iy7YD00vhY/ZC6bMNTLzXws5iQPhZKJ8g7b6VAv1X2B6ChtUlRwp+qJBDo/xt3tGzYUbd1pfdCXcP6rXVL6ppWuVEDbqEHFaHduZvwtB5Ja0sNLwiRWSIyLZOMN5QVrzylewRNhKAQUFSeQVMHB6aPOHnUjeMO+rwdVYawdWjpSHlaAbBUJT25I0NPCb96B0SIrMEmLXyiKDBD02iMNry97L7ZG26G0Qf7T92Pv7LqabXR0J3RRkNng4G/FEtrHp+54Av10Q5JixloFIf/eIgPzUUPEWgjBxxEsR99yqDKkk1jB9Ojip5yAD2gh4q1SJUGtBTcod5T9RCeGzoppIye3HYGKAguC3rsA0LRgr/fzz97Y818XlbguaI61ePAvqNlmBpecWxFulfv6kFp+0Az7FvhHNCnx2BbVlu0V7MKBzqArATSjTQ/Y3JHiNxmMtn6xszWjFvnB80fNL8WiKA5W1dTv662cXWLv9mNdoRGYPupEJaeDFF59OolTb6j6Ayrizyrpk8oighpdpyUCF3Xi5AJy6g0bbMlu9O27CgwQpm1UzYMC+R3sDji5NHfHn3g5yuFY9BDCgokEBnTKNfvInihZ9Mn3KWP/NM26bTI2LJENoJVSo8c5I7s2leX/XbRxqnNYrth0gaO6F3ZaGDy3V0abTR0Z7TRUALAbnDFNvHmPS+f3SDrUR9RoIYvaqgf+FBcJjqpiOZ7IxrxFxW1d6Qhw6G9xp479o9Dqz5hiUYRpTKBYVsYrcOOgVrMjSaRNk5kJxBBQ+Mf/E9GgxoIkvfvF5y5etPrkemalpXxM5Bux7Zov178r8wdGAPcdxuSzDIhe8DU8H3fsav69Dq4uqpPc0v9jtoNfrhTzSiYBkqe3j11EQlsONu36ZR2cqSdfmn5B1WgMAIKE/8hcFLA9LiepjCS2m+j2FDFogDJ5iE4L9B6YWBI2/FlBprRMYS3UwyqOGrC2BuPHnANrAqyjmhVBhUVNAdks7PEoaigNlGlkjZvpuqkpbcw5elFIBvCh4zvcFfOXfr/Ldh4d4Y+M4pySZlebgkRiA0FFrwyQBsN3RltNHQ6jZFbLW1fSGtt0wdPLLhkU/NS9EaWkcpms7YBnef4PvS4j0GrNBwjKPImPzT7DLGodLPNaUOcdcSPTxrxPxXwoPlYKGYkDZ2fTR/0lTys7KTpaHTW1AvTyguchXROHdddb524cftCT2T8QJq0KpE+Gk6rOqQZBdTjsxFAW2CSilQfFLPUjE4owoDWFtBSCumRFlT6HoFi/K0MDkJt6wjozQaA1oNL1IYsi2aIqDRwF/5RC1rh0UWaF81uQaUp+5Sm0iW98xuEtrA8U6ayQTZli3724I8P/tb4UV+2aDtI3O9KGmTTkpRANij7qMIs0x0eszQT5VoiTbmk9QdBJB38UxNtmL3gv5Zve7jZdwOY9spCReHlfkbSkHOUE9po6M5oo6GTQRejtJ4BlYZh7c5o2wOvnLuxeVETDZFpa8HIx2CXtkMMAmGpF/P4h0UCfaI009kwY9qWRMeYDUb1Pf2Mo34xssdYesuBXnTETTBc0lCHgdFkiir1u44m95SE+ir04jz
9ghPj1/Mnrt/yhrAzsBDCiDZvwFgZmh0XaRadjQOl5lWxC9NUcxA0T0BhKVOEQqZHMVCekraCQKHwPleIi9Y/wEP1kbS6DyN0aZhGyhctpHTVJAx+gl8gFvx1lX0IKKkGDAZYUZBEQ4oe0vJDq8nzejmifpA98ozDbz560BXCt6R60xLFpGYYPHJGthqHw8jIwtjlAMsMtSCGHjeQVNC8Uri56c23Prz3zW1/8HGCWqbSqJBRC8qDJmCUhJQr2mjozmijoZMJfRFYLQaGaKiHiAa4dV7DC+99/+2t04XZTA8k6Au5ljTpKQWGr1GR53/NwPFCT9r0vQMnLYIWkZIVUmbOO+zbx434TycaGNI3FiV0jGHRM93O6izCKGvQ2gGl+alooMlMdGO/X3zKyg3/MEyM+ipCH6NkSqBheD49LWCDIAdOgfRgtMFas9VAGbYD3YU/NdyGKqVT9avcnyccejqBoTVNSnAg6n5lHOTaEk5hQFAYqFU1N1PymMJxfZfWd9pkTsEeguDBcaA18pRDfzDu4GtsqAgYSQ4EtjkUKZPWQUJZwFSgKoAizVGu2gN5R+3DdLfl2rq35r7/v6vrngpEFlVvOrQgFsUgIWdeaBow7k0J44tFpxzRRkN3RhsNnU42ClPS8MLQRjdt0icg0N/Yz6/8zlvvP1QfrqvoZTU3oxP3qyqswDUi9SGJ4kF6wRGZDJkDEI102mxxSUFarhjS+7TTRn//0D6fpA8vB1C0ppCNQlTnftnR0O45YUimAH16Aloa+isSv3vn1I01bwQYAUNpw66htYmGadGMDXKBnh2Z4j+cQim6kUNrFgFtHkErGIT0owh/ykpgm2RXjwhPk9cu7DIXAN8GZcK2iyJEw4pvy/mVNqa03MA3YTFEvbzMTkeGo/qfPPrgT584+CtqYqlSzezAYfh+yqbJBlViZCrRw3spUurLJgFt2VReUEZhI8P+M5req/nrKx/esbFhUUBrGqhErKCS9p8I0/SSidmgJiTI/Eqx5JQp2mjozmijoZNR0+xqAoEeDEPbRGbkGZGVMYx3Nt0x94P/3dS0ya60ZRR4bpgu/uMJF2qA9iWk1xhNYXoBbZxPT7eNXqasS3nixGFfH3/493oYA1VioWJzP+xgUA7UU6EwcgnAgB79tPnbd8ZvqnnTMzJQ+vS6G3py0/TDwAhImZF9oGwFclIgNF5GRw+tT5PtoRP4CNWFgpARGQG7Spu2naJpA3qrzlU9JIwVipg+sUmPmGirZASpEkU/lPTFc1oTt2sNRMlDapFeHJSBOHTAeace+u1RPSc6oYBVpuoYV9TbO6rASWhzb4UYNOeE8qS9ukO1o0Y5aEuSLlgEiiAIUMGv1dz6xpKHtmUXRw7txERrYrzIMqKMKYzAMWi/aPW5CZKKCBe52iE+u4IhdjvtumijoTujjYZSBR2QFCub5j78+pXbs5vQS0WhZVnN9HjCRZ+UCul7BdTRY2TjuRj87cz9sDhAa4ZhSjpZ3xd9rQPPGH3z8YOutMIqaA3ajMiE8oQk0VZKGIAakvZWiqKWXQvroXdwAxSoGpoWk9+/deaa7bMwEIS+puUM0O4SvZth8rLG7gTKPlcrNCI2QyPMhmEPD1Xj00BZGlHIKzZyc1eOW3nckM9PPOLGPvYRUeiiFoPQ7rR9OBLCFx5sXyoCmgSAsYMOT30qjDbs9qMwoEUYavkLRBNtSq3lxDEQUWUQGTX++29tuOvN5VMzUV0uRI02Gro32mgoUaLQj9BpS9EYZh56fcKmpvea0JFBE/pQu/TKAAa+IX0FiHShGv4VF4zYQ4kxl7CMvjJsitzsYf0vPOmI/zy8x+k0h58bdtJ6OhgOARIURabaAjDw0UebcON6B3Qu+zAaus6IPyE8KEWDdrSi5zbQgLuyH8IrtCRtQuhFoYdLFUZldeqg40ZcffTwq3uKoQatt6VdHWEdmk4ZKIOQ54R45oCMA+WLjg9e6grPNKlZq8CHkEMh+lKsqZv7+orffbh1ZotokrQCOVC/0xDaaOjOaKOhRCG1G6pth6yMK6zHFnzuvZonstI3oYKNSO0nQ2/0hR5NeNopgS6+qES+YTqR79MWlQ7thi1C1zBEjxMPuvzEw798QOo4tUUkGS/0/rr6FlMQkt2gfGnOmhYR0vPv4q6B0EYDo7YrNCEn9JBEwnqA0YfKSDVZLTAZYGrCmKg07IN6nHj00CmjB11quWnHsXhdCIjoaxHQprBaK+i860ImAWWYTIJdVmsofDtQBhFJLXpAW0pIJgzeCl/6C9b+6fU1v9nQ/Aa8UGQkwvSYS/NPtNHQndFGQ4mCcQ3tWIzenb4NaDSF9uJtf3p+0Y2NcmuIjg42A9SzZ9kOFHOQbaEPGeR+WRwQHToJy0bnGWVc2mzYgqUihO2KtEydetg3Thjy7eqoPw1SIVG0IKBZyEr8kDYAkB6UeETbYSvzoZjERoOQpgy6r9GAuqGvSBqGT9+8IBNBPXePzMjxXLfa7DNmyCXHDP/iQbR5F5lXguysTISiMquUBoDGhLfV5bWlaizIEe38qfKi1JtH4hD5MqogI8mkJrXZXbJwzfT5qx7IhHVZoyWECEfS8G07gjT72X++H6LRRkO3RhsNJQpqJcToHvWDwSL6fnTgsmVzw/yHFn2tLvN+NmhGb05bEaiuUBq79lIuGuhVSRGHNjpPGCgYq9G3HKWFbjUKqkTY1CtdfeKoGz4+5MaeUV9KFs34doIS0kYDYwvHo0dcvrAMEPr0RSTTEMOck44/4srRB15hiz40/cAVC6PO6Bwjr+ig3tHFwWgiN21QRla49ANZoU7CjJ9dXfvKW2t/s7Tm75lAGk4zbqR1r+qP7Az1MdiyeymkXWijoTujjYYSJRJuFDlojcDgbw2r7n27Vfu3+f/+7vq/SscOoAtkYBr0wQP1JcQiQvPWoRV6vmnShkWBR+86OunIz0izIspiXGvQc5OqsOfxQ//z5MO+XulWdsp0t348wfi22tk6smXo2ZHo6ww7cujVY4df0d86AjIFcwEWhYRWpAqCGYh7jU55nFRsyGag/dPoBcnIpZ2pkDHfzwrbbg4bFm2a+saa22ua1gdRyouypi0sFJzawQviHUX0KesIcmSKVNfYbqOD0EZDd0YbDaVLEESmiX49I6M0fUKQvmxNjy3Qpb2x7lcvLbmp3qs1Uj190RhBn+d+VCxyUxr0GR6cIDH0EYcA41gYM+prj5ZNVgX62rTtBK555sf+q1MW1mmjIQeyHIoe5oGHDPjk2KGfHdJrQlpWovC5f4/UbhPkyu1yaLrKYoCy7OCFq8UG7UUZQDRhgK4uMEWT2LK9afX8Fb9ZsuHxBrfRrBzgRttwPS0dM/Jd9ZUJWiJJ7/vQNl60NahpW37X+Fppx6CNhu6MNhpKlDCibSLVE9lIGE0Rbelv+yKw6QNWKQyH1jTNeWHx/6zY+pqZEgF9Sqm4Mw00R2DQCnKIizRSEZIRBbYJc6HCNCLbEoGbpUfmpuH6oe0IL+ycV/i00cAc2eczHxt6ziEDzq02BtGqVJo2QP1YgYRc2bShAgoEf/RVcYgOTcN3yiuyxQatBXmihZ9G0Bxtmr/m0TdWTduaWSRsGOWOMNzQoHyaKBnfN4V07ZygUNkI9dQPv42MoIt8rbRj0EZDd0YbDV0Mta8ObT2NZlov1s/58Kf/WHN/1myiTSW9MDJokUEQCNtIy8hTWwHTAAtgZAkHuw1aK1Hcevfpswukts1QHnHQ5JNG3nBw5alIpJC0Bg0dtVJOuBGJhMFjCtq0Eef0VghGd2rJu40b0N3TcJHesJecdhgvdH3XRPpu7MNoKLl9GixlhuVqROUWPS+geXSaUVJ/VEL0qUlaherTUyF6bxA34DZS5lEYCA/GpCcqnbTfnEmHzmGDzxx94JUjDjivl9mH7uuywGiWGPyzMkJZcG2jDk3Ij41/eeoLdUxfqMa/eVNtqo3gX1ygNblZ2bR8+6y3Vt+/ouaZjGjCpShImUaWb9YUgDYaujPaaOhyNImIvhEVRRgkORg/Lql54Pm3v7dFrK10bN/16DODMuuGwrKlH2AIRTUMXaP+qLq5wnFaVBCXH0a0LbFfGXrN6NIH9xhz5IjPnjjo65bRgwa2fBtLH7+oiREwkqpSqzyVGYGxLnp+aE2lJ8xdr8Dtq5fqKjMNUH1qsw3KBlUJDfgVSC/5UCEY8KZhrmlZ6cBwfd/HnfSQiLboQHnQvA59VSrqfXDfk8aN+PRhA89NiwNRbFbe58u7LMgsfUwEppKyHPGnpkDwL0TEoM9/0J6lkaVkiZbZosxwm5ILmltx/SYvqJu18ocbat7etHMh7W9iGp5vG8K3U4Gv1yi0A200dGe00dD1oG8903oun7aiMRxp+Jmw4S/vfemDtX8z7UbaOxlt2Ej79MkA9RXfXUBJ4UhmQ6yYi4YdVbmBF5oezfxaGNtJLxOlHJHK9Dt86JlHjbhiWM+JadGLlnfSSNEOZEAzE2QZoEdSMkkDbRNqX534OFdeMHwM+qJi22YaSs5oCC0ZoKpU7SDfyA03RChDGEZqWoReTZFGRLsYw3qwSFfiEl2FAAizb/XhA3sfetwB1w8fcKIlBiAoU4aG0SxgNfp2/si7K6L6Japiek5CsyuB+jiIpdb5qJkmyANNy9BGYn4Y2mEFmUlq9WZjWPPBticWrp62buurUSV9Ed2H/QkzyoDZII3AiDwZ2ZAoTYFoo6E7o42GroYaceEftTs+6g49Ij2fdu2WpTWPPbvg2zuNTc3oOCMzZVRGYicGs7ibDQUQ2w10UkxgrEhTRpbMejSINkWPSGYs2/NdUWGb0o96mkPGDL587NArD6g6ilZV7jJukDSaXIBqpP9U6nMdEnLO40geQ+99JB0bDRR9Kb9yGaSo+pA6GYXq+1iAchs56JNpioE6YoOUnaQJm9A1ojCsMO2Denz8Ywd++pAB5/WvHGlJ0/BpKj7whUl2pFKv+yueLgM/fVAO+kCp0kpkB7mCpgyMCLKlZAFCgXOUHswF2bS69sV31tyzvOb5nWEGdR8aMvRgZcAmS9N3zEUGv7HVz+kNVE2haKOhO6ONhq4GVZenlKmVswNoV7sW4faAuqkJVz+94MZlO54IDfpSpW1ZUDV0k1oaEGsm/BW72unJMaKA9kMKMTYUGDFDczuG4dJnl0P6erCUHnRDv+pDhh4wceKB366u6ucYPWFoQFnQb/nJNM2XICwkWq3nwyiTHvLDyti7VuwqRgPNksMoglGAzOZmU2DQIVseLV8QFlVd5AauSFvVPasPPKL35Qf1O3HogPGVhtpfIfJESGs+hOmimOhLn8q+UuUNdQiTI0VBdn3QQVHWUFbqT9Lu1zaZvtKjXZeEyMqWbY3vvr5x2totc7fVvwdhMW0rCFHpJPMpy8r6PsTMolVAFj3TgC0Bq1Q1C01haKOhO6ONhq4GKWGaq4+EDa1j0H6RMgosy4QWsSKDBlBLtj7y9Pyv7zQ2+dCd6k0xdLvU89L7dXxKx6LiB7AP0IH7Ib3DJmAimMKGsGWlZ9AQW6UjdIIgJaRvp7IyEx7Y82Mj+p9/yMDzhvU9rlL0ojR6rjDS3CFFAiNOcvCS9n3loKs8nkCS8usCbvxRFZG1FULh90sfNmrAOSiNQb2OqbIGOrT/EkyEJjKhwjRZUfQwByJAO3QYtLYfxgZCNRCMISy62MWBdagmG8ikCiDqqvZJviHqwvYiUefWLNl6/6IN92+pX5Slz4pCzGAa+JAa2AeW5URkURhoG8KEpemHsKXU4hjYIfQus6ZQtNHQndFGQxdDfUqAVjcqzUv9qOpPw4B2roFidTCuR++YsWqfXfDfizfe7zn0FUq1UIAekNPj8Q4xGmj0jE4cPbxpBQG90IGILcN2Je0phHQjCaQjcSsNjC1XWqbpGVEAi6hK9j6494mHDT5/yICP96kYZ9OwnF4XwM00zYASMGAdqQ9g7EGXWQiZe4HEoq9KecKRdo+q3r2qew7ref2QQccO7jEuJXqjPm0UEVJOik7lH+BIywFR7aQFTUEGBMpT5S83KM/d1sVhoUVud+0AnY1EcxT1yci69zf/5bUP79zcskSYRoaKkr5ODdmA/RRGDqwmabqod0hgGnYrBExZUjSvQ5/6juhRDq2F0BSINhq6M9po6GIEpG5smnklLeIp/a+2kN71Vh6tEaOX77O4c+22ZQ+8f0Y2m/W8bL7RgC642NWOPhmDZlr/jzhhOhgp9OxB6Kco5Ra9EyDQrVNKQhJCaPVQPXXeZUngLto/2xpg9xjcZ9yoAecN73umWv1A2kN9j0M9rdiDrmI0wKqqsAcMrD58eL9PDOt74sDKo3pZw2yyhJA1BT+OwY3SlTTlklL1RtlH7VH+OEdUWFCGKDv1tCLnuWtFQFcmZxmTqACvMbNp/cYP32i448N1rwZOLYoqm6U9sk2ID0xmaZj0Xi5VtIl/AgiPD+OgGXIo1OIa2Nq00MYjE0KZs5qC0UZDd0YbDeVOJGa/f8sbG35dF9V4UQWGpzbMDmgZI+WFWfSq9O4CvaRnRkGA01J71hv6jmG56J6QsAqjz8Ae44YNPGVQn9EjjI/36nGgbVQFQWBIH/aJ8CxhyD8sOnvllhdpvUdk85oJw7SC0EiHAcahUBwwngJBj7wROH6kHnzvBdeEhaUWCtCSEdJGAGkgDzLU0HLUxz+U1oaPC5UEMJLFBRQpwlX2GcwW6CfYc9VOr4F9Ptbb+VjfyjGD+o8+vOJspIRfGAFKQZZFx4vSUutYyThUhUPGCwqbMkqP1VQmYc/Bm9aB0qun9HoobEsc1SsfZBG6gj4lZUSmqAvWf7j92aUbH1uxZW5WNKmFvJpORhsN3RltNJQ5GNAHwtnc/Na85T9bvPHxDLpm2w5Djx56QwX6qVQq7Ub1WfhbRtY1K4xdI93SgNasqUfaONL4Wa2hx/izxRIVMt2/avQB1aMH9ziiT+qQ3vaoA/t+7LfzT63ZsaLF3Yl70xWGH/owDyT0eyRspZLogbcUtk3jeNf39qWEaPaGnqIY/DQk54syo5WYNKNjCsP3SfWZGOEqyyMii4FSmLJ79K4cOaDnET0qDxpsfLxPj8H9eoyqtAbRvAvpTXrTIYgCmvvZZSiUj9EgWlB4qjzoE9z4h/6H/cSKRc2P4F+2KugT1WQwqAu4hD+1khMlUSdqlm2c+cGmP62teaUpyESGGUTSSkl64VjT2WijoTujjYYyR9WuKyMHLXxZzd/mrb5lWc1rPjVyKDsR0XpF6tJ96FjHoWV1Ucntsa8UCVQqDeXpZZAIVgCGp1bgmxLplUFoZJBNPxDpVOWh1Wce0P9jQdi8o351i7e9vnFNS7YW6smzaaYBoSEQ3EzLM9XDESh6jmV3aH8kFTVKhm+B4jIqLK9FilSPiv5VFYMds2/PisHVlQNEZA9Nj6muGtC7alilPdgUadg3uXZlNEcRStqiDx/Bi/Sjj3KnBZ5lCWebjJlLUZUAAHlRSURBVAOyr3iiQT1OQZH7ZBjRztRkb0namQPVZquZCc+PbIhoi9i4oubJpaueXlr/JH1bUpohbUABYTU9N4giWLbKINF0Ktpo6M5oo6HsyQpajI+OGpo1nRFiwcZpcz789vaoJnJtDHbDIGsbMCAM3/Uss+TeX49CG9pFIpnQ9EpfGBKphsXgYliPdGdJ/QgrJXAHRqGTh9920se+atCrJU2mrAjo7ZHQFHJD07Ks2xyJrO2EWa92e92GluwOgz6/tXejoadxYM8e/dKpXkhAGECt2ZXpvr2q+6dE312jZqhEWBykBpVPkDMtcCmMYN3wPTDDlPe/AP25r1dGuzxsGNGTCJhcpnpfgXxgQSgX7UhmSke5URB+ZBmu8Bq9zWvrXnx33Z/X1LzcHNBiF48q2rRlOgjdKPIMk5Y2wPiiTcg1nY02Groz2mgod2hin19WNAL1xD0Q2Ra/5aVVty9Z/+dabzWGe24Q2BgAhhjGYXRXcrCEQs3wSxf0qCIUpoWcwMOkDEEzo9NSJsX5o7534qibjcASRlagZ0P/hntoXQLu4JlwpfNJa9EP1HT4XpBR7pNOpARN9VAB6UA50taMuXt2QSHArsEx9xwj14fCP6R1Dxhb0/CawqBgcLVMDQZAxaU2p6IHNShDQIXvBl4lvbOgygX3wN7ywmbXa3p76/QPVj27rnaOTIXSlK6Pf4TpBEZA61H4bkOSdRuEWfycC1jTuWijoTujjYYyhx6Wo5bVd45o3AcvHhKb2W1N615a9r/vbpvaIoJAOqaBIZ2wSsxqiKDdwwhWAjAMK1KT28iOHbbQEk5lSeSemNPo3rxg2LdOO+Rn9EUjpWDoQUzIJoUrDGitf1HX9MHxfexo4ImsoTYP5FNap4f4qXN01boFBI6U0W/5+YUaGyNKZWqoyzlUAGS3IR1kqUjafcAwuN0p26WsQDmpXPpRGIaRTRuSooIgbvhfmRKeEW1sWvTumoeXbXmsNrvUN5UJiKoxHN9HlXq0jETdj5o1yLwiY5cCU4+TeLmEpnPRRkN3RhsNZQ6GutBt3JWrAbdB2/LiBJ2v7QfC2u6umPvhT+av+xOG5F5o27R9UAnh01eZhElrBEhUSVqhmiV9uIE+QkA6G2ekWsgZhuccdtOEkT90QiOMPA+/Mw2TFulnpWGT+aQ0Gv1KHXMne0PSYx2MlanUaDdnQD+H1aIuE/DEH9szsBxwhY0SZSYQND9B3+r8JzBvYJRRoOY+Xhnt8lAFoUho/QEED8IHD1fsdEN/Xc0r7294dNX25+v9jaFNBRHQ5AKVHb8JDPuNagTFE+CQisiKpdJFpaMYaS2KpNdwVTSazkQbDd0ZbTSUOWrioIm2NwgrcEK7KEmHZxPU6/4ZEeCis9X9cO6yny5YP92LVV5pQDsukNbHEcNzIySFRINOaJEoCng9o4lRPLQOlLYUE0f8aMKh/026HYKt9seUvmVYsIQq1AsK3LkpVaTKhmcL9gQ/zrly4CfkQ6soSYmpcOKmA0eu14SLtRpuVl44cBPDT/J/WGLlnBz/nHGBeO3ILFmx5W9rt77y+o5HTdgEEEN64VUYucWlYeRbpk2Pz2jCBiUXWahWKmWYalRU1EHhXxQbZCDwc088NJ2LNhq6M9po6Kb8U3+RLiUZCEIvk8nMWH31h2tfzUS1GAsHkvbvt+hxcpi16E0DjI4t/DCwaOclMwutwNpZqV4jCDy4cCPpR1adHc7ZI24+/dDvmdA9NF5FQqGpYFAoBaQhlFKnZwD8LbNYADJCpGGjkYomhe6FpLpNnlrBZfQU9FVJVDku0zmp+V1LNXJaA5etULaIHRsaX31v48wPtrzQ4K7GLz16D4Lu1JQH2mjozmijobujBADjdbT6EP2AaaQ2Ny9+edn/m7/xwSgNxZD2vUwKw7uIFh6qX6hHBbAMyIrAuNDHT9lKwFE9rZe+H9qdtAWjNhr2j+/7Fn1YPSZURoP0qfboMY8yIF1lCZi06tNEvdKTBGUu0ooCVa+h5cOigI0I6bFhWAYiW9O8ZP3mBUt3TFu/bVmDt9msFKFhZDMUuGMjqJJ7lVdTMNpo6M5oo0EDEyDYNW8vaP2fIwLp7/DWvrny3rfWTG2RmwKRdkI/ijzaa0C9v6BGnDAp1KI+GnnCSb+mSWUMP+l5dpbOOxxtNOwftu1QT7GxyD0AzRVxGe1aOKIkwoc1YIgKnnzAFdIXdJ+BIg2F3xxtW7/j9cXrnl63/ZUGd60bNocVwvVISCi8kJ4c0ZaY9ApJJ009aYqANhq6M9po6KaoaqdR4K5T9YA/926iZwQ2vYxgiHp/x5ItD7/6/i/qw+WuZ4SGQ1/LEh7UjQWVbIisj2FrKHHFILUQwKCA/lEKo1PYm9FAe1bpTi2HMggUXENkDSjPFn76BA9amEgbItB3wviLoqhysrzUvRlva23jxrdr/rB2y8LNde8FZnNkWj4tN3Ejk743hvo3pEMSFam9NBCTL9RXrD
VlgjYaujPaaOi+5IaY/7Qb6DQUDYasVJ2A+g6W8PyoyZI939n26OJ1f162dSatnLQsekKBToPWHpII4acIRwobiiKMPCgeesWuM9BGw0eRex6h3OrtRrW6BQpAmQQ+LtD8ET2pACF/PMOTTRvqF3y49e+rts/a0rCwyWsILRiP9LESWvsSwVik2QVYFSlfBrS3FW3ERB9FD01T4jT0dD9TRmijoTujjYbui1L2pD92qRAFaRGoEZIK2gvKJA8YAIbYGYjUxsb33ln7h/c2P7zTq4U6diPh+KQq8BdgfBqY0nQM+pqlu/d3EoqPfjzxUeQWQuYsBrIalXfkq7ULsAYdIUyUnhvV76hfvazl8fVbFq3d+o8G9Z5kZNGLpChQh8xGJSkhCtdSz6joM2BB4FiwJ0wvCHy1UpL274SY6VclywltNHRntNHQrdlV+/80GwKMDaFRoBmARXvw+cIJRDblp4UJvWIEwqjN1i7f/ujijdPXbn/Nj3p7Qb00PcNSb8QJ28DQM/AsHql2ONpo+Ch8GIq04gA1j75ePVPyw4wZ9UC1uzK7sf6d9zc/tWbHy7Uty5rdHRnHQ7Ua0P6mGYa+D7c0HKsSRmIkMsKgT3cgmJC2DQulQVt24/4woB2+pUHetAG4lLbuZ8oIbTR0Z7TR0E3hOYZd7txwUzmgDIRHT6OhJOhbkHQpECHUA3QCrmH8aJJFEMhsQ8uW5zf+YPXGhbWNS6RNM9CBevJNt1B4nYA2Gj4KNW3EkwRUjV6Lu6O2buu73v0r1r++acfbgWyOYP/RpmC0+0WKDIa89ZJKUOCPiqZtoZU4KPFR5SxD+kIEbsG9gaMWMoT0qWvpk6GiKRe00dCd0UaDpn1E9MB7xdY5izfNWLbt6R3eBpGid/zNwJRGQE83oJ+gp1hFoWsJLNpySea2RjRlTvNEBq/EVEGSaUJuw6TPGLSJLmM0oEyQJjXQV28loBzU5IzSwPQ2SkSzPQaVD/nLAIW2yxKjH6KUqGgol0r5Y5xP7zRQwOjMofCtKAqlSR9+oi9Jqp+IKCtkKpD+9uwHGxveXFP72qptb2xt/NAXzTD1NJpWoo2G7ow2GjTtw88KizZsDISViVrWbp/3weaHlm98skbW0Bg0iqCNYCbgRvQx9JFoqb5TCBWFP1gKEc1gQxua9JUInORGwLT8PrR8XzhWs4qmtXSdmQY14t8FtUJlLpAZQSVChkPOH+emcNV+idD/MByU7WDQLtfKVKD1J9xrq5/QEX/0kS34UbnCHGsWOzbVv7OxZsH6+odrd26vb9yWjZqEHUQWpQNmC32tQ6NpHdpo6M5oo0HTTqCcjMAThsVz2JGUZhBE725/ZMWmF1ZufXKnvykwoJbSPm0w6BmuZWIMbPq4J1BqkJbRQbN7NLBWuz/QOnxeNmdYhuG3TZt1FaMhpAdAu2YXSHHjT61DFOo75igEaph09Z8dMjyUEzo+jHyT3n0NYW7tCsTgvTJoTSJtzxRurHtnfe28LU1vb6x/d+vOlVmxE4VhGJbnoc8Xpqn23qaSsfE7S3bOvhqarog2Groz2mjQtAtvl0JWigtnrkFqD+qwJRIVTYG/sf7tD7c+uqLm6ZqWpT49kLB8+pghv3NBL13Q7EIIHZZSHx0g04KG2fRQA+rQEmbblNnejIbSfOUSCp7KjMyjXRsuwSwI1DQCso9r5JkjRENV96m7cZDqTQaYGRbdHNJHRDJbdr63vu7VDXWv1DQs3dTwHq1bIJuM/qFGTsYTfkFNngof/j7NUqAWqIzo1QmNplVoo6E7o40GTbuA9EDThSG6ERqz5jxzKyI9jHgjkeYJ9drm9zdue/Ptmrtr6lc0NG9QI2TT9aEcfSsVZQL6yKEhrMiHSAbKTa/2hW3sjbqK0QBTScpIkqrmBkjbaPJcAul26Rr01AEeBownWoIq1TwCff4bNgNK128O6urqa9btfGpr3Ydb6t/Z3vJ+Y5BBDUhL+L4VGmR+keVBQQhTWijWyA8CegWSipaitCjQKEAyECz5aDStQRsN3RltNGjaB4mP0jckSfjPkLStj6BZA1JZ9D4fbjB3fe8AyskTme1Ny1dtm7e85vkNDW82uhtp6wDb8LwQQTgO7RcVePRKH82i889aTVd5PIHSUm8ixAs9UVj4U3slwNsIoxAFB3uBv+EhM6J5R+O6LQ2LtzQt3NSwYFvz+w3ZDS1e1knRxkr0C/VrlC8sJM/zbFERCVcaPkqQbC/6ZJR07ErPbzJNEx2+surIvENBoXKk/jSEptVoo6E7o40GTfuIMGRWM9voOeipBGTKV4/nPTXVTt/dhtr26W39UBqm6VlqjiH0Iho0+6Jla+btDTULNjT8fdO2lTX1K3yzhT5+gdE0gjPTMsxQmK2m6yyERCmpPTfVbAoc6n0S+kgDemBXZHY0rKtpXLaj5b1t9e9ur1uxLliAi1KaUpiwJ4LAMy1h22ZTQPtyGrRTUxQFyK163ABrwI8My0HwHqw2GeLOIApcN7LV4wxq9AjLsKkmaNfo0Da01aBpLdpo6M5oo0HTLqDoWIDoDQr0HPQNC3pRHx0KedIkBE080Fw7fOhJAY2I1e/gIWklH3c5NEj2G8LNG2oXrql9fUPDW1ub3mtoWa9ubgNdZqYh9KX6sIMvso3ZDTU7l25rWLyzed367ILahi31TZtDaydsMJdmb4QBTe9R8aKxopwNmAYwNdSbJrYqzwCGB0qRCp5e1gxQ4ChXNQFEJgVbCZE0TTuMXLjVjdKHYUErIg2J1NC9Gk2r0EZDd0YbDZoSAtIYbzkVBLRIclnj87VNq7Y0zN/csKCmeUWzXx+oR/92oMbW6k76piZ9Los8zhn57fGjfmpFlin9QFi+cC3ahQhhqh0LaN2AeuJBkah1gPSVpr1B8yXqfnIrH6hmevBPJ2z6hOrIabBYq9NpFEZIkaG+xkBbK0SBJQ1S/57RsK1+cW3LivrGdVvEyrqmDdvrP9yZWUtfh0JI6iFCZ+2kqdG0Hm00dGe00aApISCNsdEAN4wGE8NqHigbNI2fCbfUNCyvrd+wMVrUlNmEAXpt04fN2e0YW+MGQ8pzh972icOnOFE1zsMgMizobgsGg0tT9UrJK5TQB/TEZNfizd2IhKvWb6oxuUKN2+lbG/9EmR9IHdIMb1o6IDKN2c3N2c1N7uba+vUZt3GrnN/UsnVnZkNt42rf8FwYKjQHYFqhE9GCBvq4F+WYPtBgqjWPbXsco9F0PNpo6M5oo0FT4mRJOUPxQ07xJwMYA2qyvpI1PzosN3SbMzVN2U1Zr2HWmv82g6qU7HFAnyMNo1paslfFkB4VB9qNTkW6urqqf2WqrxSpj/5UM9oFlDlNLXiBaG5qrmnO1Lpec7ayyfVaahs2tWRrhNOMY139Jvhstz5samryfdcPs7BzDENtiwmrwqsKQ8+wXJxaKfouA4yGMBCwYbifRSZoVQFc6lzZIRpNSaONhu6MNho0JY2nJvm5S+J5gpyuDdXCPWlKye8XEIEQv1188oZN8103U5Hq4fnNYRSYkWVIKzAypI8jDOgh87SiAqodPw72If+GevWRLiJ+Uu0REkEPN0IYBJLePRDCckw0nyCgL0lbkak2TZKAt0XAPTAdUuoLDvgtbwMN+8Aw6Ff0oghliH5AZoNBMxjw+mdmNJpSRRsN3Rn9BFVT0tgh9LEwA/qTakEl1HQYuRL6mTahNHOqXT0+oJ6r2TLCyHEwmt8JTV1hGfSyp5nBNXpJwcR4P5AWbVYAEyAIYTSYe/0LQ0tElhSWtEzcL3G2q61A5VuWYZrSd4PACyW6TAo6MC0yROgZBayEKKL3HKRExK4hPEMElghNGRp0MYxM2tZC7dNAWzWYsB0oOloWqtFoNCWMNho0JQp0M8gtJaD9BjxB363AGB+6GEYBLsFeUKN1MhdCM/LMyE2baemrDz5DZxvCz5BqN01lbdC7hfRHToN2V0QQrLb38ocYaSmlHwS04zWNqmi9pWnDFkAgPm3RCCdO1bfAQxdWA71BipBpqSWu4ehFbFCQbxSaYQBfJMyXphfIAGkIZOgLROAH6vUFtbG0RqPRlC7aaNCUKDTRj8G45UWShvMwGQKadzBJD9MEqe0b9DUm/HkyItUrXV9moL4DiVG/SU8vTEPaKQzgW6CRI0dNF0DRG/TWopqfoCkKqPS9/fFVNA/8QD1BIK2PPzfCQQibdm6GleDRxyh9aYtUJJyQlknanrBdabum4zmOZ9nCsiJTTSMEZkT7XyL1sGn4hUn1xiP9UQz0/Wj9AQiNRlPSaKNBU9KEoS0j2xC2HVlmRI/8zZAfMtDWSPxnR9IKbcuvsvyejtFiyqyBYX9EWlgEGQu/l7ZBTwl8UwZq6wghI5gOlgV/ZUDs+YcbEALNYdBThpB+KD0EYkcm/qQnpSdS0nKkaQRS+ojSoj/L8h3Tc0TW8l3b9dO+G/peFNAMiTR8A38wd+hpBcwFhBwGMvDs0FcfklDxajQaTSmjjQZNSWOS3lauXXMAtEYRnhjuxz7kqbajtDD0r47UPIElTVrkSIsMYCbQysd8aF2B4YfQ/PuAvsVg0CJInnIANBkAf3o+AgMgkiZcPoWsrAwr8vnPCAMDZg38EEBAExXqL4KxQjMVSJjaCZJNE3qIYXj4U7aERqPRlDq6p9J0B3hlhEaj0WjahTYaNBqNRqPRtAptNGjKk0g9TdBoNBpNgmijQaPRaDQaTavQRoOmPKEdETQajUaTKNpo0Gg0Go1G0yq00aDRaDQajaZVaKNB0x3Qcq7RaDQJoDtTTXdA79Og0Wg0CaCNBo1Go9FoNK1CGw2a8kTv06DRaDSJo40GjUaj0Wg0rUIbDZryRO/ToNFoNImjjQaNRqPRaDStQhsNGo1Go9FoWoU2GjTdAS3nGo1GkwC6M9V0B/Q+DRqNRpMA2mjQaDQajUbTKrTRoClP9D4NGo1GkzjaaNBoNBqNRtMqtNGgKU/0Pg0ajUaTONpo0Gg0Go1G0yq00aDRaDQajaZVyCjS07ia8uE370xYt/VlacpQGGEkRZQKwybbkWGgF0ZqNO3FiIwwLcysL30hrfTInidPOfGpKLQNw8rdoSl3tNGgKSt+/9Ypa7e+KgwRQLilMKUTRK4lha/FXKNpN9IQWSFSaFuh5QrjY30nXHvCU1LYZu66pvzRRoOmrPjt/LPWbZmDAVFoBEEEoyEtomwYRjAgNBpNO0mFZpMM0qYhI8MV/mG9z7jmuBftUEg90dBt0GsaNGVFGIawFUJpwBaGPRyE2RB2MXzUrpD6T//pv3b9RYFtCt8Pfd+XhrCMZlu2wKHpPuiZBk1Z8Ye3Jq7dOjcShrSjMPJFZEiMiSIroOcVGo2mXaBFibQpsgYMBl9kj+hz2vUnPCsjh55baLoH2mjQlBW/X/jxtVvf9ANYC6ofg3RLIdWpRqNpJ0EkfEvYgUgZRrNrHdH/rGtOeAIeek1D90EbDZqy4vEPvry9cWkUpGEnSMuLQkOio8NRGw0aTbtJCSMTGk7UCJvcE30O7jvmzEN/YAjHEnpRQ3dBGw2a8sIXgdxpGj3UtydCtWrHl4KWOGg0mnYiIz8QDs0rRJ5r2JGoT/m9hKXeqNB0D7TRoNFoNBqNplXoSVuNRqPRaDStQhsNGo1Go9FoWoU2GjQajUaj0bQKbTRoNBqNRqNpFdpo0Gg0Go1G0yq00aDRaDQajaZVaKNBo9FoNBpNq9BGg0aj0Wg0mlahjQaNRqPRaDStQhsNGo1Go9FoWoU2GjQajUaj0bQKbTRoNBqNRqNpFdpo0Gg0Go1G0yq00aDRaDQajaZVaKNBo9FoNBpNq9BGg0aj0Wg0mlahjQaNRqPRaDStQhsNGo1Go9FoWoU2GjQajUaj0bQKbTRoNBqNRqNpFdpo0Gg0Go1G0yq00aDRaDQajaZVaKNBo9FoNBpNq9BGg0aj0Wg0mlahjQaNRqPRaDStQhsNGo1Go9FoWoU2GjQajUaj0bQKbTRoNBqNRqNpFdpo0Gg0Go1G0yq00aDRaDQajaZVaKNBo9FoNBpNq9BGg0aj0Wg0mlahjQaNRqPRaDStQhsNGo1Go9FoWoU2GjQajUaj0bQKbTRoNBqNRqNpFdpo0Gg0Go1G0yq00aDRaDQajaZVaKNBo9FoNBpNq9BGg0aj0Wg0mlahjQaNRqPRaDStQhsNGo1Go9FoWoU2GjQajUaj0bQKbTRoNBqNRqNpFdpo0Gg0Go1G0yq00aDRaDQajaZVaKNBo9FoNBpNq0jeaIiiKD52LZDmMAxzJ3tkJHbE9wRBwI5OzOxuiUyE/EIAu52WCJyqPesrWfLDj6t7P8T3F6nQ8tNQWBS7lZLv+zh2ogAzyMtuadgzd/k3sHuvNYJL+XeWGvn5it2FVeV+2K08Ew8/EeIUllR9xWVVylLUuSRpNLCkSinRE3W5EkfikXLD+GeBcBbgGTtYnvgezik7+AY+dgDcV3JikAacckqSJc5OfpmUDkgVUshpi4uCHQnCsXBRmKbJjr0SywbfzwlrjZ3RSjh8pAFhxnGpK22DRQUhcNosyyqS/LQeJAZ5QRryixc+6EbyC5ATyT58J+7JvwHhANzGd/IpXyodkGYlILn0w4FEwsFX208cMgoBBeh5HnwSDD9B4gpCUjnZnQ7XBSemdFJVaiQmTFzccU/EYtqFCp07GsByDPbT0nAP7ucbYkeHAc2BI5c2ShincZoThAuEa7A065FHySx47JNgRXCRIuOxYKC0Y/eeIGrczPfHt3FNJQKHzw5QcI1zC0UIbH/AXST5aSVIAxIDB2qTy811XfZHNxIXIJctHPDhO3GKY34Jq4KhoJAdDpZPSwqkjeRjl4ELB+crKRAgjtw0UDi2bSceRSIghUgeKojTxqLYielE1LEoconhlAtTsxtJyhPkAO0cDrQHlD4av+M4fKlLgKJgKdnTAeLWzp7xKV8FXJL5PkWCEwCZRqsrUqTcpDkWHEuw890r+fXVfvI7EZbt/YTPMs9urhQmwfRw7PkRxS2uTcR1mmxxtRMkhrMTJwk5hWe+WRATFwK3gj0bI8NXcyclA7KJxOeXf4LpzK9Tduf7lBpcj1zvnV5ZLEU4IhlcaKUpP51OYkZDLJqe58G83c2zS4DUstxwe4YP3PvJwp737OfmpOBmxhGxO/bkG9pJfvXFbSbB8JOC08ZVwORXRPtBlhEaomh9IeN+ULyCQuCcu/ZUR/zbREJrP5yMPSUttofiS3xnfAP842THlY578k9Lk2KXPAeLAkS5lXJRcA3GAoDq7kRR3DPqWAI1u5GY0QBmzZqFUmYhYN0Dd4LhF5W4GQ8cOPDwww/Pl2AWbtwQDxHULwjObO6ko+Bu9IUXXnAcx3XdVCqFpCZVzsg4PweFA/lF4IjlhBNOyF0uJbiCcFy8eHFNTQ3cqAuc5i63DzYXUNQIE26UyZlnnrmffgQ3406wdu3alStXogCTTQ+DYJGYysrK448/HiHzae5a60DyVqxYgV8hL0geEsnu3OUOB2k45ZRTWOpiaxUgd1y5OOIUOcWdsT9O4Waf+FK+Z8myc+fON954g7sXPgKknLPZfhBUz549jzvuOAQbF2BcRCUIp40Loa3CnDg8O86iyEWXu6DJI0mjIW7MgFUOu7sKe6a5T58+Y8eOhf/gwYNHjRo1bNiwQw89FCZF//7949YI4ox3TMtE1OCAAw6or6+HVsv5JgdywdlBvhDRiBEjli9fXoLtJ1bhSDAnlf2TBR0ZCnn48OGrVq3Kee0NxM5p+OEPf/jzn/8caUs8SRwgMgvz5emnn0bvhmpqq8j94Ac/+NnPfoZwkC/8PNkUFgaXMGckzhGOSBuK/bDDDmtubkZmjzzyyL59+6IQRo8e3atXrzFjxgwYMACnYLdywA/hCUcB5VNsYOtfcMEFUE5QS1BO8OHs89VEOPvss2fMmFFRUQH3bqZYqcE1de+9906ZMgU1hfrKXehwkIy//OUvl19+OZ9ywlAvnW7HlCKop6RAaKh4wC2WT9lR+sRJVTnIwT5MfApF1bt374kTJ37jG9+YOnXqwoULoSGQfcgZl0NR4bggzdddd12cqsQlm5Uxg8ChLzn20gElwMcnnngCiUQ5xFKXCLsV7I033sgx7gdoAhxvvvlm/kmySeL08PG0005DRCwJbeXHP/5xHA7gFCZbdG0iTgmTX2hx4fM9+YlkRQifY445Bi3xpptumjZt2vz587kKUFPcGDumSbaJOXPmcBaY/IaWCCiTU045heOKJfYjRbdTQO1wBcH+47reTRg6mOuvvx5tisuqBCWndEjYaOhWQMRZyjEAuuiii+68806MyHNlkddQWf7i01jrx8cCQJiPPPIIx564xcDBgribvv322+Okcr+MEQyfdhaxyvz617+OFMZpTpD8gn3nnXc4uo8ECox/UowkcZinn356LrK2Eyev/ODCgQ3xgx/84KWXXspvXKSdVDNk6WXYp4OZPXs2p7Z4oARykZU8qCMMSLifKUZ7aRNIQG1tbS5lhRrl3YFOG2GUASg+HFnUnnnmGWivI444YuzYsb/85S/Xrl3LbQD3wEEFbRjZbBY+rIpwyp5wtxUobIR52WWX9e7dG6doeOyfCJxadqNXRWrBiy++iKRyh8tP+zBCghsOvrPjQaoQO5KEkm9PYe4LhBYXbM+ePTGihaMT86v5SCADkApo5R//+Mewq1Kp1OTJk2HvrlmzBlIN8ufqd6tKaIicqyyIm3DJwo0LrezXv/411wUqSF3pTO699152IHmQJXZrdkMbDQXC3RA3zlh9oldaunTpDTfcMGzYsGOPPXb69OnwgT+uAvRi3FT45vjnbQIhcMeH31544YXxPK26mBgIkNsMkooYoZgzmYzjOEgzPDnZcCceb5tA7MuWLVu+fDkSCTeXalLEdYSQJ02aBDdsvs7Nr2b/oHa4fbEbdsDMmTO/9a1vDR8+/LTTTps2bdrOnTtxCfdAgGOB4SM/JkhWhDT7Ad0LKgJMnTqVmxUKn7uXTgFpgFTccccdLB5x78dXNfnoTrBAIFiAHXxkiUdXBeUKx8KFC6+55pqDDz74pptuQm/FDQOyGAti/JM2wSFAsvHbT3/60zBK4u4vETg7HAX7cIwvvPACLjHcouBIMN62wlE/99xzOOaXaoKghDm/l19+OcKHzQd37loraNPNmnYSywALZywPqAUYBPPmzbvuuusOOeQQNMn169ejZiHeuBOtlbUFG/fcSLs6XULwUEEo/wcffLC2trYYjbcwIBuvvfYaxINnnspDHhJHF0oCQMgASxgcruviyE1327ZtP/rRj0aOHAnToaGhAT64DbDWL6y1IGTuGc877zx0iAgEQfGl9oOQERoHiHQiLgDHiy++yP7sg6vsr37UCXDUDzzwQFyY7J8ssP8qKiouvPDCTsyppjWwDKA5sLHLMwcAUgoFwO0Ftvv06dOHDx8+ZcqUdevWwQe3cWuN79d0DGhQKHl+HEDdimq/3LF0CmzE4PjHP/4RIsT9au6a5l/RXWG7YF1CWlQt6oGbGwBOIYLcVeEU1vRPfvKTIUOGoM+CLOJOvlSYKsJvET47zj333Pg0EZC23UJDgsETTzzB/kgzcsSXEoy3AHbs2LFgwQJ2x0XNp+2HKxH92mc+8xmuJpRMm8JPMDGaj4TrCPYBF3s8hQDBgA/qDqfx8BG6asSIEddff319fT3sQtyGeyDknSvPSdFVBG/jxo0vvfQSlz/gGuwsYiH585//DKlgn/KQh8TpzHrq0rCIo6PBkTsm5U0+EDUWQcCSh5vh39jYeO21155xxhnr16/HndyFtRVqXrvCx+lll13GjqTIb7qcO/ZZs2ZNvFEBEoBI4R/nulOYOXMmEoBE2rbN2gIJy11rNwiKMz558mSuU7ZLNKUJKgiwAxUXjxQhqPBB3eGUnxvCgVPcMHXq1OHDh9955530e0XnynO3ArXAJc8zPezTieUPIeHOBD3JfffdF/vwVU0+2
mhoFyxVEC8AB6sZHPk0ljnup3CE/5w5c4455phHH30U3Rbf1iYQJuAA8fNLL70UnhxvIiDk3dIPHzjgAyUdJ5g1KC7xaceTnx5+IM2pTRDkrlevXhdddBEKhMs8d0FTekASWABYVnmmgX3gYPMd+ik+xQ2wNevq6m644YaJEyfyi3+6ijsMlPa0adNyJ0VovAUQS8svf/lLSIKWh32hjYYCYXlipRXLFjviU1zlGwB3WyyXtbW1n/vc577yla/gdLff4jY+3Q+4kzs+/Lxnz54XX3xxHAjrcgb35FxtJD/9+Q5e1oCrnAtQcBRthRNApbnLgTS89NJLSACnIb8kE+Syyy7jGEGca01pEssGOyAPsSO+Gp9CbGBrsuE+d+7cY4899vHHH2dZiu/nxghHMUSrqJSUrMYFyFXAx3vuuaepqYkuKx+ANPOlzoITiePatWtffvlluFkeYuLkdTl5SJYO6vQ1QDWN3NwpBj1Tp0499dRTd+7cGfujF8vX+vuCe4RYoHnrUz7lbo7dkOz4nvaDSJ9++mmEjzDjzpQvFRWOJe5Q4t7wiSee4HXX3ID5aoL5BRiJXnDBBXGMcRo0ZQDEJn6qhdO6urpLL730xhtvRBVDinAV/twY2Uf9qMtQUoLKJcxFCgen7cEHH0QfyAUb+3d6OXNKUO933303+4A9C7PLyUOydOvMdyQsjjii8aCrgjuTybz++usTJ06sr6/nq+jFeKZ9/20+DgpH6O9zzjkHP+SfQJo5Cr4KB46JgPAB2w1oVHBzRLnLxQcxsoM7+lmzZiHX7INTbsbJpqeqquqSSy5B4Bw1Ms6lqikPYmmJHb/61a+mTJkCYxTixJ6oerjZStYUAIoOJcn9ErcjuFevXv3SSy/BzQ0qblbJtt+2wt0akoce5s9//jPEgP3zW33cC3VntNHQQcQNhk+5FaFFLViwYPz48bAb+Ib80c++4C6MjxD0gQMHnnnmmXDjV3Grg5vHSUnBKZ89e3bcbODYfzoTIc4Ulxgclno77sknn2QDCyAlfE+C6UEsJ598MgeII0qb+xS+2hradLOmg0H9ok4hVFxNLN7wue+++84666zt27fzpVgA6DddhJISvLgXQhnGCbvnnnvgxiXuxGKrgq92CkgAJyZOxrRp09gHSeWU86X4tNuijYYOghsPSyFgyeOGtGTJktNPP33nzp08A8HdGd+2J7FZwAHi59CdF1xwARzsz+C2/QRSABzvzJkzWWcjcCSeW1Gxyc8aJ2PFihUYrCB2NHUGnjjdrRDaA+ri05/+NBwIE3AH1zH51XQAqF9IMmqWhQewAz7vvPPO2WefvWPHDlQ3G6bxPZoCQOnlF2M2m33ooYfgQFHHntTGOmQQsi/QseR30Tj99a9/zT6AkwcHUsiwf/dEN4YOIlbhEDi0ExZBBu4FCxbccMMNrI9j8d0r+C2u8s9xJ0LDry6++GKcwjO+VAwQ+MqVK1etWoW87N+ySRbuVpBZwO6nnnoKR+SdPQGf4pggkyZNQsgcLBxtLdvE06NJENQO7AZUKGqWrQeua661hQsX8mefuCXGc1pdAs5CicC9hG3bcHDzee6555YvXw4Hn/KR6dyUxynhV3PR18XPULjHzk9qd0YbDR1E3B4geazk2I0j91b33nsvf4GQ9eK+yFfVfCd+e9BBBx1//PFwx2INT7D/oNoKokaYTz/9NIJFh4v+tAPshjhHiJSzA5/HH3+cHUgDewIUY+xuP5MnT+7duzcCZNXCISP7fFXT1WG5QrVCQ3AVsyc7UNGLFi26/vrrud7j1TOatoIWGnd3KFUU77Rp0/JbExc4E9/Z8SAxiJ0rOn41F31y3MXFbT8/wd2TxDpZzf6JRS0WPghl7GZ+8pOf8Jdz9yOXPPTBD1mauZnB84orruD2yQ0SIYAEGyEnFWG+8MILcPPgjBNTVBAXIsqdKMOlvr5+zpw5iBr+OOUsx8nj29rPJZdcwn0HIkL40CvsrykPWGAgPFzLfBoDuWKdwe9T5Hw1bQelh5JEeXKDXbVq1RNPPMH9Eh/jlosbdquFjoQT4KlP+eAURyTv/vvvb2pq4p4WaePkdWIiSwRtNHQ0cR8EoYzd7IAPBjd1dXWxD44A/iy4+UDEcWQRB5deeik3QoavJijfnB7w5JNPsgOBx55FhRswu5Gvxx57jLsh9gFxSRaWHi4lfjYUM3ny5Pwy3O2qZl/EItdK2csv5N1EuqjsJir5p0gMYJH7zW9+M2PGjD3las/2WFJweZYCnBLULMoQbt5sMT95cdmiSPcs59aAwOMAITwF553rlOudj0gPDEeEz6c8cigskeWENho6mVjEWS3BEv/hD38IT8DNDKAlcKvjO/fKsGHDjj76aDj4NjSAj/xJW+HEoP1grIBTRIFTvlQ8uLmyIuHsvPrqq+yZCMgClzN6hDg7sBiqqqpQgHDjKsfLR83+4VJCfcUOrrt9wVLEN8e99v5/UmyQGJYEJANDT/4wJk5Z6vjIspGgHCZLqckqCgpFisKcPn16XN2JgIpgsUGwABFx1STFrbfeiiMkAbGgi+ZeotSKt4PRRkNJAKGMlRYGN2+//TYcLJ3cJPiUHXsFV6+66io44i4v/mFSIGTgOM6cOXO4cXZAp8nNNXeiMgWTZf9F0SaQo5wrzz1p0qS464EnR5dgpGUPCo0VPyQE7L/o8ouXj/mV0vHYts2CzVloamq64IIL1BWCPTmF7NZ8JCwGL7zwwurVq+MGlQjoENBUESbDej13LQk2bNjAyyE5Czy0SzD9XREt9J0MBJ0d6IDgxhGi+d3vfhdHeEI6QXxP7NgTNJ7LL798t14swU4NQXFTcV033nA3wfD3A8eCDCIB8+bN2759+37KoTB2yw6MBhwRC2qBc10AiSeyS8DGFvIO4OYi3U9RoHhZ1Bnc2TFCtR9irQORQ2JwXLx48S233IKk8iUWRb6nBNlPaXcKrGtRYhgOcbklW3oIv2/fvggT8sYVFFv87QcCwLtDIgtwo2xR+3yp29LJ7VMDIIuQe27qcGCg8/zzz7N5y30oi+n++wK0k4MOOmjYsGG5c0V+d9xOEBSaJRID1qxZgxFDshb9vuB4kXfuEWbMmMHGfoJwCSNYLq5LLrmkT58+8SXu4JAAhv01+4JllasMbq4+LsP9wPdzX4+fdG45c+yQhzgZSNKtt966fv16lj1OZ+cmsgvBlbtz585nn32WC40bWiKghSLMH/zgBzhC3lA13Jxzl9sN+pw//elP/LFsBIu8cO13Z7TR0MlACrkJcXPCqed5OP70pz+FjLL0oxnwJQDHvsDVyZMnw4GgPvLmtoLQkE4Gp08++WTiynuvcC64cNBcZ82ahWbMBZIsCFaVmYw/AMZRg7hqYp/W0KabywbONUsg6gtHuLkA9wXfA8f+b+tIkCS2iSEJrIeg82655RacciLRMEsntbvBVVAioJSQHnDvvfdyYeYuJATCvO6666655hoOGfXCjTdBkIV77rkHWUAUHHjJVn3HoI2GTiaWv3Q6zacQTRyhHV955RUe7rA1zbftB9z2+c9/nl815vsh6OpKMiB8Bu4XX3yRPYsNZwFHdOLr1q1btGgRThPsF+IJBsdxUGjg9NNP5zxyGTLJlmQZg0LjsoIDPTjcsczslbiQUf6oCFTHfm7uGJBmzgVAelgPwQ3NMWfOHDhwlS2JBOWwvEHjveOOO9A18SgIZcj+7QcVceGFF/bp0+fKK6/EKdVZok2VbZEHH3wQR9Q7C2eyUXQ5cjZ+InTzoiwYtKV4yznuidhugAUwffp07phYWLkvUzfuBdyJ24YNGwblmmC17gknElFwjDnfohHHcuutt/7Xf/0X9zvJglLlsh07duyCBQt2K+f4FFFzJ7Ifbr75ZgxJ4eAw2TMpOEyYNbyfRwHEySseZ5555oknnggjOJvNsnKFeO+r3HAVOULBwjFv3jzXdSG9a9asSbzoWgmSwS2OicWA04OsPffcczzHVpjwv/TSSxMnTsydFAeEz1+xz52XAC+//DKEthh1iu6OF1fOmDHj0ksv5SiSbXoQXcjn/Pnzx40bx7JRQL2XFSjcpMiFWEy4uQKIRcGtAlW+22/j0z3DZJ/YP05AsUGMSOeOHTtQsBBZHCGvqpj3B+755je/uVuak2K3AB999FGOND95OGJUobyTBMGCSy65JBd3EWCthvFQLspC4W09QeLlDzhM7n8LI05e8UAUucjaAUy3v/71r9/+9rdhxnEfnd9s802Q2DNum3GfnmAVxGmA8oAosswXQMHWXuvhDbA7nt36gXyuuuoqrou4agqAf8tVz26Eie4u7nD69u3LnjgmBYeG47XXXosoYNRyXN2Zwquwg+HK4weNGJpz6vc1fNkPCId/CweHiUDioODge+jWXTfzDRBTnHIC4huKB2IE9957L9ytaWncOJGwK6+8Ej+Eo3iJRMjooDEuRER8yv4AbhQXuo/cebtBFAgNwTY0NGAwAR9EnWDWOCiEyWm+8MILlbemkzn66KM/9alP/fznP4eShun8wAMPfP7zn2d541lubo98M4O2yeKHhoBT3MD3JwKHCW677TbEwk0ywfCTpeMThsKPy4RjRykBOFpaWu6//372xLHgcRdXAfcGcHP9fvWrX+VYALo+uDmipEBo3P+j86mtrY1VT+5yt6TLGA2op1Qq9eKLL8LR1NSkKi7KZrPsaD2QNsAO/nkmk3nppZeefvrpP/3pTz/4wQ8mTJjQq1evXKy71AmOuJ99WIbYXVQQy4MPPsjx4rj/9sAtFqC3HT58OGeQfZICYSINyD7c6CN4vwR4Avhw02WjKk5M+0GwHNqsWbO4EBAFx5gICIrDRCwY1I4aNSrxctMUANtwXPtoj5/97GenT59eV1d33333DRo0CJdQTag7bowsewz/EL8qRj0izD//+c8rV65kd3683Zy4W0DJo1i4ZLip/uEPf+AbWOPyPfSbtsM/5MBxPP3004cNG8aeCHnKlCm7CUMicP8Pi+HJJ59E+MWIomuRWOfeAfAjUjggfDju50HpR8IdCg9ZIBDjx48/55xz0DHdcsstMCC2b9++cOHCb37zm0OHDoWIQ0T4yOJSjM5or6AxYJiFHgoxwo2k7kdYkTbcw8f8vYmSAlFzmEgGx7JmzZpVq1bBH26kEJ64ysOI/aSzALjMYeknG2wM0o8jcnfttdcioqRi4QLRFAaqg9U/ihGtD6dwwHrAaBKCB9MBbRNX+R6GRRFHwI2UazZZkBiMm+EoRuCJ0CmChzLHMb+LgAO9AUrpV7/6FXuix8Yp4NopAG6efESAsBIQGvz5jTOMl2D0FyP7LGZ33HEHom5P+suDLmM0oKrivgCg6bLpUBgICnIG8WIpx2nsjyPiwqDzF7/4xerVq2fOnAl7lj1xxE/iXxUVFk3Exe8pQGr3HynuxBF2FY4TJ05kKU8wnSrfFAWXA9cFm97sGd8QOxKBg0J2+CVvwB+uTRAuK2SH10wgaxyppnNhSQPQPagjFjl4ou2z6fCDH/yAH2OjvnAPjrgtrjsIf9xdJAKnB8FOnz4dvQfcyYbfpeGi4LaDI1cW3LNnz8bQApe4L2JP+kEbQYA51y53v379zj33XA4NuoD78/ynFYmASgccC4Zw7733HtwsCd2WrpR5ri10GXBzP8L+bcV1XQgWTzOwT+xAFIDdLHwXXHDBrFmzYDpUVlayJ9JQcNStB62LE/DMM8/A8ZE9IKeK39u88MILe/funZ/B9oPwucFzqhAyqoAXaXPCcAMXHXz4nkTgMNFWt27dCgcyxZ8lTBYU7+jRo4cPH45c5LzaTYKF0A1h+YeYsQDwkWuHx6+44Uc/+tHf//73Y445BneiW4A/ayZchc/+20sBcIBI0sqVKyGQcJdmFXdKqjhSFBHgaoIPeOCBB+BGvaDcuF64KtsKfoXf5k7UKXrmAQMGwJMNOPQMcF900UUsA0nBOYKDM3XHHXcUnIWyocsYDVxzEAh0DXxasHDwUBUVnx8UCyULBOtaOHAJRwBZhL3MI1F44jY4ig3iRUSwVzg6ltr9gFyg68Sv4Jg8eTK3paTg8gdcOEgS4nryyScRCxLGV9mBBMQ3tx+ECSvhqaeeYjeiQ9RcIEmB0JCpa6+9Fm5Of7LhawqApR2SDAdqB02VRwssfoD9jz322Oeffx51x8LPFceVCLiBJ0K+SMANXYjYtZzEcFGgUlARcHA73b59+2OPPYZTrkGul/jmtoJfgbhmr7nmGnbDXMCRxWPUqFHnnXce358ULIrcp6EjqqmpQXTqSjelyxgNABLDb7zAzRXZnspj+YMocFA4ZbGI5R5X2Y1LkMh+/fo98sgjrFo6AESac6l3u3FsTWbRljhfF198MRz5gbSTuJT4FFHAjeOzzz7LdgMnT8WZW7qYFDDy0PUgWK4sRMRxJQu/5I3wEVHOS9OpcC2j6XF7jI9x7cMN2evfv/8999xz5ZVX4pRvjm9gRZIICJMFmyXw8ccf5/RoYrj/BCgfKHI4oGLr6uqoR9i11hiecMcV1CYQPn6IYkc4gwcPPuOMM+CJ0OCPIxsl8MHQjiNKFsqDlLAYnnnmmWKE34XoSpmHxKC2UHO58zwdVhj4eX717yYK8SnijSVy6tSp/MIuX+IExMloZ3ry4Sg4QH63Gz5xvHuFr+KIX6Hl9OjRg/05I3FSC+vsOPv5CWA3DBoOECG3Z+wV9+975nH16tULFizgkDkZBceyVxDjiBEjhg8fzoGD2KHpRLiW0fTyT/MdgJUTfGA3XHfddXCz/MBnt+bcThAgQo4FY82aNfwp2tIkv4g6DBT4bo33tttuwxGe7L9nH9ImkKm4Fr7whS/giFMcES+HzAlA19ezZ8+49mP5Ae0RCQ4cx1/84hc5rz06it1Oy5Uk21VZwvNsLC4AYnHvvfdiHI9LOI0bANz5Q5z2g0hxZClcunRpNptFFOy5VxA1rsaTt+Cyyy7j9OSnCm7ck+AgCUMudiDkuEAKaDzctvc0O1D+r7zyCnQDh8kpz89RO0F0gL83ERcLMsIOTVcBdXfXXXdddNFFqEeWw/wKbT8IkENDsBAYHDHi5EslSIINpJWgQBAplwyO8IFRtWTJEr7afrhOGfQGV1xxBftwU0WMcLMDFgPsBiSDH0NjNAJPADc8cWwT+CF+hVi4a4L7/ffff+utt3CJ/dnBsfNp2aM7x48gHsqwPoZwQETuv//+eGAKbcee+Qq7/bAUAkT92muvpVIpPt0/cS8JXTt58mT8loEPB8i6mVOeCKtXr96yZQubVjjFEeVQWOPBD+P0c5EClP9DDz2E8OEZmw4JNk5EhEgxSOX0sw/HoulCcK098MAD/Comk2w9cgsCLCqPPvqolpOYuEly4aAt//73v0/w8VBc1Aj/E5/4xCGHHMKnqBTEBU+Ol0/5u33cabAnXy0ArvS46gGC/e1vfwsfzjI7OPxuIg/aaPgIWA5wZBGBgoGjurp66tSprIDRMFjVxaKTIAgQwa5fv54bQL7s7gZHze0HqYV+xegZ9wNOPN/AzXg/4bQVBPvggw/GphXiQmkU8IIDksTFyAlGUEgzQIL/9re/wR9RoBBwlb9spH6UDIMHDz7qqKMQIxcLR82X2kOChaz5SLjWKioqnnzySZYfeCZbBbHUsWPx4sX8xeRSo7MED8UCuOR37tz58MMPsztBECCi+NKXvoSOjk8B9xtx7OgozjvvvGHDhqlf/MswCVeVX9uAXKFIEQsXLAJ87LHHkEG+yiF3K7TR8BGwxMRahIUVpxMnTvzsZz/LbpYbHBNsrizfCBAxIorXX3899twrfCdLNqcW6eHlkOyGg92xIxEQ1CuvvAJH3HiQgAK2UoiTlJ9+uJ955hnYCvDBkXsHWCR8QyIgzMsuu4xjxzHOhaZrAVEBUBhjx4694YYb4M5dSIjdRA6iAnOWX7zUMCgiwBUxY8YMWFQJ1gK3ULTWPn36XHDBBXF1xA0WPrgHMcIHYnDppZfyT1BNfHOs9dsKAkRQsZmCAJE12A3sg2DZgdviVJU33SKT7QSiBrGIpZZFBJ4/+clP4ICswF0kceFIEfj777/PPvsCd3KrQPK4IeFXl1xySZw2Fn044APoN0mAYGfOnIlIEUscV8HEIXALRIJ5zQS7uRYAZzAREOa1116LMPmUSyaR8OMwNR2AkovcXNFNN93EO8G3UxrzYYFkd+yYNWsWO0qKThE8lA+Xv6oHedttt2FEDkfucrvhngEKGwMh2A0Imeuao2A3n3LtoFEjSegS4ear8T1tgsPPP7Ljjjvu4MBBfizdgcQaVRkDKWSxgBRCx7BuhtwMGTKEH57BzWom7k3aD4sgiymayqZNmxDFfuSSE4D7kTxOBkbkMLdhdOMS+7AD9ySYTiZeDuntWtxQGJzBOMHI+Msvv8wOLnO+pz1R7MbIkSPHjBmTO9nV/hMMX9Mx5DeNnj173nDDDahEbhRJkR8F3BDRF154IXfe7eEGy88lFyxYsGjRIm6z6mIyoDZRp/yODOD6zW+qsRvxjh07dty4cVxNfNzt5lbCWeAeid0whuBABvn1GWSTb+CuozuQsPIoP1hQGMhNbDGwD2/bEPtAdJR3YsQhr1y5ErHvR+hZpvl+HOHjOE51dfV5553HdgP/lu9JNp0I7fXXX0fjQRSIi334UmFwUhHgkiVLkPE415x4drBP+7nooou4Q4GbjzyfoS5qugxcZThCbFCh3/jGN/I/O5cILHXQGbG0LF68WF3R5AonlUqhWKZNm5a48c1BYZw2YcIEONBIcURF47hbb4BT3IwjTzbwVTjYk+9pPfgVyJ2owLmjg4O/qcFrJvieAsLvimij4SPIlxgm32fSpEm89zDEBf4sxEnBBgqHvGbNGjhyF/YBbgPsYB+k57LLLuM1AezDgSRrFCO0Rx55hA1wnOJYQDlwR8w/5HAQIG8n95EZbz1cRCA+nTJlCqsZTjaSUXDhxOlEsBwgn2o6AC5tHLkT7927Nxv0+SQi9pCWnEuI2tratWvXQoHFdc1i3OnEEt5hxBmH5N97771xdbBnAVArVbngPoH55je/iSOC5b6RPeM7mdh99dVXw43b2Kew2sfPOaL8mmUf9E4NDQ1w8zADjvxklDFJKrluBWSIpTn/neBkuwy2prkTZPNWebcNjKRxRML45zwTwCEnBUKDTQP4tLB0ssLm1sgh4HTGjBnqYgLEXQ+iADgFQ4cOHT16NJcwR90ekGwEwiokLnBNx4DSjoeA7LjqqqtQxfmqAlWDU1R3glWzfPlyhIkAuU0hRjjY3Ym0X5jbCgoBuYbYT506tbGxEQ725KttAhWEYkQWOBfxEf4XXnhh7BOX+b7o06cPb6jDvy24C90XTU1N/FiW855s4KWMNhoKhMUajokTJ+Loqo9gqSuJgSgQJmQdEb322mvw4abYJtByJk2axE8ocMotJ9mkstKNd3qGm0umrSC//HMOp76+fsGCBXyp/SBABMsJQyPHKbj88ss58XAjdjgKLpk4y4MGDWKHpoPhukNFoE5Roccee+zBBx/MegU1zvWLU25Q9IMkmDdvHkeRL11AXexGoBC4kKdPn84+GEdxybQV1TRz/UBcqujBzjnnnFGjRvHLU6hEeO6nnPFDxI4RHdc7w0OmREDUSOStt97Kp/mxlD3aaCgQSCTkEo7zzz+fHZChZDsLtBYAcQSIDuEXJpowGrj1xi0wWdCA0UHwBzI4hVwgbYIziwLEEQEinCeffDJ3LTmQMIDSgF6B4+STT0Z0ccHCAU++s63wD3E87LDD2IGQ1RVNB8H9eL4E8nt38EGNc3XE1YRjIvBiIzhwRBQxfLVT6JTYueWuWrXq1Vdf5XbEiyLbCn6In8fuOC+e533qU5+CgxU/2/r7AYEgSVdeeWV1dTWqBl1KKpUqLEl7BRKFYN99992lS5fiNEGJKn0KUUIawPYBi+b48eP58QTr5qTgBoMjx5XfnNrEhAkTOJ0c
YH5TbD+cNrTGp556irMfd9BtBQnDb3HkHuGRRx5h/6TgEgCIAp1I3759Y6WCq+zPd8LNjraCH6KTYgf7aDoMlDlXJU/7Qc3wR8j4KoAnnyZYO+vWrUOwsczDzfDV7gO33N/85je8nwp3CwWXA36IquTujt29e/e+5ppr0Gw5TO5q9gNu407v8ssvZx/eiZ/diYDwEeBPf/pTuD8yPeWENhoKh4UGjjFjxrANW3Aj2RcIH50Rmgrc3HjYv/XgtyNHjjz66KNjseammBQIFrY/N9H4A9YFlAN+gqDQyLnzRQvHkIUvJQLC5x6HixR2ySc/+Un4I9kAPrgE4INksKNNcLJBc3Mz/7yAytIUTFz+gDUWxPKkk07iRxU4RaXwPYXJ575Yvnw5jogRsXCNc3SdSIK5az0oAbSvadOmwY0WBDfXQluJ65GLMS5SfrmdhxNx4HDguFe4EBDa1VdfHQeVYNXEbZw7PU5P3MeWN7pfKxDIHySGRfzEE08srIXsh1jo4cAxnU5z99RW0MwgyvG3FXhyj5tiIiBYNF2kEGHOmTMn59t2EALKkPOL0+eee662tpYvJQJC5iMqjtPMs51INuBIARsu7G4THD7CYcGIA9R0DChwwLWAGmS9BeE/+eSTuTpYYbCDb0uEeIt3FhuufXWle4GM//nPf96+fTtnH0dUQQHlzJUVtyY4AMr2q1/9KnziauUb2IbYK7iTgxo/fjxvKQ03X0oEJACxIzENDQ1/+tOf8mWg7NFGQ4Fw22DZHTx4MMsonyZF3GYgnZlMhvd3yl1rCxDleD9pCDfSWVg4e4VTiCgQJn/Cp7DGmf8rBPjSSy8hKC7kROCgOBa4e/Tocckll6DW1MUcnBE40BewT+vh8JFmXv+FoAouCk074XpEq0EVjBo1Ckf4wB/VwY4EO3cE3tLSwsHGwDPn6jZA/u+99144WOZZ+Atov3FlAa4vVNZBBx103HHHoVXG1YpLuzXe3eAqxs9x5+TJk5GS/d/fVhAs9xKI6Le//S0PxnYTg3IlsU65u8HyAVmEBJ9wwglwsyiriwmA8GMRhHRyIymgETKwtdHq4EA4SGeCnSbgtOG4du3aDRs2IPzchbaDQJBrHGfOnMllm7vQbhAUAkTg3OnwBtu7lQPiZQfuYUdb2S3NcQ1qOgauwbgeUR1Dhw6NazluPgnKFZg/fz47UN0sY3FEnUVcAokTi3S+DkZ5rlixYu7cublzBdLQnnLmdgoHjrw9Q9wquXg/shOLk3rDDTcgkIIb9V5B4JwAhPzqq6+i64O7eMVeUmijoUBYPriDqK6u7gBLs7DA419dccUVOCK1kPUEjW6ExlHw8dFHHy245XAI+Pnbb7+9cuXKwvK7L7gLQ8cBCwwh80eqko1CU4KceuqpqHfUNWDTFiRY7xwgYHd87FyKJ9gcMo6xzubBzO9+97t4bMMlgGIvzHjiX/E4Hm7ExZvNtBUkA+Dnw4cPP/744xHgR9oZbYLlCg5Ecdttt+EI+FJ5o42GdhELzcc//vFkJTIpkEJu1ZMmTWJzAbKeu5YE3Edw3hHL7NmzOUa+2ia4MJE8/qRn7JMgnLA+ffqcf/75cCQevqbUgDXPXXl8hKwmWO8IauvWrXBw+Ny4km1iJQVrdOQa+eUsozzh+Otf/8puvoojKKwc8PM4FoQwefLkkSNH8qUC4ED+4z/+A+7C+qW9kl8CgHeniDNe3mijob1AbiArFRUVCUrknsTSWTBoeEceeWTchyYFdxlsOqBx5q8lbiu8mAj9xcMPPwwHgk02qYBbNQYuyc5VakoW/lRBLEiQLp5q4tP2A5n/8MMPcWQtwtqOj51F4q0mHwSOzLIDWUbDx+nMmTPXr1/PZcuXcOS21lbQdSBMBMU/h6OwaQZOCffJSM9ll12WbKVw9tGNwIGQa2tr77//fi6ZskcbDe0FogOGDBmCY2HKsthwOwRnnHEGtyIklS+1HwTIrZHVMJpNwXs/8yOe7du3z5kzh0NLULWjbaMcuFWjB8EpF4WmOwARBRB7FoAE5QpC1dzczE2AQRSQrtxJ2UGdneo9uPkg+8j7Pffcgyxz2cKHs48j39km8CuEwIYd6NWr15QpU3LX2gKqGOlBUHDjyJ/uy6+m9oPkIZ2O43DGp02bVkB+uyLaaGgvLDrDhg2Do3h6qJ3iiGYDrrnmGsg3Wg6SmrvQbrgdInk8TwDHrFmz1JW2gSRx23vmmWcQJoqUj3w1EVA7XA6nnXYaooMjd0FTvkCoWH+wdEE+Ue8JyhWEimfvED43UshtO1trOylq7HE22cQHy5cvf/rpp7kfANy38D0F9DMIP+5FEebFF18MnwLCAfg5fsj9EvjKV77CMpAIXMs48g49kLHZs2evW7eOr5Y32mhoFxBKiA4kBqMNdEZFba4FEzfCsWPHjhw5MsGWAxAa4HLAKVoRf5qyrXALhANtDwHilANMCg4NRYEBR48ePbhD4UuaMgYVzSYCmidqHMTNISnihh9LVOwoP7iRMlySf/rTn7gHYE+4ceQy4WJpE3H4cCCoG2+8sbBwGPwQxg2PQM4+++w+ffrkLrQbzjL3VDjlorjjjjvUxTJHGw0Fkt8vQGKgh3Aswc4CSUIDhgPJQ8vhz74ly279yMaNG1euXJk7byNohPzhKyQbQRXcWewLmHeXXnopDz05ltwFTfkybNgwiGgxxAkg5Ewmww4IFRwQqmJEVDqgJNnBHcs999wTNyUUAucdeho+7NkmuAwRCBzHH3/8UUcdVVhhxnWBI9o7HEhtMXo/joLDnzp1KnuWN9poaBcs0GgqvOkYt6IiUVjjwa9YrJE2tPbrr78ebiRYXcwRh1xA+vFbbp/s5mO8rIGjbiW4ec6cOfX19XF62vTz/YOgECz6sssuuwynKAH24auaMobbJojFKcF6h/BDJ7Gbm08pCFXx0oAyRDbjkpw5cyZvUcCgNOJLBYPEcwd15ZVXckYKCJND4B/iiHDQ+/F+D3wprrWkygrho++677774v4Q8TJ8WjZoo6FAIGosEDyCGThwIGvl3OUi0E7hgygjhUcccQTvkQefPVtLAelHqjgcVRiUQgTy8ssv82kcRdyQ9gUX49NPPw03boa7AAtm/yDMSZMm9ezZM84mJ1hTxkCW1q9fH4sfC1XZ13vxMohGxO2ai/Tuu+9O/IUshMYt9Atf+ALc3BvwpcLg5MFKGD16dNz7YfzAdkOyiZ8+fTobJZwFTnmyUXQ62mhoF7E0V1ZWlqZkIFWcSIgyWgs6zQsvvHBPUW5ns4zhcGA0xG5uotyQ9gP35o8++iifIm38wwRBgJdeeikciIttFE6hpoyB4MFoyJ3sksbE7dHuA3Qttxoc165d++STT8YrDZMCtYNag32fTqfhALkLbYeTihC43mElfO5zn4v9kRcckxWGWbNmrVixAo78YMusn9FGQ3uBcEAioYRwbI9875+CLRLIK6/vRQicPN5BmS/RHbsCx2ns03rwk/y0wQ2fHTt2zJ07l+NFpHxDPL7fFytXrly9erVKBSUjP9hEQLD8zje6OW7S3JVoyhvIIYSQhb+VotilSbzh5AO9i/DRgtCaHnnkkWQ1LsN96fXXX89da863IJBIDgG1DwdS/qUvfYn9WR5A4p3A73//+7iIEHichrJBGw2FA2lgWxXyBzd7liDxJ5TghmPChAl9+/blS3HKcZVh/9bDP+FAuB3CDQc6FMTLN/A9cSvdK2hXTz31FO6J70+8SDF26d27NwK3bRvRgVKuNU2CcHWztEMV6XpvD3EL+vWvf40jfPbftNsE1w7aKex7RISQC7PwuA8BCI3dXPsHHnggL67klIP4zqSYOnUqwudXUuOo1ZUyQRsNBbKbNOAU7lgQEwdSmHO1HaSKmyI74MObKCPN8GlPyAxCyG8VXAjx12vQ5vkqJ4A99wT3wM7gGzhJ7U9YPght8uTJOAKYeoiO3bnLmjJl+/bt6L65oiFdkPnYgC5XOkaq582bt2rVKjiS7fdQO0j/ddddhzqCAyEXlh38iq0NOAD3dQCp/e53vxsbIrjEvVNSQNh27Njx4IMPopOJu74yk7cky6tbAfnDMRa4Uu6JkEhuinAgkXB/5jOfYesBcOOEg4+FwXmPSwCF8+67777//vtw82ojbqX7aZ9bt259++234UAyOCVcwkmBMOP9aDl8HJONQlOCLF682PO8RIRcA1jvojzvvvtuflQB9tOu2wq3ymuuuYZriqPj3qOtoIuLf4jQEA6A46yzzuJpAIDEI4oEpQLChljuuusuFA73seXXyWijoUAgECwNfIx1cGnCqQVoHnCff/75VVVVnGZu9uxQ97YNBIgfcsgcAtoMjmiuMALgDzeOcXHti9dff725uRmB4OccGjz5mAinnnpq3759kSokEon5SCNGUx7wo+Xcya52quu9YFB0aDv19fU8mGbP/TftNoHmOW7cuKOPPprdUL3ce/DV1hMvcuROKZ/+/ftfccUVkIqYPe8pGO6+5syZs3btWgSLwOGDY+5yWaAbT+Fw1xN3QAlK3l5pp+QhnXFS4bjkkkvym3rBgce5jh0cLAKMX4XgwBEp34MjO1hzs5v3kYSbfw5HfH9b4bkNzixHjWP83gSO+Q5N2RBLTnwEc+fOjX0gBvxkKl/y288xxxyTc+XF27mw2LeH2CDYLUc4RduZOnUq+2PI3p4sx+nk9sht9tprr1V+/5yeLCAK7gTAbkWBoMDll1+OY/tLaU8gWggWab7tttvgSFbSSoScFtGUPpDynCsJJk2axE0UrYubJZ8mBQKcN28eh8yNE10AO3BkB8cIN5oWfx4zvw8quL3FtghCjmO/4IIL+BKfInAGbk15wDWLI9cyKheOdevWQcxY0li0YpFIBDSf+HXrZENuD5ye9sBKN24vMTjNZrN33XUXosA9XqHvW3KwCITNBUQEB6oMYfJbkbBa4MYNIMFSRVDg3HPP7devH6Lj8BMcQiBwCBtCnj59Oj+qgCei4KvlQZJ6QtOFuOSSS3r27AmZRuOEiLOg564lxLZt22bPno1WBHfcKQBuQjjyJbBw4cLt27fjlPsg3MmNLb6h9eAnu4WPoMaOHXvIIYewmy/BweBUUwZwdfNbvpAfPoXjjTfeiEWO5YHdSYHmg3a0W/iIUV3s2nCbZTdninn99dd5uVI8G8EZLwD8MK4ONlCgzgcMGABPRI3w4YAnIuV7EgFhYnBy1VVXwZ1KpXBE1OpKAiC1HFpDQ8Nf/vKX2JMd5YHuNLsGcdNKkFNOOQVHKE5uljy2SJaZM2eyI04/RwcHH7mBPfjggzhlH9yguibqJtinTXBEbA1wIIji6quv5ksIkD35lB2asoHf8mVlhrresmULqzeua5IwJVEJVj0CHD58eL71CZ/8044nkdwhELYY4ECT4UwBOPgb0LiKI27g+QD1ozbAP+HA2Yf54he/mM1mETJAyIiRY89dTgKEhnj/7d/+DW7ExZ5Jwdnht9ynTp3Kp7vlsaujjYZuCjrWT33qU5BmtB/Adn3uWhJwO589ezYHyxYJugAcER3HCzd3TM8//zx7UleR90yh/Y0N4SBS/t5EDEeR4PBC0+mgTrlCcWQ1Bsebb74J8WNZAixO8WkiIDSMjOFgeeZjGRCXEnLEzZbbLAbQMBpwyqXN/Qa34rbCUfARUaDWBg8efMEFF/DoH3EhRoAb+J5E4GAR4OGHH76btZcInFTXdZEd9H78YY7EY+lctNHQNUiw2TCQ6cmTJ8PB3Ry6gMJa/r7gYBcuXLhhwwa0Uj5lAwJ5QSvCkfudZcuWLV26lK0K3BZ3RnwnjgWAGHHknx911FHDhg1DyHzKDRinHKOmbIDMQHi4flHXOIUxym6uehCLQVLs+Zl1uPNPO54EM4iMcHmiQXGb5W/RsT/gAuc22yYQFAeCI2oK4aNz+PznP88+rNcpAhUpfHI/azccLEf69a9/ndMAz9zldsMBwsF93Z133okjd0dlgzYauimQ4549e7LdwMQdblJw++RdnrjlQ08j3rgL4Lb69NNPo4FxG4MPwK/4lE2H9oC4rrnmGnawD0DgHHWZNebuDNcvBAY1i3EejpDn+Ptn6hYC/slW+rhx49iBkJEGHBn27OpwqaLEYkV42223wcFqHiWMnHKu6e62sOdPbNvmb/DypdgQiVtrInDtI0A4+B2KZOWBQ4470pkzZyKKZPvVTkcbDd0UVsyXXHIJ3NwmWdzVxQRAaNwgH374YcTFPQu3H46O78HxpZdeYk8+xT0ADk4h3ddGEA5+CweHw10D+3AGYbvgnvy2renqoEKV4BCO46ByYa2uXLmShYormt3JMmLECBwRKY5x8+HTsoHLDY1xyZIlixYtgps1OkpVlTdB97UFlBUPIXDk4coRRxxx2GGH8SWcArhxCTcUEP6+QLAIjWM86KCDzjjjDJac3OV2g6DYooIbUaxYsWLGjBkJhl8K6E6zy5Bslwc5RmuMN0lMHG4naD+zZ89mnz1BjtC6nnrqKRxxPwN/PnLDKwAOlt3HHHPMkCFDOEDAPRGT79aUAfnCg8qdPn16fMpKDm4+LYw9hQeSxk++cAqR44kxOJJtqgWQVAI4m1xoyN3tt9+eX4AFt1CGg+KqQVA33ngj+8RliyMXabLlidA4CkQa71fNl9oPEowcxZKAI3+KAg7OHR9xiR1dkSSNrGSrdq9AA51++um5k1ICw+WJEyfmTooAyvbFF18sRhSXXHLJE088AQOisGH9R4L2M2vWrFNPPZUbKoDIoc3A33VdZIo/hJE4GG4i/O9+97s//elPc14dQlElAWKA0kMT2I8ptn9uvvnmW265JXdSHG666SbEkjvpKFAscf8D944dO/LXJyYI2wex++GHH+Z9wxARQBriZOyVYncUAOGjWe0/Ga2Bs8MqEJ1DJpM5+OCD6+vrc5fbR1yM7ED/8+Uvf7lfv36IlG8oEsiR53n8dgPytXnz5rvuuivZrg/BsiXEjnQ6vXDhwsMOO4wNBXjCEXeGXRKS9ITIhVhM0FfmIisxCu7EWwlkHao3F1lCoKlAfB988EGEDyFufy+zG3GA3/jGN3JRKnMB5E52LTgoUtToiRYsWJCLqaMoqiRwvmA05CJrO9DoHFTxQBS5yDoQ9M44wkzk0x//+MdISeJyFYP2wv0+9AEi5dhjdjvNp9gdBYDRkN/ECgOdA47ICDsQIL80kSCoHf4GBPQojlyeHUB+RBx1McjPFGxorhEuzJj9yEkp05Xtne4EqirnSg40WnDSSSfhCJlmH76UFCoGMnfg5iywT3yKgReOicNRDB069KijjuKsacob1Di6YCghVPfq1av/7//+D/11gq1GiS29kcGnCBkRIYqxY8ciUo6LwdV8tdTxcBraCXKKcJCROC+33norOxIBhYnw+csgAD6JJLs1cMVxpJAZHDG6UFcSAMGykHC3w3Hdd999nLv4El+Ny7ZroY2Gbgr3CHAMGTKEOz74sGQnAhoPBwg++OCDNWvW5C7sep4HFi1axO8xw82X2g9nClGgI7jgggu6aLPUtBXurDGSQ43/53/+Z0NDQ4JCBZTA0tAQbpZtRHfqqafiFJGqW8gfwMEqoavD7RQ5ymazaKqLFy/m3CUL6osLkBVqsYljQdYQNYA7rsH2w0KCWDh8+KAYYcU+88wzmUyGBYPjxQ1A/aiLobvUrkHizRUBQmQh31Cu1157bbxNejFwXXfWrFlxFuAAiO6xxx5DGmL/RIj7a3QEU6ZMwSkiij015QoECTIMYX7iiScgV3Ak2yNz62BZ5ZDRdo4//vj4Un50yYp0W0kqdjbC4EilUrfffjsaUbJFyvobxYgEo74QVwfYDWz2ISNcSshUspHGwoBg424Hp3fddVc6ncbVOAE4dq6cFIw2GrovEFkW8UmTJsGdbI8Qh8Zt8vHHH8cxv6mgi58xYwYSkHjL4RhHjhw5btw4DjzZrGlKEFS0bds1NTWwFFkDwTNBfQAFgChYnPgIxo4diyM3otiznIgnIGfOnJmscuVg4UBloQC5vjrAuEeOcOTYuU6hxbkGEwFhIkc4snFAEqME48knn/zwww/ZB0fOewfktxhoo6FbAwmG4A4fPvzoo4+GHLNAJwsHy1s8xcBzy5YtCxYsQOyJtxxurhdddBFCRtQdM4LRdC6QqPr6+rPOOqu2tpYlCn03S0IisF7Jl1WEf9ppp3HvH7cdPi0POLPI1/33349SRWEm2D8gKITP5gJCRmHmLhQZno5iN9LAFZdfre2Ec7Rnh4OIHnroIThwA/KLI+JloepyaKOhy5Bgi43hdguB5r3YklWuSDDgBllXVxc/oeCG+sILL6i7kodjufbaa5G1/D5C04WI+3F2xKeslfkYwxL1ta99jbce4pvRd7MkJALCjENjx7Bhw0aMGMHu3S7Fp51FIglglYayvffeexEg2K3Y2wMHFVcrzzQkGP5+4LgAR5dspJyj2FpF4Bw+uta7776b3Vywcd67HNpo6DKwwCVFvvjieN5556VSqbg5JUKcYI7lb3/7G7cl7tEee+wxdsQ+SYHQhg8fPm7cOCTAVsvpu2777LZAZrjWWHgAi9NuqgsShdsaGhquvvpqjORwiWWJP3eZrFwhIk4MO04++WT2L0Hyi6gwkEcAx6pVq/gVJ4SpZ+wKBoK6adOmp556ylV7nOd8uybaaOimsOCiX0BfgOMoRYKdQtzXA+7Cnn32WQ4f7Qc+Tz/9dNx42t/H5YNgL774Yjg4WOQuPzGarkKsodmNao3lBG6WIkgULIaJEyc+8MADnufxVdyMrpndScGii3jjVPEOxOpiGRI3md/+9rdwo6hhf7PRrykAyA+GZHfddRebszwNlmy/12HozrRrUAzxQpjcF+OITvC8887jDjoROCjuVRERHIsXL44/FMtbR8fRxT1U+0HjRNf2hS98gXOHxmklvZBe0wGgyrjWdpMNVC5kCdWKisYNGAQPHz58/vz5cMMf4J5Y9mIBaz+IFylhS4V9Lr300gTDT5A4he0BWUN+cZw6dSpnEzYZW06aAmB767nnnlu1ahUqCCUZi2uXQxsN3RR0BCyy3MXgeOWVVybS3cQgfATIR5wixhdffJEvvfDCC9wB8ZF7pURA4+zdu/eRRx7Jucs/aroQqDJIRSycrK3hybYCDMHa2topU6ZMnDixoaGBf8I38E/YUkzQGAUspSxL48ePr66uTjb8koKzyUsg4UCxs82kLmraDMoTwPCaNm0au1GYCfZ7HYk2GroGELKcKyG4v4PUsuCiUxg3bhwGbepiYqDj5k4cR9u2Z8yYgaaCvMycOTO+gR1JgXxNmjQJRw4Z+Up2oYamY0D1oe5Y7CGi7GZx3bFjx49+9KNRo0ZBpfHNDH/cEg5YDIlXOrcXHBEFUnLZZZfhmLj0JgIXWiLcfffdaLZxyXMhaAqDRfqBBx5g4YS7i5anFoJuDaQWsstudAr8peyk4C4VUXAvBit79uzZiG7BggVr166F9cCrFHEpTkP7QYA8b8w9HXygQvQIqUvD8pPJZDZu3Pid73wH5sJNN92EETALWKy5eR0DbuZOORaAROA0sFwhxquuugoO9ixXVq9ePW/ePBQm8gvQjhIsz+4GChBHdEQrV6589tlnu3SPpI2Gbkrc/mMHtPuVV17J7vYT96cInxsMwm9oaIDdMHfuXHjiFGYEboPFkGAT6tWr10UXXYTA4eY0IK4EjRJNx4C6Y8mE8CxevPgXv/jF+PHjhwwZcuuttzY2NsIfVYxLXMU4AviwZ+xIsN4hohwFgoVt3adPn/K2RJHZX/7yl5xfHOED64EdmsJAkeKIMrz77rshmShY9u9yaCHoMrDMJUXc/vM7gmOPPXbYsGGJdA17NgnWAU899dQf//hHtBmcIkeAu2O+p03wr/J/C3e8PK3gYDXtBFUf63t27AfcA9iBm9k9f/78WbNm/fSnP500aVK/fv3Gjh37ne9858033+QKZW0dR8FHAB/
2jB3J6nWOAq2DbWs44MOXSo02ST6XFeclP0ePP/44h4Mb2FFAfrkz4Z+3KVUdDyePE4wjO5ICgXPpoTD/9re/rVixosRLYz8k+ViuA0oB49TTTz89d1JKFPsz+SjbF198sahRMDfccANGGDz6R7NpT3+xV8aMGbN8+fJMJpM7V8QtqvXEacMP2QRh/8cee2zy5Mnw5Euc+I6kqJLAmUITKPgLyzfffPMtt9ySOykCSOH48eO5BOCGFHHN7qsLxj2rFZy1RYsW7dixA/4sgXzEJb4TN3BonQISgzQMGjRo7dq1GHbzWktOW+spdkcBED76irYmjEE74pY1c+bMyy67DA7kGv4Fm19ca3BwsPlHvqFbEZfGTTfdxN/L3le7KGmoFSZELsRigr4yF1mJUXAn3kogbRh75SIrJgsXLsxFqeCuJ0HJ5j4IweaHybEUAIcWB9WrV69sNotcoDXyEaC/i5/LdgBFlQQuKBgNucjaDnorDqqocL3E7L9+4+qLf8X34wgfHPmG/QdSbDgNOH7/+9/nkoRcsZi1iWJ3FABGQ5sSploJEZ/iOGnSJASF8o9rB+VfWBXY6nMPMXGApUa+0LLgFZbffcEBArgPO+ww7qm6IiVaf5rdQFXlXEVm7Nixffr0QcNm4eaGlGDsPGRB4Oib2KG82wx+iLRxaAgKp+ib0NPFS+iRZngC5CW/O9AUFVYJqBcueT7dj/zgNtQXRu24k2sTlcV1hyN82A1/DqqzYKGCVfqtb32LTzlVJch+SntP+GbkBXD547hq1aoZM2ao67mMo/BxZ5tCZlCz3q4v6PKLGIAvlRQsfpw2HJHrwvK7LxAmBwhw+uGHH/7973/nFbtdDm00aP4FyPT555/PDnTfEGvuxPlq++FmyT1RTAHh4yccCBsEaPPomz796U/DH+64Y0q88Wv2Dwqca4R7XpBfHXvClyBmuBMO7rvhyK+yWJnxaafAubjhhhvS6XR8yonv0uyWCxQ71Py0adPgho6PyzyuHT5tPahZhM8/5wk/hFlAOMWGBRXJ4+4OcBXnLrcbBJhz7eqy7r77bhQ1+3QttNHQNUhQfPcPIrriiiu4kXNDSraRxxmBA3BbKiB8buFwxP1anz59zjnnnDhMONg/dmg6ht20O6Qov8fcDZY01CZAZxqfqos0TuXq42Ps3/EgCz169Pja176WSqU4g/DZLaclQgECzxnh8ge8AQascBwdx4mLnWunrXDtszJmNVlYOMWGs4migCN+GzxB4mLk0n7yySe3bdvGPl2LTmuEmtIEDfvcc8+FAua5RLQctPME208cFCICsZsdrWe3JKEdTpgwYU/LnRuqths6jLioUUEo/I8seb4BNwPur2PTAfDYlN2gADlJCkR95513ol3AzSlEyuHgq12X3dogcgRltmrVqrjiYDpwdbSmNveEGyCCZU2JCp0yZQriKkF4kQFSmMlkxowZA2sJpyoTyRCHhmJEsaBA+GPZXQ5tNGj+Be4KL7zwQu4s0HLQinLXkgDhx+CUe6LCGif3RxwO4KVb3JvDEYcZayBNB8DFzlUDd1wL+wI3cH3xEZWFzpTdHAjA6UeGU2xOP/30a665Bg5Wfpy2MhAtLlg0eaoq5b733nvVFYJLHkfcgMzyDW0Cv4Ipz4WGQHBE36KulBZIIeoUfR0SifHSFVdckfg3z7gk2YFigfu2227jS10LbTR0GVjgOgAI9OWXXw4HWhFaTtx3JwIaTAxOC+uJAEqDGx5+zimcPHkyjnFq4+JKNv2a1oCqwbGVNcu35d/Mbg4kPs13dACQH8DC07t37+nTp7P1HIsTElOyohUL/0eCLCAjnBf8au3atbwEEj75R9b6hcGaGA5UaK9evZLddjYpuCph33CWP/OZz+xZhrHPnjOarYQDZ+BevXr13Llzs9ksTuMmE9+TX+bxVXbEp3yMHfEpyL8UB8UyzJ4Fo/vTLkM7a7qVQBzRfi644IIBAwawG8fW90EdBicJZcJjoEmTJqFn75gi0pQxLFc4QpYARAsaAiPCQYMGsaqIZQz3tEeVFpU4ka0BGUE28RPP8+677z724UvtB82TC4qL9NJLL81dKDE4y0ghOw444IDjjz9eXfknuMrWT4KTr3fddRevkol7Wk4A3BwXA0/UDo64jW+GZ2Nj48yZM2+55ZZvfvObGDLB8f3vf3/evHkqDNpMnR24E0FxmlmG2bNwUBBJkQuxmOh9GjoAiBeO11xzDctWwWZ1sUHL4bShSUybNo07vk5H79PQ1eEeGUXNjq997Wu5stu1h0F7KMF9GvIZOXJkLpTkiJUfypM78BJpqrsRp4odt956K6cZ5GvZfF2eCPwVFQYGgeu67OZkwIdPAT8yhmP+/Pn8NDYfJIzT2atXr5tvvrm+vh534ue7hZMfYGHomYauAaoq5yo+aCSI7owzzuBIYUPAhy+VFEhenLbzzjsPDYataY2mYFj42YHe9rrrrrvzzjtxCk+cxsoDbnaUIJz+NgFthOOcOXNWrlwJR4J6EcUILcXuoUOHnnzyyXAUkMJiEycJNcuVi7E7yoFPcRVVz7WP7MRi0H5QPvfccw8c3Hfh1LZtTgyXG3xwRBpwijESov7qV7963HHHzZgxgy8x8GdrAJ4wF2A0DBky5KWXXsIpX+KbE0l8KSoDTecCqQIXX3wx3I7j4FiCjZxBOpE2WAwDBw7EaclOimi6Cqwh0MOie/3CF74wdepUnMITkpbfR+e7uzTIGo5QVDjyEkg0IuSdriUHlx66FH4lAeQulAzU5f3rqs+RI0ceeeSROOW6zk9zgulHRL/73e9Q4Nx35Q974MO1gyPSgFQh3i9+8Yu/+c1v2L9nz5433HADLAP4u67b2Nj4yCOPTJgwgRPc0NBw1lln3X333XCzD37FsxH884IpE9Eve1DTOVeR4f4Cstu7d280ch6CJNhIkoJbOPOZz3wGPon3dJpuCPfd6FWnTJnyhz/8gT25z2XiDheCx45So019BWcN7X3Hjh0PPvggu/Pz205QXAiN1fD111+PI5KH09zl0oM7Fi6Bq6++Gm7OAk7hTrwfRoArVqyYO3cud19sKMATR5zmVwTq5Vvf+tZdd93FIjp+/Hj88Pbbb4eVgITBM5VKXXbZZbNmzXr44Yf79euHexDmv//7v8+fP18FkBNdeLazfhMTDk15wO2Zj/w+Qmm2cLSTOGHnnnsujjjVdoOmnfBQDxYDhmhx3wphA+yO9Qd3wWUAMgKV88ADD3De2YcdiQAViJAPOeSQMWPGsE9cmKUDJ4ltAnbjePnll8dGJNd74kYDxzV9+vS4++KIcORawA0c6bx58/gVTRQmDIU5c+b0798fl3AngGP06NHwv/POO9FvP//883379oU/wuRX4RAaosBvceRIC0YbDZq9ABGEkEHaIF6lqYm5PSCdl1xyCRoPJzI2IzSawoBETZs2DeM5ONgHDQFukN8QcFoewoYGjqaEPEIhIVNw5y4kBMJE4Aj2P/7jP+Lw4eCrpQOSxKoUtYxEsnvYsGHQxGw3tFPR7gvEC+699976+vpYojgu+PMpHFD2v/nNb9jdp0+fJ554gsUSPrgZDrBs2bKXX375G9/4BvrtY4899nvf+x7uwQ0rV6687777kCncg7zEPywYbTR0GdpZ022C23mPHj0mTZpUmp0jtwc0GBgNaOecyCI1bE1Xh5fmgD0bEXxYk4HevXujO/7c5z4Xqw0cY/nvQlbCntnk9gJ2ayO4E5fmzp27YcMGXEq8k0GYzKWXXorA8w2vUoPzzrUMN59OmTIFCpvlAUeUVbJigFgQMo5Tp06N6wiwJx9x2tjY+Nhjj7E/zIKePXtyYmzbHjt27Isvvjhr1qy7776bn0rMmDFj1apV3/zmN0eMGIGfA0g1lzznAo72oI2GLgPqO+cqJhwLNxKAph6r5BIE6fzEJz6B5HF74wam0cRAQgDv7gcHizfLcyzVEB5cOvroo+fMmXPeeeehI4YPyxK3gvzevEvA2cwHGcy5dsH38MD6rrvuYtXIqmXPmwuGg0LZDhkyBA6UeSnbDXty0UUXIQssAHxE+hPsZ1j2LMu6/fbbuaxY9kC+1L3zzjs4RenhnquvvpqThKPneX369Jk4ceKECROuv/76I488kjvDjRs34lcXX3yxkt/o9ddfj0sep/khF4A2GjT/ArcHCBY7+B2K0mznSOG4ceMOO+yw3LlGswfoHyHMcMS9MBzc7/OR+frXv75gwQIM2thiiLtvOHCVT8sALgoG+cIRuqSmpuaRRx5hT8AKKXfSbhAUNOJXv/rVOFjEm5+MEmfkyJHxUgyA4sKRiy4RWLSg+zds2DBr1izIZL6wcVmB1157Dae4ijIcMWIE3PFta9asuVnx7W9/++WXX+a++qD/v727CdWq2uM43p0IvhR5BMPSFBroJLLEiUGmEiT2QjQQqcC3oJHJoWmZNpMcCOrAIF/QoURKI4vyBQeChNKsNM9xFESUL5D3Tu7vPL+H/113H6/37/Os87zI9zPYrL32ftb+r7XXXvv/HF/OU0/pU2+99ZZn72+//aZKla28RAcekofhoacZ0C71hC+n7eOPP66V1JWDRuEp6VYhnrQejxKGglZJbWO5j7nt7YoVK3788Ud9z9NXbdd4Lml19gdVIyoMi3tGG71odErb48eP37171yOjbcWMQdSgBtb/EaQGVm9HbR3DUNDasnHjxgjYg1ZxiNSU+K8a+K9DRmU5D2/duuU/Ylu1apVCUhhxzvj4+M6dO3ft2vX555/7r19s3rx50aJFKug08211g9rVthskDWjSrIrpJZqCrh8ojvDNN9/Uw+AnTWvTEC1G6A0vlyo4J/B/SOB58swzzxw5cuTcuXPPPvusdr3g+pA+ooLLURhq7oWo7Oc66r/88ks9QXHIla2DFaip119/ffbs2f4TIo2/LuE7MhQ0Mm+//bYHRNvqkXvt8o8Hjh07dvPmzfgKZL70jBkz/K/fr127phqJc3Ro2bJlbmf+/PmHDx/2/xblD0rrbk9Q2fG73DGShuEQM6BnNLE0EbUdzF8wo9n//PPPO6E2PzZASRNYy6sfH80QvbpUfu655/St7pdfftmwYYPqI0X2VlMrPhI/ftB2WNx/rVBfJDp4+fLln376SS8q9drdVL0LVajZ9evXa9j9RdkvrXjhDYUnn3xSaWUMiwoV49fIlwN+8OBBN+6t75QKWuhU1gS+ceOGajwt9UGN5/Lly0+fPv3YY4+p5vr16/7BsMd5bGxM54jKsTxGTceG6eah9zRBFyxYoEy2vT9I/KuK9QD4CYkCEPyDX6+Sjz766HvvvXfmzJlLly69++67PqqtX5k6R+uytj7Z67hPeDjmVbyZ3EFRx/fs2eO+x0ulbvI9MjLy6quvxr9e8StwiMbTr+pNmzbFoKmmYvxqNmadbseBAwfaBwqqVyqgqeiJ+s033ygk301/cPbs2bt37/ZP0UZHR3WOx/mrr77SaaIsWbsquL5LJA24B00vzUVtVVbhnXfecf3gUFRvvPGG1zs9CX6MqzwSeJjoO5m+pSlFOHny5O+//3706NEVK1Zonmja6Ki2Wogbr0lPe1N58glDKrrsgvp1586dU6dOadfdbJ3V/uFKLevWrZszZ46HNH5sM0TPqYfLS01Mg4rxe2R8C9Tsr7/+ev78eV3LC5rqfd2lS5fOmzevFcs/lB+4oI+ICjpn69atixcvVvns2bN79+5V/djY2Ndff60atfPKK6/o/rrslrtR/+YpMo+ph1i7VagpNRsdVkHj4nK/KIAyHve6HW4Nai1mpyeHyz1QXkuPuv9PMSn/3Df+eLgvlDs//fTTMSVUMwhTQsoXjEOtwjPB08Bdjrn3QPTx2KpNF1wzUBxVUE1E66GIc2Kd8a69/PLL27dvP3To0Pj4+M8//3zkyJHXXnvNZ/rjoayc3L625Q2tJWKIa9Wi1jQxVNBUEacC5YRRpcvq14kTJ/766y/t+rNdUjuT+6Wl41+t3+ms62r10DbOGSILFy584YUXPJiKX71o9bgCN+hb45Hxf0UqvlM6x0e3bNmiGjl37pz/1oIpKp+8f/9+n/DJJ5/cunXLP4jVrrbbtm3TOSqoqWi5c62rVOAB9SiIn7S6z5sa96+H1mvMF41C7zViUGDR91rK0dMb2n2fauWQ6p66oMe+/O3ynn8yFetp0p49exSYngFtFacL/eWh++6776Zi8osmmOfY6tWr/9n6/bkd9FoLigOrPl2rc39jGMuENQpz58598cUXV61a9fHHH3/22Wc//PDD1atX1U3NWPc3CjGZpY/rxvfff9+YHtGjWtasWXPPp1jKJ+Xvv//W99f2Z7rmNaHRl5GREU/UiMEBlCENuBguLTiNuVeFmyrXCo3kH3/8oSv6JjoAjZgqlbt4nDXttc7s3Llzx44dhw8f9nhqqyA//fTTXbt26QuVTnPjo6OjOnT37l2f08Gi0TCRAE5EWkO5HokeV/XQcXdPTWn+vf/++xoO9bwc5f5yMPpC88UXX0ybNk23pH2gO25WW6fnKmzevNnfrdtn9MTEFGndwW+//fbChQsTU6Y1jxWGY/Npvbdp06aYCY6nfaDfrl27dvToUQ2aH85aE1VN+Uao2UWLFqn7Lj9ox8+ePavsUwW1ptHTVhFqeaoVZy3qmmaXHnl3cM6cOUuWLJk+fbpWFdUvWLDA/1pdu8qnPQ3UC9X4eVG/tBvzM0av78bGxvybM9UvUTdVWTE2NaXnYuPGjW7Zl/BWh3yhGBm9YFzTPbUfg+xHUpd44okntGI7AJ/jwnDRcCnsGzduHDp0SJNNuxWnk5rSVhNYc1tpnN4gmvNbt27VDC8v4Rl+5cqVl1566fbt29pV5Ycffqj8YNasWR5VR6W8efv27TpTZQ34smXLLl68qKM6x41MNNedmkmDQtRWsTrc6vPDC4TLat8X8m5faOgkulmGV0XZx3IF7IHy9kUYk2PocVQlPwAaf4+PTMWUy2uMmMrV44kG3feO24+hU9mjVw7jgCh7F6FGnHE0asqnz9NS50TvoqmOB60ixxAreN2Q1Jq2ajAGzZVlTVw6Rq8iB6CWRXchLqF6FUQ12nXlUCi7oO1UzJ+4QaKCJ7CntGp0ggJQpQ5dvnx59erVf/75p07QfdRR7SqTUAs3b948c+ZM/E5LfWTlypUnTpwYGRlxTav5/7Tvyg5USxrKOFTWpPT8qDs5NEzqs9qMUa7bfp4vHWGo4OewFt8X987Xqp6UPJBGT2Pd6TsHpoJHyZV9oQDEwSgqB1MrJLWsbbQWC8qDtu8bFx+ciLh4pw6aMjwVtPX0a9THIER9zIpB01ivHby37aoaYq1ojIOv7svVfYQ94Ru9iKvf8+hQiFvjvjTGs3u6C2pfbcaFynU+Kstpc/Xq1Y8++ujkyZMKxj+ZcH3QbZ05c+bo6OiOHTu0W70L1ZIGif6396uKnjfKfTdFgZVN6Ta73Jtex6Ub06ux2/e74AAmb9uHey6uroLGqnw3dy866JZ9LzpuP1IH6aadqaOQtHWXHVusm3FI28aa03gllzM2yn3vrAJQnM75FH+8xduHu1M25bJfQtH9ckwaw9WlySOsgreNK5ZB4p7jJqp0jdIC/5tVP7b+yPj4+L59+06fPu0/idDJ2mp416xZs3bt2g8++GD69OluQefrUFwlGunYxDPZLlbifkasruxeNBgTve6M70Ajkrpd9jA2brAr2ztTRhf1FGzv/3cwKmv+udCDYO5DYSiAMoZ4MHrPo6GtRAxTF09crux+Rjlo8fEO2ukNBaZtBNmqa++qI6qJNTTG2bPUNeXHTTU6VD5TPdaDJzpGQC1LDI6vFSOjss+vTo27fV/CZW99QmMQBpnC1laRT8Uib7Guqtm4WSFGT8ob1/jBs+rVjt9HZYM+Kt5tVHZmopV2sWse1piUquk+vobocw+m/v350o0H0odqKR8tt9+X/k4Ow+Wyvvdi5Kf0FjyouE0qVw9GzaqzsRx03F9/sO9P0P2VgSlUbSPaxiHteh6qoG10rXV8Qn8n6v/SCLI6j4a2uoqupWGRWKJ1yPW1YpjcVON2aFdlbbU7gLfj/3L87Z16ynGLS3joxCMWhfKoypHHqByD3Di5obwX7aoH144JAADg/qYw1QUAAA8TkgYAAJBC0gAAAFJIGgAAQApJAwAASCFpAAAAKSQNAAAghaQBAACkkDQAAIAUkgYAAJBC0gAAAFJIGgAAQApJAwAASCFpAAAAKSQNAAAghaQBAACkkDQAAIAUkgYAAJBC0gAAAFJIGgAAQApJAwAASCFpAAAAKSQNAAAghaQBAACkkDQAAIAUkgYAAJBC0gAAAFJIGgAAQApJAwAASCFpAAAAKSQNAAAghaQBAACkkDQAAIAUkgYAAJBC0gAAAFJIGgAAQApJAwAASCFpAAAAKSQNAAAghaQBAACkkDQAAIAUkgYAAJBC0gAAAFJIGgAAQApJAwAASCFpAAAAKSQNAAAghaQBAACkkDQAAIAUkgYAAJBC0gAAAFJIGgAAQApJAwAASCFpAAAAKSQNAAAghaQBAACkkDQAAIAUkgYAAJBC0gAAAFJIGgAAQApJAwAASCFpAAAAKSQNAAAghaQBAACkkDQAAIAUkgYAAJBC0gAAAFJIGgAAQApJAwAASCFpAAAAKSQNAAAghaQBAACkkDQAAIAUkgYAAJBC0gAAAFJIGgAAQApJAwAASCFpAAAAKSQNAAAghaQBAACkkDQAAIAUkgYAAJBC0gAAAFJIGgAAQApJAwAASCFpAAAAKSQNAAAghaQBAACkkDQAAIAUkgYAAJBC0gAAAFJIGgAAQApJAwAASCFpAAAAKSQNAAAghaQBAACkkDQAAIAUkgYAAJBC0gAAAFJIGgAAQApJAwAASCFpAAAAKSQNAAAghaQBAACkkDQAAICERx75N1QMuZTpzcPqAAAAAElFTkSuQmCC`;

            let welcomeTitle = document.createElement('div');
            let welcomeText1 = document.createElement('div');
            let welcomeText2 = document.createElement('div');
            let welcomeText3 = document.createElement('div');

            welcomeTitle.innerHTML = 'Welcome to <i>nvis</i> by NVIDIA - an image and image stream visualizer!';

            welcomeText1.innerHTML = 'Drag\'n\'drop, or copy-paste, image or video files here...';
            welcomeText2.innerHTML = '...or press L to load files with multiselect using file dialog.';
            welcomeText3.innerHTML = 'Hold H for keyboard shortcuts, press Tab to toggle UI.';

            this.welcome = document.createElement('div');
            this.welcome.id = 'welcome';
            this.welcome.appendChild(logo);
            this.welcome.appendChild(welcomeTitle);
            this.welcome.appendChild(welcomeText1);
            this.welcome.appendChild(welcomeText2);
            this.welcome.appendChild(welcomeText3);

            this.show();
        }

        show() {
            if (this.windows.windows.length == 0) {
                document.body.prepend(this.welcome);
            }
        }

        hide() {
            if (this.windows.windows.length == 0 && this.welcome.parentElement !== null) {
                this.welcome.parentElement.removeChild(this.welcome);
            }
        }

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

            this.welcome = new NvisWelcome(this);

            this.adjust();
        }


        clear() {
            this.streamPxDimensions = undefined;
            this.windows = [];
            this.welcome.show();
            this.adjust();
        }


        insideWindow(canvasPxCoords) {
            return !(canvasPxCoords.x < 0 || canvasPxCoords.x >= this.canvas.width || canvasPxCoords.y < 0 || canvasPxCoords.y >= this.canvas.height);
        }


        setStreamPxDimensions(pxDimensions) {
            if (this.streamPxDimensions !== undefined && pxDimensions.w != this.streamPxDimensions.w && pxDimensions.h != this.streamPxDimensions.h) {
                alert('New stream size mismatch!');
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
                return undefined;
            } else if (!bToPixels) {
                coords.x = coords.x / sw;
            }
            if (yy < 0.0 || yy >= sh) {
                return undefined;
            } else if (!bToPixels) {
                coords.y = coords.y / sh;
            }

            return coords;
        }


        add(streamId = 0) {
            let win = new NvisWindow(this.glContext, this.canvas);

            win.updateTextureCoordinates(this.textureCoordinates);
            win.streamId = streamId;

            this.welcome.hide();

            this.windows.push(win);
            this.adjust();

            return win;
        }


        deleteAtMouse(canvasPxCoords) {
            let windowId = this.getWindowId(canvasPxCoords);
            this.delete(windowId);
        }


        delete(windowId) {
            if (this.windows.length > 1 && windowId !== undefined && windowId < this.windows.length) {
                let overlayDiv = this.windows[windowId].overlay.div;
                overlayDiv.parentElement.removeChild(overlayDiv);
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
            this.windows[windowId].streamId = streamId;
        }


        debugZoom(title) {
            console.log('---------------------  ' + title + '  ---------------------');
            console.log('     zoom level: ' + _state.zoom.level);
            console.log('     win aspect ratio: ' + _state.zoom.winAspectRatio);
            console.log('     stream rel offset: ' + JSON.stringify(_state.zoom.streamOffset));
            console.log('     mouseWinCoords: ' + JSON.stringify(_state.zoom.mouseWinCoords));
            console.log('     win dim (px): ' + JSON.stringify(this.winPxDimensions));
            console.log('     stream dim (px): ' + JSON.stringify(this.streamPxDimensions));
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

            // this.debugZoom('updateTextureCoordinates()');

            //  update windows with new coordinates
            for (let windowId = 0; windowId < this.windows.length; windowId++) {
                this.windows[windowId].updateTextureCoordinates(this.textureCoordinates);
            }
        }


        adjust() {

            let layout = _state.layout;

            //  determine canvas dimensions and border
            this.canvas.style.borderWidth = layout.border + 'px';
            this.canvas.style.borderStyle = 'solid';
            this.canvas.style.borderColor = 'black';
            let pageWidth = (window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth);
            let pageHeight = (window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight);
            let width = pageWidth - 2 * layout.border;
            let height = pageHeight - 2 * layout.border;

            //  special case with no windows
            if (this.windows.length == 0) {
                this.canvas.width = width;
                this.canvas.height = height;
                return;
            }

            //  determine layout width/height
            if (layout.bAutomatic) {
                let canvasAspect = this.canvas.height / this.canvas.width;
                // layout.automaticDimensions.w = Math.round(Math.sqrt(Math.pow(2, Math.ceil(Math.log2(this.windows.length) / canvasAspect))));
                // layout.automaticDimensions.w = Math.max(Math.min(layout.automaticDimensions.w, this.windows.length), 1);

                let bestW = 1;
                if (this.streamPxDimensions !== undefined) {
                    let minAspectDifference = 1e30;
                    for (let w = 1; w <= this.windows.length; w++) {
                        let h = Math.ceil(this.windows.length / w);
                        let aspect = (h * this.streamPxDimensions.h) / (w * this.streamPxDimensions.w);
                        // console.log('aspect: ' + aspect);
                        let diff = Math.abs(canvasAspect - aspect);
                        // console.log('   diff: ' + diff + '    minAspectDiff: ' + minAspectDifference);
                        if (diff < minAspectDifference) {
                            minAspectDifference = diff;
                            bestW = w;
                        }
                    }
                    // console.log('Best W: ' + bestW);
                }

                layout.automaticDimensions.w = bestW;

                layout.automaticDimensions.h = Math.ceil(this.windows.length / layout.automaticDimensions.w);

            } else {
                layout.dimensions.w = Math.max(Math.min(layout.dimensions.w, this.windows.length), 1);
                layout.dimensions.h = Math.ceil(this.windows.length / layout.dimensions.w);
            }

            let layoutDims = layout.getDimensions();
            let w = layoutDims.w;
            let h = layoutDims.h;

            let dw = (width % w);
            let dh = (height % h);
            this.canvas.width = (width - dw);
            this.canvas.height = (height - dh);
            this.canvas.style.borderRightWidth = (layout.border + dw) + 'px';
            this.canvas.style.borderBottomWidth = (layout.border + dh) + 'px';

            //  set viewport to match canvas size
            this.glContext.viewport(0, 0, this.canvas.width, this.canvas.height);

            //  determine window dimensions
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


        position(canvasOffset, bPixels = true) {
            if (this.windows.length == 0) {
                return;
            }

            //  bPixels: x and y are in pixels
            if (bPixels) {
                canvasOffset = {
                    x: canvasOffset.x / (this.streamPxDimensions.w * _state.zoom.level),
                    y: canvasOffset.y / (this.streamPxDimensions.h * _state.zoom.level)
                }
            }

            _state.zoom.streamOffset.x = canvasOffset.x;
            _state.zoom.streamOffset.y = canvasOffset.y;

            this.updateTextureCoordinates();
        }


        translate(canvasOffset, bPixels = true) {

            if (this.windows.length == 0) {
                return;
            }

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

            if (this.windows.length == 0) {
                return 0;
            }

            let winRelCoords = this.getWindowCoordinates(canvasPxCoords);
            if (winRelCoords !== undefined) {

                let oldStreamCoords = this.getStreamCoordinates(canvasPxCoords);

                let factor = (bHigh ? _state.zoom.HighFactor : _state.zoom.LowFactor);
                _state.zoom.level *= (direction > 0 ? factor : 1.0 / factor);
                _state.zoom.level = Math.min(Math.max(_state.zoom.level, _state.zoom.MinLevel), _state.zoom.MaxLevel);  //  TODO: is this what we want?
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


        incStream(canvasPxCoords, streams, shaderGraphs) {
            let windowId = this.getWindowId(canvasPxCoords);
            if (windowId !== undefined) {
                let streamId = (this.windows[windowId].streamId + 1) % streams.length;
                while (streams[streamId].shaderGraphId != -1 && shaderGraphs[streams[streamId].shaderGraphId].outputStreamId != streamId) {
                    streamId = (streamId + 1) % streams.length;
                }
                this.windows[windowId].streamId = streamId;
            }
        }


        decStream(canvasPxCoords, streams, shaderGraphs) {
            let windowId = this.getWindowId(canvasPxCoords);
            if (windowId !== undefined) {
                let streamId = (this.windows[windowId].streamId + streams.length - 1) % streams.length;
                while (streams[streamId].shaderGraphId != -1 && shaderGraphs[streams[streamId].shaderGraphId].outputStreamId != streamId) {
                    streamId = (streamId + streams.length - 1) % streams.length;
                }
                this.windows[windowId].streamId = streamId;
            }
        }


        findStreamsToRender(vStreamIds, shaders, streams, streamId) {
            vStreamIds[streamId] = true;
            let stream = streams[streamId];
            let shader = shaders.shaders[stream.shaderId];

            if (shader === undefined) {
                return;
            }

            for (let inputId = 0; inputId < shader.getNumInputs(); inputId++) {
                let inputStreamId = stream.getInputStreamId(inputId);
                if (!vStreamIds[inputStreamId]) {
                    this.findStreamsToRender(vStreamIds, shaders, streams, inputStreamId);
                }
            }
        }


        render(frameId, streams, shaders, shaderGraphs) {

            let vbStreamsToRender = new Array(streams.length).fill(false);
            let vStreamWindowIds = new Array(streams.length).fill(-1);
            for (let windowId = 0; windowId < this.windows.length; windowId++) {
                let window = this.windows[windowId];
                let streamId = window.streamId;
                vStreamWindowIds[streamId] = windowId;
                this.findStreamsToRender(vbStreamsToRender, shaders, streams, streamId);
            }
            for (let streamId = 0; streamId < streams.length; streamId++) {
                vStreamWindowIds[streamId] == -1
            }

            // console.log('Need to render streams: ' + JSON.stringify(vbStreamsToRender));
            // console.log('Stream windows: ' + JSON.stringify(vStreamWindowIds));

            for (let streamId = 0; streamId < streams.length; streamId++) {
            // for (let streamId = 0; streamId < streams.length; streamId++) {
                // if (vbStreamsToRender[streamId] && vStreamWindowIds[streamId] == -1) {
                    // console.log('Would render stream ' + streamId);
                    streams[streamId].render(frameId, shaders, streams, shaderGraphs, streamId);
                // }
            }

            // for (let streamId = vbStreamsToRender.length - 1; streamId >= 0; streamId--) {
            //     //     // for (let streamId = 0; streamId < streams.length; streamId++) {
            //     //     if (vbStreamsToRender[streamId] && vStreamWindowIds[streamId] == -1) {
            //     //         // console.log('Would render stream ' + streamId);
            //     //         streams[streamId].render(frameId, shaders, streams);
            //     //     }
            //     streams[streamId].render(frameId, shaders, streams);
            // }

            for (let windowId = 0; windowId < this.windows.length; windowId++) {
                this.windows[windowId].render(windowId, frameId, streams, shaders);
            }

            if (_settings.bDrawPixel.value && _state.zoom.level >= 8.0) {
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
                    let stream = streams[window.streamId];
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

            this.annotations = new NvisAnnotations(this.glContext);

            this.position = { x: 0, y: 0 };
            this.dimensions = { w: 0, h: 0 };

            let gl = this.glContext;

            this.vertexPositions = new Float32Array([-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0]);
            this.vertexPositionBuffer = gl.createBuffer();
            this.textureCoordinateBuffer = gl.createBuffer();

            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.vertexPositions, gl.STATIC_DRAW);

            //  TODO: only one of each of these needed (for shader streams), move elsewhere

            // let fullVertexPositions = new Float32Array([-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0]);
            // this.fullVertexPositionBuffer = gl.createBuffer();
            // gl.bindBuffer(gl.ARRAY_BUFFER, this.fullVertexPositionBuffer);
            // gl.bufferData(gl.ARRAY_BUFFER, fullVertexPositions, gl.STATIC_DRAW);

            // let fullTextureCoordinates = new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0]);
            // this.fullTextureCoordinateBuffer = gl.createBuffer();
            // gl.bindBuffer(gl.ARRAY_BUFFER, this.fullTextureCoordinateBuffer);
            // gl.bufferData(gl.ARRAY_BUFFER, fullTextureCoordinates, gl.STATIC_DRAW);

            this.overlay = new NvisOverlay(this.canvas);
            document.body.appendChild(this.overlay.div);

            this.resize({ x: 0.0, y: 0.0 }, { w: 1.0, h: 1.0 });

            // this.TextureUnits = [
            //     gl.TEXTURE0,
            //     gl.TEXTURE1,
            //     gl.TEXTURE2,
            //     gl.TEXTURE3,
            //     gl.TEXTURE4,
            //     gl.TEXTURE5,
            //     gl.TEXTURE6,
            //     gl.TEXTURE7,
            // ];
        }


        resize(position, dimensions) {
            this.position = position;
            this.dimensions = dimensions;

            if (this.streamId === undefined) {
                return;
            }

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
        }

        //  TODO: temporary duplicate from NvisStream class, make static elsewhere
        findStreamDimensions(streamId, streams, shaders) {

            //  for shader streams, we need to find dimensions by recursively searching inputs
            let stream = streams[streamId];

            if (stream === undefined) {
                return undefined;
            }

            let dimensions = stream.getDimensions();
            if (dimensions !== undefined) {
                return dimensions;
            }

            let shaderId = stream.shaderId;
            if (shaderId == -1) {
                //  dimensions not known yet
                return undefined;
            }

            let shader = shaders.shaders[shaderId];
            if (shader === undefined) {
                //  shader not known yet
                return undefined;
            }

            //  deduce dimensions based on inputs
            //  input order is priority order
            for (let inputId = 0; inputId < shader.getNumInputs(); inputId++) {
                let inputStreamId = stream.getInputStreamId(inputId);
                let inputDimensions = this.findStreamDimensions(inputStreamId, streams, shaders);
                if (inputDimensions === undefined) {
                    return undefined;
                }
                stream.setDimensions(inputDimensions);
                return inputDimensions;
            }

            return undefined;
        }


        render(windowId, frameId, streams, shaders) {
            let gl = this.glContext;

            //  below, checks are needed due to asynch file/shader loading

            let streamDims = this.findStreamDimensions(this.streamId, streams, shaders);
            if (streamDims === undefined) {
                return;
            }

            let stream = streams[this.streamId];
            if (stream === undefined) {
                return;
            }

            let shaderId = stream.getShaderId();

            if (_state.input.mouse.showInfo && _state.input.mouse.streamCoords !== undefined) {
                let loc = _state.input.mouse.streamCoords;
                loc = {
                    x: Math.floor(loc.x),
                    y: Math.floor(loc.y)
                };
                let color = stream.getPixelValue(loc);
                this.overlay.update(windowId, loc, color, stream.bFloat);
                this.overlay.show();
            } else {
                this.overlay.hide();
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

            //  render window to canvas
            {
                gl.viewport(0, 0, this.canvas.width, this.canvas.height);

                let shaderProgram = shaders.textureShader.getProgram();
                gl.useProgram(shaderProgram);

                let aVertexPosition = gl.getAttribLocation(shaderProgram, 'aVertexPosition');
                gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);
                gl.vertexAttribPointer(aVertexPosition, 2, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(aVertexPosition);

                let aTextureCoord = gl.getAttribLocation(shaderProgram, 'aTextureCoord');
                gl.bindBuffer(gl.ARRAY_BUFFER, this.textureCoordinateBuffer);
                gl.vertexAttribPointer(aTextureCoord, 2, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(aTextureCoord);

                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, stream.outputTexture);

                let uSampler = gl.getUniformLocation(shaderProgram, 'uSampler');
                gl.uniform1i(uSampler, 0);

                let uAlphaCheckerboard = gl.getUniformLocation(shaderProgram, 'uAlphaCheckerboard');
                gl.uniform1i(uAlphaCheckerboard, _settings.bAlphaCheckerboard.value);

                //  TODO: this shouldn't be necessary, can get dimensions directly in shader
                gl.uniform2f(gl.getUniformLocation(shaderProgram, 'uDimensions'), streamDims.w, streamDims.h);

                gl.enable(gl.BLEND);
                // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
                gl.blendFunc(gl.ONE, gl.ZERO);

                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            }

            //  TODO: move elsewhere, optimize (redoing several calculations now)
            let layout = _state.layout;
            let layoutDims = layout.getDimensions();
            let winDim = { w: this.canvas.width / layoutDims.w, h: this.canvas.height / layoutDims.h };

            let z = _state.zoom.level;
            let sw = streamDims.w;
            let sh = streamDims.h;
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

                if (_settings.bDrawGrid.value) {

                    this.gridDrawer.update(windowId, offset, pixelSize, alpha);
                    this.gridDrawer.render();
                }
            }

            let dw = 1.0 / layoutDims.w;
            let dh = 1.0 / layoutDims.h;
            let ox = (windowId % layoutDims.w) * dw;
            let oy = Math.floor(windowId / layoutDims.w) * dh;

            let bb = new NvisBoundingBox(ox, oy, dw, dh);

            this.annotations.render(this.canvas, stream, this, bb);
            stream.annotations.render(this.canvas, stream, this, bb);
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


    class NvisExportCanvas {

        constructor() {

            this.canvas = document.createElement('canvas');
            this.glContext = this.canvas.getContext('webgl2');

            if (this.glContext === null) {
                alert('Unable to initialize WebGL!');
                return;
            }

            let gl = this.glContext;

            //  extensions
            gl.getExtension('EXT_color_buffer_float')
            gl.getExtension('EXT_float_blend');

            this.canvas.style.display = 'none';
            this.canvas.width = 1000;
            this.canvas.height = 1000;

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

            this.fragmentSource = `#version 300 es
            precision highp float;
            in vec2 vTextureCoord;
            uniform sampler2D uSampler;
            uniform bool uAlphaCheckerboard;
            out vec4 color;

            float modi(float a, float b) {
                return floor(a - floor((a + 0.5) / b) * b);
            }

            void main()
            {
                if (vTextureCoord.x < 0.0 || vTextureCoord.x > 1.0 || vTextureCoord.y < 0.0 || vTextureCoord.y > 1.0) {
                    color = vec4(0.1, 0.1, 0.1, 1.0);
                    return;
                }

                const float GridSize = 16.0;

                vec4 c = texture(uSampler, vTextureCoord);
                color = vec4(c.r, c.g, c.b, 1.0);

                //  gray checkerboard for background
                if (uAlphaCheckerboard && c.a < 1.0)
                {
                    vec2 dimensions = vec2(textureSize(uSampler, 0));
                    vec2 pos = (vTextureCoord * dimensions) / GridSize;
                    float xx = pos.x;
                    float yy = pos.y;
                    vec4 gridColor = vec4(0.6, 0.6, 0.6, 1.0);
                    if (modi(pos.x, 2.0) == 0.0 ^^ modi(pos.y, 2.0) == 0.0) {
                        gridColor = vec4(0.5, 0.5, 0.5, 1.0);
                    }

                    color = gridColor + vec4(color.rgb * color.a, 1.0);
                }
                color = vec4(1.0, 0.0, 0.0, 1.0);
            }`;

            this.vertexPositions = new Float32Array([-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0]);
            this.vertexPositionBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.vertexPositions, gl.STATIC_DRAW);

            this.textureCoordinates = new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0]);
            this.textureCoordinateBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.textureCoordinateBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.textureCoordinates, gl.STATIC_DRAW);


            this.vertexShader = gl.createShader(gl.VERTEX_SHADER);
            this.fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
            this.shaderProgram = gl.createProgram();

            gl.shaderSource(this.vertexShader, this.vertexSource);
            gl.compileShader(this.vertexShader);
            if (!gl.getShaderParameter(this.vertexShader, gl.COMPILE_STATUS)) {
                alert('WebGL: ' + gl.getShaderInfoLog(this.vertexShader));
            }
            gl.shaderSource(this.fragmentShader, this.fragmentSource);
            gl.compileShader(this.fragmentShader);
            if (!gl.getShaderParameter(this.fragmentShader, gl.COMPILE_STATUS)) {
                alert('WebGL: ' + gl.getShaderInfoLog(this.fragmentShader));
            }

            gl.attachShader(this.shaderProgram, this.vertexShader);
            gl.attachShader(this.shaderProgram, this.fragmentShader);
            gl.linkProgram(this.shaderProgram);

            if (!gl.getProgramParameter(this.shaderProgram, gl.LINK_STATUS)) {
                alert('WebGL: ' + gl.getProgramInfoLog(this.shaderProgram));
            }

            this.aVertexPosition = gl.getAttribLocation(this.shaderProgram, 'aVertexPosition');
            this.aTextureCoord = gl.getAttribLocation(this.shaderProgram, 'aTextureCoord');


            // document.body.appendChild(this.canvas);
        }


        render(stream) {
            let gl = this.glContext;

            gl.useProgram(this.shaderProgram);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);
            gl.vertexAttribPointer(this.aVertexPosition, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(this.aVertexPosition);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.textureCoordinateBuffer);
            gl.vertexAttribPointer(this.aTextureCoord, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(this.aTextureCoord);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, stream.outputTexture);
            gl.bindTexture(gl.FRAMEBUFFER, stream.frameBuffer);

            let uSampler = gl.getUniformLocation(this.shaderProgram, 'uSampler');
            gl.uniform1i(uSampler, 0);

            let uAlphaCheckerboard = gl.getUniformLocation(this.shaderProgram, 'uAlphaCheckerboard');
            gl.uniform1i(uAlphaCheckerboard, _settings.bAlphaCheckerboard.value);

            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////

    class NvisBase64 {

        static lookup = [];
        static revLookup = [];
        static code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
        // static lookup = new Array(Base64.code.length);
        // static revLookup = new Array(Base64.code.length);

        static {

            for (let i = 0; i < NvisBase64.code.length; ++i) {
                NvisBase64.lookup[i] = NvisBase64.code[i];
                NvisBase64.revLookup[NvisBase64.code.charCodeAt(i)] = i;
            }

            // See: https://en.wikipedia.org/wiki/Base64#URL_applications
            NvisBase64.revLookup['-'.charCodeAt(0)] = 62
            NvisBase64.revLookup['_'.charCodeAt(0)] = 63

        }
        // }
        // exports.byteLength = byteLength
        // exports.toByteArray = toByteArray
        // exports.fromByteArray = fromByteArray

        // var lookup = []
        // var revLookup = []
        // var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

        // var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
        // for (var i = 0, len = code.length; i < len; ++i) {
        //   lookup[i] = code[i]
        //   revLookup[code.charCodeAt(i)] = i
        // }

        // // Support decoding URL-safe base64 strings, as Node.js does.
        // // See: https://en.wikipedia.org/wiki/Base64#URL_applications
        // revLookup['-'.charCodeAt(0)] = 62
        // revLookup['_'.charCodeAt(0)] = 63

        static toBlob(base64, type) {
            var bytes = window.atob(base64);
            let arrayBuffer = new ArrayBuffer(bytes.length);
            let byteArray = new Uint8Array(ab);
            for (let i = 0; i < bytes.length; i++) {
                byteArray[i] = bytes.charCodeAt(i);
            }
            return new Blob([arrayBuffer], { type: type });
        }

        static getLens(b64) {
            var len = b64.length

            if (len % 4 > 0) {
                throw new Error('Invalid string. Length must be a multiple of 4')
            }

            // Trim off extra bytes after placeholder bytes are found
            // See: https://github.com/beatgammit/base64-js/issues/42
            var validLen = b64.indexOf('=')
            if (validLen === -1) {
                validLen = len
            }

            let placeHoldersLen = (validLen === len ? 0 : 4 - (validLen % 4));

            return [validLen, placeHoldersLen]
        }

        // base64 is 4/3 + up to two characters of the original data
        static byteLength(b64) {
            var lens = NvisBase64.getLens(b64)
            var validLen = lens[0]
            var placeHoldersLen = lens[1]
            return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
        }

        static _byteLength(b64, validLen, placeHoldersLen) {
            return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
        }

        static toByteArray(b64) {
            var lens = NvisBase64.getLens(b64);
            var validLen = lens[0];
            var placeHoldersLen = lens[1];

            var arr = new Uint8Array(NvisBase64._byteLength(b64, validLen, placeHoldersLen));

            let curByte = 0;

            // if there are placeholders, only get up to the last complete 4 chars
            let len = (placeHoldersLen > 0 ? validLen - 4 : validLen);

            let i = 0;
            for (i = 0; i < len; i += 4) {
                let tmp = (NvisBase64.revLookup[b64.charCodeAt(i)] << 18) | (NvisBase64.revLookup[b64.charCodeAt(i + 1)] << 12) | (NvisBase64.revLookup[b64.charCodeAt(i + 2)] << 6) | NvisBase64.revLookup[b64.charCodeAt(i + 3)];
                arr[curByte++] = (tmp >> 16) & 0xff;
                arr[curByte++] = (tmp >> 8) & 0xff;
                arr[curByte++] = tmp & 0xff;
            }

            if (placeHoldersLen === 2) {
                let tmp = (NvisBase64.revLookup[b64.charCodeAt(i)] << 2) | (NvisBase64.revLookup[b64.charCodeAt(i + 1)] >> 4);
                arr[curByte++] = tmp & 0xff;
            }

            if (placeHoldersLen === 1) {
                let tmp = (NvisBase64.revLookup[b64.charCodeAt(i)] << 10) | (NvisBase64.revLookup[b64.charCodeAt(i + 1)] << 4) | (NvisBase64.revLookup[b64.charCodeAt(i + 2)] >> 2);
                arr[curByte++] = (tmp >> 8) & 0xff;
                arr[curByte++] = tmp & 0xff;
            }

            return arr;
        }

        static tripletToBase64(num) {
            return NvisBase64.lookup[num >> 18 & 0x3f] + NvisBase64.lookup[num >> 12 & 0x3f] + NvisBase64.lookup[num >> 6 & 0x3f] + NvisBase64.lookup[num & 0x3f];
        }

        static encodeChunk(uint8, start, end) {
            let output = [];
            for (let i = start; i < end; i += 3) {
                let tmp = ((uint8[i] << 16) & 0xff0000) + ((uint8[i + 1] << 8) & 0xff00) + (uint8[i + 2] & 0xff);
                output.push(NvisBase64.tripletToBase64(tmp));
            }
            return output.join('');
        }

        static fromByteArray(uint8) {
            let len = uint8.length;
            let extraBytes = len % 3; // if we have 1 byte left, pad 2 bytes
            let parts = [];
            let maxChunkLength = 16383; // must be multiple of 3

            //  go through the array every three bytes, we'll deal with trailing stuff later
            for (let i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
                parts.push(NvisBase64.encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)));
            }

            //  pad the end with zeros, but make sure to not forget the extra bytes
            if (extraBytes === 1) {
                let tmp = uint8[len - 1];
                parts.push(NvisBase64.lookup[tmp >> 2] + NvisBase64.lookup[(tmp << 4) & 0x3F] + '==');
            } else if (extraBytes === 2) {
                let tmp = (uint8[len - 2] << 8) + uint8[len - 1];
                parts.push(NvisBase64.lookup[tmp >> 10] + NvisBase64.lookup[(tmp >> 4) & 0x3F] + NvisBase64.lookup[(tmp << 2) & 0x3F] + '=');
            }

            return parts.join('')
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////

    class NvisCRC32 {

        static crc32Table = new Array(256);
        static crc32 = 0xffffffff;

        static begin() {
            this.crc32 = 0xffffffff;
        }

        static add(value) {
            this.crc32 = this.crc32Table[(this.crc32 ^ value) & 0xff] ^ (this.crc32 >>> 8);
        }

        static end() {
            this.crc32 = (this.crc32 ^ 0xffffffff) >>> 0;
        }

        static {
            for (let i = 0; i < 256; i++) {
                let c = i;
                for (let j = 0; j < 8; j++) {
                    c = (c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1);
                }
                this.crc32Table[i] = c;
            }
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////

    class NvisPNG extends NvisBitBuffer {

        //static CRC32 = new NvisCRC32();

        constructor(width, height, data) {
            const Signature = '\x89PNG\r\n\x1A\n';
            const ChunkTypeIHDR = 'IHDR';
            const ChunkTypeIDAT = 'IDAT';
            const ChunkTypeIEND = 'IEND';
            const SizeChunkLength = 4;
            const SizeChunkType = 4;
            const SizeChunkCRC = 4;
            const SizeIHDR = 13;
            const SizeIEND = 0;
            const SizeData = width * height * 4;
            const SizeChunk = (1 << 16);
            const NumDataChunks = Math.floor(SizeData / SizeChunk);
            const SizeLastChunk = SizeData - NumDataChunks * SizeChunk;
            const SizeIDATs = NumDataChunks * (SizeChunk + 12) + (SizeLastChunk + 12);
            const SizeFile = Signature.length + (SizeIHDR + 12) + SizeIDATs + (SizeIEND + 12);

            super(new ArrayBuffer(SizeFile * 2), { littleEndian: false });

            this.writeString(Signature);

            this.writeUint32(SizeIHDR);
            this.writeString(ChunkTypeIHDR);
            this.writeUint32(width);
            this.writeUint32(height);
            this.writeUint8(8);  //  bit depth (per channel)
            this.writeUint8(6);  //  color type (6 = RGBA)
            this.writeUint8(0);  //  compression method (0 = deflate)
            this.writeUint8(0);  //  filter method (0 = no filter)
            this.writeUint8(0);  //  interlace method (0 = no interlace)
            this.writeUint32(this.crc32(SizeChunkType + SizeIHDR));

            for (let dc = 0; dc < NumDataChunks; dc++) {
                let offset = dc * SizeChunk;
                let chunk = data.subarray(offset, offset + SizeChunk);
                let output = NvisZlib.deflate(chunk);
                let length = output.buffer.byteLength;
                output.bytePointer = 0;  //  reset to consume

                this.writeUint32(length);
                this.writeString(ChunkTypeIDAT);
                this.consume(output, length);
                this.writeUint32(this.crc32(SizeChunkType + length));
            }

            if (SizeLastChunk > 0) {
                let offset = NumDataChunks * SizeChunk;
                let chunk = data.subarray(offset, offset + SizeLastChunk);
                let output = NvisZlib.deflate(chunk);
                let length = output.buffer.byteLength;
                output.bytePointer = 0;  //  reset to consume

                this.writeUint32(length);
                this.writeString(ChunkTypeIDAT);
                this.consume(output, length);
                this.writeUint32(this.crc32(SizeChunkType + length));
            }

            this.writeUint32(SizeIEND);
            this.writeString(ChunkTypeIEND);
            this.writeUint32(this.crc32(SizeChunkType + SizeIEND));
            this.shrinkWrap();
        }

        getBase64() {
            // let buffer = NvisZlib.deflate(this.buffer);
            // return base64.fromByteArray(new Uint8Array(this.buffer.buffer));
            return NvisBase64.fromByteArray(new Uint8Array(this.buffer));
        }

        crc32(offset) {
            NvisCRC32.begin();
            for (let i = this.bytePointer - offset; i < this.bytePointer; i++) {
                NvisCRC32.add(this.getInt8(i));
            }
            NvisCRC32.end();

            return NvisCRC32.crc32;
        }

    }

    class NvisPNG2 {

        //let HEADER = '\x89PNG\r\n\x1A\n';

        createCRC(_crc32) {
            /* Create crc32 lookup table */
            //const _crc32 = new Array();
            for (let i = 0; i < 256; i++) {
                let c = i;
                for (let j = 0; j < 8; j++) {
                    if (c & 1) {
                        c = -306674912 ^ ((c >> 1) & 0x7fffffff);
                    } else {
                        c = (c >> 1) & 0x7fffffff;
                    }
                }
                _crc32[i] = c;
            }
        }

        // compute crc32 of the PNG chunks
        crc32(offset, size) {
            let crc = -1;
            for (var i = 4; i < size - 4; i++) {
                crc = this._crc32[(crc ^ this.buffer[offset + i]) & 0xff] ^ ((crc >> 8) & 0x00ffffff);
            }
            this.write4(offset + size - 4, crc ^ -1);
        }

        write4(offset, value) {
            this.buffer[offset++] = (value >> 24) & 255;
            this.buffer[offset++] = (value >> 16) & 255;
            this.buffer[offset++] = (value >> 8) & 255;
            this.buffer[offset++] = value & 255;
            return offset;
        }

        write2(offset, value) {
            this.buffer[offset++] = (value >> 8) & 255;
            this.buffer[offset++] = value & 255;
            return offset;
        }

        write2lsb(offset, value) {
            this.buffer[offset++] = value & 255;
            this.buffer[offset++] = (value >> 8) & 255;
            return offset;
        }

        writeString(buffer, offset, string) {
            for (let i = 0, n = string.length; i < n; i++) {
                buffer[offset++] = string.charCodeAt(i);
            }
            return offset;
        }

        constructor(width, height, depth, backgroundColor = 'transparent') {

            const HEADER = '\x89PNG\r\n\x1A\n';

            this._crc32 = new Array();
            this.createCRC(this._crc32);

            this.width = width;
            this.height = height;
            this.depth = depth;

            // pixel data and row filter identifier size
            this.bit_depth = 8;
            this.pix_format = 3; // indexed
            this.pix_size = height * (width + 1);

            // deflate header, pix_size, block headers, adler32 checksum
            this.data_size = 2 + this.pix_size + 5 * Math.floor((0xfffe + this.pix_size) / 0xffff) + 4;

            // offsets and sizes of Png chunks
            this.ihdr_offs = 0;                                 // IHDR offset and size
            this.ihdr_size = 4 + 4 + 13 + 4;
            this.plte_offs = this.ihdr_offs + this.ihdr_size;   // PLTE offset and size
            this.plte_size = 4 + 4 + 3 * depth + 4;
            this.trns_offs = this.plte_offs + this.plte_size;   // tRNS offset and size
            // this.trns_offs = this.ihdr_offs + this.plte_size;   // tRNS offset and size
            this.trns_size = 4 + 4 + depth + 4;
            this.idat_offs = this.trns_offs + this.trns_size;   // IDAT offset and size
            this.idat_size = 4 + 4 + this.data_size + 4;
            this.iend_offs = this.idat_offs + this.idat_size;   // IEND offset and size
            this.iend_size = 4 + 4 + 4;
            this.buffer_size = this.iend_offs + this.iend_size;    // total PNG size

            // allocate buffers
            const rawBuffer = new ArrayBuffer(HEADER.length + this.buffer_size);
            this.writeString(new Uint8Array(rawBuffer), 0, HEADER);
            const buffer = new Uint8Array(rawBuffer, HEADER.length, this.buffer_size);
            this.buffer = buffer;
            this.palette = new Object();
            this.pindex = 0;

            // initialize non-zero elements
            let off = this.write4(this.ihdr_offs, this.ihdr_size - 12);
            off = this.writeString(buffer, off, 'IHDR');
            off = this.write4(off, width);
            off = this.write4(off, height);
            this.buffer[off++] = this.bit_depth;
            this.buffer[off++] = this.pix_format;
            off = this.write4(this.plte_offs, this.plte_size - 12);
            this.writeString(buffer, off, 'PLTE');
            off = this.write4(this.trns_offs, this.trns_size - 12);
            this.writeString(buffer, off, 'tRNS');
            off = this.write4(this.idat_offs, this.idat_size - 12);
            this.writeString(buffer, off, 'IDAT');
            off = this.write4(this.iend_offs, this.iend_size - 12);
            this.writeString(buffer, off, 'IEND')

            // initialize deflate header
            let header = ((8 + (7 << 4)) << 8) | (3 << 6);
            header += 31 - (header % 31);
            this.write2(this.idat_offs + 8, header);

            // initialize deflate block headers
            for (let i = 0; (i << 16) - 1 < this.pix_size; i++) {
                let size, bits;
                if (i + 0xffff < this.pix_size) {
                    size = 0xffff;
                    bits = 0;
                } else {
                    size = this.pix_size - (i << 16) - i;
                    bits = 1;
                }
                let off = this.idat_offs + 8 + 2 + (i << 16) + (i << 2);
                this.buffer[off++] = bits;
                off = this.write2lsb(off, size);
                this.write2lsb(off, ~size);
            }

            this.backgroundColor = this.createColor(backgroundColor);
        }

        index(x, y) {
            const i = y * (this.width + 1) + x + 1;
            return this.idat_offs + 8 + 2 + 5 * Math.floor((i / 0xffff) + 1) + i;
        }

        color(red, green, blue, alpha) {

            alpha = (alpha >= 0 ? alpha : 255);
            const color = (((((alpha << 8) | red) << 8) | green) << 8) | blue;

            if (this.palette[color] === undefined) {
                if (this.pindex == this.depth) return 0;

                const ndx = this.plte_offs + 8 + 3 * this.pindex;

                this.buffer[ndx + 0] = red;
                this.buffer[ndx + 1] = green;
                this.buffer[ndx + 2] = blue;
                this.buffer[this.trns_offs + 8 + this.pindex] = alpha;

                this.palette[color] = this.pindex++;
            }
            return this.palette[color];
        }

        getBase64() {
            this.deflate();
            // return base64.fromByteArray(new Uint8Array(this.buffer.buffer));
            return NvisBase64.fromByteArray(new Uint8Array(this.buffer.buffer));
        }

        deflate() {
            const { width, height, buffer } = this;

            // compute adler32 of output pixels + row filter bytes
            const BASE = 65521; // largest prime smaller than 65536
            const NMAX = 5552;  // NMAX is the largest n such that 255n(n+1)/2 + (n+1)(BASE-1) <= 2^32-1
            let s1 = 1;
            let s2 = 0;
            let n = NMAX;

            const baseOffset = this.idat_offs + 8 + 2 + 5;
            for (let y = 0; y < height; y++) {
                for (let x = -1; x < width; x++) {
                    const i = y * (width + 1) + x + 1;
                    s1 += this.buffer[baseOffset * Math.floor((i / 0xffff) + 1) + i];
                    s2 += s1;
                    if ((n -= 1) == 0) {
                        s1 %= BASE;
                        s2 %= BASE;
                        n = NMAX;
                    }
                }
            }
            s1 %= BASE;
            s2 %= BASE;
            this.write4(this.idat_offs + this.idat_size - 8, (s2 << 16) | s1);

            this.crc32(this.ihdr_offs, this.ihdr_size);
            this.crc32(this.plte_offs, this.plte_size);
            this.crc32(this.trns_offs, this.trns_size);
            this.crc32(this.idat_offs, this.idat_size);
            this.crc32(this.iend_offs, this.iend_size);
        }

        getDataURL() {
            return 'data:image/png;base64,' + this.getBase64();
        }

        createColor(r, g, b, a = 255) {
        // createColor(color) {
            // color = tinycolor(color);
            // const rgb = color.toRgb();
            // return this.color(rgb.r, rgb.g, rgb.b, Math.round(rgb.a * 255));
            return this.color(r, g, b, a);
        }

        setPixel(x, y, color) {
            const i = y * (this.width + 1) + x + 1;
            this.buffer[this.idat_offs + 8 + 2 + 5 * Math.floor((i / 0xffff) + 1) + i] = color;
        }

        getPixel(x, y) {
            const i = y * (this.width + 1) + x + 1;
            return this.buffer[this.idat_offs + 8 + 2 + 5 * Math.floor((i / 0xffff) + 1) + i];
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////

    class NvisRenderer {

        constructor() {
            this.glContext = undefined;

            this.canvas = undefined;
            this.helpPopup = undefined;
            this.uiPopup = undefined;
            this.infoPopup = undefined;
            this.fileInput = undefined;
            this.performanceInfo = undefined;

            this.uiHtml = '';

            this.settingsUI = new NvisUI('settings', _settings, this);

            this.canvas = document.createElement('canvas');

            this.saveCanvas = new NvisExportCanvas();

            this.glContext = this.canvas.getContext('webgl2');
            if (this.glContext === null) {
                alert('Unable to initialize WebGL!');
                return;
            }

            //  extensions
            this.glContext.getExtension('EXT_color_buffer_float')
            this.glContext.getExtension('EXT_float_blend');

            this.streams = [];
            this.windows = new NvisWindows(this.glContext, this.canvas);
            this.shaders = new NvisShaders(this.glContext);
            this.shaderGraphDescriptions = [];
            this.shaderGraphQueue = [];
            this.shaderGraphs = [];

            this.helpPopup = document.createElement('div');
            this.helpPopup.className = 'helpPopup';
            this.helpPopup.innerHTML = '<b><i>nvis</i><br/>';
            this.helpPopup.innerHTML += '<br/>';
            this.helpPopup.innerHTML += 'Drag-and-drop image or video files to this window...<br/>';
            this.helpPopup.innerHTML += '<br/>';
            this.helpPopup.innerHTML += 'Tab - open user interface, to manipulate settings, streams, and shaders<br/>';
            this.helpPopup.innerHTML += 'h - hold to show the list of keyboard shortcut commands<br/>';
            this.helpPopup.innerHTML += 'o - open file input dialog<br/>';
            this.helpPopup.innerHTML += 'Space - toggle animation<br/>';
            this.helpPopup.innerHTML += 'p - toggle ping-pong during animation<br/>';
            this.helpPopup.innerHTML += 'Arrow Left/Right - step one frame forward/backwards<br/>';
            this.helpPopup.innerHTML += 'Arrow Up/Down - step between streams in the current window (under cursor)<br/>';
            this.helpPopup.innerHTML += 'g - toggle display of pixel grid when zoomed in<br/>';
            this.helpPopup.innerHTML += 'd - delete the window under the cursor<br/>';
            this.helpPopup.innerHTML += 'w - add a new window<br/>';
            this.helpPopup.innerHTML += 'l - open file load dialog<br/>';
            this.helpPopup.innerHTML += 'i - toggle per-pixel information<br/>';
            this.helpPopup.innerHTML += 'a - toggle automatic layout of windows<br/>';
            this.helpPopup.innerHTML += '+/- - increase/decrease the window layout width<br/>';

            this.infoPopup = document.createElement('div');
            this.infoPopup.id = 'infoPopup';
            this.infoPopup.className = 'infoPopup';

            this.uiPopup = document.createElement('div');
            this.uiPopup.id = 'uiPopup';
            this.uiPopup.className = 'uiPopup';
            this.updateUIPopup();

            this.fileInput = document.createElement('input');
            this.fileInput.id = 'fileInput';
            this.fileInput.setAttribute('type', 'file');
            this.fileInput.setAttribute('multiple', true);
            this.fileInput.setAttribute('accept', 'image/*|.exr|.pfm');
            //this.fileInput.onchange = this.onFileDrop;
            this.fileInput.addEventListener('change', (event) => this.onFileDrop(event));

            this.performanceInfo = document.createElement('span');
            this.performanceInfo.id = 'performanceInfo'

            document.body.appendChild(this.performanceInfo);
            document.body.appendChild(this.uiPopup);
            document.body.appendChild(this.helpPopup);
            document.body.appendChild(this.fileInput);
            document.body.appendChild(this.infoPopup);
            document.body.appendChild(this.canvas);

            //  event listeners
            window.addEventListener('resize', this.windows.boundAdjust);

            this.canvas.addEventListener('click', (event) => this.onClick(event));
            this.canvas.addEventListener('mousedown', (event) => this.onMouseDown(event));
            this.canvas.addEventListener('mousemove', (event) => this.onMouseMove(event));
            this.canvas.addEventListener('mouseup', (event) => this.onMouseUp(event));
            this.canvas.addEventListener('mouseleave', (event) => this.onMouseUp(event));
            this.canvas.addEventListener('wheel', (event) => this.onWheel(event));

            document.body.addEventListener('paste', (event) => this.onFileDrop(event));
            document.body.addEventListener('drop', (event) => this.onFileDrop(event));
            document.body.addEventListener('dragenter', (event) => this.onFileDragEnter(event));
            document.body.addEventListener('dragover', (event) => this.onFileDragOver(event));
            document.body.addEventListener('dragleave', (event) => this.onFileDragLeave(event));
            document.body.addEventListener('keydown', (event) => this.onKeyDown(event));
            document.body.addEventListener('keyup', (event) => this.onKeyUp(event));

        };

        onWheel(event) {
            event.preventDefault();
            let level = this.windows.zoom(-Math.sign(event.deltaY), _state.input.mouse.canvasCoords, _state.input.keyboard.shift);
            this.popupInfo('zoom = ' + level.toFixed(1) + 'x');
        }


        getValidStreams() {
            let streamIds = [];
            for (let i = 0; i < this.streams.length; i++) {
                let shaderGraphId = this.streams[i].shaderGraphId;
                if (shaderGraphId == -1 || this.shaderGraphs[shaderGraphId].outputStreamId != i) {
                    streamIds.push(i);
                }
            }
            return streamIds;
        }


        updateUIPopup() {

            this.uiPopup.innerHTML = '';

            let title = document.createElement('span');
            title.className = 'title';
            let titleText = document.createElement('i');
            titleText.innerHTML = 'nvis';
            title.appendChild(titleText);

            let bar = document.createElement('div');
            bar.className = 'titleBarBar';
            bar.style.backgroundColor = '#d0d0d0';
            bar.style.flexGrow = '1';

            let titleBar = document.createElement('div');
            titleBar.addEventListener('mousedown', (event) => {
                nvis.uiOnMouseDown(event);
            });
            titleBar.className = 'titleBar';
            titleBar.appendChild(title);
            titleBar.appendChild(bar)

            this.uiPopup.appendChild(titleBar);

            let tabs = document.createElement('div');
            tabs.className = 'tabs';

            let tabSettings = document.createElement('button');
            tabSettings.className = (_state.ui.tabId == 'tabSettings' ? 'tab active' : 'tab');
            tabSettings.addEventListener('click', (event) => nvis.uiOpenTab(event, 'tabSettings'));
            tabSettings.innerHTML = 'Settings';
            let tabStreams = document.createElement('button');
            tabStreams.className = (_state.ui.tabId == 'tabStreams' ? 'tab active' : 'tab');
            tabStreams.addEventListener('click', (event) => nvis.uiOpenTab(event, 'tabStreams'));
            tabStreams.innerHTML = 'Streams';
            let tabWindows = document.createElement('button');
            tabWindows.className = (_state.ui.tabId == 'tabWindows' ? 'tab active' : 'tab');
            tabWindows.addEventListener('click', (event) => nvis.uiOpenTab(event, 'tabWindows'));
            tabWindows.innerHTML = 'Windows';
            let tabShaders = document.createElement('button');
            tabShaders.className = (_state.ui.tabId == 'tabShaders' ? 'tab active' : 'tab')
            tabShaders.addEventListener('click', (event) => nvis.uiOpenTab(event, 'tabShaders'));
            tabShaders.innerHTML = 'Shaders';
            let tabAnnotations = document.createElement('button');
            tabAnnotations.className = (_state.ui.tabId == 'tabAnnotations' ? 'tab active' : 'tab')
            tabAnnotations.addEventListener('click', (event) => nvis.uiOpenTab(event, 'tabAnnotations'));
            tabAnnotations.innerHTML = 'Annotations';

            tabs.appendChild(tabSettings);
            tabs.appendChild(tabStreams);
            tabs.appendChild(tabWindows);
            tabs.appendChild(tabShaders);
            tabs.appendChild(tabAnnotations);

            //  settings
            this.settingsUI.build();
            let settingsDiv = document.createElement('div');
            settingsDiv.id = 'tabSettings';
            settingsDiv.className = 'tabContent';
            settingsDiv.style.display = (_state.ui.tabId == 'tabSettings' ? 'block' : 'none');
            settingsDiv.appendChild(this.settingsUI.dom);


            //  streams
            let streamsDiv = document.createElement('div');
            streamsDiv.id = 'tabStreams';
            streamsDiv.className = 'tabContent';
            streamsDiv.style.display = (_state.ui.tabId == 'tabStreams' ? 'block' : 'none');
            for (let streamId = 0; streamId < this.streams.length; streamId++) {
                let ui = this.streams[streamId].getUI(streamId, this.streams, this.shaders, this.shaderGraphs);
                if (ui !== undefined) {
                    streamsDiv.appendChild(ui);
                }
            }


            //  windows
            let windowsDiv = document.createElement('div');
            windowsDiv.id = 'tabWindows';
            windowsDiv.className = 'tabContent';
            windowsDiv.style.display = (_state.ui.tabId == 'tabWindows' ? 'block' : 'none');
            for (let windowId = 0; windowId < this.windows.getNumWindows(); windowId++) {

                let select = document.createElement('select');
                select.id = 'windowStream-' + windowId;
                select.addEventListener('change', () => {
                    nvis.uiSetWindowStreamId(windowId);
                });

                let windowStreamId = this.windows.getWindow(windowId).streamId;
                for (let streamId = 0; streamId < this.streams.length; streamId++) {

                    let shaderGraphId = this.streams[streamId].shaderGraphId;
                    if (shaderGraphId != -1) {
                        if (this.shaderGraphs[shaderGraphId].outputStreamId != streamId) {
                            continue;
                        }
                    }

                    let fileName = this.streams[streamId].getName(this.shaderGraphs);
                    let option = document.createElement('option');
                    option.innerHTML = fileName;
                    option.value = streamId;
                    if (streamId == windowStreamId) {
                        option.setAttribute('selected', true);
                    }
                    select.appendChild(option);
                }

                let label = document.createElement('label');
                label.innerHTML = 'window ' + (windowId + 1) + ': ';

                let selectDiv = document.createElement('div');
                selectDiv.appendChild(label);
                selectDiv.appendChild(select);

                if (this.windows.windows.length > 1) {
                    let deleteButton = document.createElement('button');
                    deleteButton.innerHTML = 'Delete';
                    deleteButton.addEventListener('click', () => {
                        nvis.uiDeleteWindow(windowId);
                    })
                    selectDiv.appendChild(deleteButton);
                }

                windowsDiv.appendChild(selectDiv);
            }
            if (this.streams.length > 0) {
                let newButton = document.createElement('button');
                newButton.innerHTML = 'Add window';
                newButton.addEventListener('click', () => {
                    nvis.uiAddWindow();
                });
                windowsDiv.appendChild(newButton);
            }

            //  shaders
            let validShaders = [];
            for (let shaderId = 0; shaderId < this.shaders.shaders.length; shaderId++) {
                let shader = this.shaders.shaders[shaderId];
                if (shader.numInputs <= this.streams.length && !shader.bHidden) {
                    validShaders.push(shaderId);
                }
            }

            let shadersDiv = document.createElement('div');
            shadersDiv.id = 'tabShaders';
            shadersDiv.className = 'tabContent';
            shadersDiv.style.display = (_state.ui.tabId == 'tabShaders' ? 'block' : 'none');

            let formatLabel = document.createElement('label');
            formatLabel.innerHTML = 'Float output: ';
            let formatCheckbox = document.createElement('input');
            formatCheckbox.setAttribute('id', 'bFloatOutput');
            formatCheckbox.setAttribute('type', 'checkbox');
            formatCheckbox.setAttribute('checked', true);
            let formatDiv = document.createElement('div');
            formatDiv.appendChild(formatLabel);
            formatDiv.appendChild(formatCheckbox);

            let shaderLabel = document.createElement('label');
            shaderLabel.innerHTML = 'Shader: ';
            let shaderSelect = document.createElement('select');
            shaderSelect.id = 'shaderStream';
            shaderSelect.addEventListener('change', (event) => {
                let shaderId = parseInt(document.getElementById('shaderStream').value);
                document.getElementById('shaderCreate').disabled = !validShaders.includes(shaderId);
            });

            let shaderButton = document.createElement('button');
            shaderButton.id = 'shaderCreate';
            shaderButton.innerHTML = 'Create';
            shaderButton.disabled = true;
            shaderButton.addEventListener('click', () => {
                let shaderId = parseInt(document.getElementById('shaderStream').value);

                let newStream = this.addShaderStream(shaderId);
                newStream.bFloat = document.getElementById('bFloatOutput').checked;

                let numInputs = this.shaders.shaders[shaderId].numInputs;
                let inputStreams = [];
                if (numInputs > 0) {
                    for (let i = 0; i < numInputs; i++) {
                        inputStreams.push(i);
                    }
                    newStream.setInputStreamIds(inputStreams);
                } else {
                    //  generator, need to set size
                    newStream.setDimensions(_renderer.windows.streamPxDimensions);
                }
                // console.log('Click: ' + (this.streams.length - 1));
                this.addWindow(this.streams.length - 1);
                this.closeUIPopup();
            });

            let option = document.createElement('option');
            option.innerHTML = '--- Select shader ---';
            shaderSelect.appendChild(option);
            for (let shaderId = 0; shaderId < this.shaders.shaders.length; shaderId++) {
                let shader = this.shaders.shaders[shaderId];
                if (shader.bHidden) {
                    continue;
                }
                let numInputs = shader.numInputs;
                option = document.createElement('option');
                option.innerHTML = shader.name;
                option.value = shaderId;
                if (numInputs > this.streams.length) {
                    option.disabled = true;
                    option.innerHTML += ' (requires ' + numInputs + ' input' + (numInputs == 1 ? '' : 's') + ')';
                } else if (numInputs == 0 && this.streams.length == 0) {
                    option.disabled = true;
                    option.innerHTML += ' (requires known dimensions)';
                }
                shaderSelect.appendChild(option);
            }
            let selectShaderDiv = document.createElement('div');
            selectShaderDiv.appendChild(shaderLabel);
            selectShaderDiv.appendChild(shaderSelect);
            selectShaderDiv.appendChild(shaderButton);


            let validGraphs = [];
            for (let graphId = 0; graphId < this.shaderGraphDescriptions.length; graphId++) {
                let graph = this.shaderGraphDescriptions[graphId];
                if (graph.inputs <= this.streams.length) {
                    validGraphs.push(graphId);
                }
            }

            let graphLabel = document.createElement('label');
            graphLabel.innerHTML = 'Shader graph: ';
            let graphSelect = document.createElement('select');
            graphSelect.id = 'graphStream';
            graphSelect.addEventListener('change', (event) => {
                let shaderId = parseInt(document.getElementById('graphStream').value);
                document.getElementById('graphCreate').disabled = !validGraphs.includes(shaderId);
            });

            let graphButton = document.createElement('button');
            graphButton.id = 'graphCreate';
            graphButton.innerHTML = 'Create';
            graphButton.disabled = true;
            graphButton.addEventListener('click', () => {
                let graphId = parseInt(document.getElementById('graphStream').value);

                let argument = {
                    shaderGraphDescriptionId: graphId,
                    parameters: {},
                    inputs: [0, 1],
                    window: true
                };
                this.parseShaderGraph(argument);

                // let newStream = this.addShaderStream(shaderId);
                // newStream.bFloat = document.getElementById('bFloatOutput').checked;

                // this.addWindow(this.streams.length - 1);
                this.closeUIPopup();
            });

            option = document.createElement('option');
            option.innerHTML = '--- Select shader graph ---';
            graphSelect.appendChild(option);
            for (let graphId = 0; graphId < this.shaderGraphDescriptions.length; graphId++) {
                let graphDescription = this.shaderGraphDescriptions[graphId];
                let numInputs = graphDescription.inputs;
                option = document.createElement('option');
                option.innerHTML = graphDescription.name;
                option.value = graphId;
                if (numInputs > this.streams.length) {
                    option.disabled = true;
                    option.innerHTML += ' (requires ' + numInputs + ' input' + (numInputs == 1 ? '' : 's') + ')';
                } else if (numInputs == 0 && this.streams.length == 0) {
                    option.disabled = true;
                    option.innerHTML += ' (requires known dimensions)';
                }
                graphSelect.appendChild(option);
            }
            let selectGraphDiv = document.createElement('div');
            selectGraphDiv.appendChild(graphLabel);
            selectGraphDiv.appendChild(graphSelect);
            selectGraphDiv.appendChild(graphButton);


            shadersDiv.appendChild(formatDiv);
            shadersDiv.appendChild(selectShaderDiv);
            shadersDiv.appendChild(selectGraphDiv);

            //  annotations
            let annotationsDiv = document.createElement('div');
            annotationsDiv.id = 'tabAnnotations';
            annotationsDiv.className = 'tabContent';
            annotationsDiv.style.display = (_state.ui.tabId == 'tabAnnotations' ? 'block' : 'none');

            let table = document.createElement('table');

            for (let windowId = 0; windowId < this.windows.windows.length; windowId++) {
                let windowAnnotations = this.windows.windows[windowId].annotations;

                for (let annotationId = 0; annotationId < windowAnnotations.annotations.length; annotationId++) {

                    let annotation = windowAnnotations.annotations[annotationId];

                    let nameCell = document.createElement('td');
                    if (annotationId == 0) {
                        nameCell.innerHTML = 'window ' + (windowId + 1) + ': ';
                    }

                    let descCell = document.createElement('td');
                    descCell.innerHTML = annotation.description();

                    let aButton = document.createElement('button');
                    aButton.innerHTML = 'Delete';
                    aButton.style.marginLeft = '15px';
                    aButton.addEventListener('click', () => {
                        windowAnnotations.annotations.splice(annotationId, 1);
                        this.updateUIPopup();
                    });
                    let deleteCell = document.createElement('td');
                    deleteCell.appendChild(aButton);

                    let row = document.createElement('tr');
                    row.appendChild(nameCell);
                    row.appendChild(descCell);
                    row.appendChild(deleteCell);
                    table.appendChild(row);
                }
            }
            for (let streamId = 0; streamId < this.streams.length; streamId++) {
                let streamAnnotations = this.streams[streamId].annotations;

                for (let annotationId = 0; annotationId < streamAnnotations.annotations.length; annotationId++) {

                    let annotation = streamAnnotations.annotations[annotationId];

                    let nameCell = document.createElement('td');
                    if (annotationId == 0) {
                        nameCell.innerHTML = 'stream ' + (streamId + 1) + ': ';
                    }

                    let descCell = document.createElement('td');
                    descCell.innerHTML = annotation.description();

                    let aButton = document.createElement('button');
                    aButton.innerHTML = 'Delete';
                    aButton.style.marginLeft = '15px';
                    aButton.addEventListener('click', () => {
                        streamAnnotations.annotations.splice(annotationId, 1);
                        this.updateUIPopup();
                    });
                    let deleteCell = document.createElement('td');
                    deleteCell.appendChild(aButton);

                    let row = document.createElement('tr');
                    row.appendChild(nameCell);
                    row.appendChild(descCell);
                    row.appendChild(deleteCell);
                    table.appendChild(row);
                }
            }
            annotationsDiv.appendChild(table);

            // let annotationsOption = document.createElement('option');
            // annotationsOption.innerHTML = '--- Select annotation ---';
            // annotationsSelect.appendChild(annotationsOption);

            // let annotationsLabel = document.createElement('label');
            // annotationsLabel.innerHTML = 'Annotation: ';
            // let annotationsSelect = document.createElement('select');
            // annotationsSelect.id = 'annotation';
            // annotationsSelect.addEventListener('change', (event) => {
            //     let annotationId = document.getElementById('annotation').selectedIndex - 1;
            // });

            // selectDiv = document.createElement('div');
            // selectDiv.appendChild(annotationsLabel);
            // selectDiv.appendChild(annotationsSelect);

            //annotationsDiv.appendChild(selectDiv);


            this.uiPopup.appendChild(tabs);
            this.uiPopup.appendChild(settingsDiv);
            this.uiPopup.appendChild(streamsDiv);
            this.uiPopup.appendChild(windowsDiv);
            this.uiPopup.appendChild(shadersDiv);
            this.uiPopup.appendChild(annotationsDiv);

            // //  center popup
            // let w = window.getComputedStyle(this.uiPopup).getPropertyValue('width');
            // let h = window.getComputedStyle(this.uiPopup).getPropertyValue('height');
            // let x = Math.trunc((this.canvas.width - w.substring(0, w.indexOf('px'))) / 2);
            // let y = Math.trunc((this.canvas.height - h.substring(0, h.indexOf('px'))) / 2);

            this.updateUiPosition();
        }

        updateUiPosition() {
            this.uiPopup.style.left = (_state.ui.position.x + 'px');
            this.uiPopup.style.top = (_state.ui.position.y + 'px');
        }

        closeUIPopup() {
            this.uiPopup.style.display = 'none';
        }

        convertBase64ToBlob(base64, type) {
            var bytes = window.atob(base64);
            var ab = new ArrayBuffer(bytes.length);
            var ia = new Uint8Array(ab);
            for (var i = 0; i < bytes.length; i++) {
                ia[i] = bytes.charCodeAt(i);
            }
            return new Blob([ab], { type: type });
        }

        writeClipImg() {

            let width = this.streams[0].dimensions.w;
            let height = this.streams[0].dimensions.w;

            const data = new ArrayBuffer(width * height * 4);
            const dataView = new Uint8ClampedArray(data);

            let gl = this.glContext;
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.streams[0].frameBuffer);
            gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, dataView);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);

            let png = new NvisPNG(width, height, dataView);
            // let png = new NvisPNG2(width, height, 8);
            // const redColor = png.createColor(255, 0, 0, 255);
            // png.setPixel(0, 0, redColor);

            let b64 = png.getBase64();
            let blob = this.convertBase64ToBlob(b64, 'image/png');

            let clipboardItem = new ClipboardItem({ 'image/png': blob });

            navigator.clipboard.write([clipboardItem]).then(function () {
                // console.log('Success');
            }, function (err) {
                console.log('Fail: ' + err);
            });

            // console.log('Fetched image copied.');
            this.popupInfo('Copied to clipboard');
        }

        onKeyDown(event) {
            event = event || window.event;
            let keyCode = event.keyCode || event.which;
            let key = event.key;

            if (event.defaultPrevented) {
                return;
            }

            if (key != 'Tab') {
                this.closeUIPopup();
            }

            // if (keyCode != 116)  //  F5
            //     event.preventDefault();

            switch (key) {
                case 'Tab':  //  Tab
                    event.preventDefault();
                    if (this.uiPopup.style.display == 'none' || this.uiPopup.style.display == '') {
                        _state.input.mouse.showInfo = false;
                        this.uiPopup.style.display = 'block';
                        this.updateUIPopup();
                    } else {
                        this.uiPopup.style.display = 'none';
                    }
                    break;
                case 'Shift':  //  Shift
                    _state.input.keyboard.shift = true;
                    break;
                case 'Control':  //  Control
                    _state.input.keyboard.control = true;
                    break;
                case 'ArrowLeft':  //  ArrowLeft
                    _state.animation.dec();
                    this.popupInfo('Frame: ' + (_state.animation.frameId + 1) + ' / ' + _state.animation.numFrames);
                    break;
                case 'ArrowUp':  //  ArrowUp
                    this.windows.incStream(_state.input.mouse.canvasCoords, this.streams, this.shaderGraphs);
                    break;
                case 'ArrowRight':  //  ArrowRight
                    _state.animation.inc();
                    this.popupInfo('Frame: ' + (_state.animation.frameId + 1) + ' / ' + _state.animation.numFrames);
                    break;
                case 'ArrowDown':  //  ArrowDown
                    this.windows.decStream(_state.input.mouse.canvasCoords, this.streams, this.shaderGraphs);
                    break;
                case '1': case '2': case '3': case '4': case '5': case '6': case '7': case '8': case '9':
                    let targetStreamId = parseInt(key) - 1;
                    let streamId = 0;
                    let numStreams = 0;
                    while (streamId < this.streams.length) {
                        if (this.streams[streamId].shaderGraphId == -1 || this.shaderGraphs[this.streams[streamId].shaderGraphId].outputStreamId == streamId) {
                            numStreams++;
                        }
                        if (numStreams - 1 == targetStreamId) {
                            break;
                        }
                        streamId++;
                    }
                    if (streamId < this.streams.length) {
                        this.windows.setWindowStreamId(this.windows.getWindowId(_state.input.mouse.canvasCoords), streamId);
                    }
                    break;
                case ' ':
                    _state.animation.toggleActive();
                    _settings.bAnimate.value = _state.animation.active;
                    this.popupInfo('Animation: ' + (_state.animation.active ? 'on' : 'off'));
                    break;
                case 'a':
                    _state.layout.bAutomatic = !_state.layout.bAutomatic;
                    _settings.bAutomaticLayout.value = _state.layout.bAutomatic;
                    this.popupInfo('Automatic window placement: ' + (_state.layout.bAutomatic ? 'on' : 'off'));
                    this.windows.adjust();
                    break;
                case 'g':
                    _settings.bDrawGrid.value = !_settings.bDrawGrid.value;
                    this.popupInfo('Draw grid: ' + (_settings.bDrawGrid.value ? 'on' : 'off'));
                    break;
                case 'p':
                    _state.animation.togglePingPong();
                    _settings.bPingPong.value = _state.animation.pingPong;
                    this.popupInfo('Animation ping-pong: ' + (_state.animation.pingPong ? 'on' : 'off'));
                    break;
                case 'c':
                    // this.writeClipImg();
                    if (false && _state.input.keyboard.control) {
                        console.log('Clipboard');

                        navigator.permissions.query({ name: 'clipboard-write' }).then(result => {
                            if (result.state === 'granted') {

                                let gl = _renderer.glContext;

                                let mimeType = 'image/png';
                                let data = new ArrayBuffer(200 * 200 * 4);
                                let dataView = new Uint8Array(data);

                                gl.bindFramebuffer(gl.FRAMEBUFFER, _renderer.streams[0].frameBuffer);
                                gl.readPixels(0, 0, 200, 200, gl.RGBA, gl.UNSIGNED_BYTE, dataView);
                                gl.bindFramebuffer(gl.FRAMEBUFFER, null);

                                let blob = new Blob([ dataView ], { mimeType });
                                let clipboardData = new ClipboardItem({ [ mimeType ]: blob });

                                let aBlob = new Blob([ "Hello World!" ], { type: 'text/text' });
                                let asdf = new ClipboardItem({ [ aBlob.type ]: aBlob });
                                navigator.clipboard.writeText([asdf]).then(function(result) {

                                // navigator.clipboard.writeText(clipboardData).then(function(result) {
                                    console.log("Copied to clipboard successfully! " + result);
                                }, function(error) {
                                    console.error("Unable to write to clipboard. Error: " + error);
                                });
                            } else {
                                console.error("clipboard-permission not granted: " + result);
                            }
                        });
                        // let response = navigator.clipboard.write(clipboardData)
                        // .then(
                        //     function () {
                        //         console.log("Clipboard success!");
                        //     },
                        //     function (res) {
                        //         console.log("Clipboard FAIL: " + res);
                        //     }
                        // );
                    }
                    break;
                case 'd':
                    this.windows.deleteAtMouse(_state.input.mouse.canvasCoords);
                    this.updateUIPopup();
                    break;
                case 'l':
                    _state.input.keyboard.shiftDown = false;
                    document.getElementById('fileInput').click();
                    break;
                case 'L':
                    _state.input.keyboard.shiftDown = true;
                    document.getElementById('fileInput').click();
                    break;
                case 'i':
                    _state.input.mouse.showInfo = !_state.input.mouse.showInfo;
                    this.popupInfo('Pixel info overlay: ' + (_state.input.mouse.showInfo ? 'on' : 'off'));
                    break;
                case 'D':
                    if (this.streams.length > 1) {
                        _apiShader('glsl/difference.json', [0, 1], {}, true);
                        //this.renderer.loadShader('glsl/difference.json');
                    }
                    break;
                case 'w':
                    this.windows.add();
                    this.updateUIPopup();
                    break;
                case 's':
                    _state.save = true;
                    _renderer.saveCanvas.render(_renderer.streams[0]);

                    let filename = 'test.png';
                    let data = _renderer.saveCanvas.canvas.toDataURL('image/png');
                    let img = document.createElement('img');
                    img.setAttribute('src', data);
                    let pom = document.createElement('a');
                    pom.setAttribute('href', data);
                    pom.setAttribute('download', filename);
                    pom.style.display = 'none';
                    pom.appendChild(img);
                    document.body.appendChild(_renderer.saveCanvas.canvas);
                    document.body.appendChild(pom);
                    pom.click();
                    document.body.removeChild(pom);
                    document.body.removeChild(_renderer.saveCanvas.canvas);

                    break;
                case 'h':
                    this.helpPopup.style.display = 'block';
                    break;
                case '+':
                    _state.layout.bAutomatic = false;
                    this.windows.inc();
                    this.updateUIPopup();
                    break;
                case '-':
                    _state.layout.bAutomatic = false;
                    this.windows.dec();
                    this.updateUIPopup();
                    break;
                default:
                    console.log('KeyDown not handled, keyCode: ' + keyCode + ', key: ' + key);
                    break;
            }
        }

        onKeyUp(event) {
            event = event || window.event;
            let keyCode = event.keyCode || event.which;
            let key = event.key;

            switch (key) {
                case 'Shift':
                    _state.input.keyboard.shift = false;
                    break;
                case 'Control':
                    _state.input.keyboard.control = false;
                    break;
                case 'h':
                    this.helpPopup.style.display = 'none';
                    break;
                default:
                    // console.log('KeyUp not handled, keyCode: ' + keyCode + ', key: ' + key);
                    break;
            }
        }

        fadeInfoPopup() {
            let opacity = parseFloat(document.getElementById('infoPopup').style.opacity);
            if (opacity > 0.0) {
                document.getElementById('infoPopup').style.opacity = opacity - 0.02;
                setTimeout(() => this.fadeInfoPopup(), 25);
            }
            if (opacity == 0.0) {
                document.getElementById('infoPopup').style.display = 'none';
            }
        }

        popupInfo(text) {
            this.infoPopup.innerHTML = text;
            let currentOpacity = document.getElementById('infoPopup').style.opacity;
            document.getElementById('infoPopup').style.opacity = 1.0;
            document.getElementById('infoPopup').style.display = 'block';
            if (currentOpacity == 0.0) {
                this.fadeInfoPopup();
            }
        }

        onClick(event) {

            //  TODO: pixel info should be triggered here...

            let cCoord = _state.input.mouse.canvasCoords;
            let windowId = this.windows.getWindowId(cCoord);

            if (windowId === undefined) {
                return;
            }

            // let streamId = this.windows.windows[windowId].streamId;
            let pCoord = this.windows.getStreamCoordinates(cCoord, true);

            if (pCoord === undefined) {
                return;
            }

            // let loc = { x: Math.floor(pCoord.x), y: Math.floor(pCoord.y) };
            // let color = this.streams[streamId].getPixelValue(loc);
            // console.log('canvas.onClick(' + JSON.stringify(loc) + '): ' + JSON.stringify(color));
        }

        onMouseDown(event) {
            _state.input.mouse.down = true;
            _state.input.mouse.clickPosition = { x: event.clientX, y: event.clientY };
            // console.log('mouse down');
        }

        onMouseMove(event) {
            _state.input.mouse.previousCanvasCoords = _state.input.mouse.canvasCoords;
            _state.input.mouse.canvasCoords = {
                x: event.clientX - _state.layout.border,
                y: event.clientY - _state.layout.border
            };
            if (this.windows.streamPxDimensions !== undefined && this.windows.winPxDimensions !== undefined) {
                _state.input.mouse.streamCoords = this.windows.getStreamCoordinates(_state.input.mouse.canvasCoords, true);
            }

            if (_state.input.mouse.down) {
                let canvasOffset = {
                    x: _state.input.mouse.previousCanvasCoords.x - _state.input.mouse.canvasCoords.x,
                    y: _state.input.mouse.previousCanvasCoords.y - _state.input.mouse.canvasCoords.y
                }
                if (!_settings.bLockTranslation.value) {
                    this.windows.translate(canvasOffset);
                }
            }
        }

        onMouseUp(event) {
            _state.input.mouse.down = false;
        }

        setWindowStreamId(windowId) {
            let elementId = ('windowStream-' + windowId);
            let newStreamId = document.getElementById(elementId).value;
            this.windows.getWindow(windowId).streamId = newStreamId;
        }

        setupVideo(fileName, frames) {
            let gl = this.glContext;

            let newStream = new NvisStream(this.glContext);
            newStream.fileNames[0] = fileName;

            let dimensions = {
                w: frames[0].width,
                h: frames[0].height
            };
            for (let frameId = 0; frameId < frames.length; frameId++) {
                let frame = frames[frameId];
                let texture = gl.createTexture();
                newStream.textures.push(texture);
                newStream.setDimensions(dimensions);
                newStream.setupTexture(texture, frame, false, dimensions);
            }
            this.streams.push(newStream);
            _state.animation.setNumFrames(newStream.getNumImages());  //  TODO: check
            this.addWindow(this.streams.length - 1);
            this.windows.setStreamPxDimensions(dimensions);
            this.windows.adjust();
        }

        onFileDrop(event) {
            event.stopPropagation();
            event.preventDefault();

            this.closeUIPopup();

            // if (event.clipboardData !== undefined)
            // {
            //     let items = (event.clipboardData || event.originalEvent.clipboardData).items;
            //     let blob = items[0].getAsFile();
            //     console.log('asdf');
            //     return;
            // }

            let shiftDown = _state.input.keyboard.shiftDown;
            _state.input.keyboard.shiftDown = false;

            //  first, try file input
            let files = Array.from(document.getElementById('fileInput').files);
            if (files.length == 0) {
                //  next, paste event
                if (event.clipboardData !== undefined) {
                    let items = (event.clipboardData || event.originalEvent.clipboardData).items;
                    for (let i = 0; i < items.length; i++) {
                        if (items[i].kind == 'file') {
                            files.push(items[i].getAsFile());
                        }
                    }
                } else {
                    //  finally, a drop
                    files = Array.from(event.dataTransfer.files);
                }
            }

            if (files.length == 0) {
                return;
            }

            if (files[0].type.match(/image.*/) || files[0].name.match(/.exr$/) || files[0].name.match(/.pfm$/)) {
                files.sort(function (a, b) {
                    return a.name.localeCompare(b.name);
                });
                if (shiftDown) {
                    let newStream = new NvisStream(this.glContext);
                    newStream.drop(files, this.windows);
                    this.streams.push(newStream);
                    _state.animation.setNumFrames(newStream.getNumImages());  //  TODO: check
                    this.addWindow(this.streams.length - 1);
                } else {
                    for (let i = 0; i < files.length; i++) {
                        let newStream = new NvisStream(this.glContext);
                        newStream.drop([files[i]], this.windows);
                        this.streams.push(newStream);
                        this.addWindow(this.streams.length - 1);
                    }
                    // _state.animation.setNumFrames(newStream.getNumImages());  //  TODO: check
                }
                this.windows.adjust();
            }

            if (files[0].type.match(/video.*/)) {
                let videoParser = new NvisVideoParser((fileName, frames) => _renderer.setupVideo(fileName, frames));
                videoParser.fromBlob(files[0]);
            }

            if (files[0].type.match(/application\/json/)) {
                let reader = new FileReader();
                reader.onload = function (event) {
                    _parseConfig(JSON.parse(event.target.result));
                }
                reader.readAsText(files[0]);
            }

            document.getElementById('fileInput').value = '';  //  force onchange event if same files

            this.canvas.style.borderColor = 'black';
        }

        onFileDragEnter(event) {
            // console.log('onFileDragEnter()');
            this.canvas.style.borderColor = 'green';
            this.windows.welcome.hide();
            event.preventDefault();
        }

        onFileDragOver(event) {
            // console.log('onFileDragOver()');
            event.preventDefault();
        }

        onFileDragLeave(event) {
            // console.log('onFileDragLeave()');
            this.canvas.style.borderColor = 'black';
            this.windows.welcome.show();
            event.preventDefault();
        }

        render() {
            let gl = this.glContext;
            gl.clearColor(0.2, 0.2, 0.2, 1.0);
            gl.clear(this.glContext.COLOR_BUFFER_BIT);

            if (this.windows.windows.length == 0) {
                return;
            }

            this.windows.render(_state.animation.frameId, this.streams, this.shaders, this.shaderGraphs);
        }

        shaderLoaded() {
            //_shaders[shaderId] = shader;
            this.windows.adjust();  //  TODO: is this needed?
        }

        loadShader(jsonFileName, bHidden = false) {
            // this.shaders.load(jsonFileName, function () { this.shaderLoaded(); });
            return this.shaders.load(jsonFileName, () => this.shaderLoaded(), bHidden);
        }

        parseShaderGraph(argument) {

            let json = this.shaderGraphDescriptions[argument.shaderGraphDescriptionId];

            let shaderGraph = new NvisShaderGraph();
            shaderGraph.id = this.shaderGraphs.length;
            shaderGraph.descriptionId = argument.shaderGraphDescriptionId;
            shaderGraph.argument = argument;
            shaderGraph.json = json;
            shaderGraph.inputStreamIds = (argument.inputs === undefined ? [] : argument.inputs);

            if (argument.inputs.length != json.inputs) {
                //  all external inputs must be accounted for
                return;
            }

            let shaderIds = [];
            for (let i = 0; i < json.shaders.length; i++) {
                shaderIds.push(this.loadShader(json.shaders[i], true));
            }

            let numGraphInputs = (json.inputs === undefined ? 0 : json.inputs);
            let graphInputIds = (argument.inputs === undefined ? [] : argument.inputs);
            let streamIdOffset = this.streams.length - graphInputIds.length;
            shaderGraph.streamIdOffset = streamIdOffset;

            for (let i = 0; i < json.graph.length; i++) {

                let shader = json.graph[i];
                let shaderParameters = (shader.parameters === undefined ? {} : shader.parameters);
                //  shader ids are relative the shaderIds array
                let newStream = this.addShaderStream(shaderIds[shader.shaderId]);
                let streamId = this.streams.length - 1;

                shaderGraph.streamIds.push(streamId);
                newStream.shaderGraphId = shaderGraph.id;
                // newStream.shaderGraph.json = json;
                // newStream.shaderGraph.inputStreams = graphInputIds;
                // console.log(' ' + i + ': ' + JSON.stringify(newStream.inputStreams));
                newStream.bFloat = (shaderParameters['float'] === undefined ? true : shaderParameters['float']);
                // delete shaderParameters['float'];

                let shaderInputIds = (shader.inputs === undefined ? [] : shader.inputs);

                if (shaderInputIds.length == 0) {
                    //  generator
                    let dimensions = {
                        w: shaderParameters.width,
                        h: shaderParameters.height
                    };
                    newStream.setDimensions(dimensions);
                } else {

                    let inputStreamIds = [];
                    for (let i = 0; i < shaderInputIds.length; i++) {

                        let inputStreamId = shaderInputIds[i];
                        if (inputStreamId < numGraphInputs) {
                            //  external input
                            inputStreamId = graphInputIds[inputStreamId];
                        } else {
                            inputStreamId += streamIdOffset;
                        }
                        inputStreamIds.push(inputStreamId);
                    }

                    newStream.setInputStreamIds(inputStreamIds);
                }

                if (shader.output !== undefined && shader.output && shaderGraph.outputStreamId == -1) {
                    shaderGraph.outputStreamId = streamId;
                }

                for (let key of Object.keys(shaderParameters)) {
                    newStream.apiParameters[key] = shaderParameters[key];
                }

            }

            this.shaderGraphs.push(shaderGraph);

            if (argument.window === undefined || argument.window) {
                this.addWindow(this.streams.length - 1);
            }

            // console.log('Done parsing shader graph...');
            // console.log('parsing shader graph ' + shaderGraphId + ': ' + JSON.stringify(json));
            // console.log('shaderGraphs: ' + JSON.stringify(this.shaderGraphs));
        }

        loadShaderGraphDescription(jsonFileName) {
            let shaderGraphDescriptionId = this.shaderGraphDescriptions.length;
            this.shaderGraphDescriptions.push(undefined);

            fetch(jsonFileName, { cache: "no-store" })
            .then(response => {
                if (response.ok) {
                    return response.json()
                } else {
                    throw new Error('Could not load shader graph "' + jsonFileName + '"');
                }
            })
            .then(json => {
                this.shaderGraphDescriptions[shaderGraphDescriptionId] = json;
                // console.log('Loaded shader graph: ' + JSON.stringify(json));

                //  handle queued graph invocations
                for (let i = 0; i < this.shaderGraphQueue.length; i++) {
                    if (this.shaderGraphQueue[i].shaderGraphDescriptionId == shaderGraphDescriptionId) {
                        // console.log('Invoking shader graph with shader graph description ' + shaderGraphDescriptionId);
                        this.parseShaderGraph(this.shaderGraphQueue[i]);
                    }
                }
                //  TODO: empty shader graph queue
            });
            // .catch(error => console.log(error));

        }

        newStreamCallback(streamPxDimensions) {
            // console.log('newStreamCallback(' + streamPxDimensions.w + ', ' + streamPxDimensions.h + ')');
            this.windows.setStreamPxDimensions(streamPxDimensions);
            this.windows.adjust();
        }

        loadStream(fileNames) {
            let newStream = new NvisStream(this.glContext);

            //newStream.load(fileNames, (dim) => this.newStreamCallback(dim));
            newStream.load(fileNames, this.windows);

            //  TODO: fix this
            _state.animation.setNumFrames(newStream.getNumImages());

            this.streams.push(newStream);
            this.windows.adjust();

            return this.streams.length - 1;
        }

        addShaderStream(shaderId) {
            let newStream = new NvisStream(this.glContext, shaderId);

            this.streams.push(newStream);
            this.windows.adjust();

            return newStream;
        }

        addWindow(streamId) {
            this.windows.add(streamId);
        }

        getNumStreams = function () {
            return this.streams.length;
        }

        start() {
            //this.render();
            requestAnimationFrame(() => this.animate(0));
            //setInterval(() => this.animate(), 1.0 / (1000 * _state.animation.fps))
        }

        animate(timeStamp) {
            requestAnimationFrame((t) => this.animate(t));

            const elapsed = timeStamp - _state.animation.time;
            _state.animation.time = timeStamp;

            if (_state.animation.performance) {
                document.getElementById('performanceInfo').innerHTML = 'FPS: ' + (1000 / elapsed).toFixed(1);
            }

            if (elapsed >= 1000.0 / _state.animation.fps) {
                _state.animation.update();
                this.render();
            }
        }

    }

    //  Global callbacks

    let _uiOpenTab = function (event, tabId) {
        let oldTabId = _state.ui.tabId;

        // let tabContents = document.getElementsByClassName('tabContent');
        // for (let i = 0; i < tabContents.length; i++) {
        //     tabContents[i].style.display = 'none';
        // }

        document.getElementById(oldTabId).style.display = 'none';
        document.getElementById(tabId).style.display = 'block';

        _state.ui.tabId = tabId;
        let tabs = document.getElementsByClassName('tab');
        for (let i = 0; i < tabs.length; i++) {
            tabs[i].className = tabs[i].className.replace(' active', '');
        }

        event.currentTarget.className += ' active';
    }

    let _uiOnMouseDown = function (event) {
        //event.stopPropagation();
        //event.preventDefault();
        _state.ui.mouseDown = true;
        _state.ui.clickPosition = { x: event.clientX, y: event.clientY };
        // console.log('uiOnMouseDown: ' + JSON.stringify(_state.ui.clickPosition));
        document.body.addEventListener('mousemove', nvis.uiOnMouseMove);
        document.body.addEventListener('mouseup', nvis.uiOnMouseUp);
    }

    let _uiOnMouseMove = function (event) {
        let dist = { x: event.clientX - _state.ui.clickPosition.x, y: event.clientY - _state.ui.clickPosition.y };
        _state.ui.position = { x: _state.ui.previousPosition.x + dist.x, y: _state.ui.previousPosition.y + dist.y };
        _renderer.updateUiPosition();
        // console.log('uiOnMouseMove: position: ' + JSON.stringify(_state.ui.position));
    }

    let _uiOnMouseUp = function (event) {
        _state.ui.mouseDown = false;
        _state.ui.previousPosition = _state.ui.position;
        document.body.removeEventListener('mousemove', nvis.uiOnMouseMove)
        document.body.removeEventListener('mouseup', nvis.uiOnMouseUp);
        // console.log('uiOnMouseUp: ' + JSON.stringify(event));
    }

    let _uiUpdateParameter = function (objectId, elementId, rowId, bAllConditionsMet, bUpdateUI) {
        // console.log('uiUpdateParameter(' + objectId + ', ' + elementId + ', ' + bUpdateUI + ')');

        let key = elementId.replace(/^.*\-/, '');
        let element = document.getElementById(elementId);
        let object = _settings[key];
        let type = object.type;

        if (type == 'bool') {
            object.value = element.checked;
        }
        if (type == 'int' || type == 'float') {
            object.value = element.value;
        }
        if (type == 'dropdown') {
            object.value = element.selectedIndex;
        }

        if (key == 'bAutomaticLayout') {
            _state.layout.bAutomatic = object.value;
            _renderer.windows.adjust();
        }

        if (key == 'layoutWidth') {
            _state.layout.dimensions.w = Math.min(object.value, _renderer.windows.windows.length);
            _renderer.windows.adjust();
        }

        if (key == 'canvasBorder') {
            _state.layout.border = object.value;
            _renderer.windows.adjust();
        }

        if (key == 'bAnimate') {
            _state.animation.active = object.value;
        }

        if (key == 'bPerformance') {
            _state.animation.performance = object.value;
            document.getElementById('performanceInfo').style.display = (object.value ? '' : 'none');
        }

        if (key == 'bPingPong') {
            let bPingPong = object.value;
            _state.animation.pingPong = bPingPong;
            if (!bPingPong) {
                let direction = document.getElementById('settings-direction').selectedIndex;
                _state.animation.direction = (direction == 0 ? 1 : -1);
            }
        }

        if (key == 'direction') {
            _state.animation.direction = (object.value == 0 ? 1 : -1);
        }

        if (key == 'fps') {
            _state.animation.fps = object.value;
        }

        if (key == 'frameId') {
            let frameId = object.value - 1;
            frameId = Math.max(frameId, _state.animation.minFrameId);
            frameId = Math.min(frameId, _state.animation.maxFrameId);
            _state.animation.frameId = frameId;
            object.value = frameId + 1;
            console.log('frameId: ' + object.value);
            document.getElementById('settings-frameId').value = frameId + 1;
            document.getElementById('settings-frameId-value').innerHTML = frameId + 1;
            console.log('frameId: frameId = ' + frameId + ', min = ' + _state.animation.minFrameId + ', max = ' + _state.animation.maxFrameId)
        }

        if (key == 'minFrameId') {
            let minFrameId = Math.min(_state.animation.maxFrameId, object.value - 1);
            _state.animation.minFrameId = minFrameId;
            document.getElementById('settings-minFrameId').value = minFrameId + 1;

            //  adjust frameId
            // let frameId = Math.max(_state.animation.minFrameId, document.getElementById('settings-frameId').value - 1);
            let frameId = Math.max(_state.animation.minFrameId, _state.animation.frameId);
            _state.animation.frameId = frameId;
            _settings.frameId.value = frameId + 1;
            document.getElementById('settings-frameId').value = frameId + 1;
            document.getElementById('settings-frameId-value').innerHTML = frameId + 1;
            console.log('minFrameId: frameId = ' + frameId + ', min = ' + _state.animation.minFrameId + ', max = ' + _state.animation.maxFrameId)
        }

        if (key == 'maxFrameId') {
            let maxFrameId = Math.max(_state.animation.minFrameId, object.value - 1);
            _state.animation.maxFrameId = maxFrameId;
            document.getElementById('settings-maxFrameId').value = maxFrameId + 1;

            //  adjust frameId
            // let frameId = Math.min(_state.animation.maxFrameId, document.getElementById('settings-frameId').value - 1);
            let frameId = Math.min(_state.animation.maxFrameId, _state.animation.frameId);
            _state.animation.frameId = frameId;
            _settings.frameId.value = frameId + 1;
            document.getElementById('settings-frameId').value = frameId + 1;
            document.getElementById('settings-frameId-value').innerHTML = frameId + 1;
            console.log('maxFrameId: frameId = ' + frameId + ', min = ' + _state.animation.minFrameId + ', max = ' + _state.animation.maxFrameId)
        }

        if (key == 'clearAll') {
            _state.animation.numFrames = 0;
            _state.animation.minFrameId = 0;
            _state.animation.maxFrameId = 0;
            _apiClear();
            _renderer.closeUIPopup();
        }

        let elementValue = document.getElementById(elementId + '-value');
        if (elementValue !== null) {
            elementValue.innerHTML = element.value;
        }

        if (bUpdateUI) {
            //console.log('Updating UI');
            _renderer.updateUIPopup();
        }
    }

    let _uiStreamUpdateParameter = function (streamId, elementId, bUpdateUI) {
        // console.log('uiStreamUpdateParamter(' + streamId + ', ' + elementId + ')');
        _renderer.streams[streamId].uiUpdate(elementId, _renderer.shaderGraphs);
        if (bUpdateUI) {
            _renderer.updateUIPopup();
        }
    }

    let _uiStreamUpdateInput = function (streamId, inputId) {
        let elementId = ('input-' + streamId + '-' + inputId);
        let el = document.getElementById(elementId);
        let inputStreamId = parseInt(el.value);

        // console.log('uiStreamUpdateInput(' + streamId + ', ' + inputId + '): ' + inputStreamId);

        let stream = _renderer.streams[streamId];
        let shaderGraphId = stream.shaderGraphId;

        if (shaderGraphId == -1) {
            _renderer.streams[streamId].setInputStreamId(inputId, inputStreamId);
        } else {
            _renderer.shaderGraphs[shaderGraphId].inputStreamIds[inputId] = inputStreamId;
        }
    }

    let _uiSetWindowStreamId = function (windowId) {
        _renderer.setWindowStreamId(windowId);
    }

    let _uiAddWindow = function () {
        _renderer.windows.add();
        _renderer.updateUIPopup();
    }

    let _uiDeleteWindow = function (windowId) {
        _renderer.windows.delete(windowId);
        _renderer.updateUIPopup();
    }

    let _uiDeleteStream = function (deleteStreamId) {

        let numStreams = _renderer.streams.length;

        if (numStreams == 1) {
            _apiClear();
            _renderer.closeUIPopup();
            return;
        }

        let updateWindowIds = [];
        for (let windowId = 0; windowId < _renderer.windows.windows.length; windowId++) {
            let window = _renderer.windows.windows[windowId];
            if (window.streamId >= deleteStreamId) {
                updateWindowIds.push(windowId);
            }
        }


        //  find replacement stream id as input, require one without inputs
        let replacementStreamId = undefined;
        for (let streamId = 0; streamId < numStreams; streamId++) {
            let stream = _renderer.streams[streamId];
            if (stream.inputStreamIds.length == 0 && streamId != deleteStreamId) {
                replacementStreamId = streamId;
                break;
            }
        }
        if (replacementStreamId !== undefined && replacementStreamId > deleteStreamId) {
            replacementStreamId--;
        }

        let deleteStreamIds = [];
        deleteStreamIds.push(deleteStreamId);
        for (let streamId = 0; streamId < numStreams; streamId++) {
            let stream = _renderer.streams[streamId];
            for (let inputId = 0; inputId < stream.inputStreamIds.length; inputId++) {
                if (stream.inputStreamIds[inputId] == deleteStreamId) {
                    if (replacementStreamId === undefined) {
                        deleteStreamIds.push(streamId);
                    } else {
                        stream.inputStreamIds[inputId] = replacementStreamId;
                    }
                }
            }
        }

        // console.log('streams: ' + JSON.stringify(deleteStreamIds));
        // console.log('windows: ' + JSON.stringify(updateWindowIds));

        for (let streamId = deleteStreamIds.length - 1; streamId >= 0; streamId--) {
            _renderer.streams.splice(deleteStreamIds[streamId], 1);
        }
        if (replacementStreamId !== undefined) {
            for (let windowId = 0; windowId < updateWindowIds.length; windowId++) {
                _renderer.windows.windows[updateWindowIds[windowId]].streamId = replacementStreamId;
            }
        } else {
            _renderer.windows.clear();
            _renderer.closeUIPopup();
        }

        _renderer.windows.adjust();
        _renderer.updateUIPopup();
    }


    return {
        //  API
        clear: _apiClear,
        zoom: _apiZoom,
        position: _apiPosition,
        translate: _apiTranslate,
        annotation: _apiAnnotation,
        stream: _apiStream,
        shaders: _apiShaders,
        shader: _apiShader,
        graphs: _apiGraphs,
        graph: _apiGraph,
        generator: _apiGenerator,
        config: _apiConfig,
        window: _apiWindow,
        video: _apiVideo,
        //  UI events
        uiStreamUpdateParameter: _uiStreamUpdateParameter,
        uiStreamUpdateInput: _uiStreamUpdateInput,
        uiSetWindowStreamId: _uiSetWindowStreamId,
        uiAddWindow: _uiAddWindow,
        uiDeleteWindow: _uiDeleteWindow,
        uiDeleteStream: _uiDeleteStream,
        uiOpenTab: _uiOpenTab,
        uiOnMouseDown: _uiOnMouseDown,
        uiOnMouseUp: _uiOnMouseUp,
        uiOnMouseMove: _uiOnMouseMove,
        uiUpdateParameter: _uiUpdateParameter
    }

}
