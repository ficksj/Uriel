import { useEffect, useState } from 'react';

type Language = 'ru' | 'en';

const releaseUrl = 'https://github.com/ficksj/Uriel/releases/download/v0.1.0/Uriel_0.1.0_x64-setup.exe';
const githubUrl = 'https://github.com/ficksj/Uriel';

const copy = {
  en: {
    nav: ['Principles', 'Security', 'Download'],
    eyebrow: 'EPHEMERAL · ENCRYPTED · LOCAL',
    title: 'Private thoughts,\nbriefly held.',
    lead: 'Uriel is a quiet Windows scratchpad for secrets, commands and fragments that were never meant to stay forever.',
    download: 'Download for Windows',
    github: 'View on GitHub',
    intro: 'A sanctuary for the temporary.',
    howEyebrow: 'THE RITUAL', howTitle: 'Capture. Protect. Release.',
    steps: [['01', 'Capture', 'Open the flyout from anywhere with Alt + Space.'], ['02', 'Protect', 'Content stays local and is sealed with AES-256-GCM.'], ['03', 'Release', 'Set a lifetime. When time is over, the note disappears.']],
    securityEyebrow: 'UNDER THE SURFACE', securityTitle: 'A small surface.\nA serious boundary.', securityBody: 'No account. No sync. No cloud copy waiting behind the interface. Uriel is built for the few seconds when sensitive text needs somewhere safe to exist.',
    specs: [['CRYPTOGRAPHY', 'AES-256-GCM'], ['KEY DERIVATION', 'Argon2id'], ['CLIPBOARD', '30 sec cleanup'], ['PLATFORM', 'Windows 10 / 11']],
    downloadEyebrow: 'READY WHEN YOU ARE', downloadTitle: 'Keep less.', downloadBody: 'Install Uriel and give temporary information a temporary home.', latest: 'LATEST · v0.1.0 · WINDOWS X64', footer: 'An ephemeral encrypted scratchpad.', source: 'Source', release: 'Releases', privacy: 'Local by design.'
  },
  ru: {
    nav: ['Принципы', 'Безопасность', 'Скачать'],
    eyebrow: 'ЭФЕМЕРНО · ЗАЩИЩЕННО · ЛОКАЛЬНО',
    title: 'Личные мысли,\nна короткий срок.',
    lead: 'Uriel — тихий блокнот для Windows, где секреты, команды и фрагменты кода живут ровно столько, сколько нужно.',
    download: 'Скачать для Windows', github: 'Открыть на GitHub', intro: 'Убежище для временного.',
    howEyebrow: 'РИТУАЛ', howTitle: 'Запиши. Защити. Отпусти.',
    steps: [['01', 'Запиши', 'Открой панель из любого приложения через Alt + Space.'], ['02', 'Защити', 'Данные остаются локально и запечатываются AES-256-GCM.'], ['03', 'Отпусти', 'Задай время жизни. После него заметка исчезнет.']],
    securityEyebrow: 'ПОД ПОВЕРХНОСТЬЮ', securityTitle: 'Маленькая поверхность.\nСерьезная граница.', securityBody: 'Без аккаунта. Без синхронизации. Без скрытой облачной копии. Uriel создан для тех секунд, когда конфиденциальному тексту нужно безопасное место.',
    specs: [['ШИФРОВАНИЕ', 'AES-256-GCM'], ['ПОЛУЧЕНИЕ КЛЮЧА', 'Argon2id'], ['БУФЕР ОБМЕНА', 'очистка за 30 сек'], ['ПЛАТФОРМА', 'Windows 10 / 11']],
    downloadEyebrow: 'КОГДА БУДЕШЬ ГОТОВ', downloadTitle: 'Храни меньше.', downloadBody: 'Установи Uriel и дай временной информации временный дом.', latest: 'ПОСЛЕДНЯЯ · v0.1.0 · WINDOWS X64', footer: 'Эфемерный защищенный блокнот.', source: 'Исходный код', release: 'Релизы', privacy: 'Локально по замыслу.'
  }
} as const;

