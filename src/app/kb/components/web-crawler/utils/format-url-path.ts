// 格式化URL路径以便于显示
export function formatUrlPath(url: string): string {
	try {
		const urlObj = new URL(url);
		let path = urlObj.pathname;

		// 对于首页，显示"/"
		if (path === "" || path === "/") {
			return "/";
		}

		// 如果路径过长，截断中间部分
		if (path.length > 60) {
			const start = path.substring(0, 40);
			const end = path.substring(path.length - 10);
			path = `${start}...${end}`;
		}

		return path;
	} catch (e) {
		// 解析错误时返回原始URL
		return url;
	}
}
