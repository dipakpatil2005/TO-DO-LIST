const taskInput = document.getElementById('taskInput');
const addTaskBtn = document.getElementById('addTaskBtn');
const deadlineInput = document.getElementById('deadlineInput');
const listSelect = document.getElementById('listSelect');
const addBtn = document.getElementById('addBtn');
const taskForm = document.getElementById('taskForm');
const taskListView = document.getElementById('taskListView');
const nothingTodo = document.getElementById('nothingTodo');

const overdueList = document.querySelector('#overdueTasks .task-list');
const todayList = document.querySelector('#todayTasks .task-list');
const tomorrowList = document.querySelector('#tomorrowTasks .task-list');
const thisWeekList = document.querySelector('#thisWeekTasks .task-list');
const laterList = document.querySelector('#laterTasks .task-list');

const notificationPopup = document.getElementById('notificationPopup');
const notificationText = document.getElementById('notificationText');
const closeNotificationBtn = notificationPopup.querySelector('.close-btn');

const headerMain = document.querySelector('.header-main');
const headerSelect = document.querySelector('.header-select');
const backBtn = document.querySelector('.back-btn');
const taskCount = document.querySelector('.task-count');
const selectAllBtn = document.querySelector('.select-all-btn');
const shareBtn = document.querySelector('.share-btn');
const deleteSelectedBtn = document.querySelector('.delete-selected-btn');
const menuBtn = document.getElementById('menuBtn');
const sideMenu = document.getElementById('sideMenu');
const appContainer = document.querySelector('.app-container');
const menuAllLists = document.getElementById('menuAllLists');
const menuSettings = document.getElementById('menuSettings');
const settingsView = document.getElementById('settingsView');
const todayCountBadge = document.getElementById('todayCount');
const sortSelect = document.getElementById('sortSelect');

let notificationTimers = {};

// --- Core Functions ---

function saveTasks() {
    const allTasks = [];
    document.querySelectorAll('.task-item').forEach(item => {
        const task = {
            text: item.querySelector('.task-text').textContent,
            completed: item.querySelector('input[type="checkbox"]').checked,
            deadline: item.dataset.deadline || null,
            list: item.dataset.list || 'Personal'
        };
        allTasks.push(task);
    });
    localStorage.setItem('tasks', JSON.stringify(allTasks));
    displayTasks();
}

function loadTasks() {
    displayTasks();
    updateTodayCount();
}

function displayTasks() {
    [overdueList, todayList, tomorrowList, thisWeekList, laterList].forEach(list => list.innerHTML = '');
    const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);
    
    const startOfTomorrow = endOfToday;
    const endOfTomorrow = new Date(startOfTomorrow);
    endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);
    
    const endOfThisWeek = new Date(startOfToday);
    endOfThisWeek.setDate(endOfThisWeek.getDate() + (7 - startOfToday.getDay()));
    
    const sortOrder = sortSelect.value;
    
    if (sortOrder === 'due-date') {
        tasks.sort((a, b) => {
            const deadlineA = a.deadline ? new Date(a.deadline) : new Date(8640000000000000); // Max Date for null
            const deadlineB = b.deadline ? new Date(b.deadline) : new Date(8640000000000000); // Max Date for null
            return deadlineA - deadlineB;
        });
    } else if (sortOrder === 'alphabetical') {
        tasks.sort((a, b) => a.text.localeCompare(b.text));
    }


    tasks.forEach(task => {
        const deadline = task.deadline ? new Date(task.deadline) : null;
        const element = createTaskElement(task.text, task.list, task.deadline, task.completed);
        
        if (task.completed) {
            // Completed tasks will not be sorted into sections, they are only for reference in localStorage
            return;
        }

        if (!deadline) {
            laterList.appendChild(element);
        } else if (deadline < now) {
            overdueList.appendChild(element);
        } else if (deadline >= startOfToday && deadline < endOfToday) {
            todayList.appendChild(element);
        } else if (deadline >= startOfTomorrow && deadline < endOfTomorrow) {
            tomorrowList.appendChild(element);
        } else if (deadline >= endOfTomorrow && deadline <= endOfThisWeek) {
            thisWeekList.appendChild(element);
        } else {
            laterList.appendChild(element);
        }
    });
    updateNothingToDoMessage();
    updateTodayCount();
}

