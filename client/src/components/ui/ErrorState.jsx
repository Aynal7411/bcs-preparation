export default function ErrorState({ title = 'Something went wrong', message = 'Please try again.', onRetry }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
      <p className="text-sm font-semibold text-red-700">{title}</p>
      <p className="mt-1 text-xs text-red-600">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
        >
          Retry
        </button>
      )}
    </div>
  );
}
