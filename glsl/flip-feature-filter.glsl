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
uniform vec2 uDimensions;
uniform vec2 uMouse;
uniform float uTime;
uniform float uFrame;

//  shader-specific uniforms
uniform bool uFixedPPD;
uniform float uPPD;
uniform float uMonitorDistance;
uniform float uMonitorWidth;
uniform int uMonitorResolutionX;

// Texture uniforms
// uniform sampler2D uTexture0;

// Texture
in vec2 vTextureCoord;

out vec4 outColor;

const vec3 DEFAULT_ILLUMINANT = vec3(0.950428545, 1.000000000, 1.088900371);
const vec3 INV_DEFAULT_ILLUMINANT = vec3(1.052156925, 1.000000000, 0.918357670);

const float M_PI = 3.1415926535897932384626433832795;
const float M_PI_2 = M_PI * M_PI;

const struct tGaussianConstants
{
    vec3 a1;
    vec3 b1;
    vec3 a2;
    vec3 b2;
};
tGaussianConstants GaussianConstants = tGaussianConstants(vec3(1.0, 1.0, 34.1), vec3(0.0047, 0.0053, 0.04), vec3(0.0, 0.0, 13.5), vec3(1.0e-5, 1.0e-5, 0.025));

vec3 sRGBtoLinearRGB(vec3 sRGB)
{
    float R = (sRGB.r <= 0.04045 ? sRGB.r / 12.92 : pow((sRGB.r + 0.055) / 1.055, 2.4));
    float G = (sRGB.g <= 0.04045 ? sRGB.g / 12.92 : pow((sRGB.g + 0.055) / 1.055, 2.4));
    float B = (sRGB.b <= 0.04045 ? sRGB.b / 12.92 : pow((sRGB.b + 0.055) / 1.055, 2.4));

    return vec3(R, G, B);
}

vec3 LinearRGBtoXYZ(vec3 sRGB)
{
    const mat3 mat = mat3(
        0.4124564, 0.3575761, 0.1804375,
        0.2126729, 0.7151522, 0.0721750,
        0.0193339, 0.1191920, 0.9503041
    );
    return sRGB * mat;
}

vec3 XYZtoYCxCz(vec3 XYZ)
{
    // The default illuminant is D65.
    XYZ = XYZ * INV_DEFAULT_ILLUMINANT;
    float Y = 116.0 * XYZ.y - 16.0;
    float Cx = 500.0 * (XYZ.x - XYZ.y);
    float Cz = 200.0 * (XYZ.y - XYZ.z);

    return vec3(Y, Cx, Cz);
}

vec3 sRGBtoYCxCz(vec3 sRGB)
{
    return XYZtoYCxCz(LinearRGBtoXYZ(sRGBtoLinearRGB(sRGB)));
}

float CIELab2Gray(vec3 CIELab)
{
    return (CIELab.x + 16.0) / 116.0;
}

int calculateSpatialFilterRadius(float ppd)
{
    float deltaX = 1.0f / ppd;

    float maxScaleParameter = max(max(max(GaussianConstants.b1.x, GaussianConstants.b1.y), max(GaussianConstants.b1.z, GaussianConstants.b2.x)), max(GaussianConstants.b2.y, GaussianConstants.b2.z));
    int radius = int(ceil(3.0f * sqrt(maxScaleParameter / (2.0f * M_PI_2)) * ppd)); // Set radius based on largest scale parameter.

    return radius;
}

// float Gaussian(float x, float sigma)
// {
//     return exp(-(x * x) / (2.0f * sigma * sigma));
// }

// float Gaussian(float x2, float a, float b)
// {
//     // 1D Gaussian in alternative form (see FLIP paper)
//     float invB = 1.0 / b;
//      return a * sqrt(M_PI * invB) * exp(-M_PI_2 * x2 * invB);
// }

