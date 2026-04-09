export interface Todo {
    id: number;
    text: string;
    completed: boolean;
}

export type Filter = 'all' | 'active' | 'completed';

export type TodoBucket = {
    todos: Todo[];
    filter: Filter;
    nextId: number;
};

const STORAGE_KEY = 'todos-cruzo';

export const todoService = {
    loadTodos(): Todo[] {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? (JSON.parse(raw) as Todo[]) : [];
        } catch {
            return [];
        }
    },

    saveTodos(todos: Todo[]) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    },

    filterFromHash(hash = location.hash): Filter {
        const match = /#\/(.+)/.exec(hash);
        const value = match?.[1];
        return (value === 'active' || value === 'completed') ? value : 'all';
    },

    nextId(todos: Todo[]) {
        return todos.reduce((max, todo) => Math.max(max, todo.id), 0) + 1;
    },

    active(todos: Todo[]) {
        return todos.filter(todo => !todo.completed);
    },

    completed(todos: Todo[]) {
        return todos.filter(todo => todo.completed);
    },

    allCompleted(todos: Todo[]) {
        return todos.length > 0 && todos.every(todo => todo.completed);
    },

    filtered(todos: Todo[], filter: Filter) {
        if (filter === 'active') return this.active(todos);
        if (filter === 'completed') return this.completed(todos);
        return todos;
    },

    add(todos: Todo[], nextId: number, text: string) {
        return [...todos, { id: nextId, text, completed: false }];
    },

    remove(todos: Todo[], id: number) {
        return todos.filter(todo => todo.id !== id);
    },

    toggle(todos: Todo[], id: number) {
        return todos.map(todo => (todo.id === id ? { ...todo, completed: !todo.completed } : todo));
    },

    edit(todos: Todo[], id: number, text: string) {
        const trimmed = text.trim();
        if (!trimmed) return this.remove(todos, id);
        return todos.map(todo => (todo.id === id ? { ...todo, text: trimmed } : todo));
    },

    toggleAll(todos: Todo[]) {
        const shouldComplete = !this.allCompleted(todos);
        return todos.map(todo => ({ ...todo, completed: shouldComplete }));
    },

    clearCompleted(todos: Todo[]) {
        return this.active(todos);
    },
};