function Wings() {
  return <svg className="wings" viewBox="0 0 760 260" aria-hidden="true">
    <g className="wing wing-left">
      <path d="M376 126 C311 78 243 29 105 22 C184 68 224 101 275 141 C207 108 135 101 39 119 C146 143 207 168 280 190 C211 184 142 199 84 232 C199 227 300 211 375 167Z" />
      <path className="feather feather-1" d="M335 123 C272 82 205 51 123 31 C206 80 261 110 325 143Z" /><path className="feather feather-2" d="M309 148 C230 124 151 115 73 119 C168 137 238 154 316 166Z" /><path className="feather feather-3" d="M314 170 C242 174 177 192 116 220 C208 207 274 197 329 183Z" />
    </g>
    <g className="wing wing-right"><path d="M384 126 C449 78 517 29 655 22 C576 68 536 101 485 141 C553 108 625 101 721 119 C614 143 553 168 480 190 C549 184 618 199 676 232 C561 227 460 211 385 167Z" /><path className="feather feather-1" d="M425 123 C488 82 555 51 637 31 C554 80 499 110 435 143Z" /><path className="feather feather-2" d="M451 148 C530 124 609 115 687 119 C592 137 522 154 444 166Z" /><path className="feather feather-3" d="M446 170 C518 174 583 192 644 220 C552 207 486 197 431 183Z" /></g>
  </svg>;
}

function App() {
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('uriel-site-language') as Language) || (navigator.language.startsWith('ru') ? 'ru' : 'en'));
  const [intro, setIntro] = useState(() => !sessionStorage.getItem('uriel-intro-seen'));
  const t = copy[language];
  useEffect(() => { document.documentElement.lang = language; localStorage.setItem('uriel-site-language', language); }, [language]);
  useEffect(() => { if (intro) { const timer = window.setTimeout(() => { sessionStorage.setItem('uriel-intro-seen', 'true'); setIntro(false); }, 3600); return () => window.clearTimeout(timer); } }, [intro]);
  const switchLanguage = () => setLanguage((current) => current === 'ru' ? 'en' : 'ru');

  return <div className="site-shell">
    {intro && <div className="intro" role="status" aria-label="Uriel"><Wings /><div className="intro-wordmark">URIEL</div><span className="intro-line" /></div>}
    <header className="site-header"><a className="wordmark" href="#top"><span className="mark">✦</span> URIEL</a><nav>{t.nav.map((item, i) => <a href={['#principles', '#security', '#download'][i]} key={item}>{item}</a>)}</nav><div className="header-end"><button className="lang-switch" onClick={switchLanguage} aria-label="Switch language"><span className={language === 'ru' ? 'active' : ''}>RU</span><i /> <span className={language === 'en' ? 'active' : ''}>EN</span></button><a className="header-download" href={releaseUrl}>↗</a></div></header>
    <main id="top">
      <section className="hero"><div className="hero-copy"><span className="eyebrow">{t.eyebrow}</span><h1>{t.title.split('\n').map((line) => <span key={line}>{line}</span>)}</h1><p>{t.lead}</p><div className="hero-actions"><a className="button button-light" href={releaseUrl}>{t.download}<span>↓</span></a><a className="text-link" href={githubUrl} target="_blank" rel="noreferrer">{t.github} <span>↗</span></a></div></div><div className="hero-aura"><Wings /><div className="aura-core"><span>✦</span></div><small>01 / 03</small></div><div className="hero-footer"><span>{t.intro}</span><span className="scroll-cue">SCROLL <i /></span></div></section>
      <section className="ritual section" id="principles"><div className="section-heading"><span className="eyebrow">{t.howEyebrow}</span><h2>{t.howTitle}</h2></div><div className="steps">{t.steps.map(([number, title, body]) => <article className="step" key={number}><span className="step-number">{number}</span><h3>{title}</h3><p>{body}</p></article>)}</div></section>
      <section className="security section" id="security"><div className="security-mark"><div className="lock-orbit"><span>✦</span></div></div><div className="security-copy"><span className="eyebrow">{t.securityEyebrow}</span><h2>{t.securityTitle.split('\n').map((line) => <span key={line}>{line}</span>)}</h2><p>{t.securityBody}</p><div className="spec-grid">{t.specs.map(([label, value]) => <div className="spec" key={label}><span>{label}</span><b>{value}</b></div>)}</div></div></section>
      <section className="download-section section" id="download"><span className="eyebrow">{t.downloadEyebrow}</span><h2>{t.downloadTitle}</h2><p>{t.downloadBody}</p><a className="button button-light" href={releaseUrl}>{t.download}<span>↓</span></a><small>{t.latest}</small></section>
    </main>
    <footer><a className="wordmark" href="#top"><span className="mark">✦</span> URIEL</a><span>{t.footer}</span><div><a href={githubUrl} target="_blank" rel="noreferrer">{t.source}</a><a href={`${githubUrl}/releases`} target="_blank" rel="noreferrer">{t.release}</a><b>{t.privacy}</b></div></footer>
  </div>;
}

export default App;
