import { useState } from 'react'
import type { ImageLayer } from '../shared/presentation'
/** Legacy Visual.tsx fallback and pose transforms, without character/form rules. */
const poses = { stand: 'none', lean: 'rotate(-3deg)', turned: 'scaleX(-1)', near: 'scale(1.1)', close: 'scale(1.2)', back: 'scale(.9)' }
export function Picture({ src, alt, className }: { src?: string; alt: string; className: string }) {
  const [failed, setFailed] = useState(false)
  return src && !failed ? <img className={className} src={src} alt={alt} onError={() => setFailed(true)} /> : <div className={className + ' picture-fallback'} role="img" aria-label={alt}>{alt}</div>
}
export function ImageLayers({ layers }: { layers: ImageLayer[] }) {
  return <div className="presentation-layers">{layers.map(layer => <div key={layer.id} className={'presentation-character ' + (layer.position ?? 'center')} style={{ transform: poses[layer.pose ?? 'stand'] }}>
    <Picture key={layer.src ?? ''} src={layer.src} alt={layer.name} className="presentation-image" />
  </div>)}</div>
}
