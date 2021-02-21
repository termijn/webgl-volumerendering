var vec3 = glMatrix.vec3;
var mat4 = glMatrix.mat4;

function CameraRoll() {
    this.rotationPoint = vec3.fromValues(0, 0, 0);

    this.mouseDown = function(args) {
        this.startPosition = args.position;
    }

    this.mouseMove = function(args) {
        if (!args.isMouseDown) return;

        var worldToCamera = mat4.create();
        mat4.invert(worldToCamera, args.viewport.cameraToWorld);

        var delta = args.position.subtract(this.startPosition).inverse();

        var translationToWorldOrigin = vec3.create();
        mat4.getTranslation(translationToWorldOrigin, worldToCamera);
        mat4.translate(args.viewport.cameraToWorld, args.viewport.cameraToWorld, translationToWorldOrigin);

        var xRay = vec3.fromValues(1,0,0);
        var xRayO = vec3.fromValues(0,0,0);
        vec3.subtract(xRay, xRay, xRayO);
        mat4.rotate(
            args.viewport.cameraToWorld,
            args.viewport.cameraToWorld,
            delta.y * 0.007,
            xRay);

        var yRay = vec3.fromValues(0,1,0);
        var yRayO = vec3.fromValues(0,0,0);
        vec3.subtract(yRay, yRay, yRayO);
        mat4.rotate(
            args.viewport.cameraToWorld,
            args.viewport.cameraToWorld,
            delta.x * 0.007,
            yRay);

        var translationToCamera = vec3.fromValues(-translationToWorldOrigin[0], -translationToWorldOrigin[1], -translationToWorldOrigin[2]);
        mat4.translate(args.viewport.cameraToWorld, args.viewport.cameraToWorld, translationToCamera);

        this.startPosition = args.position;
    }

}