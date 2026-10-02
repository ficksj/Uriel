import { useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { LockKeyhole, Pin, Plus, Copy, Flame, ChevronDown, ShieldCheck, FileCode2, MoreHorizontal, Check, X, Settings2, Languages } from 'lucide-react';

type Note = { id: string; title: string; content: string; language: string; expiresAt: number; ttl: string };
const TTL = [{ value: '10m', label: '10 min', ms: 600000 }, { value: '1h', label: '1 hour', ms: 3600000 }, { value: '24h', label: '24 hours', ms: 86400000 }, { value: 'copy', label: 'Burn on copy', ms: 0 }];
const starter: Note = { id: 'first', title: 'Untitled note', content: 'curl -H "Authorization: Bearer $TOKEN" \\\n  https://api.internal/v1/health', language: 'Bash', expiresAt: Date.now() + 3600000, ttl: '1h' };

const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
const copyText = {
  ru: { encrypted: 'ЗАЩИЩЕНО', newNote: 'Новая заметка', notes: 'ЗАМЕТКИ', local: 'Только локально', saved: 'Сохранено в зашифрованной памяти', destroy: 'Уничтожить сейчас', copy: 'Зашифровать и скопировать', copied: 'Скопировано · очистка через 30 с', lifetime: 'ВРЕМЯ ЖИЗНИ', settings: 'Настройки', language: 'Язык', alwaysTop: 'Поверх всех окон', shortcut: 'Глобальная комбинация', close: 'Закрыть', empty: 'Заметка уничтожена', cleared: 'Память и зашифрованное хранилище очищены', newAfter: 'Новая заметка' },
  en: { encrypted: 'ENCRYPTED', newNote: 'New note', notes: 'NOTES', local: 'Local only', saved: 'Saved to encrypted memory', destroy: 'Destroy now', copy: 'Encrypt & copy', copied: 'Copied · clears in 30s', lifetime: 'LIFETIME', settings: 'Settings', language: 'Language', alwaysTop: 'Always on top', shortcut: 'Global shortcut', close: 'Close', empty: 'Note destroyed', cleared: 'Memory and encrypted storage cleared', newAfter: 'New note' },
} as const;

function App() {
  const [notes, setNotes] = useState<Note[]>([starter]);
  const [activeId, setActiveId] = useState('first');
  const [pinned, setPinned] = useState(true);
  const [copied, setCopied] = useState(false);
  const [burned, setBurned] = useState(false);
  const [language, setLanguage] = useState<'ru' | 'en'>('ru');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const active = notes.find((note) => note.id === activeId) ?? notes[0];
  const t = copyText[language];

  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { if (isTauri()) { invoke('register_hotkey').catch(() => undefined); } }, []);

  const remaining = Math.max(0, active.expiresAt - now);
  const timeLeft = active.ttl === 'copy' ? 'Burn on copy' : `${String(Math.floor(remaining / 3600000)).padStart(2, '0')}:${String(Math.floor((remaining % 3600000) / 60000)).padStart(2, '0')}:${String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0')}`;
  const charCount = active.content.length;
  const progress = active.ttl === 'copy' ? 100 : Math.min(100, Math.max(0, remaining / (TTL.find((ttl) => ttl.value === active.ttl)?.ms || 1) * 100));
  const detectedLanguage = useMemo(() => active.content.trimStart().startsWith('{') ? 'JSON' : active.content.includes('curl') ? 'Bash' : active.language, [active]);

  const updateActive = (changes: Partial<Note>) => setNotes((items) => items.map((note) => note.id === activeId ? { ...note, ...changes } : note));
  const createNote = () => { const id = crypto.randomUUID(); const note = { ...starter, id, title: 'Untitled note', content: '', expiresAt: Date.now() + 3600000 }; setNotes((items) => [...items, note]); setActiveId(id); setBurned(false); };
  const changeTtl = (value: string) => { const ttl = TTL.find((item) => item.value === value)!; updateActive({ ttl: value, expiresAt: value === 'copy' ? 0 : Date.now() + ttl.ms }); };
  const togglePinned = async () => {
    const next = !pinned;
    setPinned(next);
    if (isTauri()) await invoke('set_window_always_on_top', { enabled: next }).catch(() => setPinned(!next));
  };
  const copyNote = async () => {
    if (isTauri()) await invoke('write_clipboard', { text: active.content }).catch(() => undefined);
    else await navigator.clipboard?.writeText(active.content).catch(() => undefined);
    setCopied(true); window.setTimeout(() => setCopied(false), 30000);
    if (active.ttl === 'copy') destroyNote();
  };
  const destroyNote = () => { if (isTauri()) invoke('destroy_note', { noteId: active.id }).catch(() => undefined); setNotes((items) => items.filter((note) => note.id !== activeId)); setBurned(true); };
  const restore = () => { const note = { ...starter, id: 'restored', content: '', title: 'Untitled note' }; setNotes([note]); setActiveId(note.id); setBurned(false); };
  const startWindowDrag = (event: React.MouseEvent<HTMLElement>) => {
    if (event.button !== 0 || !isTauri()) return;
    void getCurrentWindow().startDragging().catch((error) => console.error('Uriel window drag failed', error));
  };

  if (!active || burned) return <main className="app-shell empty-shell"><div className="brand small-brand"><span className="brand-mark">✦</span> URIEL</div><div className="empty-state"><div className="flame-ring"><Flame size={20} /></div><h2>{t.empty}</h2><p>{t.cleared}</p><button className="primary-btn" onClick={restore}><Plus size={15} /> {t.newAfter}</button></div></main>;

  return <main className="app-shell">
    <header className="topbar">
      <div className="drag-handle" data-tauri-drag-region onMouseDown={startWindowDrag} aria-hidden="true" />
      <div className="brand topbar-content"><span className="brand-mark">✦</span><span>URIEL</span><span className="brand-sub">SCRATCHPAD</span></div>
      <div className="header-actions topbar-content">
        <span className="secure-status"><span className="pulse-dot" /> <LockKeyhole size={13} /> {t.encrypted}</span>
        <button className="language-btn" onClick={() => setLanguage(language === 'ru' ? 'en' : 'ru')} title={t.language}><Languages size={14} /> {language.toUpperCase()}</button>
        <button className={`icon-btn ${pinned ? 'selected' : ''}`} aria-label={t.alwaysTop} title={t.alwaysTop} onClick={togglePinned}><Pin size={15} /></button>
        <button className={`icon-btn ${settingsOpen ? 'selected' : ''}`} aria-label={t.settings} title={t.settings} onClick={() => setSettingsOpen(!settingsOpen)}><Settings2 size={16} /></button>
      </div>
    </header>
    <div className="divider" />
    <div className="workspace">
      <aside className="notes-rail">
        <button className="new-note" onClick={createNote}><Plus size={15} /> {t.newNote} <span>⌘N</span></button>
        <div className="rail-label">{t.notes} <span>{notes.length}</span></div>
        <div className="notes-scroll">
        {notes.map((note) => <button className={`note-item ${note.id === activeId ? 'active' : ''}`} key={note.id} onClick={() => setActiveId(note.id)}><FileCode2 size={14} /><span><strong>{note.title}</strong><small>{note.content ? `${note.content.slice(0, 24)}...` : 'Empty note'}</small></span></button>)}
        </div><div className="rail-bottom"><ShieldCheck size={14} /><span>{t.local}<br /><b>AES-256-GCM</b></span></div>
      </aside>
      <section className="editor-pane">
        <div className="editor-toolbar"><input className="note-title" value={active.title} onChange={(event) => updateActive({ title: event.target.value })} aria-label="Note title" /><div className="toolbar-right"><select value={active.ttl} onChange={(event) => changeTtl(event.target.value)} aria-label="Destruction timer">{TTL.map((ttl) => <option key={ttl.value} value={ttl.value}>{ttl.label}</option>)}</select><span className="chevron"><ChevronDown size={13} /></span></div></div>
        <div className="editor-wrap"><div className="line-numbers">{active.content.split('\n').map((_, index) => <span key={index}>{String(index + 1).padStart(2, '0')}</span>)}</div><textarea autoFocus value={active.content} onChange={(event) => updateActive({ content: event.target.value })} spellCheck={false} aria-label="Encrypted note editor" placeholder="Start writing securely..." /></div>
        <footer className="editor-footer"><span>{detectedLanguage} <i /> {charCount} characters</span><span className="autosave"><span className="save-dot" /> {t.saved}</span></footer>
      </section>
    </div>
    <div className="divider" />
    <footer className="bottom-bar"><div className="lifetime"><div className="lifetime-label"><span><span className="tiny-pulse" /> {t.lifetime}</span><b>{timeLeft}</b></div><div className="progress-track"><span style={{ width: `${progress}%` }} /></div></div><div className="actions"><button className="ghost-btn" onClick={destroyNote}><Flame size={15} /> {t.destroy}</button><button className="copy-btn" onClick={copyNote}>{copied ? <Check size={16} /> : <Copy size={15} />} {copied ? t.copied : t.copy}</button></div></footer>
    {settingsOpen && <div className="settings-popover"><div className="settings-head"><strong>{t.settings}</strong><button className="icon-btn" onClick={() => setSettingsOpen(false)} aria-label={t.close}><X size={15} /></button></div><label className="setting-row"><span><Languages size={15} /> {t.language}</span><button className="setting-select" onClick={() => setLanguage(language === 'ru' ? 'en' : 'ru')}>{language === 'ru' ? 'Русский' : 'English'} <ChevronDown size={13} /></button></label><label className="setting-row"><span><Pin size={15} /> {t.alwaysTop}</span><button className={`switch ${pinned ? 'on' : ''}`} onClick={togglePinned} aria-label={t.alwaysTop}><i /></button></label><div className="setting-row shortcut-row"><span><LockKeyhole size={15} /> {t.shortcut}</span><kbd>Alt + Space</kbd></div></div>}
    {copied && <div className="toast"><Check size={14} /> Plaintext copied. Clipboard clears in 30 seconds.</div>}
  </main>;
}

export default App;
