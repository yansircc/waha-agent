import "@/styles/globals.css";

import { SideNav } from "@/components/side-nav";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";

const inter = Inter({
	subsets: ["latin"],
	variable: "--font-sans",
});

export const metadata: Metadata = {
	title: "Waha Mastra - WhatsApp AI Bot Platform",
	description: "WhatsApp AI automation platform for businesses",
	icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<body className={`font-sans ${inter.variable}`}>
				<Providers>
					<div className="flex min-h-screen">
						<SideNav />
						<div className="flex-1 overflow-hidden">{children}</div>
					</div>
				</Providers>
			</body>
		</html>
	);
}
