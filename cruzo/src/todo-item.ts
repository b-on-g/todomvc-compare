import { AbstractComponent, componentsRegistryService } from 'cruzo';
import { store } from './store';

export class TodoItemComponent extends AbstractComponent {
    static selector = 'todo-item';

    todoId$ = this.newRx<number>(0);
    text$ = this.newRx('');
    completed$ = this.newRx(false);
    editing$ = this.newRx(false);

    connectedCallback(params?: any) {
        super.connectedCallback(params);

        this.completed$.setPostUpdate(() => {
            this.node.classList.toggle('completed', this.completed$.actual);
            const toggle = this.node.querySelector<HTMLInputElement>('.toggle');
            if (toggle) toggle.checked = this.completed$.actual;
        });

        this.editing$.setPostUpdate(() => {
            this.node.classList.toggle('editing', this.editing$.actual);
            if (this.editing$.actual) {
                requestAnimationFrame(() => {
                    const input = this.node.querySelector<HTMLInputElement>('.edit');
                    if (input) {
                        input.value = this.text$.actual;
                        input.focus();
                    }
                });
            }
        });
    }

    toggle() {
        store.toggle(this.todoId$.actual);
    }

    remove() {
        store.remove(this.todoId$.actual);
    }

    startEdit() {
        this.editing$.update(true);
    }

    onEditKeydown(e: KeyboardEvent) {
        if (e.key === 'Enter') {
            this.#commitEdit(e.target as HTMLInputElement);
        } else if (e.key === 'Escape') {
            this.editing$.update(false);
        }
    }

    onEditBlur(e: FocusEvent) {
        if (this.editing$.actual) {
            this.#commitEdit(e.target as HTMLInputElement);
        }
    }

    #commitEdit(input: HTMLInputElement) {
        const text = input.value.trim();
        if (text) {
            store.edit(this.todoId$.actual, text);
        } else {
            store.remove(this.todoId$.actual);
        }
        this.editing$.update(false);
    }

    getHTML() {
        return `
            <div class="view">
                <input class="toggle" type="checkbox" onchange="{{ root.toggle() }}">
                <label ondblclick="{{ root.startEdit() }}">{{ root.text$::rx }}</label>
                <button class="destroy" onclick="{{ root.remove() }}"></button>
            </div>
            <input class="edit"
                   onkeydown="{{ root.onEditKeydown(event) }}"
                   onblur="{{ root.onEditBlur(event) }}">
        `;
    }
}

componentsRegistryService.define(TodoItemComponent);
