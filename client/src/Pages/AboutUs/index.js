import React from "react";
import "./style.css";
import { FaUsers, FaLeaf, FaLightbulb, FaHandshake, FaMapMarkerAlt } from "react-icons/fa";

const AboutUs = () => {
  return (
    <div className="about-container">
      {/* Intro Section */}
      <section className="about-intro">
        <h1>About Us</h1>
        <p>
          Welcome to <strong>Thriftkart</strong>! We are passionate about bringing you
          high-quality products at the best possible prices. Our goal is to make
          online shopping simple, affordable, and enjoyable for everyone.
        </p>
      </section>

      {/* Mission */}
      <section className="about-section">
        <h3><FaLightbulb className="icon" /> Our Mission</h3>
        <p>
          At Thriftkart, our mission is to bridge the gap between affordability
          and quality. We strive to provide a platform where everyday essentials,
          fashion, electronics, and lifestyle products meet reliability and
          convenience.
        </p>
      </section>

      {/* Values */}
      <section className="about-section">
        <h3><FaLeaf className="icon" /> Our Values</h3>
        <ul>
          <li><strong>Customer First:</strong> Your satisfaction drives everything we do.</li>
          <li><strong>Integrity:</strong> We believe in honesty, transparency, and trust.</li>
          <li><strong>Innovation:</strong> We continuously update our product range to meet modern lifestyles.</li>
          <li><strong>Sustainability:</strong> We support eco-friendly practices and products where possible.</li>
        </ul>
      </section>

      {/* Why Choose Us */}
      <section className="about-section">
        <h3><FaUsers className="icon" /> Why Choose Thriftkart?</h3>
        <div className="why-grid">
          <div className="why-card">Wide range of products across categories.</div>
          <div className="why-card">Competitive prices with exciting offers.</div>
          <div className="why-card">Fast & reliable doorstep delivery.</div>
          <div className="why-card">Secure payments via UPI, cards & wallets.</div>
          <div className="why-card">Dedicated 24/7 customer support.</div>
        </div>
      </section>

      {/* Community */}
      <section className="about-section">
        <h3><FaHandshake className="icon" /> Our Community</h3>
        <p>
          Thriftkart is more than just a marketplace — it’s a growing community
          of shoppers, sellers, and partners. We aim to empower local businesses
          and artisans by giving them a platform to showcase their products to a
          wider audience.
        </p>
      </section>

      {/* Contact */}
      <section className="about-section">
        <h3><FaMapMarkerAlt className="icon" /> Contact Us</h3>
        <p>📧 <strong>support@thriftkart.com</strong></p>
        <p>📍 Thriftkart, Ahmedabad, Gujarat, India</p>
      </section>
    </div>
  );
};

export default AboutUs;
