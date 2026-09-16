import { NextResponse } from 'next/server';
import { listTodos, createTodo } from '@/lib/todos';

// GET /api/todos —— 获取全部待办
export async function GET() {
  return NextResponse.json({ todos: listTodos() });
}

// POST /api/todos —— 新建待办
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  if (!text) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  const todo = createTodo(text);
  return NextResponse.json({ todo }, { status: 201 });
}