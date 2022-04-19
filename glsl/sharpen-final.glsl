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
uniform float uSharpness;

// Texture uniforms
uniform sampler2D uTexture0;  //  RGBA
uniform sampler2D uTexture1;  //  Luma only (r/x channel)

// Texture
in vec2 vTextureCoord;

out vec4 outColor;

const float kEps = 1.0 / 255.0;
const float kDetectThres = 64.0 / 1024.0;
const float kMinContrastRatio = 2.0;
const float kMaxContrastRatio = 10.0;

const float kSharpStartY = 0.45;
const float kSharpEndY = 0.9;

const float kDetectRatio = 2.0 * 1127.0 / 1024.0;
const float kContrastBoost = 1.0;

struct {
    float MaxScale;
    float MinScale;
    float LimitScale;

    float kSharpStrengthMin;
    float kSharpStrengthMax;
    float kSharpLimitMin;
    float kSharpLimitMax;

    float kRatioNorm;
    float kSharpScaleY;
    float kSharpStrengthScale;
    float kSharpLimitScale;
} Config;



// const int NIS_BLOCK_WIDTH = 32;
// const int NIS_BLOCK_HEIGHT = 32;

#define kSupportSize 5
// #define kNumPixelsX (NIS_BLOCK_WIDTH + kSupportSize + 1)
// #define kNumPixelsY (NIS_BLOCK_HEIGHT + kSupportSize + 1)

// float shPixelsY[kNumPixelsY * kNumPixelsX];

float getY(vec3 rgb)
{
    return 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
}

// vec4 GetEdgeMap(float p[5 * 5], int i, int j)
vec4 GetEdgeMap(float p[5 * 5], ivec2 loc)
{
    int i = loc.x;
    int j = loc.y;
    // float g_0 = abs(p[0 + i][0 + j] + p[0 + i][1 + j] + p[0 + i][2 + j] - p[2 + i][0 + j] - p[2 + i][1 + j] - p[2 + i][2 + j]);
    // float g_45 = abs(p[1 + i][0 + j] + p[0 + i][0 + j] + p[0 + i][1 + j] - p[2 + i][1 + j] - p[2 + i][2 + j] - p[1 + i][2 + j]);
    // float g_90 = abs(p[0 + i][0 + j] + p[1 + i][0 + j] + p[2 + i][0 + j] - p[0 + i][2 + j] - p[1 + i][2 + j] - p[2 + i][2 + j]);
    // float g_135 = abs(p[1 + i][0 + j] + p[2 + i][0 + j] + p[2 + i][1 + j] - p[0 + i][1 + j] - p[0 + i][2 + j] - p[1 + i][2 + j]);
    float g_0 = abs(p[0 + i + (0 + j) * 5] + p[0 + i + (1 + j) * 5] + p[0 + i + (2 + j) * 5] - p[2 + i + (0 + j) * 5] - p[2 + i + (1 + j) * 5] - p[2 + i + (2 + j) * 5]);
    float g_45 = abs(p[1 + i + (0 + j) * 5] + p[0 + i + (0 + j) * 5] + p[0 + i + (1 + j) * 5] - p[2 + i + (1 + j) * 5] - p[2 + i + (2 + j) * 5] - p[1 + i + (2 + j) * 5]);
    float g_90 = abs(p[0 + i + (0 + j) * 5] + p[1 + i + (0 + j) * 5] + p[2 + i + (0 + j) * 5] - p[0 + i + (2 + j) * 5] - p[1 + i + (2 + j) * 5] - p[2 + i + (2 + j) * 5]);
    float g_135 = abs(p[1 + i + (0 + j) * 5] + p[2 + i + (0 + j) * 5] + p[2 + i + (1 + j) * 5] - p[0 + i + (1 + j) * 5] - p[0 + i + (2 + j) * 5] - p[1 + i + (2 + j) * 5]);

    float g_0_90_max = max(g_0, g_90);
    float g_0_90_min = min(g_0, g_90);
    float g_45_135_max = max(g_45, g_135);
    float g_45_135_min = min(g_45, g_135);

    float e_0_90 = 0.0;
    float e_45_135 = 0.0;

    if (g_0_90_max + g_45_135_max == 0.0)
    {
        return vec4(0.0, 0.0, 0.0, 0.0);
    }

    e_0_90 = min(g_0_90_max / (g_0_90_max + g_45_135_max), 1.0);
    e_45_135 = 1.0 - e_0_90;

    bool c_0_90 = (g_0_90_max > (g_0_90_min * kDetectRatio)) && (g_0_90_max > kDetectThres) && (g_0_90_max > g_45_135_min);
    bool c_45_135 = (g_45_135_max > (g_45_135_min * kDetectRatio)) && (g_45_135_max > kDetectThres) && (g_45_135_max > g_0_90_min);
    bool c_g_0_90 = g_0_90_max == g_0;
    bool c_g_45_135 = g_45_135_max == g_45;

    float f_e_0_90 = (c_0_90 && c_45_135) ? e_0_90 : 1.0;
    float f_e_45_135 = (c_0_90 && c_45_135) ? e_45_135 : 1.0;

    float weight_0 = (c_0_90 && c_g_0_90) ? f_e_0_90 : 0.0;
    float weight_90 = (c_0_90 && !c_g_0_90) ? f_e_0_90 : 0.0;
    float weight_45 = (c_45_135 && c_g_45_135) ? f_e_45_135 : 0.0;
    float weight_135 = (c_45_135 && !c_g_45_135) ? f_e_45_135 : 0.0;

    return vec4(weight_0, weight_90, weight_45, weight_135);
}


