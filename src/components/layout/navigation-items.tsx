import {
	BookOpenIcon,
	HomeIcon,
	PhoneIcon,
	RocketLaunchIcon,
	UserIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Helper function for class names
function classNames(...classes: string[]) {
	return classes.filter(Boolean).join(" ");
}

export function NavigationItems() {
	const pathname = usePathname();

	const navigation = [
		{
			name: "Dashboard",
			href: "/dashboard",
			icon: HomeIcon,
			current: pathname === "/dashboard",
		},
		{
			name: "Agents",
			href: "/agents",
			icon: RocketLaunchIcon,
			current: pathname === "/agents",
		},
		{
			name: "Knowledge",
			href: "/knowledge",
			icon: BookOpenIcon,
			current: pathname === "/knowledge",
		},
		{
			name: "Instances",
			href: "/instances",
			icon: PhoneIcon,
			current: pathname === "/instances",
		},
	];

	return (
		<nav className="flex flex-1 flex-col">
			<ol className="flex flex-1 flex-col gap-y-7">
				<li>
					<ol className="-mx-2 space-y-1">
						{navigation.map((item) => (
							<li key={item.name}>
								<Link
									href={item.href}
									className={classNames(
										item.current
											? "bg-gray-50 text-indigo-600"
											: "text-gray-700 hover:bg-gray-50 hover:text-indigo-600",
										"group flex gap-x-3 rounded-md p-2 font-semibold text-sm/6",
									)}
								>
									<item.icon
										aria-hidden="true"
										className={classNames(
											item.current
												? "text-indigo-600"
												: "text-gray-400 group-hover:text-indigo-600",
											"size-6 shrink-0",
										)}
									/>
									{item.name}
								</Link>
							</li>
						))}
					</ol>
				</li>
				<li className="-mx-6 mt-auto">
					<Link
						href="/profile"
						className="flex items-center gap-x-4 px-6 py-3 font-semibold text-gray-900 text-sm/6 hover:bg-gray-50"
					>
						<img
							alt=""
							src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
							className="size-8 rounded-full bg-gray-50"
						/>
						<span className="sr-only">Your profile</span>
						<span aria-hidden="true">User Profile</span>
					</Link>
				</li>
			</ol>
		</nav>
	);
}
