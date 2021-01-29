var Viewport = function(gl) {
    this.renderers = [];
    this.gl = gl;

    this.draw = function() {
        var self = this;
        gl.clearDepth(1.0);
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
    
        this.renderers.forEach(renderer => {
            renderer.draw(self.gl);
        });
        
        requestAnimationFrame(function() { self.draw();});
    };
}

function main() {
    const canvas = document.querySelector("#viewport");

    gl = canvas.getContext("webgl2"),
    {
      width,
      height
    } = canvas.getBoundingClientRect();
    
    if (gl === null) {
        alert("Unable to initialize WebGL. Your browser or machine may not support it.");
        return;
    }

    var viewport = new Viewport(gl);
    var volume = new VolumeRenderer(gl);
    viewport.renderers.push(volume);

    requestAnimationFrame(function() { viewport.draw(); });
}

window.onload = main;