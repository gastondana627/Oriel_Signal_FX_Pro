
import asyncio
from playwright.async_api import async_playwright
import os

async def run_functional_test():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Monitor console
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"PAGE ERROR: {exc}"))

        cwd = os.getcwd()
        await page.goto(f"file://{cwd}/index.html")

        # Wait for some stability
        await page.wait_for_timeout(2000)

        # 1. Test Login Button
        login_btn = page.locator("#login-btn")
        print(f"Login button visible: {await login_btn.is_visible()}")

        # Get bounding box to see where it is
        box = await login_btn.bounding_box()
        print(f"Login button box: {box}")

        try:
            await login_btn.click(timeout=5000)
            await page.wait_for_timeout(500)
            modal = page.locator("#login-modal")
            print(f"Login modal visible after click: {await modal.is_visible()}")

            if await modal.is_visible():
                await page.locator("#login-close-btn").click()
                print("Login modal closed")
        except Exception as e:
            print(f"Error clicking login: {e}")
            await page.screenshot(path="debug_click.png")

        # 2. Check sidebar items
        sidebar = page.locator(".toolbox-sidebar")
        print(f"Sidebar visible: {await sidebar.is_visible()}")

        randomize = page.locator("#randomize-button")
        print(f"Randomize visible: {await randomize.is_visible()}")

        # 3. Check shape buttons (they are generated dynamically)
        shapes = page.locator(".shape-btn")
        count = await shapes.count()
        print(f"Shape buttons found: {count}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_functional_test())
