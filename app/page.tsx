import Link from 'next/link';

export default function HomePage() {
  return <main style={{maxWidth:720,margin:'0 auto',padding:'5rem 1.5rem',fontFamily:'system-ui'}}><p>Aura</p><h1>Scientists</h1><p>Model-agnostic scientific AI runtime with local browser inference and a server fallback.</p><nav style={{display:'flex',gap:12}}><Link href="/chat">Open chat</Link><Link href="/demo">Open demo</Link></nav></main>;
}
