document.addEventListener('DOMContentLoaded', function() {
    const btn = document.getElementById('add-subject');
    if (!btn) return;

    btn.addEventListener('click', async function() {
        const nazwa = prompt('Podaj nazwę przedmiotu:');
        if (!nazwa) return; // anulowano

        const minutesStr = prompt('Ile minut potrafisz się obecnie skupić na tym przedmiocie? (liczba)');
        if (minutesStr === null) return; // anulowano
        const minutes = parseInt(minutesStr, 10);
        if (Number.isNaN(minutes) || minutes <= 0) {
            alert('Podaj prawidłową liczbę minut (>0).');
            return;
        }

        // Konwersja minutes -> level (założenie: base 25 min + 5 min na level)
        const base = 25;
        const perLevel = 5;
        let level = Math.round((minutes - base) / perLevel);
        if (level < 0) level = 0;

        try {
            const resp = await fetch('/api/subjects', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({nazwa: nazwa, level: level})
            });
            const data = await resp.json();
            if (!resp.ok) {
                alert('Błąd serwera: ' + (data.error || resp.status));
                return;
            }
            alert(`Dodano przedmiot: ${data.nazwa}\nPoziom: ${data.level}\nCzas skupienia: ${data.czas_skupienia} minut`);
        } catch (err) {
            console.error(err);
            alert('Błąd połączenia z serwerem. Sprawdź konsolę.');
        }
    });

    (() => {
        const subjectsList = document.getElementById('subjects-list');
        const addBtn = document.getElementById('add-subject');
        const API = '/api/subjects';
        const intervals = new Map(); // id -> {timer, endTs, phase}

        function fetchSubjects() {
            return fetch(API).then(r => r.json());
        }

        function renderSubjects() {
            fetchSubjects().then(list => {
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
            }).catch(err => {
                console.error('Błąd pobierania przedmiotów', err);
            });
        }

        function startSession(subject, containerEl) {
            if (!confirm(`Rozpocząć sesję dla "${subject.nazwa}"?\nCzas nauki: ${subject.czas_skupienia} min\nPrzerwa: ${Math.ceil(subject.czas_skupienia * 0.3)} min`)) {
                return;
            }

            // jeśli jest już aktywna sesja dla tego przedmiotu — zapytaj, nadpisz
            if (intervals.has(subject.id)) {
                if (!confirm('Jest już aktywna sesja dla tego przedmiotu. Zastąpić?')) return;
                clearInterval(intervals.get(subject.id).timer);
                intervals.delete(subject.id);
            }

            const workMin = subject.czas_skupienia;
            const breakMin = Math.ceil(workMin * 0.3);
            const workMs = workMin * 60 * 1000;
            const breakMs = breakMin * 60 * 1000;

            const statusEl = containerEl.querySelector('.status');
            const startTs = Date.now();
            const workEnd = startTs + workMs;
            let phase = 'work'; // 'work' or 'break'

            // update UI countdown every second
            const timer = setInterval(() => {
                const now = Date.now();
                if (phase === 'work') {
                    const left = Math.max(0, workEnd - now);
                    statusEl.textContent = `Nauka: ${formatMs(left)}`;
                    if (left <= 0) {
                        // przechodzimy do przerwy
                        phase = 'break';
                        const breakEnd = Date.now() + breakMs;
                        intervals.set(subject.id, { timer, endTs: breakEnd, phase });
                        alert(`Koniec sesji nauki dla "${subject.nazwa}". Rozpoczyna się przerwa ${breakMin} min.`);
                    }
                } else if (phase === 'break') {
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

            // zapisujemy entry z endTs dla fazy work, później nadpisujemy dla break
            intervals.set(subject.id, { timer, endTs: workEnd, phase });

            // natychmiastowy update
            containerEl.querySelector('.status').textContent = `Nauka: ${formatMs(workMs)}`;
        }

        // POST nowego przedmiotu na podstawie nazwy i minut podanych przez użytkownika
        addBtn.addEventListener('click', async () => {
            const nazwa = prompt('Nazwa przedmiotu:');
            if (!nazwa) return;

            const minutesStr = prompt('Ile minut potrafisz się skupić teraz (minuty)? (np. 30)');
            if (!minutesStr) return;
            const minutes = parseInt(minutesStr, 10);
            if (isNaN(minutes) || minutes <= 0) {
                alert('Podaj poprawną liczbę minut.');
                return;
            }

            // konwersja minut -> level (bazowe 25 + 5 na level)
            const base = 25;
            const perLevel = 5;
            let level = Math.floor(Math.max(0, minutes - base) / perLevel);
            if (minutes < base) level = 0;

            const payload = { nazwa: nazwa.trim(), level };

            try {
                const res = await fetch(API, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    alert('Błąd: ' + (err.error || res.statusText));
                    return;
                }
                const created = await res.json();
                renderSubjects();
                alert(`Dodano przedmiot "${created.nazwa}" — czas skupienia ${created.czas_skupienia} min`);
            } catch (e) {
                console.error(e);
                alert('Błąd sieci przy dodawaniu przedmiotu.');
            }
        });

        // helpers
        function formatMs(ms) {
            const totalSec = Math.ceil(ms / 1000);
            const min = Math.floor(totalSec / 60);
            const sec = totalSec % 60;
            return `${min}m ${String(sec).padStart(2, '0')}s`;
        }

        function escapeHtml(s) {
            return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
        }

        // initial render
        renderSubjects();
    })();
});
