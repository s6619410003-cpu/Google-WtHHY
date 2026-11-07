// Vercel Serverless Function — ทำงานแทนปลั๊กอินใน vite.config.js เมื่อ deploy ขึ้น Vercel
// ตั้งค่า AIFORTHAI_KEY และ AIFORTHAI_URL ใน Vercel > Project > Settings > Environment Variables

const LANG = { 'th-zh': { src: 'th', trg: 'zh' }, 'zh-th': { src: 'zh', trg: 'th' } }

const mock = {
  'th-zh': { สวัสดี: '你好', ขอบคุณ: '谢谢', ขอโทษ: '对不起', ราคาเท่าไหร่: '多少钱' },
  'zh-th': { 你好: 'สวัสดี', 谢谢: 'ขอบคุณ', 对不起: 'ขอโทษ', 多少钱: 'ราคาเท่าไหร่' },
}

// ต้องตรงกับ parseResponse ใน vite.config.js
function parseResponse(d) {
  const hit = d.translated ?? d.translation ?? d.output ?? d.result ?? d.text ?? d.target
  if (typeof hit === 'string') return hit
  if (hit && typeof hit === 'object') return hit.text ?? JSON.stringify(hit)
  return JSON.stringify(d)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'ใช้ได้เฉพาะ POST' })

  const KEY = process.env.AIFORTHAI_KEY
  const URL_API = process.env.AIFORTHAI_URL || 'https://api.aiforthai.in.th/xiaofan-zh-th'

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const { text, dir } = body
    if (!LANG[dir]) throw new Error('ทิศทางการแปลไม่ถูกต้อง')
    if (!text || !text.trim()) throw new Error('กรุณาใส่ข้อความ')
    if (text.length > 1000) throw new Error('ข้อความยาวเกิน 1,000 ตัวอักษร')

    if (!KEY) {
      const t = mock[dir][text.trim()] || '(โหมดจำลอง) ยังไม่ได้ตั้งค่า API Key'
      return res.status(200).json({ translation: t, mock: true })
    }

    const r = await fetch(URL_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: KEY },
      body: JSON.stringify({ input: text, src: LANG[dir].src, trg: LANG[dir].trg }),
    })
    if (!r.ok) throw new Error(`API ตอบกลับ ${r.status}: ${(await r.text()).slice(0, 200)}`)
    return res.status(200).json({ translation: parseResponse(await r.json()), mock: false })
  } catch (e) {
    return res.status(400).json({ error: e.message })
  }
}