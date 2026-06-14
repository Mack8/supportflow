export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-[180px] items-center justify-center rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-500 shadow-sm">
      {label}...
    </div>
  );
}
