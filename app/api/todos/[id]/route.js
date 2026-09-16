import { NextResponse } from 'next/server';
import { getTodo, updateTodo, deleteTodo } from '@/lib/todos';

// GET /api/todos/:id —— 获取单个待办
export async function GET(_request, { params }) {
  const todo = getTodo(params.id);
  if (!todo) {
    return NextResponse.json({ error: 'todo not found' }, { status: 404 });
  }
  return NextResponse.json({ todo });
}

// PATCH /api/todos/:id —— 更新待办（text / completed 二选一或同时）
export async function PATCH(request, { params }) {
  const todo = getTodo(params.id);
  if (!todo) {
    return NextResponse.json({ error: 'todo not found' }, { status: 404 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const patch = {};
  if (typeof body?.text === 'string') {
    const text = body.text.trim();
    if (!text) {
      return NextResponse.json({ error: 'text cannot be empty' }, { status: 400 });
    }
    patch.text = text;
  }
  if (typeof body?.completed === 'boolean') {
    patch.completed = body.completed;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: 'nothing to update (text or completed expected)' },
      { status: 400 }
    );
  }

  const updated = updateTodo(params.id, patch);
  return NextResponse.json({ todo: updated });
}

// DELETE /api/todos/:id —— 删除待办
export async function DELETE(_request, { params }) {
  const ok = deleteTodo(params.id);
  if (!ok) {
    return NextResponse.json({ error: 'todo not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}