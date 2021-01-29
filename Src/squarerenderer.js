var SquareRenderer = function(gl) {
    this.gl = gl;
    this.vertexShader = `
            attribute vec4 aVertexPosition;
    
            uniform mat4 uModelViewMatrix;
            uniform mat4 uProjectionMatrix;
    
            void main() {
                gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
            }
        `;
    this.fragmentShader = `
            void main() {
                gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
            }
        `;

    this.draw = function() {
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL); // Near things obscure far things

        const fieldOfView = 45 * Math.PI / 180;   // in radians
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const zNear = 0.1;
        const zFar = 100.0;
        const projectionMatrix = glMatrix.mat4.create();

        glMatrix.mat4.perspective(
            projectionMatrix,
            fieldOfView,
            aspect,
            zNear,
            zFar);
      
        glMatrix.mat4.rotate(
            this.modelViewMatrix,
            this.modelViewMatrix,
            0.01,
            [0, 0, 1]);

        {
          const numComponents = 2;  // pull out 2 values per iteration
          const type = gl.FLOAT;    // the data in the buffer is 32bit floats
          const normalize = false;  // don't normalize
          const stride = 0;         // how many bytes to get from one set of values to the next
                                    // 0 = use type and numComponents above
          const offset = 0;         // how many bytes inside the buffer to start from
          gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
          gl.vertexAttribPointer(
              this.attribLocations.vertexPosition,
              numComponents,
              type,
              normalize,
              stride,
              offset);
          gl.enableVertexAttribArray(
              this.attribLocations.vertexPosition);
        }
      
        gl.useProgram(this.shaderProgram);
        gl.uniformMatrix4fv(
            this.uniformLocations.projectionMatrix,
            false,
            projectionMatrix);
        gl.uniformMatrix4fv(
            this.uniformLocations.modelViewMatrix,
            false,
            this.modelViewMatrix);
        {
          const offset = 0;
          const vertexCount = 4;
          gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
        }
    }

    this.shaderProgram = shaderutils.createShaderProgram(gl, this.vertexShader, this.fragmentShader);
    this.attribLocations = {
        vertexPosition: gl.getAttribLocation(this.shaderProgram, 'aVertexPosition'),
        },
    this.uniformLocations = {
        projectionMatrix: gl.getUniformLocation(this.shaderProgram, 'uProjectionMatrix'),
        modelViewMatrix: gl.getUniformLocation(this.shaderProgram, 'uModelViewMatrix'),
        },

    this.modelViewMatrix = glMatrix.mat4.create();
    glMatrix.mat4.translate(this.modelViewMatrix,     // destination matrix
        this.modelViewMatrix,     // matrix to translate
                    [-0.0, 0.0, -6.0]);  // amount to translate

    console.log("Renderer loaded");

    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    const positions = [
        -1.0,  1.0,
        1.0,  1.0,
        -1.0, -1.0,
        1.0, -1.0,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
}