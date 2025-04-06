"use client";

import { Button } from "@/components/ui/button";
import { signOut } from "@/server/auth";

export function SignOutButton() {
	return <Button onClick={() => signOut()}>Sign out</Button>;
}
