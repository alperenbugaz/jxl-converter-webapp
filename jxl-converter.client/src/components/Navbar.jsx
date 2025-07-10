import React from 'react';
import { motion } from 'framer-motion';
import './Navbar.css';
import { GitHubIcon } from './Icons';

const LogoIcon = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '12px' }}>
        <path d="M2 12C2 7.28599 2 4.92898 3.46447 3.46447C4.92898 2 7.28599 2 12 2C16.714 2 19.071 2 20.5355 3.46447C22 4.92898 22 7.28599 22 12C22 16.714 22 19.071 20.5355 20.5355C19.071 22 16.714 22 12 22C7.28599 22 4.92898 22 3.46447 20.5355C2 19.071 2 16.714 2 12Z" stroke="#A78BFA" strokeWidth="1.5" />
        <path d="M12 6L12 18M9 9L9 15M15 9L15 15M6 12L18 12" stroke="white" strokeOpacity="0.8" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

const navbarVariants = {
    hidden: { y: -100, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: {
            duration: 0.6,
            ease: [0.6, 0.05, 0.01, 0.9]
        }
    },
};

const menuVariants = {
    visible: {
        transition: {
            staggerChildren: 0.1,
        },
    },
};

const menuItemVariants = {
    hidden: { y: -20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
};


function Navbar() {
    return (
        <motion.nav
            className="navbar"
            variants={navbarVariants}
            initial="hidden"
            animate="visible"
        >
            <div className="navbar-container">
                <a href="/" className="navbar-logo">
                    <LogoIcon />
                    <span>JPEG XL CONVERTER</span>
                </a>

                <motion.ul
                    className="nav-menu"
                    variants={menuVariants}
                >
                    <motion.li className="nav-item" variants={menuItemVariants}>
                        <a href="https://jpegxl.info/" target="_blank" rel="noopener noreferrer" className="nav-links">
                            Why JXL?
                        </a>
                    </motion.li>
                    <motion.li className="nav-item" variants={menuItemVariants}>
                        <a href="https://github.com/alperenbugaz/jxl-converter-webapp" target="_blank" rel="noopener noreferrer" className="nav-links nav-icon-link">
                            <GitHubIcon />
                        </a>
                    </motion.li>
                </motion.ul>
            </div>
        </motion.nav>
    );
}

export default Navbar;