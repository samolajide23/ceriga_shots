function parseDataUrl(dataUrl: string): { mime: string; base64: string } | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl)
  if (!match) return null
  return { mime: match[1]!, base64: match[2]! }
}

function extFromMime(mime: string): string {
  switch (mime) {
    case 'image/png':
      return 'png'
    case 'image/jpeg':
      return 'jpg'
    case 'image/webp':
      return 'webp'
    case 'image/heic':
      return 'heic'
    case 'image/heif':
      return 'heif'
    default:
      return 'bin'
  }
}

export function bufferFromDataUrl(dataUrl: string): { buffer: Buffer; ext: string; mime: string } | null {
  const parsed = parseDataUrl(dataUrl)
  if (!parsed) return null
  return { buffer: Buffer.from(parsed.base64, 'base64'), ext: extFromMime(parsed.mime), mime: parsed.mime }
}

export function safeFilename(name: string): string {
  const trimmed = name.trim() || 'file'
  return trimmed
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
    .replace(/\s+/g, ' ')
    .slice(0, 120)
}

