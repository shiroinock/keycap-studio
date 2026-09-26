/** A restrained analytic contact shadow under the fixed case supplements the light's filtered shadow.
 * It is a real-time approximation, not screen-space AO or a ray-traced bounce. */
export default function ContactShadow() {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -8.82, 0]}
      renderOrder={1}
    >
      <planeGeometry args={[350, 160]} />
      <shaderMaterial
        transparent
        depthWrite={false}
        vertexShader={`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`}
        fragmentShader={`varying vec2 vUv;void main(){vec2 p=(vUv-.5)*vec2(350.,160.);vec2 q=abs(p)-vec2(144.,49.);float d=length(max(q,0.))+min(max(q.x,q.y),0.)-3.;float opacity=.25*exp(-max(d,0.)*.23);gl_FragColor=vec4(.12,.11,.10,opacity);}`}
      />
    </mesh>
  );
}
