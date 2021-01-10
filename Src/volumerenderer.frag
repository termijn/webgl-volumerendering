#version 300 es

precision highp int;
precision highp float;

uniform highp sampler3D volume;
uniform ivec3 volume_dims;
uniform float dt_scale;
uniform vec3 lightPosition;
uniform float offset;
uniform float brightness;

in vec3 vray_dir;
in vec3 transformed_eye;
out vec4 color;

vec2 intersect_box(vec3 orig, vec3 dir);
float linear_to_srgb(float x);
vec3 normalAt(vec3 position);
float traceLight(vec3 voxel, vec3 light);
float softShadow(vec3 position);
float pointlightShadow(vec3 p);

void main(void) {
    vec3 ray_dir = normalize(vray_dir);
    vec2 t_hit = intersect_box(transformed_eye, ray_dir);
    if (t_hit.x > t_hit.y) {
        discard;
    }
    t_hit.x = max(t_hit.x, 0.0);
    
    vec3 dt_vec = 1.0 / (vec3(volume_dims) * abs(ray_dir));
    float dt = dt_scale * min(dt_vec.x, min(dt_vec.y, dt_vec.z));

    vec4 skinColor = vec4(225.0 / 255.0, 173.0 / 255.0, 164.0 / 255.0, 1.0);
    //vec4 skinColor = vec4(1.0);

    vec4 voxelColor = vec4(0.0);
    vec3 p = vec3(0.0);
    for (float t = t_hit.x; t < t_hit.y; t += dt) {
        p = transformed_eye + t * ray_dir;

        float val = clamp(texture(volume, p).r +offset, 0.0,1.0);
        vec4 val_color = vec4(val, val, val, val) * skinColor;
        
        val_color.a = 1.0 - pow(1.0 - val_color.a, dt_scale);
        voxelColor.rgb += (1.0 - voxelColor.a) * val_color.a * val_color.rgb;
        voxelColor.a += (1.0 - voxelColor.a) * val_color.a;

        if (voxelColor.a >= 0.95) {
            break;
        }
    }

    vec4 diffuse = vec4(0.8);
    vec4 ambient = vec4(0.6);
    vec4 specular = vec4(0.2, 0.2, 0.2, 0.2);
    float shininess = 100.0;

    vec3 voxelNormal = normalAt(p);
    vec3 lightDirection = normalize(lightPosition - p);
    float intensity = max(dot(voxelNormal, lightDirection), 0.0);
    vec4 spec = vec4(0.0);
    if (intensity > 0.0) {
        vec3 h = normalize(lightDirection + transformed_eye);
        float intSpec = max(dot(h, voxelNormal), 0.0);
        spec = specular * pow(intSpec, shininess);
    }

    vec4 lightColor = max(intensity * diffuse + spec, ambient);
    float shadow = softShadow(p);

    color.r = linear_to_srgb((shadow * voxelColor.r) + voxelColor.a * brightness);
    color.g = linear_to_srgb((shadow * voxelColor.g) + voxelColor.a * brightness);
    color.b = linear_to_srgb((shadow * voxelColor.b) + voxelColor.a * brightness);
    color.a = voxelColor.a;
}

float pointlightShadow(vec3 p) {
    float pointShadow = (1.0 - (traceLight(p, lightPosition)));
    return pointShadow;
}

float softShadow(vec3 p) {
    float shadow = 0.0;
    float totalShadow = 0.0;
    float delta = 0.01;
    vec3 minPos = p - vec3(delta);

    // Soften shadow
    for (float z = -delta; z < delta; z += delta) {
        for (float y = -delta; y < delta; y += delta) {
            for (float x = -delta; x < delta; x += delta) {
                vec3 position = p + vec3(x, y, z);
                float pointShadow = (1.0 - (traceLight(position, lightPosition)));
                totalShadow = totalShadow + pointShadow;
            }
        }
    }    
    shadow = totalShadow / 6.0 * 2.0;
    return shadow;
}

vec3 normalAt(vec3 position) {
    float delta = 0.01;
    vec3 gradient = vec3( 
        (texture(volume, position + vec3(1,0,0) * delta).r + texture(volume, position - vec3(1,0,0) * delta).r),
        (texture(volume, position + vec3(0,1,0) * delta).r + texture(volume, position - vec3(0,1,0) * delta).r),
        (texture(volume, position + vec3(0,0,1) * delta).r + texture(volume, position - vec3(0,0,1) * delta).r)
    );
    return normalize(gradient);
}

// vectors are defined in unit box space
float traceLight(vec3 voxel, vec3 light) {
    vec3 voxelToLight = light - voxel;
    vec3 d = normalize(voxelToLight);
    vec3 o = voxel - 1000.0 * d;

    vec2 box = intersect_box(o, d);
    float start = length(voxel - o);
    
    vec3 voxelSize = 1.0 / vec3(volume_dims);
    float samplesPerVoxel = 1.0;
    float delta = min(voxelSize.x, min(voxelSize.y, voxelSize.z)) / samplesPerVoxel;

    float integrated = 0.0;
    for (float t = start; t < box.y; t += delta) {
        vec3 p = o + t * d;
        float val = texture(volume, p).r + offset;

        integrated = integrated + val / samplesPerVoxel / 8.0;

        if (integrated > 0.75) {
            break;
        }
    }
    return clamp(integrated, 0.0, 1.0);
}

float linear_to_srgb(float x) {
    if (x <= 0.0031308f) {
        return 12.92f * x;
    }
    return 1.055f * pow(x, 1.f / 2.4f) - 0.055f;
}

vec2 intersect_box(vec3 orig, vec3 dir) {
    const vec3 boxMin = vec3(0);
    const vec3 boxMax = vec3(1);
    vec3 invDir = 1.0 / dir;
    vec3 tmin_tmp = (boxMin - orig) * invDir;
    vec3 tmax_tmp = (boxMax - orig) * invDir;
    vec3 tmin = min(tmin_tmp, tmax_tmp);
    vec3 tmax = max(tmin_tmp, tmax_tmp);
    float t0 = max(tmin.x, max(tmin.y, tmin.z));
    float t1 = min(tmax.x, min(tmax.y, tmax.z));
    return vec2(t0, t1);
}