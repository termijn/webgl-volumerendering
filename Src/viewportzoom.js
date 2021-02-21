function ViewportZoom() {

    this.mouseWheel = function(args) {
        var viewport = args.viewport;
        viewport.setFieldOfView(
            Math.min(Math.PI / 180 * 120, Math.max(Math.PI / 180 * 5, viewport.fieldOfView * Math.pow(2, -args.wheelDistance / 10.0)))
        );
    }

}