function OpacityMap(element) {
    const HUMin = -500;
    const HUMax = 1000
    var self = this;

    this.opacityMapElement = element;
    this.eventChanged = function() { };

    function pixelToHU(x) {
        var elementWidth = self.opacityMapElement.offsetWidth;
        var fraction = x / elementWidth;
        return HUMin + fraction * (HUMax - HUMin);
    }

    function HUToPixel(hu) {
        var fraction = (hu - HUMin) / (HUMax - HUMin);
        return fraction * self.opacityMapElement.offsetWidth;
    }

    function pixelToOpacity(y) {
        return Math.round((1.0 - y / self.opacityMapElement.offsetHeight) * 100) / 100;
    }

    function opacityToPixel(opacityMapElement, opacity) {
        return (1.0 - opacity) * opacityMapElement.offsetHeight;
    }

    this.getOpacityMap = function() {
        var children = self.opacityMapElement.querySelectorAll('.opacitySample');
        var result = [];
        children.forEach(child => {
            var hu = pixelToHU(child.offsetLeft + child.offsetWidth / 2);
            var opacity = pixelToOpacity(child.offsetTop + child.offsetHeight / 2);
            result.push({
                position: hu,
                opacity: opacity
            });
        });

        return result.sort(function(a, b) { return  a.position - b.position; } );
    }
    
    this.showOpacityMap = function(points, opacityValues) {
        for (i = 0; i < points.length; i++) {
            var x = HUToPixel(points[i]);
            var y = opacityToPixel(this.opacityMapElement, opacityValues[i]);
    
            var sampleElement = document.createElement('div');
            sampleElement.className = 'opacitySample';
            this.opacityMapElement.appendChild(sampleElement);
            sampleElement.style.left = x - sampleElement.offsetWidth / 2 + 'px';
            sampleElement.style.top = y - sampleElement.offsetHeight / 2 + 'px';
            dragOpacitySample(sampleElement);
        }
    }

    function addOpacitySample(element) {
        element.onmousedown = function(e) {
            e = e || window.event;
            e.preventDefault();
    
            var sampleElement = document.createElement('div');
            sampleElement.className = 'opacitySample';
            element.appendChild(sampleElement);
    
            sampleElement.style.left = e.offsetX - sampleElement.offsetWidth / 2 + 'px';
            sampleElement.style.top = e.offsetY - sampleElement.offsetHeight / 2 + 'px';
    
            dragOpacitySample(sampleElement);

            self.eventChanged();
        }
    }
    
    function showSample(element) {
        element.innerHTML = '<span class="opacityValue">' + 
        Math.trunc(pixelToHU(element.offsetLeft + element.offsetWidth / 2))
        + ' => ' 
        + pixelToOpacity(element.offsetTop + element.offsetHeight / 2)
        + '</span>';
    }
    
    function dragOpacitySample(element) {

        element.addEventListener("mouseenter", function(e) {
            showSample(element);
        });
        element.addEventListener("mouseleave", function(e) {
            element.innerHTML = "";
        });

        element.onmousedown = function(e) {
            e = e || window.event;
            e.preventDefault();
            e.stopPropagation();

            if (e.button === 2) {
                e.cancelBubble = true;
                element.parentElement.removeChild(element);
                self.eventChanged();
            } else if (e.button === 0) {
                elementStart = { x: element.offsetLeft, y: element.offsetTop };
                mouseStart = { x: e.clientX, y: e.clientY };
                document.onmousemove = function(e) {
                    e = e || window.event;
                    mouseNow = { x: e.clientX, y: e.clientY };
                    var delta = subtract(mouseNow, mouseStart);
                    var position = {
                        x: clamp(elementStart.x + delta.x, 0 - element.offsetWidth / 2, element.parentElement.offsetWidth - element.offsetWidth / 2),
                        y: clamp(elementStart.y + delta.y, 0 - element.offsetHeight / 2, element.parentElement.offsetHeight - element.offsetHeight / 2)
                    }

                    element.style.left = position.x + 'px';
                    element.style.top = position.y + 'px';
                    self.eventChanged();
                    showSample(element);
                }

                document.onmouseup = function(e) {
                    document.onmousemove = null;
                    document.onmouseup = null;
                    element.innerHTML = "";
                }
            }
        }
    }

    addOpacitySample(element);
}