float CalcLTIFast(float y[5])
{
    float a_min = min(min(y[0], y[1]), y[2]);
    float a_max = max(max(y[0], y[1]), y[2]);

    float b_min = min(min(y[2], y[3]), y[4]);
    float b_max = max(max(y[2], y[3]), y[4]);

    float a_cont = a_max - a_min;
    float b_cont = b_max - b_min;

    float cont_ratio = max(a_cont, b_cont) / (min(a_cont, b_cont) + kEps);
    return (1.0 - clamp((cont_ratio - kMinContrastRatio) * Config.kRatioNorm, 0.0, 1.0)) * kContrastBoost;
}


float EvalUSM(const float pxl[5], const float sharpnessStrength, const float sharpnessLimit)
{
    // USM profile
    float y_usm = -0.6001 * pxl[1] + 1.2002 * pxl[2] - 0.6001 * pxl[3];
    // boost USM profile
    y_usm *= sharpnessStrength;
    // clamp to the limit
    y_usm = min(sharpnessLimit, max(-sharpnessLimit, y_usm));
    // reduce ringing
    y_usm *= CalcLTIFast(pxl);

    return y_usm;
}

vec4 GetDirUSM(const float p[5 * 5])
{
    // sharpness boost & limit are the same for all directions
    float scaleY = 1.0 - clamp((p[2 * 5 + 2] - kSharpStartY) * Config.kSharpScaleY, 0.0, 1.0);
    // scale the ramp to sharpen as a function of luma
    float sharpnessStrength = scaleY * Config.kSharpStrengthScale + Config.kSharpStrengthMin;
    // scale the ramp to limit USM as a function of luma
    float sharpnessLimit = (scaleY * Config.kSharpLimitScale + Config.kSharpLimitMin) * p[2 * 5 + 2];

    vec4 rval;
    
    //  0 deg filter
    float interp0Deg[5];
    {
        for (int i = 0; i < 5; ++i)
        {
            // interp0Deg[i] = p[i][2];
            // interp0Deg[i] = p[i][2];
            interp0Deg[i] = p[i + 2 * 5];
            interp0Deg[i] = p[i + 2 * 5];
        }
    }

    rval.x = EvalUSM(interp0Deg, sharpnessStrength, sharpnessLimit);

    //  90 deg filter
    float interp90Deg[5];
    {
        for (int i = 0; i < 5; ++i)
        {
            // interp90Deg[i] = p[2][i];
            // interp90Deg[i] = p[2][i];
            interp90Deg[i] = p[2 + i * 5];
            interp90Deg[i] = p[2 + i * 5];
        }
    }

    rval.y = EvalUSM(interp90Deg, sharpnessStrength, sharpnessLimit);

    //  45 deg filter
    float interp45Deg[5];
    // interp45Deg[0] = p[1][1];
    // interp45Deg[1] = mix(p[2][1], p[1][2], 0.5f);
    // interp45Deg[2] = p[2][2];
    // interp45Deg[3] = mix(p[3][2], p[2][3], 0.5f);
    // interp45Deg[4] = p[3][3];
    interp45Deg[0] = p[1 + 1 * 5];
    interp45Deg[1] = mix(p[2 + 1 * 5], p[1 + 2 * 5], 0.5);
    interp45Deg[2] = p[2 + 2 * 5];
    interp45Deg[3] = mix(p[3 + 2 * 5], p[2 + 3 * 5], 0.5);
    interp45Deg[4] = p[3 + 3 * 5];

    rval.z = EvalUSM(interp45Deg, sharpnessStrength, sharpnessLimit);

    //  135 deg filter
    float interp135Deg[5];
    // interp135Deg[0] = p[3][1];
    // interp135Deg[1] = mix(p[3][2], p[2][1], 0.5f);
    // interp135Deg[2] = p[2][2];
    // interp135Deg[3] = mix(p[2][3], p[1][2], 0.5f);
    // interp135Deg[4] = p[1][3];
    interp135Deg[0] = p[3 + 1 * 5];
    interp135Deg[1] = mix(p[3 + 2 * 5], p[2 + 1 * 5], 0.5);
    interp135Deg[2] = p[2 + 2 * 5];
    interp135Deg[3] = mix(p[2 + 3 * 5], p[1 + 2 * 5], 0.5);
    interp135Deg[4] = p[1 + 3 * 5];

    rval.w = EvalUSM(interp135Deg, sharpnessStrength, sharpnessLimit);

    return rval;
}


