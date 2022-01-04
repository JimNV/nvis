#version 300 es

precision highp float;

//  common uniforms
//uniform vec2 uDimensions;
uniform vec2 uMouse;
uniform float uTime;
uniform float uFrame;

//  shader-specific uniforms
uniform int uDirection;

// Texture uniforms
uniform sampler2D uTexture0;
// uniform sampler2D uTexture1;

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

#define KERNEL_WIDTH 41
#define KERNEL_STRIDE 20

float maxKernel(ivec2 loc2d, sampler2D textureSampler) {
    float max = 0.0;
    // for(int y = 0; y < KERNEL_WIDTH; y++) {
    //     for(int x = 0; x < KERNEL_WIDTH; x++) {
    //         float val = RGBtoLuma(texelFetch(textureSampler, loc2d + ivec2(x, y), 0).rgb);
    //         if(val > max) {
    //             max = val;
    //         }
    //     }
    // }
    float v1 = RGBtoLuma(texelFetch(textureSampler, loc2d, 0).rgb);
    float v2 = RGBtoLuma(texelFetch(textureSampler, loc2d + ivec2(1 - uDirection, uDirection), 0).rgb);
    return (v1 > v2 ? v1 : v2);
}

void main() {
    ivec2 dimensions = textureSize(uTexture0, 0);
    ivec2 loc2d = ivec2(vTextureCoord * vec2(dimensions));

    float sharpScore = maxKernel(loc2d, uTexture0);
    outColor = vec4(sharpScore, sharpScore, sharpScore, 1.0);
}
