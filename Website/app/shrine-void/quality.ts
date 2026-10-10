import type * as THREE from 'three';
export function createQualityController(renderer: THREE.WebGLRenderer) {
  const gl = renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
  const gpu = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : 'unknown';
  const integrated = /intel|iris|uhd|swiftshader|mali|adreno/i.test(gpu);
  const mobile = matchMedia('(pointer: coarse)').matches;
  let scale = mobile ? .88 : integrated ? .84 : 1, average = 16.67, samples = 0, elapsed = 0;
  const min = .58, max = integrated ? .9 : 1;
  return {
    get scale() { return scale; }, get fps() { return 1000 / average; }, gpu,
    get reflectionSize() { return scale < .7 ? 384 : 512; },
    get reflectionRate() { return scale < .7 ? 15 : 24; },
    update(rawDt: number) {
      if (rawDt <= 0 || rawDt > .5) return false;
      average += (rawDt * 1000 - average) * .025; samples++; elapsed += rawDt;
      if (samples < 120 || elapsed < 5) return false;
      const previous = scale;
      if (average > 19.8) scale = Math.max(min,scale - .09);
      else if (average < 17.5) scale = Math.min(max,scale + .04);
      elapsed = 0; return previous !== scale;
    }
  };
}
