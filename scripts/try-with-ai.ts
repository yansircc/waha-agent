import fs from "node:fs";
import path from "node:path";
import { crawlWebpage, jinaCrawler, queueSitemap } from "../src/lib/jina";
import type { JinaCrawlResult } from "../src/lib/jina";

const OUTPUT_DIR = path.join(process.cwd(), "tmp");

// 确保输出目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
	fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 获取当前时间戳作为文件名一部分
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

async function main() {
	const args = process.argv.slice(2);

	if (args.length < 2) {
		console.log("Usage: bun run scripts/try-with-ai.ts [url|sitemap] [URL]");
		process.exit(1);
	}

	const command = args[0];
	const url = args[1];

	if (!url) {
		console.error("请提供一个有效的URL");
		process.exit(1);
	}

	// 启用AI清洗选项
	const options = { useAiCleaning: true };

	try {
		if (command === "url") {
			console.log(`开始处理URL: ${url} (使用AI清洗)`);
			const result = await crawlWebpage(url, options);

			if (result.success) {
				console.log("爬取成功！");
				console.log(`标题: ${result.title}`);
				console.log(`描述: ${result.description}`);

				// 显示内容的前200个字符
				console.log(`内容摘要: ${result.content.substring(0, 200)}...`);
				console.log(`内容长度: ${result.content.length} 字符`);

				// 保存爬取结果
				const outputPath = path.join(
					OUTPUT_DIR,
					`crawl-ai-result-${timestamp}.txt`,
				);
				const content = formatCrawlResult(result);

				fs.writeFileSync(outputPath, content);
				console.log(`爬取结果已保存到: ${outputPath}`);
			} else {
				console.error("爬取失败:", result.error);
			}
		} else if (command === "sitemap") {
			console.log(`开始处理Sitemap: ${url} (使用AI清洗)`);
			console.log("解析Sitemap并添加到队列...");
			const jobIds = await queueSitemap(url, options);

			if (jobIds.length === 0) {
				console.log("没有从Sitemap中找到有效的URL");
				return;
			}

			console.log(`成功添加 ${jobIds.length} 个URL到队列`);
			console.log("任务ID:", jobIds);

			// 等待所有任务完成
			console.log("等待爬取任务完成...");
			await waitForJobs(jobIds);

			// 获取并合并所有爬取结果
			console.log("合并爬取结果...");
			const results = await collectResults(jobIds);

			if (results.totalCompleted === 0) {
				console.error("爬取失败: 没有成功爬取任何内容");
				return;
			}

			// 验证内容
			if (results.combinedContent.length < 1000) {
				console.warn("警告: 爬取的内容可能不完整，内容长度较短");
			}

			// 获取域名作为文件名一部分
			let domain = "website";
			try {
				const urlObj = new URL(url);
				domain = urlObj.hostname;
			} catch {
				// 使用默认值
			}

			// 保存合并后的内容
			const outputPath = path.join(
				OUTPUT_DIR,
				`${domain}-sitemap-ai-${timestamp}.txt`,
			);
			fs.writeFileSync(outputPath, results.combinedContent);

			console.log(
				`爬取完成！共爬取 ${results.totalCompleted} 个URL，失败 ${results.totalFailed} 个URL`,
			);
			console.log(`内容总长度: ${results.combinedContent.length} 字符`);
			console.log(`合并结果已保存到: ${outputPath}`);
		} else {
			console.error(`未知命令: ${command}`);
			process.exit(1);
		}
	} catch (error) {
		console.error("执行出错:", error);
	}

	console.log("测试脚本执行完毕");
}

/**
 * 等待所有任务完成
 */
async function waitForJobs(jobIds: string[]): Promise<void> {
	const pollInterval = 2000; // 每2秒检查一次状态
	let allCompleted = false;

	// 显示进度条所需变量
	let completed = 0;
	let failed = 0;
	const total = jobIds.length;

	while (!allCompleted) {
		completed = 0;
		failed = 0;
		let processing = 0;

		// 检查所有任务状态
		for (const jobId of jobIds) {
			const job = await jinaCrawler.getJobStatus(jobId);

			if (!job) continue;

			if (job.status === "completed") {
				completed++;
			} else if (job.status === "failed") {
				failed++;
			} else if (job.status === "processing") {
				processing++;
			}
		}

		// 计算并显示进度
		const percentage = Math.round(((completed + failed) / total) * 100);

		// 清除当前行并显示进度
		process.stdout.write("\r\x1b[K"); // 清除当前行
		process.stdout.write(
			`进度: ${percentage}% [${completed} 完成, ${processing} 处理中, ${failed} 失败] 共 ${total} 个URL`,
		);

		// 检查是否全部完成
		if (completed + failed === total) {
			allCompleted = true;
			process.stdout.write("\n"); // 写入换行符
		} else {
			// 等待一段时间后再次检查
			await new Promise((resolve) => setTimeout(resolve, pollInterval));
		}
	}
}

/**
 * 收集并合并所有爬取结果
 */
async function collectResults(jobIds: string[]): Promise<{
	combinedContent: string;
	totalCompleted: number;
	totalFailed: number;
}> {
	let combinedContent = "";
	let totalCompleted = 0;
	let totalFailed = 0;

	// 获取每个任务的结果
	for (const jobId of jobIds) {
		const job = await jinaCrawler.getJobStatus(jobId);

		if (!job) continue;

		if (job.status === "completed" && job.result && job.result.content) {
			totalCompleted++;

			// 添加分隔符和标题
			// combinedContent += `\n\n${"=".repeat(80)}\n`;
			// combinedContent += `URL: ${job.url}\n`;
			// combinedContent += `标题: ${job.result.title || "无标题"}\n`;
			// combinedContent += `${"=".repeat(80)}\n\n`;

			// 添加内容
			combinedContent += job.result.content.trim();
			combinedContent += "\n\n";
		} else if (job.status === "failed") {
			totalFailed++;
		}
	}

	return {
		combinedContent,
		totalCompleted,
		totalFailed,
	};
}

/**
 * 格式化单个爬取结果为文本
 */
function formatCrawlResult(result: JinaCrawlResult): string {
	let content = `URL: ${result.url}\n`;
	content += `标题: ${result.title || "无标题"}\n`;
	content += `时间戳: ${result.timestamp}\n`;
	content += `成功: ${result.success}\n`;
	content += "AI处理: 是\n";

	if (result.error) {
		content += `错误: ${result.error}\n`;
	}

	content += `${"=".repeat(80)}\n\n`;
	content += result.content || "";

	return content;
}

main().catch(console.error);
