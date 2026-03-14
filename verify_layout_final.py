
import asyncio
from playwright.async_api import async_playwright
import os

async def verify_layout():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        cwd = os.getcwd()
        await page.goto(f"file://{cwd}/index.html")
        await page.wait_for_timeout(2000) # Wait for JS initialization

        # Check Transport Bar (Bottom-Center)
        transport = page.locator(".transport-bar")
        play_btn = page.locator("#play-pause-button")
        download_btn = page.locator("#download-button")

        print(f"Transport Bar visible: {await transport.is_visible()}")
        if await transport.is_visible():
            t_box = await transport.bounding_box()
            p_box = await play_btn.bounding_box()
            d_box = await download_btn.bounding_box()

            print(f"Transport Bar box: {t_box}")
            print(f"Play Button box: {p_box}")
            print(f"Download Button box: {d_box}")

            # Check overlap
            if p_box and d_box:
                overlap = not (p_box['x'] + p_box['width'] < d_box['x'] or
                              d_box['x'] + d_box['width'] < p_box['x'])
                print(f"Buttons overlap horizontally: {overlap}")

        # Check User Status (Top-Right)
        user_status = page.locator("#user-status")
        print(f"User Status visible: {await user_status.is_visible()}")
        if await user_status.is_visible():
            u_box = await user_status.bounding_box()
            print(f"User Status box: {u_box}")

        # Check Sidebar
        sidebar = page.locator(".toolbox-sidebar")
        print(f"Sidebar visible: {await sidebar.is_visible()}")

        await page.screenshot(path="layout_verification_bottom_transport.png")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_layout())
