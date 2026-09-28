"use client";

import { useEffect, useState } from "react";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function Test2Page() {
	const [isDark, setIsDark] = useState(false);

	useEffect(() => {
		document.documentElement.classList.toggle("dark", isDark);
	}, [isDark]);

	return (
		<main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground transition-colors">
			<section className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
				<Breadcrumb className="mb-8">
					<BreadcrumbList className="justify-center">
						<BreadcrumbItem>
							<BreadcrumbLink href="/">Home</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbPage>Test 2</BreadcrumbPage>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>
				<p className="mb-2 text-sm font-medium text-muted-foreground">
					Tailwind CSS test
				</p>
				<h1 className="mb-3 text-3xl font-bold tracking-tight">
					{isDark ? "Dark mode" : "Light mode"}
				</h1>
				<p className="mb-6 text-muted-foreground">
					The utility classes and global CSS variables are working.
				</p>
				<button
					type="button"
					onClick={() => setIsDark((current) => !current)}
					className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground transition-colors hover:opacity-90"
				>
					Toggle {isDark ? "light" : "dark"} mode
				</button>
			</section>
		</main>
	);
}
