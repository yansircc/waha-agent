export function LoadingState() {
	return (
		<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
			{[1, 2, 3].map((i) => (
				<div
					key={`loading-${i}`}
					className="h-64 animate-pulse rounded-lg border bg-muted"
				/>
			))}
		</div>
	);
}
