import type * as THREE from 'three';

/** Preserve image detail. Adapt secondary work rather than shrinking to a blurry canvas. */
export function createQualityController(renderer: THREE.WebGLRenderer) {
  const gl = renderer.getContext() as WebGL2RenderingContext;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const gpu = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : 'unknown';
  const timer = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  const mobile = matchMedia('(pointer: coarse)').matches;
  const integrated=/intel|iris|uhd|swiftshader|mali|adreno/i.test(gpu);
  let average = 16.67, elapsed = 0, frames = 0;
  const timings={scene:0,output:0};
  let constrained = integrated||mobile;
  let current: {query:WebGLQuery;label:'scene'|'output'} | null = null;
  const pending: {query:WebGLQuery;label:'scene'|'output'}[] = [];
  return {
    get scale() { return mobile ? Math.min(1.4, devicePixelRatio || 1) : 1; },
    get fps() { return 1000 / average; }, gpu,
    get gpuMs() { return timings.scene+timings.output; },
    get sceneMs(){return timings.scene;},get outputMs(){return timings.output;},
    get constrained() { return constrained; },
    get reflectionSize() { return constrained ? 512 : 896; },
    get reflectionRate() { return constrained ? 18 : 30; },
    update(rawDt: number) {
      if (rawDt <= 0 || rawDt > .5) return false;
      average += (rawDt * 1000 - average) * .025; elapsed += rawDt;
      if (timer) while (pending.length && gl.getQueryParameter(pending[0].query, gl.QUERY_RESULT_AVAILABLE)) {
        const {query,label} = pending.shift()!;
        if (!gl.getParameter(timer.GPU_DISJOINT_EXT)) {
          const ms = Number(gl.getQueryParameter(query, gl.QUERY_RESULT)) / 1e6;
          timings[label] = timings[label] ? timings[label] + (ms - timings[label]) * .18 : ms;
        }
        gl.deleteQuery(query);
      }
      if (elapsed < 5) return false;
      elapsed = 0;
      const previous = constrained;
      // Hardware timing distinguishes rendering cost from busy/occluded rAF.
      const cost = timings.scene+timings.output || average;
      if (cost > 17.5) constrained = true;
      else if (cost < 12 && !mobile&&!integrated) constrained = false;
      return previous !== constrained;
    },
    beginRender(label:'scene'|'output') {
      if(label==='scene')frames++;
      if (!timer || frames % 12 || pending.length >= 6) return;
      const query = gl.createQuery();
      if (query){current={query,label};gl.beginQuery(timer.TIME_ELAPSED_EXT, query);}
    },
    endRender() {
      if (!timer || !current) return;
      gl.endQuery(timer.TIME_ELAPSED_EXT); pending.push(current); current = null;
    },
    dispose() { if(current&&timer)gl.endQuery(timer.TIME_ELAPSED_EXT);if(current)gl.deleteQuery(current.query);pending.forEach(q=>gl.deleteQuery(q.query)); }
  };
}
