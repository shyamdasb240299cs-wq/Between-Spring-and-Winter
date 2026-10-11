import {Vector2} from 'three';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {FXAAShader} from 'three/addons/shaders/FXAAShader.js';

/** Edge-only antialiasing + display conversion in one pass; no full-screen blur. */
export class SharpOutput extends ShaderPass {
  constructor(){
    super({...FXAAShader,
      fragmentShader:FXAAShader.fragmentShader
        .replace('float _SubpixelBlending = 1.0;','float _SubpixelBlending = 0.35;')
        // Luma needs only a cheap HDR compression, not a full ACES transform
        // at every edge-search tap. Display tone mapping runs once per pixel.
        .replace('return dot( Sample( tex2D, uv ).rgb, vec3( 0.3, 0.59, 0.11 ) );','float b=dot(Sample(tex2D,uv).rgb,vec3(.3,.59,.11));return b/(b+.5);')
        .replace('#define EDGE_STEP_COUNT 6','#define EDGE_STEP_COUNT 3')
        .replace('#define EDGE_STEPS 1.0, 1.5, 2.0, 2.0, 2.0, 4.0','#define EDGE_STEPS 1.0, 1.5, 2.0')
        .replace('gl_FragColor = ApplyFXAA( tDiffuse, resolution.xy, vUv );','gl_FragColor = ApplyFXAA( tDiffuse, resolution.xy, vUv );\n#include <tonemapping_fragment>\n#include <colorspace_fragment>')
    });
  }
  setSize(width:number,height:number){(this.uniforms.resolution.value as Vector2).set(1/width,1/height);}
}
