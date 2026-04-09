import { AbstractComponent, componentsRegistryService, RxBucket } from 'cruzo';
import { todoService, type Filter, type Todo, type TodoBucket } from './todo.service';
import { TodoFooterComponent } from './todo-footer';

export class TodoAppComponent extends AbstractComponent {
    static selector = 'todo-app';
    dependencies = new Set([TodoFooterComponent.selector]);

    innerBucket = new RxBucket<TodoBucket>({
        todos: {},
        filter: {},
        nextId: {},
    });

    todos$ = this.newRx<Todo[]>([]);
    filtered$ = this.newRx<Todo[]>([]);
    filter$ = this.newRx<Filter>('all');
    hasItems$ = this.newRx(false);
    allCompleted$ = this.newRx(false);
    editingId$ = this.newRx<number | null>(null);
    editText$ = this.newRx('');
    todosBucket$ = this.newRxValueFromBucket(this.innerBucket, 'todos');
    filterBucket$ = this.newRxValueFromBucket(this.innerBucket, 'filter');

    connectedCallback(params?: any) {
        super.connectedCallback(params);
        this.#initBucket();
        this.newRxFunc(() => this.#syncState(), this.todosBucket$, this.filterBucket$);
        window.addEventListener('hashchange', () => {
            this.innerBucket.setValue('filter', todoService.filterFromHash());
        });
        this.#syncState();
    }

    onNewTodoKeydown(e: KeyboardEvent) {
        const input = e.target as HTMLInputElement;
        if (e.key === 'Enter' && input.value.trim()) {
            const todos = this.#todos();
            const nextId = this.#nextId();
            const updated = todoService.add(todos, nextId, input.value.trim());
            this.#setTodos(updated);
            this.innerBucket.setValue('nextId', nextId + 1);
            input.value = '';
        }
    }

    onToggleAll() {
        this.#setTodos(todoService.toggleAll(this.#todos()));
    }

    toggle(id: number) {
        this.#setTodos(todoService.toggle(this.#todos(), id));
    }

    remove(id: number) {
        this.#setTodos(todoService.remove(this.#todos(), id));
    }

    startEdit(id: number, text: string) {
        this.editingId$.update(id);
        this.editText$.update(text);
    }

    onEditInput(e: Event) {
        const input = e.target as HTMLInputElement;
        this.editText$.update(input.value);
    }

    onEditKeydown(id: number, e: KeyboardEvent) {
        if (e.key === 'Enter') {
            this.commitEdit(id);
        } else if (e.key === 'Escape') {
            this.cancelEdit();
        }
    }

    onEditBlur(id: number) {
        if (this.isEditing(id)) {
            this.commitEdit(id);
        }
    }

    isEditing(id: number) {
        return this.editingId$.actual === id;
    }

    itemClass(todo: Todo) {
        return `${todo.completed ? 'completed' : ''} ${this.isEditing(todo.id) ? 'editing' : ''}`.trim();
    }

    itemAttached(todo: Todo, filter: Filter) {
        if (filter === 'active') return !todo.completed;
        if (filter === 'completed') return todo.completed;
        return true;
    }

    editTextValue(id: number, fallback: string) {
        return this.isEditing(id) ? this.editText$.actual : fallback;
    }

    private commitEdit(id: number) {
        this.#setTodos(todoService.edit(this.#todos(), id, this.editText$.actual));
        this.cancelEdit();
    }

    private cancelEdit() {
        this.editingId$.update(null);
        this.editText$.update('');
    }

    #syncState() {
        const todos = this.#todos();
        const filter = this.#filter();
        this.todos$.update(todos);
        this.filtered$.update(todoService.filtered(todos, filter));
        this.filter$.update(filter);
        this.hasItems$.update(todos.length > 0);
        this.allCompleted$.update(todoService.allCompleted(todos));
        if (this.editingId$.actual !== null && !todos.some(todo => todo.id === this.editingId$.actual)) {
            this.cancelEdit();
        }
    }

    #initBucket() {
        const todos = todoService.loadTodos();
        this.innerBucket.setValue('todos', todos);
        this.innerBucket.setValue('filter', todoService.filterFromHash());
        this.innerBucket.setValue('nextId', todoService.nextId(todos));
    }

    #todos() {
        return (this.innerBucket.getValue('todos') as Todo[]) ?? [];
    }

    #nextId() {
        return (this.innerBucket.getValue('nextId') as number) ?? 1;
    }

    #filter() {
        return (this.innerBucket.getValue('filter') as TodoBucket['filter']) ?? 'all';
    }

    #setTodos(todos: Todo[]) {
        this.innerBucket.setValue('todos', todos);
        todoService.saveTodos(todos);
    }

    getHTML() {
        return `
            <section class="todoapp">
                <header class="header">
                    <h1>todos</h1>
                    <input class="new-todo" placeholder="What needs to be done?" autofocus
                           onkeydown="{{ root.onNewTodoKeydown(event) }}">
                </header>
                <section class="main" attached="{{ root.hasItems$::rx }}">
                    <input id="toggle-all" class="toggle-all" type="checkbox"
                           checked="{{ root.allCompleted$::rx }}"
                           onchange="{{ root.onToggleAll() }}">
                    <label for="toggle-all">Mark all as complete</label>
                    <ul class="todo-list">
                        <li repeat="{{ root.todos$::rx }}" let-todo="{{ this }}" attached="{{ root.itemAttached(todo, root.filter$::rx) }}" class="{{ root.itemClass(todo) }}">
                            <div class="view">
                                <input class="toggle" type="checkbox" checked="{{ todo.completed }}" onchange="{{ root.toggle(todo.id) }}">
                                <label ondblclick="{{ root.startEdit(todo.id, todo.text) }}">{{ todo.text }}</label>
                                <button class="destroy" onclick="{{ root.remove(todo.id) }}"></button>
                            </div>
                            <input class="edit"
                                   value="{{ root.editTextValue(todo.id, todo.text) }}"
                                   attached="{{ root.isEditing(todo.id) }}"
                                   oninput="{{ root.onEditInput(event) }}"
                                   onkeydown="{{ root.onEditKeydown(todo.id, event) }}"
                                   onblur="{{ root.onEditBlur(todo.id) }}">
                        </li>
                    </ul>
                </section>
                <todo-footer bucket-id="${this.innerBucket.id}"></todo-footer>
            </section>
        `;
    }
}

componentsRegistryService.define(TodoAppComponent);
