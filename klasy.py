class WydarzenieKalendarzowe:
    def __init__(self, nazwa, data, lokalizacja):
        self.nazwa = nazwa
        self.data = data
        self.lokalizacja = lokalizacja

    def __str__(self):
        return f"{self.nazwa} - {self.data} @ {self.lokalizacja}"