import { LitElement, html } from "lit";
import { customElement } from "lit/decorators/custom-element.js";
import { property } from "lit/decorators/property.js";
import { state } from "lit/decorators/state.js";
import { classMap } from "lit/directives/class-map.js";

import { todoStyles, todoItemStyles } from "./todo.css.js";
import { DeleteTodoEvent, EditTodoEvent } from "./events.js";

@customElement("todo-item")
export class TodoItem extends LitElement {
    static override styles = [todoStyles, todoItemStyles];

    @property()
        todoId = "";

    @property()
        text = "";

    @property({ type: Boolean })
        completed = false;

    @state()
        isEditing: boolean = false;

    override render() {
        const itemClassList = {
            todo: true,
            completed: this.completed ?? false,
            editing: this.isEditing,
        };

        return html`
            <li class="${classMap(itemClassList)}">
                <div class="view">
                    <input class="toggle" type="checkbox" .checked=${this.completed ?? false} @change=${this.#toggleTodo} />
                    <label @dblclick=${this.#beginEdit}> ${this.text} </label>
                    <button @click=${this.#deleteTodo} class="destroy"></button>
                </div>
                <input class="edit" type="text" @change=${this.#finishEdit} @keyup=${this.#captureEscape} @blur=${this.#abortEdit} .value=${this.text ?? ""} />
            </li>
        `;
    }

    #toggleTodo() {
        this.dispatchEvent(new EditTodoEvent({ id: this.todoId, completed: !this.completed }));
    }

    #deleteTodo() {
        this.dispatchEvent(new DeleteTodoEvent(this.todoId));
    }

    #beginEdit() {
        this.isEditing = true;
    }

    #finishEdit(e: Event) {
        const el = e.target as HTMLInputElement;
        this.dispatchEvent(new EditTodoEvent({ id: this.todoId, text: el.value }));
        this.isEditing = false;
    }

    #captureEscape(e: KeyboardEvent) {
        if (e.key === "Escape")
            this.#abortEdit(e);
    }

    #abortEdit(e: Event) {
        const input = e.target as HTMLInputElement;
        input.value = this.text ?? "";
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "todo-item": TodoItem;
    }
}
