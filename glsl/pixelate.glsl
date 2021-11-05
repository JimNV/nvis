#version 300 es
precision highp float;

//  common uniforms
uniform vec4 uMouse;

//  shader-specific uniforms
uniform bool uFixed;
uniform int uSize;
uniform int uWidth;
uniform int uHeight;
uniform bool uAverage;

// Texture uniforms
uniform sampler2D uTexture0;

// Texture
in vec2 vTextureCoord;

out vec4 outColor;

void main()
{
    ivec2 dimensions = textureSize(uTexture0, 0);
    ivec2 loc2d = ivec2(vTextureCoord * vec2(dimensions));

    ivec2 size = ivec2(uSize, uSize);
    if (!uFixed) {
        size = ivec2(uWidth, uHeight);
    }

//    ivec2 tlPosition = ivec2((loc2d.x / size.x) * size.x, (loc2d.y / size.y) * size.y);
    ivec2 tlPosition = (loc2d / size) * size;

    if (!uAverage) {
        outColor = texelFetch(uTexture0, tlPosition, 0);
        return;
    }

    int numTerms = 0;
    vec4 colorSum;
    for (int y = 0; y < size.y; y++)
    {
        for (int x = 0; x < size.x; x++)
        {
            ivec2 pos = tlPosition + ivec2(x, y);
            if (pos.x >=0 && pos.x < dimensions.x && pos.y >= 0 && pos.y < dimensions.y) {
                colorSum += texelFetch(uTexture0, tlPosition + ivec2(x, y), 0);
                numTerms++;
            }
        }
    }

    outColor = colorSum / float(numTerms);
}