function updateNothingToDoMessage() {
    const totalPendingTasks = overdueList.children.length + todayList.children.length + tomorrowList.children.length + thisWeekList.children.length + laterList.children.length;
    if (totalPendingTasks === 0) {
        nothingTodo.style.display = 'block';
    } else {
        nothingTodo.style.display = 'none';
    }
}

function createTaskElement(text, list, deadline, completed = false) {
    const li = document.createElement('li');
    li.classList.add('task-item');
    if (completed) {
        li.classList.add('completed');
    }
    if (deadline && new Date(deadline) < new Date() && !completed) {
        li.classList.add('overdue');
    }
    li.dataset.deadline = deadline;
    li.dataset.list = list;
    
    let deadlineText = 'No deadline';
    if (deadline) {
        const deadlineDate = new Date(deadline);
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        deadlineText = new Date(deadline).toLocaleString('en-US', options);
    }

    li.innerHTML = `
        <input type="checkbox" class="task-checkbox" ${completed ? 'checked' : ''}>
        <div class="task-content">
            <span class="task-text">${text}</span>
            <span class="task-details">${list} | ${deadlineText}</span>
        </div>
        <div class="task-actions">
            <button class="edit-btn" title="Edit">&#9998;</button>
            <button class="delete-btn" title="Delete">&#10006;</button>
        </div>
    `;
    
    setupEventListeners(li);
    
    if (deadline && !completed) {
        setDeadlineNotification(li, text, deadline);
    }
    return li;
}

function setupEventListeners(item) {
    const checkbox = item.querySelector('.task-checkbox');
    const editBtn = item.querySelector('.edit-btn');
    const deleteBtn = item.querySelector('.delete-btn');
    
    checkbox.addEventListener('change', (event) => {
        event.stopPropagation(); // Prevents the list item click event from firing
        item.classList.toggle('completed');
        updateSelectedCount();
        saveTasks();
        if (item.classList.contains('completed')) {
            if (notificationTimers[item.dataset.deadline]) {
                clearTimeout(notificationTimers[item.dataset.deadline]);
                delete notificationTimers[item.dataset.deadline];
            }
        }
    });

    item.addEventListener('click', () => {
        item.classList.toggle('selected');
        updateSelectedCount();
    });

    editBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        const newText = prompt('Edit your task:', item.querySelector('.task-text').textContent);
        if (newText !== null && newText.trim() !== '') {
            item.querySelector('.task-text').textContent = newText;
            saveTasks();
        }
    });

    deleteBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        if (notificationTimers[item.dataset.deadline]) {
            clearTimeout(notificationTimers[item.dataset.deadline]);
            delete notificationTimers[item.dataset.deadline];
        }
        item.remove();
        updateSelectedCount();
        saveTasks();
    });
}

function setDeadlineNotification(taskItem, taskText, deadline) {
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const timeDiff = deadlineDate.getTime() - now.getTime();
    const tenMinutesInMs = 10 * 60 * 1000;

    if (timeDiff > 0) {
        const timeout = Math.max(0, timeDiff - tenMinutesInMs);
        notificationTimers[deadline] = setTimeout(() => {
            showNotification(taskText);
        }, timeout);
    }
}

function showNotification(taskText) {
    notificationText.textContent = `Your task "${taskText}" is due in less than 10 minutes!`;
    notificationPopup.classList.add('show');
    setTimeout(() => {
        notificationPopup.classList.remove('show');
    }, 5000);
}

function updateSelectedCount() {
    const selectedCount = document.querySelectorAll('.task-item.selected').length;
    if (selectedCount > 0) {
        headerMain.style.display = 'none';
        headerSelect.style.display = 'flex';
        taskCount.textContent = selectedCount;
    } else {
        headerMain.style.display = 'flex';
        headerSelect.style.display = 'none';
    }
}

