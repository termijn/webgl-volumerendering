const LEFTMOUSEBUTTON = 0;
const MIDDLEMOUSEBUTTON = 1;
const RIGHTMOUSEBUTTON = 2;

// Returns +1 for a single wheel roll 'up', -1 for a single roll 'down'
function wheelDistance(evt) {
    if (!evt) evt = event;
    var w=evt.wheelDelta, d=evt.detail;
    if (d) {
      if (w) return w/d/40*d>0?1:-1; // Opera
        else return -d/3;              // Firefox;
    } else return w/120;             // IE/Safari/Chrome
};

function MouseHandler(viewport) {
    this.subscribe = function() {
        viewport.canvas.addEventListener('mousedown', function(e) {
            e.preventDefault ();
            var e = window.event || e;

            const args = {
                button: e.button,
                position: new Point(e.clientX, e.clientY),
                source: e
            }

            if (args.button == LEFTMOUSEBUTTON) {
                this.isMouseDown = true;
                viewport.renderers.forEach(renderer => {
                    renderer.mouseDown(args);
                });
                viewport.setMaxResolution(1);
                viewport.invalidate();
            }
        });

        viewport.canvas.addEventListener('mousemove', function(e) {
            e.preventDefault ();
            var e = window.event || e;
            const args = {
                position: new Point(e.clientX, e.clientY),
                isMouseDown: this.isMouseDown,
                source: e
            }

            viewport.renderers.forEach(renderer => {
                renderer.mouseMove(args);
            });

            if (this.isMouseDown) {
                viewport.invalidate();
            }
        });

        viewport.canvas.addEventListener('mouseup', function(e) {
            e.preventDefault ();
            var e = window.event || e;
            if (e.button == LEFTMOUSEBUTTON) {
                this.isMouseDown = false;
                const args = {
                    position: new Point(e.clientY, e.clientY),
                    source: e
                }
                viewport.renderers.forEach(renderer => {
                    renderer.mouseUp(args);
                });
                viewport.setMaxResolution(4);
            }
        });

        viewport.canvas.addEventListener('wheel', function(e) {
            const args = {
                wheelDistance: wheelDistance(e),
                source: e
            }

            viewport.renderers.forEach(renderer => {
                renderer.mouseWheel(args);
                viewport.invalidate();
            });
        });
    }
}