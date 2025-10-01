#!/usr/bin/env python3
"""
Setup script for Playwright browser installation.

This script installs the necessary browser binaries for Playwright
to work in the video rendering worker process.
"""
import subprocess
import sys
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def install_playwright_browsers():
    """Install Playwright browser binaries."""
    try:
        logger.info("Installing Playwright browsers...")
        
        # Install Chromium browser for Playwright
        result = subprocess.run([
            sys.executable, '-m', 'playwright', 'install', 'chromium'
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            logger.info("Playwright browsers installed successfully")
            logger.info(result.stdout)
        else:
            logger.error("Failed to install Playwright browsers")
            logger.error(result.stderr)
            return False
            
        # Install system dependencies for Playwright
        logger.info("Installing system dependencies...")
        result = subprocess.run([
            sys.executable, '-m', 'playwright', 'install-deps', 'chromium'
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            logger.info("System dependencies installed successfully")
        else:
            logger.warning("Some system dependencies may not have been installed")
            logger.warning(result.stderr)
        
        return True
        
    except Exception as e:
        logger.error(f"Error installing Playwright browsers: {e}")
        return False

if __name__ == '__main__':
    success = install_playwright_browsers()
    sys.exit(0 if success else 1)