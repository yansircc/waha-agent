"use client";

import { Button } from "@/components/ui/button";
import { signIn } from "@/server/auth";

export function SignInButton() {
	return <Button onClick={() => signIn()}>Sign in</Button>;
}
