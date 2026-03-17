import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

type MockupType = 'flat-lay' | 'product-shot' | 'lifestyle' | 'detail'
type InteractionsImageMime =
  | 'image/png'
  | 'image/jpeg'
  | 'image/webp'
  | 'image/heic'
  | 'image/heif'

function getApiKey(): string | undefined {
  return process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY
}

function parseDataUrl(dataUrl: string): { mimeType: string; base64: string } | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl)
  if (!match) return null
  return { mimeType: match[1], base64: match[2] }
}

function normalizeInteractionsImageMime(mimeType: string): InteractionsImageMime {
  switch (mimeType) {
    case 'image/png':
    case 'image/jpeg':
    case 'image/webp':
    case 'image/heic':
    case 'image/heif':
      return mimeType
    default:
      return 'image/png'
  }
}

function clampInt(n: unknown, min: number, max: number, fallback: number) {
  const parsed = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(parsed)))
}

function asErrorMessage(e: unknown) {
  if (e instanceof Error) return e.message
  if (typeof e === 'string') return e
  try {
    return JSON.stringify(e)
  } catch {
    return 'Unknown error'
  }
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

function promptFor(type: MockupType) {
  const baseRules = [
    'Use the provided image as the exact product reference.',
    'This is the SAME product, not a new design.',
    'The generated image must be visually identical in design, as if it is the same physical item photographed in a different scene.',
  
    'Do NOT change the design, graphics, or layout in any way.',
    'Do NOT redesign, reimagine, or reinterpret the clothing.',
    'Preserve exact print placement, scale, and proportions.',
    'Preserve fabric type, garment structure, and fit.',
  
    'Only change camera angle, lighting, environment, and composition.',
    'Do NOT invent new elements or modify the product.',
  
    'The output must look like real product photography, not AI-generated artwork.',
    'Photorealistic, natural lighting, realistic textures.',
  
    'No added logos, no text, no watermarks.',
  ].join(' ')

  switch (type) {
    case 'flat-lay':
      return {
        baseRules,
        shotPrompt: [
          'Create a clean flat lay product shot.',
          'Top-down view of the exact product placed naturally on a neutral studio surface.',
          'Soft diffused lighting, realistic shadows, premium fashion brand aesthetic.',
          'Keep fabric texture and folds natural and realistic.',
        ].join(' '),
      }

    case 'product-shot':
      return {
        baseRules,
        shotPrompt: [
          'Create a premium studio product shot.',
          'Three-quarter angle or front-facing shot of the product.',
          'Placed on a seamless background with high-end lighting.',
          'Shallow depth of field, sharp focus, luxury ecommerce style.',
        ].join(' '),
      }

    case 'detail':
      return {
        baseRules,
        shotPrompt: [
          'Create a macro close-up shot.',
          'Zoom into the actual garment showing fabric texture, stitching, and print details.',
          'Ultra realistic lighting, shallow depth of field.',
          'Focus on material quality and print finish.',
        ].join(' '),
      }

    case 'lifestyle':
      return {
        baseRules,
        shotPrompt: [
          'Create a realistic lifestyle photo.',
          'A person naturally wearing the exact product.',
          'Urban streetwear or modern indoor setting.',
          'Natural lighting, candid composition, fashion editorial look.',
          'Ensure the design remains accurate and unchanged.',
        ].join(' '),
      }
  }
}

function retryNote(lastErrorMessage: string) {
  return [
    'Retry note:',
    `The previous attempt failed with: ${lastErrorMessage}`,
    'Ensure you return a valid image asset in the response.',
  ].join(' ')
}

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const requestId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`
  const startedAt = Date.now()

  const apiKey = getApiKey()
  if (!apiKey) {
    console.error(`[mockups:${requestId}] Missing API key`)
    return NextResponse.json(
      {
        error:
          'Missing API key. Set GOOGLE_API_KEY (preferred) or GEMINI_API_KEY in your environment.',
      },
      { status: 500 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    console.warn(`[mockups:${requestId}] Invalid JSON body`)
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const imageDataUrl = (body as { imageDataUrl?: unknown }).imageDataUrl
  if (typeof imageDataUrl !== 'string' || imageDataUrl.length < 32) {
    console.warn(`[mockups:${requestId}] Missing/invalid imageDataUrl`)
    return NextResponse.json({ error: 'imageDataUrl is required.' }, { status: 400 })
  }

  const parsed = parseDataUrl(imageDataUrl)
  if (!parsed) {
    console.warn(`[mockups:${requestId}] imageDataUrl not a base64 data URL`)
    return NextResponse.json({ error: 'imageDataUrl must be a base64 data URL.' }, { status: 400 })
  }
  const inputMime = normalizeInteractionsImageMime(parsed.mimeType)

  const requestedType = (body as { type?: unknown }).type
  const type: MockupType | undefined =
    requestedType === 'flat-lay' ||
    requestedType === 'product-shot' ||
    requestedType === 'detail' ||
    requestedType === 'lifestyle'
      ? requestedType
      : undefined

  if (!type) {
    console.warn(`[mockups:${requestId}] Missing/invalid type`)
    return NextResponse.json(
      { error: 'type is required and must be one of: flat-lay, product-shot, detail, lifestyle.' },
      { status: 400 }
    )
  }

  const ai = new GoogleGenAI({ apiKey })

  try {
    const maxAttempts = clampInt((body as { attempts?: unknown }).attempts, 1, 3, 2)
    const { baseRules, shotPrompt } = promptFor(type)

    let lastErrorMessage = ''
    console.log(
      `[mockups:${requestId}] start type=${type} attempts=${maxAttempts} inputMime=${inputMime}`
    )
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const attemptStartedAt = Date.now()
        console.log(`[mockups:${requestId}] attempt ${attempt}/${maxAttempts} generating...`)
        const interaction = await ai.interactions.create({
          model: 'gemini-2.5-flash-image',
          input: [
            {
              role: 'user',
              content: [
                // Keep base rules separate so they're always prominent.
                { type: 'text', text: baseRules },
                { type: 'text', text: shotPrompt },
                ...(attempt === 1 || !lastErrorMessage
                  ? []
                  : [{ type: 'text' as const, text: retryNote(lastErrorMessage) }]),
                { type: 'image', data: parsed.base64, mime_type: inputMime },
              ],
            },
          ],
          response_modalities: ['image'],
        })
        console.log(
          `[mockups:${requestId}] attempt ${attempt} response in ${Date.now() - attemptStartedAt}ms`
        )

        const outputImage = interaction.outputs?.find((o) => o.type === 'image')
        const base64 = outputImage?.data
        const mime = outputImage?.mime_type || 'image/png'

        if (base64) {
          console.log(
            `[mockups:${requestId}] success type=${type} mime=${mime} totalMs=${Date.now() - startedAt}`
          )
          return NextResponse.json({
            generatedImage: {
              id:
                typeof crypto !== 'undefined' && 'randomUUID' in crypto
                  ? crypto.randomUUID()
                  : `${Date.now()}`,
              type,
              url: `data:${mime};base64,${base64}`,
              timestamp: Date.now(),
            },
          })
        }

        lastErrorMessage = 'Model returned no image output.'
        console.warn(`[mockups:${requestId}] attempt ${attempt} no image output`)
      } catch (e) {
        lastErrorMessage = asErrorMessage(e)
        console.warn(`[mockups:${requestId}] attempt ${attempt} error: ${lastErrorMessage}`)
      }

      // Small backoff between attempts (helps with transient model issues / 429 rate limits).
      if (attempt < maxAttempts) await sleep(750 * attempt)
    }

    console.error(
      `[mockups:${requestId}] failed after ${maxAttempts} attempt(s) totalMs=${Date.now() - startedAt} lastError=${lastErrorMessage}`
    )
    return NextResponse.json(
      { error: `Image generation failed after ${maxAttempts} attempt(s). Last error: ${lastErrorMessage}` },
      { status: 502 }
    )
  } catch (e) {
    console.error(`[mockups:${requestId}] unexpected error: ${asErrorMessage(e)}`)
    return NextResponse.json({ error: asErrorMessage(e) }, { status: 502 })
  }
}

