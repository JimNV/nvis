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

uniform bool uSymmetric;
uniform int uRadius;
uniform int uRadiusX;
uniform int uRadiusY;
uniform bool uHalfRadiusSigma;
uniform float uSigma;
uniform float uSigmaX;
uniform float uSigmaY;
uniform float uAngle;

// Texture uniforms
uniform sampler2D uTexture0;

// Texture
in vec2 vTextureCoord;

out vec4 outColor;


void main()
{
    ivec2 dimensions = textureSize(uTexture0, 0);
    ivec2 loc2d = ivec2(vTextureCoord * vec2(dimensions));

    vec4 colorSum = vec4(0.0, 0.0, 0.0, 1.0);
    float kernelSum = 0.0;

    int radiusX = uRadiusX;
    int radiusY = uRadiusY;
    float sigmaX = uSigmaX;
    float sigmaY = uSigmaY;

    if (uSymmetric)
    {
        radiusX = uRadius;
        radiusY = uRadius;
        if (uHalfRadiusSigma)
        {
            sigmaX = float(radiusX) / 2.0;
            sigmaY = float(radiusY) / 2.0;
        }
        else
        {
            sigmaX = uSigma;
            sigmaY = uSigma;
        }
    }
    
    float invSX = 1.0 / (2.0 * sigmaX * sigmaX);
    float invSY = 1.0 / (2.0 * sigmaY * sigmaY);

    float theta = radians(uAngle);
    float sinTheta = sin(theta);
    float cosTheta = cos(theta);

    for (int y = -radiusY; y <= radiusY; y++)
    {
        for (int x = -radiusX; x <= radiusX; x++)
        {
            float xp = float(x);
            float yp = float(y);
            if (!uSymmetric)
            {
                xp = xp * cosTheta - yp * sinTheta;
                yp = xp * sinTheta + yp * cosTheta;
            }

            float weight = exp(-(xp * xp * invSX + yp * yp * invSY));

            ivec2 tap = loc2d + ivec2(x, y);
            if (tap.x >= 0 && tap.x < dimensions.x && tap.y >= 0 && tap.y < dimensions.y)
            {
                kernelSum += weight;
                colorSum += texelFetch(uTexture0, tap, 0) * weight;
            }
        }
    }

    outColor = vec4(colorSum / kernelSum);
}