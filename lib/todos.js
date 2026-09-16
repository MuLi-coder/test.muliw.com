/**
 * 待办事项数据层（内存存储）
 *
 * 默认使用内存 Map 存储，目的是让项目「零依赖、开箱即用」：
 * 本地 `npm run dev` 即可完整跑通 CRUD。
 *
 * 注意：部署到 Vercel 后，Serverless 实例会冷启动，内存数据不持久。
 * 如需持久化，请替换本文件内部实现（对外函数签名保持不变，API 与前端无需改动），
 * 例如接入 Vercel KV：
 *
 *   import { kv } from '@vercel/kv';
 *   export async function listTodos() { return (await kv.get('todos')) ?? []; }
 *   export async function createTodo(text) {
 *     const todos = await listTodos();
 *     const todo = { id: crypto.randomUUID(), text, completed: false, createdAt: new Date().toISOString() };
 *     await kv.set('todos', [...todos, todo]);
 *     return todo;
 *   }
 *   // 以此类推，注意替换后调用处需相应 await。
 */

let todos = [];
let seq = 0;

function nextId() {
  seq += 1;
  return String(seq);
}

/** 获取全部待办（返回副本，避免外部直接改动内部状态） */
export function listTodos() {
  return todos.map((t) => ({ ...t }));
}

/** 按 id 获取单个待办，不存在返回 null */
export function getTodo(id) {
  const todo = todos.find((t) => t.id === id);
  return todo ? { ...todo } : null;
}

/** 新建待办 */
export function createTodo(text) {
  const todo = {
    id: nextId(),
    text,
    completed: false,
    createdAt: new Date().toISOString(),
  };
  todos.push(todo);
  return { ...todo };
}

/** 更新待办（patch 可为 { text? } 或 { completed? }），不存在返回 null */
export function updateTodo(id, patch) {
  const index = todos.findIndex((t) => t.id === id);
  if (index === -1) return null;
  const next = { ...todos[index], ...patch, id: todos[index].id };
  todos[index] = next;
  return { ...next };
}

/** 删除待办，成功返回 true，不存在返回 false */
export function deleteTodo(id) {
  const index = todos.findIndex((t) => t.id === id);
  if (index === -1) return false;
  todos.splice(index, 1);
  return true;
}