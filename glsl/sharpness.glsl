#version 300 es
/*
 * SPDX-FileCopyrightText: Copyright (c) 2021 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 * list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation
 * and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

precision highp float;

//  common uniforms
uniform vec2 uMouse;
uniform float uTime;
uniform float uFrame;

//  shader-specific uniforms
uniform int uType;
uniform int uVarianceRadius;
uniform float uMultiplier;
uniform float uTolerance;
uniform bool uOverlay;

// Texture uniforms
uniform sampler2D uTexture0;
uniform sampler2D uTexture1;

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


float sobel(sampler2D texture, ivec2 loc2d, ivec2 dimensions) {

    const mat3 kGx = mat3(-1.0, 0.0, 1.0,
        -2.0, 0.0, 2.0,
        -1.0, 0.0, 1.0);
    const mat3 kGy = mat3(-1.0, -2.0, -1.0,
        0.0, 0.0, 0.0,
        1.0, 2.0, 1.0);

    vec3 G = vec3(0.0, 0.0, 0.0);
    for (int y = -1; y <= 1; y++)
    {
        for (int x = -1; x <= 1; x++)
        {
            ivec2 pos = loc2d + ivec2(x, y);

            if (pos.x < 0 || pos.x >= dimensions.x || pos.y < 0 || pos.y >= dimensions.y) {
                continue;
            }

            vec3 c = texelFetch(texture, loc2d + ivec2(x, y), 0).rgb;
            float luminance = (c.r + c.g + c.b) / 3.0;

            G.x += luminance * kGx[y + 1][x + 1];
            G.y += luminance * kGy[y + 1][x + 1];
        }
    }

    return length(G);
}


float laplacian(sampler2D texture, ivec2 loc2d) {
        float c0 = RGBtoLuma(texelFetch(texture, loc2d, 0).rgb);
        float c1 = RGBtoLuma(texelFetch(texture, loc2d + ivec2(-1, 0), 0).rgb);
        float c2 = RGBtoLuma(texelFetch(texture, loc2d + ivec2(+1, 0), 0).rgb);
        float c3 = RGBtoLuma(texelFetch(texture, loc2d + ivec2(0, -1), 0).rgb);
        float c4 = RGBtoLuma(texelFetch(texture, loc2d + ivec2(0, +1), 0).rgb);
        return -4.0 * c0 + c1 + c2 + c3 + c4;
}

float laplacian2(sampler2D texture, ivec2 loc2d) {
        float c0 = RGBtoLuma(texelFetch(texture, loc2d + ivec2(-1, -1), 0).rgb);
        float c1 = RGBtoLuma(texelFetch(texture, loc2d + ivec2( 0, -1), 0).rgb);
        float c2 = RGBtoLuma(texelFetch(texture, loc2d + ivec2(+1, -1), 0).rgb);
        float c3 = RGBtoLuma(texelFetch(texture, loc2d + ivec2(-1,  0), 0).rgb);
        float c4 = RGBtoLuma(texelFetch(texture, loc2d + ivec2( 0,  0), 0).rgb);
        float c5 = RGBtoLuma(texelFetch(texture, loc2d + ivec2(+1,  0), 0).rgb);
        float c6 = RGBtoLuma(texelFetch(texture, loc2d + ivec2(-1, +1), 0).rgb);
        float c7 = RGBtoLuma(texelFetch(texture, loc2d + ivec2( 0, +1), 0).rgb);
        float c8 = RGBtoLuma(texelFetch(texture, loc2d + ivec2(+1, +1), 0).rgb);
        return 0.25 * c0 + 0.5 * c1 + 0.25 * c2 + 0.5 * c3 - 3.0 * c4 + 0.5 * c5 + 0.25 * c6 + 0.5 * c7 + 0.25 * c8;
}

float laplacianVariance(sampler2D texture, ivec2 loc2d, int radius, ivec2 dimensions) {
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
            float value = laplacian(texture, pos);
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

            float value = laplacian(texture, pos);

            variance += pow(value - mean, 2.0);
        }
    }
    variance /= n;

    return variance;
}

void main() {
    ivec2 dimensions = textureSize(uTexture0, 0);
    ivec2 loc2d = ivec2(vTextureCoord * vec2(dimensions));

    float value0, value1;
    
    //  Sobel
    if (uType == 0) {
        value0 = sobel(uTexture0, loc2d, dimensions);
        value1 = sobel(uTexture1, loc2d, dimensions);
    }

    //  Laplacian (five point)
    if (uType == 1) {
        value0 = laplacian(uTexture0, loc2d);
        value1 = laplacian(uTexture1, loc2d);
    }

    //  Laplacian (nine point)
    if (uType == 2) {
        value0 = laplacian2(uTexture0, loc2d);
        value1 = laplacian2(uTexture1, loc2d);
    }

    //  Laplacian variance
    if (uType == 3) {
        value0 = laplacianVariance(uTexture0, loc2d, uVarianceRadius, dimensions);
        value1 = laplacianVariance(uTexture1, loc2d, uVarianceRadius, dimensions);
    }

    float value = (value0 - value1) * uMultiplier;

    outColor = vec4(0.0, 0.0, 0.0, 1.0);
    if (uOverlay) {
        outColor = texelFetch(uTexture0, loc2d, 0);
    }
    if (value > uTolerance) {
        outColor += vec4(0.0, value, 0.0, 0.0);
    } else if (value < -uTolerance) {
        outColor += vec4(-value, 0.0, 0.0, 0.0);
    }
}
