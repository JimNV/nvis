#version 300 es

precision highp float;

//  common uniforms
//  TODO!

//  shader-specific uniforms
uniform int uDirection;
uniform float uLevel;

// Texture uniforms
uniform sampler2D uTexture0;
uniform sampler2D uTexture1;

// Texture
in vec2 vTextureCoord;

out vec4 outColor;

void main()
{
    vec2 loc2d = vTextureCoord;

    vec2 dimensions = vec2(textureSize(uTexture0, 0));
    vec2 position = loc2d * dimensions;

    vec4 colorA = texture(uTexture0, vTextureCoord);
    vec4 colorB = texture(uTexture1, vTextureCoord);

    float value = (uDirection == 0 ? position.x : position.y);
    float compValue = uLevel * (uDirection == 0 ? dimensions.x : dimensions.y);

    if (value < compValue - 1.0)
        outColor = colorA;
    else if (value > compValue + 1.0)
        outColor = colorB;
    else
        outColor = vec4(1.0, 0.0, 0.0, 1.0);
}
