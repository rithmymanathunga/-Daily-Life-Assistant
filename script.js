// ==========================================
// DAILY LIFE ASSISTANT
// ==========================================

// ----- STORAGE HELPERS -----

function getData(key, defaultValue) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
        console.error("Storage Error:", error);
        return defaultValue;
    }
}

function saveData(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error("Unable to save data:", error);
    }
}

function getTodayKey() {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function createId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getDaysBetween(firstDate, secondDate) {
    if (!firstDate || !secondDate) return Infinity;

    const [y1, m1, d1] = firstDate.split("-").map(Number);
    const [y2, m2, d2] = secondDate.split("-").map(Number);

    const date1 = new Date(y1, m1 - 1, d1);
    const date2 = new Date(y2, m2 - 1, d2);

    return Math.round((date2 - date1) / 86400000);
}


// ==========================================
// INITIALIZATION
// ==========================================

function initializeApp() {
    loadTasks();
    loadStreak();
    loadMood();
    updateDisplay();
    updateBadge();
    showDailyTip();
    updateChart();

    // Enter key adds a new task
    document.getElementById("taskInput").addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            addTask();
        }
    });

    // Update habit information when selection changes
    document.getElementById("habitSelect").addEventListener("change", () => {
        loadStreak();
        updateBadge();
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeApp);
} else {
    initializeApp();
}


// ==========================================
// TASK MANAGEMENT
// ==========================================

const taskMessages = [
    "Great job! 🎉 Keep it up!",
    "Another step forward! 💪",
    "Tasks done, feeling awesome! 😎",
    "You're on fire today! 🔥",
    "Small wins lead to big victories! 🏆"
];

function getTasks() {
    const savedTasks = getData("tasks", []);

    if (!Array.isArray(savedTasks)) return [];

    // Support tasks saved by the previous version
    const tasks = savedTasks.map((task, index) => {
        if (typeof task === "string") {
            return {
                id: `old-${index}-${createId()}`,
                text: task
            };
        }

        if (task && typeof task === "object") {
            return {
                id: task.id || createId(),
                text: String(task.text || "")
            };
        }

        return null;
    }).filter(task => task && task.text.trim());

    saveData("tasks", tasks);

    return tasks;
}

function addTask() {
    const input = document.getElementById("taskInput");
    const taskText = input.value.trim();

    if (!taskText) {
        alert("Please enter a task!");
        input.focus();
        return;
    }

    if (taskText.length > 100) {
        alert("Task must contain no more than 100 characters.");
        return;
    }

    const tasks = getTasks();

    tasks.push({
        id: createId(),
        text: taskText
    });

    saveData("tasks", tasks);

    input.value = "";

    loadTasks();

    document.getElementById("taskMessage").textContent =
        "Your new task has been added! ✅";
}

function loadTasks() {
    const tasks = getTasks();
    const list = document.getElementById("taskList");

    list.innerHTML = "";

    tasks.forEach(task => {
        const li = document.createElement("li");
        li.className = "task-item";

        const taskText = document.createElement("span");
        taskText.textContent = task.text;

        const completeButton = document.createElement("button");
        completeButton.textContent = "Done ✓";
        completeButton.type = "button";

        completeButton.addEventListener("click", () => {
            completeTask(task.id);
        });

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.type = "button";

        deleteButton.addEventListener("click", () => {
            deleteTask(task.id);
        });

        li.appendChild(taskText);
        li.appendChild(completeButton);
        li.appendChild(deleteButton);

        list.appendChild(li);
    });
}

function completeTask(taskId) {
    const tasks = getTasks();

    const updatedTasks = tasks.filter(task => task.id !== taskId);

    if (updatedTasks.length === tasks.length) return;

    saveData("tasks", updatedTasks);

    incrementDailyActivity("tasksCompleted");

    loadTasks();

    showTaskMessage();
}

function deleteTask(taskId) {
    const tasks = getTasks();

    const updatedTasks = tasks.filter(task => task.id !== taskId);

    saveData("tasks", updatedTasks);

    loadTasks();

    document.getElementById("taskMessage").textContent =
        "Task deleted successfully.";
}

function showTaskMessage() {
    const message = taskMessages[
        Math.floor(Math.random() * taskMessages.length)
    ];

    document.getElementById("taskMessage").textContent = message;
}


