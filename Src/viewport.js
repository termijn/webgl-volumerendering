var Viewport = function(canvas, fpsCallback) {
    this.lastDrawTime = performance.now() / 1000;

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

    this.showFps = function() {
        if (fpsCallback) {
            this.nrFrames++;
            var now = performance.now() / 1000;
            var delta = now - this.lastDrawTime;
            if (delta >= 1.0) {
                var fps = this.nrFrames / delta;
                fpsCallback(Math.round(fps) + ' f/s');
                this.lastDrawTime = now;
                this.nrFrames = 0;
            }
        }
    }

    this.draw = function() {
        var self = this;

        self.showFps();

        self.gl.clearDepth(1.0);
        self.gl.clearColor(0.0, 0.0, 0.0, 0.0);
        self.gl.clear(self.gl.COLOR_BUFFER_BIT);
    
        this.renderers.forEach(renderer => {
            renderer.draw(self.gl);
        });
        
        requestAnimationFrame(function() { self.draw();});
    };
}

// Returns +1 for a single wheel roll 'up', -1 for a single roll 'down'
function wheelDistance(evt){
    if (!evt) evt = event;
    var w=evt.wheelDelta, d=evt.detail;
    if (d){
      if (w) return w/d/40*d>0?1:-1; // Opera
      else return -d/3;              // Firefox;
    } else return w/120;             // IE/Safari/Chrome
  };

function main() {
    const canvas = document.querySelector("#viewport");
    var viewport = new Viewport(canvas, function(fps) {
        var span = document.querySelector("#labelFps");
        span.innerHTML = fps;
    });

    var volume = new VolumeRenderer(viewport.gl);
    viewport.renderers.push(volume);

    requestAnimationFrame(function() { viewport.draw(); });

    const labelWindowLevel = document.querySelector("#labelWindowLevel");
    const offsetSlider = document.querySelector("#offsetSlider");
    offsetSlider.addEventListener('input', function(e) {
        var value = parseFloat(e.target.value);
        labelWindowLevel.innerHTML = "Window level (" + e.target.value + ")";
        volume.setWindowLevel(parseFloat(value));
    });

    const widthSlider = document.querySelector("#widthSlider");
    widthSlider.addEventListener('input', function(e) {
        var value = e.target.value;
        volume.setWindowWidth(parseFloat(value));
    });

    const sliderSamplingRate = document.querySelector("#sliderSamplingRate");
    const labelSamplingRate = document.querySelector("#labelSamplingRate");
    sliderSamplingRate.addEventListener('input', function(e) {
        var value = parseInt(e.target.value);
        switch(value) {
            case 0: labelSamplingRate.innerHTML = "Sampling rate (0.25x)"; volume.setSampleRate(0.25); break;
            case 1: labelSamplingRate.innerHTML = "Sampling rate (0.5x)"; volume.setSampleRate(0.5); break;
            case 2: labelSamplingRate.innerHTML = "Sampling rate (1x)"; volume.setSampleRate(1.0); break;
            case 3: labelSamplingRate.innerHTML = "Sampling rate (2x)"; volume.setSampleRate(2.0); break;
            case 4: labelSamplingRate.innerHTML = "Sampling rate (4x)"; volume.setSampleRate(4.0); break;
        }
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
            renderer.mouseWheel(wheelDistance(e));
        });
    });

    const progressbarLoading = document.querySelector(".progress-bar");
    const progressPanel = document.querySelector(".progress");
    document.addEventListener('loading', function(e) {
        console.log("loading event" + e.detail);
        progressbarLoading.style.width = e.detail.toString() + '%';
        progressbarLoading.setAttribute('aria-valuenow', e.detail);

        if (e.detail == 100) {
            progressPanel.style.visibility = 'hidden';
        }
    });
}

window.onload = main;