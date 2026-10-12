import { useId } from 'react'
import { foodAtlases } from '../foodImageLoader.js'

export default function FoodPhoto({ photo, className = '' }) {
  const cropId = useId()
  const atlas = foodAtlases[photo.atlas ?? 'default']
  const [x, y, width, height] = photo.viewBox.split(' ').map(Number)
  return (
    <span className={'food-photo ' + className} aria-hidden="true">
      <svg viewBox={photo.viewBox} preserveAspectRatio="xMidYMid meet" focusable="false">
        <defs>
          <clipPath id={cropId}><rect x={x} y={y} width={width} height={height} /></clipPath>
        </defs>
        <image href={atlas.source} width={atlas.width} height={atlas.height} clipPath={'url(#' + cropId + ')'} />
      </svg>
    </span>
  )
}
