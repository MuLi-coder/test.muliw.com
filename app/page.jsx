'use client';

import { useCallback, useEffect, useState } from 'react';

export default function Home() {
  const [todos, setTodos] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');

  const loadTodos = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/todos');
      if (!res.ok) throw new Error('加载失败');
      const data = await res.json();
      setTodos(data.todos);
    } catch {
      setError('加载待办列表失败，请确认服务已启动');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  async function handleAdd(e) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    const res = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: value }),
    });
    if (res.ok) {
      const data = await res.json();
      setTodos((prev) => [...prev, data.todo]);
      setText('');
    }
  }

  async function handleToggle(todo) {
    const res = await fetch(`/api/todos/${todo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !todo.completed }),
    });
    if (res.ok) {
      const data = await res.json();
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? data.todo : t)));
    }
  }

  async function handleDelete(id) {
    const res = await fetch(`/api/todos/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setTodos((prev) => prev.filter((t) => t.id !== id));
    }
  }

  function startEdit(todo) {
    setEditingId(todo.id);
    setEditingText(todo.text);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingText('');
  }

  async function saveEdit(id) {
    const value = editingText.trim();
    if (!value) return;
    const res = await fetch(`/api/todos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: value }),
    });
    if (res.ok) {
      const data = await res.json();
      setTodos((prev) => prev.map((t) => (t.id === id ? data.todo : t)));
      cancelEdit();
    }
  }

  const remaining = todos.filter((t) => !t.completed).length;

  return (
    <main className="container">
      <h1>待办事项</h1>
      <p className="subtitle">一个简单的全栈待办事项应用</p>

      <form className="add-form" onSubmit={handleAdd}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="输入新的待办事项…"
          autoFocus
        />
        <button type="submit" disabled={!text.trim()}>
          添加
        </button>
      </form>

      <div className="meta">
        {loading ? (
          <span>加载中…</span>
        ) : error ? (
          <span className="error">{error}</span>
        ) : (
          <span>
            共 {todos.length} 项 · 未完成 {remaining} 项
          </span>
        )}
      </div>

      {!loading && error && (
        <button className="retry" onClick={loadTodos}>
          重新加载
        </button>
      )}

      {!loading && !error && todos.length === 0 && (
        <p className="empty">还没有待办事项，先添加一条吧。</p>
      )}

      <ul className="todo-list">
        {todos.map((todo) => (
          <li key={todo.id} className={`todo-item ${todo.completed ? 'done' : ''}`}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => handleToggle(todo)}
            />
            {editingId === todo.id ? (
              <div className="edit-row">
                <input
                  type="text"
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit(todo.id);
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  autoFocus
                />
                <button onClick={() => saveEdit(todo.id)}>保存</button>
                <button onClick={cancelEdit}>取消</button>
              </div>
            ) : (
              <>
                <span className="text" onDoubleClick={() => startEdit(todo)}>
                  {todo.text}
                </span>
                <div className="actions">
                  <button onClick={() => startEdit(todo)}>编辑</button>
                  <button className="danger" onClick={() => handleDelete(todo.id)}>
                    删除
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      <footer className="footer">
        <p>提示：双击待办文字可直接编辑</p>
      </footer>
    </main>
  );
}