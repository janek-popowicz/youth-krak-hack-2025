document.addEventListener('DOMContentLoaded', function() {
    const API = '/api/subjects';
    const subjectsList = document.getElementById('subjects-list');
    const addBtn = document.getElementById('add-subject');

    // modal elements
    const modalBackdrop = document.getElementById('modal-backdrop');
    const inputNazwa = document.getElementById('input-nazwa');
    const inputMinutes = document.getElementById('input-minutes');
    const modalCancel = document.getElementById('modal-cancel');
    const modalSubmit = document.getElementById('modal-submit');

    function openModal() {
        inputNazwa.value = '';
        inputMinutes.value = '';
        modalBackdrop.style.display = 'flex';
        modalBackdrop.setAttribute('aria-hidden', 'false');
        inputNazwa.focus();
    }
    function closeModal() {
        modalBackdrop.style.display = 'none';
        modalBackdrop.setAttribute('aria-hidden', 'true');
    }

    addBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openModal();
    });
    modalCancel.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal();
    });

    modalSubmit.addEventListener('click', async (e) => {
        e.preventDefault();
        const nazwa = (inputNazwa.value || '').trim();
        const minutes = parseInt(inputMinutes.value, 10);
        if (!nazwa) {
            alert('Podaj nazwę przedmiotu.');
            inputNazwa.focus();
            return;
        }
        if (Number.isNaN(minutes) || minutes <= 0) {
            alert('Podaj prawidłową liczbę minut (>0).');
            inputMinutes.focus();
            return;
        }

        // konwersja minut -> level (base 25 + 5/min na level)
        const base = 25;
        const perLevel = 5;
        let level = Math.floor(Math.max(0, minutes - base) / perLevel);
        if (minutes < base) level = 0;

        try {
            const resp = await fetch(API, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({nazwa, level})
            });
            const data = await resp.json();
            if (!resp.ok) {
                alert('Błąd: ' + (data.error || resp.statusText || resp.status));
                return;
            }
            closeModal();
            await renderSubjects();
            alert(`Dodano: ${data.nazwa} — czas skupienia: ${data.czas_skupienia} min`);
        } catch (err) {
            console.error(err);
            alert('Błąd połączenia z serwerem.');
        }
    });

    // render + session logic
    const intervals = new Map();

    async function fetchSubjects() {
        const res = await fetch(API);
        if (!res.ok) throw new Error('Błąd pobierania');
        return await res.json();
    }

    async function renderSubjects() {
        try {
            const list = await fetchSubjects();
            subjectsList.innerHTML = '';
            list.forEach(s => {
                const el = document.createElement('div');
                el.className = 'subject';
                el.dataset.id = s.id;
                el.innerHTML = `
                    <div class="info">
                        <strong>${escapeHtml(s.nazwa)}</strong>
                        <small>Level: ${s.level} · Czas skupienia: ${s.czas_skupienia} min</small>
                        <small class="status" aria-live="polite"></small>
                    </div>
                    <div class="actions">
                        <button class="start">Rozpocznij sesję</button>
                    </div>
                `;
                subjectsList.appendChild(el);
                el.querySelector('.start').addEventListener('click', () => startSession(s, el));
            });
        } catch (err) {
            console.error('Nie udało się wczytać przedmiotów', err);
            subjectsList.innerHTML = '<div style="padding:12px;color:#666">Nie można załadować przedmiotów.</div>';
        }
    }

    function startSession(subject, containerEl) {
        if (!confirm(`Rozpocząć sesję dla "${subject.nazwa}"?\nCzas nauki: ${subject.czas_skupienia} min\nPrzerwa: ${Math.ceil(subject.czas_skupienia * 0.3)} min`)) {
            return;
        }

        if (intervals.has(subject.id)) {
            if (!confirm('Jest już aktywna sesja dla tego przedmiotu. Zastąpić?')) return;
            clearInterval(intervals.get(subject.id).timer);
            intervals.delete(subject.id);
        }

        const workMin = subject.czas_skupienia;
        const breakMin = Math.ceil(workMin * 0.3);

        // dla testów: jeśli chcesz krótsze czasy, zmień mnożnik tutaj (np. *1000 zamiast *60000)
        const workMs = workMin * 60 * 1000;
        const breakMs = breakMin * 60 * 1000;

        const statusEl = containerEl.querySelector('.status');
        const startTs = Date.now();
        const workEnd = startTs + workMs;
        let phase = 'work';

        const timer = setInterval(() => {
            const now = Date.now();
            if (phase === 'work') {
                const left = Math.max(0, workEnd - now);
                statusEl.textContent = `Nauka: ${formatMs(left)}`;
                if (left <= 0) {
                    phase = 'break';
                    const breakEnd = Date.now() + breakMs;
                    intervals.set(subject.id, { timer, endTs: breakEnd, phase });
                    alert(`Koniec nauki dla "${subject.nazwa}". Rozpoczyna się przerwa ${breakMin} min.`);
                }
            } else {
                const entry = intervals.get(subject.id);
                const left = Math.max(0, entry.endTs - now);
                statusEl.textContent = `Przerwa: ${formatMs(left)}`;
                if (left <= 0) {
                    clearInterval(timer);
                    intervals.delete(subject.id);
                    statusEl.textContent = 'Gotowe ✅';
                    alert(`Przerwa zakończona dla "${subject.nazwa}".`);
                }
            }
        }, 1000);

        intervals.set(subject.id, { timer, endTs: workEnd, phase });
        statusEl.textContent = `Nauka: ${formatMs(workMs)}`;
    }

    function formatMs(ms) {
        const totalSec = Math.ceil(ms / 1000);
        const min = Math.floor(totalSec / 60);
        const sec = totalSec % 60;
        return `${min}m ${String(sec).padStart(2, '0')}s`;
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }

    // init
    renderSubjects();
});
