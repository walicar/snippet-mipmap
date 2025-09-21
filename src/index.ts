import { mat4 } from 'wgpu-matrix';
import './index.css';
import mainShader from './shaders/main.wgsl?raw';
import { loadBitmap } from './utils';

const root = document.querySelector('#root') as HTMLDivElement;

async function main() {
  if (!navigator.gpu) return
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter?.requestDevice();
  if (!device) return;

  const format = navigator.gpu.getPreferredCanvasFormat();

  const canvas = document.createElement("canvas");
  canvas.width = 480;
  canvas.height = 240;
  const context = canvas.getContext("webgpu");
  if (!context) return;
  context.configure({ device, format });
  root.append(canvas);

  const module = device.createShaderModule({
    code: mainShader
  })

  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: { module },
    fragment: {
      module,
      targets: [{ format }]
    },
  })

  const bitmap: ImageBitmap = await loadBitmap("/rectmill.png");
  const { width, height } = bitmap;
  const texture = device.createTexture({
    size: [width, height],
    format: 'rgba8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
  });
  device.queue.copyExternalImageToTexture({ source: bitmap }, { texture }, { width, height });

  const sampler = device.createSampler();

  const uniformBuffer = device.createBuffer({
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    size: 4 * 16,
  })

  const bindgroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: texture.createView() },
      { binding: 1, resource: sampler },
      { binding: 2, resource: { buffer: uniformBuffer }}
    ]
  });

  const encoder = device.createCommandEncoder();
  const descriptor: GPURenderPassDescriptor = {
    colorAttachments: [{
      view: context.getCurrentTexture().createView(),
      clearValue: [0.0,0.0,0.0,1.0],
      loadOp: "clear",
      storeOp: "store"
    }],
  };

  const fovy = 60 * Math.PI / 180;
  const aspect = canvas.width / canvas.height;
  const near = 0.1;
  const far = 2000;
  const proj = mat4.perspective(fovy, aspect, near, far);

  const eye = [0,0.5,-5];
  const target = [0,0,0];
  const up = [0,1,0];
  const view = mat4.lookAt(eye, target, up);

  const model = mat4.identity();

  const mvp = mat4.mul(proj, view);
  mat4.mul(mvp, model, mvp);
  device.queue.writeBuffer(uniformBuffer, 0, mvp.buffer);

  const pass = encoder.beginRenderPass(descriptor)
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindgroup);
  pass.draw(6);
  pass.end();

  const commandBuffer = encoder.finish();
  device.queue.submit([commandBuffer]);
}

main();