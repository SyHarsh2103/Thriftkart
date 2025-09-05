import React, { useState } from "react";
import "./style.css";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Contact form submitted:", formData);

    // TODO: send data to backend API
    alert("Thank you for contacting us! We will get back to you soon.");
    setFormData({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <div className="page-container">
      <h1>Contact Us</h1>
      <p>
        Have questions, concerns, or feedback? We’d love to hear from you.  
        Reach out to us via the form below or using our contact details.
      </p>

      <div className="row mt-4">
        {/* Contact Form */}
        <div className="col-md-7">
          <form onSubmit={handleSubmit} className="contact-form">
            <div className="form-group">
              <label>Name</label>
              <input 
                type="text" 
                name="name" 
                value={formData.name} 
                onChange={handleChange} 
                required 
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input 
                type="email" 
                name="email" 
                value={formData.email} 
                onChange={handleChange} 
                required 
              />
            </div>

            <div className="form-group">
              <label>Subject</label>
              <input 
                type="text" 
                name="subject" 
                value={formData.subject} 
                onChange={handleChange} 
                required 
              />
            </div>

            <div className="form-group">
              <label>Message</label>
              <textarea 
                name="message" 
                value={formData.message} 
                onChange={handleChange} 
                rows="5" 
                required 
              />
            </div>

            <button type="submit" className="btn btn-primary mt-2">
              Send Message
            </button>
          </form>
        </div>

        {/* Contact Info */}
        <div className="col-md-5">
          <div className="contact-info">
            <h3>Our Office</h3>
            <p>📍 Thriftkart Pvt. Ltd., Ahmedabad, Gujarat, India</p>
            <p>📧 support@thriftkart.com</p>
            <p>📞 +91 98765 43210</p>

            <h3>Working Hours</h3>
            <p>Monday - Saturday: 9:00 AM – 7:00 PM</p>
            <p>Sunday: Closed</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