function clearAllSelections() {
    document.querySelectorAll('.task-item.selected').forEach(item => {
        item.classList.remove('selected');
    });
    updateSelectedCount();
}

function updateTodayCount() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);

    const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    const todayTasks = tasks.filter(task => {
        if (!task.deadline || task.completed) return false;
        const deadlineDate = new Date(task.deadline);
        return deadlineDate >= startOfToday && deadlineDate < endOfToday;
    });
    todayCountBadge.textContent = todayTasks.length;
    if (todayTasks.length > 0) {
        todayCountBadge.style.display = 'block';
    } else {
        todayCountBadge.style.display = 'none';
    }
}

// --- Event Handlers ---

addTaskBtn.addEventListener('click', () => {
    const text = taskInput.value.trim();
    if (text === '') {
        return;
    }
    const deadline = deadlineInput.value || null;
    const list = listSelect.value;
    
    // Create a temporary task object to save
    const newTask = {
        text: text,
        completed: false,
        deadline: deadline,
        list: list
    };
    
    // Get current tasks from localStorage
    const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    tasks.push(newTask);
    localStorage.setItem('tasks', JSON.stringify(tasks));

    // Reset form fields
    taskInput.value = '';
    deadlineInput.value = '';
    taskInput.focus();
    
    // Re-render the task list
    displayTasks();
    toggleTaskForm();
});

addBtn.addEventListener('click', () => {
    if (settingsView.style.display === 'block') {
        settingsView.style.display = 'none';
        taskListView.style.display = 'block';
        toggleTaskForm();
    } else {
        toggleTaskForm();
    }
});

menuBtn.addEventListener('click', () => {
    sideMenu.classList.toggle('open');
    appContainer.classList.toggle('menu-open');
});

menuAllLists.addEventListener('click', () => {
    taskListView.style.display = 'block';
    settingsView.style.display = 'none';
    taskForm.style.display = 'none';
    addBtn.textContent = '+';
    sideMenu.classList.remove('open');
    appContainer.classList.remove('menu-open');
    displayTasks();
});

menuSettings.addEventListener('click', () => {
    taskListView.style.display = 'none';
    taskForm.style.display = 'none';
    settingsView.style.display = 'block';
    addBtn.textContent = 'x';
    sideMenu.classList.remove('open');
    appContainer.classList.remove('menu-open');
});

function toggleTaskForm() {
    if (taskForm.style.display === 'none' || taskForm.style.display === '') {
        taskForm.style.display = 'block';
        taskListView.style.display = 'none';
        addBtn.textContent = 'x';
    } else {
        taskForm.style.display = 'none';
        taskListView.style.display = 'block';
        addBtn.textContent = '+';
    }
}

backBtn.addEventListener('click', () => {
    clearAllSelections();
});

selectAllBtn.addEventListener('click', () => {
    document.querySelectorAll('.task-item:not(.completed)').forEach(item => {
        item.classList.add('selected');
    });
    updateSelectedCount();
});

shareBtn.addEventListener('click', () => {
    const selectedTasks = Array.from(document.querySelectorAll('.task-item.selected'));
    if (selectedTasks.length > 0) {
        const taskText = selectedTasks.map(item => item.querySelector('.task-text').textContent).join('\n');
        // Use a simple prompt for demonstration
        prompt("Share your tasks (Copy and Paste):", taskText);
    }
});

deleteSelectedBtn.addEventListener('click', () => {
    document.querySelectorAll('.task-item.selected').forEach(item => {
        if (notificationTimers[item.dataset.deadline]) {
            clearTimeout(notificationTimers[item.dataset.deadline]);
            delete notificationTimers[item.dataset.deadline];
        }
        item.remove();
    });
    saveTasks();
    updateSelectedCount();
});

closeNotificationBtn.addEventListener('click', () => {
    notificationPopup.classList.remove('show');
});

sortSelect.addEventListener('change', () => {
    displayTasks();
});


// Initial load
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
});
