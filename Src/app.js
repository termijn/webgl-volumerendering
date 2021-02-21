function load() {
    var self = this;

    draggableWindow(document.querySelector("#windowOpacityMap"));
    var isMouseDown = false;

    const canvas = document.querySelector("#viewport");
    var viewport = new Viewport(canvas, function(fps) {
        var span = document.querySelector("#labelFps");
        span.innerHTML = fps;
    });
    var mouseHandler = new MouseHandler(viewport);
    mouseHandler.subscribe();

    viewport.start();

    window.onresize = function() {
        viewport.resize();
    };

    const sliderResolution = document.querySelector("#resolutionSlider");
    const checkboxAdaptiveResolution = document.querySelector("#checkboxAdaptiveResolution");
    const widthSlider = document.querySelector("#widthSlider");
    const sliderSamplingRate = document.querySelector("#sliderSamplingRate");
    const labelSamplingRate = document.querySelector("#labelSamplingRate");
    const progressbarLoading = document.querySelector(".progress-bar");
    const progressPanel = document.querySelector(".progress");
    const labelWindowLevel = document.querySelector("#labelWindowLevel");
    const offsetSlider = document.querySelector("#offsetSlider");
    const thumbnails = document.querySelectorAll(".dataset-thumbnail");
    const buttonOpacityMap = document.querySelector('#buttonOpacityMap');

    offsetSlider.addEventListener('input', function(e) {
        var value = parseFloat(e.target.value);
        labelWindowLevel.innerHTML = "Window level (" + e.target.value + ")";
        volume.setWindowLevel(parseFloat(value));
        viewport.invalidate();
    });

    checkboxAdaptiveResolution.addEventListener('input', function(e) {
        var isChecked = checkboxAdaptiveResolution.checked;
        viewport.setAdaptiveResolution(isChecked);
        viewport.setMaxResolution()
    });
    
    widthSlider.addEventListener('input', function(e) {
        var value = e.target.value;
        volume.setWindowWidth(parseFloat(value));
        viewport.invalidate();
    });
    
    sliderSamplingRate.addEventListener('input', function(e) {
        var value = parseInt(e.target.value);
        switch(value) {
            case 0: labelSamplingRate.innerHTML = "Sampling rate (0.25x)"; volume.setSampleRate(0.25); break;
            case 1: labelSamplingRate.innerHTML = "Sampling rate (0.5x)"; volume.setSampleRate(0.5); break;
            case 2: labelSamplingRate.innerHTML = "Sampling rate (1x)"; volume.setSampleRate(1.0); break;
            case 3: labelSamplingRate.innerHTML = "Sampling rate (2x)"; volume.setSampleRate(2.0); break;
            case 4: labelSamplingRate.innerHTML = "Sampling rate (4x)"; volume.setSampleRate(4.0); break;
            case 5: labelSamplingRate.innerHTML = "Sampling rate (8x)"; volume.setSampleRate(8.0); break;
        }
        viewport.invalidate();
    });

    sliderResolution.addEventListener('input', function(e) {
        var level = parseInt(e.target.value);
        viewport.setResolution(level);
    });

    thumbnails.forEach(function(item) {
        item.addEventListener('click', function(e) {
            var fileUrl = item.getAttribute("data-url");
            var slope = item.getAttribute("data-slope");
            var intercept = item.getAttribute("data-intercept");
            var width = item.getAttribute("data-width");
            var height = item.getAttribute("data-height");
            var length = item.getAttribute("data-length");
            self.volume = new VolumeRenderer(viewport.gl, fileUrl, slope, intercept, width, height, length);
            viewport.renderers = viewport.renderers.filter(function(value, index, arr){
                return !(value instanceof VolumeRenderer);
            });
            viewport.renderers.push(volume);
        });
    });

    progressPanel.style.visibility = 'hidden';
    document.addEventListener('loading', function(e) {
        console.log("loading event" + e.detail);
        progressPanel.style.visibility = 'visible';
        progressbarLoading.style.width = e.detail.toString() + '%';
        progressbarLoading.setAttribute('aria-valuenow', e.detail);

        if (e.detail == 100) {
            progressPanel.style.visibility = 'hidden';
            viewport.invalidate();
        }
    });

    var opacityMap = new OpacityMap(document.querySelector('#opacityMapEditor'));
    opacityMap.showOpacityMap([90, 228, 330, 499], [0, 0.14027,0.38847, 0.93663])
    opacityMap.eventChanged = function() {
        var map = opacityMap.getOpacityMap();
        self.volume.setOpacityMap(map);
        console.log(map);
        viewport.invalidate();
    }

    buttonOpacityMap.addEventListener('click', function() {
        var windowDiv = document.querySelector('#windowOpacityMap');
        windowDiv.style.left = window.innerWidth - windowDiv.offsetWidth + 'px';
        windowDiv.style.top = window.innerHeight - windowDiv.offsetHeight + 'px';
        windowDiv.style.visibility = 'visible';
    });
}

window.onload = load;