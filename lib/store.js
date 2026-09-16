// 内存存储：用一个列表保存每次提交，元素是字典（对象）
// 用 globalThis 挂单例，避免路由模块被重新加载时列表被重置
// 注意：进程重启后列表清空；Vercel Serverless 下内存不持久、多实例不共享
if (!globalThis.__spotSubmissions) {
  globalThis.__spotSubmissions = [];
}

export function addSubmission(record) {
  globalThis.__spotSubmissions.unshift(record);
}

export function getSubmissions() {
  return globalThis.__spotSubmissions;
}