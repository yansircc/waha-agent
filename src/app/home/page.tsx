"use client";

import { ChatForm } from "@/components/chat-form";
import {
	Dialog,
	DialogBackdrop,
	DialogPanel,
	TransitionChild,
} from "@headlessui/react";
import {
	Bars3Icon,
	CalendarIcon,
	ChartPieIcon,
	DocumentDuplicateIcon,
	FolderIcon,
	HomeIcon,
	UsersIcon,
	XMarkIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";

const navigation = [
	{ name: "Dashboard", href: "#", icon: HomeIcon, current: true },
	{ name: "Team", href: "#", icon: UsersIcon, current: false },
	{ name: "Projects", href: "#", icon: FolderIcon, current: false },
	{ name: "Calendar", href: "#", icon: CalendarIcon, current: false },
	{ name: "Documents", href: "#", icon: DocumentDuplicateIcon, current: false },
	{ name: "Reports", href: "#", icon: ChartPieIcon, current: false },
];
const teams = [
	{ id: 1, name: "Heroicons", href: "#", initial: "H", current: false },
	{ id: 2, name: "Tailwind Labs", href: "#", initial: "T", current: false },
	{ id: 3, name: "Workcation", href: "#", initial: "W", current: false },
];

function classNames(...classes: string[]) {
	return classes.filter(Boolean).join(" ");
}

export default function Example() {
	const [sidebarOpen, setSidebarOpen] = useState(false);

	return (
		<>
			<div>
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
										<XMarkIcon
											aria-hidden="true"
											className="size-6 text-white"
										/>
									</button>
								</div>
							</TransitionChild>
							{/* Sidebar component, swap this element with another sidebar if you like */}
							<div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-2">
								<div className="flex h-16 shrink-0 items-center">
									<img
										alt="Your Company"
										src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=600"
										className="h-8 w-auto"
									/>
								</div>
								<nav className="flex flex-1 flex-col">
									<ol className="flex flex-1 flex-col gap-y-7">
										<li>
											<ol className="-mx-2 space-y-1">
												{navigation.map((item) => (
													<li key={item.name}>
														<a
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
														</a>
													</li>
												))}
											</ol>
										</li>
										<li>
											<div className="font-semibold text-gray-400 text-xs/6">
												Your teams
											</div>
											<ol className="-mx-2 mt-2 space-y-1">
												{teams.map((team) => (
													<li key={team.name}>
														<a
															href={team.href}
															className={classNames(
																team.current
																	? "bg-gray-50 text-indigo-600"
																	: "text-gray-700 hover:bg-gray-50 hover:text-indigo-600",
																"group flex gap-x-3 rounded-md p-2 font-semibold text-sm/6",
															)}
														>
															<span
																className={classNames(
																	team.current
																		? "border-indigo-600 text-indigo-600"
																		: "border-gray-200 text-gray-400 group-hover:border-indigo-600 group-hover:text-indigo-600",
																	"flex size-6 shrink-0 items-center justify-center rounded-lg border bg-white font-medium text-[0.625rem]",
																)}
															>
																{team.initial}
															</span>
															<span className="truncate">{team.name}</span>
														</a>
													</li>
												))}
											</ol>
										</li>
									</ol>
								</nav>
							</div>
						</DialogPanel>
					</div>
				</Dialog>

				{/* Static sidebar for desktop */}
				<div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
					{/* Sidebar component, swap this element with another sidebar if you like */}
					<div className="flex grow flex-col gap-y-5 overflow-y-auto border-gray-200 border-r bg-white px-6">
						<div className="flex h-16 shrink-0 items-center">
							<img
								alt="Your Company"
								src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=600"
								className="h-8 w-auto"
							/>
						</div>
						<nav className="flex flex-1 flex-col">
							<ol className="flex flex-1 flex-col gap-y-7">
								<li>
									<ol className="-mx-2 space-y-1">
										{navigation.map((item) => (
											<li key={item.name}>
												<a
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
												</a>
											</li>
										))}
									</ol>
								</li>
								<li>
									<div className="font-semibold text-gray-400 text-xs/6">
										Your teams
									</div>
									<ol className="-mx-2 mt-2 space-y-1">
										{teams.map((team) => (
											<li key={team.name}>
												<a
													href={team.href}
													className={classNames(
														team.current
															? "bg-gray-50 text-indigo-600"
															: "text-gray-700 hover:bg-gray-50 hover:text-indigo-600",
														"group flex gap-x-3 rounded-md p-2 font-semibold text-sm/6",
													)}
												>
													<span
														className={classNames(
															team.current
																? "border-indigo-600 text-indigo-600"
																: "border-gray-200 text-gray-400 group-hover:border-indigo-600 group-hover:text-indigo-600",
															"flex size-6 shrink-0 items-center justify-center rounded-lg border bg-white font-medium text-[0.625rem]",
														)}
													>
														{team.initial}
													</span>
													<span className="truncate">{team.name}</span>
												</a>
											</li>
										))}
									</ol>
								</li>
								<li className="-mx-6 mt-auto">
									<a
										href="#1"
										className="flex items-center gap-x-4 px-6 py-3 font-semibold text-gray-900 text-sm/6 hover:bg-gray-50"
									>
										<img
											alt=""
											src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
											className="size-8 rounded-full bg-gray-50"
										/>
										<span className="sr-only">Your profile</span>
										<span aria-hidden="true">Tom Cook</span>
									</a>
								</li>
							</ol>
						</nav>
					</div>
				</div>

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
						Dashboard
					</div>
					<a href="#1">
						<span className="sr-only">Your profile</span>
						<img
							alt=""
							src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
							className="size-8 rounded-full bg-gray-50"
						/>
					</a>
				</div>

				<main className="py-10 lg:pl-72">
					<div className="px-4 sm:px-6 lg:px-8">
						<ChatForm />
					</div>
				</main>
			</div>
		</>
	);
}
