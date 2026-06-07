'use client';
import { cards } from '@/lib/data';

/*
  Statische, ebenso edle Variante für reduzierte Bewegung oder fehlendes WebGL.
  Kein Canvas, keine Animation, gleiche Inhalte.
*/
export default function FallbackGallery() {
  return (
    <section className="fallback section" id="technologie">
      <div className="wrap">
        <div className="section-head">
          <span className="eyebrow">Einblicke</span>
          <h2 className="serif">Präzision, die sichtbar wird.</h2>
        </div>
        <div className="fallback-grid">
          {cards.map((card, i) => (
            <article className="fcard" key={card.id}>
              <div className="ph">
                {card.image ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={card.image} alt={card.kicker} />
                ) : (
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: '3rem', color: 'rgba(216,185,120,.5)' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                )}
              </div>
              <div className="body">
                <span className="ov-kicker">{card.kicker}</span>
                <h3 className="serif">{card.title}</h3>
                <p>{card.text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
