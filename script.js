const QUESTION_COUNT = 10;
const TIME_PER_QUESTION = 15;

const $ = id => document.getElementById(id);

let questions = [];
let current = 0;
let score = 0;
let timeLeft = TIME_PER_QUESTION;
let timerId = null;
let answered = false;
let bestScore = 0;
let sessionId = 0;

const startScreen = $("start-screen");
const quizScreen = $("quiz-screen");
const resultScreen = $("result-screen");
const optionsEl = $("options");
const feedbackEl = $("feedback");

function loadBestScore() {
    try {
        bestScore = Number(
            localStorage.getItem("arithmeticQuizBest") || 0
        );
    } catch {
        bestScore = 0;
    }

    $("best-score").textContent = bestScore;
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = randomInt(0, i);
        [array[i], array[j]] = [array[j], array[i]];
    }

    return array;
}

function makeQuestion(difficulty) {
    let a, b, symbol, answer;

    if (difficulty === "easy") {
        a = randomInt(1, 50);
        b = randomInt(1, 50);
        symbol = Math.random() < 0.5 ? "+" : "-";

        if (symbol === "-" && b > a) {
            [a, b] = [b, a];
        }

        answer = symbol === "+" ? a + b : a - b;
    } else if (difficulty === "medium") {
        symbol = Math.random() < 0.5 ? "×" : "÷";

        if (symbol === "×") {
            a = randomInt(2, 15);
            b = randomInt(2, 12);
            answer = a * b;
        } else {
            b = randomInt(2, 12);
            answer = randomInt(2, 15);
            a = b * answer;
        }
    } else {
        const operation = randomInt(0, 3);

        if (operation === 0) {
            symbol = "+";
            a = randomInt(100, 999);
            b = randomInt(100, 999);
            answer = a + b;
        } else if (operation === 1) {
            symbol = "-";
            a = randomInt(100, 999);
            b = randomInt(1, a);
            answer = a - b;
        } else if (operation === 2) {
            symbol = "×";
            a = randomInt(12, 40);
            b = randomInt(11, 25);
            answer = a * b;
        } else {
            symbol = "÷";
            b = randomInt(2, 20);
            answer = randomInt(12, 40);
            a = b * answer;
        }
    }

    const choices = new Set([answer]);

    while (choices.size < 4) {
        const offset = randomInt(1, 10);
        const candidate = Math.random() < 0.5
            ? answer + offset
            : answer - offset;

        if (candidate >= 0 && candidate !== answer) {
            choices.add(candidate);
        }
    }

    return {
        question: `What is ${a} ${symbol} ${b}?`,
        answer,
        options: shuffle([...choices])
    };
}

function stopTimer() {
    if (timerId !== null) {
        clearInterval(timerId);
        timerId = null;
    }
}

function startTimer(id) {
    stopTimer();
    timeLeft = TIME_PER_QUESTION;
    updateTimer();

    timerId = setInterval(() => {
        if (id !== sessionId || answered) {
            stopTimer();
            return;
        }

        timeLeft--;
        updateTimer();

        if (timeLeft <= 0) {
            checkAnswer(null, id);
        }
    }, 1000);
}

function updateTimer() {
    $("timer").textContent = timeLeft;
    $("timer-bar").style.width =
        `${(timeLeft / TIME_PER_QUESTION) * 100}%`;
}

function startQuiz() {
    stopTimer();
    sessionId++;

    current = 0;
    score = 0;

    const difficulty = $("difficulty").value;

    questions = Array.from(
        { length: QUESTION_COUNT },
        () => makeQuestion(difficulty)
    );

    startScreen.hidden = true;
    resultScreen.hidden = true;
    quizScreen.hidden = false;

    $("score").textContent = "Score: 0";

    showQuestion();
}

function showQuestion() {
    answered = false;

    const q = questions[current];

    $("progress").textContent =
        `Question ${current + 1} / ${QUESTION_COUNT}`;

    $("score").textContent = `Score: ${score}`;
    $("question").textContent = q.question;

    optionsEl.replaceChildren();

    q.options.forEach((option, index) => {
        const label = document.createElement("label");
        label.className = "option";

        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = "answer";
        radio.value = option;

        label.append(
            radio,
            ` ${String.fromCharCode(65 + index)}. ${option}`
        );

        optionsEl.appendChild(label);
    });

    feedbackEl.textContent = "";
    feedbackEl.className = "";

    $("submit-btn").hidden = false;
    $("submit-btn").disabled = false;
    $("next-btn").hidden = true;

    startTimer(sessionId);
}

function checkAnswer(selected, id = sessionId) {
    if (id !== sessionId || answered) return;

    answered = true;
    stopTimer();

    document.querySelectorAll('input[name="answer"]')
        .forEach(input => input.disabled = true);

    const correctAnswer = questions[current].answer;

    if (selected !== null && Number(selected) === correctAnswer) {
        score++;
        feedbackEl.textContent = "Correct! Well done!";
        feedbackEl.className = "correct";
    } else if (selected === null) {
        feedbackEl.textContent =
            `Time is up! The answer was ${correctAnswer}.`;
        feedbackEl.className = "wrong";
    } else {
        feedbackEl.textContent =
            `Wrong! The correct answer is ${correctAnswer}.`;
        feedbackEl.className = "wrong";
    }

    $("score").textContent = `Score: ${score}`;
    $("submit-btn").hidden = true;

    $("next-btn").textContent =
        current === QUESTION_COUNT - 1
            ? "See Final Result"
            : "Next Question";

    $("next-btn").hidden = false;
}

function nextQuestion() {
    if (!answered) return;

    if (current < QUESTION_COUNT - 1) {
        current++;
        showQuestion();
    } else {
        showResult();
    }
}

function showResult() {
    stopTimer();

    quizScreen.hidden = true;
    resultScreen.hidden = false;

    $("final-score").textContent =
        `Your score: ${score} / ${QUESTION_COUNT}`;

    $("result-message").textContent =
        score >= 8
            ? "Excellent work!"
            : score >= 5
                ? "Good effort! Keep practising."
                : "Keep practising. You can improve!";

    let isNewBest = false;

    if (score > bestScore) {
        bestScore = score;
        isNewBest = true;

        try {
            localStorage.setItem(
                "arithmeticQuizBest",
                String(bestScore)
            );
        } catch {
            // The quiz still works if storage is unavailable.
        }
    }

    $("best-score").textContent = bestScore;

    $("best-result").textContent = isNewBest
        ? "New personal best! Congratulations!"
        : `Your personal best is ${bestScore} / ${QUESTION_COUNT}.`;
}

function goHome() {
    stopTimer();
    sessionId++;

    quizScreen.hidden = true;
    resultScreen.hidden = true;
    startScreen.hidden = false;

    loadBestScore();
}

$("start-btn").addEventListener("click", startQuiz);

$("submit-btn").addEventListener("click", () => {
    const selected = document.querySelector(
        'input[name="answer"]:checked'
    );

    if (!selected) {
        feedbackEl.textContent = "Please select an answer first.";
        feedbackEl.className = "wrong";
        return;
    }

    checkAnswer(selected.value);
});

$("next-btn").addEventListener("click", nextQuestion);
$("play-again-btn").addEventListener("click", startQuiz);
$("home-btn").addEventListener("click", goHome);

loadBestScore();