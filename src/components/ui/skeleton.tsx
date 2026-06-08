type TableSkeletonProps = {
  rows?: number;
  columns: number;
};

export function TableSkeleton({ rows = 6, columns }: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={`skeleton-${rowIndex}`} aria-hidden>
          {Array.from({ length: columns }).map((__, colIndex) => (
            <td key={`skeleton-${rowIndex}-${colIndex}`} className="px-4 py-3">
              <div className="h-4 w-full max-w-[10rem] animate-pulse rounded bg-slate-200" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
