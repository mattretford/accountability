import Link from 'next/link'
import { logout } from '@/app/actions/auth'

export function SettingsMenu() {
  return (
    <details className="relative z-40">
      <summary
        aria-label="Open settings menu"
        className="grid size-10 cursor-pointer list-none place-items-center rounded-lg border border-zinc-300 bg-white shadow-sm [&::-webkit-details-marker]:hidden"
      >
        <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
          <path d="M12 8.25A3.75 3.75 0 1 0 12 15.75 3.75 3.75 0 0 0 12 8.25Z" stroke="currentColor" strokeWidth="1.8" />
          <path d="M19.4 13.5a7.7 7.7 0 0 0 0-3l1.45-1.13-1.8-3.12-1.72.7a7.85 7.85 0 0 0-2.58-1.5L14.5 3.6h-3.6l-.25 1.85a7.85 7.85 0 0 0-2.58 1.5l-1.72-.7-1.8 3.12L6 10.5a7.7 7.7 0 0 0 0 3l-1.45 1.13 1.8 3.12 1.72-.7a7.85 7.85 0 0 0 2.58 1.5l.25 1.85h3.6l.25-1.85a7.85 7.85 0 0 0 2.58-1.5l1.72.7 1.8-3.12L19.4 13.5Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      </summary>
      <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-zinc-300 bg-white p-2 shadow-lg">
        <Link className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-zinc-100" href="/settings/theme">Change theme</Link>
        <form action={logout}>
          <button className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-zinc-100">Log out</button>
        </form>
      </div>
    </details>
  )
}
