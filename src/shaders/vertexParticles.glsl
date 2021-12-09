uniform float uTime;
uniform float uFrequency;
uniform float uAmplitude;
varying vec2 vUv;
varying vec3 vPosition;
attribute vec2 reference;
uniform sampler2D positionTexture;


void main(){

    vUv = reference;
    vPosition = position;
    vec3 pos = texture2D(positionTexture,reference).xyz;
    
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

    gl_PointSize = 1.0 * (1.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;



}