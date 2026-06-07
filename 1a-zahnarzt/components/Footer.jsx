export default function Footer() {
  return (
    <footer className="footer" id="kontakt">
      <div className="wrap">
        <div className="footer-grid">
          <div>
            <h4>1A Zahnarzt</h4>
            <p style={{ maxWidth: '26em' }}>
              Premium Zahnmedizin mit höchster Präzision und Premium-Technologie.
              Für ein Lächeln, das überzeugt.
            </p>
            <p style={{ marginTop: 16, fontSize: '.8rem', color: 'var(--cream-faint)' }}>
              Adresse, Telefon und Öffnungszeiten als Platzhalter, bitte mit echten Daten ersetzen.
            </p>
          </div>
          <div>
            <h4>Navigation</h4>
            <ul>
              <li><a href="#leistungen">Leistungen</a></li>
              <li><a href="#praxis">Praxis</a></li>
              <li><a href="#team">Team</a></li>
              <li><a href="#technologie">Technologie</a></li>
            </ul>
          </div>
          <div>
            <h4>Kontakt</h4>
            <ul>
              <li><a href="tel:+490000000000">Telefon (Platzhalter)</a></li>
              <li>Musterstraße 1 (Platzhalter)</li>
              <li>00000 Musterstadt</li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} 1A Zahnarzt · Impressum · Datenschutz</span>
          <span>Gestaltet von <a href="https://mindea-studio.de" target="_blank" rel="noopener">Mindéa Production</a></span>
        </div>
      </div>
    </footer>
  );
}
