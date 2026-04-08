import { AbstractComponent, componentsRegistryService } from 'cruzo';
import { store } from './store';
import { TodoItemComponent } from './todo-item';
import { TodoFooterComponent } from './todo-footer';

export class TodoAppComponent extends AbstractComponent {
    static selector = 'todo-app';
    dependencies = new Set([TodoFooterComponent.selector]);

    private itemMap = new Map<number, TodoItemComponent>();

    connectedCallback(params?: any) {
        super.connectedCallback(params);
        this.connectedDependencies ??= [];
        this.#renderList();
        store.addEventListener('change', () => this.#renderList());
    }

    onNewTodoKeydown(e: KeyboardEvent) {
        const input = e.target as HTMLInputElement;
        if (e.key === 'Enter' && input.value.trim()) {
            store.add(input.value.trim());
            input.value = '';
        }
    }

    onToggleAll() {
        store.toggleAll();
    }

    #renderList() {
        const filtered = store.filtered();
        const hasItems = store.all.length > 0;

        const mainSection = this.node.querySelector<HTMLElement>('.main');
        if (mainSection) mainSection.hidden = !hasItems;

        const toggleAll = this.node.querySelector<HTMLInputElement>('#toggle-all');
        if (toggleAll) toggleAll.checked = store.allCompleted;

        const list = this.node.querySelector<HTMLElement>('.todo-list');
        if (!list) return;

        const existingMap = new Map(this.itemMap);
        const newTodos: { id: number; text: string; completed: boolean; el: HTMLElement }[] = [];

        // Build ordered DOM
        const fragment = document.createDocumentFragment();
        for (const todo of filtered) {
            const comp = existingMap.get(todo.id);
            if (comp) {
                comp.text$.update(todo.text);
                comp.completed$.update(todo.completed);
                existingMap.delete(todo.id);
                fragment.appendChild(comp.node);
            } else {
                const el = document.createElement('todo-item');
                el.setAttribute('data-todo-id', String(todo.id));
                fragment.appendChild(el);
                newTodos.push({ ...todo, el });
            }
        }

        // Remove items no longer displayed
        for (const [id, comp] of existingMap) {
            const idx = this.connectedDependencies.indexOf(comp as any);
            if (idx >= 0) this.connectedDependencies.splice(idx, 1);
            componentsRegistryService.removeComponents([comp as any], true);
            this.itemMap.delete(id);
        }

        list.textContent = '';
        list.appendChild(fragment);

        // Connect new elements (now in the DOM)
        if (newTodos.length > 0) {
            const created = componentsRegistryService.connectBySelector(
                TodoItemComponent.selector,
                this.connectedDependencies,
                list,
            );
            for (const comp of created) {
                const todoId = Number(comp.node.getAttribute('data-todo-id'));
                const todo = newTodos.find(t => t.id === todoId);
                if (todo) {
                    (comp as TodoItemComponent).todoId$.update(todo.id);
                    (comp as TodoItemComponent).text$.update(todo.text);
                    (comp as TodoItemComponent).completed$.update(todo.completed);
                    this.itemMap.set(todo.id, comp as TodoItemComponent);
                }
            }
        }
    }

    getHTML() {
        return `
            <section class="todoapp">
                <header class="header">
                    <h1>todos</h1>
                    <input class="new-todo" placeholder="What needs to be done?" autofocus
                           onkeydown="{{ root.onNewTodoKeydown(event) }}">
                </header>
                <section class="main" hidden>
                    <input id="toggle-all" class="toggle-all" type="checkbox"
                           onchange="{{ root.onToggleAll() }}">
                    <label for="toggle-all">Mark all as complete</label>
                    <ul class="todo-list"></ul>
                </section>
                <todo-footer></todo-footer>
            </section>
        `;
    }
}

componentsRegistryService.define(TodoAppComponent);
