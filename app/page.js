'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

/* ─── Itens do cardápio ─────────────────────────────────────── */
const MENU_ITEMS = [
  { id: 'cachorro_quente',  name: 'Cachorro Quente',                max: 4, emoji: '🌭' },
  { id: 'milho_cozido',     name: 'Milho Cozido',                   max: 2, emoji: '🌽' },
  { id: 'caldo_verde',      name: 'Caldo Verde',                    max: 1, emoji: '🥣' },
  { id: 'pacoca',           name: 'Paçoca',                         max: 2, emoji: '🍫' },
  { id: 'bolo_milho',       name: 'Bolo de Milho',                  max: 1, emoji: '🎂' },
  { id: 'bolo_aipim',       name: 'Bolo de Aipim',                  max: 1, emoji: '🍰' },
  { id: 'pastelzinho',      name: 'Mini Pastelzinho / Salgadinhos', max: 4, emoji: '🥟' },
  { id: 'pipoca',           name: 'Pipoca',                         max: 2, emoji: '🍿' },
  { id: 'quentao',          name: 'Quentão',                        max: 2, emoji: '🍵' },
  { id: 'pao_queijo',       name: 'Pão de Queijo',                  max: 4, emoji: '🧀' },
  { id: 'descartaveis',     name: 'Descartáveis',                   max: 2, emoji: '🥤', note: 'copos, pratos e guardanapos' },
]

/* ─── Paleta ────────────────────────────────────────────────── */
const C = {
  verde:       '#009c3b',
  verdeEsc:    '#007a2e',
  verdeClaro:  '#e8f7ef',
  azul:        '#002776',
  azulMed:     '#003d9e',
  azulClaro:   '#eaeff9',
  amarelo:     '#FFDF00',
  amareloSoft: '#fffbe6',
  branco:      '#ffffff',
  cinza:       '#f0f2f5',
  cinzaCard:   '#f8f9fb',
  cinzaMed:    '#9aa3b0',
  texto:       '#1a1f2e',
  textoSec:    '#5a6478',
}

/* ─── Componente de instruções ──────────────────────────────── */
function InstructionsCard() {
  const [open, setOpen] = useState(true)
  return (
    <div style={{
      background: C.azulClaro, border: '1.5px solid #c0d0ef',
      borderRadius: 14, marginBottom: 18, overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '13px 16px', color: C.azul, fontWeight: 700, fontSize: 14,
        }}
      >
        <span>📖 Como funciona</span>
        <span style={{ fontSize: 12, color: C.azulMed, fontWeight: 400 }}>
          {open ? 'fechar ▲' : 'ver ▼'}
        </span>
      </button>
      {open && (
        <div style={{ padding: '0 16px 16px', fontSize: 13.5, color: C.textoSec, lineHeight: 1.65 }}>
          <p style={{ margin: '0 0 8px' }}>
            Só colocar o nome e selecionar o que você vai levar :)
          </p>
          <p style={{ margin: '0 0 8px' }}>
            Casal tem que selecionar separado, mas pode colocar na mesma coisa.
          </p>
          <p style={{ margin: 0, fontSize: 12.5, color: C.cinzaMed }}>
            Qualquer coisa só chamar! Fizemos assim para ficar mais fácil para todo mundo.

              
          </p>
        </div>
      )}
    </div>
  )
}

