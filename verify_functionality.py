
import asyncio
from playwright.async_api import async_playwright

async def run_functional_test():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Start the app (assuming it's already running or we use a file)
        # Using the file directly for UI check
        import os
        cwd = os.getcwd()
        await page.goto(f"file://{cwd}/index.html")

        # 1. Test Login Modal
        await page.click("#login-btn")
        login_visible = await page.is_visible("#login-modal")
        print(f"Login modal visible: {login_visible}")
        await page.click("#login-close-btn")

        # 2. Test Register Modal
        await page.click("#register-btn")
        register_visible = await page.is_visible("#register-modal")
        print(f"Register modal visible: {register_visible}")
        await page.click("#register-close-btn")

        # 3. Test Download Modal
        # Note: Download button might be disabled or have different behavior if not 'playing'
        # but let's see if it's clickable
        await page.click("#download-button")
        # In this app, download-button might open #progress-modal
        progress_visible = await page.is_visible("#progress-modal")
        print(f"Progress/Download modal visible: {progress_visible}")
        await page.click("#close-modal-btn")

        # 4. Test Play Button Text toggle (simulate click)
        initial_text = await page.inner_text("#play-pause-button")
        print(f"Initial play button text: {initial_text}")
        await page.click("#play-pause-button")
        # The script.js handles the actual audio, but usually text changes
        # Just checking it doesn't crash

        # 5. Check Sidebar buttons
        randomize_visible = await page.is_visible("#randomize-button")
        print(f"Randomize button visible: {randomize_visible}")

        upload_visible = await page.is_visible("label[for='audioUpload']")
        print(f"Upload button visible: {upload_visible}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_functional_test())