void main() {
    ivec2 dimensions = textureSize(uTexture0, 0);
    ivec2 loc2d = ivec2(vTextureCoord * vec2(dimensions));

    Config.MaxScale = (uSharpness >= 0.0 ? 1.25 : 1.75);
    Config.MinScale = (uSharpness >= 0.0 ? 1.25 : 1.0);
    Config.LimitScale = (uSharpness >= 0.0 ? 1.25 : 1.0);

    Config.kSharpStrengthMin = max(0.0, 0.4 + uSharpness * Config.MinScale * 1.2);
    Config.kSharpStrengthMax = 1.6 + uSharpness * Config.MaxScale * 1.8;
    Config.kSharpLimitMin = max(0.1, 0.14 + uSharpness * Config.LimitScale * 0.32);
    Config.kSharpLimitMax = 0.5 + uSharpness * Config.LimitScale * 0.6;

    Config.kRatioNorm = 1.0 / (kMaxContrastRatio - kMinContrastRatio);
    Config.kSharpScaleY = 1.0 / (kSharpEndY - kSharpStartY);
    Config.kSharpStrengthScale = Config.kSharpStrengthMax - Config.kSharpStrengthMin;
    Config.kSharpLimitScale = Config.kSharpLimitMax - Config.kSharpLimitMin;


    // int dstBlockX = int(NIS_BLOCK_WIDTH * blockIdx.x);
    // int dstBlockY = int(NIS_BLOCK_HEIGHT * blockIdx.y);
    // // fill in input luma tile in batches of 2x2 pixels
    // // we use texture gather to get extra support necessary
    // // to compute 2x2 edge map outputs too
    // float kShift = 0.5 - kSupportSize / 2;
    // for (int i = int(threadIdx) * 2; i < kNumPixelsX * kNumPixelsY / 2; i += NIS_THREAD_GROUP_SIZE * 2)
    // {
    //     uint2 pos = uvec2(uint(i) % uint(kNumPixelsX), uint(i) / uint(kNumPixelsX) * 2);
    //     for (int dy = 0; dy < 2; dy++)
    //     {
    //         for (int dx = 0; dx < 2; dx++)
    //         {
    //             float tx = (dstBlockX + pos.x + dx + kShift) * kSrcNormX;
    //             float ty = (dstBlockY + pos.y + dy + kShift) * kSrcNormY;
    //             vec4 px = texelFetch(uTexture0, vec2(tx, ty), 0);
    //             shPixelsY[pos.y + dy][pos.x + dx] = getY(px.xyz);
    //         }
    //     }
    // }


    // for (int k = int(threadIdx); k < NIS_BLOCK_WIDTH * NIS_BLOCK_HEIGHT; k += NIS_THREAD_GROUP_SIZE)
    // {
    //     ivec2 pos = ivec2(uint(k) % uint(NIS_BLOCK_WIDTH), uint(k) / uint(NIS_BLOCK_WIDTH));

        // load 5x5 support to regs
        float p[5 * 5];
        // for (int y = 0; y < 5; y++)
        // {
        //     for (int x = 0; x < 5; x++)
        //     {
        for (int y = -2; y < 3; y++)
        {
            for (int x = -2; x < 3; x++)
            {
                p[(y + 2) * 5 + (x + 2)] = texelFetch(uTexture1, loc2d + ivec2(x, y), 0).x;
            }
        }

        // get directional filter bank output
        vec4 dirUSM = GetDirUSM(p);

        // generate weights for directional filters
        // vec4 w = GetEdgeMap(p, kSupportSize / 2 - 1, kSupportSize / 2 - 1);
        vec4 w = GetEdgeMap(p, ivec2(kSupportSize / 2 - 1, kSupportSize / 2 - 1));

        // final USM is a weighted sum filter outputs
        float usmY = (dirUSM.x * w.x + dirUSM.y * w.y + dirUSM.z * w.z + dirUSM.w * w.w);

        // do bilinear tap and correct rgb texel so it produces new sharpened luma
        // int dstX = dstBlockX + pos.x;
        // int dstY = dstBlockY + pos.y;
        int dstX = loc2d.x;
        int dstY = loc2d.y;

        // vec4 op = texelFetch(uTexture0, ivec2((dstX + 0.5) * kSrcNormX, (dstY + 0.5) * kSrcNormY), 0);
        vec4 op = texelFetch(uTexture0, loc2d, 0);
        op.x += usmY;
        op.y += usmY;
        op.z += usmY;

        outColor = op;
    // }
    // outColor = vec4(usmY, usmY, usmY, 1.0);
    // outColor = w;
}