/* ─── App principal ─────────────────────────────────────────── */
export default function Home() {
  const [selections, setSelections] = useState([])   // array de linhas do Supabase
  const [name, setName] = useState('')
  const [enteredName, setEnteredName] = useState('')
  const [selectedItem, setSelectedItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [showReset, setShowReset] = useState(false)
  const [resetConfirm, setResetConfirm] = useState(false)
  const channelRef = useRef(null)

  /* ── Buscar dados ── */
  const fetchSelections = useCallback(async () => {
    const { data, error } = await supabase
      .from('selections')
      .select('*')
    if (!error && data) {
      setSelections(data)
      setLastUpdated(new Date())
    }
    setLoading(false)
  }, [])

  /* ── Realtime subscription ── */
  useEffect(() => {
    fetchSelections()

    const channel = supabase
      .channel('selections-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'selections' }, () => {
        fetchSelections()
      })
      .subscribe()

    channelRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [fetchSelections])

  /* ── Helpers ── */
  function getItemSelections(itemId) {
    return selections.filter(s => s.item_id === itemId)
  }

  const myRow = selections.find(s => s.name === enteredName)
  const myItemId = myRow?.item_id ?? null
  const myItemName = myItemId ? MENU_ITEMS.find(i => i.id === myItemId)?.name : null
  const isConfirmed = myItemId === selectedItem && selectedItem !== null

  /* ── Confirmar escolha ── */
  async function handleConfirm() {
    if (!enteredName || !selectedItem) return
    setSaving(true)

    if (myRow) {
      // Atualizar linha existente
      await supabase
        .from('selections')
        .update({ item_id: selectedItem, updated_at: new Date().toISOString() })
        .eq('id', myRow.id)
    } else {
      // Inserir nova linha
      await supabase
        .from('selections')
        .insert({ name: enteredName, item_id: selectedItem })
    }

    await fetchSelections()
    setSaving(false)
  }

  /* ── Cancelar escolha ── */
  async function handleRemove() {
    if (!myRow) return
    setSaving(true)
    await supabase.from('selections').delete().eq('id', myRow.id)
    await fetchSelections()
    setSelectedItem(null)
    setSaving(false)
  }

  /* ── Reset geral ── */
  async function handleReset() {
    setSaving(true)
    await supabase.from('selections').delete().neq('id', 0)
    await fetchSelections()
    setSelectedItem(null)
    setResetConfirm(false)
    setShowReset(false)
    setSaving(false)
  }

  function handleEnter() {
    if (name.trim().length < 2) return
    const trimmed = name.trim()
    setEnteredName(trimmed)
    const existing = selections.find(s => s.name === trimmed)
    if (existing) setSelectedItem(existing.item_id)
  }

  const totalEscolhidos = selections.length

  /* ── Loading ── */
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: C.branco }}>
        <div style={{ width: 40, height: 40, border: `4px solid ${C.cinza}`, borderTop: `4px solid ${C.verde}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: C.verde, marginTop: 14, fontWeight: 600 }}>Carregando cardápio…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  /* ── Render ── */
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: C.cinza, minHeight: '100vh' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        input:focus { outline: 2px solid ${C.verde} !important; border-color: ${C.verde} !important; }
        .card-item { transition: transform 0.15s, box-shadow 0.15s; }
        .card-item:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,39,118,0.14) !important; }
        .btn-confirm { transition: opacity 0.15s, transform 0.1s; }
        .btn-confirm:active { transform: scale(0.97); }
        @media (max-width: 480px) {
          .grid-cardapio { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      {/* ═══ HEADER ═══ */}
      <div style={{
        background: `linear-gradient(145deg, ${C.azul} 0%, ${C.azulMed} 55%, #005f20 100%)`,
        padding: '30px 20px 36px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: `linear-gradient(90deg, ${C.amarelo}, #ffe040, ${C.amarelo})` }} />
        <div style={{ position: 'absolute', right: -60, top: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'absolute', left: -40, bottom: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,223,0,0.06)' }} />

        <div style={{ fontSize: 44, marginBottom: 10, position: 'relative' }}>🇧🇷⚽</div>
        <h1 style={{ margin: '0 0 10px', fontSize: 24, fontWeight: 800, color: C.branco, letterSpacing: 0.5, position: 'relative' }}>
          Cardápio
        </h1>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: C.amarelo, color: C.azul, fontWeight: 800, fontSize: 14,
          padding: '6px 20px', borderRadius: 24, marginBottom: 10,
          position: 'relative', boxShadow: '0 3px 12px rgba(0,0,0,0.2)',
        }}>
          Bra × Haiti · 21h30 · Grajaú
        </div>
        <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.7)', fontSize: 12.5, letterSpacing: 0.5 }}>
        </p>
        {totalEscolhidos > 0 && (
          <div style={{
            marginTop: 14, display: 'inline-block',
            background: 'rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.9)',
            fontSize: 12, fontWeight: 600,
            padding: '4px 14px', borderRadius: 20,
          }}>
            {totalEscolhidos} {totalEscolhidos === 1 ? 'item confirmado' : 'itens confirmados'} até agora
          </div>
        )}
      </div>

      {/* ═══ CONTEÚDO ═══ */}
      <div style={{ maxWidth: 740, margin: '0 auto', padding: '20px 14px 80px' }}>

        <InstructionsCard />

        {/* Identificação */}
        {!enteredName ? (
          <div style={{
            background: C.branco, borderRadius: 14, padding: 20, marginBottom: 18,
            boxShadow: '0 2px 14px rgba(0,39,118,0.08)',
            borderLeft: `4px solid ${C.verde}`,
          }}>
            <p style={{ fontWeight: 700, marginBottom: 12, color: C.azul, fontSize: 15, margin: '0 0 12px' }}>
              Qual é o seu nome?
            </p>
            <input
              style={{
                width: '100%', padding: '11px 14px', borderRadius: 9,
                border: '1.5px solid #dde', fontSize: 15, marginBottom: 12,
                background: C.cinzaCard, color: C.texto,
              }}
              placeholder="Seu nome ou apelido"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleEnter()}
              maxLength={40}
              autoFocus
            />
            <button
              style={{
                background: name.trim().length >= 2
                  ? `linear-gradient(135deg, ${C.verde}, ${C.verdeEsc})`
                  : '#ccc',
                color: C.branco, border: 'none', borderRadius: 9,
                padding: '11px 28px', fontSize: 15,
                cursor: name.trim().length >= 2 ? 'pointer' : 'default',
                fontWeight: 700,
                boxShadow: name.trim().length >= 2 ? '0 4px 12px rgba(0,156,59,0.3)' : 'none',
              }}
              onClick={handleEnter}
              disabled={name.trim().length < 2}
            >
              Entrar →
            </button>
          </div>
        ) : (
          <div style={{
            background: C.verdeClaro, borderRadius: 12, padding: '12px 16px', marginBottom: 18,
            display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8,
            border: `1.5px solid ${C.verde}`,
          }}>
            <span style={{ fontWeight: 700, color: C.verdeEsc, fontSize: 14 }}>✅ {enteredName}</span>
            {myItemName && (
              <span style={{ color: C.verdeEsc, fontSize: 13 }}>
                · vai trazer <strong>{myItemName}</strong>
              </span>
            )}
            <button
              style={{
                background: 'white', border: `1px solid ${C.verde}`, borderRadius: 7,
                padding: '3px 11px', fontSize: 12, cursor: 'pointer', color: C.verde, marginLeft: 'auto',
              }}
              onClick={() => { setEnteredName(''); setName(''); setSelectedItem(null) }}
            >
              Trocar nome
            </button>
          </div>
        )}

        {/* Grid cardápio */}
        <div
          className="grid-cardapio"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
            gap: 12, marginBottom: 20,
          }}
        >
          {MENU_ITEMS.map(item => {
            const taken = getItemSelections(item.id)
            const isFull = taken.length >= item.max
            const isMine = myItemId === item.id
            const isSelected = selectedItem === item.id
            const isPending = isSelected && !isMine

            let border = '2px solid transparent'
            let bg = C.branco
            if (isMine)       { border = `2px solid ${C.verde}`;    bg = C.verdeClaro }
            else if (isPending) { border = `2px solid ${C.amarelo}`; bg = C.amareloSoft }
            else if (isFull)    { bg = C.cinzaCard }

            return (
              <div
                key={item.id}
                className="card-item"
                style={{
                  background: bg, borderRadius: 13, padding: '14px 13px',
                  border, boxShadow: '0 2px 10px rgba(0,39,118,0.07)',
                  cursor: !enteredName ? 'default' : (isFull && !isMine) ? 'not-allowed' : 'pointer',
                  opacity: isFull && !isMine ? 0.55 : 1,
                  position: 'relative',
                }}
                onClick={() => {
                  if (!enteredName || (isFull && !isMine)) return
                  setSelectedItem(isSelected ? null : item.id)
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 6 }}>{item.emoji}</div>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: C.texto, marginBottom: 2, lineHeight: 1.3 }}>
                  {item.name}
                </div>
                {item.note && (
                  <div style={{ fontSize: 11, color: C.cinzaMed, marginBottom: 6 }}>{item.note}</div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '8px 0 6px' }}>
                  <span style={{ fontSize: 11, color: isFull && !isMine ? '#b00020' : C.textoSec }}>
                    {taken.length}/{item.max} {item.max === 1 ? 'vaga' : 'vagas'}
                  </span>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {Array.from({ length: item.max }).map((_, i) => {
                      const t = taken[i]
                      const isMe = t?.name === enteredName
                      return (
                        <div key={i} style={{
                          width: 11, height: 11, borderRadius: '50%',
                          background: t ? (isMe ? C.verde : C.azul) : '#dde',
                          boxShadow: t ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                        }} />
                      )
                    })}
                  </div>
                </div>

                {taken.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                    {taken.map((t, i) => (
                      <span key={i} style={{
                        fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600,
                        background: t.name === enteredName ? C.verde : C.azul,
                        color: C.branco,
                      }}>
                        {t.name === enteredName ? '✅ Você' : t.name}
                      </span>
                    ))}
                  </div>
                )}

                {isFull && !isMine && (
                  <div style={{ position: 'absolute', top: 9, right: 9, background: '#c0392b', color: 'white', fontSize: 9, padding: '2px 7px', borderRadius: 9, fontWeight: 700 }}>
                    Completo
                  </div>
                )}
                {isPending && (
                  <div style={{ position: 'absolute', top: 9, right: 9, background: C.amarelo, color: C.azul, fontSize: 9, padding: '2px 7px', borderRadius: 9, fontWeight: 700 }}>
                    Selecionado
                  </div>
                )}
                {isMine && (
                  <div style={{ position: 'absolute', top: 9, right: 9, background: C.verde, color: 'white', fontSize: 9, padding: '2px 7px', borderRadius: 9, fontWeight: 700 }}>
                    Seu item ✓
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Barra de confirmação */}
        {enteredName && (
          <div style={{
            position: 'sticky', bottom: 0,
            background: C.branco,
            borderTop: `3px solid ${C.verde}`,
            padding: '12px 16px',
            borderRadius: '14px 14px 0 0',
            boxShadow: '0 -4px 24px rgba(0,39,118,0.11)',
            display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
            marginBottom: 20,
          }}>
            {selectedItem && !isConfirmed && (
              <button
                className="btn-confirm"
                style={{
                  background: `linear-gradient(135deg, ${C.verde}, ${C.verdeEsc})`,
                  color: C.branco, border: 'none', borderRadius: 9,
                  padding: '12px 20px', fontSize: 14, cursor: 'pointer',
                  fontWeight: 700, flexShrink: 0,
                  boxShadow: '0 4px 14px rgba(0,156,59,0.35)',
                }}
                onClick={handleConfirm}
                disabled={saving}
              >
                {saving ? 'Salvando…' : `✔ Confirmar: ${MENU_ITEMS.find(i => i.id === selectedItem)?.name}`}
              </button>
            )}
            {isConfirmed && (
              <span style={{ color: C.verde, fontWeight: 700, fontSize: 14 }}>
                ✅ Confirmado! Você vai trazer <strong>{myItemName}</strong>
              </span>
            )}
            {myRow && (
              <button
                style={{
                  background: 'white', color: '#c0392b', border: '1.5px solid #c0392b',
                  borderRadius: 9, padding: '10px 14px', fontSize: 13, cursor: 'pointer',
                }}
                onClick={handleRemove}
                disabled={saving}
              >
                ✕ Cancelar escolha
              </button>
            )}
            {!selectedItem && !myRow && (
              <p style={{ color: C.cinzaMed, fontSize: 13, margin: 0 }}>
                👆 Toque num item para escolher o que vai trazer
              </p>
            )}
          </div>
        )}

        {/* Resumo */}
        <div style={{
          background: C.branco, borderRadius: 14, padding: 20,
          boxShadow: '0 2px 10px rgba(0,39,118,0.06)', marginBottom: 14,
          borderLeft: `4px solid ${C.azul}`,
        }}>
          <h3 style={{ margin: '0 0 14px', color: C.azul, fontSize: 15, fontWeight: 700 }}>
            Resumo do cardápio
          </h3>
          {MENU_ITEMS.map(item => {
            const taken = getItemSelections(item.id)
            const isFull = taken.length >= item.max
            return (
              <div key={item.id} style={{
                display: 'flex', gap: 10, padding: '8px 0',
                borderBottom: '1px solid #f0f2f5', alignItems: 'center', flexWrap: 'wrap',
              }}>
                <span style={{ fontSize: 15 }}>{item.emoji}</span>
                <span style={{ minWidth: 190, fontSize: 13, color: C.texto, fontWeight: 500 }}>{item.name}</span>
                <span style={{ fontSize: 12, fontWeight: 700, minWidth: 46, color: isFull ? C.verde : C.cinzaMed }}>
                  {taken.length}/{item.max}
                </span>
                <span style={{ fontSize: 12, color: C.textoSec }}>
                  {taken.length > 0 ? taken.map(t => t.name).join(', ') : '—'}
                </span>
              </div>
            )
          })}
        </div>

        {/* Admin / reset */}
        <div style={{ textAlign: 'center', marginTop: 10 }}>
          {!showReset ? (
            <button
              style={{ background: 'none', border: 'none', color: C.cinzaMed, fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => setShowReset(true)}
            >
              ⚙ Área admin (limpar dados de teste)
            </button>
          ) : (
            <div style={{ background: '#fff5f5', border: '1.5px solid #ffb3b3', borderRadius: 12, padding: 16, display: 'inline-block', maxWidth: 380 }}>
              <p style={{ margin: '0 0 12px', fontSize: 13, color: '#c0392b', fontWeight: 600 }}>
                ⚠️ Isso vai apagar todas as escolhas de todos os convidados.
              </p>
              {!resetConfirm ? (
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <button style={{ background: '#c0392b', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontWeight: 700 }} onClick={() => setResetConfirm(true)}>
                    Sim, limpar tudo
                  </button>
                  <button style={{ background: 'white', border: '1px solid #ccc', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer' }} onClick={() => setShowReset(false)}>
                    Cancelar
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <button style={{ background: '#8b0000', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontWeight: 700 }} onClick={handleReset} disabled={saving}>
                    {saving ? 'Limpando…' : 'Confirmar reset'}
                  </button>
                  <button style={{ background: 'white', border: '1px solid #ccc', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer' }} onClick={() => { setResetConfirm(false); setShowReset(false) }}>
                    Voltar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: C.cinzaMed, marginTop: 16 }}>
          Atualiza em tempo real via Supabase · {lastUpdated?.toLocaleTimeString('pt-BR')} ·{' '}
          <button style={{ background: 'none', border: 'none', color: C.verde, cursor: 'pointer', fontSize: 11, textDecoration: 'underline' }} onClick={fetchSelections}>
            atualizar agora
          </button>
        </p>
      </div>
    </div>
  )
}
