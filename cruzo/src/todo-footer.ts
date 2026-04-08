import { AbstractComponent, componentsRegistryService } from 'cruzo';
import { store } from './store';

export class TodoFooterComponent extends AbstractComponent {
    static selector = 'todo-footer';

    activeCount$ = this.newRx(0);
    hasCompleted$ = this.newRx(false);
    filterAll$ = this.newRx('');
    filterActive$ = this.newRx('');
    filterCompleted$ = this.newRx('');

    connectedCallback(params?: any) {
        super.connectedCallback(params);
        this.#update();
        store.addEventListener('change', () => this.#update());
    }

    #update() {
        const filter = store.filter;
        this.activeCount$.update(store.active.length);
        this.hasCompleted$.update(store.completed.length > 0);
        this.filterAll$.update(filter === 'all' ? 'selected' : '');
        this.filterActive$.update(filter === 'active' ? 'selected' : '');
        this.filterCompleted$.update(filter === 'completed' ? 'selected' : '');
        this.node.hidden = store.all.length === 0;

        const clearBtn = this.node.querySelector<HTMLElement>('.clear-completed');
        if (clearBtn) clearBtn.hidden = !this.hasCompleted$.actual;
    }

    clearCompleted() {
        store.clearCompleted();
    }

    getHTML() {
        return `
            <span class="todo-count">
                <strong>{{ root.activeCount$::rx }}</strong> items left
            </span>
            <ul class="filters">
                <li><a href="#/" class="{{ root.filterAll$::rx }}">All</a></li>
                <li><a href="#/active" class="{{ root.filterActive$::rx }}">Active</a></li>
                <li><a href="#/completed" class="{{ root.filterCompleted$::rx }}">Completed</a></li>
            </ul>
            <button class="clear-completed" onclick="{{ root.clearCompleted() }}">Clear completed</button>
        `;
    }
}

componentsRegistryService.define(TodoFooterComponent);
