'use client'
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div id="errBox">
      RUNTIME ERROR
      {'\n'}
      The timeline encountered an error.
      {'\n\n'}
      <button className="btn" onClick={reset}>
        TRY AGAIN
      </button>
    </div>
  )
}
