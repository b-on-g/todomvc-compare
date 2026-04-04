import { LitElement, html } from "lit";
import { customElement } from "lit/decorators/custom-element.js";
import { property } from "lit/decorators/property.js";
import { query } from "lit/decorators/query.js";

import { todoStyles, todoFormStyles } from "./todo.css.js";
import { type Todos } from "./todos.js";
import { AddTodoEvent } from "./events.js";
import { updateOnEvent } from "./utils.js";

@customElement("todo-form")
export class TodoForm extends LitElement {
    static override styles = [todoStyles, todoFormStyles];

    @updateOnEvent("change")
    @property({ attribute: false })
        todoList?: Todos;

    override render() {
        return html`<input @keydown=${this.#onKeydown} class="new-todo" autofocus autocomplete="off" placeholder="What needs to be done?" />`;
    }

    @query("input", true) newTodoInput!: HTMLInputElement;

    #submit() {
        const { value } = this.newTodoInput;
        if (value.length > 0)
            this.dispatchEvent(new AddTodoEvent(value));
        this.newTodoInput.value = "";
    }

    #onKeydown(e: KeyboardEvent) {
        if (e.key === "Enter")
            this.#submit();
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "todo-form": TodoForm;
    }
}
