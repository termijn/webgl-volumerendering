#version 300 es

precision highp int;
precision highp float;

uniform highp sampler3D volume;
uniform ivec3 volume_dims;
uniform float dt_scale;
uniform vec3 lightPosition;

uniform float windowLevel; // defined in rescaled values (after applying rescale)
uniform float windowWidth; // defined in rescaled values (after applying rescale)
uniform float rescaleIntercept;
uniform float rescaleSlope;

float colorSamplePoints[] =
    float[9] (
        -770.0,
        -144.0,
        62.0,
        158.0,
        210.0,
        259.0,
        466.0,
        2001.0,
        3071.0
    );

vec3 colorSamples[] =
    vec3[9] (
        vec3(0.79, 0.88, 0.82),
        vec3(1.0, 0.78, 0.7),
        vec3(0.73, 0.0, 0.03),
        vec3(1.0, 0.14, 0.17),
        vec3(1.0, 0.35, 0.17),
        vec3(1.0, 0.64, 0.11),
        vec3(0.94, 0.92, 0.73),
        vec3(1.0, 1.0, 1.0),
        vec3(1.0, 0.96, 0.99)
    );

float opacitySamplePoints[] = 
    float[4] (
        40.0,
        128.0,
        330.0,
        299.0
    );

float opacitySamples[] = 
    float[4] (
        0.0,
        0.14027,
        0.38847,
        0.93663
    );

in vec3 vray_dir;
in vec3 transformed_eye;
out vec4 color;

vec2 intersect_box(vec3 orig, vec3 dir);
float linear_to_srgb(float x);
vec3 normalAt(vec3 position);
float traceLight(vec3 voxel, vec3 light);
float softShadow(vec3 position);
float pointlightShadow(vec3 p);
vec3 applyColorMap(float value);
float rescale(float value);
float opacity(float value);
float applyOpacityMap(float value);

float sampleVolume(vec3 position) {
    float v = texture(volume, position).r;
    return rescale(v);
}

float sampleVolumeOpacity(vec3 position) {
    return opacity(sampleVolume(position));
}

float rescale(float value) {
    return rescaleSlope * value + rescaleIntercept;
}

float opacity(float value) {
    float opacity = applyOpacityMap(value);

    float windowFloor = windowLevel - windowWidth / 2.0;
    return clamp(opacity * ((value - windowFloor) / windowWidth), 0.0, 1.0);
}

// http://www.reedbeta.com/blog/quick-and-easy-gpu-random-numbers-in-d3d11/
float wang_hash(int seed) {
	seed = (seed ^ 61) ^ (seed >> 16);
	seed *= 9;
	seed = seed ^ (seed >> 4);
	seed *= 0x27d4eb2d;
	seed = seed ^ (seed >> 15);
	return float(seed % 2147483647) / float(2147483647);
}

void main(void) {
    vec3 ray_dir = normalize(vray_dir);
    vec2 t_hit = intersect_box(transformed_eye, ray_dir);
    if (t_hit.x > t_hit.y) {
        discard;
    }
    t_hit.x = max(t_hit.x, 0.0);
    
    vec3 dt_vec = 1.0 / (vec3(volume_dims) * abs(ray_dir));
    float dt = dt_scale * min(dt_vec.x, min(dt_vec.y, dt_vec.z));

    vec4 voxelColor = vec4(0.0);
    float offset = wang_hash(int(gl_FragCoord.x + 1024.0 * gl_FragCoord.y));
    vec3 p = transformed_eye + (t_hit.x + offset * dt) * ray_dir;

    for (float t = t_hit.x; t < t_hit.y; t += dt) {
        
        float val = sampleVolume(p);
        vec3 color = applyColorMap(val);
        float opacity = opacity(val);
        vec4 val_color = vec4(opacity * color, opacity);
        
        val_color.a = 1.0 - pow(1.0 - val_color.a, dt_scale);
        voxelColor.rgb += (1.0 - voxelColor.a) * val_color.a * val_color.rgb;
        voxelColor.a += (1.0 - voxelColor.a) * val_color.a;

        if (voxelColor.a >= 0.95) {
            break;
        }
        p += ray_dir * dt;
    }

    vec4 diffuse = vec4(0.7);
    vec4 ambient = vec4(0.2);
    vec4 specular = vec4(0.6, 0.6, 0.6, 0.6);
    float shininess = 50.0;

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

    color.r = linear_to_srgb((shadow * voxelColor.r * lightColor.r));
    color.g = linear_to_srgb((shadow * voxelColor.g * lightColor.g));
    color.b = linear_to_srgb((shadow * voxelColor.b * lightColor.b));
    color.a = voxelColor.a;
}

float applyOpacityMap(float value) {
    for(int i = 0; i < opacitySamplePoints.length(); i++) {
        if (value <= opacitySamplePoints[i]) {
            if (i == 0) {
                return opacitySamples[0];
            }
            int prevIndex = i - 1;
            float delta = abs(opacitySamplePoints[i] - opacitySamplePoints[prevIndex]);
            float fraction = (value - opacitySamplePoints[prevIndex]) / delta;
            float color = mix(opacitySamples[prevIndex], opacitySamples[i], fraction);
            return color;
        }
    }
    return opacitySamples[opacitySamples.length()-1];
}

vec3 applyColorMap(float value) {
    for(int i = 0; i < colorSamplePoints.length(); i++) {
        if (value <= colorSamplePoints[i]) {
            if (i == 0) {
                return colorSamples[0];
            }
            int prevIndex = i - 1;
            float delta = abs(colorSamplePoints[i] - colorSamplePoints[prevIndex]);
            float fraction = (value - colorSamplePoints[prevIndex]) / delta;
            vec3 color = mix(colorSamples[prevIndex], colorSamples[i], fraction);
            return color;
        }
    }
    return colorSamples[colorSamples.length()-1];
}

float pointlightShadow(vec3 p) {
    float pointShadow = (1.0 - (traceLight(p, lightPosition)));
    return pointShadow;
}

float softShadow(vec3 p) {
    float shadow = 0.0;
    float totalShadow = 0.0;
    float delta = 0.02;
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
    vec3 voxelSize = vec3(
        1.0 / float(volume_dims.x),
        1.0 / float(volume_dims.y),
        1.0 / float(volume_dims.z)
    );    

    vec3 gradient = vec3(
        (sampleVolumeOpacity(position + vec3(1,0,0) * voxelSize) + sampleVolumeOpacity(position - vec3(1,0,0) * voxelSize)),
        (sampleVolumeOpacity(position + vec3(0,1,0) * voxelSize) + sampleVolumeOpacity(position - vec3(0,1,0) * voxelSize)),
        (sampleVolumeOpacity(position + vec3(0,0,1) * voxelSize) + sampleVolumeOpacity(position - vec3(0,0,1) * voxelSize))
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
        float val = sampleVolumeOpacity(p);

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