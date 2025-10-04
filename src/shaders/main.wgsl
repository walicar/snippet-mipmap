struct VsOut {
    @builtin(position) pos: vec4f,
    @location(0) texcoord: vec2f
}

@group(0) @binding(0) var<uniform> mvp: mat4x4f;

@vertex fn vs(
    @builtin(vertex_index) idx: u32
) -> VsOut {
    let pos = array(
        vec2f(-1,-1),
        vec2f(-1,1),
        vec2f(1,-1),
        vec2f(-1,1),
        vec2f(1,1),
        vec2f(1,-1)
    );

    let tex = array(
        vec2f(0,0),
        vec2f(0,1),
        vec2f(1,0),
        vec2f(0,1),
        vec2f(1,1),
        vec2f(1,0),
    );

    var vsOut: VsOut;
    vsOut.pos = mvp * vec4f(pos[idx], 0, 1);
    vsOut.texcoord = tex[idx] * vec2f(75,75);
    return vsOut;
}

@group(0) @binding(1) var imgTexture: texture_2d<f32>;
@group(0) @binding(2) var imgSampler: sampler;

@fragment fn fs(in: VsOut) -> @location(0) vec4f {
    return textureSample(imgTexture, imgSampler, in.texcoord);
}
