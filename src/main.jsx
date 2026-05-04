import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import './styles.css';

function Home() {
  return (
    <main className="page page-home">
      <header className="topbar">
        <span>Brand Intro</span>
        <img src="/Assets/Wordmark.svg" alt="LOEM" className="wordmark" />
        <Link to="/brand-story" className="top-link">Brand Story</Link>
      </header>
      <section className="hero-copy">
        <h1>A modern living practice</h1>
        <p>This is the React trial version. Your legacy pages are untouched.</p>
        <Link to="/brand-story" className="cta">Open Brand Story</Link>
      </section>
    </main>
  );
}

function BrandStory() {
  return (
    <main className="page page-brand">
      <header className="topbar">
        <Link to="/" className="top-link">Brand Intro</Link>
        <img src="/Assets/Wordmark.svg" alt="LOEM" className="wordmark white" />
        <span>Look Book</span>
      </header>
      <section className="split">
        <img src="/Assets/260421_NEAET0428_001-02 6.png" alt="Hero" className="left" />
        <div className="right">
          <p className="eyebrow">WHAT WE DO<br/>[ADD CHINESE]</p>
          <p className="body">We design everyday objects and<br/>ready-to-wear essentials that<br/>bring fluidity to modern living.</p>
        </div>
      </section>
    </main>
  );
}

function App() {
  return (
    <BrowserRouter basename="/app.html">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/brand-story" element={<BrandStory />} />
      </Routes>
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')).render(<App />);
