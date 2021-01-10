#version 300 es

layout(location=0) in vec3 position;

uniform mat4 modelToWorld;
uniform mat4 worldToCamera;
uniform mat4 cameraToClipSpace;

uniform mat4 worldToModel;
uniform mat4 cameraToWorld;
uniform mat4 clipSpaceToCamera;

out vec3 vray_dir;
out vec3 transformed_eye;

void main(void) {
    mat4 modelToClipSpace = cameraToClipSpace * worldToCamera * modelToWorld;
    mat4 clipSpaceToModel = worldToModel * cameraToWorld * clipSpaceToCamera;

    gl_Position = modelToClipSpace * vec4(position, 1);

    transformed_eye = (clipSpaceToModel * vec4(0,0,-1,1)).xyz;
    vray_dir = position - transformed_eye;
}