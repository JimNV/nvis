#version 300 es

precision highp float;

//  common uniforms
uniform vec2 uMouse;
uniform float uTime;
uniform float uFrame;

//  shader-specific uniforms

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

void main() {
    ivec2 dimensions = textureSize(uTexture0, 0);
    ivec2 loc2d = ivec2(vTextureCoord * vec2(dimensions));

    for (i = 0; i < dimensions.x; i++) {
        for (j = 0; j <= i; j++) {
            
            float sum = 0;
            for (k = 0; k < j; k++) {
                sum += L[i][k] * L[j][k];
            }

            if (i == j) {
                L[i][j] = sqrt(A[i][i] - sum);
            } else {
                L[i][j] = (1.0 / L[j][j] * (A[i][j] - sum));
            }
        }
    }

    float sharpScore = maxKernel(loc2d, uTexture0);
    outColor = vec4(sharpScore, sharpScore, sharpScore, 1.0);
}
