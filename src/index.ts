import { mat4 } from 'wgpu-matrix';
import './index.css';
import mainShader from './shaders/main.wgsl?raw';
import { loadTex, makeMips } from './utils';

const ENABLE_MIP = 1;
const root = document.querySelector('#root') as HTMLDivElement;

async function main() {
  if (!navigator.gpu) return;
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter?.requestDevice();
  if (!device) return;

  const format = navigator.gpu.getPreferredCanvasFormat();

  const canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const context = canvas.getContext('webgpu');
  if (!context) return;
  context.configure({ device, format });
  root.append(canvas);

  const module = device.createShaderModule({
    code: mainShader,
  });

  const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module },
    fragment: {
      module,
      targets: [{ format }],
    },
  });

  const uniformBuffer = device.createBuffer({
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    size: 4 * 16,
  });

  const fovy = (60 * Math.PI) / 180;
  const aspect = canvas.width / canvas.height;
  const near = 0.1;
  const far = 2000;
  const proj = mat4.perspective(fovy, aspect, near, far);

  const eye = [0, 1.5, -5];
  const target = [0, 0, 0];
  const up = [0, 1, 0];
  const view = mat4.lookAt(eye, target, up);

  let model = mat4.identity();
  model = mat4.rotateX(model, (90 * Math.PI) / 180);
  model = mat4.scale(model, [50, 50, 1]);

  const mvp = mat4.mul(proj, view);
  mat4.mul(mvp, model, mvp);
  device.queue.writeBuffer(uniformBuffer, 0, mvp.buffer);

  const image = await loadTex('/rectmill.png');
  const { data, width, height } = image;
  let texture = device.createTexture({
    size: [width, height],
    format: 'rgba8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  });

  if (ENABLE_MIP) {
    const mips = makeMips(image);
    texture.destroy();
    texture = device.createTexture({
      size: [width, height],
      mipLevelCount: mips.length,
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });

    for (let level = 0; level < mips.length; level++) {
      const { data, width, height } = mips[level];
      device.queue.writeTexture(
        { texture, mipLevel: level },
        data,
        { bytesPerRow: width * 4 },
        { width, height },
      );
    }
  } else {
    device.queue.writeTexture(
      { texture },
      data,
      { bytesPerRow: width * 4 },
      { width, height },
    );
  }

  const sampler = device.createSampler({
    addressModeU: 'repeat',
    addressModeV: 'repeat',
  });

  const bindgroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer } },
      { binding: 1, resource: texture.createView() },
      { binding: 2, resource: sampler },
    ],
  });

  const encoder = device.createCommandEncoder();
  const pass = encoder.beginRenderPass({
    colorAttachments: [
      {
        view: context.getCurrentTexture().createView(),
        clearValue: [0.0, 0.0, 0.0, 1.0],
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  });

  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindgroup);
  pass.draw(6);
  pass.end();

  const commandBuffer = encoder.finish();
  device.queue.submit([commandBuffer]);
}

main();
