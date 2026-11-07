import { useState } from 'react'
import Swal from 'sweetalert2'
import { FiRepeat, FiCopy, FiTrash2 } from 'react-icons/fi'

const DIRS = {
  'th-zh': {
    from: 'ภาษาไทย',
    to: 'ภาษาจีน',
    sub: 'พิมพ์ข้อความภาษาไทย แล้วกดแปลเป็นภาษาจีน',
    placeholder: 'เช่น สวัสดี ขอบคุณมาก',
    examples: ['สวัสดี', 'ขอบคุณ', 'ราคาเท่าไหร่'],
    fromLang: 'th',
    toLang: 'zh',
  },
  'zh-th': {
    from: 'ภาษาจีน',
    to: 'ภาษาไทย',
    sub: 'พิมพ์ข้อความภาษาจีน แล้วกดแปลเป็นภาษาไทย',
    placeholder: '例如：你好，谢谢',
    examples: ['你好', '谢谢', '多少钱'],
    fromLang: 'zh',
    toLang: 'th',
  },
}

const MAX = 1000

export default function App() {
  const [dir, setDir] = useState('th-zh')
  const [text, setText] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [isMock, setIsMock] = useState(false)

  const d = DIRS[dir]

  async function translate(input = text) {
    const t = input.trim()
    if (!t) {
      Swal.fire({ icon: 'warning', title: 'กรุณาพิมพ์ข้อความก่อน', confirmButtonText: 'ตกลง' })
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: t, dir }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'เกิดข้อผิดพลาด')
      setResult(data.translation)
      setIsMock(Boolean(data.mock))
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'แปลไม่สำเร็จ', text: e.message, confirmButtonText: 'ตกลง' })
    } finally {
      setLoading(false)
    }
  }

  function swap() {
    // เอาผลลัพธ์เดิมมาเป็นข้อความต้นฉบับของทิศทางใหม่ (ใช้ตรวจแปลย้อนกลับ)
    const carry = result && !result.startsWith('(โหมดจำลอง)') ? result : ''
    setDir(dir === 'th-zh' ? 'zh-th' : 'th-zh')
    setText(carry)
    setResult('')
  }

  async function copy() {
    if (!result) {
      Swal.fire({ icon: 'info', title: 'ยังไม่มีผลลัพธ์ให้คัดลอก', confirmButtonText: 'ตกลง' })
      return
    }
    try {
      await navigator.clipboard.writeText(result)
      Swal.fire({ icon: 'success', title: 'คัดลอกแล้ว', timer: 1000, showConfirmButton: false })
    } catch {
      Swal.fire({ icon: 'error', title: 'คัดลอกไม่สำเร็จ' })
    }
  }

  function clear() {
    setText('')
    setResult('')
  }

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 dark:bg-stone-900 dark:text-stone-100 font-sans">
      <main className="mx-auto max-w-4xl px-5 py-10">
        <h1 className="text-3xl font-semibold">
          แปลภาษา ไทย ⇄ <span className="font-zh font-bold text-emerald-700 dark:text-emerald-400">中文</span>
        </h1>
        <p className="mt-1 mb-7 text-stone-500 dark:text-stone-400">{d.sub}</p>

        <div className="grid gap-4 md:grid-cols-2">
          <section className="flex flex-col rounded-xl border border-stone-300 bg-white p-4 dark:border-stone-700 dark:bg-stone-800">
            <label htmlFor="src" className="mb-1 text-sm text-stone-500 dark:text-stone-400">
              {d.from}
            </label>
            <textarea
              id="src"
              lang={d.fromLang}
              value={text}
              maxLength={MAX}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') translate()
              }}
              placeholder={d.placeholder}
              className="min-h-52 w-full flex-1 resize-y bg-transparent text-lg outline-none"
            />
          </section>

          <section className="flex flex-col rounded-xl border border-stone-300 bg-emerald-50 p-4 dark:border-stone-700 dark:bg-emerald-950">
            <div className="mb-1 text-sm text-stone-500 dark:text-stone-400">{d.to}</div>
            <div
              lang={d.toLang}
              aria-live="polite"
              className="min-h-52 flex-1 whitespace-pre-wrap font-zh text-xl"
            >
              {result}
            </div>
          </section>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => translate()}
            disabled={loading}
            className="rounded-lg bg-emerald-700 px-5 py-2.5 font-semibold text-white hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
          >
            {loading ? 'กำลังแปล...' : 'แปล'}
          </button>
          <button onClick={swap} className="flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2.5 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:hover:bg-stone-700">
            <FiRepeat aria-hidden /> สลับภาษา
          </button>
          <button onClick={copy} className="flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2.5 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:hover:bg-stone-700">
            <FiCopy aria-hidden /> คัดลอก
          </button>
          <button onClick={clear} className="flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2.5 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:hover:bg-stone-700">
            <FiTrash2 aria-hidden /> ล้าง
          </button>
          <span className="ml-auto text-sm text-stone-500 dark:text-stone-400">
            {text.length} / {MAX}
          </span>
        </div>

        {isMock && (
          <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">
            ตอนนี้เป็นโหมดจำลอง ยังไม่ได้เชื่อมต่อ API จริง (ตั้งค่า API Key ในไฟล์ .env)
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
          ลองใช้ตัวอย่าง:
          {d.examples.map((ex) => (
            <button
              key={ex}
              onClick={() => {
                setText(ex)
                translate(ex)
              }}
              className="rounded-lg border border-stone-300 bg-white px-3 py-1 text-stone-800 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700"
            >
              {ex}
            </button>
          ))}
        </div>
      </main>
    </div>
  )
}