const SendEmailForm = () => {
	return (
		<form
			action="https://api.form-data.com/f/gf25yb51m5wa936sa8ak"
			method="post"
			target="_blank"
			className="mx-auto max-w-md rounded-md bg-white p-4 shadow-md"
		>
			<div className="mb-4">
				<label
					htmlFor="email"
					className="block font-medium text-gray-700 text-sm"
				>
					Email
				</label>
				<input
					name="email"
					type="email"
					className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
				/>
			</div>
			<div className="mb-4">
				<label
					htmlFor="name"
					className="block font-medium text-gray-700 text-sm"
				>
					Name
				</label>
				<input
					name="name"
					type="text"
					className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
				/>
			</div>
			<div className="mb-4">
				<label
					htmlFor="message"
					className="block font-medium text-gray-700 text-sm"
				>
					Message
				</label>
				<textarea
					name="message"
					rows={4}
					className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
				/>
			</div>
			<button
				type="submit"
				className="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 font-medium text-sm text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
			>
				Submit
			</button>
		</form>
	);
};

export default function SendEmailPage() {
	return (
		<div>
			<h1>Send Email</h1>
			<SendEmailForm />
		</div>
	);
}
