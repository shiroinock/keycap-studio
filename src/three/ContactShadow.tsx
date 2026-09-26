/** A restrained analytic contact shadow under the fixed case supplements the light's filtered shadow.
 * It is a real-time approximation, not screen-space AO or a ray-traced bounce. */
import { useMemo } from "react";
import { Vector2 } from "three";
export default function ContactShadow({
  width = 294,
  depth = 104,
}: {
  width?: number;
  depth?: number;
}) {
  const uniforms = useMemo(
    () => ({
      size: { value: new Vector2(width + 56, depth + 56) },
      halfSize: { value: new Vector2(width / 2 - 3, depth / 2 - 3) },
    }),
    [width, depth],
  );
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -8.82, 0]}
      renderOrder={1}
    >
      <planeGeometry args={[width + 56, depth + 56]} />
      <shaderMaterial
        uniforms={uniforms}
        transparent
        depthWrite={false}
        vertexShader={`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`}
        fragmentShader={`uniform vec2 size;uniform vec2 halfSize;varying vec2 vUv;void main(){vec2 p=(vUv-.5)*size;vec2 q=abs(p)-halfSize;float d=length(max(q,0.))+min(max(q.x,q.y),0.)-3.;float opacity=.25*exp(-max(d,0.)*.23);gl_FragColor=vec4(.12,.11,.10,opacity);}`}
      />
    </mesh>
  );
}
