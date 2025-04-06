"use client";

import { Sidebar } from "./sidebar";

interface DashboardLayoutProps {
	children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
	return (
		<div className="min-h-screen bg-gray-50">
			<Sidebar>{children}</Sidebar>
		</div>
	);
}
