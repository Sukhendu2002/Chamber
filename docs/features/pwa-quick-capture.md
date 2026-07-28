# Android PWA Quick Capture

Chamber can be installed from Chrome as a Progressive Web App (PWA). The installed app
opens in its own window and can receive payment screenshots from Android's system Share
menu.

## What the PWA can do

- Install Chamber on the Android home screen.
- Show launcher shortcuts for **Add expense** and **Import payment screenshot**.
- Appear as **Chamber** in Android's Share menu for JPEG, PNG, and WebP images.
- Use AI to extract the amount, merchant, category, and description.
- Let you review the result and select an account before saving.
- Keep the Android share handoff in Chamber's private browser storage until the capture
  screen consumes it.

## Platform limitation

A PWA cannot float above another Android app and cannot programmatically capture another
app's screen. Use Android's normal screenshot gesture, then share the result to Chamber.

## Install Chamber

1. Open Chamber in Chrome on Android and sign in.
2. Open **Quick Capture**.
3. Tap **Install Chamber** when it is offered. If Chrome does not show the button, open
   Chrome's menu and choose **Install app** or **Add to Home screen**.
4. Open the installed Chamber app once. This activates its share-target service worker.

Chrome registers share targets and launcher shortcuts during installation. If Chamber was
already installed before this feature was deployed, reinstall it if the shortcuts or Share
target do not appear after Chrome refreshes the app.

## Capture a payment

1. Complete the payment in GPay, PhonePe, Paytm, or another payment app.
2. Take a normal Android screenshot of the confirmation screen.
3. Tap **Share** on Android's screenshot preview.
4. Choose **Chamber**.
5. Wait for Chamber to read the screenshot.
6. Correct any extracted fields, select the account used, and tap **Save expense**.

Parsing sends the screenshot through Chamber's existing authenticated AI and receipt
storage flow. Chamber creates no expense record and changes no account balance until you
confirm the review form.

## Manual quick entry

Long-press the installed Chamber icon and choose **Add expense**, or open **Quick Capture**
and select **Manual entry**.

## Troubleshooting

### Chamber is missing from the Share menu

- Confirm Chamber is installed, not just open in a browser tab.
- Open the installed app once while online.
- Share a supported JPEG, PNG, or WebP image.
- Reinstall the PWA if it was installed before Quick Capture was added.

### The screenshot cannot be read

- Confirm it is below 10 MB.
- Crop away unrelated content and retry.
- Some payment screens prevent Android screenshots for security. Chamber cannot bypass
  that protection; use manual entry instead.

### You were sent to Quick Capture without the screenshot

The service worker was not controlling the installed app yet. Open Chamber once, close it,
and share the screenshot again.

### You are offline

Screenshot parsing and expense saving require a connection. Reconnect and repeat the
share. Chamber does not silently upload screenshots later.
