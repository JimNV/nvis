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
uniform vec4 uMouse;

//  shader-specific uniforms
uniform int uDirection;
uniform bool uUseMouse;
uniform float uLevel;
uniform vec3 uLineColor;
uniform float uLineThickness;
uniform float uLineSharpness;

// Texture uniforms
uniform sampler2D uTexture0;
uniform sampler2D uTexture1;

// Texture
in vec2 vTextureCoord;

out vec4 outColor;

// #define M_PI 3.1415926535897932384626433832795

void main()
{
    vec2 loc2d = vTextureCoord;

    vec2 dimensions = vec2(textureSize(uTexture0, 0));
    vec2 position = loc2d * dimensions;

    vec4 colorA = texture(uTexture0, vTextureCoord);
    vec4 colorB = texture(uTexture1, vTextureCoord);

    //  TODO: allow for abitrary angle
    // float direction = uDirection * M_PI / 180.0;
    // vec2 directionVector = vec2(cos(direction), sin(direction));
    // float value = dot(directionVector, position);
    // float midValue = (uUseMouse && uMouse.z > 0.0 ? (uDirection == 0 ? uMouse.x / dimensions.x : uMouse.y / dimensions.y) : uLevel);

    float value = (uDirection == 0 ? position.x : position.y);
    float midValue = (uUseMouse && uMouse.z > 0.0 ? (uDirection == 0 ? uMouse.x / dimensions.x : uMouse.y / dimensions.y) : uLevel / 100.0);
    midValue *= (uDirection == 0 ? dimensions.x : dimensions.y);

    outColor = (value < midValue ? colorA : colorB);
    float alpha = clamp(1.0 - pow(2.0 * abs(midValue - value) / uLineThickness, uLineSharpness), 0.0, 1.0);
    outColor = outColor * (1.0 - alpha) + vec4(uLineColor, 1.0) * alpha;
}
