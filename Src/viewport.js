var Viewport = function(canvas) {
    this.gl = canvas.getContext("webgl2"),
    {
      width,
      height
    } = canvas.getBoundingClientRect();

    if (this.gl === null) {
        alert("Unable to initialize WebGL. Your browser or machine may not support it.");
        return;
    }

    this.renderers = [];

    this.draw = function() {
        var self = this;
        self.gl.clearDepth(1.0);
        self.gl.clearColor(0.0, 0.0, 0.0, 0.0);
        self.gl.clear(self.gl.COLOR_BUFFER_BIT);
    
        this.renderers.forEach(renderer => {
            renderer.draw(self.gl);
        });
        
        requestAnimationFrame(function() { self.draw();});
    };
}

function main() {
    const canvas = document.querySelector("#viewport");
    var viewport = new Viewport(canvas);

    var volume = new VolumeRenderer(viewport.gl);
    viewport.renderers.push(volume);

    requestAnimationFrame(function() { viewport.draw(); });

    const offsetSlider = document.querySelector("#offsetSlider");
    offsetSlider.addEventListener('input', function(e) {
        var value = e.target.value;
        volume.setWindowLevel(parseFloat(value));
    });

    const widthSlider = document.querySelector("#widthSlider");
    widthSlider.addEventListener('input', function(e) {
        var value = e.target.value;
        volume.setWindowWidth(parseFloat(value));
    });    

    canvas.addEventListener('mousedown', function(e) {
        var e = window.event || e;
        if (e.button == 0) {
            viewport.renderers.forEach(renderer => {
                renderer.mouseDown(e);
            });
        }
    });

    canvas.addEventListener('mousemove', function(e) {
        var e = window.event || e;
        viewport.renderers.forEach(renderer => {
            renderer.mouseMove(e);
        });
    });

    canvas.addEventListener('mouseup', function(e) {
        var e = window.event || e;
        if (e.button == 0) {
            viewport.renderers.forEach(renderer => {
                renderer.mouseUp(e);
            });
        }
    });

    canvas.addEventListener('wheel', function(e) {
        viewport.renderers.forEach(renderer => {
            renderer.mouseWheel(e);
        });
    });
}

window.onload = main;