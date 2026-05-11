import { useState, useEffect } from 'react'

export function useImage(url: string | null): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    if (!url) return

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      setImage(img)
    }
    img.src = url
  }, [url])

  return image
}
