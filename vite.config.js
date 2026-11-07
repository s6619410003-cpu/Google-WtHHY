import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// ปลั๊กอินตัวกลาง: รับคำขอที่ /api/translate แล้วเรียก AI for Thai แทนหน้าเว็บ
// เพื่อให้ API Key อยู่ฝั่งเซิร์ฟเวอร์เท่านั้น (ไม่หลุดไปในโค้ดหน้าเว็บ)
function translateProxy(env = {}) {
  const KEY = env.AIFORTHAI_KEY
  // ตามเอกสาร: ใช้ URL เดียวกันทั้งสองทิศทาง แล้วระบุทิศทางด้วย src / trg ในข้อมูลที่ส่ง
  const URL_API = env.AIFORTHAI_URL || 'https://api.aiforthai.in.th/xiaofan-zh-th'

  const LANG = { 'th-zh': { src: 'th', trg: 'zh' }, 'zh-th': { src: 'zh', trg: 'th' } }

  // รูปแบบคำขอตามตัวอย่างในเอกสาร
  const buildRequest = (text, dir) => ({
    headers: { 'Content-Type': 'application/json', apikey: KEY },
    body: JSON.stringify({ input: text, src: LANG[dir].src, trg: LANG[dir].trg }),
  })

  // ดึงคำแปลจากผลลัพธ์ (ยังไม่เห็นตัวอย่าง response จริง จึงลองชื่อฟิลด์ที่เป็นไปได้)
  // ถ้าไม่เจอ จะแสดง JSON ทั้งก้อนในช่องผลลัพธ์ ให้ดูแล้วแก้ตรงนี้
  const parseResponse = (d) => {
    const hit = d.translated ?? d.translation ?? d.output ?? d.result ?? d.text ?? d.target
    if (typeof hit === 'string') return hit
    if (hit && typeof hit === 'object') return hit.text ?? JSON.stringify(hit)
    return JSON.stringify(d)
  }

  const MOCK = !KEY // ไม่มี Key = โหมดจำลอง
  const mock = {
    'th-zh': { สวัสดี: '你好', ขอบคุณ: '谢谢', ขอโทษ: '对不起', ราคาเท่าไหร่: '多少钱' },
    'zh-th': { 你好: 'สวัสดี', 谢谢: 'ขอบคุณ', 对不起: 'ขอโทษ', 多少钱: 'ราคาเท่าไหร่' },
  }

  async function translate(text, dir) {
    if (MOCK) return mock[dir][text.trim()] || '(โหมดจำลอง) ยังไม่ได้ตั้งค่า API Key'
    const { headers, body } = buildRequest(text, dir)
    const r = await fetch(URL_API, { method: 'POST', headers, body })
    if (!r.ok) throw new Error(`API ตอบกลับ ${r.status}: ${(await r.text()).slice(0, 200)}`)
    return parseResponse(await r.json())
  }

  const handler = async (req, res, next) => {
    if (req.method !== 'POST') return next()
    let raw = ''
    for await (const chunk of req) raw += chunk
    const send = (code, obj) => {
      res.statusCode = code
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(obj))
    }
    try {
      const { text, dir } = JSON.parse(raw)
      if (!LANG[dir]) throw new Error('ทิศทางการแปลไม่ถูกต้อง')
      if (!text || !text.trim()) throw new Error('กรุณาใส่ข้อความ')
      if (text.length > 1000) throw new Error('ข้อความยาวเกิน 1,000 ตัวอักษร')
      send(200, { translation: await translate(text, dir), mock: MOCK })
    } catch (e) {
      send(400, { error: e.message })
    }
  }

  return {
    name: 'translate-proxy',
    // ห้ามใช้ arrow แบบ return ค่า เพราะ Vite จะเอาค่าที่คืนมาไปเรียกเป็นฟังก์ชัน
    configureServer(server) {
      server.middlewares.use('/api/translate', handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/translate', handler)
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '') // อ่านไฟล์ .env (ทุกตัวแปร)
  return {
    plugins: [react(), tailwindcss(), translateProxy(env)],
  }
})