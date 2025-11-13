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
import { FaYoutube } from "react-icons/fa";
import { FaPinterestP } from "react-icons/fa";
import { FaThreads } from "react-icons/fa6";
import { FaSnapchatGhost } from "react-icons/fa";


const Footer = () => {
  const [bannerList, setBannerList] = useState([]);

  return (
    <>
      {/* Newsletter Section */}
      <section className="newsLetterSection mt-3 mb-3 d-flex align-items-center">
        <div className="container">
          <div className="row">
            <div className="col-md-6">
              <p className="text-white mb-1">$20 discount for your first order</p>
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
              <span className="ml-2">4-5 Days Shipping</span>
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

            {/* 
            ORIGINAL CATEGORY COLUMNS (KEEPED FOR FUTURE USE)
            -------------------------------------------------
            <div className="col"> ... </div>
            <div className="col"> ... </div>
            <div className="col"> ... </div>
            <div className="col"> ... </div>
            <div className="col"> ... </div>
            */}

            {/* New Thriftkart Info Layout */}
            <div className="col-md-6">
              <h5>ABOUT THRIFTKART</h5>
              <p className="text-muted">
                Thriftkart brings quality products at unbeatable prices with fast
                delivery, trusted service, and a smooth modern shopping
                experience across India.
              </p>
              <p className="text-muted mb-0">
                Our mission is to make online shopping affordable, reliable, and
                enjoyable for every customer.
              </p>
            </div>

            <div className="col-md-6">
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
                <Link to="https://www.facebook.com/share/1WxAES3ySy/?mibextid=wwXIfr">
                  <FaFacebookF />
                </Link>
              </li>

              <li className="list-inline-item">
                <Link to="https://x.com/thriftkartoffi1">
                  <FaTwitter />
                </Link>
              </li>

              <li className="list-inline-item">
                <Link to="https://www.instagram.com/thriftkartonlineshop?igsh=MW42bjE0Y3FhM2lreA==">
                  <FaInstagram />
                </Link>
              </li>

              <li className="list-inline-item">
                <Link to="https://www.youtube.com/@thriftkartproducts564">
                  <FaYoutube />
                </Link>
              </li>

              <li className="list-inline-item">
                <Link to="https://in.pinterest.com/thriftkart/_boards/">
                  <FaPinterestP />
                </Link>
              </li>

              <li className="list-inline-item">
                <Link to="https://www.threads.net/@thriftkartonlineshop">
                  <FaThreads />
                </Link>
              </li>

              <li className="list-inline-item">
              <Link to="https://www.snapchat.com/add/thriftkart.com?share_id=9XCVTPFOwSk&locale=en-IN">
                <FaSnapchatGhost />
              </Link>
            </li>
            </ul>
          </div>

        </div>
      </footer>
    </>
  );
};

export default Footer;
