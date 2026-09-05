import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 p-6">
      <header>
        <p className="text-sm font-medium uppercase tracking-wide text-gray-500">Aura</p>
        <h1 className="text-4xl font-bold">Scientists</h1>
        <p className="mt-3 text-lg text-gray-600">
          A model-agnostic scientific AI runtime with Chrome Built-in AI and a server-side streaming fallback.
        </p>
      </header>

      <nav className="flex flex-wrap gap-3" aria-label="Scientists navigation">
        <Link href="/demo" className="rounded-md bg-blue-600 px-5 py-3 font-medium text-white">
          Open demo
        </Link>
        <Link href="/chat" className="rounded-md border px-5 py-3 font-medium">
          Open chat
        </Link>
      </nav>

      <p className="text-sm text-gray-500">
        The application keeps navigation and runtime assets self-contained.
      </p>
    </main>
  );
}
