import { Button } from "@/components/ui/button";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export function NeedAuthCard() {
	return (
		<div className="flex h-[80vh] items-center justify-center">
			<Card className="w-full max-w-lg">
				<CardHeader>
					<CardTitle>需要认证</CardTitle>
					<CardDescription>
						请登录以访问仪表板。
						<Button asChild variant="link">
							<Link href="/api/auth/signin">登录</Link>
						</Button>
					</CardDescription>
				</CardHeader>
			</Card>
		</div>
	);
}
