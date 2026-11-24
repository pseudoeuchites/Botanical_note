import { useState } from 'react'

export default function App() {
  const [plantName, setPlantName] = useState('')
  const [note, setNote] = useState('')
  const [records, setRecords] = useState([])

  const handleAddRecord = (e) => {
    e.preventDefault()
    if (!plantName.trim()) return

    const newRecord = {
      id: Date.now(),
      name: plantName.trim(),
      note: note.trim(),
      date: new Date().toLocaleDateString('ko-KR'),
    }

    setRecords([newRecord, ...records])
    setPlantName('')
    setNote('')
  }

  return (
    <div style={{ maxWidth: '520px', margin: '40px auto', padding: '0 16px', fontFamily: 'sans-serif' }}>
      <h1>🌿 Botanical Note</h1>
      <p style={{ color: '#555' }}>내 식물을 기록하고 관찰하는 작은 일기장</p>

      <form onSubmit={handleAddRecord} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
        <input
          type="text"
          placeholder="식물 이름 (예: 몬스테라)"
          value={plantName}
          onChange={(e) => setPlantName(e.target.value)}
          style={{ padding: '10px', fontSize: '16px' }}
        />
        <input
          type="text"
          placeholder="메모 (예: 새 잎이 펴졌고 흙이 말라서 물 줌)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          style={{ padding: '10px', fontSize: '16px' }}
        />
        <button type="submit" style={{ padding: '10px 16px', fontSize: '16px', cursor: 'pointer' }}>
          기록 남기기
        </button>
      </form>

      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {records.map((item) => (
          <li key={item.id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '12px' }}>
            <strong>{item.name}</strong> <span style={{ color: '#888', fontSize: '14px' }}>· {item.date}</span>
            {item.note && <p style={{ margin: '6px 0 0' }}>{item.note}</p>}
          </li>
        ))}
      </ul>
    </div>
  )
}
