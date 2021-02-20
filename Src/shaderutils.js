var shaderutils = {
    createShaderProgram: function(gl, vertexShaderSource, fragmentShaderSource) {
        const vertexShader = this.loadShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.loadShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
      
        const shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);
      
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
          console.log('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
          return null;
        }
      
        return shaderProgram;
    },

    loadShader: function(gl, type, source) {
        const shader = gl.createShader(type);

        gl.shaderSource(shader, source);
        gl.compileShader(shader);
      
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
          gl.deleteShader(shader);
          return null;
        }
      
        return shader;
    },
    loadShaderSource: function(url) {
      return new Promise((resolve, reject) => {
        var request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.setRequestHeader('Cache-Control', 'no-cache');
        request.addEventListener('load', function() {
          resolve(request.responseText);
        });
        request.send();
    })}
}