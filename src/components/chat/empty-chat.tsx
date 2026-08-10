"use client"

export function EmptyChat() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 select-none bg-[var(--surface)] relative overflow-hidden">
      {/* Subtle pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Icon */}
      <div className="relative z-10 flex flex-col items-center gap-5 text-center px-8 max-w-sm">
        <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-[var(--border-color)] bg-[var(--sidebar-bg)]">
          <svg
            viewBox="0 0 48 48"
            className="w-12 h-12 text-[var(--text-muted)]"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 8h40v28a4 4 0 01-4 4H8a4 4 0 01-4-4V8z" />
            <path d="M4 8l20 16L44 8" />
          </svg>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-light text-[var(--text-primary)]">
            Nexyn Chat
          </h2>
          <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
            Select a conversation to start chatting. Your messages are secured with the best-in-class encryption.
          </p>
        </div>

        <div className="flex items-center gap-1.5 mt-2">
          <svg className="w-3.5 h-3.5 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
          </svg>
          <span className="text-[12px] text-[var(--text-muted)]">End-to-end encrypted</span>
        </div>
      </div>
    </div>
  )
}
