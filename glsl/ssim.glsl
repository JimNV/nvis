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
//uniform vec2 uDimensions;
uniform vec2 uMouse;
uniform float uTime;
uniform float uFrame;

//  shader-specific uniforms
uniform int uMode;
uniform float uC1;
uniform float uC2;
uniform float uC3;
uniform float uSigma;
uniform float uWeightLuminance;
uniform float uWeightContrast;
uniform float uWeightStructure;
uniform bool uInvert;
uniform int uColorMode;
uniform int uShowColorMap;

// Texture uniforms
uniform sampler2D uTexture0;
uniform sampler2D uTexture1;

// Texture
in vec2 vTextureCoord;

out vec4 outColor;


float RGBtoLuma(vec3 color)
{
    const float RED_COEFFICIENT = 0.212655;
    const float GREEN_COEFFICIENT = 0.715158;
    const float BLUE_COEFFICIENT = 0.072187;

    return color.r * RED_COEFFICIENT + color.g * GREEN_COEFFICIENT + color.b * BLUE_COEFFICIENT;
}

vec3 XYZtoLAB(vec3 c)
{
    vec3 n = abs(c) / vec3(95.047, 100, 108.883);
    vec3 v;
    v.x = (n.x > 0.008856) ? pow(n.x, 1.0 / 3.0) : (7.787 * n.x) + (16.0 / 116.0);
    v.y = (n.y > 0.008856) ? pow(n.y, 1.0 / 3.0) : (7.787 * n.y) + (16.0 / 116.0);
    v.z = (n.z > 0.008856) ? pow(n.z, 1.0 / 3.0) : (7.787 * n.z) + (16.0 / 116.0);
    return vec3((116.0 * v.y) - 16.0, 500.0 * (v.x - v.y), 200.0 * (v.y - v.z));
}

vec3 RGBtoXYZ(vec3 c)
{
    vec3 tmp;
    c = abs(c);
    tmp.x = (c.r > 0.04045) ? pow((c.r + 0.055) / 1.055, 2.4) : c.r / 12.92;
    tmp.y = (c.g > 0.04045) ? pow((c.g + 0.055) / 1.055, 2.4) : c.g / 12.92,
    tmp.z = (c.b > 0.04045) ? pow((c.b + 0.055) / 1.055, 2.4) : c.b / 12.92;
    const mat3 mat = mat3(
		0.4124, 0.3576, 0.1805,
        0.2126, 0.7152, 0.0722,
        0.0193, 0.1192, 0.9505
	);

    return 100.0 * (tmp * transpose(mat));
}

vec3 RGBtoLAB(vec3 c)
{
    vec3 lab = XYZtoLAB(RGBtoXYZ(c));
    return vec3(lab.x / 100.0, 0.5 + 0.5 * (lab.y / 127.0), 0.5 + 0.5 * (lab.z / 127.0));
}

vec3 HSVtoRGB(vec3 hsv)
{
    float h = hsv.x;
    float s = hsv.y;
    float v = hsv.z;

    const float PI = 3.14159265358979;
    vec3 rgb = vec3(v, v, v);

    if (s > 0.0)
    {
	    h = mod(h + 2.0 * PI, 2.0 * PI);
	    h /= (PI / 3.0);
	    int i = int(floor(h));
	    float f = h - float(i);
	    float p = v * (1.0 - s);
	    float q = v * (1.0 - (s*f));
	    float t = v * (1.0 - (s*(1.0-f)));

        if (i == 0)
            rgb = vec3(v,t,p);
        else if (i == 1)
            rgb = vec3(q,v,p);
        else if (i == 2)
            rgb = vec3(p,v,t);
        else if (i == 3)
            rgb = vec3(p,q,v);
        else if (i == 4)
            rgb = vec3(t,p,v);
        else
            rgb = vec3(v,p,q);
    }

    return rgb;
}

vec3 heatMap(float value, float lb, float ub)
{
    float p = clamp((value - lb) / (ub - lb), 0.0, 1.0);

    float r, g, b;
    float h = 3.7 * (1.0 - p); // 3.7 is blue
    float s = sqrt(p);
    float v = sqrt(p);
    return HSVtoRGB(vec3(h, s, v));
}

