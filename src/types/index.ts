// 导出所有类型

// 现有类型定义文件导出
export * from "./instances";
export * from "./agents";

// 实例状态的应用内统一类型别名
export type InstanceStatus = "connected" | "disconnected" | "connecting";

export * from "./waha";
