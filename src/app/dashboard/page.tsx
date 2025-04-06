import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function DashboardPage() {
	return (
		<DashboardLayout>
			<div className="py-10">
				<header>
					<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
						<h1 className="font-bold text-3xl text-gray-900 leading-tight tracking-tight">
							WhatsApp AI Platform Dashboard
						</h1>
					</div>
				</header>
				<main>
					<div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
						<div className="px-4 py-8 sm:px-0">
							<div className="rounded-lg border-4 border-gray-200 border-dashed p-8">
								<p className="text-gray-600 text-lg">
									Welcome to your WhatsApp AI Bot management platform. Manage
									your agents, knowledge bases, and WhatsApp instances from
									here.
								</p>
								<div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
									{/* Dashboard metrics will go here */}
									<div className="overflow-hidden rounded-lg bg-white shadow">
										<div className="p-5">
											<div className="flex items-center">
												<div className="flex-shrink-0">
													<svg
														className="h-6 w-6 text-gray-400"
														xmlns="http://www.w3.org/2000/svg"
														fill="none"
														viewBox="0 0 24 24"
														stroke="currentColor"
														aria-hidden="true"
													>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={2}
															d="M13 10V3L4 14h7v7l9-11h-7z"
														/>
													</svg>
												</div>
												<div className="ml-5 w-0 flex-1">
													<dl>
														<dt className="truncate font-medium text-gray-500 text-sm">
															Active Agents
														</dt>
														<dd>
															<div className="font-medium text-gray-900 text-lg">
																0
															</div>
														</dd>
													</dl>
												</div>
											</div>
										</div>
									</div>

									<div className="overflow-hidden rounded-lg bg-white shadow">
										<div className="p-5">
											<div className="flex items-center">
												<div className="flex-shrink-0">
													<svg
														className="h-6 w-6 text-gray-400"
														xmlns="http://www.w3.org/2000/svg"
														fill="none"
														viewBox="0 0 24 24"
														stroke="currentColor"
														aria-hidden="true"
													>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={2}
															d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
														/>
													</svg>
												</div>
												<div className="ml-5 w-0 flex-1">
													<dl>
														<dt className="truncate font-medium text-gray-500 text-sm">
															Connected Instances
														</dt>
														<dd>
															<div className="font-medium text-gray-900 text-lg">
																0
															</div>
														</dd>
													</dl>
												</div>
											</div>
										</div>
									</div>

									<div className="overflow-hidden rounded-lg bg-white shadow">
										<div className="p-5">
											<div className="flex items-center">
												<div className="flex-shrink-0">
													<svg
														className="h-6 w-6 text-gray-400"
														xmlns="http://www.w3.org/2000/svg"
														fill="none"
														viewBox="0 0 24 24"
														stroke="currentColor"
														aria-hidden="true"
													>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={2}
															d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
														/>
													</svg>
												</div>
												<div className="ml-5 w-0 flex-1">
													<dl>
														<dt className="truncate font-medium text-gray-500 text-sm">
															Knowledge Bases
														</dt>
														<dd>
															<div className="font-medium text-gray-900 text-lg">
																0
															</div>
														</dd>
													</dl>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</main>
			</div>
		</DashboardLayout>
	);
}