vec3 colorRamp(float value)
{
    vec3 color;

    if (value < 0.25)
        color.r = 0.0;
    else if (value >= 0.57)
        color.r = 1.0;
    else
       color.r = value * 3.215 - 0.78125;

    if (value < 0.42)
        color.g = 0.0;
    else if (value >= 0.92)
        color.g = 1.0;
    else
        color.g = 2.0 * value - 0.84;

    if (value < 0.0)
        color.b = 0.0;
    else if (value > 1.0)
        color.b = 1.0;
    else if (value < 0.25)
        color.b = 4.0 * value;
    else if (value < 0.42)
        color.b = 1.0;
    else if (value < 0.92)
        color.b = -2.0 * value + 1.84;
    else
        color.b = value * 12.5 - 11.5;

    return color;
}

vec3 colorMap(float value, int mode)
{
    vec3 color;

    if (mode == 0)
    {
        //  per-pixel difference (no action)
    }
    else if (mode == 1)
    {
        //  Jet
        color = clamp(1.5 - abs(4.0 * clamp(value, 0.0, 1.0) - vec3(3.0, 2.0, 1.0)), 0.0, 1.0);
    }
    else if (mode == 2)
    {
        //  Heat map
        color = heatMap(value, 0.0, 1.0);
    }
    else if (mode == 3)
    {
        //  grayscale
        color = vec3(value, value, value);
    }
    else if (mode == 4)
    {
        //  black-blue-violet-yellow-white
        color = colorRamp(value);
    }
    else
    {
        // binary
        color = (value > 0.0 ? vec3(1.0, 1.0, 1.0) : vec3(0.0, 0.0, 0.0));
    }

    return color;
}

bool isNaN(float val)
{
  return !(val < 0.0 || 0.0 < val || val == 0.0);
}

bool isInf(float val)
{
  return (val != 0.0 && val * 2.0 == val);
}

float lerp(float a, float b, float v)
{
    v = clamp(v, 0.0, 1.0);
    return a * (1.0 - v) + b * v;
}

vec3 lerp(vec3 a, vec3 b, float v)
{
    v = clamp(v, 0.0, 1.0);
    return a * (1.0 - v) + b * v;
}

#define KERNELWIDTH 11

float ssim(ivec2 loc2d, float sigma)
{
    const int kKernelWidth = KERNELWIDTH;
    const int kHalfKernelWidth = (kKernelWidth - 1) / 2;

    //const float C1 = 0.01 * 0.01;
    //const float C2 = 0.03 * 0.03;
    //const float C3 = C2 * 0.5;

    float weights[kKernelWidth];
    float weightsSum = 0.0;
    float sigmaSq = sigma * sigma;
    int i = 0;
    for (i = 0; i < kKernelWidth; i++)
    {
        float x = float(i - kHalfKernelWidth);
        weights[i] = exp(-x * x / (2.0 * sigmaSq));
        weightsSum += weights[i];
    }
    for (i = 0; i < kKernelWidth; i++)
    {
        weights[i] /= weightsSum;
    }

    float mu0 = 0.0, mu1 = 0.0;
    {
        for (int y = 0; y < kKernelWidth; y++)
        {
            for (int x = 0; x < kKernelWidth; x++)
            {
                float weight = weights[x] * weights[y];
                mu0 += RGBtoLuma(texelFetch(uTexture0, loc2d + ivec2(x, y), 0).rgb) / 255.0;
                mu1 += RGBtoLuma(texelFetch(uTexture1, loc2d + ivec2(x, y), 0).rgb) / 255.0;
                // mu0 += s_Ref[threadId.y + y][threadId.x + x] * weight;
                // mu1 += s_Test[threadId.y + y][threadId.x + x] * weight;
            }
        }
    }

    float mu0Sq = mu0 * mu0;
    float mu1Sq = mu1 * mu1;
    float mu0mu1 = mu0 * mu1;

    float sigma0Sq = 0.0, sigma1Sq = 0.0, sigma01 = 0.0;
    {
        for (int y = 0; y < kKernelWidth; ++y)
        {
            for (int x = 0; x < kKernelWidth; ++x)
            {
                float weight = weights[x] * weights[y];
                float color0 = RGBtoLuma(texelFetch(uTexture0, loc2d + ivec2(x, y), 0).rgb) / 255.0;
                float color1 = RGBtoLuma(texelFetch(uTexture1, loc2d + ivec2(x, y), 0).rgb) / 255.0;
                // float color0 = s_Ref[threadId.y + y][threadId.x + x];
                // float color1 = s_Test[threadId.y + y][threadId.x + x];
                sigma0Sq += (color0 - mu0) * (color0 - mu0) * weight;
                sigma1Sq += (color1 - mu1) * (color1 - mu1) * weight;
                sigma01 += (color0 - mu0) * (color1 - mu1) * weight;
            }
        }
    }
    float sigma0sigma1 = sqrt(sigma0Sq * sigma1Sq);

    float ssimSimple = ((2.0 * mu0mu1 + uC1) * (2.0 * sigma01 + uC2)) / ((mu0Sq + mu1Sq + uC1) * (sigma0Sq + sigma1Sq + uC2));

    float L = pow((2.0 * mu0mu1 + uC1) / (mu0Sq + mu1Sq + uC1), uWeightLuminance);
    float C = pow((2.0 * sigma0sigma1 + uC2) / (sigma0Sq + sigma1Sq + uC2), uWeightContrast);
    float S = (sigma01 + uC3) / (sigma0sigma1 + uC3);
    S = (uWeightStructure == float(int(uWeightStructure)) ? S : pow(S, uWeightStructure));

    float ssim = 1.0;
    if (uMode == 0)
        ssim = L * C * S;
    else if (uMode == 1)
        ssim = ssimSimple;
    else if (uMode == 2)
        ssim = L;
    else if (uMode == 3)
        ssim = C;
    else if (uMode == 4)
        ssim = S;

    return ssim;
}

