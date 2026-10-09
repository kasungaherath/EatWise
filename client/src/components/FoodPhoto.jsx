import { useId } from 'react'
import foodAtlas from '../assets/food-photography-atlas.webp'

export default function FoodPhoto({ photo, className = '' }) {
  const cropId = useId()
  const [x, y, width, height] = photo.viewBox.split(' ').map(Number)
  return (
    <span className={'food-photo ' + className} aria-hidden="true">
      <svg viewBox={photo.viewBox} preserveAspectRatio="xMidYMid meet" focusable="false">
        <defs>
          <clipPath id={cropId}><rect x={x} y={y} width={width} height={height} /></clipPath>
        </defs>
        <image href={foodAtlas} width="1536" height="1024" clipPath={'url(#' + cropId + ')'} />
      </svg>
    </span>
  )
}
