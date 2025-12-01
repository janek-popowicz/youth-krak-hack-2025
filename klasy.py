class Przedmiot:
    """Model przedmiotu szkolnego.

    Atrybuty:
    - nazwa: nazwa przedmiotu
    - level: poziom (int)
    - czas_skupienia: obliczany na podstawie level (minuty)

    Założenie: bazowy czas skupienia to 25 minut, a każdy level dodaje +5 minut.
    """
    def __init__(self, nazwa, czas_skupienia=25, sessions_done=0):
        self.nazwa = nazwa
        try:
            self.czas_skupienia = int(czas_skupienia)
            if self.czas_skupienia < 1:
                self.czas_skupienia = 25
        except Exception:
            self.czas_skupienia = 25

        try:
            self.sessions_done = int(sessions_done)
            if self.sessions_done < 0:
                self.sessions_done = 0
        except Exception:
            self.sessions_done = 0

    @property
    def level(self):
        base = 25
        per_level = 5
        if self.czas_skupienia <= base:
            return 0
        return (self.czas_skupienia - base) // per_level

    def to_dict(self, id=None):
        return {
            'id': id,
            'nazwa': self.nazwa,
            'level': int(self.level),
            'czas_skupienia': int(self.czas_skupienia),
            'sessions_done': int(self.sessions_done),
        }

    @staticmethod
    def from_dict(d):
        if d is None:
            return None
        return Przedmiot(d.get('nazwa'), d.get('czas_skupienia', 25), d.get('sessions_done', 0))