void main()
{
    ivec2 dimensions = textureSize(uTexture0, 0);
    ivec2 loc2d = ivec2(vTextureCoord * vec2(dimensions));

    float ssimValue = 1.0 - ssim(loc2d, uSigma);

    if (uInvert) {
        ssimValue = 1.0 - ssimValue;
    }

    vec3 value = vec3(ssimValue, ssimValue, ssimValue);

    //float error = RGBtoLuma(value); // single error value per pixel

    // A small legend color map
    float fade = 0.0;
    if (uColorMode != 0 && uShowColorMap != 0)
    {
        vec2 paletteCorner = vec2((uShowColorMap == 1 || uShowColorMap == 3) ? 0.0 : 1.0, (uShowColorMap == 1 || uShowColorMap == 2) ? 0.0 : 1.0);

        float kPaletteEdgeWidth = 2.0;
        float kPaletteLength = float(min(dimensions.x, dimensions.y)) * 0.1;
        float kPaletteWidth = kPaletteLength / 5.0;
        vec2 kPaletteCenter = abs(vec2(float(dimensions.x), float(dimensions.y)) * paletteCorner - vec2(kPaletteWidth * 5.0, kPaletteLength * 2.0));

        vec2 paletteVec = vec2(loc2d) - vec2(float(kPaletteCenter.x), float(kPaletteCenter.y));
        vec2 paletteDim = vec2(kPaletteWidth, kPaletteLength);
        bool bInside = abs(paletteVec.x) < kPaletteWidth && abs(paletteVec.y) < kPaletteLength;
        if (bInside)
        {
            value = vec3((1.0 - paletteVec.y) / kPaletteLength * 0.5 + 0.5);

            if (uColorMode == 0)
            {
                if (paletteVec.x < -0.33 * kPaletteWidth)
                    value.g = value.b = 0.0;
                else if (paletteVec.x < 0.33 * kPaletteWidth)
                    value.r = value.b = 0.0;
                else
                    value.r = value.g = 0.0;
            }
        }

        vec2 distToEdge = clamp(1.0 - abs(vec2(kPaletteWidth, kPaletteLength) - abs(paletteVec)) / kPaletteEdgeWidth, 0.0, 1.0);
        bool bInsideEdge = abs(paletteVec.x) < kPaletteWidth + kPaletteEdgeWidth && abs(paletteVec.y) < kPaletteLength + kPaletteEdgeWidth;
        fade = max(distToEdge.x, distToEdge.y) * (bInsideEdge ? 1.0 : 0.0);
    }

    vec3 color;
    if (uColorMode != 0) {
        color = colorMap(RGBtoLuma(value.rgb), uColorMode);
        color = lerp(color, vec3(0.5, 0.5, 0.5), fade);
    } else
        color = vec3(1.0 - ssimValue, 1.0 - ssimValue, 1.0 - ssimValue);

    //if (uMarkInfNaN)
    if (false)
    {
        if (isNaN(value.r) || isNaN(value.g) || isNaN(value.b))
        {
            color = vec3(1.0, 0.0, 0.0);
        }
        else if (isInf(value.r) || isInf(value.g) || isInf(value.b))
        {
            color = vec3(0.0, 1.0, 0.0);
        }
    }

    //color = vec3(ssimValue, ssimValue, ssimValue) * 255.0;

    //outColor = vec4(color, error);
    outColor = vec4(color, 1.0);  //  TODO: allow error metric to be supplied in alpha channel
}
