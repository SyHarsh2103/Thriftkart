import { LuShirt } from "react-icons/lu";
import { TbTruckDelivery } from "react-icons/tb";
import { TbDiscount2 } from "react-icons/tb";
import { CiBadgeDollar } from "react-icons/ci";
import { Link } from "react-router-dom";
import { FaFacebookF } from "react-icons/fa";
import { FaTwitter } from "react-icons/fa";
import { FaInstagram } from "react-icons/fa";
import newsLetterImg from "../../assets/images/newsletter.png";
import Button from "@mui/material/Button";
import { IoMailOutline } from "react-icons/io5";
import { useState } from "react";


const Footer = () => {
  const [bannerList, setBannerList] = useState([]);

  return (
    <>
      {/* Newsletter Section */}
      <section className="newsLetterSection mt-3 mb-3 d-flex align-items-center">
        <div className="container">
          <div className="row">
            <div className="col-md-6">
              <p className="text-white mb-1">
                $20 discount for your first order
              </p>
              <h3 className="text-white">Join our newsletter and get...</h3>
              <p className="text-light">
                Join our email subscription now to get updates on
                <br /> promotions and coupons.
              </p>

              <form className="mt-4">
                <IoMailOutline />
                <input type="text" placeholder="Your Email Address" />
                <Button>Subscribe</Button>
              </form>
            </div>

            <div className="col-md-6">
              <img src={newsLetterImg} alt="newsletter" />
            </div>
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <footer>
        <div className="container">
          {/* Top Info */}
          <div className="topInfo row">
            <div className="col d-flex align-items-center">
              <span><LuShirt /></span>
              <span className="ml-2">Everyday products</span>
            </div>

            <div className="col d-flex align-items-center">
              <span><TbTruckDelivery /></span>
              <span className="ml-2">Free delivery for order over $70</span>
            </div>

            <div className="col d-flex align-items-center">
              <span><TbDiscount2 /></span>
              <span className="ml-2">Daily Mega Discounts</span>
            </div>

            <div className="col d-flex align-items-center">
              <span><CiBadgeDollar /></span>
              <span className="ml-2">Best price on the market</span>
            </div>
          </div>

          {/* Links Section */}
          <div className="row mt-5 linksWrap">
            <div className="col">
              <h5>CLOTHING</h5>
              <ul>
                <li><Link to="#">Men's Wear</Link></li>
                <li><Link to="#">Women's Wear</Link></li>
                <li><Link to="#">Kids' Wear</Link></li>
                <li><Link to="#">Ethnic & Traditional</Link></li>
                <li><Link to="#">Casual & Formal</Link></li>
                <li><Link to="#">Sportswear</Link></li>
                <li><Link to="#">Accessories</Link></li>
              </ul>
            </div>

            <div className="col">
              <h5>MOBILE ACCESSORIES</h5>
              <ul>
                <li><Link to="#">Phone Cases</Link></li>
                <li><Link to="#">Chargers & Cables</Link></li>
                <li><Link to="#">Power Banks</Link></li>
                <li><Link to="#">Earphones & Headphones</Link></li>
                <li><Link to="#">Screen Protectors</Link></li>
                <li><Link to="#">Smartwatches</Link></li>
                <li><Link to="#">Car Accessories</Link></li>
              </ul>
            </div>

            <div className="col">
              <h5>ELECTRONICS</h5>
              <ul>
                <li><Link to="#">Laptops & Computers</Link></li>
                <li><Link to="#">Smartphones</Link></li>
                <li><Link to="#">Televisions</Link></li>
                <li><Link to="#">Cameras</Link></li>
                <li><Link to="#">Home Appliances</Link></li>
                <li><Link to="#">Audio Systems</Link></li>
                <li><Link to="#">Gaming Consoles</Link></li>
              </ul>
            </div>

            <div className="col">
              <h5>HOME LIGHTING</h5>
              <ul>
                <li><Link to="#">LED Bulbs</Link></li>
                <li><Link to="#">Ceiling Lights</Link></li>
                <li><Link to="#">Wall Lamps</Link></li>
                <li><Link to="#">Table Lamps</Link></li>
                <li><Link to="#">Decorative Lights</Link></li>
                <li><Link to="#">Outdoor Lighting</Link></li>
                <li><Link to="#">Smart Lighting</Link></li>
              </ul>
            </div>

            <div className="col">
              <h5>HANDICRAFTS</h5>
              <ul>
                <li><Link to="#">Wooden Handicrafts</Link></li>
                <li><Link to="#">Metal Art</Link></li>
                <li><Link to="#">Clay & Ceramic</Link></li>
                <li><Link to="#">Textile Handicrafts</Link></li>
                <li><Link to="#">Paintings</Link></li>
                <li><Link to="#">Jewelry Handicrafts</Link></li>
                <li><Link to="#">Home Decor</Link></li>
              </ul>
            </div>

            {/* New Policies/Company Section */}
            <div className="col">
              <h5>COMPANY & POLICIES</h5>
              <ul>
                <li><Link to="/about-us">About Us</Link></li>
                <li><Link to="/terms-conditions">Terms & Conditions</Link></li>
                <li><Link to="/privacy-policy">Privacy Policy</Link></li>
                <li><Link to="/refund-policy">Refund & Return Policy</Link></li>
                <li><Link to="/contact">Contact</Link></li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="copyright mt-3 pt-3 pb-3 d-flex">
            <p className="mb-0">Copyright 2024. All rights reserved</p>
            <ul className="list list-inline ml-auto mb-0 socials">
              <li className="list-inline-item">
                <Link to="#"><FaFacebookF /></Link>
              </li>
              <li className="list-inline-item">
                <Link to="#"><FaTwitter /></Link>
              </li>
              <li className="list-inline-item">
                <Link to="#"><FaInstagram /></Link>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;
