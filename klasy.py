class WydarzenieKalendarzowe:
    def __init__(self, nazwa, data, lokalizacja):
        self.nazwa = nazwa
        self.data = data
        self.lokalizacja = lokalizacja

    def __str__(self):
        return f"{self.nazwa} - {self.data} @ {self.lokalizacja}"

    def to_dict(self, id=None):
        """Serializuje wydarzenie do słownika (gotowego do zapisu w JSON)."""
        return {
            "id": id,
            "nazwa": self.nazwa,
            "data": self.data,
            "lokalizacja": self.lokalizacja,
        }

    @staticmethod
    def from_dict(d):
        """Tworzy WydarzenieKalendarzowe z dicta (np. z JSON)."""
        if d is None:
            return None
        return WydarzenieKalendarzowe(d.get("nazwa"), d.get("data"), d.get("lokalizacja"))