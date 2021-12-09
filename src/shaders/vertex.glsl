uniform float uTime;
varying vec2 vUv;
varying vec3 vPosition;

float PI = 3.141592653589793238;


void main(){

    vUv = uv;
    vPosition = position;

    vec4 modelPosition = modelMatrix * vec4(position, 1.0);

    gl_Position = projectionMatrix * viewMatrix * modelPosition ;

}