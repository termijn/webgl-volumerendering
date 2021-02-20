var Viewport = function(canvas, fpsCallback) {
    this.lastDrawTime = performance.now() / 1000;
    this.valid = false;
    this.maxResolution = 4;
    this.adaptiveResolution = true;
    this.renderers = [];

    this.gl = canvas.getContext("webgl2", {preserveDrawingBuffer: true}),
    {
      width,
      height
    } = canvas.getBoundingClientRect();

    if (this.gl === null) {
        alert("Unable to initialize WebGL 2. Your browser or machine may not support it.");
        return;
    }

    this.setAdaptiveResolution = function(isEnabled) {
        this.adaptiveResolution = isEnabled;
        this.invalidate();
    }

    this.invalidate = function() {
        this.valid = false;
        this.lastInvalidationTime = performance.now() / 1000;
    }

    this.setViewportSize = function(width, height) {
        canvas.setAttribute("width", width.toString());
        canvas.setAttribute("height", height.toString());
    }
      
    this.setResolution = function(level) {
        level = Math.min(this.maxResolution, level);
        if (level == this.currentResolutionLevel) return;

        switch(level) {
            case 0: this.setViewportSize(256, 256); break;
            case 1: this.setViewportSize(512, 512); break;
            case 2: this.setViewportSize(1024, 1024); break;
            case 3: this.setViewportSize(1200, 1200); break;
            case 4: this.setViewportSize(1600, 1600); break;
        }
        this.currentResolutionLevel = level;
        this.invalidate();
    }

    this.setMaxResolution = function(level) {
        this.maxResolution = level;
        this.setResolution(this.currentResolutionLevel);
    }

    this.start = function() {
        var self = this;
        requestAnimationFrame(function() { self.draw(); });
    }

    this.draw = function() {
        var self = this;

        var now = performance.now() / 1000;
        var delta = now - self.lastDrawTime;
        if (delta >= 0.5) {
            var fps = self.nrFrames / delta;
            fpsCallback(Math.round(fps) + ' f/s');
            self.lastDrawTime = now;
            self.nrFrames = 0;
             
            if (!self.valid && self.adaptiveResolution) {
                if (fps < 10) {
                    self.setResolution(Math.max(self.currentResolutionLevel - 1, 0));
                } else if (fps >= 30) {
                    self.setResolution(Math.max(self.currentResolutionLevel + 1, 0));
                }
            }
        }

        if (self.valid) {
            const idleTime = now - self.lastInvalidationTime;
            if (idleTime > 0.25 && self.adaptiveResolution) {
                self.setResolution(4);
            }
        } else {
            self.nrFrames++;

            self.render();
            self.valid = true;
        }
        
        requestAnimationFrame(function() { self.draw();});
    };

    this.render = function() {
        this.gl.clearDepth(1.0);
        this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    
        this.renderers.forEach(renderer => {
            renderer.draw(this.gl);
        });
    }
    this.setResolution(2);
}