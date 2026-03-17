import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

type MockupType = 'flat-lay' | 'product-shot' | 'lifestyle' | 'detail'
type InteractionsImageMime =
  | 'image/png'
  | 'image/jpeg'
  | 'image/webp'
  | 'image/heic'
  | 'image/heif'

type VariationLevel = 0 | 1 | 2 | 3

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

function mulberry32(seed: number) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let x = Math.imul(t ^ (t >>> 15), 1 | t)
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

function pickOne<T>(rand: () => number, items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)]!
}

function buildVariationDirective(type: MockupType, variationSeed: number, level: VariationLevel) {
  if (level === 0) return ''

  const rand = mulberry32(variationSeed)

  const cameraAngles = [
    'front-facing',
    'three-quarter angle',
    'slight top-down angle',
    'low angle looking slightly up',
    'side angle with gentle perspective',
  ] as const
  const lenses = ['35mm', '50mm', '85mm'] as const
  const depthOfField = [
    'deep depth of field (most of the product sharp)',
    'moderate depth of field (product sharp, background softly blurred)',
    'shallow depth of field (hero area sharp, background bokeh)',
  ] as const
  const lighting = [
    'soft window light from camera-left',
    'soft window light from camera-right',
    'overhead diffused softbox lighting',
    'dramatic side light with controlled shadow',
    'bright high-key studio light with gentle shadow',
  ] as const
  const backgrounds = {
    'flat-lay': [
      'warm neutral paper backdrop',
      'cool light-gray studio surface',
      'subtle concrete texture surface',
      'linen fabric backdrop with very subtle texture',
      'matte white tabletop with gentle falloff',
    ],
    'product-shot': [
      'seamless light-gray background',
      'seamless off-white background',
      'gradient studio backdrop (subtle, not colorful)',
      'premium dark charcoal studio background',
    ],
    detail: [
      'clean neutral background (out of focus)',
      'soft gradient background (very subtle)',
      'dark neutral background (out of focus)',
    ],
    lifestyle: [
      'modern indoor apartment setting',
      'urban street setting',
      'minimal café setting',
      'studio corner with natural light',
    ],
  } as const

  const stylingPropsByLevel =
    level >= 3
      ? ([
          'add one subtle, realistic accessory nearby (e.g., sunglasses, watch, simple tote), but keep focus on the product',
          'include a light shadow pattern (e.g., window blinds) on the scene, not on the design itself',
          'use a slightly more editorial composition (asymmetric framing) while staying photorealistic',
        ] as const)
      : level >= 2
        ? ([
            'vary composition (centered vs rule-of-thirds) and crop (full vs slightly tighter)',
            'vary the direction of light and shadow softness',
            'vary background material while keeping it neutral and premium',
          ] as const)
        : ([
            'vary composition slightly (do not repeat the same framing)',
            'vary lighting direction subtly',
          ] as const)

  const common = [
    'Variation directive (important): create a clearly distinct photo from other outputs.',
    `Camera angle: ${pickOne(rand, cameraAngles)}.`,
    `Lens: ${pickOne(rand, lenses)}.`,
    `Depth of field: ${pickOne(rand, depthOfField)}.`,
    `Lighting: ${pickOne(rand, lighting)}.`,
    `Background/setting: ${pickOne(rand, backgrounds[type])}.`,
    `Styling/composition: ${pickOne(rand, stylingPropsByLevel)}.`,
    'Do NOT alter the product design, graphics, colors, or fit; only vary the photography choices above.',
  ]

  if (type === 'lifestyle') {
    common.push(
      'For lifestyle: vary the pose (standing/walking/sitting) and framing (waist-up/full-body) while keeping the garment design identical.'
    )
  }

  if (type === 'detail') {
    common.push(
      'For detail: choose a different focal area (stitching, fabric texture, print edge, collar/hem) than a typical macro.'
    )
  }

  return common.join(' ')
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

    "Improve image quality compared to the input photo: correct white balance, increase clarity, improve sharpness, reduce noise, and enhance contrast and color vibrance while keeping the product's true colors accurate.",
    'Avoid washed-out colors or muddy tones; produce a crisp, well-lit, high-end ecommerce photo look.',
  
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

  const variationLevel = clampInt((body as { variationLevel?: unknown }).variationLevel, 0, 3, 1) as VariationLevel
  const variationSeed = clampInt((body as { variationSeed?: unknown }).variationSeed, 1, 2_147_483_647, Date.now())

  const ai = new GoogleGenAI({ apiKey })

  try {
    const maxAttempts = clampInt((body as { attempts?: unknown }).attempts, 1, 3, 2)
    const { baseRules, shotPrompt } = promptFor(type)
    const variationDirective = buildVariationDirective(type, variationSeed, variationLevel)

    let lastErrorMessage = ''
    console.log(
      `[mockups:${requestId}] start type=${type} attempts=${maxAttempts} inputMime=${inputMime} variationLevel=${variationLevel}`
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
                ...(variationDirective ? [{ type: 'text' as const, text: variationDirective }] : []),
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

