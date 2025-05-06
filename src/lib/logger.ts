/**
 * 日志工具 - 只在开发环境中输出日志
 */

// 检查当前环境
const isDev = process.env.NODE_ENV === "development";

type LogLevel = "info" | "warn" | "error" | "debug";

interface LoggerOptions {
	module?: string;
	enabled?: boolean;
}

/**
 * 创建一个日志记录器
 */
function createLogger(options?: LoggerOptions) {
	const module = options?.module || "";
	const isEnabled = options?.enabled !== undefined ? options.enabled : isDev;
	const prefix = module ? `[${module}]` : "";

	return {
		/**
		 * 信息级别日志
		 */
		info: (...args: unknown[]) => {
			if (isEnabled) {
				console.log(prefix, ...args);
			}
		},

		/**
		 * 警告级别日志
		 */
		warn: (...args: unknown[]) => {
			if (isEnabled) {
				console.warn(prefix, ...args);
			}
		},

		/**
		 * 错误级别日志
		 */
		error: (...args: unknown[]) => {
			// 错误日志在生产环境中也记录
			console.error(prefix, ...args);
		},

		/**
		 * 调试级别日志，只在开发环境输出
		 */
		debug: (...args: unknown[]) => {
			if (isEnabled) {
				console.debug(prefix, ...args);
			}
		},

		/**
		 * 创建一个子日志记录器
		 */
		child: (
			subModule: string,
			childOptions?: Omit<LoggerOptions, "module">,
		) => {
			return createLogger({
				module: module ? `${module}:${subModule}` : subModule,
				enabled:
					childOptions?.enabled !== undefined
						? childOptions.enabled
						: isEnabled,
			});
		},
	};
}

// 创建默认日志记录器
const logger = createLogger();

// 导出用于特定模块的日志记录器
export const kbLogger = createLogger({ module: "KB-SERVICE" });
export const s3Logger = createLogger({ module: "S3-SERVICE" });
const uploadLogger = createLogger({ module: "UPLOAD" });
