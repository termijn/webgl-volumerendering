var vec3 = glMatrix.vec3;
var mat4 = glMatrix.mat4;

// Converts the given integer into a half float.
var toHalfFloat = (function() {
    var floatView = new Float32Array(1);
    var int32View = new Int32Array(floatView.buffer);
    return function toHalfFloat(val) { 
      floatView[0] = val;
      var x = int32View[0];
 
      var bits = (x >> 16) & 0x8000;
      var m = (x >> 12) & 0x07ff;
      var e = (x >> 23) & 0xff;
 
      if (e < 103) {
        return bits;
      }
 
      if (e > 142) {
        bits |= 0x7c00;
        bits |= ((e == 255) ? 0 : 1) && (x & 0x007fffff);
        return bits;
      }
      if (e < 113) {
        m |= 0x0800;
        bits |= (m >> (114 - e)) + ((m >> (113 - e)) & 1);
        return bits;
      }
      bits |= ((e - 112) << 10) | (m >> 1);
      bits += m & 1;
      return bits;
    };
 }());

var VolumeRenderer = function(gl, fileUrl, rescaleSlope, rescaleIntercept, widthInMM, heightInMM, lengthInMM) {

    this.widthInMM = parseFloat(widthInMM);
    this.heightInMM = parseFloat(heightInMM);
    this.lengthInMM = parseFloat(lengthInMM);

    this.loadVolume = function(url) {
        return new Promise((resolve, reject) => {
            var req = new XMLHttpRequest();
            req.open("GET", url, true);
	        req.responseType = "arraybuffer";
            req.onprogress = function(evt) {
                const event = new CustomEvent('loading', { detail: evt.loaded / evt.total * 100 });
                document.dispatchEvent(event);
            };
            req.onerror = function(evt) {
                console.log(evt);
            };
            req.onload = function(evt) {
                var dataBuffer = req.response;
                if (dataBuffer) {
                    dataBuffer = new Uint16Array(dataBuffer);

                    // Encode data as half-floats. Javascript doesn't support Float16 arrays, so
                    // we store it in a Uint16Array.
                    var converted = new Uint16Array(dataBuffer.length);
                    for (var i = 0; i < converted.length; i++) {
                        converted[i] = toHalfFloat(dataBuffer[i]);
                    }

                    console.log("volume loaded");
                    resolve(converted);
                } else {
                    alert("Unable to load buffer properly from volume?");
                    console.log("no buffer?");
                }
            };
            req.send();
        });
    }

    this.transform = function(v, m) {
        var newVector = vec3.create();
        vec3.transformMat4(newV, v, m);
        return newVector;
    }

    this.mouseDown = function(e) {
        this.isMouseDragging = true;
        this.startPosition = { x: e.clientX, y: e.clientY };
    }

    this.mouseMove = function(e) {
        if (!this.isMouseDragging) return;

        var delta = { x: e.clientX - this.startPosition.x, y: e.clientY - this.startPosition.y };

        var cameraToModel = mat4.create();
        mat4.multiply(cameraToModel, this.worldToModel, this.cameraToWorld);

        var xRay = vec3.fromValues(1,0,0);
        var xRayO = vec3.fromValues(0,0,0);
        vec3.transformMat4(xRay, xRay, cameraToModel);
        vec3.transformMat4(xRayO, xRayO, cameraToModel);
        vec3.subtract(xRay, xRay, xRayO);

        var yRay = vec3.fromValues(0,1,0);
        var yRayO = vec3.fromValues(0,0,0);
        vec3.transformMat4(yRay, yRay, cameraToModel);
        vec3.transformMat4(yRayO, yRayO, cameraToModel);
        vec3.subtract(yRay, yRay, yRayO);

        glMatrix.mat4.rotate(
            this.rotation,
            this.rotation,
            delta.y * 0.007,
            xRay);
        glMatrix.mat4.rotate(
            this.rotation,
            this.rotation,
            delta.x * 0.007,
            yRay);

        this.startPosition = { x: e.clientX, y: e.clientY };
    }

    this.mouseUp = function(e) {
        this.isMouseDragging = false;
    }

    this.mouseWheel = function(distance) {
        this.fieldOfView = Math.min(Math.PI / 180 * 120, Math.max(Math.PI / 180 * 5, this.fieldOfView * Math.pow(2, -distance / 10.0)));
    }

    this.createCubeStrip = function() {
        return [
            1, 1, 0,
            0, 1, 0,
            1, 1, 1,
            0, 1, 1,
            0, 0, 1,
            0, 1, 0,
            0, 0, 0,
            1, 1, 0,
            1, 0, 0,
            1, 1, 1,
            1, 0, 1,
            0, 0, 1,
            1, 0, 0,
            0, 0, 0
        ];
    }

    this.createVertexBuffer = function(gl, cubeStrip) {
        var vao = gl.createVertexArray();
        gl.bindVertexArray(vao);

        var vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cubeStrip), gl.STATIC_DRAW);

        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    }

    this.draw = function() {
        if (!this.loaded) {
            return;
        }
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.useProgram(this.shaderProgram);
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.FRONT);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        var translationToCenter = glMatrix.mat4.create();
        glMatrix.mat4.fromTranslation(translationToCenter, vec3.fromValues(-0.5, -0.5, -0.5));

        var scaling = glMatrix.mat4.create();
        glMatrix.mat4.fromScaling(scaling, vec3.fromValues(this.widthInMM, this.heightInMM, this.lengthInMM));
        
        var modelToWorld = glMatrix.mat4.create();
        glMatrix.mat4.multiply(modelToWorld, translationToCenter, modelToWorld);
        glMatrix.mat4.multiply(modelToWorld, scaling, modelToWorld);
        glMatrix.mat4.multiply(modelToWorld, this.rotation, modelToWorld);

        var worldToCamera = glMatrix.mat4.create();
        glMatrix.mat4.translate(worldToCamera, worldToCamera, vec3.fromValues(0,0,-300));

        var projectionMatrix = glMatrix.mat4.create();
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const zNear = 1;
        const zFar = -400;

        glMatrix.mat4.perspective(
            projectionMatrix,
            this.fieldOfView,
            aspect,
            zNear,
            zFar);

        gl.uniformMatrix4fv(this.getUniformLocation("modelToWorld"), false, modelToWorld);
        gl.uniformMatrix4fv(this.getUniformLocation("worldToCamera"), false, worldToCamera);
        gl.uniformMatrix4fv(this.getUniformLocation("cameraToClipSpace"), false, projectionMatrix);

        this.worldToModel = glMatrix.mat4.create();
        glMatrix.mat4.invert(this.worldToModel, modelToWorld);

        this.cameraToWorld = glMatrix.mat4.create();
        glMatrix.mat4.invert(this.cameraToWorld, worldToCamera);

        var clipSpaceToCamera = glMatrix.mat4.create();
        glMatrix.mat4.invert(clipSpaceToCamera, projectionMatrix);

        gl.uniformMatrix4fv(this.getUniformLocation("worldToModel"), false, this.worldToModel);
        gl.uniformMatrix4fv(this.getUniformLocation("cameraToWorld"), false, this.cameraToWorld);
        gl.uniformMatrix4fv(this.getUniformLocation("clipSpaceToCamera"), false, clipSpaceToCamera);

        var lightInCameraSpace = vec3.fromValues(100.0,100.0,100.0);
        var lightInModelSpace = vec3.create();
        vec3.transformMat4(lightInModelSpace, lightInCameraSpace, this.cameraToWorld);
        vec3.transformMat4(lightInModelSpace, lightInModelSpace, this.worldToModel);
        gl.uniform3fv(this.getUniformLocation("lightPosition"), [lightInModelSpace[0], lightInModelSpace[1], lightInModelSpace[2]]);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.cubeStrip.length/3);
        gl.finish();
    }

    this.getUniformLocation = function(name) {
        return gl.getUniformLocation(this.shaderProgram, name);
    }

    this.setWindowLevel = function(value) {
        gl.uniform1f(this.getUniformLocation("windowLevel"), value);
    }

    this.setWindowWidth = function(value) {
        gl.uniform1f(this.getUniformLocation("windowWidth"), value);
    }

    this.createTexture1D = function(gl, textureId, values) {
        gl.useProgram(this.shaderProgram);
        var texture = gl.createTexture();
        gl.activeTexture(textureId);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.R32F, values.length, 1);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0,0, values.length, 1, gl.RED, gl.FLOAT, values);
    }

    this.createOpacitySamplesTexture = function(gl, samples) {
        this.createTexture1D(gl, gl.TEXTURE2, samples);
        gl.uniform1i(this.getUniformLocation('opacityMapSamples'), 2);
    }

    this.createOpacityPositionsTexture = function(gl, positions) {
        this.createTexture1D(gl, gl.TEXTURE1, positions);
        gl.uniform1i(this.getUniformLocation('opacityMapPositions'), 1);
        gl.uniform1i(this.getUniformLocation('numberOfOpacitySamples'), positions.length);
    }

    this.createColorPositionsTexture = function(gl, positions) {
        this.createTexture1D(gl, gl.TEXTURE3, positions);
        gl.uniform1i(this.getUniformLocation('colorMapPositions'), 3);
        gl.uniform1i(this.getUniformLocation('numberOfColorSamples'), positions.length);
    }

    this.createVolumeTexture16 = function(gl) {
        gl.useProgram(this.shaderProgram);

        var texture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_3D, texture);
        gl.texStorage3D(gl.TEXTURE_3D, 1, gl.R16F, this.width, this.height, this.slices);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 0, 
            this.width, this.height, this.slices, 
            gl.RED, gl.HALF_FLOAT, this.voxels);
        gl.uniform1i(this.getUniformLocation("volume"), 0);
    }

    // opacityMap: [{position, opacity}]
    this.setOpacityMap = function(opacityMap) {
        var positions = new Float32Array(opacityMap.length);
        var samples = new Float32Array(opacityMap.length);

        opacityMap.forEach((element, index) => {
            positions[index] = element.position;
            samples[index] = element.opacity;
        });
        this.createOpacityPositionsTexture(gl, positions);
        this.createOpacitySamplesTexture(gl, samples);
    }

    this.createOpacityMap = function() {
        var positions = new Float32Array([90, 228, 330, 499]);
        this.createOpacityPositionsTexture(gl, positions);

        var opacitySamples = new Float32Array([0, 0.14027,0.38847, 0.93663]);
        this.createOpacitySamplesTexture(gl, opacitySamples);
    }

    this.createColorMapSamplesTexture = function(gl, colors) {
        gl.useProgram(this.shaderProgram);
        var texture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE4);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGB16F, colors.length / 3, 1);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0,0, colors.length / 3, 1, gl.RGB, gl.FLOAT, colors);
        gl.uniform1i(this.getUniformLocation("colorMapSamples"), 4);
    }

    this.createColorMap = function(gl) {
        var positions = new Float32Array([-770.0, -144.0, 62.0, 158.0, 210.0, 259.0, 466.0, 2001.0, 3071.0]);
        this.createColorPositionsTexture(gl, positions);

        var samples = new Float32Array([
            0.79, 0.88, 0.82,
            1.0, 0.78, 0.7,
            0.73, 0.0, 0.03,
            1.0, 0.14, 0.17,
            1.0, 0.35, 0.17,
            1.0, 0.64, 0.11,
            0.94, 0.92, 0.73,
            1.0, 1.0, 1.0,
            1.0, 0.96, 0.99
        ]);
        this.createColorMapSamplesTexture(gl, samples);
    }

    this.setSampleRate = function(value) {
        gl.uniform1f(this.getUniformLocation("dt_scale"), 1.0 / value);
    }

    this.init = function(gl) {
        this.gl = gl;
        var self = this;
        self.loaded = false;

        var vertexShaderPromise = shaderutils.loadShaderSource("volumerenderer.vert");
        var fragmentShaderPromise = shaderutils.loadShaderSource("volumerenderer.frag");

        var fileRegex = /.*_(\d+)x(\d+)x(\d+)_*.*/;
        var m = fileUrl.match(fileRegex);
        var volumeDimensions = [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
        this.fieldOfView = Math.PI / 180 * 90;
        
        var loadVolumePromise = this.loadVolume(fileUrl);

        Promise.all([vertexShaderPromise, fragmentShaderPromise, loadVolumePromise]).then((promises) => {
            self.vertexShader = promises[0];
            self.fragmentShader = promises[1];
            self.shaderProgram = shaderutils.createShaderProgram(gl, self.vertexShader, self.fragmentShader);
            gl.useProgram(self.shaderProgram);

            self.cubeStrip = self.createCubeStrip();
            self.voxels = promises[2];
            self.width = volumeDimensions[0];
            self.height = volumeDimensions[1];
            self.slices = volumeDimensions[2];
            self.rotation = glMatrix.mat4.create();
            
            self.createVertexBuffer(gl, self.cubeStrip);
            self.createVolumeTexture16(gl);
            
            self.createOpacityMap();
            self.createColorMap(gl);

            var longestAxis = Math.max(self.width, Math.max(self.height, self.slices));
            self.volScale = [
                self.width / longestAxis, 
                self.height / longestAxis,
                self.slices / longestAxis];
            gl.uniform3iv(self.getUniformLocation("volume_dims"), [self.width, self.height, self.slices]);
            
            this.setSampleRate(2.0);

            gl.uniform1f(this.getUniformLocation("rescaleIntercept"), parseFloat(rescaleIntercept));
            gl.uniform1f(this.getUniformLocation("rescaleSlope"), parseFloat(rescaleSlope));

            self.setWindowWidth(1048);
            self.setWindowLevel(0);

            self.loaded = true;
            console.log("Renderer loaded");
        });
    }
    this.init(gl);
}