// float GaussianSqrt(float x2, float a, float b)
// {
//     // Needed to separate sum of Gaussians filters (see separatedConvolutions.pdf in the FLIP repository)
//     return sqrt(a * sqrt(M_PI / b)) * exp(-M_PI_2 * x2 / b);
// }

float Gaussian(float x, float y, float sigma)
{
    return exp(-(x * x + y * y) / (2.0 * sigma * sigma));
}

float GaussSum(float x2, float a1, float b1, float a2, float b2)
{
    return a1 * sqrt(M_PI / b1) * exp(-M_PI_2 * x2 / b1) + a2 * sqrt(M_PI / b2) * exp(-M_PI_2 * x2 / b2);
}

const struct tFLIPConstants
{
    float gqc;
    float gpc;
    float gpt;
    float gw;
    float gqf;
};
tFLIPConstants FLIPConstants = tFLIPConstants(0.7, 0.4, 0.95, 0.082, 0.5);

void main()
{
    ivec2 loc2d = ivec2(vTextureCoord * uDimensions);

    float PPD = (uFixedPPD ? uPPD : uMonitorDistance * (float(uMonitorResolutionX) / uMonitorWidth) * (M_PI / 180.0));

    //  Feature filtering
    float stdDev = 0.5 * FLIPConstants.gw * PPD;
    int filterRadius = int(ceil(3.0 * stdDev));
    int filterWidth = 2 * filterRadius + 1;

    if (loc2d.x >= filterWidth || loc2d.y >= filterWidth) {
        outColor = vec4(1.0, 0.0, 0.0, 1.0);
        return;
    }

    vec4 filterValue = vec4(0.0, 0.0, 0.0, 0.0);

    vec4 weight;
    vec4 positiveWeightsSum = vec4(0.0, 0.0, 0.0, 0.0);
    vec4 negativeWeightsSum = vec4(0.0, 0.0, 0.0, 0.0);

    for (int y = 0; y < filterWidth; y++)
    {
        float yp = float(y - filterRadius);
        
        for (int x = 0; x < filterWidth; x++)
        {
            float xp = float(x - filterRadius);

            float G = Gaussian(xp, yp, stdDev);

            int tapLoc = y * filterWidth + x;

            //  xy = point
            weight.x = (xp * xp / (stdDev * stdDev) - 1.0) * G;
            weight.y = (yp * yp / (stdDev * stdDev) - 1.0) * G;

            //  zw = edge
            weight.z = -xp * G;
            weight.w = -yp * G;

            if (x == loc2d.x && y == loc2d.y) {
                filterValue = weight;
            }

            // bvec4 bPositive = (weight > 0.0);
            // positiveWeightSum += (bPositive ? weight : 0.0);
            // negativeWeightSum += (bPositive ? 0.0 : weight);

            if (weight.x > 0.0)
            {
                positiveWeightsSum.x += weight.x;
            }
            else
            {
                negativeWeightsSum.x += -weight.x;
            }

            if (weight.y > 0.0)
            {
                positiveWeightsSum.y += weight.y;
            }
            else
            {
                negativeWeightsSum.y += -weight.y;
            }

            if (weight.z > 0.0)
            {
                positiveWeightsSum.z += weight.z;
            }
            else
            {
                negativeWeightsSum.z += -weight.z;
            }

            if (weight.w > 0.0)
            {
                positiveWeightsSum.w += weight.w;
            }
            else
            {
                negativeWeightsSum.w += -weight.w;
            }
        }
    }

    //  normalize positive weights to sum to 1 and negative weights to sum to -1
    weight = filterValue;

    weight.x /= (weight.x > 0.0 ? positiveWeightsSum.x : negativeWeightsSum.x);
    weight.y /= (weight.y > 0.0 ? positiveWeightsSum.y : negativeWeightsSum.y);
    weight.z /= (weight.z > 0.0 ? positiveWeightsSum.z : negativeWeightsSum.z);
    weight.w /= (weight.w > 0.0 ? positiveWeightsSum.w : negativeWeightsSum.w);

    outColor = weight;
}
