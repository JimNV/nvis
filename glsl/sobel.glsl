#version 300 es

precision highp float;

//  common uniforms
uniform vec2 uMouse;
uniform float uTime;
uniform float uFrame;

//  shader-specific uniforms
uniform int uType;
uniform bool uX;
uniform bool uY;
uniform bool uAngle;
uniform int uVarianceRadius;
uniform float uMultiplier;

// Texture uniforms
uniform sampler2D uTexture0;

// Texture
in vec2 vTextureCoord;

out vec4 outColor;

// from ssim.glsl
float RGBtoLuma(vec3 color) {
    const float RED_COEFFICIENT = 0.212655;
    const float GREEN_COEFFICIENT = 0.715158;
    const float BLUE_COEFFICIENT = 0.072187;

    return color.r * RED_COEFFICIENT + color.g * GREEN_COEFFICIENT + color.b * BLUE_COEFFICIENT;
}

float laplacian(ivec2 loc2d) {
        float c0 = RGBtoLuma(texelFetch(uTexture0, loc2d, 0).rgb);
        float c1 = RGBtoLuma(texelFetch(uTexture0, loc2d + ivec2(-1, 0), 0).rgb);
        float c2 = RGBtoLuma(texelFetch(uTexture0, loc2d + ivec2(+1, 0), 0).rgb);
        float c3 = RGBtoLuma(texelFetch(uTexture0, loc2d + ivec2(0, -1), 0).rgb);
        float c4 = RGBtoLuma(texelFetch(uTexture0, loc2d + ivec2(0, +1), 0).rgb);
        return -4.0 * c0 + c1 + c2 + c3 + c4;
}

float laplacian2(ivec2 loc2d) {
        float c0 = RGBtoLuma(texelFetch(uTexture0, loc2d + ivec2(-1, -1), 0).rgb);
        float c1 = RGBtoLuma(texelFetch(uTexture0, loc2d + ivec2( 0, -1), 0).rgb);
        float c2 = RGBtoLuma(texelFetch(uTexture0, loc2d + ivec2(+1, -1), 0).rgb);
        float c3 = RGBtoLuma(texelFetch(uTexture0, loc2d + ivec2(-1,  0), 0).rgb);
        float c4 = RGBtoLuma(texelFetch(uTexture0, loc2d + ivec2( 0,  0), 0).rgb);
        float c5 = RGBtoLuma(texelFetch(uTexture0, loc2d + ivec2(+1,  0), 0).rgb);
        float c6 = RGBtoLuma(texelFetch(uTexture0, loc2d + ivec2(-1, +1), 0).rgb);
        float c7 = RGBtoLuma(texelFetch(uTexture0, loc2d + ivec2( 0, +1), 0).rgb);
        float c8 = RGBtoLuma(texelFetch(uTexture0, loc2d + ivec2(+1, +1), 0).rgb);
        return 0.25 * c0 + 0.5 * c1 + 0.25 * c2 + 0.5 * c3 - 3.0 * c4 + 0.5 * c5 + 0.25 * c6 + 0.5 * c7 + 0.25 * c8;
}

float laplacianVariance(ivec2 loc2d, int radius, ivec2 dimensions) {
    float sum = 0.0;
    float variance = 0.0;

    float n = 0.0;
    for (int y = -radius; y <= radius; y++)
    {
        for (int x = -radius; x <= radius; x++)
        {
            ivec2 pos = loc2d + ivec2(x, y);
            if (pos.x < 0 || pos.x >= dimensions.x || pos.y < 0 || pos.y >= dimensions.y) {
                continue;
            }
            float value = laplacian(pos);
            sum += value;
            n += 1.0;
        }
    }

    // float n = pow(1.0 + 2.0 * float(radius), 2.0);
    float mean = sum / n;

    for (int y = -radius; y <= radius; y++)
    {
        for (int x = -radius; x <= radius; x++)
        {
            ivec2 pos = loc2d + ivec2(x, y);
            if (pos.x < 0 || pos.x >= dimensions.x || pos.y < 0 || pos.y >= dimensions.y) {
                continue;
            }

            float value = laplacian(pos);

            variance += pow(value - mean, 2.0);
        }
    }
    variance /= n;

    return variance;
}

void main() {
    ivec2 dimensions = textureSize(uTexture0, 0);
    ivec2 loc2d = ivec2(vTextureCoord * vec2(dimensions));


    const float Pi = 3.14159265358979;
    const float TwoDivPi = 2.0 / Pi;

    const mat3 kGx = mat3(-1.0, 0.0, 1.0,
        -2.0, 0.0, 2.0,
        -1.0, 0.0, 1.0);
    const mat3 kGy = mat3(-1.0, -2.0, -1.0,
        0.0, 0.0, 0.0,
        1.0, 2.0, 1.0);

    vec4 colorSum = vec4(0.0, 0.0, 0.0, 1.0);
    float kernelSum = 0.0;

    //  Laplacian (five point)
    if (uType == 1) {
        float laplacian = laplacian(loc2d) * uMultiplier;
        outColor = vec4(laplacian, laplacian, laplacian, 1.0);
        return;
    }

    //  Laplacian (nine point)
    if (uType == 2) {
        float laplacian = laplacian2(loc2d) * uMultiplier;
        outColor = vec4(laplacian, laplacian, laplacian, 1.0);
        return;
    }

    //  Laplacian variance
    if (uType == 3) {
        float laplacianVariance = laplacianVariance(loc2d, uVarianceRadius, dimensions) * uMultiplier;
        outColor = vec4(laplacianVariance, laplacianVariance, laplacianVariance, 1.0);
        return;
    }

    //  Sobel
    vec3 G = vec3(0.0, 0.0, 0.0);
    for (int y = -1; y <= 1; y++)
    {
        for (int x = -1; x <= 1; x++)
        {
            ivec2 pos = loc2d + ivec2(x, y);

            if (pos.x < 0 || pos.x >= dimensions.x || pos.y < 0 || pos.y >= dimensions.y) {
                continue;
            }

            vec3 c = texelFetch(uTexture0, loc2d + ivec2(x, y), 0).rgb;
            float luminance = (c.r + c.g + c.b) / 3.0;

            if (uX) {
                G.x += luminance * kGx[y + 1][x + 1];
            }
            if (uY) {
                G.y += luminance * kGy[y + 1][x + 1];
            }
        }
    }

    if (uAngle)
    {
        float angle = atan(G.y / G.x) * TwoDivPi;

        outColor = vec4((angle > 0.0 ? angle : 0.0), (angle < 0.0 ? -angle : 0.0), 0.0, 1.0);
    }
    else
    {
        //        float value = sqrt(G.x * G.x + G.y * G.y + G.z * G.z);
        float value = length(G);

        outColor = vec4(value, value, value, 1.0);
    }

}
