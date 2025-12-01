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

        try {
            const resp = await fetch(API, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({nazwa, czas_skupienia: minutes})
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
    const sessions = new Map(); // id -> { rafId, phase, endTs, startTs, workMs, breakMs }

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
                        <small class="meta">Level: ${s.level} · Czas skupienia: ${s.czas_skupienia} min</small>
                        <div class="progress-wrap" aria-hidden="true">
                            <div class="progress-bar" style="width:0%"></div>
                        </div>
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

        // anuluj istniejącą sesję dla tego przedmiotu
        if (sessions.has(subject.id)) {
            if (!confirm('Jest już aktywna sesja dla tego przedmiotu. Zastąpić?')) return;
            const prev = sessions.get(subject.id);
            cancelSession(subject.id, prev);
        }

        const workMin = subject.czas_skupienia;
        const breakMin = Math.ceil(workMin * 0.3);

        // production: minutes -> ms
        const workMs = workMin * 60 * 1000;
        const breakMs = breakMin * 60 * 1000;

        const progressBar = containerEl.querySelector('.progress-bar');
        const statusEl = containerEl.querySelector('.status');

        const startTs = performance.now();
        const workEnd = startTs + workMs;
        let phase = 'work';

        function updateFrame(now) {
            if (!sessions.has(subject.id)) return; // safety
            const entry = sessions.get(subject.id);
            if (!entry) return;

            if (entry.phase === 'work') {
                const elapsed = now - entry.startTs;
                const pct = Math.min(1, elapsed / entry.workMs);
                progressBar.style.width = `${pct * 100}%`;
                progressBar.dataset.phase = 'work';
                statusEl.textContent = `Nauka: ${formatMs(Math.max(0, Math.ceil((entry.workMs - elapsed))))}`;
                if (pct >= 1) {
                    // oznacz ukończenie work -> wyślij do serwera i przejdź do break
                    (async () => {
                        try {
                            await fetch(`${API}/${encodeURIComponent(subject.id)}/session_complete`, { method: 'POST' });
                            await renderSubjects(); // zaktualizuj sessions_done / czas_skupienia
                        } catch (err) {
                            console.error('Nie udało się zgłosić ukończenia sesji', err);
                        }
                    })();

                    // przełącz do przerwy
                    entry.phase = 'break';
                    entry.startTs = now;
                    entry.endTs = now + entry.breakMs;
                    // reset progress for break (optional direction)
                    progressBar.style.transition = 'width 0.2s linear';
                    // we want progress to show break as filling from 0 -> 100 in break period
                    progressBar.style.width = '0%';
                    alert(`Koniec nauki dla "${subject.nazwa}". Rozpoczyna się przerwa ${breakMin} min.`);
                }
            } else if (entry.phase === 'break') {
                const elapsed = now - entry.startTs;
                const pct = Math.min(1, elapsed / entry.breakMs);
                progressBar.style.width = `${pct * 100}%`;
                progressBar.dataset.phase = 'break';
                statusEl.textContent = `Przerwa: ${formatMs(Math.max(0, Math.ceil((entry.breakMs - elapsed))))}`;
                if (pct >= 1) {
                    // koniec przerwy
                    cancelSession(subject.id, entry);
                    statusEl.textContent = 'Gotowe ✅';
                    progressBar.style.width = '100%';
                    alert(`Przerwa zakończona dla "${subject.nazwa}".`);
                }
            }

            entry.rafId = requestAnimationFrame(updateFrame);
        }

        // store session entry
        const rafId = requestAnimationFrame(updateFrame);
        const entry = { rafId, phase, startTs, workMs, breakMs, endTs: workEnd };
        sessions.set(subject.id, entry);

        // initial styles
        progressBar.style.transition = 'width 0.1s linear';
        progressBar.style.width = '0%';
        statusEl.textContent = `Nauka: ${formatMs(workMs)}`;
    }

    function cancelSession(id, entry) {
        if (!entry) return;
        if (entry.rafId) cancelAnimationFrame(entry.rafId);
        sessions.delete(id);
    }

    function formatMs(ms) {
        const totalSec = Math.max(0, Math.ceil(ms / 1000));
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
