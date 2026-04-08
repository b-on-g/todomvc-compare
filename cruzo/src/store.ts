export interface Todo {
    id: number;
    text: string;
    completed: boolean;
}

export type Filter = 'all' | 'active' | 'completed';

let nextId = 0;

class TodoStore extends EventTarget {
    #todos: Todo[] = JSON.parse(localStorage.getItem('todos-cruzo') || '[]');
    #filter: Filter = this.#filterFromHash();

    constructor() {
        super();
        window.addEventListener('hashchange', () => {
            this.#filter = this.#filterFromHash();
            this.#notify();
        });
        nextId = this.#todos.reduce((max, t) => Math.max(max, t.id), 0) + 1;
    }

    get all() { return this.#todos; }
    get active() { return this.#todos.filter(t => !t.completed); }
    get completed() { return this.#todos.filter(t => t.completed); }
    get allCompleted() { return this.#todos.length > 0 && this.#todos.every(t => t.completed); }
    get filter() { return this.#filter; }

    filtered() {
        if (this.#filter === 'active') return this.active;
        if (this.#filter === 'completed') return this.completed;
        return this.all;
    }

    add(text: string) {
        this.#todos.push({ id: nextId++, text, completed: false });
        this.#save();
    }

    remove(id: number) {
        this.#todos = this.#todos.filter(t => t.id !== id);
        this.#save();
    }

    toggle(id: number) {
        const todo = this.#todos.find(t => t.id === id);
        if (todo) todo.completed = !todo.completed;
        this.#save();
    }

    edit(id: number, text: string) {
        const todo = this.#todos.find(t => t.id === id);
        if (todo) todo.text = text.trim();
        this.#save();
    }

    toggleAll() {
        const allDone = this.allCompleted;
        this.#todos.forEach(t => t.completed = !allDone);
        this.#save();
    }

    clearCompleted() {
        this.#todos = this.active;
        this.#save();
    }

    #save() {
        localStorage.setItem('todos-cruzo', JSON.stringify(this.#todos));
        this.#notify();
    }

    #notify() {
        this.dispatchEvent(new Event('change'));
    }

    #filterFromHash(): Filter {
        const match = /#\/(.+)/.exec(location.hash);
        const f = match?.[1];
        return (f === 'active' || f === 'completed') ? f : 'all';
    }
}

export const store = new TodoStore();
