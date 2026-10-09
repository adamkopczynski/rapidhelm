import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import type { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';

// Fine surface detail is visual only. Position and large-scale normals remain Rust-owned.
export function createRiverMaterial(scene: Scene) {
  const material = new ShaderMaterial('flowing whitewater', scene, {
    vertexSource: `precision highp float;
      attribute vec3 position; attribute vec3 normal; attribute vec4 color;
      uniform mat4 world; uniform mat4 worldViewProjection;
      varying vec3 p; varying vec3 n; varying vec4 flow;
      void main(){p=(world*vec4(position,1.)).xyz;n=normalize(mat3(world)*normal);
        flow=color;gl_Position=worldViewProjection*vec4(position,1.);}`,
    fragmentSource: `precision highp float;
      varying vec3 p; varying vec3 n; varying vec4 flow;
      uniform float time; uniform vec3 eye;
      float hash(vec2 q){return fract(sin(dot(q,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 q){vec2 i=floor(q),f=fract(q);f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
      float fbm(vec2 q){return .55*noise(q)+.28*noise(q*2.07)+.17*noise(q*4.13);}
      void main(){
        vec2 uv=p.xz-flow.yz*time*.65;
        float fine=fbm(uv*5.);
        vec2 ripple=vec2(noise(uv*9.),noise(uv*9.+17.))-.5;
        vec3 normal=normalize(n+vec3(ripple.x,0.,ripple.y)*(.09+flow.x*.32));
        vec3 view=normalize(eye-p);float fresnel=pow(1.-max(dot(normal,view),0.),4.);
        vec3 sky=mix(vec3(.40,.61,.67),vec3(.78,.88,.90),max(reflect(-view,normal).y,0.));
        vec3 water=mix(vec3(.055,.19,.155),sky,.12+.72*fresnel);
        float sun=pow(max(dot(normal,normalize(view+vec3(-.35,.85,.4))),0.),180.);
        water+=vec3(1.,.94,.78)*sun*.85;
        float lace=fbm(uv*1.8+vec2(fine*.8));
        float coverage=clamp(flow.x*.84+flow.w*.75,0.,.94);
        float foam=smoothstep(1.-coverage-.12,1.-coverage+.10,lace);
        vec3 froth=mix(vec3(.62,.77,.72),vec3(.96,.99,.96),fine);
        gl_FragColor=vec4(mix(water,froth,foam),1.);
      }`,
  }, { attributes: ['position','normal','color'], uniforms: ['world','worldViewProjection','time','eye'] });
  material.backFaceCulling = false;
  material.setVector3('eye', Vector3.Zero());
  return { material, update(time: number) {
    material.setFloat('time',time);
    if(scene.activeCamera) material.setVector3('eye',scene.activeCamera.position);
  } };
}
