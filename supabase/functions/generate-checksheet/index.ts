// supabase/functions/generate-checksheet/index.ts
//
// Turns uploaded training material (a course curriculum + an existing
// checksheet, as plain text extracted client-side) into a structured draft
// checksheet: an ordered list of steps mapped to the LMS's 7 step types. The
// draft is returned to the browser and opened in the Checksheet Builder for the
// admin to review/edit before anything is saved — this function never writes to
// the database, so it needs no tenant stamping (the eventual save happens under
// the user's own RLS session in the app).
//
// Request  (POST):  { curriculum_text?, checksheet_text?, title_hint?, category_hint? }
// Response (200):   { title, description, category, steps:[{step_type,title,instructions}] }
//
// Auth: requires the caller's Supabase session JWT (verified below) so this
// AI endpoint can't be hit anonymously.
//
// Deploy:  supabase functions deploy generate-checksheet
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'content-type': 'application/json' },
  })
}

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'
const MODEL = 'claude-sonnet-4-5'

// Keep request sizes sane — clip very large documents so we stay within token
// limits. ~60k chars ≈ comfortably inside the model's context for this task.
const MAX_CHARS = 60_000
const clip = (s: string) => (s.length > MAX_CHARS ? s.slice(0, MAX_CHARS) + '\n…[truncated]…' : s)

const STEP_TYPES = [
  'read',
  'watch',
  'special_drill',
  'learning_drill',
  'quiz',
  'final_test',
  'action',
] as const

// Tool schema forces Claude to return clean structured JSON instead of prose.
const TOOL = {
  name: 'build_checksheet',
  description: 'Return the structured training checksheet built from the source documents.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Concise course/checksheet title.' },
      description: { type: 'string', description: 'One or two sentences describing what the trainee will learn.' },
      category: { type: 'string', description: 'A short category, e.g. Safety, Installation, Onboarding, Equipment.' },
      steps: {
        type: 'array',
        description: 'Ordered list of training steps the employee completes top to bottom.',
        items: {
          type: 'object',
          properties: {
            step_type: {
              type: 'string',
              enum: STEP_TYPES,
              description:
                "read = study a document/text; watch = view a video; special_drill = free-form hands-on practice with written instructions; learning_drill = repeatable structured drill; quiz = knowledge check; final_test = end-of-course test; action = a real task the trainee performs on the job.",
            },
            title: { type: 'string', description: 'Short imperative step title, e.g. "Read the irrigation safety manual".' },
            instructions: {
              type: 'string',
              description:
                'What the trainee does in this step, and for read/drill/quiz/test steps the key points or topics it should cover. 1–4 sentences.',
            },
          },
          required: ['step_type', 'title', 'instructions'],
        },
      },
    },
    required: ['title', 'description', 'category', 'steps'],
  },
}

const SYSTEM = `You are an instructional designer building a step-by-step training "checksheet" for a field-services / landscaping company's internal training system.

You receive source material (a course curriculum and/or an existing checksheet) as plain text. Convert it into a single, logically ordered checksheet the company can assign to an employee.

Rules:
- Produce a sensible learning order: foundational reading first, then drills/practice, then a knowledge check, ending with a final test and/or a real on-the-job action when appropriate.
- Map each step to the BEST step_type. Use "read" for studying material, "watch" only where the source clearly references a video, "special_drill" for hands-on practice you describe, "learning_drill" for repeatable structured practice, "quiz" for mid-course knowledge checks, "final_test" for an end test, and "action" for performing a real task on the job.
- Write clear, specific titles and concise instructions in the company's voice. Pull concrete topics from the source so each step is actionable.
- Prefer 5–15 steps. Don't pad. Don't invent unrelated content.
- Always call the build_checksheet tool with your result. Do not write any prose outside the tool call.`

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  try {
    const { curriculum_text, checksheet_text, title_hint, category_hint } = await req
      .json()
      .catch(() => ({}))

    const curriculum = String(curriculum_text || '').trim()
    const checksheet = String(checksheet_text || '').trim()
    if (!curriculum && !checksheet)
      return json({ error: 'Please provide text from at least one document.' }, 400)

    // ── Verify the caller is signed in ──────────────────────────────────────
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    const { data: userData } = await admin.auth.getUser(jwt)
    if (!userData?.user) return json({ error: 'Not signed in.' }, 401)

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) return json({ error: 'AI is not configured (ANTHROPIC_API_KEY missing).' }, 500)

    // ── Build the prompt ────────────────────────────────────────────────────
    const parts: string[] = []
    if (title_hint) parts.push(`Desired title (hint): ${title_hint}`)
    if (category_hint) parts.push(`Desired category (hint): ${category_hint}`)
    if (curriculum) parts.push(`=== COURSE CURRICULUM ===\n${clip(curriculum)}`)
    if (checksheet) parts.push(`=== EXISTING CHECKSHEET ===\n${clip(checksheet)}`)
    parts.push('Build the checksheet now by calling the build_checksheet tool.')

    const body = {
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM,
      tools: [TOOL],
      tool_choice: { type: 'tool', name: 'build_checksheet' },
      messages: [{ role: 'user', content: parts.join('\n\n') }],
    }

    // ── Call Claude with light retry on transient errors ────────────────────
    let data: any = null
    let lastErr = ''
    for (let attempt = 0; attempt <= 3; attempt++) {
      const res = await fetch(ANTHROPIC_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        data = await res.json()
        break
      }
      lastErr = `${res.status}: ${(await res.text()).slice(0, 300)}`
      const transient = res.status === 529 || res.status === 429 || res.status >= 500
      if (!transient || attempt === 3) return json({ error: `AI error ${lastErr}` }, 502)
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)))
    }

    // ── Extract the tool_use result ─────────────────────────────────────────
    const toolBlock = (data?.content || []).find(
      (b: any) => b?.type === 'tool_use' && b?.name === 'build_checksheet'
    )
    const out = toolBlock?.input
    if (!out || !Array.isArray(out.steps))
      return json({ error: 'The AI did not return a usable checksheet. Try again.' }, 502)

    // Sanitize: drop bad rows, clamp step types, trim strings.
    const steps = out.steps
      .filter((s: any) => s && s.title)
      .map((s: any) => ({
        step_type: STEP_TYPES.includes(s.step_type) ? s.step_type : 'read',
        title: String(s.title).slice(0, 200),
        instructions: String(s.instructions || '').slice(0, 2000),
      }))

    return json({
      title: String(out.title || title_hint || 'Untitled Checksheet').slice(0, 200),
      description: String(out.description || '').slice(0, 1000),
      category: String(out.category || category_hint || 'General').slice(0, 80),
      steps,
    })
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500)
  }
})
