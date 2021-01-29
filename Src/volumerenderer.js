var vec3 = glMatrix.vec3;
var mat4 = glMatrix.mat4;

var VolumeRenderer = function(gl) {

    this.loadVolume = function(url) {
        return new Promise((resolve, reject) => {
            var req = new XMLHttpRequest();
            req.open("GET", url, true);
	        req.responseType = "arraybuffer";
            req.onprogress = function(evt) {
                console.log(evt);
            };
            req.onerror = function(evt) {
                console.log(evt);
            };
            req.onload = function(evt) {
                var dataBuffer = req.response;
                if (dataBuffer) {
                    dataBuffer = new Uint16Array(dataBuffer);
                    console.log("volume loaded");
                    resolve(dataBuffer);
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

    this.mouseWheel = function(e) {
        
        this.fieldOfView = Math.min(Math.PI / 180 * 120, Math.max(Math.PI / 180 * 5, this.fieldOfView * Math.pow(2, e.deltaY / 1000.0)));
    }

    this.createVolume = function() {
        this.width = 100;
        this.height = 100;
        this.slices = 100;
        var result = new Uint8Array(this.width * this.height * this.slices);
        for(var z = 0; z < this.slices; z++) {
            for(var y = 0; y < this.height; y++) {
                for (var x = 0; x < this.width; x++) {

                    var position = vec3.fromValues(x, y, z);
                    var center = vec3.fromValues(this.width / 2.0, this.height / 2.0, this.slices / 2.0);
                    var fromCenter = vec3.create();
                    vec3.subtract(fromCenter, position, center);

                    var distance = vec3.length(fromCenter);
                    var fraction = Math.min(distance / (this.width / 2.0), 1);
                    var intensity = distance / (this.width / 2.0) < 1 ? 255 : 0;
                    //var intensity = 255 - fraction * 255;
                    result[(z * this.width * this.height) + y * this.width + x] = intensity;
                }
            }
        }

        return result;
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

        gl.useProgram(this.shaderProgram);
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.FRONT);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        var translationToCenter = glMatrix.mat4.create();
        glMatrix.mat4.fromTranslation(translationToCenter, vec3.fromValues(-0.5, -0.5, -0.5));

        var scaling = glMatrix.mat4.create();
        glMatrix.mat4.fromScaling(scaling, vec3.fromValues(150,150,150));
        
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

        var lightInCameraSpace = vec3.fromValues(300.0,300.0,300.0);
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

    this.setBrightness = function(value) {
        gl.uniform1f(this.getUniformLocation("brightness"), value);
    }

    this.createVolumeTexture = function(gl) {
        gl.useProgram(this.shaderProgram);

        var texture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_3D, texture);
        gl.texStorage3D(gl.TEXTURE_3D, 1, gl.R8, this.width, this.height, this.slices);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 0, 
            this.width, this.height, this.slices, 
            gl.RED, gl.UNSIGNED_BYTE, this.voxels);
    }

    this.createVolumeTexture16 = function(gl) {
        gl.useProgram(this.shaderProgram);

        var texture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_3D, texture);
        gl.texStorage3D(gl.TEXTURE_3D, 1, gl.R16UI, this.width, this.height, this.slices);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 0, 
            this.width, this.height, this.slices, 
            gl.RED_INTEGER, gl.UNSIGNED_SHORT, this.voxels);
    }    

    this.init = function(gl) {
        this.gl = gl;
        var self = this;
        self.loaded = false;

        var vertexShaderPromise = shaderutils.loadShaderSource("volumerenderer.vert");
        var fragmentShaderPromise = shaderutils.loadShaderSource("volumerenderer.frag");

        var file = "engine_256x256x128_uint8.raw";
        var file = "spine_256x256x256_uint16.raw";
        //var file = "bonsai_256x256x256_uint8.raw";
        //var file = "skull_256x256x256_uint8.raw";
        //var file = "foot_256x256x256_uint8.raw";
        //var file = "vertebra_512x512x512_uint16.raw";
        //var file = "ct_512x512x448_uint16.raw";
        
        var fileRegex = /.*_(\d+)x(\d+)x(\d+)_*.*/;
        var m = file.match(fileRegex);
        var volumeDimensions = [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
        this.fieldOfView = Math.PI / 180 * 90;
        
        var loadVolumePromise = this.loadVolume(file);

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
     
            var longestAxis = Math.max(self.width, Math.max(self.height, self.slices));
            self.volScale = [
                self.width / longestAxis, 
                self.height / longestAxis,
                self.slices / longestAxis];
            gl.uniform3iv(self.getUniformLocation("volume_dims"), [self.width, self.height, self.slices]);
            gl.uniform1i(self.getUniformLocation("volume"), 0);
            gl.uniform1f(self.getUniformLocation("dt_scale"), 0.25);

            // spine
            gl.uniform1f(this.getUniformLocation("rescaleIntercept"), -1200);
            gl.uniform1f(this.getUniformLocation("rescaleSlope"), 0.06408789196612);

            // CT
            // gl.uniform1f(this.getUniformLocation("rescaleIntercept"), -1024);
            // gl.uniform1f(this.getUniformLocation("rescaleSlope"), 1);

            self.setWindowWidth(1048);
            self.setWindowLevel(1048);

            self.loaded = true;
            console.log("Renderer loaded");
        });
    }
    this.init(gl);
}