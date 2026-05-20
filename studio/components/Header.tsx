import Link from "next/link"

export function Header() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="text-white font-bold text-lg tracking-tight">APG</span>
          <span className="text-zinc-500 text-sm font-medium">Deal Studio</span>
        </Link>
        <p className="text-xs text-zinc-600 hidden sm:block">
          Master-rights deal modeling tool
        </p>
      </div>
    </header>
  )
}
