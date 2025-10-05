import React from 'react';

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
}

const slides = [
  { title: 'Welcome', body: 'Explore confirmed exoplanets, view models, and compare worlds.' },
  { title: '3D Models', body: 'Click a planet to open the 3D viewer. Models are lazy-loaded and cached.' },
  { title: 'Compare', body: 'Use the Compare tray to add planets and reorder them for side-by-side analysis.' },
  { title: 'Chat Assistant', body: 'Press C to open the assistant, or use the chat button to ask questions.' }
];

const OnboardingTour: React.FC<OnboardingTourProps> = ({ isOpen, onClose }) => {
  const [idx, setIdx] = React.useState(0);
  React.useEffect(() => { if (isOpen) setIdx(0); }, [isOpen]);

  // Prevent background scrolling while open
  React.useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="onboarding-overlay landing" role="dialog" aria-modal="true" aria-label="Onboarding tour - Landing">
      <div className="onboarding-backdrop" onClick={() => { localStorage.setItem('onboardingSeen','1'); onClose(); }} />

      <div className="onboarding-landing">
        <header className="landing-header">
          <div>
            <h1 className="landing-title">EXOPLANET EXPLORER</h1>
            <p className="landing-subtitle">Explore confirmed exoplanets with 3D models, comparisons, and an AI assistant.</p>
          </div>
          <div>
            <button aria-label="Close onboarding" onClick={() => { localStorage.setItem('onboardingSeen','1'); onClose(); }} className="landing-close">Close ✕</button>
          </div>
        </header>

        <main className="landing-main">
          <section className="landing-pane">
            <h2 className="pane-title">{slides[idx].title}</h2>
            <p className="pane-body">{slides[idx].body}</p>
          </section>

          <nav className="landing-nav">
            <button onClick={() => setIdx(Math.max(0, idx-1))} disabled={idx===0} className="landing-btn">Back</button>
            <div className="landing-steps">{slides.map((_s, i) => (
              <button key={i} onClick={() => setIdx(i)} aria-current={i===idx} className={`step-dot ${i===idx ? 'active' : ''}`} />
            ))}</div>
            <button onClick={() => setIdx(Math.min(slides.length-1, idx+1))} className="landing-btn">Next</button>
          </nav>
        </main>

        <footer className="landing-footer">
          <button onClick={() => { localStorage.setItem('onboardingSeen','1'); onClose(); }} className="cta">Get started</button>
        </footer>
      </div>
    </div>
  );
};

export default OnboardingTour;