// ==========================================
// HABIT TRACKER
// ==========================================

const habitMessages = [
    "Awesome! Habit completed! 🎯",
    "You're building a great habit! 💪",
    "Consistency is key! 🔑",
    "Keep shining! ✨",
    "Way to go! 🌟"
];

function increaseStreak() {
    const selectedHabit = document.getElementById("habitSelect").value;
    const today = getTodayKey();

    const habitStates = getData("habitStates", {});

    const state = habitStates[selectedHabit] || {
        streak: 0,
        lastCompletedDate: null
    };

    // Prevent completing the same habit more than once per day
    if (state.lastCompletedDate === today) {
        document.getElementById("habitDone").textContent =
            "You've already completed this habit today! ✅";
        return;
    }

    const daysDifference = getDaysBetween(
        state.lastCompletedDate,
        today
    );

    // Continue streak only on consecutive days
    if (daysDifference === 1) {
        state.streak++;
    } else {
        state.streak = 1;
    }

    state.lastCompletedDate = today;

    habitStates[selectedHabit] = state;

    saveData("habitStates", habitStates);

    localStorage.setItem("lastHabit", selectedHabit);

    loadStreak();
    updateBadge();

    showHabitMessage();

    incrementDailyActivity("habitsCompleted");
}

function loadStreak() {
    const selectedHabit = document.getElementById("habitSelect").value;

    const habitStates = getData("habitStates", {});

    const state = habitStates[selectedHabit] || {
        streak: 0,
        lastCompletedDate: null
    };

    const daysDifference = getDaysBetween(
        state.lastCompletedDate,
        getTodayKey()
    );

    const currentStreak = daysDifference <= 1
        ? state.streak
        : 0;

    document.getElementById("streak").textContent = currentStreak;

    if (state.lastCompletedDate) {
        document.getElementById("habitDone").textContent =
            `Last completed: ${selectedHabit}`;
    } else {
        document.getElementById("habitDone").textContent =
            "Start building your habit today!";
    }
}

function showHabitMessage() {
    const message = habitMessages[
        Math.floor(Math.random() * habitMessages.length)
    ];

    document.getElementById("habitDone").textContent = message;
}


// ==========================================
// ACHIEVEMENT BADGES
// ==========================================

function updateBadge() {
    const streak = Number(
        document.getElementById("streak").textContent
    ) || 0;

    let badge = "🏅 Keep going!";

    if (streak >= 5) {
        badge = "🎖 Silver Streak!";
    }

    if (streak >= 10) {
        badge = "🏆 Gold Streak!";
    }

    if (streak >= 20) {
        badge = "💎 Diamond Streak!";
    }

    document.getElementById("badge").textContent = badge;
}


// ==========================================
// MOOD TRACKER
// ==========================================

function setMood(mood) {
    const moodHistory = getData("moodHistory", {});

    moodHistory[getTodayKey()] = mood;

    saveData("moodHistory", moodHistory);

    loadMood();
}

function loadMood() {
    const moodHistory = getData("moodHistory", {});

    const mood = moodHistory[getTodayKey()] || "Not set";

    let emoji = "😐";

    if (mood === "Happy") {
        emoji = "😄";
    }

    if (mood === "Normal") {
        emoji = "😌";
    }

    if (mood === "Sad") {
        emoji = "😔";
    }

    document.getElementById("moodResult").textContent =
        `Today's Mood: ${mood} ${emoji}`;
}


// ==========================================
// FOCUS TIMER
// ==========================================

const FOCUS_DURATION = 25 * 60;

let timeLeft = FOCUS_DURATION;
let timerInterval = null;

function updateDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    document.getElementById("time").textContent =
        `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function startTimer() {
    if (timerInterval !== null) return;

    if (timeLeft <= 0) {
        alert("Your session is complete! Press Reset to start again.");
        return;
    }

    document.getElementById("time").classList.add("running");

    timerInterval = setInterval(() => {

        if (timeLeft > 0) {
            timeLeft--;
            updateDisplay();
        }

        if (timeLeft === 0) {
            completeTimer();
        }

    }, 1000);
}

function completeTimer() {
    clearInterval(timerInterval);
    timerInterval = null;

    document.getElementById("time").classList.remove("running");

    updateDisplay();

    incrementDailyActivity("timerSessions");

    alert("🎉 Time's up! Great job focusing!");
}

function pauseTimer() {
    clearInterval(timerInterval);

    timerInterval = null;

    document.getElementById("time").classList.remove("running");
}

function resetTimer() {
    clearInterval(timerInterval);

    timerInterval = null;

    timeLeft = FOCUS_DURATION;

    document.getElementById("time").classList.remove("running");

    updateDisplay();
}


// ==========================================
// BOTTOM NAVIGATION
// ==========================================

function scrollToSection(id) {
    const section = document.getElementById(id);

    if (section) {
        section.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
}


// ==========================================
// DAILY ACTIVITY DATA
// ==========================================

function getDailyActivity() {
    return getData("dailyActivity", {});
}

function incrementDailyActivity(activityType) {
    const activity = getDailyActivity();

    const today = getTodayKey();

    if (!activity[today]) {
        activity[today] = {
            tasksCompleted: 0,
            habitsCompleted: 0,
            timerSessions: 0
        };
    }

    activity[today][activityType] =
        (Number(activity[today][activityType]) || 0) + 1;

    saveData("dailyActivity", activity);

    updateChart();
}


// ==========================================
// WEEKLY SUMMARY CHART
// ==========================================

let weeklyChart = null;

function getCurrentWeekDates() {
    const today = new Date();

    const day = today.getDay();

    const mondayOffset = day === 0 ? -6 : 1 - day;

    const monday = new Date(today);

    monday.setDate(today.getDate() + mondayOffset);

    const dates = [];

    for (let i = 0; i < 7; i++) {
        const date = new Date(monday);

        date.setDate(monday.getDate() + i);

        const key = [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")
        ].join("-");

        dates.push(key);
    }

    return dates;
}

function updateChart() {
    const canvas = document.getElementById("weeklyChart");

    // Allow the other features to work if Chart.js is unavailable
    if (!canvas || typeof Chart === "undefined") {
        console.warn("Chart.js is not available.");
        return;
    }

    const activity = getDailyActivity();
    const weekDates = getCurrentWeekDates();

    let tasksTotal = 0;
    let habitsTotal = 0;
    let sessionsTotal = 0;

    weekDates.forEach(date => {
        const daily = activity[date] || {};

        tasksTotal += Number(daily.tasksCompleted) || 0;
        habitsTotal += Number(daily.habitsCompleted) || 0;
        sessionsTotal += Number(daily.timerSessions) || 0;
    });

    const chartValues = [
        tasksTotal,
        habitsTotal,
        sessionsTotal
    ];

    if (!weeklyChart) {
        weeklyChart = new Chart(
            canvas.getContext("2d"),
            {
                type: "pie",

                data: {
                    labels: [
                        "Tasks Completed",
                        "Habits Completed",
                        "Focus Sessions"
                    ],

                    datasets: [{
                        label: "Weekly Summary",

                        data: chartValues,

                        backgroundColor: [
                            "rgba(255, 99, 132, 0.7)",
                            "rgba(54, 162, 235, 0.7)",
                            "rgba(255, 206, 86, 0.7)"
                        ],

                        borderColor: [
                            "rgba(255, 99, 132, 1)",
                            "rgba(54, 162, 235, 1)",
                            "rgba(255, 206, 86, 1)"
                        ],

                        borderWidth: 1
                    }]
                },

                options: {
                    responsive: true,

                    plugins: {
                        legend: {
                            position: "bottom",

                            labels: {
                                color: "#fff",
                                font: {
                                    size: 14
                                }
                            }
                        },

                        tooltip: {
                            enabled: true
                        }
                    }
                }
            }
        );

    } else {
        weeklyChart.data.datasets[0].data = chartValues;
        weeklyChart.update();
    }
}


// ==========================================
// DAILY MOTIVATIONAL TIPS
// ==========================================

const dailyTips = [
    "💡 Tip: Take short breaks to stay productive!",
    "💡 Tip: Drink water regularly!",
    "💡 Tip: Start your day with gratitude!",
    "💡 Tip: Move your body for 10 minutes!",
    "💡 Tip: Smile! It boosts your mood!",
    "💡 Tip: Small progress is still progress!",
    "💡 Tip: Believe in yourself and keep going!"
];

function showDailyTip() {
    const tip = dailyTips[
        Math.floor(Math.random() * dailyTips.length)
    ];

    document.getElementById("dailyTip").textContent = tip;
}