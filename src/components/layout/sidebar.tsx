"use client";

import { cn } from "@/lib/utils";
import {
	Dialog,
	DialogBackdrop,
	DialogPanel,
	TransitionChild,
} from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { NavigationItems } from "./navigation-items";

interface SidebarProps {
	children?: React.ReactNode;
}

export function Sidebar({ children }: SidebarProps) {
	const [sidebarOpen, setSidebarOpen] = useState(false);

	return (
		<>
			<Dialog
				open={sidebarOpen}
				onClose={setSidebarOpen}
				className="relative z-50 lg:hidden"
			>
				<DialogBackdrop
					transition
					className="fixed inset-0 bg-gray-900/80 transition-opacity duration-300 ease-linear data-[closed]:opacity-0"
				/>

				<div className="fixed inset-0 flex">
					<DialogPanel
						transition
						className="data-[closed]:-translate-x-full relative mr-16 flex w-full max-w-xs flex-1 transform transition duration-300 ease-in-out"
					>
						<TransitionChild>
							<div className="absolute top-0 left-full flex w-16 justify-center pt-5 duration-300 ease-in-out data-[closed]:opacity-0">
								<button
									type="button"
									onClick={() => setSidebarOpen(false)}
									className="-m-2.5 p-2.5"
								>
									<span className="sr-only">Close sidebar</span>
									<XMarkIcon aria-hidden="true" className="size-6 text-white" />
								</button>
							</div>
						</TransitionChild>
						<div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-2">
							<div className="flex h-16 shrink-0 items-center">
								<img
									alt="WahaAI"
									src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=600"
									className="h-8 w-auto"
								/>
							</div>
							<NavigationItems />
						</div>
					</DialogPanel>
				</div>
			</Dialog>

			{/* Static sidebar for desktop */}
			<div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
				<div className="flex grow flex-col gap-y-5 overflow-y-auto border-gray-200 border-r bg-white px-6">
					<div className="flex h-16 shrink-0 items-center">
						<img
							alt="WahaAI"
							src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=600"
							className="h-8 w-auto"
						/>
					</div>
					<NavigationItems />
				</div>
			</div>

			{/* Mobile header */}
			<div className="sticky top-0 z-40 flex items-center gap-x-6 bg-white px-4 py-4 shadow-sm sm:px-6 lg:hidden">
				<button
					type="button"
					onClick={() => setSidebarOpen(true)}
					className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
				>
					<span className="sr-only">Open sidebar</span>
					<Bars3Icon aria-hidden="true" className="size-6" />
				</button>
				<div className="flex-1 font-semibold text-gray-900 text-sm/6">
					WahaAI Platform
				</div>
				<a href="#profile">
					<span className="sr-only">Your profile</span>
					<img
						alt=""
						src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
						className="size-8 rounded-full bg-gray-50"
					/>
				</a>
			</div>

			{/* Main content */}
			<main className="py-10 lg:pl-72">
				<div className="px-4 sm:px-6 lg:px-8">{children}</div>
			</main>
		</>
	);
}
