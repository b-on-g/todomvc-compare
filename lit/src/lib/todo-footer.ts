import { LitElement, html, nothing } from "lit";
import { customElement } from "lit/decorators/custom-element.js";
import { property } from "lit/decorators/property.js";
import { classMap } from "lit/directives/class-map.js";

import { todoStyles, todoFooterStyles } from "./todo.css.js";
import { type Todos } from "./todos.js";
import { updateOnEvent } from "./utils.js";
import { ClearCompletedEvent } from "./events.js";

@customElement("todo-footer")
export class TodoFooter extends LitElement {
    static override styles = [todoStyles, todoFooterStyles];

    @updateOnEvent("change")
    @property({ attribute: false })
        todoList?: Todos;

    override render() {
        if (this.todoList === undefined || this.todoList.all.length === 0)
            return nothing;

        const allFilter = filterLink({ text: "All", filter: "all", selectedFilter: this.todoList?.filter });
        const activeFilter = filterLink({ text: "Active", filter: "active", selectedFilter: this.todoList?.filter });
        const completedFilter = filterLink({ text: "Completed", filter: "completed", selectedFilter: this.todoList?.filter });

        return html`
            <span class="todo-count">
                <strong>${this.todoList?.active.length}</strong>
                items left
            </span>
            <ul class="filters">
                <li>${allFilter}</li>
                <li>${activeFilter}</li>
                <li>${completedFilter}</li>
            </ul>
            ${(this.todoList?.completed.length ?? 0) > 0
                ? html`<button @click=${this.#onClearCompletedClick} class="clear-completed">Clear Completed</button>`
                : nothing}
        `;
    }

    #onClearCompletedClick() {
        this.dispatchEvent(new ClearCompletedEvent());
    }
}

function filterLink({ text, filter, selectedFilter }: { text: string; filter: string; selectedFilter: string | undefined }) {
    return html`<a class="${classMap({ selected: filter === selectedFilter })}" href="#/${filter}">${text}</a>`;
}

declare global {
    interface HTMLElementTagNameMap {
        "todo-footer": TodoFooter;
    }
}
