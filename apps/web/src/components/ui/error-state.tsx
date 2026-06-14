export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <div className="font-semibold">Request failed</div>
      <p className="mt-1">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 h-9 rounded-md bg-red-600 px-3 text-sm font-semibold text-white hover:bg-red-700"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
