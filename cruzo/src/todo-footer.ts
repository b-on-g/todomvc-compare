import { AbstractComponent, componentsRegistryService, type RxBucket } from 'cruzo';
import { todoService, type Filter, type Todo, type TodoBucket } from './todo.service';

export class TodoFooterComponent extends AbstractComponent {
    static selector = 'todo-footer';

    activeCount$ = this.newRx(0);
    hasCompleted$ = this.newRx(false);
    hasItems$ = this.newRx(false);
    filterAll$ = this.newRx('');
    filterActive$ = this.newRx('');
    filterCompleted$ = this.newRx('');
    todosBucket$: any;
    filterBucket$: any;

    connectedCallback(params?: any) {
        super.connectedCallback(params);
        const bucket = this.outerBucket as RxBucket<TodoBucket>;
        this.todosBucket$ = this.newRxValueFromBucket(bucket, 'todos');
        this.filterBucket$ = this.newRxValueFromBucket(bucket, 'filter');

        this.newRxFunc(() => this.#update(), this.todosBucket$, this.filterBucket$);
        this.#update();
    }

    #update() {
        const todos = this.#todos();
        const filter = this.#filter();
        this.activeCount$.update(todoService.active(todos).length);
        this.hasCompleted$.update(todoService.completed(todos).length > 0);
        this.hasItems$.update(todos.length > 0);
        this.filterAll$.update(filter === 'all' ? 'selected' : '');
        this.filterActive$.update(filter === 'active' ? 'selected' : '');
        this.filterCompleted$.update(filter === 'completed' ? 'selected' : '');
    }

    clearCompleted() {
        const todos = todoService.clearCompleted(this.#todos());
        this.#setTodos(todos);
    }

    applyFilter(filter: Filter, event: Event) {
        event.preventDefault();
        this.outerBucket.setValue('filter', filter);
        const hash = filter === 'all' ? '#/' : `#/${filter}`;
        if (location.hash !== hash) {
            location.hash = hash;
        }
    }

    #todos() {
        return (this.outerBucket.getValue('todos') as Todo[]) ?? [];
    }

    #filter() {
        return (this.outerBucket.getValue('filter') as Filter) ?? 'all';
    }

    #setTodos(todos: Todo[]) {
        this.outerBucket.setValue('todos', todos);
        todoService.saveTodos(todos);
    }

    getHTML() {
        return `<footer class="footer" attached="{{ root.hasItems$::rx }}">
            <span class="todo-count">
              <strong>{{ root.activeCount$::rx }}</strong> items left
            </span>
            <ul class="filters">
              <li><a href="#/" class="{{ root.filterAll$::rx }}" onclick="{{ root.applyFilter('all', event) }}">All</a></li>
              <li><a href="#/active" class="{{ root.filterActive$::rx }}" onclick="{{ root.applyFilter('active', event) }}">Active</a></li>
              <li><a href="#/completed" class="{{ root.filterCompleted$::rx }}" onclick="{{ root.applyFilter('completed', event) }}">Completed</a></li>
            </ul>
            <button class="clear-completed" attached="{{ root.hasCompleted$::rx }}" onclick="{{ root.clearCompleted() }}">Clear completed</button>
          </footer>`;
    }
}

componentsRegistryService.define(TodoFooterComponent);
