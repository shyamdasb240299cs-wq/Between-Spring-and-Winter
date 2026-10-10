import * as THREE from 'three';
import {Pass,FullScreenQuad} from 'three/addons/postprocessing/Pass.js';

/** Continuous Gaussian glow at quarter resolution; no offset silhouette copies. */
export class GlowPass extends Pass {
  private horizontal = new THREE.WebGLRenderTarget(256,144,{type:THREE.HalfFloatType,depthBuffer:false});
  private vertical = this.horizontal.clone();
  private blur = new THREE.ShaderMaterial({
    uniforms:{image:{value:null},step:{value:new THREE.Vector2()},extract:{value:1}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform sampler2D image;uniform vec2 step;uniform float extract;varying vec2 vUv;
      vec3 sampleLight(vec2 uv){vec3 c=texture2D(image,uv).rgb;float b=max(c.r,max(c.g,c.b));return mix(c,c*max(0.,b-1.15)/max(b,1.),extract);}
      void main(){vec3 c=sampleLight(vUv)*.19648255;
        for(int i=1;i<=6;i++){float weight=exp(-float(i*i)/8.)*.19648255;vec2 d=step*float(i);c+=(sampleLight(vUv+d)+sampleLight(vUv-d))*weight;}gl_FragColor=vec4(c,1.);}`,
    depthTest:false,depthWrite:false
  });
  private composite = new THREE.ShaderMaterial({
    uniforms:{image:{value:null},glow:{value:this.vertical.texture}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform sampler2D image;uniform sampler2D glow;varying vec2 vUv;void main(){gl_FragColor=vec4(texture2D(image,vUv).rgb+texture2D(glow,vUv).rgb*.42,1.);}',
    depthTest:false,depthWrite:false
  });
  private quad = new FullScreenQuad(this.blur);
  setSize(width:number,height:number){this.horizontal.setSize(Math.max(1,Math.round(width/4)),Math.max(1,Math.round(height/4)));this.vertical.setSize(this.horizontal.width,this.horizontal.height);}
  render(renderer:THREE.WebGLRenderer,writeBuffer:THREE.WebGLRenderTarget,readBuffer:THREE.WebGLRenderTarget){
    this.quad.material=this.blur;this.blur.uniforms.image.value=readBuffer.texture;this.blur.uniforms.extract.value=1;
    this.blur.uniforms.step.value.set(1/this.horizontal.width,0);renderer.setRenderTarget(this.horizontal);this.quad.render(renderer);
    this.blur.uniforms.image.value=this.horizontal.texture;this.blur.uniforms.extract.value=0;this.blur.uniforms.step.value.set(0,1/this.vertical.height);
    renderer.setRenderTarget(this.vertical);this.quad.render(renderer);
    this.quad.material=this.composite;this.composite.uniforms.image.value=readBuffer.texture;
    renderer.setRenderTarget(this.renderToScreen?null:writeBuffer);this.quad.render(renderer);
  }
  dispose(){this.horizontal.dispose();this.vertical.dispose();this.blur.dispose();this.composite.dispose();this.quad.dispose();}
}
