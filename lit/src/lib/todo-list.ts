import { LitElement, html, nothing } from "lit";
import { customElement } from "lit/decorators/custom-element.js";
import { property } from "lit/decorators/property.js";
import { repeat } from "lit/directives/repeat.js";

import { todoStyles, todoListStyles } from "./todo.css.js";
import { type Todos } from "./todos.js";

import "./todo-item.js";
import { ToggleAllTodoEvent } from "./events.js";
import { updateOnEvent } from "./utils.js";

@customElement("todo-list")
export class TodoList extends LitElement {
    static override styles = [todoStyles, todoListStyles];

    @updateOnEvent("change")
    @property({ attribute: false })
        todoList?: Todos;

    override render() {
        return html`
            ${(this.todoList?.all.length ?? 0) > 0
                ? html`
                    <input @change=${this.#onToggleAllChange} id="toggle-all" type="checkbox" class="toggle-all" .checked=${this.todoList?.allCompleted ?? false} />
                    <label for="toggle-all">Mark all as complete</label>
                `
                : nothing}
            <ul class="todo-list">
                ${repeat(
                    this.todoList?.filtered() ?? [],
                    (todo) => todo.id,
                    (todo) => html`<todo-item .todoId=${todo.id} .text=${todo.text} .completed=${todo.completed}></todo-item>`
                )}
            </ul>
        `;
    }

    #onToggleAllChange() {
        this.dispatchEvent(new ToggleAllTodoEvent());
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "todo-list": TodoList;
    }
}
