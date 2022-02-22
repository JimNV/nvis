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

// Texture uniforms
uniform sampler2D uTexture0;

// Texture
in vec2 vTextureCoord;

out vec4 outColor;

const vec3 DEFAULT_ILLUMINANT = vec3(0.950428545, 1.000000000, 1.088900371);
const vec3 INV_DEFAULT_ILLUMINANT = vec3(1.052156925, 1.000000000, 0.918357670);


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


void main()
{
    ivec2 dimensions = textureSize(uTexture0, 0);
    ivec2 loc2d = ivec2(vTextureCoord * vec2(dimensions));

    vec3 sRGB = texelFetch(uTexture0, loc2d, 0).rgb;

    vec3 YCxCz = sRGBtoYCxCz(sRGB);

    outColor = vec4(YCxCz, 1.0);
}
