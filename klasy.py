

class Przedmiot:
    """Model przedmiotu szkolnego.

    Atrybuty:
    - nazwa: nazwa przedmiotu
    - level: poziom (int)
    - czas_skupienia: obliczany na podstawie level (minuty)

    Założenie: bazowy czas skupienia to 25 minut, a każdy level dodaje +5 minut.
    """
    def __init__(self, nazwa, level=1):
        self.nazwa = nazwa
        try:
            self.level = int(level)
        except Exception:
            self.level = 0

    @property
    def czas_skupienia(self):
        base = self.level * 5 
        per_level = 5
        return base + self.level * per_level

    def to_dict(self, id=None):
        return {
            'id': id,
            'nazwa': self.nazwa,
            'level': self.level,
            'czas_skupienia': self.czas_skupienia,
        }

    @staticmethod
    def from_dict(d):
        if d is None:
            return None
        return Przedmiot(d.get('nazwa'), d.get('level', 0))