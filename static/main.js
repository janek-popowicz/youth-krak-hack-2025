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
});
