import Link from "next/link"

export function Header() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span className="text-white font-bold text-lg tracking-tight">APG</span>
            <span className="text-zinc-500 text-sm font-medium">Deal Studio</span>
          </Link>
          <span className="hidden sm:block text-zinc-700 text-xs">·</span>
          <span className="hidden sm:block text-zinc-600 text-xs">by <a href="https://www.linkedin.com/in/omidaryan/" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white transition-colors">Omid Aryan</a></span>
        </div>
        <Link
          href="/methodology"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-700 text-xs font-medium text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors"
        >
          {/* Book / methodology icon */}
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
            <path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 12.5v-9Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/>
            <path d="M5 5.5h6M5 8h6M5 10.5h4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
          </svg>
          Methodology
        </Link>
      </div>
    </header>
  )
}
