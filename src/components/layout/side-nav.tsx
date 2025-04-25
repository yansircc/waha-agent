"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
	Brain,
	ChevronLeft,
	ChevronRight,
	Database,
	Home,
	LogOut,
	Mail,
	Smartphone,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
	{ name: "Dashboard", href: "/dashboard", icon: Home },
	{ name: "Agents", href: "/agents", icon: Brain },
	{ name: "Knowledge", href: "/kb", icon: Database },
	{ name: "Instances", href: "/instances", icon: Smartphone },
	{ name: "Emails", href: "/emails", icon: Mail },
];

export function SideNav() {
	const pathname = usePathname();
	const [collapsed, setCollapsed] = useState(false);

	const toggleCollapsed = () => setCollapsed(!collapsed);

	return (
		<div
			className={cn(
				"relative flex h-screen flex-col border-r bg-background py-4 transition-all duration-300",
				collapsed ? "w-16" : "w-64",
			)}
		>
			<div className="flex items-center px-4 pb-6">
				{!collapsed && (
					<span className="font-bold text-foreground text-xl">Waha Mastra</span>
				)}
				<Button
					variant="ghost"
					size="icon"
					onClick={toggleCollapsed}
					className={cn(
						"absolute hover:bg-muted",
						collapsed ? "top-4 right-0 translate-x-1/2" : "top-4 right-4",
					)}
				>
					{collapsed ? (
						<ChevronRight className="h-4 w-4" />
					) : (
						<ChevronLeft className="h-4 w-4" />
					)}
				</Button>
			</div>

			<nav className="flex-1 space-y-1 px-2">
				{navItems.map((item) => {
					const isActive = pathname.startsWith(item.href);

					return (
						<Link
							key={item.href}
							href={item.href}
							className={cn(
								"flex items-center gap-3 rounded-md px-3 py-2 font-medium text-sm transition-colors",
								isActive
									? "bg-primary text-primary-foreground"
									: "text-muted-foreground hover:bg-muted hover:text-foreground",
							)}
						>
							<item.icon className="h-5 w-5" />
							{!collapsed && <span>{item.name}</span>}
						</Link>
					);
				})}
			</nav>

			<div className="mt-auto border-t px-2 pt-2">
				<Link
					href="/api/auth/signout?callbackUrl=/dashboard"
					className={cn(
						"flex w-full items-center gap-3 rounded-md px-3 py-2 font-medium text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground",
					)}
				>
					<LogOut className="h-5 w-5" />
					{!collapsed && <span>Sign out</span>}
				</Link>
			</div>
		</div>
	);
}
